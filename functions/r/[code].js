// functions/r/[code].js
//
// Printed letter QR codes: https://mcmullenresidential.com/r/<CODE>
//
// County letters (probate, pre-foreclosure, expired listings outside the city
// markets) print this address. The site had no /r/ route, so every scan fell
// through to the SPA home page: no scan recorded, and the reader never reached
// the page the letter was about.
//
// The codes live in the City Markets database, which also decides where each
// code goes and on which site (qr_resolve). This records the scan there and
// redirects. A printed code cannot be recalled, so an unknown code, or a
// database that does not answer, still lands on the home page, never on an
// error. THIS ROUTE IS PERMANENT.

const RPC = 'https://qinuukntpyulqjzndnho.supabase.co/rest/v1/rpc/record_qr_scan'
const KEY = 'sb_publishable_1CzH1AWkEzy1WjMvZqwlhA_xiay_wJ2'

export async function onRequest(context) {
  const { request, params } = context
  const url = new URL(request.url)
  const code = String(params.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const hint = url.searchParams.get('h') || null

  let host = url.host
  let target = '/'

  if (code.length >= 4 && code.length <= 12) {
    try {
      const r = await fetch(RPC, {
        method: 'POST',
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_code: code,
          p_recipient: hint,
          p_visitor: url.searchParams.get('v') || null,
          p_ua: request.headers.get('user-agent') || null,
          p_ref: request.headers.get('referer') || null,
        }),
      })
      if (r.ok) {
        const j = await r.json()
        if (j && j.ok && typeof j.target === 'string' && j.target.startsWith('/')) {
          target = j.target
          if (j.domain && /^[a-z0-9.-]+$/i.test(j.domain)
              && j.domain.replace(/^www\./, '') !== url.host.replace(/^www\./, '')) {
            host = j.domain
          }
        }
      }
    } catch (e) {
      // tracking must never break the redirect
    }
  }

  const dest = 'https://' + host + target + (target.includes('?') ? '&' : '?')
    + 'qr=' + encodeURIComponent(code) + (hint ? '&qh=' + encodeURIComponent(hint) : '')
  return new Response(null, { status: 302, headers: { Location: dest, 'Cache-Control': 'no-store' } })
}
