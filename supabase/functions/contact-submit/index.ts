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
  honeypot?: string; // Spam prevention field
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body: ContactSubmission = await req.json();

    // Basic spam prevention - honeypot field should be empty
    if (body.honeypot) {
      return new Response(
        JSON.stringify({ success: true, message: "Thank you for your submission" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate required fields
    if (!body.name || !body.email || !body.message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: name, email, and message are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate message length
    if (body.message.length < 10) {
      return new Response(
        JSON.stringify({ error: "Message must be at least 10 characters long" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get request metadata
    const userAgent = req.headers.get("user-agent") || "Unknown";
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0] : "Unknown";

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert contact submission into database
    const { data, error } = await supabase
      .from("contact_submissions")
      .insert({
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        subject: body.subject || null,
        message: body.message,
        source: body.source || "landing_page",
        user_agent: userAgent,
        ip_address: ipAddress,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save submission" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send Slack notification to admins
    const slackWebhookUrl = Deno.env.get("EXPO_PUBLIC_SLACK_WEBHOOK_URL");
    if (slackWebhookUrl) {
      try {
        const slackMessage = {
          text: "🆕 New Contact Form Submission",
          attachments: [
            {
              color: "#3b82f6",
              fields: [
                {
                  title: "Name",
                  value: body.name,
                  short: true,
                },
                {
                  title: "Email",
                  value: body.email,
                  short: true,
                },
                {
                  title: "Phone",
                  value: body.phone || "Not provided",
                  short: true,
                },
                {
                  title: "Subject",
                  value: body.subject || "No subject",
                  short: true,
                },
                {
                  title: "Message",
                  value: body.message.length > 200 
                    ? body.message.substring(0, 200) + "..." 
                    : body.message,
                  short: false,
                },
                {
                  title: "Source",
                  value: body.source || "landing_page",
                  short: true,
                },
                {
                  title: "Submitted At",
                  value: new Date().toLocaleString(),
                  short: true,
                },
              ],
            },
          ],
        };

        await fetch(slackWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slackMessage),
        });
      } catch (slackError) {
        console.error("Failed to send Slack notification:", slackError);
        // Don't fail the request if Slack notification fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Thank you for your message! We'll get back to you soon.",
        submissionId: data.id,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing contact submission:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred while processing your submission",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
