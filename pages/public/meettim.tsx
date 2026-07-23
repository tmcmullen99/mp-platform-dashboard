// McMullen Properties — /meet-tim
// Dedicated page replacing CorePage slug="about". Motionsites aesthetic:
// rounded video hero card + floating in-hero navbar + seamless pure-CSS
// marketplace marquee + interactive showcase grid. Zero new dependencies —
// animations are CSS keyframes + the same IntersectionObserver Reveal
// pattern CorePage uses, so package.json is untouched and the Cloudflare
// build is unaffected.
//
// EDIT ME: the MARKETPLACES array below is the single source of truth for
// the marquee and the showcase grid. Images live in the repo at
// public/meet-tim/*.jpg (Tim's live-site screenshots, web-optimized); if one
// ever fails to load the card auto-falls-back to a branded gradient monogram.

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronRight } from 'lucide-react'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'

/* ------------------------------- data ------------------------------------ */

type Marketplace = {
  name: string
  tagline: string
  url: string
  /** Hero image URL — replace with each site's real hero/OG image. */
  image: string
  /** Two-stop gradient used for hover glow + image fallback. Brand-safe only. */
  gradient: [string, string]
  stat: string
  monogram: string
}

const MARKETPLACES: Marketplace[] = [
  {
    name: 'San Francisco Condo Market',
    tagline: 'Building-by-building owner marketplace for the city',
    url: 'https://sanfranciscocondomarket.com',
    image: '/meet-tim/condo-sf.jpg',
    gradient: ['#1a1f2e', '#1d4ed8'],
    stat: '142 buildings · 12,183 units',
    monogram: 'SF',
  },
  {
    name: 'Silicon Valley Condo Market',
    tagline: 'The same engine, pointed at the Valley',
    url: 'https://siliconvalleycondomarket.com', // VERIFY domain before ship
    image: '/meet-tim/condo-sv.jpg',
    gradient: ['#1d4ed8', '#91a1ba'],
    stat: '97 buildings · 6,011 units',
    monogram: 'SV',
  },
  {
    name: 'Eichler Market',
    tagline: 'A marketplace for an architecture, not a zip code',
    url: 'https://eichlermarket.com',
    image: '/meet-tim/eichler.jpg',
    gradient: ['#1f7a4d', '#1a1f2e'],
    stat: '1,768 homes · 54 tracts',
    monogram: 'EM',
  },
  {
    name: 'Campbell Real Estate Market',
    tagline: 'The complete public record of a city’s housing',
    url: 'https://campbellrealestatemarket.com',
    image: '/meet-tim/campbell.jpg',
    gradient: ['#91a1ba', '#1a1f2e'],
    stat: '6,609 homes · 105 tracts',
    monogram: 'CB',
  },
  {
    name: 'Los Gatos Real Estate Market',
    tagline: 'Neighborhood intelligence, published',
    url: 'https://losgatosrealestatemarket.com',
    image: '/meet-tim/los-gatos.jpg',
    gradient: ['#1a1f2e', '#1f7a4d'],
    stat: '7,989 homes · 129 tracts',
    monogram: 'LG',
  },
  {
    name: 'Saratoga Real Estate Market',
    tagline: 'Dataset to live production in one working day',
    url: 'https://saratogarealestatemarket.com',
    image: '/meet-tim/saratoga.jpg',
    gradient: ['#1d4ed8', '#1a1f2e'],
    stat: '5,973 homes · 92 tracts',
    monogram: 'SG',
  },
]

const RECORD_STATS: { value: string; label: string }[] = [
  { value: '6', label: 'live marketplaces on two shared engines' },
  { value: '23,000+', label: 'indexed pages of published housing record' },
  { value: '17,000+', label: 'normalized, geocoded sales in the data spine' },
  { value: '1 day', label: 'to launch a complete city marketplace' },
]

const PILLARS: { title: string; blurb: string }[] = [
  {
    title: 'You drive the data',
    blurb:
      'Comps, valuations, market intelligence, offer strategy — self-serve, institutional-grade, free. The analysis an agent used to keep in their head is a tool in your hands.',
  },
  {
    title: 'The tools won’t lie to you',
    blurb:
      'Every number is anchored to a named source. Estimates are labeled as estimates. When the record genuinely lacks a figure, the system says so — it never invents one.',
  },
  {
    title: 'You pay for what needs a professional',
    blurb:
      'Market access, buyer-targeting reach, negotiation, transaction management. Hire the licensed work — not a mandatory middleman for the parts software already did.',
  },
]

/* --------------------------- reveal utilities ---------------------------- */

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && setInView(true)),
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
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
        transform: inView ? 'none' : 'translateY(24px)',
        transition: `opacity .7s ease-out ${delay}s, transform .7s ease-out ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

/* ------------------------- marketplace visuals --------------------------- */

/** Hero image with graceful branded-gradient fallback (never a broken img). */
function MarketImage({ m, className }: { m: Marketplace; className: string }) {
  const [failed, setFailed] = useState(false)
  if (failed || !m.image) {
    return (
      <div
        className={`${className} flex items-center justify-center`}
        style={{ background: `linear-gradient(135deg, ${m.gradient[0]}, ${m.gradient[1]})` }}
      >
        <span className="font-display text-white/80 text-2xl tracking-tight">{m.monogram}</span>
      </div>
    )
  }
  return (
    <img
      src={m.image}
      alt={m.name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} object-cover`}
    />
  )
}

