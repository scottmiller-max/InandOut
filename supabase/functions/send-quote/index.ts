import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function escapeHtml(str: string) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function to2(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

type QuoteLineItem = {
  label: string;       // e.g. "2-hour minimum labor"
  description?: string;// optional
  amount: number;      // e.g. 300
};

type SendQuoteBody = {
  to: string;
  customer_name: string;
  quote_id: string;

  hi_tax_rate: number;     // e.g. 4.712
  line_items: QuoteLineItem[];

  notes?: string;          // optional note displayed under totals
  from_address?: string;
  to_address?: string;
  move_date?: string;
};

async function sendResendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
  tags?: { name: string; value: string }[];
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFrom = Deno.env.get("RESEND_FROM_EMAIL") || "quotes@inandoutmovin.com";
  const resendReplyTo = Deno.env.get("RESEND_REPLY_TO") || "support@inandoutmovin.com";
  if (!resendApiKey) throw new Error("Missing RESEND_API_KEY");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `IN&OUT Moving Quotes <${resendFrom}>`,
      to: args.to,
      reply_to: resendReplyTo,
      subject: args.subject,
      html: args.html,
      text: args.text,
      tags: args.tags || [],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Resend failed: ${res.status} ${errText}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as SendQuoteBody;

    const required = ["to", "customer_name", "quote_id"] as const;
    for (const k of required) {
      if (!body[k] || String(body[k]).trim().length === 0) {
        return new Response(JSON.stringify({ error: `Missing field: ${k}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    if (!Array.isArray(body.line_items) || body.line_items.length === 0) {
      return new Response(JSON.stringify({ error: "Missing field: line_items" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof body.hi_tax_rate !== "number" || Number.isNaN(body.hi_tax_rate) || body.hi_tax_rate < 0) {
      return new Response(JSON.stringify({ error: "Invalid field: hi_tax_rate" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subtotal = body.line_items.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);
    const taxAmount = subtotal * (body.hi_tax_rate / 100);
    const total = subtotal + taxAmount;

    const lineItemsRows = body.line_items
      .map((li) => {
        const label = escapeHtml(li.label);
        const desc = li.description ? `<div style="font-size:12px;color:#475569;">${escapeHtml(li.description)}</div>` : "";
        return `
<tr>
  <td style="padding:6px 0;">
    <div style="font-weight:600;">${label}</div>
    ${desc}
  </td>
  <td align="right" style="padding:6px 0;font-weight:600;">$${escapeHtml(to2(Number(li.amount) || 0))}</td>
</tr>`;
      })
      .join("");

    const customerName = escapeHtml(body.customer_name);

    const html = `
<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;background:#f8fafc;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <div style="padding:18px 22px;background:#0f172a;color:#ffffff;">
      <div style="font-size:14px;letter-spacing:.4px;opacity:.9;">IN&OUT Moving</div>
      <div style="font-size:20px;font-weight:700;margin-top:6px;">Your Moving Quote is Ready</div>
      <div style="font-size:13px;margin-top:6px;opacity:.9;">Aloha — here are your details</div>
    </div>

    <div style="padding:22px;">
      <p>Hi ${customerName},</p>
      <p>Mahalo for choosing <strong>IN&OUT Moving</strong>. Below is your personalized moving quote.</p>

      ${
        body.move_date || body.from_address || body.to_address
          ? `<div style="background:#f1f5f9;border:1px solid #e2e8f0;padding:14px;border-radius:12px;margin:14px 0;">
              <p style="font-weight:700;margin:0 0 8px;">Move Details</p>
              <div style="font-size:14px;color:#0f172a;">
                ${body.move_date ? `<div><strong>Date:</strong> ${escapeHtml(body.move_date)}</div>` : ""}
                ${body.from_address ? `<div><strong>From:</strong> ${escapeHtml(body.from_address)}</div>` : ""}
                ${body.to_address ? `<div><strong>To:</strong> ${escapeHtml(body.to_address)}</div>` : ""}
              </div>
            </div>`
          : ""
      }

      <div style="background:#f1f5f9;border:1px solid #e2e8f0;padding:14px;border-radius:12px;margin:14px 0;">
        <p style="font-weight:700;margin:0 0 10px;">Quote Summary</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${lineItemsRows}
        </table>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0;" />

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td>Subtotal</td><td align="right"><strong>$${escapeHtml(to2(subtotal))}</strong></td></tr>
          <tr><td>Hawaii Sales Tax (${escapeHtml(to2(body.hi_tax_rate))}%)</td><td align="right"><strong>$${escapeHtml(to2(taxAmount))}</strong></td></tr>
          <tr><td style="font-size:16px;font-weight:700;">Total</td><td align="right" style="font-size:16px;font-weight:700;">$${escapeHtml(to2(total))}</td></tr>
        </table>
      </div>

      ${body.notes ? `<p style="margin:0 0 12px;color:#334155;">${escapeHtml(body.notes)}</p>` : ""}

      <p>This quote is valid for <strong>7 days</strong>.</p>

      <p>
        To reserve your move date, a deposit equal to <strong>50% of the total invoice</strong> is required at booking.
        <span style="color:#475569;">(Members Club customers will receive priority booking with no deposit required.)</span>
      </p>

      <div style="background:#ecfeff;border:1px solid #bae6fd;padding:14px;border-radius:12px;margin:14px 0;">
        <p style="font-weight:700;margin:0 0 8px;">Our Promise to You</p>
        <ul style="margin:0;padding-left:18px;">
          <li>No hidden fees</li>
          <li>Licensed & insured professional movers</li>
          <li>Satisfaction guaranteed</li>
          <li>Transparent pricing</li>
        </ul>
      </div>

      <p>Once you decide to move forward, we'll send any required service agreements and booking forms for quick electronic signature.</p>

      <p>Ready to book or have questions? Reply to this email or call <strong>(833) 466-6881</strong>.</p>

      <p style="font-size:12px;color:#475569;">Quote ID: ${escapeHtml(body.quote_id)}</p>
      <p>—<br/>IN&OUT Moving</p>
    </div>
  </div>
</div>
    `.trim();

    const lineItemsText = body.line_items
      .map((li) => `- ${li.label}${li.description ? ` (${li.description})` : ""}: $${to2(Number(li.amount) || 0)}`)
      .join("\n");

    const text = [
      `Aloha ${body.customer_name},`,
      "",
      "Mahalo for choosing IN&OUT Moving. Your personalized moving quote is below.",
      "",
      ...(body.move_date ? [`Move Date: ${body.move_date}`] : []),
      ...(body.from_address ? [`Move From: ${body.from_address}`] : []),
      ...(body.to_address ? [`Move To: ${body.to_address}`] : []),
      ...(body.move_date || body.from_address || body.to_address ? [""] : []),
      "LINE ITEMS",
      lineItemsText,
      "",
      `Subtotal: $${to2(subtotal)}`,
      `Hawaii Sales Tax (${to2(body.hi_tax_rate)}%): $${to2(taxAmount)}`,
      `Total: $${to2(total)}`,
      "",
      "This quote is valid for 7 days.",
      "To reserve your move date, a deposit equal to 50% of the total invoice is required at booking.",
      "(Members Club customers will receive priority booking with no deposit required.)",
      "",
      "Our Promise: No hidden fees • Licensed & insured • Satisfaction guaranteed • Transparent pricing",
      "",
      "Questions or ready to book? Reply to this email or call (833) 466-6881.",
      `Quote ID: ${body.quote_id}`,
      "",
      "— IN&OUT Moving",
    ].join("\n");

    await sendResendEmail({
      to: body.to,
      subject: "Aloha 🌺 Your quote is ready — IN&OUT Moving",
      html,
      text,
      tags: [
        { name: "type", value: "quote_sent" },
        { name: "quote_id", value: String(body.quote_id) },
      ],
    });

    return new Response(JSON.stringify({ success: true, subtotal: to2(subtotal), tax: to2(taxAmount), total: to2(total) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-quote-email error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
