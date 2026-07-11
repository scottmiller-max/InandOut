import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReviewRequestPayload {
  to: string;
  customer_name: string;
  job_id?: string;
  move_date?: string;
  review_url?: string;
}

function buildHtml(p: ReviewRequestPayload): string {
  const reviewLink = p.review_url || "https://g.page/r/inandoutmoving/review";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9">
<div style="max-width:600px;margin:0 auto;padding:24px">
<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
<div style="background:#0f172a;padding:24px;text-align:center">
<h1 style="color:#fff;margin:0;font-size:22px">IN&amp;OUT Moving</h1>
<p style="color:#94a3b8;margin:4px 0 0;font-size:14px">How Did We Do?</p>
</div>
<div style="padding:24px">
<p style="color:#1e293b;font-size:16px">Hi ${p.customer_name},</p>
<p style="color:#475569;font-size:14px;line-height:1.6">Thank you for choosing IN&amp;OUT Moving${p.move_date ? ` for your ${p.move_date} move` : ""}! We hope everything went smoothly.</p>
<p style="color:#475569;font-size:14px;line-height:1.6">Your feedback helps us improve and helps other families find reliable movers. Would you take a moment to share your experience?</p>
<div style="text-align:center;margin:24px 0">
<a href="${reviewLink}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600">Leave a Review</a>
</div>
<p style="color:#94a3b8;font-size:13px;text-align:center">It only takes a minute and means the world to our team.</p>
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

    const body: ReviewRequestPayload = await req.json();
    if (!body.to || !body.customer_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, customer_name" }),
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
      subject: "How was your move? We'd love your feedback!",
      content: `Hi ${body.customer_name}, thank you for choosing IN&OUT Moving! Please leave us a review.`,
      html: buildHtml(body),
    });
    await client.close();

    await supabase.from("audit_log").insert({
      actor_id: user.id,
      user_role: userRole.role,
      action: "send_review_request_email",
      action_category: "messaging",
      affected_entity_type: "customer",
      metadata: { to: body.to, job_id: body.job_id },
      success: true,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Review request email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-review-request-email error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
