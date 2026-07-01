// Bespoke service page: Disclosure Review.
// Interactive centerpiece: "jargon → plain English" flip cards that translate
// real disclosure terms on click, plus an animated 55-document counter.

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
} from '@/components/public/motion'
import { FileText, AlertTriangle, DollarSign, Scale, ArrowUpRight, RefreshCw } from 'lucide-react'

const TEAL = '#2f8f83'

// Real disclosure jargon → what it actually means for the buyer.
const TRANSLATIONS = [
  {
    term: 'Section 1 Pest Report',
    plain: 'Active infestation or damage that a lender will usually require fixed before closing. This is your leverage to negotiate repairs or credits.',
  },
  {
    term: 'Natural Hazard Disclosure',
    plain: 'Whether the home sits in a flood, fire, or earthquake zone — which drives your insurance cost and, sometimes, whether you can insure it at all.',
  },
  {
    term: 'Preliminary Title Report',
    plain: 'Liens, easements, and who really has rights to the property. A missed easement here can mean a neighbor legally crosses your yard.',
  },
  {
    term: 'Seller Property Questionnaire',
    plain: 'What the seller knows but the inspection might miss — past leaks, deaths on property, neighbor disputes, unpermitted work.',
  },
  {
    term: 'Roof Certification',
    plain: 'Remaining roof life and whether a full replacement is looming — often a five-figure line item you can price into your offer.',
  },
  {
    term: 'HOA Reserve Study',
    plain: 'Whether the building has saved enough for big repairs, or whether a special assessment is about to land on your monthly dues.',
  },
]

function FlipCard({ term, plain, i }: { term: string; plain: string; i: number }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <Reveal delay={0.05 * i}>
      <button
        onClick={() => setFlipped((v) => !v)}
        className="w-full text-left group"
        style={{ perspective: '1200px' }}
        aria-label={`Translate ${term}`}
      >
        <div
          className="relative w-full h-[188px] transition-transform duration-500"
          style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}
        >
          {/* front — the jargon */}
          <div
            className="absolute inset-0 rounded-[22px] border border-black/[0.08] bg-white p-6 flex flex-col justify-between"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="mp-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: TEAL }}>
              Disclosure term
            </div>
            <div className="mp-serif text-2xl font-semibold" style={{ color: NAVY }}>
              {term}
            </div>
            <div className="mp-mono text-[10px] uppercase tracking-[0.14em] flex items-center gap-1.5" style={{ color: INK }}>
              <RefreshCw className="w-3.5 h-3.5" /> Tap to translate
            </div>
          </div>
          {/* back — plain english */}
          <div
            className="absolute inset-0 rounded-[22px] p-6 flex items-center"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: TEAL,
              color: '#fff',
            }}
          >
            <p className="text-[15px] leading-relaxed">{plain}</p>
          </div>
        </div>
      </button>
    </Reveal>
  )
}

export default function ServiceDisclosure() {
  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="services" />

      <ParallaxHero minH="70vh" accent="blue">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <div className="mp-anim mp-mono text-[11px] uppercase tracking-[0.28em] mb-6" style={{ color: TEAL, animationDelay: '0.1s' }}>
              Disclosure Review · For Buyers
            </div>
            <h1 className="mp-anim mp-serif text-white text-[46px] md:text-[64px] leading-[1.03] font-semibold" style={{ animationDelay: '0.2s' }}>
              55 documents. <br />One <span className="mp-accent">plain-English</span> read.
            </h1>
            <p className="mp-anim text-lg md:text-xl mt-7 leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)', animationDelay: '0.35s', maxWidth: '620px' }}>
              Who has time to decode 55 documents of real-estate jargon? No one. I translate the
              entire disclosure package into what it actually means — red flags, repair costs, and
              exactly where your negotiating leverage is.
            </p>
            <div className="mp-anim flex flex-wrap gap-3 mt-9" style={{ animationDelay: '0.5s' }}>
              <PillButton href="https://calendar.app.google/Lsb5v4UTcRn3eZh36" onDark>
                Get your disclosure review <ArrowUpRight className="w-4 h-4" />
              </PillButton>
            </div>
          </div>
        </div>
      </ParallaxHero>

      {/* stats */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { v: 55, suffix: '+', label: 'Documents reviewed' },
            { raw: '24hr', label: 'Turnaround' },
            { raw: 'Plain English', label: 'Every report' },
            { raw: '$0', label: 'Cost to my buyers' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={0.06 * i}>
              <div className="mp-serif text-[38px] md:text-[52px] font-semibold leading-none" style={{ color: NAVY }}>
                <CountUp value={s.v} suffix={s.suffix} raw={s.raw} />
              </div>
              <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mt-3" style={{ color: INK }}>
                {s.label}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* interactive flip cards */}
      <section style={{ background: '#f5f8f7' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: TEAL }}>
              Tap any card
            </div>
            <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
              What the jargon really means.
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: INK }}>
              A sample of the terms buried in a typical Bay Area disclosure package — and the plain
              translation you'd get from me. Tap a card to flip it.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
            {TRANSLATIONS.map((t, i) => (
              <FlipCard key={t.term} term={t.term} plain={t.plain} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* what you get */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: TEAL }}>
            What you get
          </div>
          <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
            A report you can act on.
          </h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {[
            { icon: FileText, title: 'Plain-English summary', body: 'Every document distilled into what matters, minus the legalese.' },
            { icon: AlertTriangle, title: 'Red-flag alerts', body: 'The issues that should change your offer — surfaced, not buried.' },
            { icon: DollarSign, title: 'Repair cost estimates', body: 'Ballpark numbers on what the reports imply you\u2019ll spend.' },
            { icon: Scale, title: 'Negotiation leverage', body: 'Exactly where you can push for credits or price reductions.' },
          ].map((c, i) => {
            const Icon = c.icon
            return (
              <Reveal key={c.title} delay={0.05 * i}>
                <div className="mp-lift rounded-[24px] border border-black/[0.07] bg-white p-7 h-full">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(47,143,131,0.12)' }}>
                    <Icon className="w-5 h-5" style={{ color: TEAL }} />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight" style={{ color: NAVY }}>{c.title}</h3>
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: INK }}>{c.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: NAVY }}>
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <Reveal>
            <h2 className="mp-serif text-white text-[36px] md:text-[52px] leading-[1.05] font-semibold">
              Buying soon? Don't sign <span className="mp-accent">blind</span>.
            </h2>
            <p className="mt-6 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Send me the disclosure package and I'll turn it around within 24 hours.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-9">
              <PillButton href="https://calendar.app.google/Lsb5v4UTcRn3eZh36" onDark>
                Request a review <ArrowUpRight className="w-4 h-4" />
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
