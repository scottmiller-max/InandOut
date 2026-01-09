import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SummaryRequest {
  customer_id: string;
  trigger_event: 'end_of_conversation' | 'after_call' | 'after_booking' | 'interaction_threshold' | 'manual_refresh';
  job_id?: string;
}

interface InteractionRecord {
  id: string;
  content: string;
  direction: string;
  channel: string;
  handled_by: string;
  created_at: string;
  notes: string;
}

interface CustomerData {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  source: string;
}

interface JobData {
  id: string;
  job_number: string;
  status: string;
  from_address: string;
  to_address: string;
  move_date: string;
  estimated_total: number;
  home_size: string;
  special_items: string[];
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
    const body: SummaryRequest = await req.json();

    if (!body.customer_id || !body.trigger_event) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: customer_id, trigger_event" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const vapiApiKey = Deno.env.get("VAPI_API_KEY");
    const vapiAssistantId = Deno.env.get("VAPI_ASSISTANT_ID");

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, full_name, email, phone, address, city, state, zip_code, source")
      .eq("id", body.customer_id)
      .single();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: "Customer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: interactions } = await supabase
      .from("interactions")
      .select("id, content, direction, channel, handled_by, created_at, notes")
      .eq("customer_id", body.customer_id)
      .eq("handled_by", "riley")
      .order("created_at", { ascending: true });

