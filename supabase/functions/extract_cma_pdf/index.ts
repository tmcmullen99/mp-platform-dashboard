// P9.1 extract_cma_pdf — accepts a base64-encoded MLS PDF, calls Claude with the
// PDF as a document content block, returns structured {subject, comps} JSON.
// Same extraction strategy as the legacy CMA generator at cma-workerjs.tim-d10.workers.dev,
// but server-side (API key in Supabase secrets, no browser exposure) and tenant-aware.
//
// Deployed: 2026-05-20 via Supabase MCP. id cede104a-50b2-42ce-893a-d50ebf6153ae.

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

const SYSTEM_PROMPT = "You are a real estate CMA data extractor. Return ONLY raw JSON. No markdown. No backticks. No explanation. If a field is unknown, use null or empty string.";

const EXTRACTION_PROMPT = `Extract all CMA data from this MLS PDF. Return ONLY valid JSON in this exact shape:

{
  "subject": {
    "address": "",
    "city": "",
    "state": "",
    "zip": "",
    "listPrice": 0,
    "mls": "",
    "beds": 0,
    "bathsFull": 0,
    "bathsPartial": 0,
    "sqft": 0,
    "lotSqft": 0,
    "yearBuilt": 0,
    "propertyType": "",
    "garage": "",
    "parking": "",
    "cooling": "",
    "heating": "",
    "hoaMonthly": 0,
    "listDate": "",
    "daysOnMarket": 0,
    "remarks": ""
  },
  "comps": [
    {
      "address": "",
      "city": "",
      "listPrice": 0,
      "soldPrice": 0,
      "beds": 0,
      "bathsFull": 0,
      "bathsPartial": 0,
      "sqft": 0,
      "lotSqft": 0,
      "pricePerSqft": 0,
      "percentOverList": 0,
      "daysOnMarket": 0,
      "soldDate": "",
      "soldDateIso": "",
      "mls": ""
    }
  ]
}

Rules:
- listPrice, soldPrice, sqft, lotSqft, hoaMonthly: integers, no commas, no dollar signs
- pricePerSqft: integer (soldPrice / sqft, rounded)
- percentOverList: float (e.g. 1.083 means 8.3% over list); 1.0 if at list; null if listPrice missing
- soldDateIso: YYYY-MM-DD
- soldDate: human format like "Jan 15, 2026"
- bathsFull and bathsPartial: integers (half-baths are partial)
- propertyType: e.g. "Single Family", "Condo", "TIC", "Multi-Family"
- Include every comparable in the PDF. Comps array can be 1-20 items.
- If the PDF has fewer comps, return fewer. If none, return empty array.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "POST only");

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonError(401, "Missing bearer token");
    const jwt = authHeader.slice(7);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData.user) return jsonError(401, "Invalid session");
    const user = userData.user;

    // 2. Verify agent — only tenant members can extract CMAs
    const { data: tenantMembership } = await admin
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!tenantMembership) return jsonError(403, "Agent membership required");

    // 3. Parse input — { pdf_base64: string }
    const body = await req.json();
    const pdfBase64 = body.pdf_base64;
    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return jsonError(400, "pdf_base64 (string) required");
    }
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

    // 4. Call Claude
    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: cleanBase64 },
              },
              { type: "text", text: EXTRACTION_PROMPT },
            ],
          },
        ],
      }),
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      return jsonError(502, `Anthropic API error: ${anthropicResp.status} ${errText.slice(0, 300)}`);
    }

    const anthropicJson = await anthropicResp.json();
    const textContent = (anthropicJson.content || [])
      .map((b: { type: string; text?: string }) => (b.type === "text" ? (b.text || "") : ""))
      .join("");

    let extracted;
    try {
      const cleaned = textContent.replace(/```json|```/g, "").trim();
      extracted = JSON.parse(cleaned);
    } catch (parseErr) {
      return jsonError(
        502,
        `Claude returned non-JSON: ${textContent.slice(0, 500)}`,
      );
    }

    // 5. Audit
    await admin.from("audit_log").insert({
      tenant_id: tenantMembership.tenant_id,
      user_id: user.id,
      actor_kind: "ai",
      action: "cma_pdf_extracted",
      entity_kind: "cmas",
      metadata: {
        model: MODEL,
        comp_count: (extracted.comps || []).length,
        subject_address: extracted.subject?.address || null,
        usage: anthropicJson.usage || null,
      },
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
