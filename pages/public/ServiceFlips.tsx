// Bespoke service page: Flips & Off-Market.
//
// Expanded to the Luxury/1031 standard: keeps the interactive deal-pipeline
// stepper, adds an off-market thesis, a "where deals come from" sourcing grid,
// a deal-underwriting breakdown, an FAQ, and the consistent video-call CTA.

import { useState } from 'react'
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
  LOGO_BLUE,
} from '@/components/public/motion'
import {
  Search,
  Calculator,
  Hammer,
  Tag,
  ArrowUpRight,
  ChevronRight,
  Video,
  Phone,
  Plus,
  Minus,
  Home,
  Clock,
  Mail,
  TrendingUp,
} from 'lucide-react'

const STEEL = LOGO_BLUE // #4f82b9
const CAL = 'https://calendar.app.google/Lsb5v4UTcRn3eZh36'

const STAGES = [
  { icon: Search, title: 'Source off-market', body: 'I surface deals before they hit the MLS — distressed, pre-probate, tired rentals, and owners quietly ready to sell. This is where the margin is made, before a bidding war ever starts.' },
  { icon: Calculator, title: 'Underwrite the numbers', body: 'Full ROI analysis: purchase, rehab budget, holding costs, financing, and a conservative after-repair value. If the math doesn’t clear our margin threshold, we walk — discipline is the edge.' },
  { icon: Hammer, title: 'Renovate strategically', body: 'The rehab is scoped for resale, not perfection — spend where buyers pay, skip where they don’t. Managed contractors, honest timeline, tight cost control.' },
  { icon: Tag, title: 'Sell at peak', body: 'The finished home gets the full marketing treatment — staged, filmed, and launched to create competitive demand and capture top of market.' },
]

