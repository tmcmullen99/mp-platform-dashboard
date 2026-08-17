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

const RENDERER = 'https://campbellrealestatemarket.com/_ooa/expired/'

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

  const html = await upstream.text()
  if (!html || html.length < 500) return gone()

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
