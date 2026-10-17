// functions/api/page-meet-slots.js — the open times on a Build A Page page here (see ../_shared/page-proxy.js)
import { meetProxy } from '../_shared/page-proxy.js'

export const onRequest = (context) => meetProxy(context.request, 'slots')
