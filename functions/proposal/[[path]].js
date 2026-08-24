// functions/proposal/[[path]].js
//
// WHY THIS EXISTS
// 28 expired-listing letters were printed with a QR code pointing at
// https://mcmullenresidential.com/proposal/{page_token}/ — the path the city
// workers have always served. This site never had that route.
//
// It did not 404, which is why it went unnoticed: /proposal/* was absent from
// public/_routes.json, so no Function ran, and the SPA catch-all in
// public/_redirects returned index.html with a 200. React then matched
// <Route path="*" element={<AuthGate />} />, which has no session and sends the
// visitor to /login. A homeowner holding a letter was being shown the sign-in
// screen for an agent CRM.
//
// The canonical page is /expired/{slug}, served by functions/expired/[slug].js,
// which proxies the single renderer in the city worker. This route is a
// permanent 301 onto it rather than a second copy of that proxy — one renderer,
// one proxy, one place to change.
//
// A printed QR cannot be recalled. THIS ROUTE IS PERMANENT. Do not remove it.
//
// Paired with public/_routes.json, which must list "/proposal/*" or this file
// is never invoked and the SPA silently answers instead.

const SITE = 'https://mcmullenresidential.com'

export async function onRequest(context) {
  const { params } = context

  /* [[path]] is a catch-all so that /proposal/{token} and /proposal/{token}/
     both land here — the letters carry the trailing slash. Anything past the
     first segment is ignored rather than rejected: the token is the identity. */
  const segs = Array.isArray(params.path) ? params.path : [params.path]
  const token = String(segs[0] || '').toLowerCase().replace(/[^a-z0-9-]/g, '')

  /* A bare /proposal/ is somebody typing the path, not scanning a code. Send
     them to the service page rather than to a dead end. */
  if (!token) return Response.redirect(SITE + '/services/expired-listing', 302)

  /* 301, not 302: /expired/{token} is the canonical location of this page and
     always will be. get_expired_proposal() accepts the token or the readable
     slug interchangeably, so the token resolves unchanged. */
  return Response.redirect(SITE + '/expired/' + token, 301)
}
