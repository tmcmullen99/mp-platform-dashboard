// Bespoke service page: Flips & Off-Market.
// Interactive centerpiece: a deal-pipeline stepper. Click through the stages of
// a flip and an animated rail fills to show progress from source to sale.

import { useState } from 'react'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import {
  MotionStyles,
  Reveal,
  CountUp,
  ParallaxHero,
  PillButton,
  NAVY,
  INK,
  LOGO_BLUE,
} from '@/components/public/motion'
import { Search, Calculator, Hammer, Tag, ArrowUpRight, ChevronRight } from 'lucide-react'

const STEEL = LOGO_BLUE // #4f82b9

const STAGES = [
  { icon: Search, title: 'Source off-market', body: 'I surface deals before they hit the MLS — distressed, pre-probate, tired rentals, and owners quietly ready to sell. This is where the margin is made.' },
  { icon: Calculator, title: 'Underwrite the numbers', body: 'Full ROI analysis: purchase, rehab budget, holding costs, and a conservative after-repair value. If the math doesn\u2019t work, we walk.' },
  { icon: Hammer, title: 'Renovate strategically', body: 'The rehab is scoped for resale, not perfection — spend where buyers pay, skip where they don\u2019t. Managed contractors, honest timeline.' },
  { icon: Tag, title: 'Sell at peak', body: 'The finished home gets the full marketing treatment — staged, filmed, and launched to create competitive demand.' },
]

function Pipeline() {
  const [step, setStep] = useState(0)
  const pct = (step / (STAGES.length - 1)) * 100
  const Active = STAGES[step].icon
  return (
    <div className="rounded-[28px] border border-black/[0.08] bg-white p-8 md:p-10" style={{ boxShadow: '0 30px 80px -44px rgba(13,27,42,0.4)' }}>
      {/* rail */}
      <div className="relative mb-10">
        <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full" style={{ background: 'rgba(79,130,185,0.15)' }} />
        <div className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: STEEL }} />
        <div className="relative flex justify-between">
          {STAGES.map((s, i) => (
            <button
              key={s.title}
              onClick={() => setStep(i)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 z-10"
              style={{
                background: i <= step ? STEEL : '#fff',
                color: i <= step ? '#fff' : INK,
                border: `2px solid ${i <= step ? STEEL : 'rgba(79,130,185,0.3)'}`,
              }}
              aria-label={s.title}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* active stage */}
      <Reveal key={step}>
        <div className="flex items-start gap-5">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(79,130,185,0.12)' }}>
            <Active className="w-6 h-6" style={{ color: STEEL }} />
          </div>
          <div>
            <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mb-1" style={{ color: STEEL }}>
              Stage {step + 1} of {STAGES.length}
            </div>
            <h3 className="mp-serif text-2xl font-semibold" style={{ color: NAVY }}>{STAGES[step].title}</h3>
            <p className="text-[15px] mt-3 leading-relaxed" style={{ color: INK }}>{STAGES[step].body}</p>
          </div>
        </div>
      </Reveal>

      <div className="flex justify-end mt-8">
        <button
          onClick={() => setStep((s) => (s + 1) % STAGES.length)}
          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5"
          style={{ background: NAVY, color: '#fff' }}
        >
          {step === STAGES.length - 1 ? 'Start over' : 'Next stage'} <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function ServiceFlips() {
  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="services" />

      <ParallaxHero minH="68vh" accent="blue">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <div className="mp-anim mp-mono text-[11px] uppercase tracking-[0.28em] mb-6" style={{ color: STEEL, animationDelay: '0.1s' }}>
              Flips & Off-Market · For Investors
            </div>
            <h1 className="mp-anim mp-serif text-white text-[46px] md:text-[64px] leading-[1.03] font-semibold" style={{ animationDelay: '0.2s' }}>
              The deals that never <span className="mp-accent">hit the market</span>.
            </h1>
            <p className="mp-anim text-lg md:text-xl mt-7 leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)', animationDelay: '0.35s', maxWidth: '620px' }}>
              The best flips are bought before anyone else sees them. I bring exclusive access to
              off-market properties vetted for flip potential — with full ROI analysis, a rehab
              plan, and an exit strategy before you ever write an offer.
            </p>
            <div className="mp-anim flex flex-wrap gap-3 mt-9" style={{ animationDelay: '0.5s' }}>
              <PillButton href="https://calendar.app.google/Lsb5v4UTcRn3eZh36" onDark>
                Get on the deal list <ArrowUpRight className="w-4 h-4" />
              </PillButton>
            </div>
          </div>
        </div>
      </ParallaxHero>

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

      {/* interactive pipeline */}
      <section style={{ background: '#f4f7fb' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: STEEL }}>
              Click through the pipeline
            </div>
            <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold mb-10" style={{ color: NAVY }}>
              How a flip gets made.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Pipeline />
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: NAVY }}>
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <Reveal>
            <h2 className="mp-serif text-white text-[36px] md:text-[52px] leading-[1.05] font-semibold">
              See deals <span className="mp-accent">first</span>.
            </h2>
            <p className="mt-6 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Join the off-market list and I'll bring you vetted flip opportunities before they're
              public — with the numbers already run.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-9">
              <PillButton href="https://calendar.app.google/Lsb5v4UTcRn3eZh36" onDark>
                Get on the list <ArrowUpRight className="w-4 h-4" />
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
