// P9.2 fetch_zillow_listing — accepts a Zillow (or Redfin/Realtor) URL, calls Claude
// with the web_fetch tool, returns structured listing data as JSON.
//
// Per Tim's decision (option B): try auto-fill via Claude web_fetch, gracefully
// degrade to manual fill if Zillow blocks. Either way the frontend opens the
// edit form — it just pre-fills if we got data.
//
// Deployed: 2026-05-20 via Supabase MCP. id ea30e142-c894-430c-8cd7-508c19093151.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODEL = "claude-sonnet-4-6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You extract real-estate listing data. You MUST use the web_fetch tool to retrieve the URL, then return ONLY a raw JSON object matching the schema. No markdown, no backticks, no commentary. If a field is unknown, use null.`;

const USER_PROMPT_TEMPLATE = (url: string) => `Fetch this listing URL and extract structured data:
${url}

Return ONLY valid JSON matching this exact shape:
{
  "address": "",
  "city": "",
  "state": "",
  "zip": "",
  "price": 0,
  "bedrooms": 0,
  "bathrooms": 0,
  "sqft": 0,
  "lotSqft": 0,
  "yearBuilt": 0,
  "propertyType": "",
  "hoaMonthly": 0,
  "parkingType": "",
  "parkingSpaces": 0,
  "outdoorFeatures": [],
  "photoUrl": ""
}

Rules:
- price, sqft, lotSqft, hoaMonthly: integers, no commas, no dollar signs. Use null if unknown.
- bedrooms, bathrooms: numbers (bathrooms can be 2.5, 3.5, etc.).
- propertyType: e.g. "Single Family", "Condo", "Townhouse", "Multi-Family", "Co-op".
- parkingType: one of "garage", "driveway", "street", "carport", "none". Use null if unclear.
- parkingSpaces: integer count.
- outdoorFeatures: array of strings from this list: "backyard", "patio", "balcony", "deck", "pool", "garden". Empty array if none mentioned.
- photoUrl: the URL of the listing's hero photo (largest image). Use null if not extractable.
- If you cannot fetch the page (403, blocked, etc.), return: {"error": "could_not_fetch", "detail": "<short reason>"}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "POST only");

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonError(401, "Missing bearer token");
    const jwt = authHeader.slice(7);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData.user) return jsonError(401, "Invalid session");
    const user = userData.user;

    const [{ data: tenantMembership }, { data: clientRow }] = await Promise.all([
      admin.from("tenant_users").select("tenant_id").eq("user_id", user.id).limit(1).maybeSingle(),
      admin.from("clients").select("id, tenant_id").eq("auth_user_id", user.id).limit(1).maybeSingle(),
    ]);
    const tenantId = tenantMembership?.tenant_id || clientRow?.tenant_id;
    if (!tenantId) return jsonError(403, "Agent or client membership required");

    const body = await req.json();
    const url = String(body.url || "").trim();
    if (!url || !/^https?:\/\//.test(url)) {
      return jsonError(400, "url (string starting with http(s)://) required");
    }

    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-fetch-2025-09-10",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_fetch_20250910", name: "web_fetch", max_uses: 2 }],
        messages: [{ role: "user", content: USER_PROMPT_TEMPLATE(url) }],
      }),
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      await admin.from("audit_log").insert({
        tenant_id: tenantId,
        user_id: user.id,
        actor_kind: "ai",
        action: "external_listing_fetch_failed",
        entity_kind: "client_external_listings",
        metadata: { url, status: anthropicResp.status, error: errText.slice(0, 500) },
      });
      return new Response(
        JSON.stringify({ ok: false, fallback: true, reason: `Anthropic API error: ${anthropicResp.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const anthropicJson = await anthropicResp.json();
    const textContent = (anthropicJson.content || [])
      .map((b: { type: string; text?: string }) => (b.type === "text" ? (b.text || "") : ""))
      .join("").trim();

    let extracted: Record<string, unknown> | null = null;
    let parseErr = "";
    try {
      const cleaned = textContent.replace(/```json|```/g, "").trim();
      extracted = JSON.parse(cleaned);
    } catch (e) {
      parseErr = e instanceof Error ? e.message : String(e);
    }

    if (extracted && typeof extracted === "object" && "error" in extracted) {
      await admin.from("audit_log").insert({
        tenant_id: tenantId,
        user_id: user.id,
        actor_kind: "ai",
        action: "external_listing_fetch_blocked",
        entity_kind: "client_external_listings",
        metadata: { url, claude_error: extracted },
      });
      return new Response(
        JSON.stringify({ ok: false, fallback: true, reason: String(extracted.detail || extracted.error || "blocked") }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!extracted) {
      return new Response(
        JSON.stringify({ ok: false, fallback: true, reason: `Claude returned non-JSON. ${parseErr}`, raw_text_preview: textContent.slice(0, 300) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await admin.from("audit_log").insert({
      tenant_id: tenantId,
      user_id: user.id,
      actor_kind: "ai",
      action: "external_listing_fetched",
      entity_kind: "client_external_listings",
      metadata: { model: MODEL, url, address: extracted.address || null, usage: anthropicJson.usage || null },
    });

    return new Response(JSON.stringify({ ok: true, extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
