import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ContactSubmission {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  source?: string;
  consent?: boolean;
  honeypot?: string;
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
    const body: ContactSubmission = await req.json();

    // Honeypot spam trap
    if (body.honeypot) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Required fields
    if (!body.name || !body.email || !body.message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Message length
    if (body.message.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Message too short" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Metadata
    const userAgent = req.headers.get("user-agent") || "Unknown";
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0] : "Unknown";

    // Supabase client (service role)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    /* -------------------------------------------------------
       1. UPSERT CUSTOMER
    ------------------------------------------------------- */
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .upsert(
        {
          full_name: body.name,
          email: body.email,
          phone: body.phone || null,
          source: body.source || "website",
          email_consent: true,
          sms_consent: !!body.consent,
          last_interaction_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      )
      .select()
      .single();

    if (customerError) {
      console.error("Customer upsert failed:", customerError);
      throw new Error("Customer creation failed");
    }

    /* -------------------------------------------------------
       2. CONTACT SUBMISSION (AUDIT LOG)
    ------------------------------------------------------- */
    const { data: submission, error: submissionError } = await supabase
      .from("contact_submissions")
      .insert({
        customer_id: customer.id,
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        subject: body.subject || null,
        message: body.message,
        source: body.source || "website",
        consent: !!body.consent,
        consent_timestamp: body.consent ? new Date().toISOString() : null,
        user_agent: userAgent,
        ip_address: ipAddress,
        status: "new",
      })
      .select()
      .single();

    if (submissionError) {
      console.error("Submission insert failed:", submissionError);
      throw new Error("Submission failed");
    }

    /* -------------------------------------------------------
       3. INTERACTION RECORD
    ------------------------------------------------------- */
    await supabase.from("interactions").insert({
      customer_id: customer.id,
      contact_submission_id: submission.id,
      interaction_type: "note",
      channel: "web_form",
      direction: "inbound",
      content: body.message,
      notes: `Contact form submission: ${body.subject || 'No subject'}`,
      handled_by: "human",
    });

    /* -------------------------------------------------------
       4. SLACK NOTIFICATION (OPTIONAL)
    ------------------------------------------------------- */
    const slackWebhookUrl = Deno.env.get("EXPO_PUBLIC_SLACK_WEBHOOK_URL");
    if (slackWebhookUrl) {
      await fetch(slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "New Contact Submission",
          attachments: [
            {
              fields: [
                { title: "Name", value: body.name, short: true },
                { title: "Email", value: body.email, short: true },
                { title: "Phone", value: body.phone || "--", short: true },
                { title: "Source", value: body.source || "website", short: true },
              ],
            },
          ],
        }),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        customerId: customer.id,
        submissionId: submission.id,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("contact-submit error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});