// functions/api/book-tour.js — a tour booked on a showing page here (see ../_shared/page-proxy.js)
import { tourProxy } from '../_shared/page-proxy.js'

export const onRequest = (context) => tourProxy(context.request, 'book')
