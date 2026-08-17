// functions/expired/[slug].js
//
// The public expired-listing page for properties outside the city markets.
//
// WHY THIS EXISTS
// Every expired letter carries a QR code to the strategy written for that
// address. Inside Campbell, Los Gatos and Saratoga those pages are served by
// the city worker. Outside them there is no city site, so the page lives here
// — and it must be reachable with no account, because the person scanning it
// is a homeowner holding a piece of paper, not a user.
//
// This is a Pages Function rather than a React route on purpose: the SPA is
// behind an auth gate, and a letter already in the post cannot wait for a
// client-side redirect to decide whether it is allowed to be seen.
//
// DATA
// Read-only, anon, cross-project against the City Markets platform — the same
// pattern lib/condoMarket.ts uses to read the condo platform. RLS and the anon
// grant limit this key to public_expired_page and nothing else.

const CITY_URL = 'https://qinuukntpyulqjzndnho.supabase.co'
const CITY_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbnV1a250cHl1bHFqem5kbmhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTcwMTcsImV4cCI6MjA5OTczMzAxN30.bU1dEOtlGVm7_r6Mm34EMqzt1_7ATOxT8oG9UJIlTCk'

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const money = (n) =>
  n == null || n === '' ? '' : '$' + Number(n).toLocaleString('en-US')

/* The strategy is stored as markdown. Only the handful of constructs the
   generator actually emits are supported — a full parser here would be a
   liability on a page this exposed. */