function Pipeline() {
  const [step, setStep] = useState(0)
  const pct = (step / (STAGES.length - 1)) * 100
  const Active = STAGES[step].icon
  return (
    <div className="rounded-[28px] border border-black/[0.08] bg-white p-8 md:p-10" style={{ boxShadow: '0 30px 80px -44px rgba(13,27,42,0.4)' }}>
      <div className="relative mb-10">
        <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full" style={{ background: 'rgba(79,130,185,0.15)' }} />
        <div className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: STEEL }} />
        <div className="relative flex justify-between">
          {STAGES.map((s, i) => (
            <button key={s.title} onClick={() => setStep(i)} className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 z-10"
              style={{ background: i <= step ? STEEL : '#fff', color: i <= step ? '#fff' : INK, border: `2px solid ${i <= step ? STEEL : 'rgba(79,130,185,0.3)'}` }} aria-label={s.title}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>
      <Reveal key={step}>
        <div className="flex items-start gap-5">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(79,130,185,0.12)' }}>
            <Active className="w-6 h-6" style={{ color: STEEL }} />
          </div>
          <div>
            <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mb-1" style={{ color: STEEL }}>Stage {step + 1} of {STAGES.length}</div>
            <h3 className="mp-serif text-2xl font-semibold" style={{ color: NAVY }}>{STAGES[step].title}</h3>
            <p className="text-[15px] mt-3 leading-relaxed" style={{ color: INK }}>{STAGES[step].body}</p>
          </div>
        </div>
      </Reveal>
      <div className="flex justify-end mt-8">
        <button onClick={() => setStep((s) => (s + 1) % STAGES.length)} className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5" style={{ background: NAVY, color: '#fff' }}>
          {step === STAGES.length - 1 ? 'Start over' : 'Next stage'} <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

const SOURCES = [
  { icon: Home, title: 'Tired rentals & landlords', body: 'Owners worn down by tenants and maintenance — often ready to sell quietly for a clean, fast close rather than list.' },
  { icon: Clock, title: 'Pre-probate & life events', body: 'Estates, relocations, and change-of-life situations where speed and certainty matter more than squeezing the last dollar on the open market.' },
  { icon: Mail, title: 'Direct-to-owner outreach', body: 'Targeted campaigns to owners of homes that fit a flip profile — reaching sellers before they ever call an agent.' },
  { icon: TrendingUp, title: 'Agent & investor network', body: 'A network that trades pocket listings and off-market opportunities before they’re ever advertised.' },
]

function FAQItem({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(i === 0)
  return (
    <div className="rounded-[18px] border border-black/[0.08] bg-white overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-4 text-left p-5 md:p-6">
        <span className="font-semibold" style={{ color: NAVY }}>{q}</span>
        <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: open ? STEEL : 'rgba(79,130,185,0.1)' }}>
          {open ? <Minus className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4" style={{ color: STEEL }} />}
        </span>
      </button>
      <div className="grid transition-all duration-400 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden"><p className="px-5 md:px-6 pb-6 text-[15px] leading-relaxed" style={{ color: INK }}>{a}</p></div>
      </div>
    </div>
  )
}
const FAQS = [
  { q: 'Do I need to be an experienced investor?', a: 'No. Whether it’s your first flip or your fifteenth, I bring the deal, the numbers, and the rehab plan. First-timers get more hand-holding on scope and contractor management; experienced investors get faster deal flow.' },
  { q: 'How are the deals actually off-market?', a: 'They come from direct-to-owner outreach, a pre-probate and life-event pipeline, tired-landlord conversations, and an agent/investor network trading pocket listings — sourced before anything is advertised, so you’re not bidding against the whole MLS.' },
  { q: 'What if the numbers don’t work?', a: 'Then we don’t buy it. Every deal is underwritten to a conservative after-repair value with real rehab and holding costs. Discipline on the buy is where flip profit is actually made — I’d rather pass than chase a thin deal.' },
  { q: 'Can you also handle the resale?', a: 'Yes. The finished home gets the full listing treatment — staging, photography, film, and a launch built to create competitive demand and capture top of market.' },
]

export default function ServiceFlips() {
  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="services" />

      <ParallaxHero minH="74vh" accent="blue">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <div className="mp-anim mp-mono text-[11px] uppercase tracking-[0.28em] mb-6" style={{ color: STEEL, animationDelay: '0.1s' }}>
              Flips & Off-Market · For Investors
            </div>
            <h1 className="mp-anim mp-serif text-white text-[46px] md:text-[64px] leading-[1.03] font-semibold" style={{ animationDelay: '0.2s' }}>
              The deals that never <span className="mp-accent">hit the market</span>.
            </h1>
            <p className="mp-anim text-lg md:text-xl mt-7 leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', animationDelay: '0.35s', maxWidth: '640px' }}>
              The best flips are bought before anyone else sees them. I bring exclusive access to
              off-market properties vetted for flip potential — with full ROI analysis, a rehab
              plan, and an exit strategy before you ever write an offer.
            </p>
            <div className="mp-anim flex flex-wrap gap-3 mt-9" style={{ animationDelay: '0.5s' }}>
              <PillButton href={CAL} onDark>
                <Video className="w-4 h-4" /> Schedule a video call with Tim
              </PillButton>
              <PillButton href="#pipeline" variant="secondary" onDark>
                See how a flip gets made
              </PillButton>
            </div>
          </div>
        </div>
      </ParallaxHero>

      <div style={{ background: NAVY_DEEP }}>
        <Marquee items={['Off-market sourcing', 'Conservative underwriting', 'Rehab scoped for resale', 'Full ROI on every deal', 'Exit strategy first', 'Deals before the MLS']} />
      </div>

      {/* stats */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { v: 1, prefix: '$', suffix: 'M+', label: 'Margins on tear-down rehabs' },
            { v: 50, suffix: '+', label: 'Transactions closed' },
            { raw: 'Off-market', label: 'Deal sourcing' },
            { raw: 'Full ROI', label: 'Analysis on every deal' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={0.06 * i}>
              <div className="mp-serif text-[38px] md:text-[52px] font-semibold leading-none" style={{ color: NAVY }}>
                <CountUp value={s.v} prefix={s.prefix} suffix={s.suffix} raw={s.raw} />
              </div>
              <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mt-3" style={{ color: INK }}>{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* thesis */}
      <section style={{ background: '#f4f7fb' }}>
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: STEEL }}>The edge</div>
            <h2 className="mp-serif text-[30px] md:text-[46px] leading-[1.12] font-semibold" style={{ color: NAVY }}>
              Flip profit is made on the buy — not the sale.
            </h2>
            <p className="mt-7 leading-relaxed text-[17px]" style={{ color: INK }}>
              By the time a fixer hits the open market, the margin has usually been bid away. The
              investors who win consistently aren’t the ones who renovate best — they’re the ones
              who get to the deal first and underwrite it coldly. That’s the whole game: proprietary
              deal flow, and the discipline to walk when the numbers don’t clear.
            </p>
          </Reveal>
        </div>
      </section>

      {/* interactive pipeline */}
      <section id="pipeline" className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: STEEL }}>Click through the pipeline</div>
          <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold mb-10" style={{ color: NAVY }}>How a flip gets made.</h2>
        </Reveal>
        <Reveal delay={0.1}><Pipeline /></Reveal>
      </section>

      {/* where deals come from */}
      <section style={{ background: '#f4f7fb' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: STEEL }}>Where the deals come from</div>
            <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>Proprietary deal flow, not the MLS.</h2>
            <p className="mt-5 text-[17px] leading-relaxed max-w-2xl" style={{ color: INK }}>
              Off-market isn’t luck — it’s a system. Here’s where the opportunities actually
              originate before they’re ever advertised.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-5 mt-12">
            {SOURCES.map((s, i) => {
              const Icon = s.icon
              return (
                <Reveal key={s.title} delay={0.05 * i}>
                  <div className="mp-lift rounded-[24px] bg-white border border-black/[0.07] p-8 h-full">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(79,130,185,0.12)' }}>
                      <Icon className="w-5 h-5" style={{ color: STEEL }} />
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight" style={{ color: NAVY }}>{s.title}</h3>
                    <p className="text-sm mt-3 leading-relaxed" style={{ color: INK }}>{s.body}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-6 py-20 md:py-24">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: STEEL }}>Common questions</div>
          <h2 className="mp-serif text-[30px] md:text-[44px] leading-[1.05] font-semibold" style={{ color: NAVY }}>Good to know.</h2>
        </Reveal>
        <div className="mt-10 flex flex-col gap-3">
          {FAQS.map((f, i) => <Reveal key={f.q} delay={0.04 * i}><FAQItem q={f.q} a={f.a} i={i} /></Reveal>)}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: NAVY }}>
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: '#a8c5e6' }}>Ready to see deals first?</div>
            <h2 className="mp-serif text-white text-[36px] md:text-[52px] leading-[1.05] font-semibold">
              Get on the <span className="mp-accent">deal list</span>.
            </h2>
            <p className="mt-6 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
              Join the off-market list and I’ll bring you vetted flip opportunities before they’re
              public — with the numbers already run. Let’s talk on a quick video call.
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
