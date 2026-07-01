// Bespoke service page: 1031 Exchange.
// Interactive centerpiece: a capital-gains deferral calculator. The visitor
// sets sale price + basis with sliders and sees the deferred tax update live.

import { useState, useMemo } from 'react'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import {
  MotionStyles,
  Reveal,
  ParallaxHero,
  PillButton,
  NAVY,
  INK,
} from '@/components/public/motion'
import { TrendingUp, Building2, Repeat, ArrowUpRight } from 'lucide-react'

const EMERALD = '#3f7d5a'

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n).toLocaleString()}`

// Illustrative blended CA + federal cap-gains + NIIT + depreciation recapture.
// Explicitly labeled an estimate; real numbers require a CPA.
const EFFECTIVE_RATE = 0.33

function DeferralCalculator() {
  const [sale, setSale] = useState(3_000_000)
  const [basis, setBasis] = useState(1_200_000)
  const gain = Math.max(sale - basis, 0)
  const deferred = Math.round(gain * EFFECTIVE_RATE)
  const reinvest = sale // full sale proceeds can be redeployed pre-tax

  return (
    <div className="rounded-[28px] border border-black/[0.08] bg-white p-8 md:p-10" style={{ boxShadow: '0 30px 80px -44px rgba(13,27,42,0.4)' }}>
      <div className="grid md:grid-cols-2 gap-10">
        {/* controls */}
        <div>
          <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mb-6" style={{ color: EMERALD }}>
            Estimate your deferral
          </div>

          <label className="block mb-7">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm font-medium" style={{ color: NAVY }}>Sale price</span>
              <span className="mp-serif text-xl font-semibold" style={{ color: NAVY }}>{fmt(sale)}</span>
            </div>
            <input
              type="range" min={500_000} max={20_000_000} step={100_000} value={sale}
              onChange={(e) => { const v = +e.target.value; setSale(v); if (basis > v) setBasis(v) }}
              className="w-full" style={{ accentColor: EMERALD }}
            />
          </label>

          <label className="block">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm font-medium" style={{ color: NAVY }}>Your cost basis</span>
              <span className="mp-serif text-xl font-semibold" style={{ color: NAVY }}>{fmt(basis)}</span>
            </div>
            <input
              type="range" min={100_000} max={sale} step={100_000} value={basis}
              onChange={(e) => setBasis(+e.target.value)}
              className="w-full" style={{ accentColor: EMERALD }}
            />
            <div className="mp-mono text-[10px] uppercase tracking-[0.14em] mt-2" style={{ color: INK }}>
              What you originally paid + improvements
            </div>
          </label>
        </div>

        {/* live result */}
        <div className="rounded-[22px] p-8 flex flex-col justify-center" style={{ background: NAVY }}>
          <div className="mp-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Estimated tax deferred
          </div>
          <div className="mp-serif text-[46px] md:text-[56px] font-semibold leading-none mt-2 transition-all" style={{ color: '#fff' }}>
            {fmt(deferred)}
          </div>
          <div className="h-px my-6" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Capital gain</span>
            <span className="font-semibold text-white">{fmt(gain)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Redeployable pre-tax</span>
            <span className="font-semibold" style={{ color: '#8fd3b6' }}>{fmt(reinvest)}</span>
          </div>
        </div>
      </div>
      <p className="mp-mono text-[10px] uppercase tracking-[0.13em] mt-6" style={{ color: INK }}>
        Illustrative estimate at a ~33% blended rate. Not tax advice — your CPA confirms actual figures.
      </p>
    </div>
  )
}

export default function Service1031() {
  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="services" />

      <ParallaxHero minH="68vh" accent="blue">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <div className="mp-anim mp-mono text-[11px] uppercase tracking-[0.28em] mb-6" style={{ color: EMERALD, animationDelay: '0.1s' }}>
              1031 Exchange · For Investors
            </div>
            <h1 className="mp-anim mp-serif text-white text-[46px] md:text-[64px] leading-[1.03] font-semibold" style={{ animationDelay: '0.2s' }}>
              Sell, reinvest, and <span className="mp-accent">defer the tax</span>.
            </h1>
            <p className="mp-anim text-lg md:text-xl mt-7 leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)', animationDelay: '0.35s', maxWidth: '620px' }}>
              A 1031 exchange lets you roll the full proceeds of an investment sale into a new
              property — deferring capital gains and putting money that would've gone to taxes back
              to work. I help you exchange into higher-cap-rate commercial assets and NNN leases.
            </p>
            <div className="mp-anim flex flex-wrap gap-3 mt-9" style={{ animationDelay: '0.5s' }}>
              <PillButton href="https://calendar.app.google/Lsb5v4UTcRn3eZh36" onDark>
                Plan an exchange <ArrowUpRight className="w-4 h-4" />
              </PillButton>
            </div>
          </div>
        </div>
      </ParallaxHero>

      {/* interactive calculator */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: EMERALD }}>
            Run the numbers
          </div>
          <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold mb-10" style={{ color: NAVY }}>
            What could you defer?
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <DeferralCalculator />
        </Reveal>
      </section>

      {/* how it works */}
      <section style={{ background: '#f4f8f5' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: EMERALD }}>
              The mechanics
            </div>
            <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
              How an exchange works.
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5 mt-12">
            {[
              { icon: TrendingUp, n: '01', title: 'Sell your investment property', body: 'Proceeds go to a qualified intermediary — never to you directly — which keeps the exchange valid.' },
              { icon: Building2, n: '02', title: 'Identify replacements in 45 days', body: 'We line up higher-yield targets — commercial, NNN-leased, or multi-family — before the clock runs.' },
              { icon: Repeat, n: '03', title: 'Close within 180 days', body: 'Roll the full amount into the new asset, deferring the capital gains you\u2019d otherwise owe.' },
            ].map((s, i) => {
              const Icon = s.icon
              return (
                <Reveal key={s.n} delay={0.07 * i}>
                  <div className="mp-lift rounded-[24px] bg-white border border-black/[0.07] p-8 h-full">
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(63,125,90,0.12)' }}>
                        <Icon className="w-5 h-5" style={{ color: EMERALD }} />
                      </div>
                      <span className="mp-serif text-3xl font-semibold" style={{ color: 'rgba(63,125,90,0.25)' }}>{s.n}</span>
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

      {/* CTA */}
      <section style={{ background: NAVY }}>
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <Reveal>
            <h2 className="mp-serif text-white text-[36px] md:text-[52px] leading-[1.05] font-semibold">
              Keep your gains <span className="mp-accent">working</span>.
            </h2>
            <p className="mt-6 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Let's map out an exchange before your sale closes — timing is everything with a 1031.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-9">
              <PillButton href="https://calendar.app.google/Lsb5v4UTcRn3eZh36" onDark>
                Schedule a strategy call <ArrowUpRight className="w-4 h-4" />
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
