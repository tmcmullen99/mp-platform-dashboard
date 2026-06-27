// McMullen Properties — public homepage.
// Route: "/" (and "/home") served BEFORE the auth gate. No authentication.
//
// Visual direction (this revision): the navy-gradient hero with a muted YouTube
// video background — Tim's "Variation A" motionsites direction — replacing the
// earlier plain-white hero. Editorial Playfair display over DM Sans, blue-gray
// accents, layered-shadow pill CTAs, a quiet stat strip, an "As Seen In" trust
// bar, a "Decade of Results" video block, and a LIVE sold-properties carousel
// driven from public.properties (so it always reflects real, current sales).
//
// Hero copy / stats / services / testimonials / agent remain data-driven from
// public.site_home_content (one JSONB row per tenant), so the future admin CRUD
// can edit the page without code changes. The sold carousel is read live from
// public.properties and is NOT part of that JSON.
//
// Brand: canonical navy is #0D1B2A (not the #1a1f2e in the original paste);
// blue-gray #91a1ba accent; #4f82b9 logo-blue; Playfair Display + DM Sans.

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ArrowUpRight, Star, Quote, ChevronLeft, ChevronRight, MessageSquare, Calendar, Check } from 'lucide-react'
import { LogoWordmark, LogoMark } from '@/components/BrandLogo'

const MCMULLEN_TENANT_ID = 'e0c8abe7-cc29-45c0-99c1-7c20b920262a'

// Brand tokens
const NAVY = '#0D1B2A'
const NAVY_DEEP = '#080f18'
const BLUEGRAY = '#91a1ba'
const INK = '#273C46'

// Hero background film (muted, looping). Tim's brand video.
const HERO_VIDEO_ID = 'S_R_LZ5z6_s'

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
  same_developer?: {
    eyebrow: string
    headline_lead: string
    headline_accent: string
    subhead: string
    proof: { slug: string; label: string; name: string; location: string; price: string; caption: string }
    mandate: { slug: string; label: string; name: string; location: string; price: string; caption: string; href: string }
    footnote: string
    cta: { label: string; href: string }
  }
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

// Live sold-listing card (read from public.properties, not the JSON blob).
type SoldCard = {
  slug: string
  name: string
  price: number | null
  beds: number | null
  baths: number | null
  hood: string | null
  img: string | null
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
      className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5"
      style={
        primary
          ? { background: NAVY, color: '#fff', boxShadow: PRIMARY_SHADOW }
          : { background: '#fff', color: NAVY, boxShadow: SECONDARY_SHADOW }
      }
    >
      {children}
    </a>
  )
}

