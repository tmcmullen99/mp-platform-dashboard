// functions/listings/[slug].js
//
// Per-listing social-share (Open Graph / Twitter) image injection.
//
// WHY THIS EXISTS
// The public site is a React/Vite SPA: every route is served the same static
// index.html, whose OG tags point at the generic McMullen share image. Social
// crawlers (iMessage, Facebook, LinkedIn, Slack, X) DO NOT run JavaScript, so
// the per-listing image that React sets after hydration is never seen by them.
// This Pages Function runs at the edge on /listings/<slug>, looks up the
// listing in Supabase, and rewrites the OG/Twitter tags in index.html before
// the crawler sees them. Humans still get the normal SPA (React hydrates).
//
// IMPLEMENTATION NOTE
// We fetch the static /index.html ASSET DIRECTLY via env.ASSETS (with a plain
// origin fetch as fallback) instead of relying on next() to resolve the SPA
// fallback. On Pages, when _routes.json scopes Functions to /listings/*, a
// next() call for a path that has no static file does not reliably re-run the
// _redirects SPA catch-all — so we go straight to the known index.html asset.
// This makes the rewrite deterministic regardless of redirect ordering.
//
// Env vars (present for the build; also available to Functions):
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

export async function onRequest(context) {
  const { request, params, env } = context
  const url = new URL(request.url)

  // --- 1. Load the SPA shell (index.html) deterministically. ---
  let shell
  try {
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      // Pages binding: fetch the built index.html asset directly.
      shell = await env.ASSETS.fetch(new URL('/index.html', url.origin))
    } else {
      // Fallback: fetch the origin index.html over HTTP.
      shell = await fetch(new URL('/index.html', url.origin), {
        cf: { cacheTtl: 60 },
      })
    }
  } catch {
    // If we can't get the shell, fall back to normal serving.
    return context.next()
  }

  const contentType = shell.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) return context.next()

  const slug = String(params.slug || '').trim()
  if (!slug) return shell

  const SUPABASE_URL = env.VITE_SUPABASE_URL
  const ANON = env.VITE_SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !ANON) return shell // misconfig -> default tags

  // --- 2. Look up the listing's share fields by slug. ---
  let listing = null
  try {
    const api =
      `${SUPABASE_URL}/rest/v1/properties` +
      `?slug=eq.${encodeURIComponent(slug)}` +
      `&select=name,main_image,meta_title,meta_description,price&limit=1`
    const res = await fetch(api, {
      headers: { apikey: ANON, authorization: `Bearer ${ANON}` },
      cf: { cacheTtl: 300, cacheEverything: true },
    })
    if (res.ok) {
      const rows = await res.json()
      listing = Array.isArray(rows) && rows.length ? rows[0] : null
    }
  } catch {
    return shell
  }

  if (!listing) return shell // unknown slug -> default tags

  // --- 3. Compute listing-specific share values. ---
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

  const setContent = (value) => ({
    element(el) {
      el.setAttribute('content', value)
    },
  })

  // --- 4. Rewrite the OG/Twitter tags in the shell and return it. ---
  const out = new HTMLRewriter()
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
    .transform(shell)

  // Ensure HTML content-type + no stale cache of the transformed document.
  const headers = new Headers(out.headers)
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('cache-control', 'public, max-age=0, must-revalidate')
  return new Response(out.body, { status: 200, headers })
}
