// McMullen Properties — /meet-tim (v2: dark portfolio aesthetic)
// Rebuilt on the dark-portfolio landing template: Inter + Instrument Serif
// (italic display), near-black HSL palette, loading counter, video hero with
// floating pill navbar, bento "Signature Sales" grid, Four Seasons feature,
// football finale, and a marquee footer.
//
// Zero new dependencies by design: the template's GSAP / framer-motion /
// hls.js animations are recreated with CSS keyframes + the repo's standing
// IntersectionObserver Reveal pattern, and the hero uses an mp4 (native
// playback) instead of an HLS stream. package.json is untouched, so the
// Cloudflare `npm clean-install` build cannot drift.
//
// All styling is scoped under the .mt2 wrapper so the dark theme cannot leak
// into the rest of the public site.
//
// IMAGE NOTE (fixes Tim's 7/22 report): the committed files condo-sf.jpg /
// condo-sv.jpg and campbell.jpg / saratoga.jpg contain each other's artwork,
// so the entries below intentionally cross-reference them. If those four
// files are ever re-uploaded with corrected contents, swap these paths back.

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'

/* --------------------------------- data ---------------------------------- */

type Marketplace = {
  name: string
  tagline: string
  url: string
  image: string
  stat: string
}

const MARKETPLACES: Marketplace[] = [
  {
    name: 'San Francisco Condo Market',
    tagline: 'Building-by-building owner marketplace for the city',
    url: 'https://sanfranciscocondomarket.com',
    image: '/meet-tim/condo-sv.jpg', // file contains the SF artwork (see IMAGE NOTE)
    stat: '142 buildings · 12,183 units',
  },
  {
    name: 'Silicon Valley Condo Market',
    tagline: 'The same engine, pointed at the Valley',
    url: 'https://siliconvalleycondomarket.com', // VERIFY domain before ship
    image: '/meet-tim/condo-sf.jpg', // file contains the SV artwork (see IMAGE NOTE)
    stat: '97 buildings · 6,011 units',
  },
  {
    name: 'Eichler Market',
    tagline: 'A marketplace for an architecture, not a zip code',
    url: 'https://eichlermarket.com',
    image: '/meet-tim/eichler.jpg',
    stat: '1,768 homes · 54 tracts',
  },
  {
    name: 'Campbell Real Estate Market',
    tagline: "The complete public record of a city's housing",
    url: 'https://campbellrealestatemarket.com',
    image: '/meet-tim/saratoga.jpg', // file contains the Campbell artwork (see IMAGE NOTE)
    stat: '6,609 homes · 105 tracts',
  },
  {
    name: 'Los Gatos Real Estate Market',
    tagline: 'Neighborhood intelligence, published',
    url: 'https://losgatosrealestatemarket.com',
    image: '/meet-tim/los-gatos.jpg',
    stat: '7,989 homes · 129 tracts',
  },
  {
    name: 'Saratoga Real Estate Market',
    tagline: 'Dataset to live production in one working day',
    url: 'https://saratogarealestatemarket.com',
    image: '/meet-tim/campbell.jpg', // file contains the Saratoga artwork (see IMAGE NOTE)
    stat: '5,973 homes · 92 tracts',
  },
]

type Sale = {
  name: string
  meta: string
  href: string
  image: string
  span: string // md:col-span-*
  aspect: string
}

const STORAGE = 'https://kumfuludrhoqirxvaqja.supabase.co/storage/v1/object/public/listing-photos/site'

const SALES: Sale[] = [
  {
    name: 'McKinney Lodge',
    meta: '$31,000,000 · Homewood, Tahoe',
    href: '/listings/4250-west-lake-blvd',
    image: `${STORAGE}/4250-west-lake-blvd/000.jpg`,
    span: 'md:col-span-7',
    aspect: 'aspect-[16/10]',
  },
  {
    name: '859 Boar Terrace',
    meta: '$28,000,000 · Fremont',
    href: '/listings/859-boar-terrace',
    image: `${STORAGE}/859-boar-terrace/000.jpg`,
    span: 'md:col-span-5',
    aspect: 'aspect-[16/10] md:aspect-auto',
  },
  {
    name: 'Eureka Tower Penthouse',
    meta: '$17,000,000 · Melbourne, Australia',
    href: '/listings/eureka-tower-penthouse',
    image: `${STORAGE}/eureka-tower-penthouse/000.jpg`,
    span: 'md:col-span-5',
    aspect: 'aspect-[16/10] md:aspect-auto',
  },
  {
    name: '11195 Hooper Lane',
    meta: '$12,000,000 · Los Altos Hills',
    href: '/listings/11195-hooper-lane',
    image: `${STORAGE}/11195-hooper-lane/000.jpg`,
    span: 'md:col-span-7',
    aspect: 'aspect-[16/10]',
  },
  {
    name: '175 Huckleberry Drive',
    meta: '$9,950,000 · Jackson Hole',
    href: '/listings/175-huckleberry-drive',
    image: `${STORAGE}/175-huckleberry-drive/000.jpg`,
    span: 'md:col-span-12',
    aspect: 'aspect-[16/10] md:aspect-[21/8]',
  },
]

const FS_IMAGES = [
  { src: '/meet-tim/fs-tower.webp', alt: 'The Four Seasons Private Residences tower at dusk', span: 'row-span-2' },
  { src: '/meet-tim/fs-penthouse.webp', alt: 'Penthouse living room with spiral staircase', span: 'col-span-2' },
  { src: '/meet-tim/fs-aronson.webp', alt: 'Aronson Building arch residence at night', span: '' },
  { src: '/meet-tim/fs-entrance.webp', alt: 'Residence entrance on Mission Street', span: '' },
]

type BtsItem = { type: 'img' | 'video'; src: string }

const FS_BTS: BtsItem[] = [
  { type: 'img', src: '/meet-tim/fs-bts-01.jpg' },
  { type: 'video', src: '/meet-tim/fs-bts-clip-8396.mp4' },
  { type: 'img', src: '/meet-tim/fs-bts-02.jpg' },
  { type: 'img', src: '/meet-tim/fs-bts-03.jpg' },
  { type: 'img', src: '/meet-tim/fs-bts-04.jpg' },
  { type: 'video', src: '/meet-tim/fs-bts-clip-8402.mp4' },
  { type: 'img', src: '/meet-tim/fs-bts-05.jpg' },
  { type: 'img', src: '/meet-tim/fs-bts-06.jpg' },
  { type: 'img', src: '/meet-tim/fs-bts-07.jpg' },
  { type: 'img', src: '/meet-tim/fs-bts-08.jpg' },
  { type: 'img', src: '/meet-tim/fs-bts-09.jpg' },
]

