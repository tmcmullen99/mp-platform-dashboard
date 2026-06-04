// src/components/FirstLoginTour.tsx
//
// First-login guided tour for client portal members. Renders a dimmed
// spotlight overlay with a cutout around each target element plus a tooltip
// card. Shows once per member: triggers when isClient && memberOnboardedAt is
// null, and calls markOnboarded() (which hits the mark_member_onboarded RPC)
// on finish or skip.
//
// Anchoring is decoupled from portal internals: each step (except the centered
// welcome) targets an element by data-tour="<key>". Add these attributes to the
// real portal elements:
//   data-tour="listing"    -> the listing / property card
//   data-tour="tools"      -> the tools / nav area (sidebar or toolbar)
//   data-tour="documents"  -> the documents section
// If a target is missing, that step falls back to a centered card.

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'

type Step = {
  key: string
  target: string | null // data-tour value, or null for centered
  title: string
  body: string
}

const PAD = 8 // spotlight padding around target
const CARD_W = 340
const CARD_GAP = 16 // gap between cutout and tooltip

export default function FirstLoginTour() {
  const { isClient, memberOnboardedAt, memberDisplayName, markOnboarded } = useAuth()

  // Stable across renders so effect dependencies don't thrash.
  const steps: Step[] = useMemo(() => {
    const first = memberDisplayName ? memberDisplayName.split(' ')[0] : ''
    return [
      {
        key: 'welcome',
        target: null,
        title: first ? `Welcome, ${first}.` : 'Welcome.',
        body: 'This is your private portal — a single place to follow your sale in real time. Here is a quick tour of what you will find.',
      },
      {
        key: 'listing',
        target: 'listing',
        title: 'Your listing',
        body: 'Your property lives here — always current, with its price and status updated the moment anything changes.',
      },
      {
        key: 'tools',
        target: 'tools',
        title: 'Everything in one place',
        body: 'Move between your listing, activity, and documents from here. Whatever you need is one click away.',
      },
      {
        key: 'documents',
        target: 'documents',
        title: 'Your documents',
        body: 'Every document tied to your sale is organized and at hand — nothing to dig for, nothing lost in email.',
      },
    ]
  }, [memberDisplayName])

  const [active, setActive] = useState(false)
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const scrollingRef = useRef(false)

  // Decide whether to show: client, not yet onboarded.
  useEffect(() => {
    if (isClient && memberOnboardedAt === null) {
      const t = setTimeout(() => setActive(true), 450)
      return () => clearTimeout(t)
    }
    setActive(false)
  }, [isClient, memberOnboardedAt])

  const step = steps[i]

  // Measure the current target. Returns null for centered steps or missing
  // elements, so the card falls back to centered.
  const measure = useCallback(() => {
    const target = step?.target
    if (!target) {
      setRect(null)
      return
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
    if (!el) {
      setRect(null)
      return
    }
    const r = el.getBoundingClientRect()
    // Guard against zero/negative/NaN boxes (element not laid out yet).
    if (!r || !isFinite(r.width) || !isFinite(r.height) || r.width <= 0 || r.height <= 0) {
      setRect(null)
      return
    }
    setRect(r)
  }, [step])

  // On step change: scroll target into view, then measure once the scroll
  // settles. We suppress the scroll listener during the programmatic scroll so
  // it doesn't fire a storm of measures mid-animation.
  useLayoutEffect(() => {
    if (!active) return
    if (!step?.target) {
      setRect(null)
      return
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    if (!el) {
      setRect(null)
      return
    }
    scrollingRef.current = true
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = setTimeout(() => {
      scrollingRef.current = false
      measure()
    }, 420)
    const raf = requestAnimationFrame(measure)
    return () => {
      clearTimeout(t)
      cancelAnimationFrame(raf)
      scrollingRef.current = false
    }
  }, [active, i, step, measure])

  // Re-measure on resize / scroll, ignoring scroll events during our own
  // programmatic scroll.
  useEffect(() => {
    if (!active) return
    const onResize = () => measure()
    const onScroll = () => {
      if (!scrollingRef.current) measure()
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [active, measure])

  const finish = useCallback(async () => {
    setActive(false)
    try {
      await markOnboarded()
    } catch {
      // non-fatal: tour already hidden locally
    }
  }, [markOnboarded])

  const next = useCallback(() => {
    setI((n) => {
      if (n < steps.length - 1) return n + 1
      finish()
      return n
    })
  }, [steps.length, finish])

  const prev = useCallback(() => setI((n) => Math.max(0, n - 1)), [])

  // Keyboard: Esc skips, arrows navigate.
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, finish, next, prev])

  if (!active || !step) return null

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768

  // Compute spotlight cutout box (with padding), fully clamped to the viewport.
  // Every value is guarded so the SVG <rect> can never receive NaN/negative.
  let hole: { x: number; y: number; w: number; h: number } | null = null
  if (rect && isFinite(rect.left) && isFinite(rect.top)) {
    const x = Math.max(0, rect.left - PAD)
    const y = Math.max(0, rect.top - PAD)
    const w = Math.max(0, Math.min(vw - x, rect.width + PAD * 2))
    const h = Math.max(0, Math.min(vh - y, rect.height + PAD * 2))
    if (w > 0 && h > 0) hole = { x, y, w, h }
  }

  // Tooltip position: centered if no hole; else below the hole, flipping above
  // when there isn't room. All numbers clamped.
  let cardStyle: React.CSSProperties
  if (!hole) {
    cardStyle = {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: CARD_W,
    }
  } else {
    const below = hole.y + hole.h + CARD_GAP
    const wantAbove = below + 200 > vh && hole.y > 220
    let left = hole.x + hole.w / 2 - CARD_W / 2
    left = Math.max(16, Math.min(left, vw - CARD_W - 16))
    if (wantAbove) {
      cardStyle = { left, bottom: Math.max(16, vh - hole.y + CARD_GAP), width: CARD_W }
    } else {
      cardStyle = { left, top: Math.min(below, vh - 220), width: CARD_W }
    }
  }

  const overlay = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
      aria-live="polite"
      role="dialog"
      aria-modal="true"
    >
      {/* Dim layer with spotlight cutout via SVG mask */}
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <defs>
          <mask id="mp-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {hole && (
              <rect
                x={hole.x}
                y={hole.y}
                width={hole.w}
                height={hole.h}
                rx={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(20,24,36,0.78)"
          mask="url(#mp-tour-mask)"
        />
        {hole && (
          <rect
            x={hole.x}
            y={hole.y}
            width={hole.w}
            height={hole.h}
            rx={12}
            fill="none"
            stroke="#91a1ba"
            strokeWidth={2}
          />
        )}
      </svg>

      {/* Click-catch layer (dismiss on backdrop click) */}
      <div style={{ position: 'absolute', inset: 0 }} onClick={finish} />

      {/* Tooltip card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          ...cardStyle,
          background: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 20px 60px rgba(20,24,36,0.35)',
          padding: '24px 24px 18px',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#91a1ba',
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          {`Step ${i + 1} of ${steps.length}`}
        </div>
        <div
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 22,
            fontWeight: 700,
            color: '#1a1f2e',
            lineHeight: 1.2,
            marginBottom: 8,
          }}
        >
          {step.title}
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#353535', margin: '0 0 18px' }}>
          {step.body}
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {steps.map((s, idx) => (
            <span
              key={s.key}
              style={{
                width: idx === i ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: idx === i ? '#1a1f2e' : '#d4d8e0',
                transition: 'width .25s',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={finish}
            style={{
              background: 'none',
              border: 'none',
              color: '#91a1ba',
              fontSize: 12,
              letterSpacing: 1,
              textTransform: 'uppercase',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Skip tour
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && (
              <button
                onClick={prev}
                style={{
                  background: '#f5f3ee',
                  border: 'none',
                  color: '#1a1f2e',
                  fontSize: 12,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '10px 16px',
                  borderRadius: 3,
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              style={{
                background: '#1a1f2e',
                border: 'none',
                color: '#ffffff',
                fontSize: 12,
                letterSpacing: 1,
                textTransform: 'uppercase',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '10px 20px',
                borderRadius: 3,
              }}
            >
              {i < steps.length - 1 ? 'Next' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
