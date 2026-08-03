// functions/blog/[slug].js
//
// Per-article social-share (Open Graph / Twitter) injection for /blog/<slug>.
//
// WHY THIS EXISTS
// Same reason as functions/listings/[slug].js: the public site is a React/Vite
// SPA, so every route is served the same static index.html. Social crawlers
// (iMessage, Facebook, LinkedIn, Slack, X) do not run JavaScript, so whatever
// React sets after hydration is invisible to them. Before this function existed,
// all 692 published posts shared ONE card — the generic site image and the title
// "McMullen Properties" — so every article Tim posted to X looked identical and
// unattributed.
//
// This runs at the edge, looks the post up in Supabase, and rewrites the tags in
// index.html before the crawler sees them. Humans still get the normal SPA.
//
// GUARANTEE
// Every exit path returns a document that still carries a valid share image:
//   - shell fetch fails      -> context.next() (static index.html, default tags)
//   - env missing            -> unmodified shell (default tags)
//   - slug unknown/unpublished -> unmodified shell (default tags)
//   - post found, no image   -> post title/description + DEFAULT image
// There is no branch that produces a card without an image.
//
// Env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

const SITE = 'https://mcmullenresidential.com'
const DEFAULT_IMAGE = `${SITE}/og/share.jpg`
const DEFAULT_W = '1200'
const DEFAULT_H = '630'

export async function onRequest(context) {
  const { request, params, env } = context
  const url = new URL(request.url)

  // --- 1. Load the SPA shell deterministically (see listings function note). ---
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

  const slug = String(params.slug || '').trim()
  if (!slug) return shell

  const SUPABASE_URL = env.VITE_SUPABASE_URL
  const ANON = env.VITE_SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !ANON) return shell

  // --- 2. Look up the post. Only published posts get custom cards. ---
  let post = null
  try {
    const api =
      `${SUPABASE_URL}/rest/v1/blog_posts` +
      `?slug=eq.${encodeURIComponent(slug)}` +
      `&is_published=eq.true` +
      `&select=name,meta_title,meta_description,card_description,image,publish_date,author_name` +
      `&limit=1`
    const res = await fetch(api, {
      headers: { apikey: ANON, authorization: `Bearer ${ANON}` },
      cf: { cacheTtl: 300, cacheEverything: true },
    })
    if (res.ok) {
      const rows = await res.json()
      post = Array.isArray(rows) && rows.length ? rows[0] : null
    }
  } catch {
    return shell
  }

  if (!post) return shell

  // --- 3. Compute share values, falling back to the default image. ---
  // `image` is jsonb: { url, alt }. A post with no image still gets a card,
  // it just gets the branded default rather than nothing.
  const postImage =
    post.image && typeof post.image === 'object' && post.image.url ? String(post.image.url) : null

  const imageUrl = postImage || DEFAULT_IMAGE
  const usingDefault = !postImage

  const title = post.meta_title || `${post.name} | McMullen Properties`
  const description =
    post.meta_description ||
    post.card_description ||
    `${post.name} — from McMullen Properties.`
  const pageUrl = `${SITE}/blog/${slug}`
  const imageAlt = (post.image && post.image.alt) || post.name || 'McMullen Properties'

  const setContent = (value) => ({
    element(el) {
      el.setAttribute('content', value)
    },
  })
  // Only the default image has known dimensions. For a post image we REMOVE the
  // width/height tags rather than lie about them — a wrong declared size makes
  // Facebook and LinkedIn render a cropped or blank card, which is worse than
  // making the crawler measure the file itself.
  const dropIfCustom = {
    element(el) {
      if (!usingDefault) el.remove()
    },
  }

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
    .on('meta[property="og:image:secure_url"]', setContent(imageUrl))
    .on('meta[property="og:image:alt"]', setContent(imageAlt))
    .on('meta[property="og:image:width"]', usingDefault ? setContent(DEFAULT_W) : dropIfCustom)
    .on('meta[property="og:image:height"]', usingDefault ? setContent(DEFAULT_H) : dropIfCustom)
    .on('meta[property="og:image:type"]', usingDefault ? setContent('image/jpeg') : dropIfCustom)
    .on('meta[property="og:url"]', setContent(pageUrl))
    .on('meta[property="og:type"]', setContent('article'))
    .on('meta[name="twitter:title"]', setContent(title))
    .on('meta[name="twitter:description"]', setContent(description))
    .on('meta[name="twitter:image"]', setContent(imageUrl))
    .on('meta[name="twitter:image:alt"]', setContent(imageAlt))
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute('href', pageUrl)
      },
    })
    .transform(shell)

  const headers = new Headers(out.headers)
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('cache-control', 'public, max-age=0, must-revalidate')
  return new Response(out.body, { status: 200, headers })
}
