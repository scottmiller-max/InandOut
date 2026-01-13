import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PromoteContactRequest {
  contact_submission_id: string;
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
    const body: PromoteContactRequest = await req.json();

    // Validate required fields
    if (!body.contact_submission_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: contact_submission_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the contact submission
    const { data: submission, error: submissionError } = await supabase
      .from("contact_submissions")
      .select("*")
      .eq("id", body.contact_submission_id)
      .maybeSingle();

    if (submissionError) {
      console.error("Contact submission lookup failed:", submissionError);
      return new Response(
        JSON.stringify({ error: "Failed to lookup contact submission" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!submission) {
      return new Response(
        JSON.stringify({ error: "Contact submission not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let customer;

    // If customer_id already linked, just return the customer
    if (submission.customer_id) {
      const { data: existingCustomer, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", submission.customer_id)
        .single();

      if (customerError) {
        console.error("Customer lookup failed:", customerError);
        return new Response(
          JSON.stringify({ error: "Failed to lookup customer" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      customer = existingCustomer;

      // Update status to promoted
      await supabase
        .from("contact_submissions")
        .update({ status: "promoted" })
        .eq("id", body.contact_submission_id);

    } else {
      // Create customer from submission data
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .upsert(
          {
            full_name: submission.name,
            email: submission.email,
            phone: submission.phone || null,
            source: submission.source || "website",
            email_consent: true,
            sms_consent: !!submission.consent,
            last_interaction_at: new Date().toISOString(),
          },
          { onConflict: "email" }
        )
        .select()
        .single();

      if (customerError) {
        console.error("Customer creation failed:", customerError);
        return new Response(
          JSON.stringify({ error: "Failed to create customer", details: customerError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      customer = newCustomer;

      // Link customer_id to contact submission and update status
      await supabase
        .from("contact_submissions")
        .update({
          customer_id: customer.id,
          status: "promoted"
        })
        .eq("id", body.contact_submission_id);

      // Log promotion interaction
      await supabase
        .from("interactions")
        .insert({
          customer_id: customer.id,
          contact_submission_id: body.contact_submission_id,
          interaction_type: "note",
          channel: "web_form",
          direction: "inbound",
          content: "Contact submission promoted to customer",
          notes: `Promoted from submission: ${submission.subject || 'No subject'}`,
          handled_by: "human",
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        customer: customer,
        already_promoted: !!submission.customer_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("promote-contact error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
