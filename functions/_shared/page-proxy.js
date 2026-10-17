// functions/_shared/page-proxy.js
//
// Build A Page pages for homes outside the city market sites, served here on
// mcmullenresidential.com: /value/, /showing/, /strategy/, /offering/ and
// /disclosures/<slug>/. Most of them are the editable copies of the CMAs and
// disclosure reviews under /view/, made in the Agent Desk's Live pages tab.
//
// They are kept under market 90 (McMullen Properties) in the City Markets
// database and rendered by the city worker at /_ooa/<kind>/<slug>/, with
// McMullen Properties branding and without the city nav, the same way as
// /expired/. One renderer: this proxies it and puts this site's header on top,
// so a change to a page template is made once.
//
// A helper module, not a route: it exports no onRequest handler. The routes
// are the [[path]].js files in each folder and the four files in /api/.

const ORIGIN = 'https://campbellrealestatemarket.com'
const MEET = 'https://qinuukntpyulqjzndnho.supabase.co/functions/v1/book-page-meeting'
const TOUR = 'https://qinuukntpyulqjzndnho.supabase.co/functions/v1/book-tour'
const KEY = 'sb_publishable_1CzH1AWkEzy1WjMvZqwlhA_xiay_wJ2'
const MARKET = 90

/* The header of functions/expired/[slug].js, which mirrors
   components/public/PublicNav.tsx. If that nav changes, change this with it. */
const HEADER = `
<style>
  .mrnav{position:sticky;top:0;z-index:60;background:rgba(255,255,255,.92);
    backdrop-filter:blur(10px);border-bottom:1px solid rgba(0,0,0,.06);
    font-family:Inter,system-ui,-apple-system,sans-serif}
  .mrnav,.mrnav *{box-sizing:border-box}
  .mrnav-in{max-width:72rem;margin:0 auto;padding:0 24px;height:64px;
    display:flex;align-items:center;justify-content:space-between;gap:18px}
  .mrmark{display:flex;align-items:baseline;gap:7px;text-decoration:none;
    color:#0D1B2A;font-weight:700;letter-spacing:.06em;font-size:14px}
  .mrmark span{font-weight:400;letter-spacing:.14em;color:#273C46}
  @media(max-width:640px){
    .mrnav-in{height:52px;padding:0 16px;gap:10px}
    .mrmark{font-size:11.5px;letter-spacing:.04em;gap:5px}
    .mrmark span{letter-spacing:.1em}
    .mrcta{font-size:11.5px;padding:7px 13px}
  }
  @media(max-width:360px){
    .mrmark{font-size:10.5px}
    .mrcta{font-size:11px;padding:6px 11px}
  }
  .mrlinks{display:none;align-items:center;gap:28px;font-size:14px}
  .mrlinks a{color:#273C46;text-decoration:none}
  .mrlinks a:hover{color:#0D1B2A}
  .mrright{display:flex;align-items:center;gap:12px}
  .mrphone{display:none;font-size:14px;font-weight:500;color:#0D1B2A;text-decoration:none}
  .mrcta{background:#0D1B2A;color:#fff;text-decoration:none;font-size:13px;
    font-weight:500;padding:9px 18px;border-radius:999px;white-space:nowrap}
  @media(min-width:768px){.mrlinks{display:flex}}
  @media(min-width:1024px){.mrphone{display:inline}}
  .mrnav + *{margin-top:0!important;padding-top:0!important}
  body{margin:0}
  /* The page's own section menu sat under the city nav, which is cut: it now
     sits flush under this header and sticks just below it. */
  .spnav{margin-top:0!important;top:64px!important}
  @media(max-width:640px){.spnav{top:52px!important}}
</style>
<header class="mrnav"><div class="mrnav-in">
  <a class="mrmark" href="https://mcmullenresidential.com/home">MCMULLEN.<span>PROPERTIES</span></a>
  <nav class="mrlinks">
    <a href="https://mcmullenresidential.com/listings">Portfolio</a>
    <a href="https://mcmullenresidential.com/tools">Tools</a>
    <a href="https://mcmullenresidential.com/services">Services</a>
    <a href="https://mcmullenresidential.com/meet-tim">Meet Tim</a>
    <a href="https://mcmullenresidential.com/blog">Market</a>
    <a href="https://mcmullenresidential.com/insights">Writing</a>
  </nav>
  <div class="mrright">
    <a class="mrphone" href="tel:+14156919272">(415) 691-9272</a>
    <a class="mrcta" href="https://mcmullenresidential.com/meet-tim">Meet Tim</a>
  </div>
</div></header>`