/* --------------------------------- page ---------------------------------- */
export default function McMullenHome() {
  const [content, setContent] = useState<HomeContent | null>(null)
  const [sold, setSold] = useState<SoldCard[]>([])
  // Live hero images for the "Same Developer" proof→mandate pair, keyed by slug,
  // so they auto-update once Huckleberry's photos are rehosted to Supabase.
  const [devImgs, setDevImgs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  // Hero pointer-parallax: content drifts subtly toward the cursor for an
  // interactive, alive feel over the video. Disabled under reduced-motion.
  const [parallax, setParallax] = useState({ x: 0, y: 0 })
  const onHeroPointer = (e: React.MouseEvent<HTMLElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = e.currentTarget.getBoundingClientRect()
    const dx = (e.clientX - r.left) / r.width - 0.5
    const dy = (e.clientY - r.top) / r.height - 0.5
    setParallax({ x: dx, y: dy })
  }
  useEffect(() => {
    let cancelled = false
    async function load() {
      // Home JSON (hero copy, stats, services, testimonials, agent).
      const contentP = supabase
        .from('site_home_content')
        .select('content')
        .eq('tenant_id', MCMULLEN_TENANT_ID)
        .eq('published', true)
        .maybeSingle()

      // Live sold listings for the carousel.
      const soldP = supabase
        .from('properties')
        .select('slug, name, price, bedrooms, bathrooms, main_image, listing_stage, neighborhoods(name)')
        .eq('listing_stage', 'sold')
        .neq('slug', 'union-house-residence-5c')
        .order('price', { ascending: false, nullsFirst: false })
        .limit(12)

      // Live hero images for the Same Developer pair.
      const devP = supabase
        .from('properties')
        .select('slug, main_image')
        .in('slug', ['4250-west-lake-blvd', '175-huckleberry-drive'])

      const [{ data: cData }, { data: sData }, { data: dData }] = await Promise.all([contentP, soldP, devP])
      if (cancelled) return

      setContent((cData?.content as HomeContent) ?? null)

      const dmap: Record<string, string> = {}
      ;(dData ?? []).forEach((r: Record<string, unknown>) => {
        const url = (r.main_image as { url?: string } | null)?.url
        if (url) dmap[r.slug as string] = url
      })
      setDevImgs(dmap)

      const cards: SoldCard[] = (sData ?? [])
        .map((r: Record<string, unknown>) => ({
          slug: r.slug as string,
          name: r.name as string,
          price: (r.price as number) ?? null,
          beds: (r.bedrooms as number) ?? null,
          baths: (r.bathrooms as number) ?? null,
          hood: ((r.neighborhoods as { name?: string } | null)?.name) ?? null,
          img: ((r.main_image as { url?: string } | null)?.url) ?? null,
        }))
        // only cards with a photo + real bed count (filters equity-exchange rows)
        .filter((c) => c.img && c.beds != null)
      setSold(cards)

      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: NAVY }}>
        <div className="font-mono text-xs uppercase tracking-[0.3em]" style={{ color: BLUEGRAY }}>
          McMullen Properties
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6 text-center">
        <div>
          <div className="font-serif text-3xl mb-3" style={{ color: NAVY }}>McMullen Properties</div>
          <p style={{ color: INK }}>The site is being updated. Please check back shortly.</p>
        </div>
      </div>
    )
  }

  const c = content

  return (
    <div className="mp-home min-h-screen bg-white" style={{ color: NAVY }}>
      {/* scoped styles — serif accents, hero video cover, marquee, no global leakage */}
      <style>{`
        .mp-home { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
        .mp-serif { font-family: 'Playfair Display', Georgia, serif; letter-spacing: -0.02em; }
        .mp-mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }

        /* ---- navy video hero ---- */
        .mp-hero { position: relative; min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center; overflow: hidden; background: ${NAVY}; }
        .mp-hero-bg { position: absolute; inset: 0; z-index: 0; }
        .mp-hero-bg iframe { width: 100vw; height: 56.25vw; min-height: 100vh; min-height: 100dvh; min-width: 177.77vh; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); pointer-events: none; border: 0; }
        .mp-hero-overlay { position: absolute; inset: 0; z-index: 1; background: linear-gradient(135deg, rgba(13,27,42,0.93) 0%, rgba(13,27,42,0.78) 50%, rgba(13,27,42,0.95) 100%); }
        .mp-hero-vignette { position: absolute; inset: 0; z-index: 1; background: radial-gradient(120% 80% at 50% 0%, transparent 40%, rgba(8,15,24,0.55) 100%); }
        .mp-hero-content { position: relative; z-index: 2; text-align: center; max-width: 880px; width: 100%; margin: 0 auto; padding: 0 24px; display: flex; flex-direction: column; align-items: center; }

        @keyframes mpScrollCue { 0%,100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(7px); } }
        .mp-scroll-cue { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 2; animation: mpScrollCue 2.5s infinite; }

        @keyframes mpFadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
        .mp-anim { opacity: 0; animation: mpFadeUp 1s cubic-bezier(0.16,1,0.3,1) forwards; }

        /* ---- headline accent shimmer ---- */
        @keyframes mpSheen { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .mp-accent { color: ${BLUEGRAY}; font-style: normal; background-image: linear-gradient(110deg, ${BLUEGRAY} 0%, #c5d2e6 30%, #fff 50%, #c5d2e6 70%, ${BLUEGRAY} 100%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: mpSheen 6s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .mp-accent { animation: none; -webkit-text-fill-color: ${BLUEGRAY}; } }

        /* ---- sold carousel ---- */
        .mp-sold-track { display: flex; gap: 22px; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; padding: 6px 0 26px; scrollbar-width: none; }
        .mp-sold-track::-webkit-scrollbar { display: none; }
        .mp-sold-card { min-width: 320px; max-width: 320px; scroll-snap-align: start; flex-shrink: 0; }
        @media (max-width: 640px) { .mp-sold-card { min-width: 280px; max-width: 280px; } }

        /* ---- marquee (kept available for future proof strip) ---- */
        @keyframes mpMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .mp-marquee-track { display: flex; width: max-content; animation: mpMarquee 45s linear infinite; }
        @media (max-width: 768px) { .mp-marquee-track { animation-duration: 22s; } }

        @media (prefers-reduced-motion: reduce) {
          .mp-anim, .mp-scroll-cue, .mp-marquee-track { animation: none !important; opacity: 1 !important; }
        }
      `}</style>

      {/* ============================== HEADER ============================== */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{ background: 'rgba(13,27,42,0.85)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <a href="/" className="flex items-center text-white hover:opacity-80 transition-opacity" aria-label="McMullen Properties — home">
            <LogoWordmark height={34} />
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
            <a href="/listings" className="hover:text-white transition-colors">Portfolio</a>
            <a href="/buy" className="hover:text-white transition-colors">Buy</a>
            <a href="/sell" className="hover:text-white transition-colors">Sell</a>
            <a href="/services" className="hover:text-white transition-colors">Services</a>
          </nav>
          <a
            href={c.agent.schedule_href}
            className="text-sm font-semibold px-5 py-2.5 rounded-full transition-transform hover:-translate-y-0.5"
            style={{ background: '#fff', color: NAVY }}
          >
            Meet Tim
          </a>
        </div>
      </header>

      {/* =============================== HERO =============================== */}
      <section className="mp-hero" onMouseMove={onHeroPointer} onMouseLeave={() => setParallax({ x: 0, y: 0 })}>
        <div className="mp-hero-bg" style={{ transform: `scale(1.06) translate(${parallax.x * -14}px, ${parallax.y * -14}px)`, transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
          <iframe
            src={`https://www.youtube.com/embed/${HERO_VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${HERO_VIDEO_ID}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`}
            title="McMullen Properties"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
        <div className="mp-hero-overlay" />
        <div className="mp-hero-vignette" />

        <div className="mp-hero-content" style={{ transform: `translate(${parallax.x * 16}px, ${parallax.y * 16}px)`, transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
          <div className="mp-anim mp-mono text-[11px] uppercase mb-6" style={{ letterSpacing: '0.28em', color: 'rgba(145,161,186,0.7)', animationDelay: '0.1s' }}>
            {c.hero.eyebrow}
          </div>

          <h1
            className="mp-anim mp-serif text-white"
            style={{ fontSize: 'clamp(40px,7vw,72px)', fontWeight: 500, lineHeight: 1.06, margin: 0, animationDelay: '0.25s' }}
          >
            {c.hero.headline_lead}{' '}
            <em className="mp-accent">{c.hero.headline_accent}</em>{' '}
            {c.hero.headline_tail}
          </h1>

          <p
            className="mp-anim"
            style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', maxWidth: 520, margin: '22px auto 0', lineHeight: 1.6, animationDelay: '0.4s' }}
          >
            {c.hero.subhead}
          </p>

          <div className="mp-anim flex flex-col sm:flex-row gap-3 justify-center mt-9" style={{ animationDelay: '0.55s' }}>
            <a
              href={c.hero.primary_cta.href}
              className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-semibold transition-transform hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${BLUEGRAY} 0%, #6b7a8f 100%)`, color: NAVY, boxShadow: '0 10px 30px rgba(145,161,186,0.3)' }}
            >
              <MessageSquare className="w-[18px] h-[18px]" />
              {c.hero.primary_cta.label}
            </a>
            <a
              href={c.hero.secondary_cta.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-semibold transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }}
            >
              <Calendar className="w-[18px] h-[18px]" />
              {c.hero.secondary_cta.label}
            </a>
          </div>

          {/* quiet stat strip */}
          <div className="mp-anim flex items-stretch mt-14 w-full max-w-[480px] pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', animationDelay: '0.7s' }}>
            {c.stats.map((s, i) => (
              <div key={s.label} className="flex-1 text-center px-3" style={{ borderRight: i < c.stats.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                <div className="mp-serif text-2xl sm:text-[26px] text-white" style={{ fontWeight: 500 }}>{s.value}</div>
                <div className="mp-mono text-[10px] uppercase tracking-[0.12em] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mp-scroll-cue flex flex-col items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <span className="mp-mono text-[9px] uppercase tracking-[0.2em]">Scroll</span>
          <ChevronRight className="w-4 h-4 rotate-90" />
        </div>
      </section>

      {/* ============================ TRUST BAR ============================ */}
      <section className="relative py-9 px-5" style={{ background: NAVY_DEEP }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(145,161,186,0.2), transparent)' }} />
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-10">
          <span className="mp-mono text-[10px] font-semibold uppercase tracking-[0.2em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.3)' }}>
            As Seen In
          </span>
          <div className="flex items-center gap-7 sm:gap-9 flex-wrap justify-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {c.press.map((p) => (
              <span key={p} className="text-sm font-medium transition-colors hover:text-white">{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ========================= DECADE OF RESULTS ======================= */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <div className="relative rounded-[24px] overflow-hidden shadow-2xl aspect-video bg-black">
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${HERO_VIDEO_ID}?rel=0&modestbranding=1`}
                title="Meet Tim McMullen"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mp-mono text-xs uppercase tracking-[0.22em]" style={{ color: BLUEGRAY }}>Meet Tim</div>
            <h2 className="mt-3 text-[34px] md:text-[46px] leading-[1.08] font-semibold tracking-tight">
              A decade of <span className="mp-serif font-normal" style={{ color: NAVY }}>results.</span>
            </h2>
            <p className="mt-5 leading-relaxed" style={{ color: INK }}>
              From 1-bedroom TICs in San Francisco to $31M Tahoe lakefront estates — Tim has sold it all.
              After years in client representation and city-scale development, he&rsquo;s built the ultimate
              toolkit to maximize your real estate ROI.
            </p>
            <div className="mt-6 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {[
                '$100M+ in closed transactions',
                'Off-market & private exclusives',
                'Development & renovation expertise',
                'Factory-direct material sourcing',
              ].map((f) => (
                <div key={f} className="flex items-start gap-2.5 text-sm" style={{ color: INK }}>
                  <Check className="w-[18px] h-[18px] mt-0.5 shrink-0" style={{ color: BLUEGRAY }} />
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-8">
              <PillButton href="/about">Learn more about Tim <ArrowUpRight className="w-4 h-4" /></PillButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ========================= SOLD CAROUSEL ========================== */}
      {sold.length > 0 && <SoldCarousel cards={sold} />}

      {/* ======================= SAME DEVELOPER STORY ===================== */}
      {c.same_developer && <SameDeveloper data={c.same_developer} imgs={devImgs} />}

      {/* =========================== RECORD SALE =========================== */}
      <section className="py-20 md:py-28" style={{ background: NAVY }}>
        <div className="max-w-5xl mx-auto px-6 text-white">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: 'rgba(145,161,186,0.7)' }}>
              {c.record_sale.badge}
            </div>
            <h2 className="text-[40px] md:text-[56px] leading-[1.05] font-semibold tracking-tight">
              Sold for{' '}
              <span className="mp-serif font-normal" style={{ color: BLUEGRAY }}>
                {c.record_sale.headline.replace('Sold for ', '')}
              </span>
            </h2>
            <p className="text-lg leading-relaxed mt-5 max-w-2xl" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {c.record_sale.subhead}
            </p>
            <p className="mp-mono text-xs uppercase tracking-[0.18em] mt-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {c.record_sale.address}
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-10 overflow-hidden rounded-[24px] shadow-2xl">
              <img src={c.record_sale.image} alt={c.record_sale.address} className="w-full h-[300px] md:h-[480px] object-cover" />
            </div>
          </Reveal>
          <Reveal delay={0.25}>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
              {c.record_sale.stats.map((s) => (
                <div key={s.label}>
                  <div className="mp-serif text-3xl md:text-4xl font-semibold">{s.value}</div>
                  <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.35}>
            <blockquote className="mt-12 border-l-2 pl-6 max-w-2xl" style={{ borderColor: 'rgba(145,161,186,0.4)' }}>
              <p className="text-lg md:text-xl leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
                &ldquo;{c.record_sale.quote}&rdquo;
              </p>
              <footer className="mp-mono text-xs uppercase tracking-[0.18em] mt-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Tim McMullen · DRE #{c.agent.dre}
              </footer>
            </blockquote>
          </Reveal>
          <Reveal delay={0.45}>
            <a href={c.record_sale.href} className="inline-flex items-center gap-2 text-sm font-medium text-white hover:gap-3 transition-all mt-9">
              See the full sale story <ArrowUpRight className="w-4 h-4" />
            </a>
          </Reveal>
        </div>
      </section>

      {/* ============================= SERVICES ============================= */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: BLUEGRAY }}>
            Elite representation
          </div>
          <h2 className="text-[36px] md:text-[52px] leading-[1.05] font-semibold tracking-tight">
            One agent. <span className="mp-serif font-normal" style={{ color: NAVY }}>Every solution.</span>
          </h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {c.services.map((s, i) => (
            <Reveal key={s.title} delay={0.05 * i}>
              <a
                href={s.href}
                className="group block h-full rounded-[24px] border p-8 transition-all duration-300 hover:-translate-y-1 bg-white"
                style={{ borderColor: 'rgba(13,27,42,0.08)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-semibold tracking-tight">{s.title}</h3>
                  <ArrowUpRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: BLUEGRAY }} />
                </div>
                <p className="leading-relaxed mt-3 text-sm" style={{ color: INK }}>{s.blurb}</p>
                <span className="mp-mono text-[11px] uppercase tracking-[0.16em] mt-5 inline-block" style={{ color: NAVY }}>
                  {s.cta} &rarr;
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* =========================== TESTIMONIALS =========================== */}
      <TestimonialCarousel testimonials={c.testimonials} />

      {/* =============================== CTA =============================== */}
      <section className="relative overflow-hidden py-24 md:py-32" style={{ background: NAVY }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(900px circle at 50% 0%, rgba(145,161,186,0.12), transparent 60%)' }} />
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <Reveal>
            <img src={c.agent.photo} alt={c.agent.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-8 shadow-lg" />
            <h2 className="text-[36px] md:text-[56px] leading-[1.05] font-semibold tracking-tight text-white">
              Ready to make <span className="mp-serif font-normal" style={{ color: BLUEGRAY }}>your move?</span>
            </h2>
            <p className="text-lg mt-5 max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Whether you&rsquo;re buying, selling, investing, or improving — let&rsquo;s talk about how Tim
              can help you achieve your real estate goals.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={c.agent.schedule_href}
                className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-semibold transition-transform hover:-translate-y-0.5"
                style={{ background: '#fff', color: NAVY }}
              >
                <Calendar className="w-[18px] h-[18px]" /> Schedule a call
              </a>
              <a
                href={c.agent.phone_href}
                className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
              >
                {c.agent.phone}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================== FOOTER ============================== */}
      <footer style={{ background: NAVY_DEEP }} className="py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-10">
            <div className="max-w-sm">
              <div className="text-white"><LogoWordmark height={28} /></div>
              <p className="text-sm leading-relaxed mt-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
                A decade of experience, now setting neighborhood price records in Silicon Valley&rsquo;s
                $5M SFR market.
              </p>
            </div>
            <div className="flex gap-14">
              <div>
                <div className="mp-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Explore</div>
                <ul className="space-y-2 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  <li><a href="/buy" className="hover:text-white transition-colors">Buy</a></li>
                  <li><a href="/sell" className="hover:text-white transition-colors">Sell</a></li>
                  <li><a href="/listings" className="hover:text-white transition-colors">Portfolio</a></li>
                </ul>
              </div>
              <div>
                <div className="mp-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Contact</div>
                <ul className="space-y-2 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  <li><a href={c.agent.phone_href} className="hover:text-white transition-colors">{c.agent.phone}</a></li>
                  <li><a href={`mailto:${c.agent.email}`} className="hover:text-white transition-colors">{c.agent.email}</a></li>
                  <li><a href={c.agent.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">YouTube</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 flex flex-col md:flex-row justify-between gap-3 text-xs leading-relaxed" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
            <p className="max-w-3xl">{c.agent.brokerage} DRE #{c.agent.dre}.</p>
            <p className="shrink-0">© {new Date().getFullYear()} McMullen Properties</p>
          </div>
        </div>
      </footer>

      {/* ========================= FIXED BOTTOM NAV ========================= */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-3 bg-white rounded-full pl-5 pr-2 py-2" style={{ boxShadow: SECONDARY_SHADOW }}>
          <span className="flex items-center" style={{ color: NAVY }}><LogoMark size={22} /></span>
          <a href={c.hero.primary_cta.href} className="rounded-full px-5 py-2 text-sm font-medium text-white" style={{ background: NAVY, boxShadow: PRIMARY_SHADOW }}>
            Start a chat
          </a>
        </div>
      </div>
    </div>
  )
}

/* ---------------------- live sold-properties carousel --------------------- */
function money(n: number | null): string {
  if (n == null) return 'Sold'
  return '$' + Math.round(n).toLocaleString()
}

function SoldCarousel({ cards }: { cards: SoldCard[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const scroll = (dir: number) =>
    trackRef.current?.scrollBy({ left: dir * 350, behavior: 'smooth' })

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="flex items-end justify-between gap-6 mb-10">
            <div>
              <div className="mp-mono text-xs uppercase tracking-[0.22em]" style={{ color: BLUEGRAY }}>Track record</div>
              <h2 className="mt-3 text-[36px] md:text-[52px] leading-[1.05] font-semibold tracking-tight">
                Sold <span className="mp-serif font-normal" style={{ color: NAVY }}>properties.</span>
              </h2>
            </div>
            <div className="hidden sm:flex gap-3 shrink-0">
              <button onClick={() => scroll(-1)} aria-label="Scroll left"
                className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                style={{ background: '#f0f2f5', color: NAVY }}
                onMouseEnter={(e) => { e.currentTarget.style.background = NAVY; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f0f2f5'; e.currentTarget.style.color = NAVY }}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => scroll(1)} aria-label="Scroll right"
                className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                style={{ background: '#f0f2f5', color: NAVY }}
                onMouseEnter={(e) => { e.currentTarget.style.background = NAVY; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f0f2f5'; e.currentTarget.style.color = NAVY }}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </Reveal>

        <div ref={trackRef} className="mp-sold-track">
          {cards.map((s) => (
            <Link
              key={s.slug}
              to={`/listings/${s.slug}`}
              className="mp-sold-card group block rounded-[20px] overflow-hidden bg-white"
              style={{ boxShadow: '0 10px 40px rgba(13,27,42,0.08)' }}
            >
              <div className="relative h-[220px] overflow-hidden">
                {s.img ? (
                  <img src={s.img} alt={s.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.08]" />
                ) : null}
                <span
                  className="absolute top-4 left-4 text-[11px] font-semibold px-3.5 py-1.5 rounded-lg uppercase tracking-wide"
                  style={{ background: `linear-gradient(135deg, ${BLUEGRAY}, #6b7a8f)`, color: NAVY }}
                >
                  Sold
                </span>
              </div>
              <div className="p-5">
                <div className="mp-serif text-[22px]" style={{ color: NAVY }}>{money(s.price)}</div>
                <div className="flex gap-3 text-[13px] mt-1.5" style={{ color: '#5a6578' }}>
                  {s.beds != null ? <span>{s.beds} beds</span> : null}
                  {s.baths != null ? <span>{s.baths} baths</span> : null}
                  {s.hood ? <span>{s.hood}</span> : null}
                </div>
                <div className="text-sm mt-1.5" style={{ color: BLUEGRAY }}>{s.name}</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <a href="/listings" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold text-white transition-transform hover:-translate-y-0.5" style={{ background: NAVY }}>
            See more sales <ArrowUpRight className="w-[18px] h-[18px]" />
          </a>
        </div>
      </div>
    </section>
  )
}

/* ------------------- same developer: proof → mandate -------------------- */
function SameDeveloper({
  data,
  imgs,
}: {
  data: NonNullable<HomeContent['same_developer']>
  imgs: Record<string, string>
}) {
  const proofImg = imgs[data.proof.slug] ?? ''
  const mandateImg = imgs[data.mandate.slug] ?? ''

  const Card = ({
    img, label, name, location, price, caption, sold, href,
  }: {
    img: string; label: string; name: string; location: string; price: string
    caption: string; sold?: boolean; href?: string
  }) => {
    const inner = (
      <div
        className="group relative rounded-[24px] overflow-hidden h-full"
        style={{ border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)' }}
      >
        <div className="relative aspect-[4/3] overflow-hidden" style={{ background: NAVY_DEEP }}>
          {img ? (
            <img src={img} alt={name} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : null}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(8,15,24,0.85), transparent 55%)' }} />
          <span
            className="absolute top-4 left-4 mp-mono text-[10px] uppercase tracking-[0.16em] px-3 py-1.5 rounded-full"
            style={{ background: sold ? 'rgba(145,161,186,0.92)' : 'rgba(255,255,255,0.92)', color: NAVY }}
          >
            {label}
          </span>
        </div>
        <div className="p-6">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div className="mp-serif text-2xl text-white" style={{ fontWeight: 500 }}>{price}</div>
            {sold ? (
              <span className="mp-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: BLUEGRAY }}>Sold</span>
            ) : (
              <span className="mp-mono text-[10px] uppercase tracking-[0.16em] inline-flex items-center gap-1" style={{ color: '#fff' }}>
                View listing <ArrowUpRight className="w-3 h-3" />
              </span>
            )}
          </div>
          <div className="text-white mt-1">{name}</div>
          <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{location}</div>
          <p className="text-sm leading-relaxed mt-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{caption}</p>
        </div>
      </div>
    )
    return href ? (
      <Link to={href} className="block h-full transition-transform duration-300 hover:-translate-y-1">{inner}</Link>
    ) : (
      <div className="h-full">{inner}</div>
    )
  }

  return (
    <section className="relative overflow-hidden py-20 md:py-28" style={{ background: NAVY }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(900px circle at 50% 0%, rgba(145,161,186,0.12), transparent 60%)' }} />
      <div className="relative max-w-6xl mx-auto px-6">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <div className="mp-mono text-xs uppercase tracking-[0.22em]" style={{ color: BLUEGRAY }}>
              {data.eyebrow}
            </div>
            <h2 className="mt-4 text-[34px] md:text-[50px] leading-[1.08] font-semibold tracking-tight text-white">
              {data.headline_lead}{' '}
              <span className="mp-serif font-normal" style={{ color: BLUEGRAY }}>{data.headline_accent}</span>
            </h2>
            <p className="mt-5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {data.subhead}
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-4 items-center">
          <Reveal>
            <Card
              img={proofImg}
              label={data.proof.label}
              name={data.proof.name}
              location={data.proof.location}
              price={data.proof.price}
              caption={data.proof.caption}
              sold
            />
          </Reveal>

          {/* connector */}
          <div className="hidden lg:flex flex-col items-center justify-center px-2" style={{ color: BLUEGRAY }}>
            <div className="h-px w-10" style={{ background: 'rgba(145,161,186,0.4)' }} />
            <ArrowUpRight className="w-6 h-6 rotate-45 my-2" />
            <div className="h-px w-10" style={{ background: 'rgba(145,161,186,0.4)' }} />
          </div>

          <Reveal delay={0.12}>
            <Card
              img={mandateImg}
              label={data.mandate.label}
              name={data.mandate.name}
              location={data.mandate.location}
              price={data.mandate.price}
              caption={data.mandate.caption}
              href={data.mandate.href}
            />
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5 text-center">
            <a
              href={data.cta.href}
              className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
              style={{ background: '#fff', color: NAVY }}
            >
              {data.cta.label}
              <ArrowUpRight className="w-4 h-4" />
            </a>
            <span className="mp-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {data.footnote}
            </span>
          </div>
        </Reveal>
      </div>
    </section>
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
            What <span className="mp-serif font-normal" style={{ color: NAVY }}>people</span> say
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="w-4 h-4" style={{ fill: NAVY, color: NAVY }} />
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border p-8 md:p-12 min-h-[260px] flex flex-col justify-between" style={{ borderColor: 'rgba(13,27,42,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
          <Quote className="w-8 h-8" style={{ color: 'rgba(13,27,42,0.2)' }} />
          <p className="text-xl md:text-2xl leading-relaxed mt-4" style={{ color: NAVY }}>
            {testimonials[idx]?.quote}
          </p>
          <div className="mt-8">
            <div className="font-semibold text-sm">{testimonials[idx]?.name}</div>
            <div className="mp-mono text-[11px] uppercase tracking-[0.16em] mt-0.5" style={{ color: INK }}>
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
                style={{ width: i === idx ? 28 : 8, background: i === idx ? NAVY : 'rgba(13,27,42,0.2)' }}
              />
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => go(-1)} aria-label="Previous testimonial"
              className="w-11 h-11 rounded-full border flex items-center justify-center transition-colors"
              style={{ borderColor: 'rgba(13,27,42,0.2)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = NAVY; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'inherit' }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => go(1)} aria-label="Next testimonial"
              className="w-11 h-11 rounded-full border flex items-center justify-center transition-colors"
              style={{ borderColor: 'rgba(13,27,42,0.2)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = NAVY; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'inherit' }}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
