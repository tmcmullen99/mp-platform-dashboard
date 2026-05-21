// P8.2 notify_war_room_message — sends an email when a new war room message is created.
// Called from the client after a successful INSERT into war_room_messages.
// Picks the recipient as the opposite side of the sender, builds a Resend email,
// links to the war room URL on the correct surface (agent dashboard vs client portal).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://mp-platform-dashboard.pages.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "POST only");

  try {
    // Auth via JWT — sender must be authenticated (either agent or client)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonError(401, "Missing bearer");
    const jwt = authHeader.slice(7);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData.user) return jsonError(401, "Invalid token");
    const sender = userData.user;

    const { message_id } = await req.json();
    if (!message_id) return jsonError(400, "message_id required");

    // Pull the message, war room, client, deal, agent, branding
    const { data: msg, error: mErr } = await admin
      .from("war_room_messages")
      .select("*")
      .eq("id", message_id)
      .single();
    if (mErr || !msg) return jsonError(404, "Message not found");

    const { data: room } = await admin
      .from("war_rooms")
      .select("*")
      .eq("id", msg.war_room_id)
      .single();
    if (!room) return jsonError(404, "War room not found");

    const { data: client } = await admin
      .from("clients")
      .select("*")
      .eq("id", room.client_id)
      .single();
    if (!client) return jsonError(404, "Client not found");

    const { data: branding } = await admin
      .from("tenant_branding")
      .select("*")
      .eq("tenant_id", client.tenant_id)
      .maybeSingle();

    // Resolve agent email (the client.agent_id user)
    let agentEmail: string | null = null;
    let agentName = "your agent";
    if (client.agent_id) {
      const { data: agentUser } = await admin.auth.admin.getUserById(client.agent_id);
      agentEmail = agentUser?.user?.email || null;
      const { data: agentProfile } = await admin
        .from("user_profiles")
        .select("display_name")
        .eq("user_id", client.agent_id)
        .maybeSingle();
      if (agentProfile?.display_name) agentName = agentProfile.display_name;
    }

    // Determine recipient: opposite of sender_type
    let recipientEmail: string | null = null;
    let recipientName = "";
    let recipientLink = "";
    if (msg.sender_type === "agent") {
      // notify the client
      recipientEmail = client.email;
      recipientName = client.name;
      recipientLink = `${APP_URL}/portal/war-room`;
    } else if (msg.sender_type === "client") {
      // notify the agent
      recipientEmail = agentEmail;
      recipientName = agentName;
      recipientLink = `${APP_URL}/clients/${client.id}/war_room`;
    } else {
      // system: skip
      return new Response(JSON.stringify({ ok: true, skipped: "system message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "no recipient email on file" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fromName = branding?.brokerage_display_name || "McMullen Properties";
    const fromEmail = branding?.agent_email || "tim@mcmullen-properties.com";
    const replyTo = branding?.reply_to_email || "tim@mcmullen.properties";
    const brandColor = branding?.primary_color || "#1a1f2e";

    const senderLabel = msg.sender_type === "agent" ? agentName : client.name;
    const subject = `${senderLabel} sent you a message · ${room.name}`;
    const html = renderMessageEmail({
      recipientName,
      senderLabel,
      brokerageName: fromName,
      roomName: room.name,
      body: msg.body || "",
      link: recipientLink,
      brandColor,
    });

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [recipientEmail],
        reply_to: replyTo,
        subject,
        html,
      }),
    });

    if (!resendResp.ok) {
      const errBody = await resendResp.text();
      return jsonError(502, "Resend rejected: " + errBody);
    }
    const resendJson = await resendResp.json();

    // Also write an in-app notification
    await admin.from("notifications").insert({
      tenant_id: client.tenant_id,
      recipient_type: msg.sender_type === "agent" ? "client" : "agent",
      recipient_id: msg.sender_type === "agent" ? client.id : client.agent_id,
      notification_type: "war_room_message",
      title: `New message from ${senderLabel}`,
      body: (msg.body || "").slice(0, 200),
      link_url: recipientLink,
    });

    return new Response(
      JSON.stringify({ ok: true, resend_id: resendJson.id, recipient: recipientEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return jsonError(500, "Internal: " + (e instanceof Error ? e.message : String(e)));
  }
});

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function renderMessageEmail(opts: {
  recipientName: string;
  senderLabel: string;
  brokerageName: string;
  roomName: string;
  body: string;
  link: string;
  brandColor: string;
}): string {
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const bodyHtml = safe(opts.body).replace(/\n/g, "<br>");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>New message</title></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:560px;">
        <tr><td style="padding:40px 40px 0;">
          <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#888;margin-bottom:8px;">${safe(opts.brokerageName)} · ${safe(opts.roomName)}</div>
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:22px;line-height:1.3;color:#1a1f2e;margin:0 0 24px;">New message from ${safe(opts.senderLabel)}</h1>
          <div style="border-left:3px solid ${opts.brandColor};padding:8px 16px;font-size:15px;line-height:1.6;color:#444;margin:0 0 32px;">${bodyHtml}</div>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${opts.brandColor};"><a href="${opts.link}" style="display:inline-block;padding:12px 24px;color:#fffaf0;text-decoration:none;font-size:14px;letter-spacing:0.05em;">View war room</a></td></tr></table>
        </td></tr>
        <tr><td style="padding:40px;border-top:1px solid #eee;font-size:11px;color:#aaa;">Reply directly to this email or open the war room to keep the thread tidy.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
