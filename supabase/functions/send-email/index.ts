import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { requireUserOrSecret, jsonError } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // AUTHORIZATION: sends mail through your SMTP account. Any authenticated user
  // (staff OR a customer triggering their own booking confirmation) or the internal
  // shared secret. Without this it's an open relay that lets anyone send email as
  // your company (phishing/spam).
  const auth = await requireUserOrSecret(req);
  if (!auth.authorized) return jsonError(auth.error!, auth.status, corsHeaders);

  try {
    const { to, subject, html, text, replyTo }: EmailRequest = await req.json();

    if (!to || !subject || (!html && !text)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, and html or text" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get SMTP configuration from environment
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const smtpFromEmail = Deno.env.get("SMTP_FROM_EMAIL");
    const smtpFromName = Deno.env.get("SMTP_FROM_NAME") || "IN&OUT Moving";

    if (!smtpHost || !smtpUser || !smtpPassword || !smtpFromEmail) {
      console.error("SMTP configuration missing");
      return new Response(
        JSON.stringify({ error: "SMTP configuration not set" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPassword,
        },
      },
    });

    // Send email
    await client.send({
      from: `${smtpFromName} <${smtpFromEmail}>`,
      to: to,
      subject: subject,
      content: text || "",
      html: html,
      ...(replyTo && { replyTo }),
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to send email", 
        details: error instanceof Error ? error.message : String(error) 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});