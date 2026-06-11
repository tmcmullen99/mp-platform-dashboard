// McMullen Properties — shared core marketing page renderer.
// Routes: /about, /buy, /sell, /services (no auth). Reads one row from
// public.site_core_pages by slug (anon-readable) and renders it in the
// motionsites aesthetic. One component drives all four pages, so adding a
// page is a data row, not new code.

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ArrowUpRight, Quote } from 'lucide-react'

const MCMULLEN_TENANT_ID = 'e0c8abe7-cc29-45c0-99c1-7c20b920262a'

/* ------------------------------ content types ------------------------------ */
type CTA = { label: string; href: string }
type StatItem = { value: string; label: string }
type Callout = { value: string; label: string }

type ProcessSection = {
  type: 'process'
  eyebrow: string
  title: string
  intro?: string
  steps: { title: string; blurb: string }[]
}
type FeatureGridSection = {
  type: 'feature_grid'
  eyebrow: string
  title: string
  intro?: string
  items: { title: string; meta?: string; blurb: string; href?: string }[]
}
type SplitSection = {
  type: 'split'
  eyebrow: string
  title: string
  body: string
  stats?: StatItem[]
  image?: string
}
type Section = ProcessSection | FeatureGridSection | SplitSection

type CoreContent = {
  hero: {
    eyebrow: string
    headline_lead: string
    headline_accent: string
    subhead: string
    stats?: StatItem[]
    primary_cta: CTA
    secondary_cta?: CTA
    callout?: Callout
    image?: string
  }
  sections?: Section[]
  why?: {
    eyebrow: string
    title: string
    intro?: string
    items: { title: string; blurb: string }[]
  }
  testimonials?: { quote: string; name: string; role: string }[]
  cta: {
    headline_lead: string
    headline_accent: string
    subhead: string
    primary_cta: CTA
    secondary_cta?: CTA
  }
}

const PRIMARY_SHADOW =
  '0 1px 2px 0 rgba(13,27,42,0.10), 0 4px 4px 0 rgba(13,27,42,0.09), 0 9px 6px 0 rgba(13,27,42,0.05), 0 17px 7px 0 rgba(13,27,42,0.01), inset 0 2px 8px 0 rgba(255,255,255,0.30)'
const SECONDARY_SHADOW = '0 0 0 0.5px rgba(0,0,0,0.06), 0 4px 30px rgba(0,0,0,0.08)'

/* ----------------------------- helpers / atoms ----------------------------- */
function isInternal(href: string): boolean {
  return href.startsWith('/')
}

function CTAButton({ cta, variant = 'primary' }: { cta: CTA; variant?: 'primary' | 'secondary' }) {
  const primary = variant === 'primary'
  const style = primary
    ? { background: '#0D1B2A', color: '#fff', boxShadow: PRIMARY_SHADOW }
    : { background: '#fff', color: '#0D1B2A', boxShadow: SECONDARY_SHADOW }
  const cls =
    'inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5'
  return isInternal(cta.href) ? (
    <Link to={cta.href} className={cls} style={style}>
      {cta.label}
    </Link>
  ) : (
    <a href={cta.href} className={cls} style={style}>
      {cta.label}
    </a>
  )
}

function useInView<T extends HTMLElement>(threshold = 0.12) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (setInView(true), io.unobserve(e.target))),
      { threshold }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, inView }
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
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

