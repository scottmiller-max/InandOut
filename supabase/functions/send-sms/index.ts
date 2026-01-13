import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendSMSRequest {
  to: string;
  message: string;
  customer_id?: string;
  skip_consent_check?: boolean;
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
    const body: SendSMSRequest = await req.json();

    // Validate required fields
    if (!body.to || !body.message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to and message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone format (basic E.164 check)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanPhone = body.to.replace(/[^\d+]/g, '');
    
    if (!phoneRegex.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format. Use E.164 format (e.g., +1234567890)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for Twilio credentials
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return new Response(
        JSON.stringify({ 
          error: "SMS service not configured",
          details: "Twilio credentials are missing. Please configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables."
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check SMS consent if customer_id provided
    if (body.customer_id && !body.skip_consent_check) {
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("sms_consent")
        .eq("id", body.customer_id)
        .maybeSingle();

      if (customerError) {
        console.error("Customer lookup failed:", customerError);
        return new Response(
          JSON.stringify({ error: "Failed to verify SMS consent" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!customer) {
        return new Response(
          JSON.stringify({ error: "Customer not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!customer.sms_consent) {
        return new Response(
          JSON.stringify({ 
            error: "SMS consent not granted",
            details: "Customer has not consented to receive SMS messages"
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const authHeader = `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`;

    const formData = new URLSearchParams();
    formData.append("To", cleanPhone);
    formData.append("From", twilioPhoneNumber);
    formData.append("Body", body.message);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio API error:", twilioData);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send SMS",
          details: twilioData.message || "Twilio API error"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log outbound interaction if customer_id provided
    if (body.customer_id) {
      await supabase
        .from("interactions")
        .insert({
          customer_id: body.customer_id,
          interaction_type: "sms",
          channel: "sms",
          direction: "outbound",
          content: body.message,
          notes: `SMS sent to ${cleanPhone}. Twilio SID: ${twilioData.sid}`,
          handled_by: "automated",
        });

      // Update last_interaction_at
      await supabase
        .from("customers")
        .update({ last_interaction_at: new Date().toISOString() })
        .eq("id", body.customer_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_sid: twilioData.sid,
        status: twilioData.status,
        to: cleanPhone,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("send-sms error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
