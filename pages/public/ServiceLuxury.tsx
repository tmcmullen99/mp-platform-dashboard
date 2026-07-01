// Bespoke service page: Luxury Listing Marketing.
// A motion-rich overview that sells the $10M+ marketing approach and funnels
// qualified sellers into the existing /luxury-listings consultation flow.
// Uses the shared motionsites vocabulary (components/public/motion).

import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import {
  MotionStyles,
  Reveal,
  CountUp,
  ParallaxHero,
  Marquee,
  PillButton,
  NAVY,
  NAVY_DEEP,
  INK,
} from '@/components/public/motion'
import { Globe, Crosshair, Share2, Film, EyeOff, LineChart, ArrowUpRight } from 'lucide-react'

const HERO_IMG =
  'https://kumfuludrhoqirxvaqja.supabase.co/storage/v1/object/public/listing-photos/site/175-huckleberry-drive/000.jpg'

const GOLD = '#b8965a'

const PILLARS = [
  {
    icon: Globe,
    title: 'A dedicated website for your home',
    body: 'Every listing gets its own bespoke property site — cinematic imagery, full gallery, film, the location story, and a private inquiry channel. Your home is presented as a singular asset, not a tile in a feed.',
  },
  {
    icon: Crosshair,
    title: 'Direct outreach to a curated audience',
    body: 'I build validated, targeted lists of qualified luxury homeowners and likely-buyer networks across the Bay Area and key second-home markets — then reach the specific people most likely to buy your home.',
  },
  {
    icon: Film,
    title: 'Cinematic film & photography',
    body: 'Architectural photography, aerial cinematography, and a narrative film that positions the property the way a brand launches a flagship product.',
  },
  {
    icon: Share2,
    title: 'Multi-channel campaign',
    body: 'Coordinated launch across email, social, and paid placement — every channel firing simultaneously so demand peaks in the opening days, not months in.',
  },
  {
    icon: EyeOff,
    title: 'Private, pre-market exposure',
    body: 'A discreet pre-launch to a vetted buyer pool builds early interest and pricing signal before the home is ever public.',
  },
  {
    icon: LineChart,
    title: 'Live performance tracking',
    body: 'Every campaign is instrumented — traffic, engagement, and inquiry data reviewed continuously so we adjust in real time, not in hindsight.',
  },
]

const PROOF = [
  '175 Huckleberry Drive · $9.95M · Jackson Hole',
  '4250 West Lake Blvd · $31M · Tahoe',
  'Eureka Tower Penthouse · $17M · Melbourne',
  '706 Mission · $3,000/ft record',
  'Direct-to-buyer marketing',
  'Bespoke property websites',
]

export default function ServiceLuxury() {
  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="services" />

      {/* ============================== HERO ============================== */}
      <ParallaxHero image={HERO_IMG} minH="82vh" accent="gold">
        <div className="max-w-6xl mx-auto px-6 py-28">
          <div className="max-w-3xl">
            <div
              className="mp-anim mp-mono text-[11px] uppercase tracking-[0.28em] mb-6"
              style={{ color: GOLD, animationDelay: '0.1s' }}
            >
              Luxury Listing Marketing · $10M+
            </div>
            <h1
              className="mp-anim mp-serif text-white text-[46px] md:text-[68px] leading-[1.02] font-semibold"
              style={{ animationDelay: '0.2s' }}
            >
              Your home deserves a <span className="mp-accent-gold">campaign</span>, not a listing.
            </h1>
            <p
              className="mp-anim text-lg md:text-xl mt-7 leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.8)', animationDelay: '0.35s', maxWidth: '640px' }}
            >
              Most agents post your property and wait. I launch it — a bespoke website, cinematic
              film, and direct outreach to the exact buyers most likely to purchase, tracked live
              from day one.
            </p>
            <div className="mp-anim flex flex-wrap gap-3 mt-9" style={{ animationDelay: '0.5s' }}>
              <PillButton href="/luxury-listings" onDark>
                Request a private consultation <ArrowUpRight className="w-4 h-4" />
              </PillButton>
              <PillButton href="https://175huckleberrydrive.com/" variant="secondary" onDark>
                See a live campaign
              </PillButton>
            </div>
          </div>
        </div>
      </ParallaxHero>

      {/* ---- proof marquee strip ---- */}
      <div style={{ background: NAVY_DEEP }}>
        <Marquee items={PROOF} />
      </div>

      {/* ============================== STATS ============================== */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { v: 100, prefix: '$', suffix: 'M+', label: 'Career sales volume' },
            { v: 31, prefix: '$', suffix: 'M', label: 'Largest sale' },
            { raw: '$3,000/ft', label: 'Record price achieved' },
            { raw: '24/7', label: 'Live campaign tracking' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={0.06 * i}>
              <div
                className="mp-serif text-[38px] md:text-[52px] font-semibold leading-none"
                style={{ color: NAVY }}
              >
                <CountUp value={s.v} prefix={s.prefix} suffix={s.suffix} raw={s.raw} />
              </div>
              <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mt-3" style={{ color: INK }}>
                {s.label}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================ THESIS SPLIT ============================ */}
      <section style={{ background: '#f7f8fa' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-14 items-center">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
              The approach
            </div>
            <h2 className="mp-serif text-[34px] md:text-[46px] leading-[1.06] font-semibold" style={{ color: NAVY }}>
              A launch, engineered.
            </h2>
            <p className="mt-6 leading-relaxed text-[17px]" style={{ color: INK }}>
              A great home sold quietly is a missed opportunity. Every property I take on is treated
              like a product launch — a singular asset with its own website, its own film, and a
              campaign built to reach the precise audience most likely to buy it. The result is
              competitive tension, not a slow price grind.
            </p>
            <div className="mt-8">
              <PillButton href="/luxury-listings">
                Start with a consultation <ArrowUpRight className="w-4 h-4" />
              </PillButton>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="rounded-[28px] overflow-hidden mp-lift" style={{ boxShadow: '0 30px 80px -40px rgba(13,27,42,0.5)' }}>
              <img src={HERO_IMG} alt="175 Huckleberry Drive — a live luxury campaign" className="w-full h-[420px] object-cover" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================ SIX PILLARS ============================ */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>
            What every campaign includes
          </div>
          <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
            Six ways your home gets sold.
          </h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {PILLARS.map((p, i) => {
            const Icon = p.icon
            return (
              <Reveal key={p.title} delay={0.05 * i}>
                <div className="mp-lift rounded-[24px] border border-black/[0.07] bg-white p-7 h-full">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center mb-5"
                    style={{ background: 'rgba(184,150,90,0.12)' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: GOLD }} />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight" style={{ color: NAVY }}>
                    {p.title}
                  </h3>
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: INK }}>
                    {p.body}
                  </p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ============================== CTA BAND ============================== */}
      <section style={{ background: NAVY }}>
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: GOLD }}>
              Selling above $10M?
            </div>
            <h2 className="mp-serif text-white text-[36px] md:text-[52px] leading-[1.05] font-semibold">
              Let's build your <span className="mp-accent-gold">campaign</span>.
            </h2>
            <p className="mt-6 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              A private, no-obligation consultation to walk through exactly how your home would be
              positioned and marketed.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-9">
              <PillButton href="/luxury-listings" onDark>
                Request a consultation <ArrowUpRight className="w-4 h-4" />
              </PillButton>
              <PillButton href="tel:+14156919272" variant="secondary" onDark>
                (415) 691-9272
              </PillButton>
            </div>
          </Reveal>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
