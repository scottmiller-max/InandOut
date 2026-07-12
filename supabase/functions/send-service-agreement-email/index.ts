import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ServiceAgreementRequest {
  to: string;
  customer_name: string;
  document_id?: string;
  document_title: string;
  document_url: string;
  acknowledgement_required?: boolean;
}

function buildHtml(p: ServiceAgreementRequest): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9">
<div style="max-width:600px;margin:0 auto;padding:24px">
<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<div style="background:#0f172a;padding:24px;text-align:center">
<h1 style="color:#fff;margin:0;font-size:22px">IN&amp;OUT Moving</h1>
<p style="color:#94a3b8;margin:4px 0 0;font-size:14px">Service Agreement</p>
</div>
<div style="padding:24px">
<p style="color:#1e293b;font-size:16px">Hi ${p.customer_name},</p>
<p style="color:#475569;font-size:14px;line-height:1.6">Please review the following document for your upcoming move:</p>
<div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e2e8f0">
<p style="margin:0 0 8px;color:#334155;font-weight:600;font-size:15px">${p.document_title}</p>
${p.acknowledgement_required ? `<p style="margin:0 0 12px;color:#dc2626;font-size:13px">This document requires your acknowledgement before your move.</p>` : ""}
<a href="${p.document_url}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:600">View Document</a>
</div>
<p style="color:#475569;font-size:14px;line-height:1.6">If you have any questions about the terms, please don't hesitate to reach out to us.</p>
</div>
<div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0">
<p style="color:#94a3b8;font-size:12px;margin:0">IN&amp;OUT Moving &bull; Professional Moving Services</p>
</div>
</div></div></body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["master_admin", "admin", "dispatcher"])
      .maybeSingle();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ServiceAgreementRequest = await req.json();
    if (!body.to || !body.customer_name || !body.document_title || !body.document_url) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, customer_name, document_title, document_url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const smtpFromEmail = Deno.env.get("SMTP_FROM_EMAIL");
    const smtpFromName = Deno.env.get("SMTP_FROM_NAME") || "IN&OUT Moving";

    if (!smtpHost || !smtpUser || !smtpPassword || !smtpFromEmail) {
      return new Response(
        JSON.stringify({ error: "SMTP configuration not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new SMTPClient({
      connection: { hostname: smtpHost, port: smtpPort, tls: true, auth: { username: smtpUser, password: smtpPassword } },
    });

    await client.send({
      from: `${smtpFromName} <${smtpFromEmail}>`,
      to: body.to,
      subject: `Service Agreement: ${body.document_title}`,
      content: `Hi ${body.customer_name}, please review your service agreement: ${body.document_title}. View it here: ${body.document_url}`,
      html: buildHtml(body),
    });
    await client.close();

    await supabase.from("audit_log").insert({
      actor_id: user.id,
      user_role: userRole.role,
      action: "send_service_agreement_email",
      action_category: "messaging",
      affected_entity_type: "document",
      metadata: { to: body.to, document_id: body.document_id, document_title: body.document_title },
      success: true,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Service agreement email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-service-agreement-email error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
