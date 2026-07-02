import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { identifyActor } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RileyChatRequest {
  message: string;
  channel: 'chat' | 'sms' | 'call';
  customer_id?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_name?: string;
  job_id?: string;
  context?: Record<string, unknown>;
}

interface CustomerData {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  source: string;
}

interface InteractionRecord {
  id: string;
  content: string;
  direction: string;
  channel: string;
  created_at: string;
}

interface AISummary {
  id: string;
  summary: string;
  content: string;
  summary_type: string;
  generated_at: string;
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

  try {
    const body: RileyChatRequest = await req.json();

    if (!body.message || !body.channel) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: message, channel" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const vapiApiKey = Deno.env.get("VAPI_API_KEY");
    const vapiAssistantId = Deno.env.get("VAPI_ASSISTANT_ID");

    // Riley is dual-role: internal staff agent AND customer-facing agent. Classify the
    // caller and scope data access accordingly. This is what prevents a customer (or an
    // anonymous website visitor) from reading another customer's CRM record.
    const actor = await identifyActor(req, supabase);

    let customer: CustomerData | null = null;

    if (actor.mode === "staff") {
      // Staff (dispatcher/admin) may look up or create ANY customer by the identifiers
      // supplied in the request.
      if (body.customer_id) {
        const { data } = await supabase
          .from("customers")
          .select("id, full_name, email, phone, source")
          .eq("id", body.customer_id)
          .maybeSingle();
        customer = data;
      } else if (body.customer_email) {
        const { data } = await supabase
          .from("customers")
          .select("id, full_name, email, phone, source")
          .eq("email", body.customer_email)
          .maybeSingle();
        customer = data;
      } else if (body.customer_phone) {
        const { data } = await supabase
          .from("customers")
          .select("id, full_name, email, phone, source")
          .eq("phone", body.customer_phone)
          .maybeSingle();
        customer = data;
      }

      if (!customer && (body.customer_email || body.customer_phone || body.customer_name)) {
        const newCustomer = {
          full_name: body.customer_name || "Unknown",
          email: body.customer_email || `${Date.now()}@unknown.placeholder`,
          phone: body.customer_phone || "",
          source: body.channel === "sms" ? "sms" : body.channel === "call" ? "phone" : "chat",
          last_interaction_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("customers")
          .insert(newCustomer)
          .select("id, full_name, email, phone, source")
          .single();

        if (error) {
          console.error("Failed to create customer:", error);
        } else {
          customer = data;
        }
      }
    } else if (actor.mode === "customer") {
      // Signed-in customer: HARD-SCOPE to their own record. Any customer_id / email /
      // phone in the request body is deliberately ignored so a customer can never pull
      // another customer's data through Riley.
      const { data: own } = await supabase
        .from("customers")
        .select("id, full_name, email, phone, source")
        .eq("user_id", actor.userId!)
        .maybeSingle();
      customer = own;

      if (!customer && actor.email) {
        const { data: byEmail } = await supabase
          .from("customers")
          .select("id, full_name, email, phone, source")
          .eq("email", actor.email)
          .maybeSingle();
        customer = byEmail;
      }

      if (!customer && actor.email) {
        // First-time signed-in customer with no CRM record yet — create one linked to
        // their auth user so future chats resolve to the same record.
        const { data, error } = await supabase
          .from("customers")
          .insert({
            user_id: actor.userId,
            full_name: body.customer_name || actor.email,
            email: actor.email,
            phone: body.customer_phone || "",
            source: body.channel === "sms" ? "sms" : body.channel === "call" ? "phone" : "chat",
            last_interaction_at: new Date().toISOString(),
          })
          .select("id, full_name, email, phone, source")
          .single();
        if (error) {
          console.error("Failed to create customer:", error);
        } else {
          customer = data;
        }
      }
    }
    // actor.mode === "anon": no customer context is attached. Riley answers general
    // questions only (services, hours, quote process) — no CRM lookups or writes.

    let conversationHistory: InteractionRecord[] = [];
    let latestSummary: AISummary | null = null;

    if (customer) {
      const { data: interactions } = await supabase
        .from("interactions")
        .select("id, content, direction, channel, created_at")
        .eq("customer_id", customer.id)
        .eq("handled_by", "riley")
        .order("created_at", { ascending: false })
        .limit(20);

      if (interactions) {
        conversationHistory = interactions.reverse();
      }

      const { data: summary } = await supabase
        .from("ai_summaries")
        .select("id, summary, content, summary_type, generated_at")
        .eq("customer_id", customer.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      latestSummary = summary;
    }

    const contextPrompt = buildContextPrompt(customer, conversationHistory, latestSummary, body.context);
    const sanitizedMessage = sanitizeUserInput(body.message);

    let rileyResponse = "I apologize, but I am having trouble processing your request right now. Please try again or contact our support team.";
    let success = false;

    if (vapiApiKey && vapiAssistantId) {
      try {
        const vapiResponse = await fetch("https://api.vapi.ai/chat", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${vapiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assistantId: vapiAssistantId,
            message: sanitizedMessage,
            context: contextPrompt,
            conversationHistory: conversationHistory.map(i => ({
              role: i.direction === "inbound" ? "user" : "assistant",
              content: i.content,
            })),
          }),
        });

        if (vapiResponse.ok) {
          const vapiData = await vapiResponse.json();
          rileyResponse = vapiData.message || vapiData.response || rileyResponse;
          success = true;
        } else {
          console.error("Vapi API error:", vapiResponse.status, await vapiResponse.text());
          rileyResponse = getFallbackResponse(sanitizedMessage);
        }
      } catch (vapiError) {
        console.error("Vapi API call failed:", vapiError);
        rileyResponse = getFallbackResponse(sanitizedMessage);
      }
    } else {
      console.warn("Vapi not configured, using fallback response");
      rileyResponse = getFallbackResponse(sanitizedMessage);
    }

    if (customer) {
      await supabase.from("interactions").insert({
        customer_id: customer.id,
        channel: body.channel,
        direction: "inbound",
        content: sanitizedMessage,
        handled_by: "riley",
        interaction_type: body.channel === "call" ? "call" : "note",
        notes: `Riley chat - ${body.channel} channel`,
      });

      await supabase.from("interactions").insert({
        customer_id: customer.id,
        channel: body.channel,
        direction: "outbound",
        content: rileyResponse,
        handled_by: "riley",
        interaction_type: body.channel === "call" ? "call" : "note",
        notes: `Riley response - ${body.channel} channel`,
      });

      await supabase
        .from("customers")
        .update({ last_interaction_at: new Date().toISOString() })
        .eq("id", customer.id);

      const { count } = await supabase
        .from("interactions")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customer.id)
        .eq("handled_by", "riley");

      const lastSummaryTime = latestSummary?.generated_at
        ? new Date(latestSummary.generated_at).getTime()
        : 0;
      const hoursSinceLastSummary = (Date.now() - lastSummaryTime) / (1000 * 60 * 60);

      if ((count && count >= 10 && hoursSinceLastSummary > 1) || (count && count >= 20)) {
        EdgeRuntime.waitUntil(
          triggerSummaryGeneration(customer.id, "interaction_threshold")
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: rileyResponse,
        customer_id: customer?.id || null,
        vapi_success: success,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("riley-chat error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildContextPrompt(
  customer: CustomerData | null,
  history: InteractionRecord[],
  summary: AISummary | null,
  additionalContext?: Record<string, unknown>
): string {
  const parts = [
    "You are Riley, a friendly and professional AI assistant for IN&OUT Moving company.",
    "You help customers with job status, scheduling, quotes, and general moving questions.",
    "Be warm, concise, and helpful. If unsure, suggest contacting the support team.",
    "",
  ];

  if (customer) {
    parts.push("CUSTOMER INFORMATION:");
    parts.push(`- Name: ${customer.full_name || "Unknown"}`);
    if (customer.email && !customer.email.includes("@unknown.placeholder")) {
      parts.push(`- Email: ${customer.email}`);
    }
    if (customer.phone) {
      parts.push(`- Phone: ${customer.phone}`);
    }
    parts.push("");
  }

  if (summary) {
    parts.push("CUSTOMER SUMMARY (from previous conversations):");
    parts.push(summary.content || summary.summary);
    parts.push("");
  }

  if (additionalContext) {
    parts.push("ADDITIONAL CONTEXT:");
    for (const [key, value] of Object.entries(additionalContext)) {
      parts.push(`- ${key}: ${JSON.stringify(value)}`);
    }
    parts.push("");
  }

  parts.push("IMPORTANT BOUNDARIES:");
  parts.push("- Only discuss this customer's information and general moving topics");
  parts.push("- Do not access or reveal other customers' data");
  parts.push("- Do not make firm promises about pricing or dates without confirmation");
  parts.push("- Do not modify any job details; only provide information");
  parts.push("- Always identify yourself as Riley, an AI assistant");

  return parts.join("\n");
}

function sanitizeUserInput(input: string): string {
  let sanitized = input.trim();
  sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[REDACTED]");
  sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED]");
  return sanitized;
}

function getFallbackResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("status") || lowerMessage.includes("where") || lowerMessage.includes("when")) {
    return "I would love to help you check your job status! You can view real-time updates in the Track tab of our app, or contact our support team for detailed information.";
  }

  if (lowerMessage.includes("schedule") || lowerMessage.includes("book") || lowerMessage.includes("appointment")) {
    return "I would be happy to help you with scheduling! You can request a quote through our app's Quote tab, or call our team directly to schedule your move.";
  }

  if (lowerMessage.includes("quote") || lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes("how much")) {
    return "Great question about pricing! You can get an instant estimate through our Quote tab. For a detailed quote, our team would be happy to schedule a consultation.";
  }

  if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
    return "Hello! I am Riley, your IN&OUT Moving assistant. How can I help you today? I can assist with quotes, scheduling, or answer questions about your move.";
  }

  return "Thank you for reaching out! I am Riley, your IN&OUT Moving assistant. How can I help you today? Feel free to ask about quotes, scheduling, or your move status.";
}

async function triggerSummaryGeneration(customerId: string, triggerEvent: string): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    await fetch(`${supabaseUrl}/functions/v1/riley-summary`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_id: customerId,
        trigger_event: triggerEvent,
      }),
    });
  } catch (error) {
    console.error("Failed to trigger summary generation:", error);
  }
}