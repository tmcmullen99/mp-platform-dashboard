// Bespoke service page: McMullen Commercial.
//
// Presents commercial real estate as a dedicated arm of the practice: buyer-side
// representation for income-producing industrial and commercial assets. The two
// closed deals render via the shared, DB-backed CommercialShowcase component
// (same source of truth used on the 1031 page). CTA = schedule a video call.

import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import CommercialShowcase from '@/components/public/CommercialShowcase'
import {
  MotionStyles,
  Reveal,
  ParallaxHero,
  Marquee,
  PillButton,
  NAVY,
  NAVY_DEEP,
  INK,
} from '@/components/public/motion'
import { Building2, TrendingUp, ShieldCheck, Handshake, Video, ArrowUpRight, Phone } from 'lucide-react'

const EMERALD = '#3f7d5a'
const CAL = 'https://calendar.app.google/Lsb5v4UTcRn3eZh36'

const PILLARS = [
  {
    icon: Building2,
    title: 'Income-producing assets',
    body: 'Industrial, retail, medical, and mixed-use — real property that pays. We focus on the fundamentals that drive commercial value: tenancy, lease terms, location, and cap rate.',
  },
  {
    icon: Handshake,
    title: 'Buyer-side representation',
    body: 'We represent the buyer — sourcing the asset, running the numbers, and negotiating the acquisition on your behalf. Your interests, start to close.',
  },
  {
    icon: TrendingUp,
    title: 'A path from residential',
    body: 'Many commercial buyers start as tired landlords. Through a 1031 exchange, we help residential investors roll their equity into cleaner, higher-performing commercial assets.',
  },
  {
    icon: ShieldCheck,
    title: 'Steady, hands-off ownership',
    body: 'Triple-net leases, long terms, and business tenants who protect the property their livelihood depends on — commercial ownership that doesn’t call you at 2 a.m.',
  },
]

export default function ServiceCommercial() {
  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="services" />

      {/* HERO */}
      <ParallaxHero minH="76vh" accent="blue">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <div className="mp-anim mp-mono text-[11px] uppercase tracking-[0.28em] mb-6" style={{ color: EMERALD, animationDelay: '0.1s' }}>
              McMullen Commercial
            </div>
            <h1 className="mp-anim mp-serif text-white text-[44px] md:text-[64px] leading-[1.03] font-semibold" style={{ animationDelay: '0.2s' }}>
              A dedicated <span className="mp-accent">commercial</span> arm.
            </h1>
            <p className="mp-anim text-lg md:text-xl mt-7 leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', animationDelay: '0.35s', maxWidth: '640px' }}>
              Beyond residential, McMullen Commercial represents buyers acquiring income-producing
              industrial and commercial real estate — from sourcing the asset to closing the deal.
              Real transactions, real representation.
            </p>
            <div className="mp-anim flex flex-wrap gap-3 mt-9" style={{ animationDelay: '0.5s' }}>
              <PillButton href={CAL} onDark>
                <Video className="w-4 h-4" /> Schedule a video call with Tim
              </PillButton>
              <PillButton href="#track-record" variant="secondary" onDark>
                See recent closings
              </PillButton>
            </div>
          </div>
        </div>
      </ParallaxHero>

      <div style={{ background: NAVY_DEEP }}>
        <Marquee items={[
          'Industrial acquisitions',
          'Buyer-side representation',
          'Triple-net (NNN) leases',
          'Higher cap rates',
          '1031 exchange strategy',
          'Income-producing assets',
        ]} />
      </div>

      {/* PILLARS */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: EMERALD }}>
            What we do
          </div>
          <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
            Commercial real estate, done right.
          </h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-5 mt-12">
          {PILLARS.map((p, i) => {
            const Icon = p.icon
            return (
              <Reveal key={p.title} delay={0.05 * i}>
                <div className="mp-lift rounded-[24px] border border-black/[0.07] bg-white p-8 h-full">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(63,125,90,0.1)' }}>
                    <Icon className="w-5 h-5" style={{ color: EMERALD }} />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight" style={{ color: NAVY }}>{p.title}</h3>
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: INK }}>{p.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* TRACK RECORD — shared DB-backed component */}
      <section id="track-record" style={{ background: '#f4f8f5' }}>
        <CommercialShowcase
          eyebrow="Track record"
          heading="Real deals, already closed."
          intro="A dedicated commercial arm with transactions on the board — buyer-side representation on income-producing industrial assets."
        />
      </section>

      {/* 1031 BRIDGE */}
      <section className="max-w-4xl mx-auto px-6 py-20 md:py-24 text-center">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-4" style={{ color: EMERALD }}>
            From landlord to investor
          </div>
          <h2 className="mp-serif text-[30px] md:text-[44px] leading-[1.08] font-semibold" style={{ color: NAVY }}>
            Own a rental? There’s a bridge to commercial.
          </h2>
          <p className="mt-6 text-[17px] leading-relaxed" style={{ color: INK }}>
            A 1031 exchange lets you roll the equity from a residential rental into a
            better-performing commercial asset — deferring the capital gains tax along the way.
            It’s the most common path our commercial buyers take.
          </p>
          <div className="mt-8">
            <PillButton href="/services/1031-exchange">
              Explore the 1031 strategy <ArrowUpRight className="w-4 h-4" />
            </PillButton>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section style={{ background: NAVY }}>
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: '#8fd3b6' }}>
              Buying or selling commercial?
            </div>
            <h2 className="mp-serif text-white text-[36px] md:text-[52px] leading-[1.05] font-semibold">
              Let’s talk on a <span className="mp-accent">video call</span>.
            </h2>
            <p className="mt-6 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
              Bring the opportunity — an asset you’re eyeing, a rental you want to exchange, or a
              market you want to enter — and we’ll map the move together.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-9">
              <PillButton href={CAL} onDark>
                <Video className="w-4 h-4" /> Schedule a video call with Tim
              </PillButton>
              <PillButton href="tel:+14156919272" variant="secondary" onDark>
                <Phone className="w-4 h-4" /> (415) 691-9272
              </PillButton>
            </div>
          </Reveal>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
