// /view/:kind/:id — public viewer for a PRIVATE buyer deliverable (CMA landing
// page or disclosure cheat sheet), addressed by its unguessable row UUID.
//
// Why this exists: the stored HTML documents are served by the `serve_page`
// Edge Function, but Supabase's functions gateway hardens every response with
// `Content-Type: text/plain` + a sandbox CSP, so navigating to the function URL
// shows raw source instead of a page. This route fetches that same endpoint as
// DATA and renders it in a sandboxed iframe on our own domain — which also
// gives clients a branded mp-platform-dashboard.pages.dev link instead of a
// supabase.co one.
//
// Contrast with /cma-review/:slug (CMAShowcaseViewer): that surface lists only
// visibility='public_showcase' rows on the public marketing gallery. This one
// renders visibility='private' client deliverables and is linked ONLY from the
// client's account/documents — nothing enumerates it. serve_page itself
// enforces status='published', so unpublishing kills the link everywhere.

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EDGE_FUNCTIONS_BASE_URL } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const KINDS = new Set(['cma', 'review'])

export default function DeliverableViewer() {
  const { kind, id } = useParams<{ kind: string; id: string }>()
  const [html, setHtml] = useState<string | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!kind || !id || !KINDS.has(kind) || !UUID_RE.test(id)) {
        setState('missing')
        return
      }
      try {
        const res = await fetch(
          `${EDGE_FUNCTIONS_BASE_URL}/serve_page?kind=${kind}&id=${id}`
        )
        if (cancelled) return
        if (!res.ok) {
          setState('missing')
          return
        }
        const text = await res.text()
        if (cancelled) return
        setHtml(text)
        setState('ready')
      } catch {
        if (!cancelled) setState('missing')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [kind, id])

  useEffect(() => {
    document.title =
      kind === 'review'
        ? 'Disclosure Cheat Sheet — McMullen Properties'
        : 'Comparative Market Analysis — McMullen Properties'
  }, [kind])

  if (state === 'loading') {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: '#faf7f1' }}
      >
        <Loader2 className="animate-spin" style={{ color: '#91a1ba' }} />
      </div>
    )
  }

  if (state === 'missing' || !html) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-6"
        style={{ background: '#faf7f1' }}
      >
        <div className="max-w-md text-center">
          <div
            className="text-xs font-semibold uppercase tracking-[0.24em]"
            style={{ color: '#91a1ba' }}
          >
            McMullen Properties
          </div>
          <h1
            className="mp-serif mt-4 text-3xl"
            style={{ color: '#1a1f2e', fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            This document isn&rsquo;t available.
          </h1>
          <p className="mt-3 text-[15px]" style={{ color: '#5c6470' }}>
            The link may be incomplete, or the document may have been
            unpublished. Reach out to your agent for a fresh link.
          </p>
        </div>
      </div>
    )
  }

  // Full-viewport sandboxed iframe: the deliverable is a complete document with
  // its own chrome, styles, and scripts (Leaflet map, calculator, sortable
  // tables); it owns the scroll. allow-scripts runs them in isolation (no
  // allow-same-origin, so they can't reach this app, the session, or Supabase);
  // allow-popups(+escape) lets the Zillow / WhatsApp target=_blank links open.
  return (
    <iframe
      title="McMullen Properties deliverable"
      srcDoc={html}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      style={{
        display: 'block',
        width: '100%',
        height: '100vh',
        border: 'none',
        background: '#faf7f1',
      }}
    />
  )
}
