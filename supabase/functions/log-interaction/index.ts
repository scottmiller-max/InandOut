import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LogInteractionRequest {
  customer_id?: string;
  customer_email?: string;
  interaction_type: "call" | "email" | "sms" | "note" | "voicemail";
  channel: "phone" | "email" | "sms" | "web_form" | "in_person" | "video" | "chat";
  direction: "inbound" | "outbound";
  content: string;
  notes?: string;
  handled_by?: "human" | "ai" | "automated";
  contact_submission_id?: string;
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
    const body: LogInteractionRequest = await req.json();

    // Validate required fields
    if (!body.interaction_type || !body.channel || !body.direction || !body.content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: interaction_type, channel, direction, content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Must have either customer_id or customer_email
    if (!body.customer_id && !body.customer_email) {
      return new Response(
        JSON.stringify({ error: "Either customer_id or customer_email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let customerId = body.customer_id;

    // If customer_email provided but not customer_id, resolve it
    if (!customerId && body.customer_email) {
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id")
        .eq("email", body.customer_email)
        .maybeSingle();

      if (customerError) {
        console.error("Customer lookup failed:", customerError);
        return new Response(
          JSON.stringify({ error: "Failed to lookup customer" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!customer) {
        return new Response(
          JSON.stringify({ error: "Customer not found with provided email" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      customerId = customer.id;
    }

    // Insert interaction record
    const { data: interaction, error: interactionError } = await supabase
      .from("interactions")
      .insert({
        customer_id: customerId,
        contact_submission_id: body.contact_submission_id || null,
        interaction_type: body.interaction_type,
        channel: body.channel,
        direction: body.direction,
        content: body.content,
        notes: body.notes || null,
        handled_by: body.handled_by || "human",
      })
      .select()
      .single();

    if (interactionError) {
      console.error("Interaction insert failed:", interactionError);
      return new Response(
        JSON.stringify({ error: "Failed to log interaction", details: interactionError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update customer's last_interaction_at
    await supabase
      .from("customers")
      .update({ last_interaction_at: new Date().toISOString() })
      .eq("id", customerId);

    return new Response(
      JSON.stringify({
        success: true,
        interaction: interaction,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("log-interaction error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