const NOINDEX = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
}

export async function proxyPage(context, kind) {
  const { request, params } = context
  const parts = [].concat(params.path || []).filter(Boolean)
  const slug = String(parts[0] || '').toLowerCase()
  if (parts.length !== 1 || !/^[a-z0-9][a-z0-9-]{3,120}$/.test(slug)) return notFound()
  const url = new URL(request.url)
  if (!url.pathname.endsWith('/')) return Response.redirect(url.origin + url.pathname + '/' + url.search, 301)
  /* ?preview=<token>: the agent's preview of a draft, from the Build A Page wizard */
  const pv = (url.searchParams.get('preview') || '').slice(0, 64)

  let upstream
  try {
    upstream = await fetch(ORIGIN + '/_ooa/' + kind + '/' + slug + '/' + (pv ? '?preview=' + encodeURIComponent(pv) : ''), {
      headers: { 'User-Agent': 'mcmullenresidential-page-proxy' },
      cf: { cacheTtl: 0 },
    })
  } catch {
    return notFound()
  }
  if (!upstream || !upstream.ok) return notFound()
  let html = await upstream.text()
  if (!html || html.length < 500) return notFound()

  /* The renderer emits its scripts, styles and Street View images root-relative
     for the city domains; here they would resolve to this site and 404. The
     booking calls (/api/page-meet-*, /api/tour-slots, /api/book-tour) stay
     relative: they are answered here. */
  html = html.replace(/(=["'])\/(assets\/|sv\?)/g, '$1' + ORIGIN + '/$2')

  const bodyTag = html.match(/<body[^>]*>/)
  html = bodyTag ? html.replace(bodyTag[0], bodyTag[0] + HEADER) : HEADER + html
  return new Response(html, { status: 200, headers: NOINDEX })
}

/* The booking on these pages: times and bookings for market 90, which puts
   the meeting on Tim's calendar and emails him. */
export async function meetProxy(request, action) {
  const H = { 'x-cbm-key': KEY, 'Content-Type': 'application/json' }
  const json = (body, status) => new Response(body, { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  try {
    let up
    if (action === 'slots') {
      const date = new URL(request.url).searchParams.get('date') || ''
      up = await fetch(MEET + '?action=slots&market=' + MARKET + '&date=' + encodeURIComponent(date), { headers: H })
    } else {
      if (request.method !== 'POST') return json('{"error":"method"}', 405)
      let b = {}
      try { b = JSON.parse(await request.text()) } catch {}
      up = await fetch(MEET, { method: 'POST', headers: H, body: JSON.stringify(Object.assign({}, b, { market: MARKET })) })
    }
    return json(await up.text(), up.status)
  } catch {
    return json('{"error":"upstream"}', 502)
  }
}

/* A showing page for a listing active on the MLS books a private tour instead
   (the city worker's /api/tour-slots and /api/book-tour, for market 90). */
export async function tourProxy(request, action) {
  const H = { 'x-cbm-key': KEY, 'Content-Type': 'application/json' }
  const json = (body, status) => new Response(body, { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  try {
    let up
    if (action === 'slots') {
      const date = new URL(request.url).searchParams.get('date') || ''
      up = await fetch(TOUR + '?action=slots&market=' + MARKET + '&date=' + encodeURIComponent(date), { headers: H })
    } else {
      if (request.method !== 'POST') return json('{"error":"method"}', 405)
      up = await fetch(TOUR + '?action=book', { method: 'POST', headers: H, body: await request.text() })
    }
    return json(await up.text(), up.status)
  } catch {
    return json('{"error":"upstream"}', 502)
  }
}

function notFound() {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>This page is not live — McMullen Residential</title>
<style>body{margin:0;background:#faf8f4;color:#1a1f2e;
font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;line-height:1.6}
.w{max-width:520px;margin:0 auto;padding:80px 22px}
h1{font-family:Georgia,serif;font-size:1.5rem;margin:0 0 12px}
p{color:#55606e}a{color:#1a1f2e}</style></head><body><div class="w">
<h1>This page is not live</h1>
<p>The link may have been mistyped, or the page has been taken down.</p>
<p>If you were expecting to see something here,
<a href="mailto:tim@mcmullen.properties">email me</a> or call (415) 691-9272.</p>
<p style="font-size:.8rem;color:#8a93a0;margin-top:34px">Tim McMullen, Broker ·
CA DRE #02016832</p></div></body></html>`
  return new Response(html, { status: 404, headers: NOINDEX })
}
