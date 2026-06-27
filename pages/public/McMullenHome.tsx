// McMullen Properties — public homepage.
// Route: "/" (and "/home") served BEFORE the auth gate. No authentication.
//
// Visual direction: the motionsites / "Viktor Oddy" aesthetic — white canvas,
// serif display accents (Playfair Display) over a clean sans (DM Sans), an
// infinite photo marquee, layered-shadow pill buttons, and staggered scroll
// reveals. Content is data-driven from public.site_home_content (one JSONB row
// per tenant), so the future admin CRUD edits the page without code changes.
//
// This page is intentionally self-contained: it does NOT use PublicLayout
// (that chrome is the platform's navy/cream system, a different visual language).

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowUpRight, Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react'
import { LogoWordmark, LogoMark } from '@/components/BrandLogo'

const MCMULLEN_TENANT_ID = 'e0c8abe7-cc29-45c0-99c1-7c20b920262a'

/* ----------------------------- content types ----------------------------- */
type CTA = { label: string; href: string }
type Fact = { k: string; v: string }
type StatItem = { value: string; label: string }

type HomeContent = {
  hero: {
    eyebrow: string
    headline_lead: string
    headline_accent: string
    headline_tail: string
    subhead: string
    primary_cta: CTA
    secondary_cta: CTA
  }
  stats: StatItem[]
  press: string[]
  marquee: string[]
  active_listing: {
    badge: string
    name: string
    location: string
    price: string
    hoa: string
    facts: Fact[]
    blurb: string
    href: string
    image: string
  }
  record_sale: {
    badge: string
    headline: string
    subhead: string
    address: string
    stats: StatItem[]
    image: string
    quote: string
    href: string
  }
  services: { title: string; blurb: string; cta: string; href: string }[]
  sold: { address: string; price: string; beds: string; baths: string; area: string; href: string }[]
  testimonials: { quote: string; name: string; role: string }[]
  agent: {
    name: string
    dre: string
    phone: string
    phone_href: string
    email: string
    photo: string
    schedule_href: string
    youtube: string
    whatsapp: string
    brokerage: string
  }
}