    if (!interactions || interactions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No Riley interactions found for this customer" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let job: JobData | null = null;
    if (body.job_id) {
      const { data } = await supabase
        .from("jobs")
        .select("id, job_number, status, from_address, to_address, move_date, estimated_total, home_size, special_items")
        .eq("id", body.job_id)
        .maybeSingle();
      job = data;
    } else {
      const { data } = await supabase
        .from("jobs")
        .select("id, job_number, status, from_address, to_address, move_date, estimated_total, home_size, special_items")
        .eq("customer_id", body.customer_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      job = data;
    }

    const summaryPrompt = buildSummaryPrompt(customer, interactions, job);
    let summaryContent = generateLocalSummary(customer, interactions, job);

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
            message: summaryPrompt,
            context: "You are a summarization assistant. Generate a structured customer summary based on the conversation history provided.",
          }),
        });

        if (vapiResponse.ok) {
          const vapiData = await vapiResponse.json();
          if (vapiData.message || vapiData.response) {
            summaryContent = vapiData.message || vapiData.response;
          }
        }
      } catch (vapiError) {
        console.error("Vapi summary generation failed, using local summary:", vapiError);
      }
    }

    const { data: existingSummary } = await supabase
      .from("ai_summaries")
      .select("id")
      .eq("customer_id", body.customer_id)
      .eq("summary_type", "conversation_summary")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const summaryData = {
      customer_id: body.customer_id,
      summary: summaryContent.substring(0, 500),
      content: summaryContent,
      summary_type: "conversation_summary",
      trigger_event: body.trigger_event,
      job_id: job?.id || null,
      source_interaction_ids: interactions.map((i: InteractionRecord) => i.id),
      metadata: {
        interaction_count: interactions.length,
        channels_used: [...new Set(interactions.map((i: InteractionRecord) => i.channel))],
        generated_by: "riley-summary",
        trigger_event: body.trigger_event,
      },
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let summaryId: string;

    if (existingSummary) {
      const { error: updateError } = await supabase
        .from("ai_summaries")
        .update(summaryData)
        .eq("id", existingSummary.id);

      if (updateError) {
        throw new Error(`Failed to update summary: ${updateError.message}`);
      }
      summaryId = existingSummary.id;
    } else {
      const { data: newSummary, error: insertError } = await supabase
        .from("ai_summaries")
        .insert(summaryData)
        .select("id")
        .single();

      if (insertError) {
        throw new Error(`Failed to create summary: ${insertError.message}`);
      }
      summaryId = newSummary.id;
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary_id: summaryId,
        summary: summaryContent,
        interaction_count: interactions.length,
        trigger_event: body.trigger_event,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("riley-summary error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSummaryPrompt(
  customer: CustomerData,
  interactions: InteractionRecord[],
  job: JobData | null
): string {
  const parts = [
    "Please generate a structured customer summary based on the following conversation history.",
    "",
    "Format the summary with these sections:",
    "1. CUSTOMER IDENTITY: Name, contact info, how they found us",
    "2. CUSTOMER INTENT: What they are looking for",
    "3. MOVE DETAILS: Date, size, origin/destination addresses (if mentioned)",
    "4. PRICING STAGE: lead, quoted, scheduled, confirmed",
    "5. SPECIAL NOTES: Stairs, fragile items, accessibility concerns, special requests",
    "",
    "CUSTOMER INFO:",
    `- Name: ${customer.full_name || "Unknown"}`,
    `- Email: ${customer.email}`,
    `- Phone: ${customer.phone || "Not provided"}`,
    `- Source: ${customer.source}`,
    "",
  ];

  if (job) {
    parts.push("CURRENT JOB INFO:");
    parts.push(`- Job Number: ${job.job_number}`);
    parts.push(`- Status: ${job.status}`);
    parts.push(`- Move Date: ${job.move_date || "TBD"}`);
    parts.push(`- From: ${job.from_address}`);
    parts.push(`- To: ${job.to_address}`);
    parts.push(`- Home Size: ${job.home_size}`);
    if (job.special_items && job.special_items.length > 0) {
      parts.push(`- Special Items: ${job.special_items.join(", ")}`);
    }
    parts.push("");
  }

  parts.push("CONVERSATION HISTORY:");
  for (const interaction of interactions) {
    const role = interaction.direction === "inbound" ? "Customer" : "Riley";
    const timestamp = new Date(interaction.created_at).toLocaleString();
    parts.push(`[${timestamp}] ${role}: ${interaction.content}`);
  }

  return parts.join("\n");
}

function generateLocalSummary(
  customer: CustomerData,
  interactions: InteractionRecord[],
  job: JobData | null
): string {
  const customerMessages = interactions
    .filter((i: InteractionRecord) => i.direction === "inbound")
    .map((i: InteractionRecord) => i.content.toLowerCase());

  const allContent = customerMessages.join(" ");

  let intent = "General inquiry";
  if (allContent.includes("quote") || allContent.includes("price") || allContent.includes("cost")) {
    intent = "Seeking pricing/quote information";
  } else if (allContent.includes("schedule") || allContent.includes("book") || allContent.includes("appointment")) {
    intent = "Wants to schedule a move or consultation";
  } else if (allContent.includes("status") || allContent.includes("where") || allContent.includes("track")) {
    intent = "Checking move/job status";
  } else if (allContent.includes("cancel") || allContent.includes("reschedule")) {
    intent = "Needs to modify or cancel booking";
  }

  let pricingStage = "lead";
  if (job) {
    pricingStage = job.status;
  }

  const specialNotes: string[] = [];
  if (allContent.includes("stairs") || allContent.includes("floor") || allContent.includes("elevator")) {
    specialNotes.push("Stairs/floor access mentioned");
  }
  if (allContent.includes("fragile") || allContent.includes("careful") || allContent.includes("delicate")) {
    specialNotes.push("Has fragile items");
  }
  if (allContent.includes("piano") || allContent.includes("pool table") || allContent.includes("safe") || allContent.includes("heavy")) {
    specialNotes.push("Has heavy/specialty items");
  }
  if (allContent.includes("storage")) {
    specialNotes.push("May need storage");
  }
  if (allContent.includes("pack") || allContent.includes("packing")) {
    specialNotes.push("Interested in packing services");
  }

  const parts = [
    "CUSTOMER SUMMARY",
    "================",
    "",
    "IDENTITY:",
    `- Name: ${customer.full_name || "Unknown"}`,
    `- Email: ${customer.email}`,
    `- Phone: ${customer.phone || "Not provided"}`,
    `- Source: ${customer.source}`,
    "",
    "INTENT:",
    `- ${intent}`,
    "",
  ];

  if (job) {
    parts.push("MOVE DETAILS:");
    parts.push(`- Move Date: ${job.move_date || "TBD"}`);
    parts.push(`- Home Size: ${job.home_size || "Not specified"}`);
    parts.push(`- From: ${job.from_address || "TBD"}`);
    parts.push(`- To: ${job.to_address || "TBD"}`);
    if (job.estimated_total) {
      parts.push(`- Estimated Cost: $${job.estimated_total}`);
    }
    parts.push("");
  } else {
    parts.push("MOVE DETAILS:");
    parts.push("- No job created yet");
    parts.push("");
  }

  parts.push("PRICING STAGE:");
  parts.push(`- ${pricingStage}`);
  parts.push("");

  parts.push("SPECIAL NOTES:");
  if (specialNotes.length > 0) {
    for (const note of specialNotes) {
      parts.push(`- ${note}`);
    }
  } else {
    parts.push("- No special requirements noted");
  }
  parts.push("");

  parts.push("CONVERSATION STATS:");
  parts.push(`- Total Riley interactions: ${interactions.length}`);
  parts.push(`- Customer messages: ${customerMessages.length}`);
  const channels = [...new Set(interactions.map((i: InteractionRecord) => i.channel))];
  parts.push(`- Channels used: ${channels.join(", ")}`);

  return parts.join("\n");
}