/* -------------------------------- the page -------------------------------- */
export default function CorePage({ slug }: { slug: string }) {
  const [c, setC] = useState<CoreContent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('site_core_pages')
        .select('content')
        .eq('tenant_id', MCMULLEN_TENANT_ID)
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle()
      if (cancelled) return
      setC((data?.content as CoreContent) ?? null)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-[#273C46]">McMullen Properties</div>
      </div>
    )
  }
  if (!c) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6 text-center">
        <div>
          <div className="text-3xl font-semibold text-[#0D1B2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Page not found
          </div>
          <Link to="/" className="text-[#1d4ed8] hover:opacity-70">← Back home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mp-home min-h-screen bg-white text-[#0D1B2A]">
      <style>{`
        .mp-home { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
        .mp-serif { font-family: 'Playfair Display', Georgia, serif; font-style: italic; letter-spacing: -0.02em; }
        .mp-mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
      `}</style>

      {/* header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="mp-serif text-2xl font-semibold text-[#0D1B2A]">McMullen</Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-[#273C46]">
            <Link to="/listings" className={slug === 'portfolio' ? 'text-[#0D1B2A]' : 'hover:text-[#0D1B2A]'}>Portfolio</Link>
            <Link to="/buy" className={slug === 'buy' ? 'text-[#0D1B2A]' : 'hover:text-[#0D1B2A]'}>Buy</Link>
            <Link to="/sell" className={slug === 'sell' ? 'text-[#0D1B2A]' : 'hover:text-[#0D1B2A]'}>Sell</Link>
            <Link to="/services" className={slug === 'services' ? 'text-[#0D1B2A]' : 'hover:text-[#0D1B2A]'}>Services</Link>
            <Link to="/about" className={slug === 'about' ? 'text-[#0D1B2A]' : 'hover:text-[#0D1B2A]'}>About</Link>
          </nav>
          <a href="tel:+14156919272" className="text-sm font-medium text-[#0D1B2A] hover:opacity-70">(415) 691-9272</a>
        </div>
      </header>

      {/* hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-8">
        <div className={c.hero.image ? 'grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center' : 'max-w-3xl'}>
          <div>
            <Reveal delay={0.05}>
              <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46] mb-5">
                {c.hero.eyebrow}
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <h1 className="text-[40px] md:text-[58px] leading-[1.04] font-semibold tracking-tight">
                {c.hero.headline_lead}{' '}
                <span className="mp-serif font-normal">{c.hero.headline_accent}</span>
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-5 text-lg text-[#273C46] leading-relaxed max-w-xl">{c.hero.subhead}</p>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <CTAButton cta={c.hero.primary_cta} />
                {c.hero.secondary_cta ? <CTAButton cta={c.hero.secondary_cta} variant="secondary" /> : null}
              </div>
            </Reveal>
            {c.hero.stats && c.hero.stats.length > 0 ? (
              <Reveal delay={0.4}>
                <div className="mt-12 flex items-stretch divide-x divide-black/10">
                  {c.hero.stats.map((s) => (
                    <div key={s.label} className="px-6 first:pl-0">
                      <div className="text-2xl md:text-3xl font-semibold tracking-tight">{s.value}</div>
                      <div className="mp-mono text-[10px] uppercase tracking-[0.16em] text-[#273C46] mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              </Reveal>
            ) : null}
          </div>
          {c.hero.image ? (
            <Reveal delay={0.25}>
              <div className="relative">
                <img src={c.hero.image} alt={c.hero.headline_lead} className="w-full h-[360px] md:h-[460px] object-cover rounded-[28px] shadow-xl" />
                {c.hero.callout ? (
                  <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl px-5 py-3" style={{ boxShadow: SECONDARY_SHADOW }}>
                    <div className="mp-serif text-2xl font-semibold not-italic text-[#0D1B2A]">{c.hero.callout.value}</div>
                    <div className="mp-mono text-[10px] uppercase tracking-[0.14em] text-[#273C46]">{c.hero.callout.label}</div>
                  </div>
                ) : null}
              </div>
            </Reveal>
          ) : c.hero.callout ? (
            <Reveal delay={0.45}>
              <div className="mt-10 inline-flex items-baseline gap-3 rounded-2xl px-5 py-3" style={{ boxShadow: SECONDARY_SHADOW }}>
                <span className="mp-serif text-2xl font-semibold not-italic text-[#0D1B2A]">{c.hero.callout.value}</span>
                <span className="mp-mono text-[10px] uppercase tracking-[0.14em] text-[#273C46]">{c.hero.callout.label}</span>
              </div>
            </Reveal>
          ) : null}
        </div>
      </section>

      {/* sections */}
      {(c.sections ?? []).map((sec, i) => (
        <SectionBlock key={i} section={sec} />
      ))}

      {/* why */}
      {c.why ? (
        <section className="bg-[#FAFAF7] py-20 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal>
              <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46] mb-3">{c.why.eyebrow}</div>
              <h2 className="text-[32px] md:text-[44px] leading-[1.05] font-semibold tracking-tight">{c.why.title}</h2>
              {c.why.intro ? <p className="text-[#273C46] mt-4 max-w-2xl leading-relaxed">{c.why.intro}</p> : null}
            </Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
              {c.why.items.map((it, i) => (
                <Reveal key={it.title} delay={0.05 * i}>
                  <div className="rounded-[20px] bg-white border border-black/[0.07] p-6 h-full">
                    <h3 className="text-lg font-semibold tracking-tight">{it.title}</h3>
                    <p className="text-sm text-[#273C46] mt-2 leading-relaxed">{it.blurb}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* testimonials */}
      {c.testimonials && c.testimonials.length > 0 ? (
        <section className="py-20 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            <Reveal>
              <h2 className="text-[28px] md:text-[40px] leading-[1.05] font-semibold tracking-tight mb-10">
                What <span className="mp-serif font-normal">people</span> say
              </h2>
            </Reveal>
            <div className="grid md:grid-cols-3 gap-5">
              {c.testimonials.map((t, i) => (
                <Reveal key={i} delay={0.05 * i}>
                  <div className="rounded-[24px] border border-black/[0.07] bg-white p-7 h-full flex flex-col">
                    <Quote className="w-7 h-7 text-[#0D1B2A]/15" />
                    <p className="text-[#0D1B2A] leading-relaxed mt-3 flex-1">{t.quote}</p>
                    <div className="mt-5">
                      <div className="font-semibold text-sm">{t.name}</div>
                      <div className="mp-mono text-[10px] uppercase tracking-[0.14em] text-[#273C46] mt-0.5">{t.role}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* cta */}
      <section className="max-w-4xl mx-auto px-6 py-24 md:py-28 text-center">
        <Reveal>
          <h2 className="text-[36px] md:text-[52px] leading-[1.05] font-semibold tracking-tight">
            {c.cta.headline_lead} <span className="mp-serif font-normal">{c.cta.headline_accent}</span>
          </h2>
          <p className="text-[#273C46] text-lg mt-5 max-w-xl mx-auto leading-relaxed">{c.cta.subhead}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <CTAButton cta={c.cta.primary_cta} />
            {c.cta.secondary_cta ? <CTAButton cta={c.cta.secondary_cta} variant="secondary" /> : null}
          </div>
        </Reveal>
      </section>

      {/* footer */}
      <footer className="border-t border-black/[0.07] py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-4 text-sm text-[#273C46]">
          <Link to="/" className="mp-serif text-xl font-semibold text-[#0D1B2A]">McMullen</Link>
          <div className="flex flex-wrap gap-6">
            <Link to="/listings" className="hover:opacity-70">Portfolio</Link>
            <Link to="/buy" className="hover:opacity-70">Buy</Link>
            <Link to="/sell" className="hover:opacity-70">Sell</Link>
            <Link to="/services" className="hover:opacity-70">Services</Link>
            <Link to="/about" className="hover:opacity-70">About</Link>
            <a href="tel:+14156919272" className="hover:opacity-70">(415) 691-9272</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------ section blocks ------------------------------ */
function SectionBlock({ section }: { section: Section }) {
  if (section.type === 'process') {
    return (
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46] mb-3">{section.eyebrow}</div>
          <h2 className="text-[32px] md:text-[44px] leading-[1.05] font-semibold tracking-tight">{section.title}</h2>
          {section.intro ? <p className="text-[#273C46] mt-4 max-w-2xl leading-relaxed">{section.intro}</p> : null}
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 mt-12">
          {section.steps.map((step, i) => (
            <Reveal key={step.title} delay={0.04 * i}>
              <div className="mp-serif text-3xl font-semibold not-italic text-[#0D1B2A]/25">
                {String(i + 1).padStart(2, '0')}
              </div>
              <h3 className="text-lg font-semibold tracking-tight mt-2">{step.title}</h3>
              <p className="text-sm text-[#273C46] mt-2 leading-relaxed">{step.blurb}</p>
            </Reveal>
          ))}
        </div>
      </section>
    )
  }

  if (section.type === 'feature_grid') {
    return (
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46] mb-3">{section.eyebrow}</div>
          <h2 className="text-[32px] md:text-[44px] leading-[1.05] font-semibold tracking-tight">{section.title}</h2>
          {section.intro ? <p className="text-[#273C46] mt-4 max-w-2xl leading-relaxed">{section.intro}</p> : null}
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {section.items.map((it, i) => {
            const inner = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-semibold tracking-tight">{it.title}</h3>
                  {it.href ? (
                    <ArrowUpRight className="w-5 h-5 text-[#273C46] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  ) : null}
                </div>
                {it.meta ? (
                  <div className="mp-mono text-[10px] uppercase tracking-[0.14em] text-[#273C46] mt-1">{it.meta}</div>
                ) : null}
                <p className="text-sm text-[#273C46] mt-3 leading-relaxed">{it.blurb}</p>
              </>
            )
            const cls =
              'group block rounded-[24px] border border-black/[0.07] p-7 bg-white h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_-22px_rgba(13,27,42,0.30)]'
            return (
              <Reveal key={it.title} delay={0.04 * i}>
                {it.href ? (
                  isInternal(it.href) ? (
                    <Link to={it.href} className={cls}>{inner}</Link>
                  ) : (
                    <a href={it.href} className={cls}>{inner}</a>
                  )
                ) : (
                  <div className={cls}>{inner}</div>
                )}
              </Reveal>
            )
          })}
        </div>
      </section>
    )
  }

  // split
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
      <div className={section.image ? 'grid md:grid-cols-2 gap-12 items-center' : 'max-w-3xl'}>
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46] mb-3">{section.eyebrow}</div>
          <h2 className="text-[30px] md:text-[42px] leading-[1.06] font-semibold tracking-tight">{section.title}</h2>
          <p className="text-[#273C46] mt-4 leading-relaxed">{section.body}</p>
          {section.stats && section.stats.length > 0 ? (
            <div className="mt-7 flex divide-x divide-black/10">
              {section.stats.map((s) => (
                <div key={s.label} className="px-6 first:pl-0">
                  <div className="mp-serif text-2xl font-semibold not-italic text-[#0D1B2A]">{s.value}</div>
                  <div className="mp-mono text-[10px] uppercase tracking-[0.14em] text-[#273C46] mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          ) : null}
        </Reveal>
        {section.image ? (
          <Reveal delay={0.15}>
            <img src={section.image} alt={section.title} className="w-full h-[320px] md:h-[440px] object-cover rounded-[28px] shadow-xl" />
          </Reveal>
        ) : null}
      </div>
    </section>
  )
}
