// send_campaign Edge Function
// POST /functions/v1/send_campaign  { campaign_id: string }
// Sends a draft campaign via Resend with tracking + unsubscribe + merge tags.
//
// Headers required:
//   Authorization: Bearer <user_jwt>
//   apikey: <supabase_anon_key>
//
// Environment variables required:
//   RESEND_API_KEY            Resend API key
//   SUPABASE_URL              Set automatically by Supabase
//   SUPABASE_ANON_KEY         Set automatically by Supabase
//   TRACKING_BASE_URL         e.g. https://t.mcmullen.properties
//   PLATFORM_BASE_URL         e.g. https://mp-platform-dashboard.pages.dev (for unsubscribe page fallback)

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const RECIPIENT_CAP = 200            // Hard cap per blast (Tim's standing rule)
const SEND_CONCURRENCY = 5           // Parallel Resend requests
const TOKEN_LENGTH = 22              // base62 = ~131 bits of entropy
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS })
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  const authHeader = req.headers.get("Authorization") || ""
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Missing bearer token" }, 401)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  const trackingBase = (Deno.env.get("TRACKING_BASE_URL") || "").replace(/\/+$/, "")
  const platformBase = (Deno.env.get("PLATFORM_BASE_URL") || "").replace(/\/+$/, "")

  if (!resendApiKey) {
    return json({ error: "Server not configured: RESEND_API_KEY missing" }, 500)
  }
  if (!trackingBase) {
    return json({ error: "Server not configured: TRACKING_BASE_URL missing" }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  // -- Parse body ------------------------------------------------------------
  let body: { campaign_id?: string } = {}
  try {
    body = await req.json()
  } catch {
    return json({ error: "Invalid JSON body" }, 400)
  }
  const campaignId = body.campaign_id
  if (!campaignId) {
    return json({ error: "campaign_id required" }, 400)
  }

  // -- Load campaign (RLS scopes to tenant + user) ---------------------------
  const { data: campaign, error: campaignErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle()

  if (campaignErr) return json({ error: campaignErr.message }, 500)
  if (!campaign) return json({ error: "Campaign not found or access denied" }, 404)
  if (campaign.status !== "draft") {
    return json({ error: `Campaign is ${campaign.status}; only draft campaigns can be sent` }, 400)
  }
  if (!campaign.list_id) {
    return json({ error: "Campaign has no list_id; assign a list before sending" }, 400)
  }
  if (!campaign.subject?.trim()) {
    return json({ error: "Campaign subject is empty" }, 400)
  }
  if (!campaign.html_body?.trim() && !campaign.plain_body?.trim()) {
    return json({ error: "Campaign has no body content" }, 400)
  }

  // -- Load eligible recipients ----------------------------------------------
  // Active memberships → contact → subscribed + non-empty email
  const { data: memberships, error: memErr } = await supabase
    .from("contact_list_memberships")
    .select("contact:contacts(id,email,first_name,last_name,email_subscription_status,tenant_id)")
    .eq("list_id", campaign.list_id)
    .is("removed_at", null)

  if (memErr) return json({ error: memErr.message }, 500)

  type Recipient = { id: string; email: string; first_name: string | null; last_name: string | null; tenant_id: string }
  const eligible: Recipient[] = []
  const skipped: { reason: string; count: number }[] = []
  let skippedNoEmail = 0
  let skippedUnsubscribed = 0
  let skippedDupe = 0
  const seen = new Set<string>()

  for (const row of memberships || []) {
    const c: any = (row as any).contact
    if (!c) continue
    if (!c.email) { skippedNoEmail++; continue }
    if (c.email_subscription_status !== "subscribed") { skippedUnsubscribed++; continue }
    const key = c.email.toLowerCase()
    if (seen.has(key)) { skippedDupe++; continue }
    seen.add(key)
    eligible.push({ id: c.id, email: c.email, first_name: c.first_name, last_name: c.last_name, tenant_id: c.tenant_id })
    if (eligible.length >= RECIPIENT_CAP) break
  }

  if (skippedNoEmail) skipped.push({ reason: "no_email", count: skippedNoEmail })
  if (skippedUnsubscribed) skipped.push({ reason: "not_subscribed", count: skippedUnsubscribed })
  if (skippedDupe) skipped.push({ reason: "duplicate_email", count: skippedDupe })

  if (eligible.length === 0) {
    return json({ error: "No eligible recipients (all skipped: no email / unsubscribed / duplicate)" }, 400)
  }

  // -- Mark campaign sending --------------------------------------------------
  await supabase
    .from("campaigns")
    .update({ status: "sending", recipient_count: eligible.length })
    .eq("id", campaign.id)

  // -- Prepare recipient rows (single batch insert) --------------------------
  const recipientRows = eligible.map((r) => ({
    tenant_id: campaign.tenant_id,
    campaign_id: campaign.id,
    contact_id: r.id,
    email_at_send: r.email,
    tracking_token: generateToken(),
    status: "pending",
  }))

  const { data: insertedRecipients, error: insertErr } = await supabase
    .from("campaign_recipients")
    .insert(recipientRows)
    .select("id, contact_id, email_at_send, tracking_token")

  if (insertErr) {
    await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaign.id)
    return json({ error: `Failed to insert recipients: ${insertErr.message}` }, 500)
  }

  // -- Send in parallel batches ----------------------------------------------
  const tokenByContact = new Map<string, string>()
  const idByToken = new Map<string, string>()
  for (const r of insertedRecipients || []) {
    tokenByContact.set(r.contact_id, r.tracking_token)
    idByToken.set(r.tracking_token, r.id)
  }

  const fromHeader = `${campaign.from_name} <${campaign.from_email}>`
  const replyTo = campaign.reply_to || campaign.from_email
  const unsubscribeBaseUrl = platformBase ? `${platformBase}/unsubscribe` : `${trackingBase}/u`

  let sentCount = 0
  let failedCount = 0
  const failures: { email: string; error: string }[] = []

  for (let i = 0; i < eligible.length; i += SEND_CONCURRENCY) {
    const batch = eligible.slice(i, i + SEND_CONCURRENCY)
    await Promise.all(batch.map(async (recipient) => {
      const token = tokenByContact.get(recipient.id)!
      const recipientId = idByToken.get(token)!
      const personalized = personalizeContent({
        subject: campaign.subject,
        html: campaign.html_body || "",
        plain: campaign.plain_body || "",
        recipient,
        token,
        trackingBase,
        unsubscribeBaseUrl,
      })

      try {
        const sendResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromHeader,
            to: [recipient.email],
            subject: personalized.subject,
            html: personalized.html || undefined,
            text: personalized.plain || undefined,
            reply_to: replyTo,
            headers: {
              "List-Unsubscribe": `<${unsubscribeBaseUrl}?token=${token}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }),
        })

        if (!sendResp.ok) {
          const errText = await sendResp.text()
          await supabase
            .from("campaign_recipients")
            .update({ status: "failed", error_message: errText.slice(0, 500) })
            .eq("id", recipientId)
          failedCount++
          failures.push({ email: recipient.email, error: errText.slice(0, 200) })
          return
        }

        const sendData = await sendResp.json()
        await supabase
          .from("campaign_recipients")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            resend_message_id: sendData.id || null,
          })
          .eq("id", recipientId)
        sentCount++
      } catch (err: any) {
        await supabase
          .from("campaign_recipients")
          .update({ status: "failed", error_message: String(err).slice(0, 500) })
          .eq("id", recipientId)
        failedCount++
        failures.push({ email: recipient.email, error: String(err).slice(0, 200) })
      }
    }))
  }

  // -- Finalize campaign ------------------------------------------------------
  const finalStatus = failedCount === eligible.length ? "failed" : "sent"
  await supabase
    .from("campaigns")
    .update({
      status: finalStatus,
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount,
    })
    .eq("id", campaign.id)

  // -- Audit log entry --------------------------------------------------------
  await supabase.from("audit_log").insert({
    tenant_id: campaign.tenant_id,
    actor_kind: "user",
    action: "campaign_sent",
    entity_kind: "campaign",
    entity_id: campaign.id,
    metadata: {
      recipient_count: eligible.length,
      sent_count: sentCount,
      failed_count: failedCount,
      list_id: campaign.list_id,
      subject: campaign.subject,
    },
  })

  return json({
    ok: true,
    campaign_id: campaign.id,
    status: finalStatus,
    recipient_count: eligible.length,
    sent_count: sentCount,
    failed_count: failedCount,
    skipped,
    failures: failures.slice(0, 10),  // Cap to keep response small
  })
})


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateToken(): string {
  const bytes = new Uint8Array(TOKEN_LENGTH)
  crypto.getRandomValues(bytes)
  let out = ""
  for (const b of bytes) out += BASE62[b % BASE62.length]
  return out
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

type PersonalizeArgs = {
  subject: string
  html: string
  plain: string
  recipient: { email: string; first_name: string | null; last_name: string | null }
  token: string
  trackingBase: string
  unsubscribeBaseUrl: string
}

function personalizeContent(args: PersonalizeArgs): { subject: string; html: string; plain: string } {
  const { recipient, token, trackingBase, unsubscribeBaseUrl } = args
  const fullName = [recipient.first_name, recipient.last_name].filter(Boolean).join(" ").trim()
  const subs: Record<string, string> = {
    first_name: recipient.first_name || "",
    last_name: recipient.last_name || "",
    full_name: fullName || recipient.email,
    email: recipient.email,
    unsubscribe_url: `${unsubscribeBaseUrl}?token=${token}`,
    pixel_url: `${trackingBase}/p/${token}.gif`,
  }

  const replaceMergeTags = (s: string) =>
    s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => subs[k] ?? `{{${k}}}`)

  const subject = replaceMergeTags(args.subject)
  let html = replaceMergeTags(args.html)
  let plain = replaceMergeTags(args.plain)

  // Wrap all <a href="..."> links with click tracking redirect
  if (html) {
    html = html.replace(
      /<a\s+([^>]*?)href=(["'])([^"']+)\2([^>]*)>/gi,
      (_match, pre, quote, url, post) => {
        // Skip mailto:, tel:, and tracking URLs
        if (/^(mailto:|tel:|#)/i.test(url) || url.includes(trackingBase)) {
          return `<a ${pre}href=${quote}${url}${quote}${post}>`
        }
        const tracked = `${trackingBase}/c/${token}?u=${encodeURIComponent(url)}`
        return `<a ${pre}href=${quote}${tracked}${quote}${post}>`
      }
    )

    // Append open-tracking pixel
    const pixel = `<img src="${trackingBase}/p/${token}.gif" width="1" height="1" alt="" style="display:block;border:0;">`
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${pixel}</body>`)
    } else {
      html = html + pixel
    }

    // Append unsubscribe footer if {{unsubscribe_url}} was not used in body
    if (!/unsubscribe/i.test(html)) {
      const footer = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:11px;color:#999;text-align:center;font-family:sans-serif;">` +
        `<a href="${subs.unsubscribe_url}" style="color:#999;text-decoration:underline;">Unsubscribe</a>` +
        `</div>`
      html = html.replace(/<\/body>/i, `${footer}</body>`) || (html + footer)
    }
  }

  if (plain && !/unsubscribe/i.test(plain)) {
    plain = plain + `\n\n---\nUnsubscribe: ${subs.unsubscribe_url}`
  }

  return { subject, html, plain }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  })
}
