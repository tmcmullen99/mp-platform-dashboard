// P8.2 invite_client — sends a portal invitation to a client.
// Flow: agent calls this with { client_id }. Function generates a Supabase magic link
// for the client's email, then sends a branded invitation via Resend.
// The first sign-in fires the auto_link_client_to_auth trigger which writes
// auth_user_id back to the clients row.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const PORTAL_URL = Deno.env.get("PORTAL_URL") || "https://mp-platform-dashboard.pages.dev/portal";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Authenticate the requesting agent via their JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonError(401, "Missing bearer token");
    }
    const jwt = authHeader.slice(7);

    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });
    const {
      data: { user: agent },
      error: authErr,
    } = await userClient.auth.getUser(jwt);
    if (authErr || !agent) return jsonError(401, "Invalid session");

    // 2. Parse + validate input
    const { client_id } = await req.json();
    if (!client_id) return jsonError(400, "client_id required");

    // 3. Service-role client for privileged operations
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 4. Load the client row, branding, agent profile
    const { data: client, error: cErr } = await admin
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .single();
    if (cErr || !client) return jsonError(404, "Client not found");
    if (!client.email) return jsonError(400, "Client has no email");

    // verify the requesting agent belongs to this client's tenant
    const { data: tenantUser } = await admin
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", client.tenant_id)
      .eq("user_id", agent.id)
      .maybeSingle();
    if (!tenantUser) return jsonError(403, "Not a member of this tenant");

    const { data: branding } = await admin
      .from("tenant_branding")
      .select("*")
      .eq("tenant_id", client.tenant_id)
      .maybeSingle();

    const { data: agentProfile } = await admin
      .from("user_profiles")
      .select("*")
      .eq("user_id", agent.id)
      .maybeSingle();

    // 5. Generate a magic link
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: client.email,
      options: { redirectTo: PORTAL_URL },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      return jsonError(500, "Could not generate magic link: " + (linkErr?.message || "unknown"));
    }
    const magicLink = linkData.properties.action_link;

    // 6. Send the email via Resend
    const fromName = branding?.brokerage_display_name || "McMullen Properties";
    const fromEmail = branding?.agent_email || "tim@mcmullen-properties.com";
    const replyTo = branding?.reply_to_email || "tim@mcmullen.properties";
    const agentName = agentProfile?.display_name || agent.email || "your agent";

    const subject = `${agentName} invited you to your private listing portal`;
    const html = renderInviteEmail({
      clientName: client.name,
      agentName,
      brokerageName: fromName,
      magicLink,
      brandColor: branding?.primary_color || "#1a1f2e",
    });

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [client.email],
        reply_to: replyTo,
        subject,
        html,
      }),
    });

    if (!resendResp.ok) {
      const errBody = await resendResp.text();
      return jsonError(502, "Resend rejected the send: " + errBody);
    }
    const resendJson = await resendResp.json();

    // 7. Audit + create a notification record
    await admin.from("notifications").insert({
      tenant_id: client.tenant_id,
      recipient_type: "client",
      recipient_id: client.id,
      notification_type: "portal_invitation_sent",
      title: "Portal invitation sent",
      body: `Invitation email sent to ${client.email}.`,
      link_url: magicLink,
    });

    await admin.from("audit_log").insert({
      tenant_id: client.tenant_id,
      user_id: agent.id,
      actor_kind: "user",
      action: "client_portal_invitation_sent",
      entity_kind: "client",
      entity_id: client.id,
      metadata: { resend_id: resendJson.id, email: client.email },
    });

    return new Response(
      JSON.stringify({ ok: true, resend_id: resendJson.id, email: client.email }),
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

function renderInviteEmail(opts: {
  clientName: string;
  agentName: string;
  brokerageName: string;
  magicLink: string;
  brandColor: string;
}): string {
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Your portal invitation</title></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:560px;">
        <tr><td style="padding:40px 40px 0;">
          <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#888;margin-bottom:24px;">${safe(opts.brokerageName)}</div>
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;line-height:1.2;color:#1a1f2e;margin:0 0 16px;">Welcome, ${safe(opts.clientName)}.</h1>
          <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 16px;">${safe(opts.agentName)} has set up a private portal for our work together — listing details, war room messaging, documents, and everything in one place.</p>
          <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 32px;">Click below to sign in. The link is unique to you; no password to remember.</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${opts.brandColor};"><a href="${opts.magicLink}" style="display:inline-block;padding:14px 28px;color:#fffaf0;text-decoration:none;font-size:14px;letter-spacing:0.05em;">Open your portal</a></td></tr></table>
          <p style="font-size:12px;line-height:1.5;color:#888;margin:32px 0 0;">If the button doesn't work, paste this URL into your browser:<br><a href="${opts.magicLink}" style="color:#888;word-break:break-all;">${opts.magicLink}</a></p>
        </td></tr>
        <tr><td style="padding:40px;border-top:1px solid #eee;font-size:11px;color:#aaa;">${safe(opts.brokerageName)} · Sent by your agent</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
