// Shared "motionsites" motion vocabulary, extracted from McMullenHome so the
// bespoke service pages can reuse the exact same animation engine without
// duplicating keyframes. Import <MotionStyles/> once per page, then compose
// Reveal / CountUp / ParallaxHero / Marquee / PillButton freely.
//
// All CSS is scoped under the `.mp-scope` wrapper class so it never leaks into
// the admin dashboard or portal. Wrap each page's root in `mp-scope`.

import { useEffect, useRef, useState } from 'react'

/* ------------------------------ brand tokens ------------------------------ */
export const NAVY = '#0D1B2A'
export const NAVY_DEEP = '#080f18'
export const BLUEGRAY = '#91a1ba'
export const INK = '#273C46'
export const LOGO_BLUE = '#4f82b9'

export const PRIMARY_SHADOW =
  '0 1px 2px 0 rgba(13,27,42,0.10), 0 4px 4px 0 rgba(13,27,42,0.09), 0 9px 6px 0 rgba(13,27,42,0.05), 0 17px 7px 0 rgba(13,27,42,0.01), inset 0 2px 8px 0 rgba(255,255,255,0.30)'
export const SECONDARY_SHADOW = '0 0 0 0.5px rgba(0,0,0,0.06), 0 4px 30px rgba(0,0,0,0.08)'

/* --------------------------- scoped style block --------------------------- */
export function MotionStyles() {
  return (
    <style>{`
      .mp-scope { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; color: ${INK}; }
      .mp-serif { font-family: 'Playfair Display', Georgia, serif; letter-spacing: -0.02em; }
      .mp-mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }

      /* ---- navy image/gradient hero ---- */
      .mp-hero { position: relative; display: flex; align-items: center; overflow: hidden; background: ${NAVY}; }
      .mp-hero-bg { position: absolute; inset: 0; z-index: 0; background-size: cover; background-position: center; }
      .mp-hero-overlay { position: absolute; inset: 0; z-index: 1; background: linear-gradient(135deg, rgba(13,27,42,0.94) 0%, rgba(13,27,42,0.80) 50%, rgba(13,27,42,0.96) 100%); }
      .mp-hero-vignette { position: absolute; inset: 0; z-index: 1; background: radial-gradient(120% 80% at 50% 0%, transparent 40%, rgba(8,15,24,0.55) 100%); }
      .mp-hero-content { position: relative; z-index: 2; width: 100%; }

      @keyframes mpScrollCue { 0%,100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(7px); } }
      .mp-scroll-cue { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 2; animation: mpScrollCue 2.5s infinite; }

      @keyframes mpFadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
      .mp-anim { opacity: 0; animation: mpFadeUp 1s cubic-bezier(0.16,1,0.3,1) forwards; }

      /* ---- headline accent shimmer ---- */
      @keyframes mpSheen { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
      .mp-accent { color: ${BLUEGRAY}; font-style: normal; background-image: linear-gradient(110deg, ${BLUEGRAY} 0%, #c5d2e6 30%, #fff 50%, #c5d2e6 70%, ${BLUEGRAY} 100%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: mpSheen 6s linear infinite; }

      /* ---- gold accent variant (luxury) ---- */
      .mp-accent-gold { font-style: normal; background-image: linear-gradient(110deg, #b8965a 0%, #e6cf9c 30%, #fff7e6 50%, #e6cf9c 70%, #b8965a 100%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: mpSheen 6s linear infinite; }

      /* ---- marquee proof-strip ---- */
      @keyframes mpMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      .mp-marquee { overflow: hidden; }
      .mp-marquee-track { display: flex; width: max-content; animation: mpMarquee 40s linear infinite; }
      .mp-marquee:hover .mp-marquee-track { animation-play-state: paused; }
      @media (max-width: 768px) { .mp-marquee-track { animation-duration: 22s; } }

      /* ---- card hover lift ---- */
      .mp-lift { transition: transform .35s cubic-bezier(0.16,1,0.3,1), box-shadow .35s ease; }
      .mp-lift:hover { transform: translateY(-6px); box-shadow: 0 24px 60px -28px rgba(13,27,42,0.35); }

      @media (prefers-reduced-motion: reduce) {
        .mp-anim, .mp-scroll-cue, .mp-marquee-track, .mp-accent, .mp-accent-gold { animation: none !important; opacity: 1 !important; }
        .mp-accent { -webkit-text-fill-color: ${BLUEGRAY}; }
      }
    `}</style>
  )
}