/* --------------------------- scroll-reveal hook --------------------------- */
function useInView<T extends HTMLElement>(threshold = 0.12) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true)
            io.unobserve(e.target)
          }
        })
      },
      { threshold }
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
        transform: inView ? 'none' : 'translateY(28px)',
        transition: `opacity .8s ease-out ${delay}s, transform .8s ease-out ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

/* -------------------------------- buttons -------------------------------- */
const PRIMARY_SHADOW =
  '0 1px 2px 0 rgba(13,27,42,0.10), 0 4px 4px 0 rgba(13,27,42,0.09), 0 9px 6px 0 rgba(13,27,42,0.05), 0 17px 7px 0 rgba(13,27,42,0.01), inset 0 2px 8px 0 rgba(255,255,255,0.30)'
const SECONDARY_SHADOW =
  '0 0 0 0.5px rgba(0,0,0,0.06), 0 4px 30px rgba(0,0,0,0.08)'

function PillButton({
  href,
  children,
  variant = 'primary',
}: {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}) {
  const primary = variant === 'primary'
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D1B2A]"
      style={
        primary
          ? { background: '#0D1B2A', color: '#fff', boxShadow: PRIMARY_SHADOW }
          : { background: '#fff', color: '#0D1B2A', boxShadow: SECONDARY_SHADOW }
      }
    >
      {children}
    </a>
  )
}

/* --------------------------------- page ---------------------------------- */
export default function McMullenHome() {
  const [content, setContent] = useState<HomeContent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('site_home_content')
        .select('content')
        .eq('tenant_id', MCMULLEN_TENANT_ID)
        .eq('published', true)
        .maybeSingle()
      if (cancelled) return
      setContent((data?.content as HomeContent) ?? null)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-[#273C46]">
          McMullen Properties
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6 text-center">
        <div>
          <div className="font-serif text-3xl text-[#0D1B2A] mb-3">McMullen Properties</div>
          <p className="text-[#273C46]">The site is being updated. Please check back shortly.</p>
        </div>
      </div>
    )
  }

  const c = content
  const marquee = [...c.marquee, ...c.marquee] // duplicate for seamless loop

  return (
    <div className="mp-home min-h-screen bg-white text-[#0D1B2A]">
      {/* scoped styles: serif accents, marquee, mono utility — no global leakage */}
      <style>{`
        .mp-home { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
        .mp-serif { font-family: 'Playfair Display', Georgia, serif; font-style: italic; letter-spacing: -0.02em; }
        .mp-mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
        @keyframes mpMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .mp-marquee-track { display: flex; width: max-content; animation: mpMarquee 40s linear infinite; }
        @media (max-width: 768px) { .mp-marquee-track { animation-duration: 18s; } }
        @media (prefers-reduced-motion: reduce) { .mp-marquee-track { animation: none; } }
      `}</style>

      {/* ============================== HEADER ============================== */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center text-[#0D1B2A] hover:opacity-80 transition-opacity" aria-label="McMullen Properties — home">
            <LogoWordmark height={20} />
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm text-[#273C46]">
            <a href="/listings" className="hover:text-[#0D1B2A] transition-colors">Portfolio</a>
            <a href="/buy" className="hover:text-[#0D1B2A] transition-colors">Buy</a>
            <a href="/sell" className="hover:text-[#0D1B2A] transition-colors">Sell</a>
            <a href="/services" className="hover:text-[#0D1B2A] transition-colors">Services</a>
          </nav>
          <a
            href={c.agent.phone_href}
            className="text-sm font-medium text-[#0D1B2A] hover:opacity-70 transition-opacity"
          >
            {c.agent.phone}
          </a>
        </div>
      </header>

      {/* =============================== HERO =============================== */}
      <section className="max-w-3xl mx-auto px-6 pt-16 md:pt-24 pb-4 text-center">
        <Reveal delay={0.1}>
          <div className="mp-mono text-xs uppercase tracking-[0.25em] text-[#273C46] mb-6">
            {c.hero.eyebrow}
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <h1 className="text-[40px] md:text-[64px] lg:text-[72px] leading-[1.05] font-semibold tracking-tight">
            {c.hero.headline_lead}{' '}
            <span className="mp-serif font-normal text-[#0D1B2A]">{c.hero.headline_accent}</span>{' '}
            {c.hero.headline_tail}
          </h1>
        </Reveal>
        <Reveal delay={0.35}>
          <p className="mt-6 text-lg md:text-xl text-[#273C46] leading-relaxed max-w-xl mx-auto">
            {c.hero.subhead}
          </p>
        </Reveal>
        <Reveal delay={0.5}>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <PillButton href={c.hero.primary_cta.href}>{c.hero.primary_cta.label}</PillButton>
            <PillButton href={c.hero.secondary_cta.href} variant="secondary">
              {c.hero.secondary_cta.label}
            </PillButton>
          </div>
        </Reveal>

        {/* stat bar */}
        <Reveal delay={0.65}>
          <div className="mt-16 flex items-stretch justify-center divide-x divide-black/10">
            {c.stats.map((s) => (
              <div key={s.label} className="px-7 md:px-10">
                <div className="text-3xl md:text-4xl font-semibold tracking-tight">
                  {s.value}
                </div>
                <div className="mp-mono text-[10px] md:text-xs uppercase tracking-[0.18em] text-[#273C46] mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* press row */}
        <Reveal delay={0.75}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <span className="mp-mono text-[10px] uppercase tracking-[0.25em] text-[#273C46]/60">
              As seen in
            </span>
            {c.press.map((p) => (
              <span key={p} className="text-sm font-medium text-[#273C46]/70">
                {p}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ============================= MARQUEE ============================= */}
      <section className="mt-16 md:mt-20 mb-20 overflow-hidden">
        <div className="mp-marquee-track">
          {marquee.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              className="h-[260px] md:h-[440px] w-auto object-cover mx-3 rounded-2xl shadow-lg"
            />
          ))}
        </div>
      </section>

      {/* ========================= ACTIVE LISTING ========================= */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <Reveal>
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <a href={c.active_listing.href} className="block group">
              <div className="overflow-hidden rounded-[28px] shadow-xl">
                <img
                  src={c.active_listing.image}
                  alt={c.active_listing.name}
                  className="w-full h-[320px] md:h-[460px] object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              </div>
            </a>
            <div>
              <div className="mp-mono text-xs uppercase tracking-[0.2em] text-[#273C46] mb-4">
                {c.active_listing.badge}
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                {c.active_listing.name}
              </h2>
              <p className="text-[#273C46] mt-2">{c.active_listing.location}</p>
              <div className="flex items-baseline gap-4 mt-5">
                <span className="mp-serif text-4xl font-semibold not-italic text-[#0D1B2A]">
                  {c.active_listing.price}
                </span>
                <span className="text-sm text-[#273C46]">{c.active_listing.hoa}</span>
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-2 mt-5">
                {c.active_listing.facts.map((f) => (
                  <div key={f.k}>
                    <div className="text-xl font-semibold">{f.v}</div>
                    <div className="mp-mono text-[10px] uppercase tracking-[0.15em] text-[#273C46]">
                      {f.k}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[#273C46] leading-relaxed mt-6">{c.active_listing.blurb}</p>
              <div className="mt-7">
                <PillButton href={c.active_listing.href}>View full listing</PillButton>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* =========================== RECORD SALE =========================== */}
      <section className="bg-[#0D1B2A] text-white py-20 md:py-28 mt-12">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] text-white/55 mb-5">
              {c.record_sale.badge}
            </div>
            <h2 className="text-[40px] md:text-[56px] leading-[1.05] font-semibold tracking-tight">
              Sold for{' '}
              <span className="mp-serif font-normal">
                {c.record_sale.headline.replace('Sold for ', '')}
              </span>
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mt-5 max-w-2xl">
              {c.record_sale.subhead}
            </p>
            <p className="mp-mono text-xs uppercase tracking-[0.18em] text-white/45 mt-4">
              {c.record_sale.address}
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-10 overflow-hidden rounded-[28px] shadow-2xl">
              <img
                src={c.record_sale.image}
                alt={c.record_sale.address}
                className="w-full h-[300px] md:h-[480px] object-cover"
              />
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
              {c.record_sale.stats.map((s) => (
                <div key={s.label}>
                  <div className="mp-serif text-3xl md:text-4xl font-semibold not-italic">
                    {s.value}
                  </div>
                  <div className="mp-mono text-[10px] uppercase tracking-[0.16em] text-white/55 mt-1">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.35}>
            <blockquote className="mt-12 border-l-2 border-white/25 pl-6 max-w-2xl">
              <p className="text-lg md:text-xl leading-relaxed text-white/85">
                &ldquo;{c.record_sale.quote}&rdquo;
              </p>
              <footer className="mp-mono text-xs uppercase tracking-[0.18em] text-white/50 mt-4">
                Tim McMullen · DRE #{c.agent.dre}
              </footer>
            </blockquote>
          </Reveal>

          <Reveal delay={0.45}>
            <div className="mt-9">
              <a
                href={c.record_sale.href}
                className="inline-flex items-center gap-2 text-sm font-medium text-white hover:gap-3 transition-all"
              >
                See the full sale story <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================= SERVICES ============================= */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46] mb-3">
            Elite representation
          </div>
          <h2 className="text-[36px] md:text-[52px] leading-[1.05] font-semibold tracking-tight">
            One agent. <span className="mp-serif font-normal">Every solution.</span>
          </h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {c.services.map((s, i) => (
            <Reveal key={s.title} delay={0.05 * i}>
              <a
                href={s.href}
                className="group block h-full rounded-[28px] border border-black/[0.07] p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_-20px_rgba(13,27,42,0.30)] bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-semibold tracking-tight">{s.title}</h3>
                  <ArrowUpRight className="w-5 h-5 text-[#273C46] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <p className="text-[#273C46] leading-relaxed mt-3 text-sm">{s.blurb}</p>
                <span className="mp-mono text-[11px] uppercase tracking-[0.16em] text-[#0D1B2A] mt-5 inline-block">
                  {s.cta} &rarr;
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* =========================== SOLD GRID =========================== */}
      <section className="bg-[#FAFAF7] py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46] mb-3">
              Track record
            </div>
            <h2 className="text-[36px] md:text-[52px] leading-[1.05] font-semibold tracking-tight">
              <span className="mp-serif font-normal">$100M+</span> across the Bay Area
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
            {c.sold.map((s, i) => (
              <Reveal key={s.address + i} delay={0.04 * i}>
                <a
                  href={s.href}
                  className="group block rounded-2xl bg-white border border-black/[0.06] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-22px_rgba(13,27,42,0.30)]"
                >
                  <div className="mp-mono text-[10px] uppercase tracking-[0.16em] text-[#273C46]/70">
                    Sold · {s.area}
                  </div>
                  <div className="mp-serif text-2xl font-semibold not-italic text-[#0D1B2A] mt-2">
                    {s.price}
                  </div>
                  <div className="text-sm text-[#0D1B2A] mt-1">{s.address}</div>
                  <div className="text-xs text-[#273C46] mt-2">
                    {s.beds} bd · {s.baths} ba
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.2}>
            <div className="mt-10">
              <PillButton href="/listings" variant="secondary">
                See all sales
              </PillButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =========================== TESTIMONIALS =========================== */}
      <TestimonialCarousel testimonials={c.testimonials} />

      {/* =============================== CTA =============================== */}
      <section className="max-w-5xl mx-auto px-6 py-24 md:py-32 text-center">
        <Reveal>
          <img
            src={c.agent.photo}
            alt={c.agent.name}
            className="w-20 h-20 rounded-full object-cover mx-auto mb-8 shadow-lg"
          />
          <h2 className="text-[36px] md:text-[56px] leading-[1.05] font-semibold tracking-tight">
            Ready to make <span className="mp-serif font-normal">your move?</span>
          </h2>
          <p className="text-[#273C46] text-lg mt-5 max-w-xl mx-auto leading-relaxed">
            Whether you&rsquo;re buying, selling, investing, or improving — let&rsquo;s talk about how I
            can help you achieve your real estate goals.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <PillButton href={c.agent.schedule_href}>Schedule a call</PillButton>
            <PillButton href={c.agent.phone_href} variant="secondary">
              {c.agent.phone}
            </PillButton>
          </div>
        </Reveal>
      </section>

      {/* ============================== FOOTER ============================== */}
      <footer className="border-t border-black/[0.07] py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-10">
            <div className="max-w-sm">
              <div className="text-[#0D1B2A]"><LogoWordmark height={22} /></div>
              <p className="text-sm text-[#273C46] leading-relaxed mt-3">
                A decade of experience, now setting neighborhood price records in Silicon Valley&rsquo;s
                $5M SFR market.
              </p>
            </div>
            <div className="flex gap-14">
              <div>
                <div className="mp-mono text-[10px] uppercase tracking-[0.2em] text-[#273C46]/60 mb-3">
                  Explore
                </div>
                <ul className="space-y-2 text-sm">
                  <li><a href="/buy" className="hover:opacity-70 transition-opacity">Buy</a></li>
                  <li><a href="/sell" className="hover:opacity-70 transition-opacity">Sell</a></li>
                  <li><a href="/listings" className="hover:opacity-70 transition-opacity">Portfolio</a></li>
                </ul>
              </div>
              <div>
                <div className="mp-mono text-[10px] uppercase tracking-[0.2em] text-[#273C46]/60 mb-3">
                  Contact
                </div>
                <ul className="space-y-2 text-sm">
                  <li><a href={c.agent.phone_href} className="hover:opacity-70 transition-opacity">{c.agent.phone}</a></li>
                  <li><a href={`mailto:${c.agent.email}`} className="hover:opacity-70 transition-opacity">{c.agent.email}</a></li>
                  <li><a href={c.agent.youtube} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">YouTube</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-black/[0.06] flex flex-col md:flex-row justify-between gap-3 text-xs text-[#273C46]/70 leading-relaxed">
            <p className="max-w-3xl">{c.agent.brokerage} DRE #{c.agent.dre}.</p>
            <p className="shrink-0">© {new Date().getFullYear()} McMullen Properties</p>
          </div>
        </div>
      </footer>

      {/* ========================= FIXED BOTTOM NAV ========================= */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div
          className="flex items-center gap-3 bg-white rounded-full pl-6 pr-2 py-2"
          style={{ boxShadow: SECONDARY_SHADOW }}
        >
          <span className="text-[#0D1B2A] flex items-center"><LogoMark size={22} /></span>
          <a
            href={c.hero.secondary_cta.href}
            className="rounded-full px-5 py-2 text-sm font-medium text-white"
            style={{ background: '#0D1B2A', boxShadow: PRIMARY_SHADOW }}
          >
            Start a chat
          </a>
        </div>
      </div>
    </div>
  )
}

/* ---------------------- testimonial carousel (auto) ---------------------- */
function TestimonialCarousel({
  testimonials,
}: {
  testimonials: { quote: string; name: string; role: string }[]
}) {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = testimonials.length

  useEffect(() => {
    if (paused || n <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % n), 4000)
    return () => clearInterval(t)
  }, [paused, n])

  const go = (d: number) => setIdx((i) => (i + d + n) % n)

  return (
    <section
      className="bg-white py-20 md:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-end justify-between gap-6 mb-12">
          <h2 className="text-[32px] md:text-[48px] leading-[1.05] font-semibold tracking-tight">
            What <span className="mp-serif font-normal">people</span> say
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="w-4 h-4 fill-[#0D1B2A] text-[#0D1B2A]" />
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-black/[0.07] bg-white p-8 md:p-12 shadow-[0_4px_24px_rgba(0,0,0,0.05)] min-h-[260px] flex flex-col justify-between">
          <Quote className="w-8 h-8 text-[#0D1B2A]/20" />
          <p className="text-xl md:text-2xl leading-relaxed text-[#0D1B2A] mt-4">
            {testimonials[idx]?.quote}
          </p>
          <div className="mt-8">
            <div className="font-semibold text-sm">{testimonials[idx]?.name}</div>
            <div className="mp-mono text-[11px] uppercase tracking-[0.16em] text-[#273C46] mt-0.5">
              &rarr; {testimonials[idx]?.role}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-8">
          <div className="flex gap-1.5">
            {testimonials.map((_, i) => (
              <button
                key={i}
                aria-label={`Show testimonial ${i + 1}`}
                onClick={() => setIdx(i)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? 28 : 8,
                  background: i === idx ? '#0D1B2A' : 'rgba(13,27,42,0.2)',
                }}
              />
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => go(-1)}
              aria-label="Previous testimonial"
              className="w-11 h-11 rounded-full border border-[#0D1B2A]/20 flex items-center justify-center hover:bg-[#0D1B2A] hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next testimonial"
              className="w-11 h-11 rounded-full border border-[#0D1B2A]/20 flex items-center justify-center hover:bg-[#0D1B2A] hover:text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
