// functions/listings/[slug].js
//
// Per-listing social-share (Open Graph / Twitter) image injection.
//
// WHY THIS EXISTS
// The public site is a React/Vite SPA: every route is served the same static
// index.html, whose OG tags point at the generic McMullen share image. Social
// crawlers (iMessage, Facebook, LinkedIn, Slack, X) DO NOT run JavaScript, so
// the per-listing image that React sets after hydration is never seen by them —
// every shared listing link would show the generic image.
//
// This Pages Function runs at the edge on every /listings/<slug> request. It
// looks up the listing in Supabase, then streams the site's index.html through
// HTMLRewriter, replacing the og:image / og:title / og:description (and Twitter
// equivalents) with that listing's primary image and details. Humans still get
// the normal SPA and React hydrates as usual; crawlers get the right card.
//
// This reproduces, at the edge, what Webflow's CMS used to do server-side.
//
// Env vars (already present for the build; also available to Functions):
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

export async function onRequest(context) {
  const { request, params, env, next } = context

  // Fetch the unmodified SPA shell (index.html) for this route.
  const response = await next()

  // Only rewrite HTML documents. Asset requests (js/css/img) pass straight through.
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) return response

  const slug = String(params.slug || '').trim()
  if (!slug) return response

  const SUPABASE_URL = env.VITE_SUPABASE_URL
  const ANON = env.VITE_SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !ANON) return response // misconfig → serve default tags

  // Look up the listing's share fields by slug via the public REST API.
  let listing = null
  try {
    const api =
      `${SUPABASE_URL}/rest/v1/properties` +
      `?slug=eq.${encodeURIComponent(slug)}` +
      `&select=name,main_image,meta_title,meta_description,price&limit=1`
    const res = await fetch(api, {
      headers: { apikey: ANON, authorization: `Bearer ${ANON}` },
      cf: { cacheTtl: 300, cacheEverything: true }, // cache lookups 5 min at edge
    })
    if (res.ok) {
      const rows = await res.json()
      listing = Array.isArray(rows) && rows.length ? rows[0] : null
    }
  } catch {
    return response // network hiccup → serve default tags rather than error
  }

  if (!listing) return response // unknown slug → SPA renders its own 404/default

  const SITE = 'https://mcmullenresidential.com'
  const imageUrl =
    (listing.main_image && listing.main_image.url) ||
    `${SUPABASE_URL}/storage/v1/object/public/listing-photos/og/share.jpg`
  const title = listing.meta_title || `${listing.name} | McMullen Properties`
  const description =
    listing.meta_description ||
    `${listing.name} — presented by McMullen Properties.`
  const pageUrl = `${SITE}/listings/${slug}`
  const imageAlt = listing.name || 'McMullen Properties'

  // Rewrite the relevant meta tags in-stream. Each handler sets the tag's
  // content attribute to the listing-specific value.
  const setContent = (value) => ({
    element(el) {
      el.setAttribute('content', value)
    },
  })

  return new HTMLRewriter()
    .on('title', {
      element(el) {
        el.setInnerContent(title)
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
    .transform(response)
}
