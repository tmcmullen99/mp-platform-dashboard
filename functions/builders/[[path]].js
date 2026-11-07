// functions/builders/[[path]].js — a builder's page in the developer introduction series (7 Nov 2026), on
// mcmullenresidential.com. The code on the builder letters opens it. Rendered once, by the city worker at
// /_ooa/builders/<token>/ (see ../_shared/page-proxy.js).
import { proxyPage } from '../_shared/page-proxy.js'

export const onRequest = (context) => proxyPage(context, 'builders')
