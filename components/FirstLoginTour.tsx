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

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
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

// P9.6 — side-aware scripts. The seller script was written for listings;
// buyers now get a home-search script (interested properties -> schedule).
export default function FirstLoginTour({ side }: { side?: 'buyer' | 'seller' | null }) {
  const { isClient, memberOnboardedAt, memberDisplayName, markOnboarded } = useAuth()

  const welcomeTitle = memberDisplayName
    ? `Welcome, ${memberDisplayName.split(' ')[0]}.`
    : 'Welcome.'

  const buyerSteps: Step[] = [
    {
      key: 'welcome',
      target: null,
      title: welcomeTitle,
      body: 'This is your private home-search portal — every property you are considering, the analysis behind it, and your tour schedule, all in one place. Here is a quick look around.',
    },
    {
      key: 'listing',
      target: 'listing',
      title: 'Your properties',
      body: 'Every home you are tracking lives here. Open one to see its details, your agent\u2019s full market analysis, and the disclosure review — the honest read on condition and price.',
    },
    {
      key: 'schedule',
      target: 'schedule',
      title: 'See it in person',
      body: 'Request a tour in one tap. Your agent confirms the time and it lands on your calendar automatically.',
    },
    {
      key: 'tools',
      target: 'tools',
      title: 'Everything in one place',
      body: 'Move between your properties, analyses, and schedule from here — and message your agent any time. Whatever you need is one click away.',
    },
  ]

  const sellerSteps: Step[] = [
    {
      key: 'welcome',
      target: null,
      title: welcomeTitle,
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

  const steps: Step[] = side === 'buyer' ? buyerSteps : sellerSteps

  const [active, setActive] = useState(false)
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Decide whether to show: client, not yet onboarded.
  useEffect(() => {
    if (isClient && memberOnboardedAt === null) {
      // small delay so portal DOM has mounted and targets exist
      const t = setTimeout(() => setActive(true), 450)
      return () => clearTimeout(t)
    }
    setActive(false)
  }, [isClient, memberOnboardedAt])

  const step = steps[i]
  // Key measurement off the target STRING, not the step object: the steps
  // arrays are rebuilt every render, so `step` has a fresh identity each time.
  // Depending on the object gave `measure` (and every effect keyed on it) a new
  // identity per render -> the layout effect ran after EVERY render -> setRect
  // received a brand-new DOMRect each time (Object.is never bails on those) ->
  // infinite update loop -> "Maximum update depth exceeded" -> blank page the
  // moment a step's data-tour anchor actually existed in the DOM.
  const targetKey = step?.target ?? null

  // Measure the current target. setRect is value-compared so an equivalent
  // rect returns the previous object and never triggers a render — loop-proof
  // even under scroll/resize thrash or future dependency mistakes.
  const measure = useCallback(() => {
    const el = targetKey
      ? document.querySelector<HTMLElement>(`[data-tour="${targetKey}"]`)
      : null
    const next = el ? el.getBoundingClientRect() : null
    setRect((prev) => {
      if (!prev && !next) return prev
      if (
        prev &&
        next &&
        prev.x === next.x &&
        prev.y === next.y &&
        prev.width === next.width &&
        prev.height === next.height
      ) {
        return prev
      }
      return next
    })
  }, [targetKey])

  useLayoutEffect(() => {
    if (!active) return
    measure()
  }, [active, i, measure])

  useEffect(() => {
    if (!active) return
    const onChange = () => measure()
    window.addEventListener('resize', onChange)
    window.addEventListener('scroll', onChange, true)
    return () => {
      window.removeEventListener('resize', onChange)
      window.removeEventListener('scroll', onChange, true)
    }
  }, [active, measure])

  // Ensure target is in view when a step activates. Keyed on the target
  // string for the same identity reason as `measure` above.
  useEffect(() => {
    if (!active || !targetKey) return
    const el = document.querySelector<HTMLElement>(`[data-tour="${targetKey}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [active, i, targetKey])

  const finish = useCallback(async () => {
    setActive(false)
    await markOnboarded()
  }, [markOnboarded])

  const next = useCallback(() => {
    if (i < steps.length - 1) setI((n) => n + 1)
    else finish()
  }, [i, steps.length, finish])

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

  // Compute spotlight cutout box (with padding), clamped to viewport.
  const vw = window.innerWidth
  const vh = window.innerHeight
  const hole = rect
    ? {
        x: Math.max(0, rect.left - PAD),
        y: Math.max(0, rect.top - PAD),
        w: Math.min(vw, rect.width + PAD * 2),
        h: Math.min(vh, rect.height + PAD * 2),
      }
    : null

  // Tooltip position: centered if no target; else below the hole, flipping
  // above when there isn't room.
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
    const wantAbove = below + 180 > vh
    let left = hole.x + hole.w / 2 - CARD_W / 2
    left = Math.max(16, Math.min(left, vw - CARD_W - 16))
    cardStyle = {
      left,
      top: wantAbove ? undefined : below,
      bottom: wantAbove ? vh - hole.y + CARD_GAP : undefined,
      width: CARD_W,
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
      <div
        style={{ position: 'absolute', inset: 0 }}
        onClick={finish}
      />

      {/* Tooltip card */}
      <div
        ref={cardRef}
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