const OSU_IMAGE =
  'https://cdn.prod.website-files.com/65a1ca4354f63bd7376b5027/69a1025b9df366f2a09cbd93_tim%20oregon%20state.jpg'

const HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4'

const ROLES = ['agent', 'builder', 'founder', 'competitor']

/* ---------------------------- reveal utilities ---------------------------- */

function useInView<T extends HTMLElement>(threshold = 0.12) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && setInView(true)),
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, inView }
}

function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : 'translateY(30px)',
        transition: `opacity 1s cubic-bezier(.25,.1,.25,1) ${delay}s, transform 1s cubic-bezier(.25,.1,.25,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

function SectionHeader({
  eyebrow,
  lead,
  accent,
  sub,
}: {
  eyebrow: string
  lead: string
  accent: string
  sub?: string
}) {
  return (
    <Reveal>
      <div className="flex items-center gap-3 mb-5">
        <span className="w-8 h-px bg-white/15" />
        <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">{eyebrow}</span>
      </div>
      <h2 className="text-3xl md:text-5xl leading-tight text-white/95">
        {lead} <span className="mt2-serif text-white">{accent}</span>
      </h2>
      {sub && <p className="text-sm md:text-base text-white/45 mt-4 max-w-xl leading-relaxed">{sub}</p>}
    </Reveal>
  )
}

/* -------------------------- neighborhood signal --------------------------- */
// Animated radius diagram from the Claude Design iteration. Pure rAF + refs —
// zero new deps. One fix vs. the design draft: elements are queried from a
// wrapper ref (the original nextElementSibling lookup grabbed the label div,
// which silently skipped the building-side animation).

const NS_CYCLE = 6.4, NS_HOLD = 4.6, NS_FADE_END = 5.7
const nsClamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const nsLerp = (a: number, b: number, t: number) => a + (b - a) * t
const nsEaseOut = (t: number) => 1 - Math.pow(1 - t, 3)
const nsHexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [78, 133, 191]
}

const NS_ROOF = 12, NS_BODY = 28, NS_W = 44
const nsStreetCfg: { x: number; ry: number; cx: number; cy: number }[] = []
;[40, 156].forEach(hx =>
  [34, 78, 122, 166].forEach(ry =>
    nsStreetCfg.push({ x: hx, ry, cx: hx + NS_W / 2, cy: ry + NS_ROOF + NS_BODY / 2 })),
)
const nsMkHouse = (h: { x: number; ry: number }) => ({
  x: h.x,
  bodyY: h.ry + NS_ROOF,
  roof: `${h.x},${h.ry + NS_ROOF} ${h.x + NS_W / 2},${h.ry} ${h.x + NS_W},${h.ry + NS_ROOF}`,
})
const nsSoldHouse = nsStreetCfg[1]
const nsStreetSource = nsMkHouse(nsSoldHouse)
const nsStreetOthers = nsStreetCfg.filter((_, i) => i !== 1)
const nsSd = nsStreetOthers.map(h => Math.hypot(h.cx - nsSoldHouse.cx, h.cy - nsSoldHouse.cy))
const nsSMin = Math.min(...nsSd), nsSMax = Math.max(...nsSd)
const NS_STREET = nsStreetOthers.map((h, i) => ({ ...nsMkHouse(h), t0: 0.6 + ((nsSd[i] - nsSMin) / (nsSMax - nsSMin)) * 1.9 }))

const NS_COLS = [52, 74, 96], NS_ROWS = [44, 71, 98, 125, 152, 179]
const NS_SRC_R = 3, NS_SRC_C = 1
const nsBRaw: { x: number; y: number; d: number }[] = []
let nsBMax = 0
NS_ROWS.forEach((_, r) => NS_COLS.forEach((cx, c) => {
  if (r === NS_SRC_R && c === NS_SRC_C) return
  const d = Math.hypot(r - NS_SRC_R, c - NS_SRC_C)
  nsBMax = Math.max(nsBMax, d)
  nsBRaw.push({ x: cx, y: NS_ROWS[r], d })
}))
const NS_BUILDING = nsBRaw.map(u => ({ x: u.x, y: u.y, t0: 0.6 + (u.d / nsBMax) * 2.2 }))

function NeighborhoodSignal({ accent = '#4E85BF', speed = 1 }: { accent?: string; speed?: number }) {
  const wrap = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const rootEl = wrap.current
    if (!rootEl) return
    const els = [...rootEl.querySelectorAll<SVGElement>('[data-neighbor],[data-source]')]
    const pulses = [...rootEl.querySelectorAll<SVGElement>('[data-pulse]')]

    const paint = (el: SVGElement, level: number, pop: number, sold: boolean, rgb: number[]) => {
      const [r, g, b] = rgb
      const big = el.dataset.big === '1'
      const nMax = big ? 0.9 : 0.62, sMx = big ? 0.88 : 0.78
      const fillA = sold ? 0.15 + level * sMx : 0.06 + level * nMax
      el.style.fill = `rgba(${sold ? '110,150,210' : `${r},${g},${b}`}, ${fillA})`
      el.style.stroke = `rgba(${Math.round(nsLerp(255, r, level))},${Math.round(nsLerp(255, g, level))},${Math.round(nsLerp(255, b, level))}, ${0.18 + level * 0.8})`
      const glow = level * (big ? 7 : 5) + pop * 10
      el.style.filter = glow > 0.4 ? `drop-shadow(0 0 ${glow}px rgba(${r},${g},${b}, ${0.45 * level + 0.5 * pop}))` : 'none'
      el.style.transform = `scale(${1 + pop * 0.26})`
    }

    const start = performance.now()
    let raf = 0
    const loop = (now: number) => {
      const rgb = nsHexToRgb(accent)
      const tp = (((now - start) / 1000) * speed) % NS_CYCLE
      const fade = tp > NS_HOLD ? nsClamp((tp - NS_HOLD) / (NS_FADE_END - NS_HOLD), 0, 1) : 0
      els.forEach(el => {
        const sold = el.dataset.source === '1'
        let level = 0, pop = 0
        if (sold) {
          level = nsEaseOut(nsClamp(tp / 0.45, 0, 1)) * (1 - fade)
          pop = tp < 0.5 ? Math.sin(nsClamp(tp / 0.5, 0, 1) * Math.PI) * 0.65 : 0
        } else {
          const t0 = +el.dataset.t0!
          if (tp >= t0) {
            const local = tp - t0
            level = nsEaseOut(nsClamp(local / 0.3, 0, 1)) * (1 - fade)
            pop = local < 0.5 ? Math.sin((local / 0.5) * Math.PI) : 0
          }
        }
        paint(el, level, pop, sold, rgb)
      })
      pulses.forEach(el => {
        const delay = +el.dataset.delay! || 0
        const tpp = tp - delay
        if (tpp >= 0 && tpp <= 1.4) {
          const p = tpp / 1.4
          el.style.opacity = String(0.5 * (1 - p))
          el.style.transform = `scale(${nsLerp(0.5, 3.2, nsEaseOut(p))})`
        } else el.style.opacity = '0'
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [accent, speed])

  const nStyle = { fill: 'rgba(255,255,255,0.045)', stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1.2, transformBox: 'fill-box' as const, transformOrigin: 'center' }
  const sStyle = { fill: 'rgba(94,133,200,0.15)', stroke: '#89AACC', strokeWidth: 1.4, transformBox: 'fill-box' as const, transformOrigin: 'center' }
  const pStyle = { fill: 'none', stroke: '#89AACC', strokeWidth: 1.5, opacity: 0, transformBox: 'fill-box' as const, transformOrigin: 'center' }

  return (
    <div ref={wrap} className="flex justify-center items-end gap-4 md:gap-6 flex-nowrap">
      <div className="text-center min-w-0" style={{ flex: '3 1 0%', maxWidth: 280 }}>
        <svg viewBox="0 0 240 250" className="w-full h-auto" style={{ overflow: 'visible' }}>
          <rect x="106" y="12" width="28" height="220" rx="5" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" />
          <line x1="120" y1="20" x2="120" y2="224" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" strokeDasharray="6 9" />
          {[0, 0.3].map(d => <circle key={d} data-pulse data-delay={d} cx="62" cy="104" r="22" style={pStyle} />)}
          {NS_STREET.map((h, i) => (
            <g key={i} data-neighbor data-big="1" data-t0={h.t0} style={nStyle}>
              <polygon points={h.roof} /><rect x={h.x} y={h.bodyY} width="44" height="28" rx="3" />
            </g>
          ))}
          <g data-source="1" data-big="1" style={sStyle}>
            <polygon points={nsStreetSource.roof} /><rect x={nsStreetSource.x} y={nsStreetSource.bodyY} width="44" height="28" rx="3" />
          </g>
        </svg>
        <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 mt-2">Same street</div>
      </div>

      <div className="text-center min-w-0" style={{ flex: '2 1 0%', maxWidth: 200 }}>
        <svg viewBox="0 0 160 250" className="w-full h-auto" style={{ overflow: 'visible' }}>
          <rect x="40" y="30" width="80" height="180" rx="8" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" />
          {[0, 0.3].map(d => <rect key={d} data-pulse data-delay={d} x="74" y="125" width="16" height="20" rx="3" style={pStyle} />)}
          {NS_BUILDING.map((u, i) => <rect key={i} data-neighbor data-t0={u.t0} x={u.x} y={u.y} width="16" height="20" rx="3" style={nStyle} />)}
          <rect data-source="1" x="74" y="125" width="16" height="20" rx="3" style={sStyle} />
        </svg>
        <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 mt-2">Same building</div>
      </div>
    </div>
  )
}

/* ------------------------------ loading screen ---------------------------- */

function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const DURATION = 1500
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min((now - start) / DURATION, 1)
      setCount(Math.round(p * 100))
      if (p < 1) raf = requestAnimationFrame(tick)
      else setTimeout(onComplete, 350)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [onComplete])
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col justify-between p-8 md:p-12">
      <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">McMullen Properties</div>
      <div className="self-center mt2-serif text-4xl md:text-6xl text-white/80">Meet Tim</div>
      <div className="self-end text-6xl md:text-8xl text-white tabular-nums mt2-serif">
        {String(count).padStart(3, '0')}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
        <div
          className="h-full mt2-accent origin-left"
          style={{ transform: `scaleX(${count / 100})`, boxShadow: '0 0 8px rgba(137,170,204,0.35)' }}
        />
      </div>
    </div>
  )
}

/* ------------------------------ rotating role ----------------------------- */

function RotatingRole() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI(v => (v + 1) % ROLES.length), 2000)
    return () => clearInterval(t)
  }, [])
  return (
    <span key={i} className="mt2-serif text-white inline-block mt2-role-fade">
      {ROLES[i]}
    </span>
  )
}

/* ---------------------------------- page ---------------------------------- */

/* ------------------------- The Market: film + demos ----------------------- */
const TM_FILM = 'https://themarketbrokerage.com/assets/films/the-market'

function MarketFilm() {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const small = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width:760px)').matches
  return (
    <div className="relative rounded-[2rem] overflow-hidden border border-white/10 bg-[#0e1118]" style={{ aspectRatio: '16 / 9' }}>
      <video
        ref={ref}
        src={TM_FILM + (small ? '-720.mp4' : '-1080.mp4')}
        poster={TM_FILM + '-poster.jpg'}
        controls={playing}
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover"
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <button
          type="button"
          aria-label="Play the film: The Market"
          onClick={() => { setPlaying(true); ref.current?.play().catch(() => {}) }}
          className="absolute inset-0 flex items-end justify-start p-6 md:p-8 text-left"
          style={{ background: 'linear-gradient(to top, rgba(10,12,16,.85), rgba(10,12,16,.1) 60%)' }}
        >
          <span className="flex items-center gap-4">
            <span className="flex items-center justify-center rounded-full bg-white/95 w-14 h-14 md:w-16 md:h-16 shadow-xl">
              <span style={{ width: 0, height: 0, marginLeft: 4, borderLeft: '16px solid #111', borderTop: '10px solid transparent', borderBottom: '10px solid transparent' }} />
            </span>
            <span>
              <span className="block text-[10px] uppercase tracking-[0.25em] text-white/60">Watch · The Market</span>
              <span className="block mt2-serif text-xl md:text-2xl text-white">Every home. Every market.</span>
            </span>
          </span>
        </button>
      )}
    </div>
  )
}

/* ---------------------- Buyer and seller folds (light) ---------------------- */
const PERI = '#4f82b9'  // McMullen blue (LOGO_BLUE)
const lightCard = 'rounded-3xl bg-white border border-[#d9e2f1] shadow-[0_1px_0_rgba(26,31,46,.04)]'

function FoldHead({ eyebrow, lead, accent, sub }: { eyebrow: string; lead: string; accent: string; sub: string }) {
  return (
    <Reveal>
      <div className="flex items-center gap-3 mb-5">
        <span className="w-8 h-px" style={{ background: PERI }} />
        <span className="text-[11px] uppercase tracking-[0.3em]" style={{ color: PERI }}>{eyebrow}</span>
      </div>
      <h2 className="text-3xl md:text-5xl leading-tight text-[#1a1f2e]">
        {lead} <span className="mt2-serif" style={{ color: PERI }}>{accent}</span>
      </h2>
      <p className="text-sm md:text-base text-[#4a5163] mt-4 max-w-2xl leading-relaxed">{sub}</p>
    </Reveal>
  )
}

/* Real published work, not samples. Values are left out on purpose: what a specific home
   is worth is Tim's opinion to give a client, not a headline on a profile page. */
const REPORTS: { address: string; score: number; findings: number; questions: number; flags: number; comps?: number; line: string; href: string }[] = [
  { address: '4765 Del Loma Court', score: 68, findings: 11, questions: 10, flags: 7, comps: 3,
    line: 'Gut-renovated by an investor who never lived in it: permits and plans included, and a seller who warrants none of it.',
    href: 'https://campbellrealestatemarket.com/cma/4765-del-loma-court-844fc3/' },
  { address: '1180 Fewtrell Drive', score: 66, findings: 12, questions: 10, flags: 7, comps: 5,
    line: 'Half the house is effectively new after a 2020 mold event. Open threads: grading that still pools water, a $4,640 termite bid, an unpermitted bath.',
    href: 'https://campbellrealestatemarket.com/cma/1180-fewtrell-drive-866c88/' },
  { address: '244 Darryl Drive', score: 64, findings: 13, questions: 10, flags: 11,
    line: 'A $0 pest report, paired with an active supply-pipe leak, roof ponding, and no smoke or CO detectors.',
    href: 'https://campbellrealestatemarket.com/home/244-darryl-dr/' },
  { address: '204 Hardy Avenue', score: 61, findings: 16, questions: 10, flags: 12,
    line: 'Home, termite, roofing and HVAC reports on a 73-year-old house: $3,115 of termite work and two suspected asbestos materials.',
    href: 'https://campbellrealestatemarket.com/home/204-hardy-ave/' },
]

function BuyerFold() {
  return (
    <div className="min-h-[100svh] flex flex-col justify-center py-16 md:py-20">
      <div className="max-w-[1200px] w-full mx-auto px-6 md:px-10 lg:px-16">
        <FoldHead eyebrow="If you're buying" lead="Every home is open to you." accent="Even the ones not for sale."
          sub="With Tim as your broker you can write an offer on any home in any market The Market runs, listed or not. And every home you look at seriously comes with a Comp Report and a review of its disclosures, before you commit to anything." />
        <div className="grid lg:grid-cols-[1fr_2fr] gap-5 mt-10">
          <Reveal>
            <div className={lightCard + ' p-6 h-full flex flex-col'}>
              <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: PERI }}>Any home, any market</p>
              <h3 className="mt2-serif text-2xl mt-2">Write an offer on the house you actually want</h3>
              <p className="text-[13px] text-[#4a5163] mt-2 leading-relaxed">Not only what a portal happens to show. The owner receives a written offer from a licensed broker, and nothing is agreed until they sign.</p>
              <div className="mt-auto pt-5 grid grid-cols-3 gap-2 text-center">
                {[['Listed', 'Active listings'], ['Coming Soon', 'Before the MLS'], ['Not for sale', 'Any address']].map(([a, b]) => (
                  <div key={a} className="rounded-2xl bg-[#F4F7FC] border border-[#d9e2f1] px-2 py-3">
                    <div className="text-[13px] font-medium">{a}</div><div className="text-[11px] text-[#6b7285] mt-0.5">{b}</div>
                  </div>))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className={lightCard + ' p-6'}>
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: PERI }}>Recent work · Campbell</p>
                <p className="text-[11px] text-[#6b7285]">You get this on every home you look at</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                {REPORTS.map(r => (
                  <a key={r.address} href={r.href} target="_blank" rel="noopener noreferrer"
                     className="group rounded-2xl border border-[#d9e2f1] bg-[#F9FBFE] p-4 hover:border-[#4f82b9] transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="mt2-serif text-lg leading-tight">{r.address}</div>
                      <div className="shrink-0 text-center">
                        <div className="text-xl font-semibold" style={{ color: PERI }}>{r.score}</div>
                        <div className="text-[9px] uppercase tracking-[0.15em] text-[#6b7285]">condition</div>
                      </div>
                    </div>
                    <p className="text-[12px] text-[#4a5163] leading-relaxed mt-2">{r.line}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(r.comps ? [r.comps + ' recorded sales'] : []).concat([r.findings + ' findings', r.questions + ' questions to ask', r.flags + ' cost items']).map(t =>
                        <span key={t} className="rounded-full bg-white border border-[#d9e2f1] px-2.5 py-0.5 text-[10.5px] text-[#4a5163]">{t}</span>)}
                    </div>
                    <div className="text-[11px] mt-3 inline-flex items-center gap-1" style={{ color: PERI }}>
                      {r.comps ? 'Open the Comp Report' : 'Open the home record'} <ArrowUpRight size={12} />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}

const MMM_MARKETS: [string, string][] = [
  ['Campbell', 'https://campbellrealestatemarket.com/make-me-move/'],
  ['Los Gatos', 'https://losgatosrealestatemarket.com/make-me-move/'],
  ['Saratoga', 'https://saratogarealestatemarket.com/make-me-move/'],
  ['San Francisco condo', 'https://sanfranciscocondomarket.com/sell/'],
  ['Eichler', 'https://eichlermarket.com/make-me-move/'],
]
const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

function MakeMeMoveTool() {
  const [addr, setAddr] = useState('')
  const [num, setNum] = useState(2400000)
  const [mkt, setMkt] = useState(0)
  return (
    <div className={lightCard + ' p-6 h-full flex flex-col'}>
      <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: PERI }}>For homeowners · try it</p>
      <h3 className="mt2-serif text-2xl mt-2">Set your Make Me Move price</h3>
      <p className="text-[13px] text-[#4a5163] mt-2 leading-relaxed">The price that would actually make you move. No sign, no showings, no public record: only account holders see it, and a buyer who meets it makes a written offer.</p>
      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        <label className="text-[11px] text-[#6b7285]">Your street address
          <input value={addr} onChange={e => setAddr(e.target.value)} placeholder="e.g. 1187 Linden Way"
            className="mt-1 w-full rounded-xl border border-[#d9e2f1] bg-[#F9FBFE] px-3 py-2 text-[14px] text-[#1a1f2e] outline-none focus:border-[#4f82b9]" /></label>
        <label className="text-[11px] text-[#6b7285]">Market
          <select value={mkt} onChange={e => setMkt(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-[#d9e2f1] bg-[#F9FBFE] px-3 py-2 text-[14px] text-[#1a1f2e] outline-none focus:border-[#4f82b9]">
            {MMM_MARKETS.map(([n], i) => <option key={n} value={i}>{n}</option>)}
          </select></label>
      </div>
      <label className="text-[11px] text-[#6b7285] mt-4">Your number: <b className="text-[#1a1f2e] text-[15px]">{money(num)}</b>
        <input type="range" min={500000} max={8000000} step={25000} value={num} onChange={e => setNum(Number(e.target.value))}
          className="w-full mt-2" style={{ accentColor: PERI }} /></label>
      <div className="mt-4 rounded-2xl border border-[#d9e2f1] bg-[#F4F7FC] p-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[#6b7285]">Your home, as buyers would see it</div>
        <div className="mt2-serif text-xl mt-1">{addr.trim() || 'Your address'}</div>
        <div className="flex flex-wrap gap-5 mt-2 text-[13px]">
          <div><div className="text-[10px] uppercase tracking-[0.15em] text-[#6b7285]">Make Me Move</div><b>{money(num)}</b></div>
          <div><div className="text-[10px] uppercase tracking-[0.15em] text-[#6b7285]">Seen by</div>Account holders</div>
          <div><div className="text-[10px] uppercase tracking-[0.15em] text-[#6b7285]">Public listing</div>None</div>
        </div>
      </div>
      <a href={MMM_MARKETS[mkt][1]} target="_blank" rel="noopener noreferrer"
         className="mt-5 self-start inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white" style={{ background: PERI }}>
        Set it for real <ArrowUpRight size={16} />
      </a>
    </div>
  )
}

function ExchangeTool() {
  const [value, setValue] = useState(1800000)
  const [rent, setRent] = useState(4500)
  const gross = rent * 12 / value * 100
  const net = rent * 12 * 0.65 / value * 100
  const incomeNow = rent * 12 * 0.65
  const incomeAt7 = value * 0.94 * 0.07   // after roughly 6% in selling costs
  return (
    <div className={lightCard + ' p-6 h-full flex flex-col'}>
      <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: PERI }}>For rental owners · try it</p>
      <h3 className="mt2-serif text-2xl mt-2">Is your rental pulling its weight?</h3>
      <p className="text-[13px] text-[#4a5163] mt-2 leading-relaxed">Enter what the house is worth and what it rents for. On the Investor Exchange it goes to local investors with the tenant in place, and the equity can move through a 1031 exchange into property that pays more and asks less of you.</p>
      <label className="text-[11px] text-[#6b7285] mt-5">What it is worth today: <b className="text-[#1a1f2e] text-[15px]">{money(value)}</b>
        <input type="range" min={500000} max={5000000} step={25000} value={value} onChange={e => setValue(Number(e.target.value))} className="w-full mt-2" style={{ accentColor: PERI }} /></label>
      <label className="text-[11px] text-[#6b7285] mt-3">Monthly rent: <b className="text-[#1a1f2e] text-[15px]">{money(rent)}</b>
        <input type="range" min={1500} max={15000} step={100} value={rent} onChange={e => setRent(Number(e.target.value))} className="w-full mt-2" style={{ accentColor: PERI }} /></label>
      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        {[['Gross yield', gross.toFixed(2) + '%'], ['After costs', net.toFixed(2) + '%'], ['Net a year', money(incomeNow)]].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-[#F4F7FC] border border-[#d9e2f1] px-2 py-3">
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#6b7285]">{k}</div><div className="text-[15px] font-semibold mt-1">{v}</div></div>))}
      </div>
      <div className="mt-3 rounded-2xl border px-4 py-3 text-[12.5px] leading-relaxed" style={{ borderColor: PERI, background: '#EAF0FA' }}>
        The same equity at a <b>7% cap rate</b>, the rate on the triple-net warehouse in Modesto Tim&rsquo;s buyer bought, would pay about <b>{money(incomeAt7)}</b> a year after roughly 6% in selling costs, with the tenant covering taxes, insurance and repairs.
      </div>
      <p className="text-[10.5px] text-[#6b7285] mt-2">Illustration only. Running costs assumed at 35% of rent. Taxes, debt and the 1031 rules change the picture: talk to your CPA before you act.</p>
      <a href="https://campbellrealestatemarket.com/investor-exchange/" target="_blank" rel="noopener noreferrer"
         className="mt-auto pt-4 self-start inline-flex items-center gap-2 text-sm font-medium" style={{ color: PERI }}>
        See the Investor Exchange <ArrowUpRight size={16} />
      </a>
    </div>
  )
}

function SellerFold() {
  return (
    <div className="min-h-[100svh] flex flex-col justify-center py-16 md:py-20 border-t border-[#d9e2f1]">
      <div className="max-w-[1200px] w-full mx-auto px-6 md:px-10 lg:px-16">
        <FoldHead eyebrow="If you're selling" lead="Test your price" accent="without moving out."
          sub="Most owners find out what their home is worth by listing it. With Tim you can name your number privately and let buyers come to it, or offer a rental to investors without disturbing the tenant." />
        <div className="grid lg:grid-cols-2 gap-5 mt-10">
          <Reveal><MakeMeMoveTool /></Reveal>
          <Reveal delay={0.08}><ExchangeTool /></Reveal>
        </div>
        <Reveal delay={0.1}>
          <div className="mt-10">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#6b7285]">Live now, with more cities coming</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {MARKETPLACES.map(m => (
                <a key={m.name} href={m.url} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1.5 rounded-full border border-[#d9e2f1] bg-white px-3.5 py-1.5 text-[12px] text-[#1a1f2e] hover:border-[#4f82b9] transition-colors">
                  {m.name} <ArrowUpRight size={13} className="text-[#6b7285]" />
                </a>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}

export default function MeetTim() {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    document.title = 'Meet Tim — McMullen Properties'
  }, [])

  return (
    <div className="mt2 min-h-screen bg-[#0a0a0a] text-white/95" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Instrument+Serif:ital@1&display=swap');
        .mt2-serif { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-weight: 400; }
        .mt2-accent { background: linear-gradient(90deg, #89AACC 0%, #4E85BF 100%); }
        @keyframes mt2-name { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: none; } }
        .mt2-name { animation: mt2-name 1.2s cubic-bezier(.22,1,.36,1) .1s both; }
        @keyframes mt2-blur { from { opacity: 0; filter: blur(10px); transform: translateY(20px); } to { opacity: 1; filter: blur(0); transform: none; } }
        .mt2-blur { animation: mt2-blur 1s ease-out both; }
        @keyframes mt2-role { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .mt2-role-fade { animation: mt2-role .4s ease-out both; }
        @keyframes mt2-scroll { 0% { transform: translateY(-100%); } 100% { transform: translateY(200%); } }
        .mt2-scroll-line { animation: mt2-scroll 1.5s ease-in-out infinite; }
        @keyframes mt2-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .mt2-marquee { animation: mt2-marquee 40s linear infinite; }
        .mt2-marquee-slow { animation: mt2-marquee 60s linear infinite; }
        .mt2-marquee-wrap:hover .mt2-marquee-slow { animation-play-state: paused; }
        .mt2 ::selection { background: #4E85BF; color: #fff; }
      `}</style>

      {loading && <LoadingScreen onComplete={() => setLoading(false)} />}

      {/* ------------------------------ NAVBAR ----------------------------- */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 md:pt-6 px-4">
        <nav className="inline-flex items-center rounded-full backdrop-blur-md border border-white/10 bg-[#141414]/90 px-2 py-2 shadow-md shadow-black/20">
          <a href="/home" className="relative w-9 h-9 rounded-full p-[2px] mt2-accent hover:scale-110 transition-transform mr-1" aria-label="McMullen Properties home">
            <span className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center mt2-serif text-[13px] text-white">
              TM
            </span>
          </a>
          <span className="hidden sm:block w-px h-5 bg-white/10 mx-1" />
          <a href="#the-market" className="text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-white/50 hover:text-white hover:bg-white/5 transition-colors">
            The Market
          </a>
          <a href="#sales" className="text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-white/50 hover:text-white hover:bg-white/5 transition-colors">
            Sales
          </a>
          <a href="#four-seasons" className="hidden sm:block text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-white/50 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap">
            Launching a $1.2B Building
          </a>
          <span className="hidden sm:block w-px h-5 bg-white/10 mx-1" />
          <a
            href="sms:+14156919272"
            className="text-xs sm:text-sm rounded-full px-4 py-1.5 sm:py-2 text-white bg-white/5 border border-white/10 hover:border-white/30 transition-colors"
          >
            Say hi ↗
          </a>
        </nav>
      </div>

      {/* ------------------------------- HERO ------------------------------ */}
      <section className="relative h-screen overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            src={HERO_VIDEO}
            className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover -translate-x-1/2 -translate-y-1/2"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl">
          <p className="mt2-blur text-[11px] uppercase tracking-[0.3em] text-white/50 mb-8" style={{ animationDelay: '.3s' }}>
            McMullen Properties · CA DRE #02016832
          </p>
          <h1 className="mt2-name mt2-serif text-6xl md:text-8xl lg:text-9xl leading-[0.9] tracking-tight mb-8">
            Tim McMullen
          </h1>
          <p className="mt2-blur text-lg md:text-2xl text-white/80 mb-4" style={{ animationDelay: '.45s' }}>
            The <RotatingRole /> obsessed with building systems that make buying &amp; selling real
            estate <span className="mt2-serif">better for clients</span>.
          </p>
          <p className="mt2-blur text-sm md:text-base text-white/45 max-w-md mx-auto mb-12" style={{ animationDelay: '.55s' }}>
            Six live marketplaces, a platform that does the analytical work agents used to gatekeep,
            and $100M+ in closed transactions.
          </p>
          <div className="mt2-blur inline-flex gap-4" style={{ animationDelay: '.65s' }}>
            <a
              href="#pursuits"
              className="rounded-full text-sm px-7 py-3.5 bg-white text-[#0a0a0a] font-medium hover:scale-105 transition-transform"
            >
              See the work
            </a>
            <a
              href="mailto:tim@mcmullen.properties"
              className="rounded-full text-sm px-7 py-3.5 border-2 border-white/15 text-white hover:border-white/40 hover:scale-105 transition-all"
            >
              Reach out
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Scroll</span>
          <span className="relative w-px h-10 bg-white/10 overflow-hidden">
            <span className="absolute inset-x-0 h-4 bg-white/70 mt2-scroll-line" />
          </span>
        </div>
      </section>

      {/* ------------------------------- THE PERSON ------------------------ */}
      {/* Sits deliberately between the hero and the six marketplaces.

          Everything else on this page is a grid: cards, counts, stats. This is
          the one fold with none of that - one photograph, one long first-person
          paragraph, no numbers at all. The contrast is the point. The hero
          opens on scale and the next fold opens on inventory; a reader who
          never meets the person in between just sees a platform.

          Copy is Tim's own, in his words, split for reading rather than
          rewritten. The pull-quote sentence is lifted OUT of the running text
          so it lands once rather than twice. */}
      <section id="the-person" className="py-16 md:py-28 scroll-mt-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">

            <Reveal className="lg:col-span-5">
              <div className="relative">
                <div className="overflow-hidden rounded-3xl bg-[#141414] border border-white/10">
                  <img
                    src="/meet-tim/tim-portrait.jpg"
                    alt="Tim McMullen"
                    loading="lazy"
                    className="w-full h-full object-cover aspect-[4/5]"
                  />
                </div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/35 mt-4">
                  Tim McMullen &middot; Broker &middot; CA DRE #02016832
                </p>
              </div>
            </Reveal>

            <div className="lg:col-span-7">
              <Reveal delay={0.08}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-8 h-px bg-white/15" />
                  <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                    Before any of the rest of it
                  </span>
                </div>
                <h2 className="text-3xl md:text-5xl leading-tight text-white/95">
                  Ten years of helping people{' '}
                  <span className="mt2-serif text-white">get from A to B.</span>
                </h2>
              </Reveal>

              <Reveal delay={0.16}>
                <div className="mt-7 space-y-5 text-[15px] md:text-base leading-relaxed text-white/60 max-w-[62ch]">
                  <p>
                    I&rsquo;ve spent the last ten years helping people all over the Bay navigate
                    unique and interesting real estate purchases, sales, exchanges and estate
                    sales, meeting some incredible people and joining in on their journeys along
                    the way.
                  </p>
                  <p>
                    I wouldn&rsquo;t change a thing. I&rsquo;ve lost some heartbreaking deals,
                    I&rsquo;ve had some triumphant wins, and I&rsquo;ve set local sales records in
                    almost every market I&rsquo;ve played in.
                  </p>
                </div>
              </Reveal>

              {/* The one line the section exists to carry. Given the page's
                  display face and room to breathe, and nothing else on this
                  fold competes with it. */}
              <Reveal delay={0.24}>
                <blockquote className="my-9 md:my-11 pl-6 border-l border-white/15">
                  <p className="mt2-serif text-2xl md:text-4xl leading-[1.25] text-white">
                    The most important part of real estate is the people.
                  </p>
                </blockquote>
              </Reveal>

              <Reveal delay={0.3}>
                <div className="space-y-5 text-[15px] md:text-base leading-relaxed text-white/60 max-w-[62ch]">
                  <p>
                    It doesn&rsquo;t matter how much money you net someone if the relationship goes
                    south afterward &mdash; just like the price you pay for a home only really
                    matters at the time of purchase. The hardest part, more often than not, is
                    getting your offer accepted in the first place.
                  </p>
                  <p className="text-white/80">
                    The thing that brings me the most joy in this world is helping people get from
                    A to B in the smoothest, simplest and most effective way possible.{' '}
                    <span className="mt2-serif text-white">
                      If I can do that for you, it would be my pleasure.
                    </span>
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------- THE MARKET BROKERAGE ----------------------- */}
      {/* Tim, 28 Sep 2026: replaces "Six marketplaces". Tim is the founding broker of The
          Market; the section says what that gives his clients - one account that reaches every
          market the platform runs - with the brokerage's own film and a plain view of the four
          things a client can do. Public wording: "Comp Report", never "CMA". */}
      {/* Two full folds (Tim, 28 Sep 2026): the film and the promise on the first, the four
          things a client can do on the second. "The machine behind every marketplace" was
          removed to make room. */}
      <section id="the-market" className="scroll-mt-20">
        <div className="min-h-[100svh] flex flex-col justify-center py-16 md:py-20">
        <div className="max-w-[1200px] w-full mx-auto px-6 md:px-10 lg:px-16">
          <SectionHeader
            eyebrow="Founding broker · The Market"
            lead="One account."
            accent="Every market."
            sub="Tim is the founding broker of The Market, the brokerage built on the platform behind every marketplace below. His clients are not limited to what happens to be listed: they reach every home in every market it runs."
          />

          <div className="grid lg:grid-cols-[1.35fr_1fr] gap-8 lg:gap-12 items-center mt-10 lg:mt-12">
            <Reveal>
              <MarketFilm />
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-sm md:text-base text-white/50 leading-relaxed">
                Most buyers see the homes a portal shows them, and most owners find out what their
                home is worth by moving out and listing it. The Market turns both around: every
                home is open to a written offer, listed or not, and every owner can test a price
                without a sign, a showing or a public record.
              </p>
              <p className="mt2-serif text-lg md:text-2xl text-white mt-5 md:mt-6">
                One free account, with Tim as your broker, opens all of it.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <a href="https://themarketbrokerage.com" target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 rounded-full bg-white text-black px-5 py-2.5 text-sm font-medium hover:bg-white/90 transition-colors">
                  Visit The Market <ArrowUpRight size={16} />
                </a>
                <a href="#work-with-tim"
                   className="inline-flex items-center gap-2 rounded-full border border-white/20 text-white px-5 py-2.5 text-sm hover:border-white/50 transition-colors">
                  Work with Tim <ArrowRight size={16} />
                </a>
              </div>
            </Reveal>
          </div>

        </div>
        </div>

        {/* Buyer and seller, on a light band in the McMullen blue (Tim, 28 Sep 2026). */}
        <div className="bg-[#EEF2F9] text-[#1a1f2e]">
          <BuyerFold />
          <SellerFold />
        </div>
      </section>

      {/* --------------------------- SIGNATURE SALES ------------------------ */}
      <section id="sales" className="py-16 md:py-24 scroll-mt-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
          <SectionHeader
            eyebrow="Signature sales"
            lead="Featured"
            accent="transactions."
            sub="From lakefront Tahoe estates to Melbourne penthouses — five sales that define the track record."
          />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 mt-12">
            {SALES.map((s, i) => (
              <Reveal key={s.name} delay={0.08 * i} className={s.span}>
                <a
                  href={s.href}
                  className={`group relative block rounded-3xl bg-[#141414] border border-white/10 overflow-hidden ${s.aspect} h-full min-h-[260px]`}
                >
                  <img
                    src={s.image}
                    alt={s.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 opacity-20 mix-blend-multiply pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '4px 4px' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute inset-0 bg-[#0a0a0a]/70 backdrop-blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white text-[#0a0a0a] px-6 py-3 text-sm font-medium">
                      View — <span className="mt2-serif">{s.name}</span>
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between gap-3">
                    <div>
                      <h3 className="mt2-serif text-xl md:text-2xl text-white">{s.name}</h3>
                      <p className="text-[11px] uppercase tracking-[0.25em] text-white/60 mt-1.5">{s.meta}</p>
                    </div>
                    <ArrowUpRight size={20} className="text-white/50 group-hover:text-white transition-colors shrink-0" />
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- FOUR SEASONS -------------------------- */}
      <section id="four-seasons" className="py-16 md:py-24 scroll-mt-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="lg:sticky lg:top-28">
              <SectionHeader
                eyebrow="706 Mission St · San Francisco"
                lead="Four Seasons"
                accent="Private Residences."
              />
              <Reveal delay={0.1}>
                <p className="text-sm md:text-base text-white/50 mt-6 leading-relaxed max-w-lg">
                  Sales executive on the launch team of San Francisco's $1.2B Four Seasons Private
                  Residences — a landmark pairing of the historic Aronson Building with a new
                  luxury tower above Mission Street. Negotiated a record $3,000-per-square-foot
                  sale and wrote $18M in contracts in a single week.
                </p>
                <div className="grid grid-cols-3 gap-8 mt-10">
                  <div>
                    <div className="mt2-serif text-3xl md:text-4xl text-white">$1.2B</div>
                    <div className="text-[11px] text-white/40 mt-2 uppercase tracking-[0.15em]">development</div>
                  </div>
                  <div>
                    <div className="mt2-serif text-3xl md:text-4xl text-white">$3,000</div>
                    <div className="text-[11px] text-white/40 mt-2 uppercase tracking-[0.15em]">per-sq-ft record</div>
                  </div>
                  <div>
                    <div className="mt2-serif text-3xl md:text-4xl text-white">$18M</div>
                    <div className="text-[11px] text-white/40 mt-2 uppercase tracking-[0.15em]">one week</div>
                  </div>
                </div>
                <a
                  href="https://706sf.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-10 rounded-full text-sm px-7 py-3.5 border-2 border-white/15 text-white hover:border-white/40 hover:scale-105 transition-all"
                >
                  Visit 706sf.com <ArrowRight size={16} className="-rotate-45" />
                </a>
              </Reveal>
            </div>
            <div className="grid grid-cols-2 gap-4 auto-rows-[200px] md:auto-rows-[240px]">
              {FS_IMAGES.map((img, i) => (
                <Reveal key={img.src} delay={0.08 * i} className={img.span}>
                  <div className="group relative w-full h-full rounded-3xl overflow-hidden border border-white/10">
                    <img
                      src={img.src}
                      alt={img.alt}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Behind the scenes marquee */}
          <Reveal className="mt-16 md:mt-20">
            <div className="flex items-center gap-3 mb-8">
              <span className="w-8 h-px bg-white/15" />
              <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                Behind the scenes · On the launch team
              </span>
            </div>
          </Reveal>
        </div>
        <div
          className="mt2-marquee-wrap relative overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
          }}
        >
          <div className="mt2-marquee-slow flex w-max gap-5 px-5">
            {[...FS_BTS, ...FS_BTS].map((item, i) => (
              <div
                key={`${item.src}-${i}`}
                className="relative h-[260px] md:h-[340px] rounded-2xl overflow-hidden border border-white/10 shrink-0"
              >
                {item.type === 'video' ? (
                  <video
                    src={item.src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-auto object-cover"
                  />
                ) : (
                  <img src={item.src} alt="Four Seasons launch — behind the scenes" loading="lazy" className="h-full w-auto object-cover" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ FOOTBALL ---------------------------- */}
      <section className="py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 aspect-[4/5] max-h-[560px]">
                <img
                  src={OSU_IMAGE}
                  alt="Tim McMullen punting for Oregon State University"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="flex items-center gap-3 mb-5">
                <span className="w-8 h-px bg-white/15" />
                <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                  Oregon State University · Division I football
                </span>
              </div>
              <h2 className="text-3xl md:text-5xl leading-tight text-white/95">
                8,000+ miles away from home.{' '}
                <span className="mt2-serif text-white">Here to compete, here to win.</span>
              </h2>
              <p className="text-sm md:text-base text-white/50 mt-5 leading-relaxed max-w-xl">
                At 19, Tim left Melbourne, Australia to punt in the PAC-12 — four seasons at the
                highest level of collegiate athletics. When you've performed in front of 50,000
                people, a real estate negotiation feels a little less intimidating.
              </p>
              <div className="flex gap-10 mt-8">
                <div>
                  <div className="mt2-serif text-3xl text-white">4</div>
                  <div className="text-[11px] text-white/40 mt-1 uppercase tracking-[0.15em]">seasons</div>
                </div>
                <div>
                  <div className="mt2-serif text-3xl text-white">8,000+</div>
                  <div className="text-[11px] text-white/40 mt-1 uppercase tracking-[0.15em]">miles from home</div>
                </div>
                <div>
                  <div className="mt2-serif text-3xl text-white">PAC-12</div>
                  <div className="text-[11px] text-white/40 mt-1 uppercase tracking-[0.15em]">conference</div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------------------- WORK WITH TIM ------------------------- */}
      <section id="work-with-tim" className="py-16 md:py-24 scroll-mt-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
          <div className="rounded-[2.5rem] bg-[#141414] border border-white/10 p-8 md:p-14 grid lg:grid-cols-[minmax(0,380px)_1fr] gap-10 md:gap-14 items-center">
            <Reveal>
              <div className="relative rounded-[2rem] overflow-hidden border border-white/10 aspect-square max-w-[380px] mx-auto lg:mx-0">
                <img
                  src="/meet-tim/tim-headshot.jpg"
                  alt="Tim McMullen"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="flex items-center gap-3 mb-5">
                <span className="w-8 h-px bg-white/15" />
                <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">Work with Tim</span>
              </div>
              <h2 className="text-3xl md:text-5xl leading-tight text-white/95">
                One agent. <span className="mt2-serif text-white">The whole machine.</span>
              </h2>
              <p className="text-sm md:text-base text-white/50 mt-5 leading-relaxed max-w-xl">
                Every marketplace, dataset, and system on this page works for you the moment we
                start. Do the analysis with the tools — then hire Tim for the licensed work that
                actually needs a professional: strategy, negotiation, and the transaction itself.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-9">
                <a
                  href="sms:+14156919272"
                  className="inline-flex items-center gap-3 rounded-full bg-white text-[#0a0a0a] pl-2 pr-6 py-2 text-sm font-medium hover:scale-105 transition-transform"
                >
                  <img
                    src="/meet-tim/tim-headshot.jpg"
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  Start a chat with Tim
                </a>
                <a
                  href="mailto:tim@mcmullen.properties"
                  className="inline-flex items-center justify-center rounded-full text-sm px-7 py-3.5 border-2 border-white/15 text-white hover:border-white/40 hover:scale-105 transition-all"
                >
                  tim@mcmullen.properties
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------- FOOTER ----------------------------- */}
      <footer className="pt-10 pb-10 overflow-hidden">
        <div className="whitespace-nowrap mb-12">
          <div className="mt2-marquee inline-flex w-max">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className="mt2-serif text-4xl md:text-6xl text-white/10 mx-6">
                Building the future of real estate •
              </span>
            ))}
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16 flex flex-col md:flex-row items-center justify-between gap-6">
          <a
            href="mailto:tim@mcmullen.properties"
            className="rounded-full text-sm px-7 py-3.5 bg-white text-[#0a0a0a] font-medium hover:scale-105 transition-transform"
          >
            tim@mcmullen.properties
          </a>
          <div className="flex items-center gap-6 text-xs text-white/40">
            <a href="tel:+14156919272" className="hover:text-white transition-colors">
              (415) 691-9272
            </a>
            <a href="/home" className="hover:text-white transition-colors">
              mcmullenresidential.com
            </a>
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Available for clients
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
