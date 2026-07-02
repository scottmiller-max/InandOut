import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { requireStaffOrSecret, jsonError } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CallSummaryRequest {
  customer_id?: string;
  customer_phone?: string;
  customer_name?: string;
  vapi_call_id: string;
  phone_number: string;
  transcript: string;
  duration_seconds: number;
  recording_url?: string;
  call_direction?: 'inbound' | 'outbound';
  call_status?: 'completed' | 'missed' | 'failed' | 'voicemail' | 'busy' | 'no_answer';
  caller_id?: string;
  metadata?: Record<string, unknown>;
}

interface CustomerData {
  id: string;
  full_name: string;
  email: string;
  phone: string;
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

  // AUTHORIZATION: called after a Vapi call (internal secret) or manually by staff.
  const auth = await requireStaffOrSecret(req);
  if (!auth.authorized) return jsonError(auth.error!, auth.status, corsHeaders);

  try {
    const body: CallSummaryRequest = await req.json();

    if (!body.vapi_call_id || !body.phone_number) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: vapi_call_id, phone_number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existingCall } = await supabase
      .from("call_logs")
      .select("id")
      .eq("vapi_call_id", body.vapi_call_id)
      .maybeSingle();

    if (existingCall) {
      return new Response(
        JSON.stringify({ error: "Call already processed", call_log_id: existingCall.id }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let customer: CustomerData | null = null;

    if (body.customer_id) {
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, email, phone")
        .eq("id", body.customer_id)
        .maybeSingle();
      customer = data;
    }

    if (!customer && body.phone_number) {
      const normalizedPhone = normalizePhoneNumber(body.phone_number);
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, email, phone")
        .or(`phone.eq.${body.phone_number},phone.eq.${normalizedPhone}`)
        .maybeSingle();
      customer = data;
    }

    if (!customer) {
      const newCustomer = {
        full_name: body.customer_name || "Phone Caller",
        email: `phone-${Date.now()}@unknown.placeholder`,
        phone: body.phone_number,
        source: "phone",
        last_interaction_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("customers")
        .insert(newCustomer)
        .select("id, full_name, email, phone")
        .single();

      if (error) {
        console.error("Failed to create customer:", error);
      } else {
        customer = data;
      }
    }

    const vapiApiKey = Deno.env.get("VAPI_API_KEY");
    const vapiAssistantId = Deno.env.get("VAPI_ASSISTANT_ID");

    let callSummary = generateLocalCallSummary(body.transcript, customer);
    let actionItems: string[] = [];
    let followUpsNeeded: string[] = [];

    const extractedData = extractCallData(body.transcript);
    actionItems = extractedData.actionItems;
    followUpsNeeded = extractedData.followUps;

    if (vapiApiKey && vapiAssistantId && body.transcript && body.transcript.length > 50) {
      try {
        const summaryPrompt = [
          "Please summarize this phone call transcript concisely.",
          "Include:",
          "1. Main purpose of the call",
          "2. Key information discussed (dates, addresses, services)",
          "3. Action items or next steps",
          "4. Any follow-up needed",
          "",
          "TRANSCRIPT:",
          body.transcript,
        ].join("\n");

        const vapiResponse = await fetch("https://api.vapi.ai/chat", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${vapiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assistantId: vapiAssistantId,
            message: summaryPrompt,
            context: "You are a call summarization assistant. Generate concise, actionable summaries.",
          }),
        });

        if (vapiResponse.ok) {
          const vapiData = await vapiResponse.json();
          if (vapiData.message || vapiData.response) {
            callSummary = vapiData.message || vapiData.response;
          }
        }
      } catch (vapiError) {
        console.error("Vapi call summary failed, using local summary:", vapiError);
      }
    }

    const { data: callLog, error: callLogError } = await supabase
      .from("call_logs")
      .insert({
        customer_id: customer?.id || null,
        phone_number: body.phone_number,
        caller_id: body.caller_id || null,
        call_time: new Date().toISOString(),
        duration_seconds: body.duration_seconds || 0,
        duration: body.duration_seconds || 0,
        transcript: body.transcript || "",
        summary: callSummary,
        recording_url: body.recording_url || null,
        vapi_call_id: body.vapi_call_id,
        call_direction: body.call_direction || "inbound",
        call_status: body.call_status || "completed",
        action_items: actionItems,
        follow_ups_needed: followUpsNeeded,
        metadata: body.metadata || {},
      })
      .select("id")
      .single();

    if (callLogError) {
      throw new Error(`Failed to create call log: ${callLogError.message}`);
    }

    if (customer) {
      await supabase.from("interactions").insert({
        customer_id: customer.id,
        channel: "phone",
        direction: body.call_direction || "inbound",
        content: `Phone call - Duration: ${formatDuration(body.duration_seconds || 0)}\n\nSummary: ${callSummary}`,
        handled_by: "riley",
        interaction_type: "call",
        notes: `Call ID: ${body.vapi_call_id}`,
      });

      await supabase
        .from("customers")
        .update({ last_interaction_at: new Date().toISOString() })
        .eq("id", customer.id);
    }

    if (customer && body.transcript && body.transcript.length > 100) {
      const { data: aiSummary, error: aiError } = await supabase
        .from("ai_summaries")
        .insert({
          customer_id: customer.id,
          call_log_id: callLog.id,
          summary: callSummary.substring(0, 500),
          content: callSummary,
          summary_type: "call_transcription",
          trigger_event: "after_call",
          metadata: {
            vapi_call_id: body.vapi_call_id,
            duration_seconds: body.duration_seconds,
            action_items: actionItems,
            follow_ups_needed: followUpsNeeded,
          },
          generated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (aiError) {
        console.error("Failed to create AI summary:", aiError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        call_log_id: callLog.id,
        customer_id: customer?.id || null,
        summary: callSummary,
        action_items: actionItems,
        follow_ups_needed: followUpsNeeded,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("riley-call-summary error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  return phone;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

function generateLocalCallSummary(transcript: string, customer: CustomerData | null): string {
  if (!transcript || transcript.length < 20) {
    return "Brief call with minimal conversation recorded.";
  }

  const lowerTranscript = transcript.toLowerCase();
  const topics: string[] = [];

  if (lowerTranscript.includes("quote") || lowerTranscript.includes("price") || lowerTranscript.includes("cost") || lowerTranscript.includes("estimate")) {
    topics.push("pricing/quote inquiry");
  }
  if (lowerTranscript.includes("schedule") || lowerTranscript.includes("book") || lowerTranscript.includes("appointment") || lowerTranscript.includes("available")) {
    topics.push("scheduling");
  }
  if (lowerTranscript.includes("status") || lowerTranscript.includes("where") || lowerTranscript.includes("update")) {
    topics.push("status inquiry");
  }
  if (lowerTranscript.includes("cancel") || lowerTranscript.includes("reschedule") || lowerTranscript.includes("change")) {
    topics.push("booking modification");
  }
  if (lowerTranscript.includes("move") || lowerTranscript.includes("moving")) {
    topics.push("moving services");
  }

  if (topics.length === 0) {
    topics.push("general inquiry");
  }

  const customerInfo = customer ? `Customer: ${customer.full_name || "Unknown"}` : "New caller";

  return `${customerInfo}. Call topics: ${topics.join(", ")}. Transcript length: ${transcript.length} characters.`;
}

function extractCallData(transcript: string): { actionItems: string[]; followUps: string[] } {
  const actionItems: string[] = [];
  const followUps: string[] = [];

  if (!transcript) {
    return { actionItems, followUps };
  }

  const lowerTranscript = transcript.toLowerCase();

  if (lowerTranscript.includes("send") && (lowerTranscript.includes("quote") || lowerTranscript.includes("email"))) {
    actionItems.push("Send quote/information via email");
  }
  if (lowerTranscript.includes("call back") || lowerTranscript.includes("callback")) {
    followUps.push("Schedule callback");
  }
  if (lowerTranscript.includes("check") && lowerTranscript.includes("availability")) {
    actionItems.push("Check availability for requested date");
  }
  if (lowerTranscript.includes("confirm")) {
    actionItems.push("Send confirmation");
  }
  if (lowerTranscript.includes("tomorrow") || lowerTranscript.includes("next week")) {
    followUps.push("Follow up on discussed timeline");
  }

  return { actionItems, followUps };
}