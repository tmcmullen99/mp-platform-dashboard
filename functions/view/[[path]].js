// functions/view/[[path]].js
//
// Per-deliverable social-share (Open Graph / Twitter) tag injection for the
// private buyer deliverables at /view/cma/<uuid> and /view/review/<uuid>.
//
// WHY THIS EXISTS
// Same reason as functions/listings/[slug].js: the SPA serves one static
// index.html whose OG tags advertise the generic McMullen share image, and
// social crawlers (iMessage, WhatsApp, Slack, LinkedIn) never run JavaScript.
// This Pages Function rewrites the tags at the edge so a shared CMA link
// previews as the PROPERTY ADDRESS over a generic branded CMA card, instead
// of the site-wide cover image. Humans still get the normal SPA.
//
// DATA PATH
// Metadata comes from the serve_page Edge Function's v3 meta kinds
// (?kind=cma_meta|review_meta&id=<uuid>), which serve published rows only via
// the service role — no Supabase keys needed here, and RLS on the private
// rows stays intact. Unknown/unpublished IDs fall back to default tags.
//
// Requires "/view/*" in public/_routes.json (Functions route allowlist).

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

  // --- 2. Parse /view/<kind>/<uuid>. Anything else: default shell. ---
  const m = url.pathname.match(
    /^\/view\/(cma|review)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i
  )
  if (!m) return shell
  const kind = m[1].toLowerCase()
  const id = m[2]

  // --- 3. Fetch share metadata (published rows only). ---
  let meta = null
  try {
    const res = await fetch(
      `https://kumfuludrhoqirxvaqja.supabase.co/functions/v1/serve_page?kind=${kind}_meta&id=${id}`,
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
  const imageUrl = `${url.origin}/og/${kind === 'cma' ? 'cma-share.png' : 'review-share.png'}`
  const pageUrl = `${url.origin}/view/${kind}/${id}`
  const imageAlt = `${kindLabel} — McMullen Properties`

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
    .on('meta[property="og:image:alt"]', setContent(imageAlt))
    .on('meta[property="og:url"]', setContent(pageUrl))
    .on('meta[property="og:type"]', setContent('article'))
    .on('meta[name="twitter:title"]', setContent(title))
    .on('meta[name="twitter:description"]', setContent(description))
    .on('meta[name="twitter:image"]', setContent(imageUrl))
    .transform(shell)

  const headers = new Headers(out.headers)
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('cache-control', 'public, max-age=0, must-revalidate')
  return new Response(out.body, { status: 200, headers })
}
