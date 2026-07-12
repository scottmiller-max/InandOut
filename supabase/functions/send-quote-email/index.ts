import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface QuoteEmailRequest {
  to: string;
  customer_name: string;
  quote_id?: string;
  move_date: string;
  from_address: string;
  to_address: string;
  home_size?: string;
  crew_size?: number;
  estimated_hours?: number;
  hourly_rate?: number;
  estimated_total: number;
  deposit_required?: number;
  valid_until?: string;
  notes?: string;
}

function buildHtml(p: QuoteEmailRequest): string {
  const rows = [
    ["Move Date", p.move_date],
    ["From", p.from_address],
    ["To", p.to_address],
    p.home_size ? ["Home Size", p.home_size] : null,
    p.crew_size ? ["Crew Size", `${p.crew_size} movers`] : null,
    p.estimated_hours ? ["Estimated Hours", `${p.estimated_hours}`] : null,
    p.hourly_rate ? ["Hourly Rate", `$${p.hourly_rate}`] : null,
    ["Estimated Total", `$${p.estimated_total.toFixed(2)}`],
    p.deposit_required
      ? ["Deposit Required", `$${p.deposit_required.toFixed(2)}`]
      : null,
    p.valid_until ? ["Quote Valid Until", p.valid_until] : null,
  ]
    .filter(Boolean)
    .map(
      (r) =>
        `<tr><td style="padding:8px 12px;font-weight:600;color:#334155">${r![0]}</td><td style="padding:8px 12px;color:#475569">${r![1]}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9">
<div style="max-width:600px;margin:0 auto;padding:24px">
<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<div style="background:#0f172a;padding:24px;text-align:center">
<h1 style="color:#fff;margin:0;font-size:22px">IN&amp;OUT Moving</h1>
<p style="color:#94a3b8;margin:4px 0 0;font-size:14px">Your Move Quote</p>
</div>
<div style="padding:24px">
<p style="color:#1e293b;font-size:16px">Hi ${p.customer_name},</p>
<p style="color:#475569;font-size:14px;line-height:1.6">Thank you for your interest in IN&amp;OUT Moving. Here is your personalized quote:</p>
${p.quote_id ? `<p style="color:#64748b;font-size:13px">Quote #${p.quote_id}</p>` : ""}
<table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:8px">${rows}</table>
${p.notes ? `<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0"><p style="margin:0;color:#92400e;font-size:13px"><strong>Notes:</strong> ${p.notes}</p></div>` : ""}
<p style="color:#475569;font-size:14px;line-height:1.6">If you have any questions or would like to book this move, please reply to this email or call us.</p>
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
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: QuoteEmailRequest = await req.json();
    if (!body.to || !body.customer_name || !body.estimated_total) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: to, customer_name, estimated_total",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: { username: smtpUser, password: smtpPassword },
      },
    });

    await client.send({
      from: `${smtpFromName} <${smtpFromEmail}>`,
      to: body.to,
      subject: `Your Move Quote from IN&OUT Moving`,
      content: `Hi ${body.customer_name}, your estimated total is $${body.estimated_total.toFixed(2)}. Reply to this email for questions.`,
      html: buildHtml(body),
    });
    await client.close();

    await supabase.from("audit_log").insert({
      actor_id: user.id,
      user_role: userRole.role,
      action: "send_quote_email",
      action_category: "messaging",
      affected_entity_type: "customer",
      metadata: { to: body.to, customer_name: body.customer_name },
      success: true,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Quote email sent" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("send-quote-email error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
