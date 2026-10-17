// functions/value/[[path]].js — a Build A Page page on mcmullenresidential.com (see ../_shared/page-proxy.js)
import { proxyPage } from '../_shared/page-proxy.js'

export const onRequest = (context) => proxyPage(context, 'value')
