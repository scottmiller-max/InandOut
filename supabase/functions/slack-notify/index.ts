import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireStaffOrSecret, jsonError } from "../_shared/auth.ts";

/**
 * Server-side Slack sender.
 *
 * The Slack webhook URL and bot token used to live in the CLIENT as
 * EXPO_PUBLIC_* vars, which means they shipped inside the app bundle and could be
 * extracted. They now live ONLY here as server secrets (SLACK_WEBHOOK_URL,
 * SLACK_BOT_TOKEN) and are never exposed to the browser/app.
 *
 * The client sends the message payload (no secrets) and this function performs the
 * actual Slack call.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-internal-secret",
};

interface SlackNotifyRequest {
  mode?: "webhook" | "channel";
  // webhook mode: the full Slack message object (text/attachments/blocks)
  message?: Record<string, unknown>;
  // channel mode: post via bot token
  channel?: string;
  text?: string;
  blocks?: unknown[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonError("Method not allowed", 405, corsHeaders);
  }

  // Slack notifications are staff/automation only.
  const auth = await requireStaffOrSecret(req);
  if (!auth.authorized) return jsonError(auth.error!, auth.status, corsHeaders);

  try {
    const body: SlackNotifyRequest = await req.json();
    const mode = body.mode ?? "webhook";

    if (mode === "channel") {
      const botToken = Deno.env.get("SLACK_BOT_TOKEN");
      if (!botToken) return jsonError("Slack bot token not configured", 503, corsHeaders);
      if (!body.channel || !body.text) {
        return jsonError("channel and text are required for channel mode", 400, corsHeaders);
      }
      const resp = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${botToken}`,
        },
        body: JSON.stringify({ channel: body.channel, text: body.text, blocks: body.blocks }),
      });
      const data = await resp.json();
      return new Response(
        JSON.stringify({ ok: data.ok === true, error: data.error }),
        { status: data.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // default: incoming-webhook mode
    const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
    if (!webhookUrl) return jsonError("Slack webhook not configured", 503, corsHeaders);
    if (!body.message) return jsonError("message is required for webhook mode", 400, corsHeaders);

    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.message),
    });
    return new Response(
      JSON.stringify({ ok: resp.ok }),
      { status: resp.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("slack-notify error:", err);
    return jsonError("Internal server error", 500, corsHeaders);
  }
});