function renderMarkdown(md) {
  if (!md) return ''
  const lines = String(md).split('\n')
  const out = []
  let inList = false
  for (const raw of lines) {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet) {
      if (!inList) { out.push('<ul>'); inList = true }
      out.push('<li>' + inline(bullet[1]) + '</li>')
      continue
    }
    if (inList) { out.push('</ul>'); inList = false }
    const h = line.match(/^(#{1,3})\s+(.*)$/)
    if (h) { const n = h[1].length + 1; out.push(`<h${n}>${inline(h[2])}</h${n}>`); continue }
    if (!line.trim()) continue
    out.push('<p>' + inline(line) + '</p>')
  }
  if (inList) out.push('</ul>')
  return out.join('\n')

  function inline(t) {
    return esc(t)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
  }
}

function page(d, slug) {
  const addr = esc(d.address || '')
  const where = [d.city, d.state, d.zip].filter(Boolean).join(' ')
  const facts = [
    d.beds ? `${d.beds} bed` : null,
    d.baths ? `${d.baths} bath` : null,
    d.sqft ? `${Number(d.sqft).toLocaleString('en-US')} sq ft` : null,
    d.year_built ? `built ${d.year_built}` : null,
  ].filter(Boolean).join('  ·  ')

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>How I would sell ${addr} — Tim McMullen</title>
<meta name="description" content="A strategy written for ${addr}${where ? ', ' + esc(where) : ''}.">
<!-- A private page for one owner. It should never be indexed, and the letter
     is the only route to it. -->
<meta name="robots" content="noindex, nofollow, noarchive">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{--ink:#1a1f2e;--slate:#55606e;--dim:#8a93a0;--line:#e4e0d8;
        --bg:#faf8f4;--card:#fff;--gold:#b06f24}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
       font-family:Inter,system-ui,sans-serif;line-height:1.65;
       -webkit-font-smoothing:antialiased}
  .wrap{max-width:720px;margin:0 auto;padding:34px 22px 90px}
  .brand{font-family:Fraunces,Georgia,serif;font-size:1.35rem;font-weight:600}
  .brand span{color:var(--gold)}
  .rule{height:1px;background:var(--gold);margin:14px 0 30px;opacity:.55}
  h1{font-family:Fraunces,Georgia,serif;font-size:2rem;line-height:1.15;
     margin:0 0 6px;font-weight:600}
  .where{color:var(--slate);margin:0 0 4px}
  .facts{color:var(--dim);font-size:.92rem;margin:0 0 26px}
  .price{font-family:Fraunces,Georgia,serif;font-size:1.5rem;color:var(--gold);
         margin:0 0 26px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:16px;
        padding:26px 24px;margin-bottom:22px}
  .card h2,.card h3,.card h4{font-family:Fraunces,Georgia,serif;font-weight:600;
        margin:22px 0 8px;line-height:1.25}
  .card h2{font-size:1.3rem} .card h3{font-size:1.12rem} .card h4{font-size:1rem}
  .card > :first-child{margin-top:0}
  .card p{margin:0 0 14px} .card ul{margin:0 0 16px;padding-left:20px}
  .card li{margin-bottom:7px}
  .cta{display:block;background:var(--ink);color:#fff;text-decoration:none;
       text-align:center;padding:17px 22px;border-radius:12px;font-weight:600;
       margin-bottom:12px}
  .cta.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
  .sig{color:var(--slate);font-size:.93rem;margin-top:30px}
  .sig b{color:var(--ink)}
  .fine{color:var(--dim);font-size:.8rem;margin-top:26px;padding-top:16px;
        border-top:1px solid var(--line)}
  @media(max-width:520px){h1{font-size:1.6rem}.wrap{padding:26px 18px 70px}}
</style>
</head><body><div class="wrap">
  <div class="brand">McMullen <span>Properties</span></div>
  <div class="rule"></div>

  <h1>${addr}</h1>
  ${where ? `<p class="where">${esc(where)}</p>` : ''}
  ${facts ? `<p class="facts">${esc(facts)}</p>` : ''}
  ${d.list_price ? `<p class="price">Last asked ${esc(money(d.list_price))}</p>` : ''}

  ${d.strategy_md ? `<div class="card">${renderMarkdown(d.strategy_md)}</div>` : ''}

  <a class="cta" href="mailto:${esc(d.agent?.email || '')}?subject=${
    encodeURIComponent(addr)}">Email me about this house</a>
  <a class="cta ghost" href="tel:${esc((d.agent?.phone || '').replace(/[^0-9+]/g, ''))}">Call ${
    esc(d.agent?.phone || '')}</a>
  <a class="cta ghost" href="${esc(d.service_url || '')}">How I run a listing</a>

  <p class="sig"><b>${esc(d.agent?.name || 'Tim McMullen')}</b><br>
     Broker · CA DRE #${esc(d.agent?.dre || '')}</p>

  <p class="fine">Prepared privately for the owner of ${addr}. Nothing here is an
    opinion of value or an offer to buy. Owned and operated by McMullen Properties
    LLC, which is not a real estate brokerage. Real estate services provided by
    Tim McMullen, Broker · CA DRE #02016832.</p>
</div></body></html>`
}

function notFound() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>This page is no longer live — McMullen Properties</title>
<style>body{margin:0;background:#faf8f4;color:#1a1f2e;font-family:system-ui,sans-serif;
line-height:1.6}.w{max-width:520px;margin:0 auto;padding:80px 22px}
h1{font-family:Georgia,serif;font-size:1.5rem;margin:0 0 12px}
p{color:#55606e}a{color:#b06f24}</style></head><body><div class="w">
<h1>This page is no longer live</h1>
<p>The strategy page for this address has been taken down — usually because the
home has been relisted or sold.</p>
<p>If you would still like to talk it through,
<a href="mailto:tim@mcmullen.properties">email me</a> or call (415) 691-9272.</p>
<p style="font-size:.8rem;color:#8a93a0;margin-top:34px">Tim McMullen, Broker ·
CA DRE #02016832</p></div></body></html>`
}

export async function onRequest(context) {
  const { params, env } = context
  const slug = String(params.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (!slug) return new Response(notFound(), htmlHeaders(404))

  const key = env.CITY_MARKETS_ANON_KEY || CITY_ANON_KEY
  let d = null
  try {
    const r = await fetch(`${CITY_URL}/rest/v1/rpc/public_expired_page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ p_slug: slug }),
    })
    if (r.ok) d = await r.json()
  } catch {
    d = null
  }

  /* A removed listing and a lookup failure look the same to the owner, and
     both should read as "not live" rather than as an error page. */
  if (!d || d.ok !== true) return new Response(notFound(), htmlHeaders(404))
  return new Response(page(d, slug), htmlHeaders(200))
}

function htmlHeaders(status) {
  return {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Referrer-Policy': 'no-referrer',
    },
  }
}