/* --------------------------- scroll-reveal hook --------------------------- */
export function useInView<T extends HTMLElement>(threshold = 0.14) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true)
            io.unobserve(e.target)
          }
        }),
      { threshold }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, inView }
}

export function Reveal({
  children,
  delay = 0,
  className = '',
  y = 28,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  y?: number
}) {
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : `translateY(${y}px)`,
        transition: `opacity .8s ease-out ${delay}s, transform .8s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

/* ------------------------- animated stat count-up ------------------------- */
// Counts from 0 to `value` when scrolled into view. `prefix`/`suffix` wrap the
// number (e.g. "$", "M+", "%"). Non-numeric displays (like "24hr") pass
// `raw` to skip the animation and just render the string on reveal.
export function CountUp({
  value,
  prefix = '',
  suffix = '',
  raw,
  duration = 1400,
  className = '',
}: {
  value?: number
  prefix?: string
  suffix?: string
  raw?: string
  duration?: number
  className?: string
}) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView || raw != null || value == null) return
    let start: number | null = null
    let frame = 0
    const step = (t: number) => {
      if (start == null) start = t
      const p = Math.min((t - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(eased * value))
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [inView, value, duration, raw])
  return (
    <span ref={ref} className={className}>
      {raw != null ? (inView ? raw : raw) : `${prefix}${n.toLocaleString()}${suffix}`}
    </span>
  )
}

/* ------------------------------ parallax hero ----------------------------- */
// Navy hero with an optional background image, dark gradient overlays, and
// subtle pointer-parallax drift on the content. Children render inside
// `.mp-hero-content` (already max-width-constrained by the caller).
export function ParallaxHero({
  image,
  children,
  minH = '78vh',
  accent = 'blue',
}: {
  image?: string
  children: React.ReactNode
  minH?: string
  accent?: 'blue' | 'gold'
}) {
  const [p, setP] = useState({ x: 0, y: 0 })
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setP({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 })
  }
  return (
    <section
      className="mp-hero"
      style={{ minHeight: minH }}
      onMouseMove={onMove}
      onMouseLeave={() => setP({ x: 0, y: 0 })}
    >
      {image ? (
        <div
          className="mp-hero-bg"
          style={{
            backgroundImage: `url(${image})`,
            transform: `scale(1.08) translate(${p.x * -14}px, ${p.y * -14}px)`,
            transition: 'transform .5s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      ) : (
        <div
          className="mp-hero-bg"
          style={{
            background:
              accent === 'gold'
                ? `radial-gradient(120% 120% at 20% 0%, #12203400 0%, ${NAVY_DEEP} 70%), linear-gradient(160deg, #1a2942 0%, ${NAVY} 55%, ${NAVY_DEEP} 100%)`
                : `radial-gradient(120% 120% at 80% 0%, #1a2942 0%, ${NAVY_DEEP} 70%), linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`,
          }}
        />
      )}
      <div className="mp-hero-overlay" />
      <div className="mp-hero-vignette" />
      <div
        className="mp-hero-content"
        style={{
          transform: `translate(${p.x * 14}px, ${p.y * 14}px)`,
          transition: 'transform .5s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {children}
      </div>
    </section>
  )
}

/* --------------------------------- marquee -------------------------------- */
// Infinite horizontal proof-strip. `items` are duplicated internally so the
// -50% keyframe loops seamlessly.
export function Marquee({ items, className = '' }: { items: string[]; className?: string }) {
  const doubled = [...items, ...items]
  return (
    <div className={`mp-marquee ${className}`}>
      <div className="mp-marquee-track">
        {doubled.map((it, i) => (
          <span
            key={i}
            className="mp-mono text-[11px] uppercase tracking-[0.18em] whitespace-nowrap px-8 py-4"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            {it}
            <span className="ml-8" style={{ color: 'rgba(255,255,255,0.2)' }}>
              /
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* --------------------------------- button --------------------------------- */
export function PillButton({
  href,
  children,
  variant = 'primary',
  onDark = false,
}: {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  onDark?: boolean
}) {
  const primary = variant === 'primary'
  const style = primary
    ? { background: onDark ? '#fff' : NAVY, color: onDark ? NAVY : '#fff', boxShadow: PRIMARY_SHADOW }
    : onDark
    ? { background: 'rgba(255,255,255,0.08)', color: '#fff', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }
    : { background: '#fff', color: NAVY, boxShadow: SECONDARY_SHADOW }
  const internal = href.startsWith('/')
  const cls =
    'inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5'
  return (
    <a href={href} className={cls} style={style}>
      {children}
    </a>
  )
}
