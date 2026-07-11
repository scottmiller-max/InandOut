import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MoveReminderRequest {
  to: string;
  customer_name: string;
  job_id?: string;
  move_date: string;
  move_time?: string;
  from_address: string;
  to_address: string;
  crew_size?: number;
  special_instructions?: string;
}

function buildHtml(p: MoveReminderRequest): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9">
<div style="max-width:600px;margin:0 auto;padding:24px">
<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<div style="background:#0f172a;padding:24px;text-align:center">
<h1 style="color:#fff;margin:0;font-size:22px">IN&amp;OUT Moving</h1>
<p style="color:#94a3b8;margin:4px 0 0;font-size:14px">Move Day Reminder</p>
</div>
<div style="padding:24px">
<p style="color:#1e293b;font-size:16px">Hi ${p.customer_name},</p>
<p style="color:#475569;font-size:14px;line-height:1.6">This is a friendly reminder that your move is coming up!</p>
<div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0">
<p style="margin:0 0 8px;color:#334155;font-weight:600">Move Date: ${p.move_date}${p.move_time ? ` at ${p.move_time}` : ""}</p>
<p style="margin:0 0 8px;color:#475569;font-size:14px">From: ${p.from_address}</p>
<p style="margin:0 0 8px;color:#475569;font-size:14px">To: ${p.to_address}</p>
${p.crew_size ? `<p style="margin:0;color:#475569;font-size:14px">Crew: ${p.crew_size} movers</p>` : ""}
</div>
${p.special_instructions ? `<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0"><p style="margin:0;color:#92400e;font-size:13px"><strong>Special Instructions:</strong> ${p.special_instructions}</p></div>` : ""}
<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0">
<p style="margin:0 0 4px;color:#1e40af;font-size:13px;font-weight:600">Preparation Checklist:</p>
<ul style="margin:4px 0 0;padding-left:16px;color:#1e40af;font-size:13px">
<li>Clear pathways and hallways</li>
<li>Label fragile items clearly</li>
<li>Prepare an essentials bag for move day</li>
<li>Ensure parking is available for the truck</li>
</ul>
</div>
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

    const body: MoveReminderRequest = await req.json();
    if (!body.to || !body.customer_name || !body.move_date || !body.from_address || !body.to_address) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, customer_name, move_date, from_address, to_address" }),
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
      subject: `Move Reminder - ${body.move_date}`,
      content: `Hi ${body.customer_name}, this is a reminder that your move is scheduled for ${body.move_date}.`,
      html: buildHtml(body),
    });
    await client.close();

    await supabase.from("audit_log").insert({
      actor_id: user.id,
      user_role: userRole.role,
      action: "send_move_reminder_email",
      action_category: "messaging",
      affected_entity_type: "customer",
      metadata: { to: body.to, move_date: body.move_date, job_id: body.job_id },
      success: true,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Move reminder email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-move-reminder-email error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
