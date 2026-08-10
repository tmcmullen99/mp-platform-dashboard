// functions/view/[[path]].js
//
// Per-deliverable social-share (Open Graph / Twitter) tag injection for the
// private buyer deliverables at /view/cma/<ref> and /view/review/<ref>, where
// <ref> is EITHER the row UUID or the row's public_slug (an address-derived
// slug plus a short random token, e.g. 133-union-ave-unit-f-campbell-c4e24a).
//
// WHY THIS EXISTS
// Same reason as functions/listings/[slug].js: the SPA serves one static
// index.html whose OG tags advertise the generic McMullen share image, and
// social crawlers (iMessage, WhatsApp, Slack, LinkedIn) never run JavaScript.
// This Pages Function rewrites the tags at the edge so a shared CMA link
// previews as the PROPERTY ADDRESS over the deliverable's own share card,
// instead of the site-wide cover image. Humans still get the normal SPA.
//
// DATA PATH
// Metadata comes from the serve_page Edge Function's meta kinds
// (?kind=cma_meta|review_meta&id=<ref>), which serve published rows only via
// the service role — no Supabase keys needed here, and RLS on the private
// rows stays intact. Unknown/unpublished refs fall back to default tags.
//
// Requires "/view/*" in public/_routes.json (Functions route allowlist).
//
// ── CHANGES IN THIS VERSION ──────────────────────────────────────────────
// SLUG ADDRESSING. The path matcher previously accepted only a UUID, so a
// link shared in the new readable form fell through to the generic brand card
// — the exact bug this file was written to fix, reintroduced by a new URL
// shape. It now accepts UUID *or* slug-with-token and passes the reference
// through to serve_page unchanged. og:url is rebuilt from whichever form the
// visitor used, so the canonical link in the preview matches the link shared.
//
// SECURITY NOTE: the trailing hex token in the slug is not decoration. Nothing
// authenticates /view/* — the unguessability of the reference IS the access
// control — so SLUG_RE requires the token and a bare address slug must not
// match here or in serve_page.
//
// ── PREVIOUS VERSION ─────────────────────────────────────────────────────
// 1. PER-DELIVERABLE CARD. serve_page returns `image` (from
//    cmas.showcase_image / disclosure_reviews.showcase_image). When present it
//    becomes the share image; otherwise we fall back to the generic
//    /og/cma-share.png or /og/review-share.png.
//
// 2. THE ACTUAL BUG — og:image:secure_url. index.html ships BOTH
//    <meta property="og:image"> and <meta property="og:image:secure_url">,
//    and an earlier version rewrote only the first. Facebook, iMessage and
//    several other crawlers prefer secure_url when both are present, so the
//    site-wide brand card kept winning no matter what og:image was set to.
//    We rewrite secure_url too — plus og:image:type, which was hardcoded to
//    image/jpeg in the shell and must match whichever card we actually serve.
//
// 3. Also rewrites twitter:image:alt and og:site_name for completeness.

const UUID_RE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
// Address slug + '-' + 5–12 hex token. Keep in sync with SLUG_RE in
// supabase/functions/serve_page/index.ts and pages/public/DeliverableViewer.tsx.
const SLUG_RE = '[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{5,12}'
const PATH_RE = new RegExp(`^/view/(cma|review)/(${UUID_RE}|${SLUG_RE})/?$`, 'i')

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)

  // --- 1. Load the SPA shell deterministically (same pattern as listings). ---
  let shell
  try {
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      shell = await env.ASSETS.fetch(new URL('/index.html', url.origin))
    } else {
      shell = await fetch(new URL('/index.html', url.origin), { cf: { cacheTtl: 60 } })
    }
  } catch {
    return context.next()
  }
  const contentType = shell.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) return context.next()

  // --- 2. Parse /view/<kind>/<uuid|slug>. Anything else: default shell. ---
  const m = url.pathname.match(PATH_RE)
  if (!m) return shell
  const kind = m[1].toLowerCase()
  const ref = m[2]

  // --- 3. Fetch share metadata (published rows only). ---
  let meta = null
  try {
    const res = await fetch(
      `https://kumfuludrhoqirxvaqja.supabase.co/functions/v1/serve_page?kind=${kind}_meta&id=${encodeURIComponent(ref)}`,
      { cf: { cacheTtl: 300, cacheEverything: true } }
    )
    if (res.ok) meta = await res.json()
  } catch {
    return shell
  }
  if (!meta || !meta.address) return shell

  // --- 4. Deliverable-specific share values. ---
  const kindLabel = kind === 'cma' ? 'Comparative Market Analysis' : 'Disclosure Cheat Sheet'
  const title = meta.address
  const description =
    kind === 'cma'
      ? 'Comparative Market Analysis — prepared by McMullen Properties.'
      : 'Disclosure Cheat Sheet — prepared by McMullen Properties.'

  // Per-deliverable card when serve_page supplies one, else the generic card.
  const fallbackImage = `${url.origin}/og/${kind === 'cma' ? 'cma-share.png' : 'review-share.png'}`
  const imageUrl =
    typeof meta.image === 'string' && /^https:\/\//i.test(meta.image.trim())
      ? meta.image.trim()
      : fallbackImage

  // The shell hardcodes image/jpeg; keep the declared type honest.
  const imageType = /\.png(\?|$)/i.test(imageUrl) ? 'image/png' : 'image/jpeg'

  // Echo back the form the visitor actually used so the preview's canonical
  // link matches the link that was shared.
  const pageUrl = `${url.origin}/view/${kind}/${ref}`
  const imageAlt = `${title} — ${kindLabel}`

  const setContent = (value) => ({
    element(el) {
      el.setAttribute('content', value)
    },
  })

  // --- 5. Rewrite the OG/Twitter tags in the shell and return it. ---
  const out = new HTMLRewriter()
    .on('title', {
      element(el) {
        el.setInnerContent(`${title} — ${kindLabel}`)
      },
    })
    .on('meta[name="description"]', setContent(description))
    .on('meta[property="og:title"]', setContent(title))
    .on('meta[property="og:description"]', setContent(description))
    .on('meta[property="og:image"]', setContent(imageUrl))
    // The fix: secure_url outranks og:image for several crawlers.
    .on('meta[property="og:image:secure_url"]', setContent(imageUrl))
    .on('meta[property="og:image:type"]', setContent(imageType))
    .on('meta[property="og:image:alt"]', setContent(imageAlt))
    .on('meta[property="og:url"]', setContent(pageUrl))
    .on('meta[property="og:type"]', setContent('article'))
    .on('meta[name="twitter:title"]', setContent(title))
    .on('meta[name="twitter:description"]', setContent(description))
    .on('meta[name="twitter:image"]', setContent(imageUrl))
    .on('meta[name="twitter:image:alt"]', setContent(imageAlt))
    .transform(shell)

  const headers = new Headers(out.headers)
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('cache-control', 'public, max-age=0, must-revalidate')
  return new Response(out.body, { status: 200, headers })
}
