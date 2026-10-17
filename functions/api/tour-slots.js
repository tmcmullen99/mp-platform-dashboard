// functions/api/tour-slots.js — tour times on a showing page here (see ../_shared/page-proxy.js)
import { tourProxy } from '../_shared/page-proxy.js'

export const onRequest = (context) => tourProxy(context.request, 'slots')
