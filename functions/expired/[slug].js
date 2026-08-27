// functions/expired/[slug].js
//
// The public expired-listing page for properties outside the city markets.
//
// WHY THIS EXISTS
// Every expired letter carries a QR code to the strategy written for that
// address. Inside Campbell, Los Gatos and Saratoga those pages are served by
// the city worker. Outside them there is no city site, so the page is served
// here — with no account, because the person scanning it is a homeowner
// holding a piece of paper, not a user.
//
// WHY IT PROXIES RATHER THAN RENDERS
// There is one renderer for expired pages, in the city worker. Rebuilding it
// here would mean every future change to the page had to be made twice, and
// the second one would eventually be missed. This function fetches the page
// the worker already renders and passes it through — same sections, same
// photographs, same net sheet, forever in step.
//
// It is a Pages Function rather than a React route because the SPA is behind
// an auth gate, and a letter already in the post cannot wait for a client-side
// redirect to decide whether it is allowed to be seen.

/* Mirrors components/public/PublicNav.tsx — same links, same order, same
   phone and account actions. If that nav changes, change this with it. */
const HEADER = `
<style>
  .mrnav{position:sticky;top:0;z-index:60;background:rgba(255,255,255,.92);
    backdrop-filter:blur(10px);border-bottom:1px solid rgba(0,0,0,.06);
    font-family:Inter,system-ui,-apple-system,sans-serif}
  /* This header is injected into a document that already has its own
     stylesheet, so every rule is scoped and box-sizing is stated rather than
     assumed. Without it the padding below competes with whatever the host
     sheet says and the wordmark ends up flush to the screen edge. */
  .mrnav,.mrnav *{box-sizing:border-box}
  .mrnav-in{max-width:72rem;margin:0 auto;padding:0 24px;height:64px;
    display:flex;align-items:center;justify-content:space-between;gap:18px}
  .mrmark{display:flex;align-items:baseline;gap:7px;text-decoration:none;
    color:#0D1B2A;font-weight:700;letter-spacing:.06em;font-size:14px}
  .mrmark span{font-weight:400;letter-spacing:.14em;color:#273C46}
  /* On a phone the wordmark and the pill were still at desktop size while the
     page under them had scaled down, so the header read as a different design
     from the rest of the document. Both come down a step, and the wordmark's
     letter-spacing tightens because tracking that reads as considered at 14px
     reads as sprawl at 11.5. */
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
  /* The city worker's own nav is position:fixed and is stripped before this
     page is served, but the document still reserves room for it - which shows
     up under this header as a band of empty paper above the hero. Nothing in
     the served page needs top margin, so the first element after this header
     is pinned flush. */
  .mrnav + *{margin-top:0!important;padding-top:0!important}
  body{margin:0}
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
    <a class="mrcta" href="https://mcmullenresidential.com/services/expired-listing">How I run a listing</a>
  </div>
</div></header>`

const RENDERER = 'https://campbellrealestatemarket.com/_ooa/expired/'
const RENDERER_ORIGIN = 'https://campbellrealestatemarket.com'

export async function onRequest(context) {
  const { params } = context
  const slug = String(params.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (!slug) return gone()

  let upstream
  try {
    upstream = await fetch(RENDERER + encodeURIComponent(slug), {
      headers: { 'User-Agent': 'mcmullenresidential-expired-proxy' },
      cf: { cacheTtl: 0 },
    })
  } catch {
    return gone()
  }

  /* A removed listing, a bad slug and an upstream failure all read the same to
     the owner: the page is not live. An error page would be worse than useless
     to somebody standing in their kitchen with a letter. */
  if (!upstream || !upstream.ok) return gone()

  let html = await upstream.text()
  if (!html || html.length < 500) return gone()

  /* The renderer sends the page without its own header, because this page is
     served under mcmullenresidential.com and must wear that site's chrome. A
     city market's "For sale / Toolkit / Intelligence" menu here would send the
     owner to a site that does not cover their city.
     Static markup rather than the React <PublicNav>: the SPA has not booted
     at this point and cannot, since the page is edge-rendered. Links match
     PublicNav's LINKS exactly. */
  /* Matched by pattern rather than by the literal string '<body>'. The worker
     emits a bare <body> today, but the day it gains an attribute or a class
     this replace silently stops matching and the page ships with no header at
     all - a failure that looks like a styling bug and is actually a missing
     nav. Falls back to prepending, so the header can never be dropped. */
  /* Point asset URLs back at the renderer's origin. They are emitted
     root-relative for the city domains that serve them; on this host they
     resolve here and 404. cb-track.js is the one that matters - without it an
     expired page records no visit at all, which is exactly what happened:
     zero events from this host in 24 hours while a city domain logged 55. */
  html = html.replace(/(<script[^>]+src=")\/assets\//g, '$1' + RENDERER_ORIGIN + '/assets/')
             .replace(/(<link[^>]+href=")\/assets\//g, '$1' + RENDERER_ORIGIN + '/assets/')

  const bodyTag = html.match(/<body[^>]*>/)
  html = bodyTag
    ? html.replace(bodyTag[0], bodyTag[0] + HEADER)
    : HEADER + html

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Referrer-Policy': 'no-referrer',
    },
  })
}

function gone() {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>This page is no longer live \u2014 McMullen Residential</title>
<style>body{margin:0;background:#faf8f4;color:#1a1f2e;
font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;line-height:1.6}
.w{max-width:520px;margin:0 auto;padding:80px 22px}
h1{font-family:Georgia,serif;font-size:1.5rem;margin:0 0 12px}
p{color:#55606e}a{color:#b06f24}</style></head><body><div class="w">
<h1>This page is no longer live</h1>
<p>The strategy page for this address has been taken down \u2014 usually because
the home has been relisted or sold.</p>
<p>If you would still like to talk it through,
<a href="mailto:tim@mcmullen.properties">email me</a> or call (415) 691-9272.</p>
<p style="font-size:.8rem;color:#8a93a0;margin-top:34px">Tim McMullen, Broker \u00b7
CA DRE #02016832</p></div></body></html>`
  return new Response(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  })
}
