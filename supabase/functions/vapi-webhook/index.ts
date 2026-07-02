import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { verifyWebhookSecret, jsonError } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VapiWebhookPayload {
  type: string;
  call?: {
    id: string;
    type: string;
    status: string;
    phoneNumber?: {
      number: string;
    };
    customer?: {
      number: string;
      name?: string;
    };
    startedAt?: string;
    endedAt?: string;
    duration?: number;
    cost?: number;
    transcript?: string;
    recordingUrl?: string;
    summary?: string;
    messages?: Array<{
      role: string;
      content: string;
      timestamp?: string;
    }>;
  };
  transcript?: {
    text: string;
    segments?: Array<{
      text: string;
      start: number;
      end: number;
      speaker: string;
    }>;
  };
  assistant?: {
    id: string;
    name: string;
  };
  timestamp?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // AUTHENTICITY: this webhook writes call data with the service role. Verify the
  // shared secret Vapi is configured to send (Vapi "Server URL Secret", delivered
  // in the `x-vapi-secret` header) so forged call records can't be injected.
  if (!verifyWebhookSecret(req, "VAPI_WEBHOOK_SECRET", "x-vapi-secret")) {
    return jsonError("Invalid or missing webhook secret", 401, corsHeaders);
  }

  try {
    const payload: VapiWebhookPayload = await req.json();

    console.log("Vapi webhook received:", payload.type);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (payload.type) {
      case "call.started":
        await handleCallStarted(supabase, payload);
        break;

      case "call.ended":
        await handleCallEnded(supabase, payload);
        break;

      case "transcript.complete":
      case "call.analyzed":
        await handleTranscriptComplete(supabase, payload);
        break;

      case "speech.update":
      case "function.call":
        console.log(`Ignoring event type: ${payload.type}`);
        break;

      default:
        console.log(`Unhandled webhook type: ${payload.type}`);
    }

    return new Response(
      JSON.stringify({ success: true, type: payload.type }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("vapi-webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleCallStarted(
  supabase: ReturnType<typeof createClient>,
  payload: VapiWebhookPayload
): Promise<void> {
  const call = payload.call;
  if (!call?.id) return;

  const phoneNumber = call.customer?.number || call.phoneNumber?.number || "unknown";

  const { data: existingCall } = await supabase
    .from("call_logs")
    .select("id")
    .eq("vapi_call_id", call.id)
    .maybeSingle();

  if (existingCall) {
    console.log("Call already exists:", call.id);
    return;
  }

  let customerId: string | null = null;

  if (phoneNumber && phoneNumber !== "unknown") {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", phoneNumber)
      .maybeSingle();

    if (customer) {
      customerId = customer.id;
    }
  }

  await supabase.from("call_logs").insert({
    customer_id: customerId,
    phone_number: phoneNumber,
    caller_id: call.customer?.name || null,
    call_time: call.startedAt || new Date().toISOString(),
    vapi_call_id: call.id,
    call_direction: call.type === "outbound" ? "outbound" : "inbound",
    call_status: "completed",
    metadata: {
      assistant_id: payload.assistant?.id,
      webhook_type: "call.started",
    },
  });

  console.log("Call started logged:", call.id);
}

async function handleCallEnded(
  supabase: ReturnType<typeof createClient>,
  payload: VapiWebhookPayload
): Promise<void> {
  const call = payload.call;
  if (!call?.id) return;

  const phoneNumber = call.customer?.number || call.phoneNumber?.number || "unknown";
  const duration = call.duration || 0;

  const transcript = call.transcript || 
    (call.messages?.map(m => `${m.role}: ${m.content}`).join("\n")) || 
    "";

  const { data: existingCall } = await supabase
    .from("call_logs")
    .select("id, customer_id")
    .eq("vapi_call_id", call.id)
    .maybeSingle();

  let customerId = existingCall?.customer_id || null;

  if (!customerId && phoneNumber && phoneNumber !== "unknown") {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", phoneNumber)
      .maybeSingle();

    if (customer) {
      customerId = customer.id;
    } else {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          full_name: call.customer?.name || "Phone Caller",
          email: `phone-${Date.now()}@unknown.placeholder`,
          phone: phoneNumber,
          source: "phone",
          last_interaction_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      customerId = newCustomer?.id || null;
    }
  }

  const callStatus = mapVapiStatus(call.status);

  if (existingCall) {
    await supabase
      .from("call_logs")
      .update({
        customer_id: customerId,
        duration_seconds: duration,
        duration: duration,
        transcript: transcript,
        summary: call.summary || null,
        recording_url: call.recordingUrl || null,
        call_status: callStatus,
        updated_at: new Date().toISOString(),
        metadata: {
          webhook_type: "call.ended",
          cost: call.cost,
          ended_at: call.endedAt,
        },
      })
      .eq("id", existingCall.id);
  } else {
    await supabase.from("call_logs").insert({
      customer_id: customerId,
      phone_number: phoneNumber,
      caller_id: call.customer?.name || null,
      call_time: call.startedAt || new Date().toISOString(),
      duration_seconds: duration,
      duration: duration,
      transcript: transcript,
      summary: call.summary || null,
      recording_url: call.recordingUrl || null,
      vapi_call_id: call.id,
      call_direction: call.type === "outbound" ? "outbound" : "inbound",
      call_status: callStatus,
      metadata: {
        assistant_id: payload.assistant?.id,
        webhook_type: "call.ended",
        cost: call.cost,
      },
    });
  }

  if (customerId && transcript && transcript.length > 50) {
    await triggerCallSummary(customerId, call.id, phoneNumber, transcript, duration, call.recordingUrl, callStatus);
  }

  console.log("Call ended processed:", call.id);
}

async function handleTranscriptComplete(
  supabase: ReturnType<typeof createClient>,
  payload: VapiWebhookPayload
): Promise<void> {
  const call = payload.call;
  const transcript = payload.transcript;

  if (!call?.id) return;

  const transcriptText = transcript?.text || 
    (transcript?.segments?.map(s => `${s.speaker}: ${s.text}`).join("\n")) ||
    call.transcript ||
    "";

  if (!transcriptText) {
    console.log("No transcript available for:", call.id);
    return;
  }

  const { data: existingCall } = await supabase
    .from("call_logs")
    .select("id, customer_id")
    .eq("vapi_call_id", call.id)
    .maybeSingle();

  if (existingCall) {
    await supabase
      .from("call_logs")
      .update({
        transcript: transcriptText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingCall.id);

    if (existingCall.customer_id && transcriptText.length > 50) {
      const phoneNumber = call.customer?.number || call.phoneNumber?.number || "unknown";
      await triggerCallSummary(
        existingCall.customer_id,
        call.id,
        phoneNumber,
        transcriptText,
        call.duration || 0,
        call.recordingUrl,
        "completed"
      );
    }
  }

  console.log("Transcript processed for:", call.id);
}

function mapVapiStatus(status: string): string {
  const statusMap: Record<string, string> = {
    "ended": "completed",
    "completed": "completed",
    "failed": "failed",
    "busy": "busy",
    "no-answer": "no_answer",
    "voicemail": "voicemail",
    "missed": "missed",
  };
  return statusMap[status?.toLowerCase()] || "completed";
}

async function triggerCallSummary(
  customerId: string,
  vapiCallId: string,
  phoneNumber: string,
  transcript: string,
  duration: number,
  recordingUrl?: string,
  callStatus?: string
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    await fetch(`${supabaseUrl}/functions/v1/riley-call-summary`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_id: customerId,
        vapi_call_id: vapiCallId,
        phone_number: phoneNumber,
        transcript: transcript,
        duration_seconds: duration,
        recording_url: recordingUrl,
        call_status: callStatus,
      }),
    });
  } catch (error) {
    console.error("Failed to trigger call summary:", error);
  }
}