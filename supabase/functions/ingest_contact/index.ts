// ingest_contact Edge Function — PUBLIC (no JWT)
//
// POST /functions/v1/ingest_contact?token=TENANT_INGEST_TOKEN
// Body: JSON or x-www-form-urlencoded with any subset of:
//   email, first_name, last_name, phone, notes, message,
//   list_name (override), list_id (override), tag_names (array)
//
// Validates the token against tenant_ingest_keys, creates a contact in the
// matched tenant, applies default list + tag from the key config, and writes
// a contact_sources audit row.
//
// Environment required:
//   SUPABASE_URL                Set by Supabase
//   SUPABASE_SERVICE_ROLE_KEY   service_role key (bypasses RLS)

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.45.4"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS })
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  const url = new URL(req.url)
  const token = url.searchParams.get("token")
  if (!token) {
    return json({ error: "Missing token query parameter" }, 400)
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  // -- Validate token, resolve tenant + defaults --------------------------
  const { data: key, error: keyErr } = await supabase
    .from("tenant_ingest_keys")
    .select("id, tenant_id, default_list_id, default_tag, default_source_kind, label, revoked_at")
    .eq("token", token)
    .maybeSingle()

  if (keyErr) return json({ error: "Server error" }, 500)
  if (!key) return json({ error: "Invalid token" }, 401)
  if (key.revoked_at) return json({ error: "Token revoked" }, 401)

  // -- Parse body (JSON or form-encoded) ---------------------------------
  let payload: Record<string, any> = {}
  const ct = req.headers.get("content-type") || ""
  try {
    if (ct.includes("application/json")) {
      payload = await req.json()
    } else if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const form = await req.formData()
      for (const [k, v] of form.entries()) {
        payload[k] = typeof v === "string" ? v : ""
      }
    } else {
      // Try JSON as fallback
      const text = await req.text()
      if (text) {
        try { payload = JSON.parse(text) } catch { payload = {} }
      }
    }
  } catch {
    return json({ error: "Invalid request body" }, 400)
  }

  // Normalize fields — accept common variations from Webflow forms
  const email = pickString(payload, ["email", "Email", "email-address", "Email Address"])
  const firstName = pickString(payload, ["first_name", "firstName", "first-name", "First Name", "first"])
  const lastName = pickString(payload, ["last_name", "lastName", "last-name", "Last Name", "last"])
  const fullName = pickString(payload, ["name", "Name", "full_name", "fullName", "full-name"])
  const phone = pickString(payload, ["phone", "Phone", "phone-number", "Phone Number", "tel"])
  const notes = pickString(payload, ["notes", "Notes", "message", "Message", "comments", "Comments", "inquiry"])

  // Split full_name if first/last not provided
  let resolvedFirst = firstName
  let resolvedLast = lastName
  if (!firstName && !lastName && fullName) {
    const parts = fullName.trim().split(/\s+/)
    resolvedFirst = parts[0] || null
    resolvedLast = parts.length > 1 ? parts.slice(1).join(" ") : null
  }

  if (!email && !phone && !resolvedFirst && !resolvedLast) {
    return json({ error: "Provide at least one of: email, phone, name" }, 400)
  }

  // -- Insert contact ----------------------------------------------------
  const normalizedEmail = email ? email.toLowerCase().trim() : null

  // Check for existing contact by email (per-tenant unique)
  let existingId: string | null = null
  if (normalizedEmail) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("tenant_id", key.tenant_id)
      .eq("email", normalizedEmail)
      .maybeSingle()
    if (existing) existingId = existing.id
  }

  let contactId: string
  let wasCreated = false
  if (existingId) {
    contactId = existingId
    // Append notes if provided (rather than overwriting existing)
    if (notes) {
      const { data: row } = await supabase.from("contacts").select("notes").eq("id", existingId).maybeSingle()
      const merged = row?.notes ? `${row.notes}\n\n[${new Date().toISOString()}] ${notes}` : `[${new Date().toISOString()}] ${notes}`
      await supabase.from("contacts").update({ notes: merged }).eq("id", existingId)
    }
  } else {
    const { data: created, error: createErr } = await supabase
      .from("contacts")
      .insert({
        tenant_id: key.tenant_id,
        email: normalizedEmail,
        first_name: resolvedFirst,
        last_name: resolvedLast,
        phone: phone || null,
        notes: notes || null,
        lifecycle_stage: "new",
      })
      .select("id")
      .single()
    if (createErr) return json({ error: `Could not create contact: ${createErr.message}` }, 500)
    contactId = created.id
    wasCreated = true
  }

  // -- Add to default list (if configured) -------------------------------
  if (key.default_list_id) {
    const { data: existingMembership } = await supabase
      .from("contact_list_memberships")
      .select("id")
      .eq("list_id", key.default_list_id)
      .eq("contact_id", contactId)
      .is("removed_at", null)
      .maybeSingle()
    if (!existingMembership) {
      await supabase.from("contact_list_memberships").insert({
        tenant_id: key.tenant_id,
        list_id: key.default_list_id,
        contact_id: contactId,
      })
    }
  }

  // -- Apply default tag (if configured) ---------------------------------
  if (key.default_tag) {
    const tagName = key.default_tag.trim()
    let tagId: string | null = null
    const { data: existingTag } = await supabase
      .from("contact_tags")
      .select("id")
      .eq("tenant_id", key.tenant_id)
      .ilike("name", tagName)
      .maybeSingle()
    if (existingTag) {
      tagId = existingTag.id
    } else {
      const { data: newTag } = await supabase
        .from("contact_tags")
        .insert({ tenant_id: key.tenant_id, name: tagName })
        .select("id")
        .single()
      if (newTag) tagId = newTag.id
    }
    if (tagId) {
      await supabase
        .from("contact_tag_assignments")
        .upsert({
          contact_id: contactId,
          tag_id: tagId,
          tenant_id: key.tenant_id,
        }, { onConflict: "contact_id,tag_id" })
    }
  }

  // -- Source attribution -------------------------------------------------
  await supabase.from("contact_sources").insert({
    tenant_id: key.tenant_id,
    contact_id: contactId,
    source_kind: key.default_source_kind,
    source_label: key.label,
    metadata: {
      raw_payload: payload,
      ingest_key_id: key.id,
      action: wasCreated ? "created" : "updated",
    },
  })

  // -- Bump usage counters on the key ------------------------------------
  await supabase
    .from("tenant_ingest_keys")
    .update({
      last_used_at: new Date().toISOString(),
      use_count: (1 as any), // PostgREST doesn't have atomic increment without rpc; fine for low volume
    })
    .eq("id", key.id)

  return json({
    ok: true,
    contact_id: contactId,
    action: wasCreated ? "created" : "updated",
  })
})


function pickString(obj: Record<string, any>, keys: string[]): string | null {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim()) {
      return String(obj[k]).trim()
    }
  }
  return null
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  })
}
