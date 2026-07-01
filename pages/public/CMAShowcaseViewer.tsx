// /cma-review/:slug — public viewer for a single showcased CMA.
//
// The stored cma_html is a full self-contained document with its own <style>
// and <script> (Leaflet map, cost calculator, sortable tables). We render it
// inside a SANDBOXED IFRAME via srcDoc so its scripts run in isolation and
// cannot touch the parent app, the user's session, or Supabase. sandbox allows
// scripts + same-origin-less popups for the outbound Zillow/WhatsApp links.
//
// Only public_showcase + published rows are readable here (RLS enforces it);
// anything else 404s to an inline "not available" state.

import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { NAVY, BLUEGRAY } from '@/components/public/motion'
import { ChevronLeft, Loader2 } from 'lucide-react'

export default function CMAShowcaseViewer() {
  const { slug } = useParams<{ slug: string }>()
  const [html, setHtml] = useState<string | null>(null)
  const [name, setName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!slug) return
      const { data, error } = await supabase
        .from('cmas')
        .select('name,cma_html,visibility,status')
        .eq('slug', slug)
        .eq('visibility', 'public_showcase')
        .eq('status', 'published')
        .maybeSingle()
      if (cancelled) return
      if (error || !data || !data.cma_html) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setName(data.name)
      setHtml(data.cma_html)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  // Auto-size the iframe to its content height so the page scrolls as one.
  useEffect(() => {
    if (!html) return
    const frame = frameRef.current
    if (!frame) return
    const resize = () => {
      try {
        const doc = frame.contentDocument
        if (doc) frame.style.height = doc.body.scrollHeight + 'px'
      } catch {
        /* cross-origin guard — srcDoc is same-doc so this is safe */
      }
    }
    frame.addEventListener('load', () => {
      resize()
      // Re-measure a few times as fonts/map tiles settle.
      setTimeout(resize, 300)
      setTimeout(resize, 1200)
      setTimeout(resize, 3000)
    })
    const onWinResize = () => resize()
    window.addEventListener('resize', onWinResize)
    return () => window.removeEventListener('resize', onWinResize)
  }, [html])

  return (
    <div style={{ background: '#faf7f1', minHeight: '100vh' }}>
      {/* Slim return bar (the CMA has its own McMullen chrome inside) */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(250,247,241,.92)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(13,27,42,.10)',
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link
            to="/cma-review"
            className="inline-flex items-center gap-1.5 text-sm font-medium"
            style={{ color: NAVY }}
          >
            <ChevronLeft size={16} /> All analyses
          </Link>
          <span className="text-xs tracking-[0.14em]" style={{ color: BLUEGRAY }}>
            COMPARATIVE MARKET ANALYSIS
          </span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-40">
          <Loader2 className="animate-spin" style={{ color: BLUEGRAY }} />
        </div>
      )}

      {notFound && !loading && (
        <div className="mx-auto max-w-xl px-6 py-40 text-center">
          <h1 className="mp-serif text-3xl" style={{ color: NAVY }}>
            This analysis isn&rsquo;t available.
          </h1>
          <p className="mt-3 text-[15px]" style={{ color: '#5c6470' }}>
            It may have been unpublished. Browse the current showcase instead.
          </p>
          <Link
            to="/cma-review"
            className="mt-6 inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-medium"
            style={{ background: NAVY, color: '#fff' }}
          >
            <ChevronLeft size={16} /> Back to the showcase
          </Link>
        </div>
      )}

      {html && (
        <iframe
          ref={frameRef}
          title={name}
          srcDoc={html}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          style={{ width: '100%', border: 'none', display: 'block', minHeight: '80vh' }}
        />
      )}
    </div>
  )
}
