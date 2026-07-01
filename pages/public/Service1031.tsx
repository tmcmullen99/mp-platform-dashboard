// Bespoke service page: 1031 Exchange.
//
// Thesis (rewritten): convert a tired residential LANDLORD into a hands-off
// COMMERCIAL investor. Every Zillow rental listing is a prospect — someone
// already willing to be a landlord, who could instead exchange into a better
// asset. The page builds desire step by step: the pain of residential
// landlording → the reframe ("put a tenant in it, then exchange it") →
// residential vs commercial → the deferral calculator → extensive 1031 detail
// → Delaware Statutory Trusts (zero-effort) → the mechanics → schedule a video
// call with Tim.
//
// Keeps the emerald-accented interactive deferral calculator from the prior
// version. Inherits the motionsites vocabulary.

import { useState } from 'react'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import CommercialShowcase from '@/components/public/CommercialShowcase'
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
import {
  TrendingUp,
  Building2,
  Repeat,
  ArrowUpRight,
  ArrowRight,
  Phone,
  Wrench,
  Moon,
  MapPin,
  FileText,
  ShieldCheck,
  Landmark,
  Video,
  Check,
  X as XIcon,
  Plus,
  Minus,
} from 'lucide-react'

const EMERALD = '#3f7d5a'
const CAL = 'https://calendar.app.google/Lsb5v4UTcRn3eZh36'

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n).toLocaleString()}`

const EFFECTIVE_RATE = 0.33

/* --------------------------- deferral calculator --------------------------- */
function DeferralCalculator() {
  const [sale, setSale] = useState(3_000_000)
  const [basis, setBasis] = useState(1_200_000)
  const gain = Math.max(sale - basis, 0)
  const deferred = Math.round(gain * EFFECTIVE_RATE)
  const reinvest = sale

  return (
    <div className="rounded-[28px] border border-black/[0.08] bg-white p-8 md:p-10" style={{ boxShadow: '0 30px 80px -44px rgba(13,27,42,0.4)' }}>
      <div className="grid md:grid-cols-2 gap-10">
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

/* ------------------------------- pain points ------------------------------- */
const PAINS = [
  { icon: Moon, title: 'The 2 a.m. phone call', body: 'A burst pipe, a dead water heater, a locked-out tenant. Residential landlording never really sleeps — and every emergency is yours.' },
  { icon: Wrench, title: 'Endless maintenance', body: 'Turnovers, repairs, appliances, paint, make-readies between tenants. The property is only truly "passive" until something breaks — which is always.' },
  { icon: MapPin, title: 'Impossible from out of state', body: 'Move away and every toilet becomes a logistics problem. Managing a rental from another state means a property manager eating your margin — or 2 a.m. calls you can’t answer.' },
]

/* -------------------- residential vs commercial comparison ----------------- */
const COMPARE = [
  { label: 'Who maintains the building', res: 'You do — roof, HVAC, plumbing, appliances', com: 'The tenant does, under a triple-net (NNN) lease', comWins: true },
  { label: 'Tenant incentive', res: 'Tenants have no stake in the property’s condition', com: 'A business protects the storefront its livelihood depends on', comWins: true },
  { label: 'Cash flow', res: 'Lumpy — vacancies, turnover, surprise repairs', com: 'Steady — long leases with scheduled rent increases', comWins: true },
  { label: 'Lease length', res: '12 months, then re-market and hope', com: '5–15+ years, often with renewal options', comWins: true },
  { label: 'Emergency calls', res: 'Constant — the toilet is always your problem', com: 'Rare — the tenant handles day-to-day operations', comWins: true },
  { label: 'Managing out of state', res: 'Stressful — needs boots on the ground', com: 'Genuinely hands-off — no midnight logistics', comWins: true },
  { label: 'Typical cap rate', res: 'Often compressed in residential markets', com: 'Frequently higher — more income per dollar invested', comWins: true },
]

/* --------------------------- 1031 detail sections -------------------------- */
const RULES = [
  { icon: FileText, title: 'Like-kind is broad', body: 'For real estate, "like-kind" is generous: nearly any investment or business real property exchanges for nearly any other. A single-family rental can become a retail strip, a medical office, an industrial building, or a share of a large institutional asset.' },
  { icon: TrendingUp, title: 'The 45-day identification window', body: 'From the day your sale closes, you have 45 calendar days to formally identify replacement properties in writing. Preparation before you sell is everything — we line up targets in advance so the clock is never the enemy.' },
  { icon: Repeat, title: 'The 180-day closing window', body: 'You must close on the replacement within 180 days of the sale. Both clocks run at once, so the identification and the closing are planned as one sequence, not two.' },
  { icon: ShieldCheck, title: 'The qualified intermediary', body: 'You can never touch the sale proceeds — they flow to a qualified intermediary (QI) who holds them and delivers them into the replacement purchase. Touch the money and the exchange collapses. We coordinate the QI so this is airtight.' },
  { icon: Landmark, title: 'Avoiding "boot"', body: 'To defer 100% of the gain, you generally reinvest all the proceeds and replace the debt. Any cash or debt relief you keep ("boot") is taxable. We structure the trade so you defer the maximum — or knowingly choose otherwise.' },
  { icon: Building2, title: 'Depreciation keeps compounding', body: 'A 1031 also defers depreciation recapture, and the new asset resets a fresh depreciation schedule — more paper losses shielding your new income. Done repeatedly, gains roll forward for decades.' },
]

/* -------------------------------- FAQ cards -------------------------------- */
function FAQItem({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(i === 0)
  return (
    <div className="rounded-[18px] border border-black/[0.08] bg-white overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-4 text-left p-5 md:p-6">
        <span className="font-semibold" style={{ color: NAVY }}>{q}</span>
        <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: open ? EMERALD : 'rgba(63,125,90,0.1)' }}>
          {open ? <Minus className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4" style={{ color: EMERALD }} />}
        </span>
      </button>
      <div className="grid transition-all duration-400 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden">
          <p className="px-5 md:px-6 pb-6 text-[15px] leading-relaxed" style={{ color: INK }}>{a}</p>
        </div>
      </div>
    </div>
  )
}
const FAQS = [
  { q: 'Do I have to find the new property myself?', a: 'No. That’s the job. I source higher-performing replacement assets — NNN-leased retail, medical, industrial, or a Delaware Statutory Trust — and have targets ready before your sale even closes, so the 45-day clock is never a scramble.' },
  { q: 'What if I don’t want to manage anything at all?', a: 'Then a Delaware Statutory Trust (DST) is likely your answer. You exchange into a fractional share of large, professionally managed institutional real estate and simply collect distributions. Zero tenants, zero toilets, zero calls. More below.' },
  { q: 'Can I exchange one rental into several properties?', a: 'Yes. You can diversify one tired rental into multiple assets — or several rentals into one larger, cleaner commercial holding. The structure is flexible; the strategy is what matters.' },
  { q: 'Is my capital gains tax really deferred, not just delayed a year?', a: 'Deferred for as long as you keep exchanging. Roll asset into asset and the gain keeps moving forward. Many investors never pay it in their lifetime — heirs can receive a stepped-up basis. Your CPA and estate attorney confirm specifics.' },
]



export default function Service1031() {
  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="services" />

      {/* HERO */}
      <ParallaxHero minH="80vh" accent="blue">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <div className="mp-anim mp-mono text-[11px] uppercase tracking-[0.28em] mb-6" style={{ color: EMERALD, animationDelay: '0.1s' }}>
              1031 Exchange · From Landlord to Investor
            </div>
            <h1 className="mp-anim mp-serif text-white text-[44px] md:text-[64px] leading-[1.03] font-semibold" style={{ animationDelay: '0.2s' }}>
              Stop being a landlord.
              <br />
              Start being an <span className="mp-accent">investor</span>.
            </h1>
            <p className="mp-anim text-lg md:text-xl mt-7 leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', animationDelay: '0.35s', maxWidth: '640px' }}>
              Put a tenant in the property — then let’s exchange it for a better-performing asset.
              A 1031 lets you roll the full proceeds of a rental sale into steady, hands-off
              commercial real estate, deferring every dollar of capital gains tax along the way.
            </p>
            <div className="mp-anim flex flex-wrap gap-3 mt-9" style={{ animationDelay: '0.5s' }}>
              <PillButton href={CAL} onDark>
                <Video className="w-4 h-4" /> Schedule a video call with Tim
              </PillButton>
              <PillButton href="#compare" variant="secondary" onDark>
                See the difference
              </PillButton>
            </div>
          </div>
        </div>
      </ParallaxHero>

      <div style={{ background: NAVY_DEEP }}>
        <Marquee items={[
          'Steady cash flow',
          'Triple-net (NNN) leases',
          'Hands-off tenants',
          'Higher cap rates',
          'Zero-effort DSTs',
          'Defer 100% of the gain',
        ]} />
      </div>

      {/* THE PAIN */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: EMERALD }}>
            If you own a rental, you already know
          </div>
          <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
            Being a landlord is a job you didn’t mean to take.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed max-w-2xl" style={{ color: INK }}>
            You bought an investment. What you got was a pager. Here’s the part nobody tells you
            when you list a rental on Zillow.
          </p>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {PAINS.map((p, i) => {
            const Icon = p.icon
            return (
              <Reveal key={p.title} delay={0.06 * i}>
                <div className="rounded-[24px] border border-black/[0.07] bg-white p-8 h-full">
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

      {/* THE REFRAME */}
      <section style={{ background: NAVY }}>
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: '#8fd3b6' }}>
              The reframe
            </div>
            <h2 className="mp-serif text-white text-[30px] md:text-[46px] leading-[1.12] font-semibold">
              &ldquo;Put a tenant in the property — then let’s exchange it for a better-performing asset.&rdquo;
            </h2>
            <p className="mt-7 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
              You don’t have to keep being the landlord. The moment your rental is tenanted and
              stabilized, it becomes the fuel for something better: a commercial asset that pays you
              without calling you. The 1031 exchange is the bridge — and it defers the tax so your
              full equity makes the jump.
            </p>
          </Reveal>
        </div>
      </section>

      {/* RESIDENTIAL VS COMMERCIAL */}
      <section id="compare" className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: EMERALD }}>
            Residential vs. commercial
          </div>
          <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
            Same equity. A completely different life.
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-12 rounded-[24px] border border-black/[0.08] overflow-hidden" style={{ boxShadow: '0 24px 70px -44px rgba(13,27,42,0.35)' }}>
            {/* header row */}
            <div className="grid grid-cols-[1.1fr_1fr_1fr]" style={{ background: NAVY }}>
              <div className="p-4 md:p-5" />
              <div className="p-4 md:p-5 text-center">
                <div className="mp-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.5)' }}>Residential rental</div>
              </div>
              <div className="p-4 md:p-5 text-center" style={{ background: 'rgba(63,125,90,0.25)' }}>
                <div className="mp-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: '#c7ebd8' }}>Commercial asset</div>
              </div>
            </div>
            {COMPARE.map((row, i) => (
              <div key={row.label} className="grid grid-cols-[1.1fr_1fr_1fr] items-center" style={{ background: i % 2 ? '#f7faf8' : '#fff' }}>
                <div className="p-4 md:p-5 text-sm font-medium" style={{ color: NAVY }}>{row.label}</div>
                <div className="p-4 md:p-5 text-[13.5px] flex items-start gap-2" style={{ color: INK }}>
                  <XIcon className="w-4 h-4 mt-0.5 shrink-0 opacity-40" />
                  <span>{row.res}</span>
                </div>
                <div className="p-4 md:p-5 text-[13.5px] flex items-start gap-2" style={{ background: 'rgba(63,125,90,0.06)', color: NAVY }}>
                  <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: EMERALD }} />
                  <span>{row.com}</span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* DEFERRAL CALCULATOR */}
      <section style={{ background: '#f4f8f5' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: EMERALD }}>
              Run the numbers
            </div>
            <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold mb-10" style={{ color: NAVY }}>
              What could you keep working instead of paying?
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <DeferralCalculator />
          </Reveal>
        </div>
      </section>

      {/* WHAT IS A 1031 — extensive detail */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: EMERALD }}>
            The full picture
          </div>
          <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
            Everything a 1031 exchange actually does.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed max-w-3xl" style={{ color: INK }}>
            Section 1031 of the tax code lets you sell an investment property and reinvest the
            proceeds into another — deferring the capital gains tax, the depreciation recapture,
            and the net investment income tax you’d otherwise owe. Done right, your entire equity
            keeps compounding instead of being cut by a third at the closing table. The rules are
            precise, and that precision is exactly where an experienced guide earns their keep.
          </p>
        </Reveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {RULES.map((r, i) => {
            const Icon = r.icon
            return (
              <Reveal key={r.title} delay={0.05 * i}>
                <div className="mp-lift rounded-[24px] border border-black/[0.07] bg-white p-7 h-full">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(63,125,90,0.1)' }}>
                    <Icon className="w-5 h-5" style={{ color: EMERALD }} />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight" style={{ color: NAVY }}>{r.title}</h3>
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: INK }}>{r.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* DELAWARE STATUTORY TRUSTS */}
      <section style={{ background: NAVY_DEEP }}>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-4" style={{ color: '#8fd3b6' }}>
                The zero-effort path
              </div>
              <h2 className="mp-serif text-white text-[30px] md:text-[46px] leading-[1.08] font-semibold">
                Want truly passive? Exchange into a Delaware Statutory Trust.
              </h2>
              <p className="mt-6 text-[16px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
                A DST is a fully-passive way to complete a 1031. Instead of buying and running a
                building yourself, you exchange your rental’s equity into a fractional share of
                large, institutional-grade real estate — think grocery-anchored retail, medical
                campuses, industrial distribution, or multifamily portfolios — professionally
                managed by seasoned sponsors. You own a beneficial interest and simply receive
                monthly distributions.
              </p>
              <ul className="mt-6 flex flex-col gap-2.5">
                {[
                  'No tenants, no maintenance, no 2 a.m. calls — ever',
                  'Qualifies for full 1031 tax deferral',
                  'Diversify one rental across several institutional properties',
                  'Truly hands-off from anywhere in the country',
                  'Access to assets normally reserved for large investors',
                ].map((li) => (
                  <li key={li} className="flex items-start gap-2.5 text-[14.5px]" style={{ color: 'rgba(255,255,255,0.88)' }}>
                    <ArrowRight className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#8fd3b6' }} />
                    {li}
                  </li>
                ))}
              </ul>
              <p className="mt-6 mp-mono text-[10px] uppercase tracking-[0.13em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                DSTs are securities sold through licensed representatives. We coordinate the right
                specialists — nothing here is an offer or tax advice.
              </p>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="rounded-[24px] p-8 md:p-10" style={{ background: 'linear-gradient(160deg, #16283c 0%, #0f1c2c 100%)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mb-6" style={{ color: '#8fd3b6' }}>
                  The whole job, done for you
                </div>
                {[
                  { n: '01', t: 'You sell the rental', d: 'We prep the sale and the exchange in parallel.' },
                  { n: '02', t: 'Equity flows to the QI', d: 'Never to you — keeping the 1031 valid.' },
                  { n: '03', t: 'It buys your DST shares', d: 'A fractional interest in institutional real estate.' },
                  { n: '04', t: 'You collect distributions', d: 'Passive income lands — with nothing to manage.' },
                ].map((s) => (
                  <div key={s.n} className="flex items-start gap-4 py-3 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <span className="mp-serif text-2xl font-semibold" style={{ color: 'rgba(143,211,182,0.4)' }}>{s.n}</span>
                    <div>
                      <div className="text-white font-semibold text-[15px]">{s.t}</div>
                      <div className="text-[13px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* THE MECHANICS (kept, expanded copy) */}
      <section style={{ background: '#f4f8f5' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: EMERALD }}>
              The mechanics
            </div>
            <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
              How the exchange runs, start to finish.
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5 mt-12">
            {[
              { icon: TrendingUp, n: '01', title: 'Sell your rental', body: 'Proceeds go straight to a qualified intermediary — never to you — which keeps the exchange valid from day one.' },
              { icon: Building2, n: '02', title: 'Identify in 45 days', body: 'We line up higher-yield targets — NNN commercial, medical, industrial, or a DST — in advance, so the clock is never a scramble.' },
              { icon: Repeat, n: '03', title: 'Close within 180 days', body: 'Roll the full amount into the new asset, deferring the capital gains and recapture you’d otherwise owe.' },
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

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-6 py-20 md:py-24">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: EMERALD }}>
            Common questions
          </div>
          <h2 className="mp-serif text-[30px] md:text-[44px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
            The things landlords ask first.
          </h2>
        </Reveal>
        <div className="mt-10 flex flex-col gap-3">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={0.04 * i}>
              <FAQItem q={f.q} a={f.a} i={i} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* McMULLEN COMMERCIAL — shared DB-backed track record */}
      <section style={{ background: '#f4f8f5' }}>
        <CommercialShowcase
          eyebrow="McMullen Commercial"
          heading="This isn’t theory. It’s already the work."
          intro="The same buyer-side discipline that guides a 1031 exchange out of a residential rental — McMullen Commercial represents buyers acquiring income-producing industrial and commercial assets. Recent closings:"
        />
      </section>

      {/* FINAL CTA — video call */}
      <section style={{ background: NAVY }}>
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: '#8fd3b6' }}>
              Ready to stop being a landlord?
            </div>
            <h2 className="mp-serif text-white text-[36px] md:text-[52px] leading-[1.05] font-semibold">
              Let’s map your exchange <span className="mp-accent">on a video call</span>.
            </h2>
            <p className="mt-6 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
              Bring your rental — address, roughly what you paid, what it’s worth now — and in
              one call we’ll sketch what it could become: the asset, the tax deferred, and whether a
              DST is your zero-effort path. Timing matters, so let’s talk before you sell.
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