/** Marquee pill card — the spec's logo-card geometry, carrying a market. */
function MarqueeCard({ m }: { m: Marketplace }) {
  return (
    <a
      href={m.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative h-24 w-52 shrink-0 flex items-center justify-center rounded-full bg-white border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all overflow-hidden"
      aria-label={m.name}
    >
      <div
        className="absolute inset-0 scale-150 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500"
        style={{ background: `linear-gradient(135deg, ${m.gradient[0]}22, ${m.gradient[1]}33)` }}
      />
      <div className="relative z-10 flex items-center gap-3 px-5">
        <MarketImage m={m} className="h-12 w-12 rounded-full border border-slate-200/60" />
        <div className="text-left">
          <div className="text-[12px] font-semibold text-ink leading-tight">{m.name}</div>
          <div className="text-[10px] text-ink-400 leading-tight mt-0.5">{m.stat}</div>
        </div>
      </div>
    </a>
  )
}

/* --------------------------------- page ---------------------------------- */

export default function MeetTim() {
  return (
    <div className="min-h-screen bg-[#f9fafb] font-sans text-ink">
      <style>{`
        @keyframes mt-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .mt-marquee-track { animation: mt-marquee 45s linear infinite; }
        .mt-marquee:hover .mt-marquee-track { animation-play-state: paused; }
        @keyframes mt-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        .mt-rise { animation: mt-rise .8s ease-out both; }
      `}</style>

      <PublicNav active="about" />

      {/* ------------------------------ HERO ------------------------------ */}
      <section className="px-4 pt-6">
        <div className="relative w-full max-w-[1400px] mx-auto rounded-[48px] bg-white border border-slate-200/50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.03)] overflow-hidden h-[600px] flex flex-col">
          {/* video background layer */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(160deg, #f5f6f8 0%, #e8eaef 60%, #cbd0db 100%)' }}
            />
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover scale-105 transition-transform duration-1000"
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260505_101331_74f9b798-3f00-4e86-8a01-377aa16ffeaa.mp4"
            />
          </div>

          {/* hero copy */}
          <div className="relative z-20 flex-1 px-8 md:px-16 pt-12 md:pt-16 flex flex-col items-start">
            <div className="mt-rise" style={{ animationDelay: '.05s' }}>
              <p className="text-2xs uppercase tracking-widest text-ink-500 font-semibold">
                Tim McMullen · McMullen Properties · CA DRE #02016832
              </p>
            </div>
            <h1
              className="mt-rise font-display font-medium tracking-tight text-[42px] md:text-[56px] leading-[1.05] text-[#0a1b33] mt-4"
              style={{ animationDelay: '.15s' }}
            >
              The agent who built
              <br />
              the machine
            </h1>
            <p
              className="mt-rise text-[14px] md:text-[15px] text-[#64748b] max-w-xl mt-5 leading-relaxed"
              style={{ animationDelay: '.28s' }}
            >
              Six live real estate marketplaces. A complete published housing record for entire
              cities. Client tools that do the analysis an agent used to gatekeep. All designed,
              built, and operated by one person — so you can drive, and hire the professional only
              for the parts that genuinely need one.
            </p>
            <div className="mt-rise mt-8" style={{ animationDelay: '.4s' }}>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 bg-[#0a152d] text-white px-7 py-3 rounded-full text-[13px] font-semibold hover:scale-[1.04] active:scale-[0.98] transition-transform"
              >
                Contact Tim
              </a>
            </div>
          </div>

          {/* floating bottom navbar */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 mt-rise" style={{ animationDelay: '.55s' }}>
            <nav className="flex items-center bg-white/90 backdrop-blur-2xl px-1.5 py-1.5 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-slate-200/40">
              <div className="w-9 h-9 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center mr-1 text-ink">
                ✦
              </div>
              <a href="#marketplaces" className="px-4 py-2 text-[12px] font-semibold text-slate-500 hover:text-[#0a1b33] transition-colors">
                Marketplaces
              </a>
              <a href="#platform" className="px-4 py-2 text-[12px] font-semibold text-slate-500 hover:text-[#0a1b33] transition-colors">
                Platform
              </a>
              <a
                href="#contact"
                className="ml-1 inline-flex items-center gap-1 bg-white px-5 py-2 rounded-full text-[12px] font-semibold text-[#0a1b33] border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all"
              >
                Get in touch <ChevronRight size={14} />
              </a>
            </nav>
          </div>
        </div>
      </section>

      {/* ------------------------- MARQUEE SCROLLER ------------------------ */}
      <section className="mt-10">
        <div
          className="mt-marquee relative max-w-[1400px] mx-auto overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          }}
        >
          <div className="mt-marquee-track flex w-max gap-5 py-2">
            {[...MARKETPLACES, ...MARKETPLACES].map((m, i) => (
              <MarqueeCard key={`${m.name}-${i}`} m={m} />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------ SHOWCASE GRID ---------------------------- */}
      <section id="marketplaces" className="max-w-[1200px] mx-auto px-6 md:px-8 pt-24 pb-8 scroll-mt-24">
        <Reveal>
          <p className="text-2xs uppercase tracking-widest text-ink-400 font-semibold">The marketplaces</p>
          <h2 className="font-display text-3xl md:text-[40px] tracking-tight text-ink mt-3 max-w-2xl">
            Six markets. Two engines. One operator.
          </h2>
          <p className="text-[15px] text-ink-500 mt-4 max-w-2xl leading-relaxed">
            These aren’t listing pages — they’re owner-side marketplaces and complete city records:
            every building, every street, every verified sale, published and free. Click through;
            everything is live.
          </p>
        </Reveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {MARKETPLACES.map((m, i) => (
            <Reveal key={m.name} delay={0.06 * i}>
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-3xl bg-white border border-slate-200/60 shadow-sm hover:shadow-[0_24px_60px_-20px_rgba(26,31,46,0.18)] hover:border-slate-300 transition-all overflow-hidden"
              >
                <div className="relative h-44 overflow-hidden">
                  <MarketImage m={m} className="w-full h-full transition-transform duration-700 group-hover:scale-105" />
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `linear-gradient(to top, ${m.gradient[0]}cc 0%, transparent 55%)` }}
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg text-ink tracking-tight">{m.name}</h3>
                    <ArrowUpRight size={18} className="text-ink-300 group-hover:text-ink transition-colors shrink-0 mt-1" />
                  </div>
                  <p className="text-[13px] text-ink-500 mt-2 leading-relaxed">{m.tagline}</p>
                  <p className="text-2xs uppercase tracking-widest text-ink-400 font-semibold mt-4">{m.stat}</p>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* --------------------------- RECORD BAND --------------------------- */}
      <section className="max-w-[1200px] mx-auto px-6 md:px-8 py-16">
        <Reveal>
          <div className="rounded-[40px] bg-ink text-white px-8 md:px-14 py-12 grid grid-cols-2 lg:grid-cols-4 gap-10">
            {RECORD_STATS.map(s => (
              <div key={s.label}>
                <div className="font-display text-3xl md:text-4xl tracking-tight">{s.value}</div>
                <div className="text-[12px] text-white/60 mt-2 leading-relaxed">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* --------------------------- PLATFORM ------------------------------ */}
      <section id="platform" className="max-w-[1200px] mx-auto px-6 md:px-8 py-12 scroll-mt-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <Reveal>
            <p className="text-2xs uppercase tracking-widest text-ink-400 font-semibold">The thesis</p>
            <h2 className="font-display text-3xl md:text-[40px] tracking-tight text-ink mt-3">
              The last decade empowered agents.
              <br />
              This one empowers you.
            </h2>
            <p className="text-[15px] text-ink-500 mt-5 leading-relaxed">
              Most of what a client pays an agent for is analysis — and analysis can be software.
              Behind these marketplaces sits one platform: the data spine, the outreach engine
              with human-approved sends and hard caps, the client portals, and the deliverables
              that show their math. The agent’s job gets narrower and more honest: the licensed
              work of the transaction itself, priced like a remainder, not like the whole bundle.
            </p>
          </Reveal>
          <div className="space-y-5">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={0.08 * i}>
                <div className="rounded-3xl bg-white border border-slate-200/60 shadow-sm p-7">
                  <h3 className="font-display text-lg text-ink tracking-tight">{p.title}</h3>
                  <p className="text-[13px] text-ink-500 mt-2 leading-relaxed">{p.blurb}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- CONTACT ------------------------------ */}
      <section id="contact" className="max-w-[1200px] mx-auto px-6 md:px-8 py-20 scroll-mt-24">
        <Reveal>
          <div className="rounded-[40px] bg-white border border-slate-200/60 shadow-sm px-8 md:px-14 py-14 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight text-ink">
                Ready to drive?
              </h2>
              <p className="text-[14px] text-ink-500 mt-3 max-w-lg leading-relaxed">
                Start with the tools — they’re free. When you’re ready for the licensed work,
                Tim is one message away.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <a
                href="mailto:tim@mcmullen.properties"
                className="inline-flex items-center justify-center gap-2 bg-[#0a152d] text-white px-7 py-3.5 rounded-full text-[13px] font-semibold hover:scale-[1.03] transition-transform"
              >
                tim@mcmullen.properties
              </a>
              <a
                href="/tools"
                className="inline-flex items-center justify-center gap-1 bg-white px-7 py-3.5 rounded-full text-[13px] font-semibold text-[#0a1b33] border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all"
              >
                Explore the tools <ChevronRight size={14} />
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      <PublicFooter />
    </div>
  )
}
