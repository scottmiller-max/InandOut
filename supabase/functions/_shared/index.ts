import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { identifyActor } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface RileyChatRequest {
  message: string;
  channel: 'chat' | 'sms' | 'call';
  customer_id?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_name?: string;
  job_id?: string;
  /** Prior turns of THIS chat session, sent by the website widget so anonymous
   *  visitors get real multi-turn memory (they have no CRM record to load from). */
  history?: ChatTurn[];
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

    // Riley is dual-role: internal staff agent AND customer-facing agent. Classify the
    // caller and scope data access accordingly. This is what prevents a customer (or an
    // anonymous website visitor) from reading another customer's CRM record.
    const actor = await identifyActor(req, supabase);

    /* -------------------------------------------------------
       RATE LIMITING
       Public, unauthenticated endpoint (verify_jwt disabled) that fans
       out to an LLM and writes CRM interactions per message — throttle
       anonymous/customer callers by IP (and by email when supplied) using
       the shared daily_counters/rate_limits_config mechanism. Staff callers
       are exempt since they're already authenticated + role-checked.
    ------------------------------------------------------- */
    if (actor.mode !== "staff") {
      const today = new Date().toISOString().slice(0, 10);

      const { data: rateLimitConfigs } = await supabase
        .from("rate_limits_config")
        .select("key, limit_per_day");

      const limitMap: Record<string, number> = {};
      for (const row of rateLimitConfigs || []) {
        limitMap[row.key] = row.limit_per_day;
      }
      const ipLimit = limitMap["ip_daily"] ?? 50;
      const emailLimit = limitMap["email_daily"] ?? 50;

      const forwardedFor = req.headers.get("x-forwarded-for");
      const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : null;

      if (ipAddress) {
        const { data: ipCount, error: ipCountError } = await supabase.rpc(
          "increment_daily_counter",
          { p_scope: "ip_daily", p_token: ipAddress, p_day: today }
        );
        if (!ipCountError && typeof ipCount === "number" && ipCount > ipLimit) {
          return new Response(
            JSON.stringify({ error: "Too many messages from this network today. Please try again tomorrow or contact our support team." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const emailToken = actor.email || body.customer_email;
      if (emailToken) {
        const { data: emailCount, error: emailCountError } = await supabase.rpc(
          "increment_daily_counter",
          { p_scope: "email_daily", p_token: emailToken.toLowerCase(), p_day: today }
        );
        if (!emailCountError && typeof emailCount === "number" && emailCount > emailLimit) {
          return new Response(
            JSON.stringify({ error: "Too many messages from this account today. Please try again tomorrow or contact our support team." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

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

    const systemPrompt = buildContextPrompt(customer, conversationHistory, latestSummary, body.context);
    const sanitizedMessage = sanitizeUserInput(body.message);

    // Build the running transcript for the LLM. For a known customer we use their stored
    // Riley history; for an anonymous website visitor we trust the widget-supplied
    // `history` (this is what gives anon chats real multi-turn memory). The current
    // message is appended last and is NOT yet in either source.
    const priorTurns: ChatTurn[] = customer
      ? conversationHistory.map((i) => ({
          role: i.direction === "inbound" ? "user" : "assistant",
          content: i.content,
        }))
      : sanitizeHistory(body.history);

    const llmMessages: ChatTurn[] = [
      ...priorTurns.slice(-12),
      { role: "user", content: sanitizedMessage },
    ];

    const { text: rileyResponse, engine } = await generateReply(systemPrompt, llmMessages, sanitizedMessage);
    const success = engine !== "fallback";

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
        engine,
        vapi_success: engine === "vapi",
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

/* =========================================================================
   RESPONSE GENERATION
   Priority: (1) a real LLM using OUR system prompt (single source of truth —
   full reasoning, on-brand), (2) a correctly-formatted Vapi /chat call if a
   Vapi assistant is configured but no LLM key is, (3) an on-brand keyword
   fallback so Riley is never dead even with nothing configured.
   ========================================================================= */

type Engine = "anthropic" | "openai" | "vapi" | "fallback";

async function generateReply(
  systemPrompt: string,
  messages: ChatTurn[],
  latestUserMessage: string,
): Promise<{ text: string; engine: Engine }> {
  // Accept underscore or dash spelling of the secret name (both work; underscore is standard).
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("ANTHROPIC-API-KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENAI-API-KEY");
  const model = Deno.env.get("RILEY_LLM_MODEL");

  if (anthropicKey) {
    try {
      const text = await callAnthropic(anthropicKey, model || "claude-haiku-4-5", systemPrompt, messages);
      if (text) return { text, engine: "anthropic" };
    } catch (e) {
      console.error("Anthropic call failed:", e);
    }
  }

  if (openaiKey) {
    try {
      const text = await callOpenAI(openaiKey, model || "gpt-4o-mini", systemPrompt, messages);
      if (text) return { text, engine: "openai" };
    } catch (e) {
      console.error("OpenAI call failed:", e);
    }
  }

  const vapiApiKey = Deno.env.get("VAPI_API_KEY");
  const vapiAssistantId = Deno.env.get("VAPI_ASSISTANT_ID");
  if (vapiApiKey && vapiAssistantId) {
    try {
      const text = await callVapiChat(vapiApiKey, vapiAssistantId, systemPrompt, messages);
      if (text) return { text, engine: "vapi" };
    } catch (e) {
      console.error("Vapi chat call failed:", e);
    }
  }

  return { text: getFallbackResponse(latestUserMessage), engine: "fallback" };
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatTurn[],
): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) {
    console.error("Anthropic API error:", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const text = Array.isArray(data.content)
    ? data.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("").trim()
    : "";
  return text || null;
}

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatTurn[],
): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });
  if (!res.ok) {
    console.error("OpenAI API error:", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim?.() || "";
  return text || null;
}

/**
 * Correctly-formatted Vapi /chat call. The old code posted `message`/`context`
 * (invalid) and always 400'd. The native endpoint expects `input` and returns an
 * `output[]` array. We inject OUR system prompt via assistantOverrides so Riley's
 * brain stays consistent with text-Riley even if the Vapi dashboard prompt drifts.
 */
async function callVapiChat(
  apiKey: string,
  assistantId: string,
  systemPrompt: string,
  messages: ChatTurn[],
): Promise<string | null> {
  const input = messages[messages.length - 1]?.content ?? "";
  const res = await fetch("https://api.vapi.ai/chat", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assistantId,
      input,
      assistantOverrides: {
        model: {
          messages: [{ role: "system", content: systemPrompt }],
        },
      },
    }),
  });
  if (!res.ok) {
    console.error("Vapi API error:", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  return extractVapiText(data);
}

function extractVapiText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  // Native /chat: output is an array of message objects.
  const output = d.output;
  if (Array.isArray(output)) {
    const parts: string[] = [];
    for (const item of output) {
      if (!item || typeof item !== "object") continue;
      const it = item as Record<string, unknown>;
      if (it.role && it.role !== "assistant") continue;
      if (typeof it.content === "string") {
        parts.push(it.content);
      } else if (Array.isArray(it.content)) {
        for (const c of it.content) {
          if (c && typeof c === "object" && typeof (c as Record<string, unknown>).text === "string") {
            parts.push((c as Record<string, string>).text);
          }
        }
      }
    }
    const joined = parts.join("").trim();
    if (joined) return joined;
  }
  // Defensive fallbacks for other shapes.
  if (typeof d.message === "string" && d.message.trim()) return d.message.trim();
  if (typeof d.response === "string" && d.response.trim()) return d.response.trim();
  return null;
}

function sanitizeHistory(history?: ChatTurn[]): ChatTurn[] {
  if (!Array.isArray(history)) return [];
  const clean: ChatTurn[] = [];
  for (const t of history) {
    if (!t || (t.role !== "user" && t.role !== "assistant")) continue;
    const content = typeof t.content === "string" ? sanitizeUserInput(t.content) : "";
    if (!content) continue;
    clean.push({ role: t.role, content: content.slice(0, 2000) });
  }
  return clean.slice(-12);
}

function buildContextPrompt(
  customer: CustomerData | null,
  history: InteractionRecord[],
  summary: AISummary | null,
  additionalContext?: Record<string, unknown>
): string {
  const parts = [
    "You are Riley, the friendly, upbeat assistant for In&Out Moving (also written In&Outmovin), a family-owned moving and labor company on Oahu, Hawaii, family owned since 2012. Owner is Scott; the crew is small and personal.",
    "Your job: make website visitors feel instantly helped. Answer questions, help start a quote, guide bookings, and hand real details to the team. Be warm, confident, and reassuring, like a helpful local who has them covered. Write as we/us/our team, lead with a yes (We can absolutely help with that!), remove worry (you wont have to lift a finger), keep it short and friendly, and always move things one useful step forward. A little aloha; never pushy or robotic. Keep replies to a few sentences unless the visitor asks for detail.",
    "SERVICES: (1) Moving and hauling - local moves, load/unload including U-Haul U-Boxes and rented trucks, furniture and item transport across Oahu. (2) Junk and debris removal - hauling junk, furniture, appliances, yard or construction debris to the dump; item teardown/disassembly and disposal. (3) Handyman - repairs, installs, mounting, assembly, sealing and caulking, small fix-it jobs. Service area is OAHU ONLY (Honolulu, Kailua, Kaneohe, Aiea, Ewa Beach, Kapolei, Mililani, etc.). If someone is off-island, kindly say we cannot serve that area.",
    "PRICING: flat and all-inclusive - labor, materials, and any dump or disposal fees rolled into one price, no hidden surprises. There is a 2-HOUR MINIMUM for labor. Small jobs (a couch and a few boxes, a quick load or unload, a small haul) are a great fit for the 2-hour labor product in our store. You may share rough, honest ranges to set expectations but NEVER commit to a final price - the exact number is confirmed once we know the details, and every job is reviewed by the team before it is confirmed. We look for legitimate ways to save the customer money (bundling tasks into one trip, reusing their materials, right-sizing the crew).",
    "BOOKING THE 2-HOUR LABOR PRODUCT: if the job is small enough for about 2 hours or they ask to book, point them to our store to add 2 hours of labor to the cart and check out at https://www.inandoutmovin.com/store . After they book, tell them clearly that our team will review the details and confirm your time with you. The booking is a request until we confirm. Never promise a specific crew, date, or arrival time yourself.",
    "COLLECTING A LEAD is your most valuable job: for anything bigger than a quick booking, or whenever they want a quote, gather name, phone, email, the service type, from and to areas for moves, rough size or quantity, access (stairs, elevator, floor), and preferred date. If the page has a quote form, help them fill it and let them submit; otherwise collect the details in chat. Confirm you have it and set the expectation that Scott will review this and reach out to confirm.",
    'FORM ASSISTANCE (website quote form): the page has a quote form with these exact fields - full_name, phone, email, address (their move-FROM area/address), destination (their move-TO area/address), move_date (a date, format YYYY-MM-DD), inventory (what is being moved/hauled/fixed and rough size), notes (anything else). If ADDITIONAL CONTEXT includes form_state, that is what the visitor has ALREADY typed into the form - acknowledge it warmly and do NOT re-ask for those values. When the visitor tells you any of these details and could use a hand, you MAY fill the form for them. To do that, put a SINGLE line at the very END of your reply, exactly in this shape (valid JSON, double-quoted): <<FORM {"full_name":"Jane Doe","address":"Kailua"}>> - include ONLY fields you have real values the visitor actually gave you (never guess or invent), use the field names above as JSON keys, and put NOTHING after that line. In the visible part of your reply, speak naturally (for example: I have dropped that into the quote form for you - take a look and hit Get My Quote when it looks right). NEVER submit the form yourself and never claim it is submitted or confirmed - the visitor reviews and clicks Get My Quote, then Scott reviews before confirming.',
    "HARD RULES you must not break: never confirm or guarantee a booking, price, crew, or time - everything is a request the team reviews and confirms first, and say so. Do not invent facts; if you do not know, say you will have the team follow up. Do not collect payment card numbers or sensitive IDs in chat - payment happens through store checkout. Stay in scope (In&Out services on Oahu). Only use the info the visitor gives you. If a visitor is upset or the job is large or complex, offer a human: call or text 833-466-6881 or email scottmiller@inandoutmovin.com.",
    "HANDY FACTS: phone and text 833-466-6881, email scottmiller@inandoutmovin.com, web inandoutmovin.com, family owned since 2012, five-star reviews known for fast replies, on-time arrival, and good communication. Always identify yourself as Riley.",
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

  if (lowerMessage.includes("book") || lowerMessage.includes("schedule") || lowerMessage.includes("appointment")) {
    return "Happy to help you book! For small jobs you can add 2 hours of labor to your cart at inandoutmovin.com/store, and our team will review and confirm your time with you. For anything bigger, share your name, phone, and job details and Scott will follow up. You can also call or text us at 833-466-6881.";
  }

  if (lowerMessage.includes("quote") || lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes("how much")) {
    return "Great question! Our pricing is flat and all-inclusive (labor, materials, and disposal), with a 2-hour minimum for labor. Tell me a bit about the job - what we are moving, hauling, or fixing, and where on Oahu - and I will point you the right way. Scott confirms every quote personally.";
  }

  if (lowerMessage.includes("aloha") || lowerMessage.includes("hello") || lowerMessage.includes("hey") || lowerMessage.startsWith("hi")) {
    return "Aloha! I am Riley, In&Out Moving's assistant. I can help with a moving, hauling, or handyman quote, book 2 hours of labor, or answer questions. What can I help you with today?";
  }

  return "Thanks for reaching out! I am Riley, In&Out Moving's assistant here on Oahu. I can help with a quick quote for moving, hauling and junk removal, or handyman work, or get you booked. You can also reach our team anytime at 833-466-6881.";
}


async function triggerSummaryGeneration(customerId: string, triggerEvent: string): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    // riley-summary is staff-only; authenticate this server-to-server call with the
    // internal shared secret (it accepts x-internal-secret via requireStaffOrSecret).
    const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";

    await fetch(`${supabaseUrl}/functions/v1/riley-summary`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "x-internal-secret": internalSecret,
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
