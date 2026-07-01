// Bespoke service page: Disclosure Review.
//
// Expanded to the Luxury/1031 standard: keeps the "jargon → plain English" flip
// cards, adds a stakes-setting narrative, an expandable "what's inside a
// disclosure package" explorer, a process timeline, a red-flags detail grid,
// and an FAQ. Consistent video-call CTA.

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
} from '@/components/public/motion'
import {
  FileText,
  AlertTriangle,
  DollarSign,
  Scale,
  ArrowUpRight,
  RefreshCw,
  Video,
  Phone,
  Plus,
  Minus,
  Clock,
  Search,
  ShieldCheck,
} from 'lucide-react'

const TEAL = '#2f8f83'
const CAL = 'https://calendar.app.google/Lsb5v4UTcRn3eZh36'

const TRANSLATIONS = [
  { term: 'Section 1 Pest Report', plain: 'Active infestation or damage that a lender will usually require fixed before closing. This is your leverage to negotiate repairs or credits.' },
  { term: 'Natural Hazard Disclosure', plain: 'Whether the home sits in a flood, fire, or earthquake zone — which drives your insurance cost and, sometimes, whether you can insure it at all.' },
  { term: 'Preliminary Title Report', plain: 'Liens, easements, and who really has rights to the property. A missed easement here can mean a neighbor legally crosses your yard.' },
  { term: 'Seller Property Questionnaire', plain: 'What the seller knows but the inspection might miss — past leaks, deaths on property, neighbor disputes, unpermitted work.' },
  { term: 'Roof Certification', plain: 'Remaining roof life and whether a full replacement is looming — often a five-figure line item you can price into your offer.' },
  { term: 'HOA Reserve Study', plain: 'Whether the building has saved enough for big repairs, or whether a special assessment is about to land on your monthly dues.' },
]

function FlipCard({ term, plain, i }: { term: string; plain: string; i: number }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <Reveal delay={0.05 * i}>
      <button onClick={() => setFlipped((v) => !v)} className="w-full text-left group" style={{ perspective: '1200px' }} aria-label={`Translate ${term}`}>
        <div className="relative w-full h-[188px] transition-transform duration-500" style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}>
          <div className="absolute inset-0 rounded-[22px] border border-black/[0.08] bg-white p-6 flex flex-col justify-between" style={{ backfaceVisibility: 'hidden' }}>
            <div className="mp-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: TEAL }}>Disclosure term</div>
            <div className="mp-serif text-2xl font-semibold" style={{ color: NAVY }}>{term}</div>
            <div className="mp-mono text-[10px] uppercase tracking-[0.14em] flex items-center gap-1.5" style={{ color: INK }}>
              <RefreshCw className="w-3.5 h-3.5" /> Tap to translate
            </div>
          </div>
          <div className="absolute inset-0 rounded-[22px] p-6 flex items-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: TEAL, color: '#fff' }}>
            <p className="text-[15px] leading-relaxed">{plain}</p>
          </div>
        </div>
      </button>
    </Reveal>
  )
}

const PACKAGE = [
  { icon: FileText, title: 'The Transfer Disclosure Statement', body: 'The seller’s legally-required account of the property’s condition — what works, what doesn’t, what’s been repaired. The first place inconsistencies show up.' },
  { icon: AlertTriangle, title: 'Inspection reports', body: 'General home inspection, pest (termite), roof, sewer lateral, chimney, and sometimes foundation or drainage. Each can hide a five-figure surprise in a single line.' },
  { icon: ShieldCheck, title: 'Natural hazard & environmental', body: 'Flood, fire, earthquake, and seismic zones; radon, mold, and lead. These determine insurability and cost, not just risk.' },
  { icon: Scale, title: 'Title & legal', body: 'Preliminary title report, easements, liens, and any covenants or restrictions that quietly limit what you can do with the property.' },
  { icon: DollarSign, title: 'HOA & financials', body: 'For condos: CC&Rs, budgets, reserve studies, meeting minutes, and pending litigation or special assessments that hit your monthly cost.' },
  { icon: Search, title: 'Permit & work history', body: 'What was done to the home, whether it was permitted, and what unpermitted work you’d be inheriting liability for.' },
]

const RED_FLAGS = [
  { title: 'Unpermitted work', body: 'A finished basement or added bathroom with no permit can mean fines, forced removal, or insurance denial. We flag it and price it.' },
  { title: 'Deferred maintenance stacking', body: 'Old roof + old water heater + aging HVAC together signal a wave of costs landing in your first two years. We total it up.' },
  { title: 'Special assessment risk', body: 'An HOA reserve study that’s underfunded is a special assessment waiting to happen — sometimes tens of thousands per unit.' },
  { title: 'Drainage & foundation notes', body: 'The quiet lines in an inspection report that hint at the most expensive problems in real estate. We make sure they’re not buried.' },
]

function FAQItem({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(i === 0)
  return (
    <div className="rounded-[18px] border border-black/[0.08] bg-white overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-4 text-left p-5 md:p-6">
        <span className="font-semibold" style={{ color: NAVY }}>{q}</span>
        <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: open ? TEAL : 'rgba(47,143,131,0.1)' }}>
          {open ? <Minus className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4" style={{ color: TEAL }} />}
        </span>
      </button>
      <div className="grid transition-all duration-400 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden"><p className="px-5 md:px-6 pb-6 text-[15px] leading-relaxed" style={{ color: INK }}>{a}</p></div>
      </div>
    </div>
  )
}
const FAQS = [
  { q: 'When should I get a disclosure review?', a: 'Ideally before you write an offer, or during your contingency period. The disclosures often arrive as a 50-to-100-page PDF package the moment a home lists — the earlier I read it, the more leverage you keep.' },
  { q: 'Does this replace a home inspection?', a: 'No — it makes your inspection smarter. The disclosure package already contains the seller’s reports; I translate them and tell you exactly where to spend your own inspection dollars, and what to renegotiate.' },
  { q: 'What does it cost me?', a: 'Nothing when I represent you as your buyer’s agent. The review is part of how I protect you — you get a plain-English summary, red-flag list, cost estimates, and a negotiation plan.' },
  { q: 'How fast is the turnaround?', a: 'Typically within 24 hours of receiving the package, because disclosure timelines move fast and your contingency clock is running.' },
]

export default function ServiceDisclosure() {
  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="services" />

      <ParallaxHero minH="74vh" accent="blue">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <div className="mp-anim mp-mono text-[11px] uppercase tracking-[0.28em] mb-6" style={{ color: TEAL, animationDelay: '0.1s' }}>
              Disclosure Review · For Buyers
            </div>
            <h1 className="mp-anim mp-serif text-white text-[46px] md:text-[64px] leading-[1.03] font-semibold" style={{ animationDelay: '0.2s' }}>
              55 documents. <br />One <span className="mp-accent">plain-English</span> read.
            </h1>
            <p className="mp-anim text-lg md:text-xl mt-7 leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', animationDelay: '0.35s', maxWidth: '640px' }}>
              A Bay Area disclosure package can run 50 to 100 pages of dense reports and legalese —
              and it’s where the real risks and your real leverage hide. I read every page and
              translate it into what it means for your offer.
            </p>
            <div className="mp-anim flex flex-wrap gap-3 mt-9" style={{ animationDelay: '0.5s' }}>
              <PillButton href={CAL} onDark>
                <Video className="w-4 h-4" /> Schedule a video call with Tim
              </PillButton>
              <PillButton href="#translate" variant="secondary" onDark>
                See the jargon decoded
              </PillButton>
            </div>
          </div>
        </div>
      </ParallaxHero>

      <div style={{ background: NAVY_DEEP }}>
        <Marquee items={['Plain-English summary', 'Red-flag alerts', 'Repair cost estimates', 'Negotiation leverage', '24-hour turnaround', 'Free to my buyers']} />
      </div>

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
              <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mt-3" style={{ color: INK }}>{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* stakes */}
      <section style={{ background: '#f5f8f7' }}>
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: TEAL }}>Why it matters</div>
            <h2 className="mp-serif text-[30px] md:text-[46px] leading-[1.12] font-semibold" style={{ color: NAVY }}>
              The most expensive surprises are already written down — in a report nobody reads closely.
            </h2>
            <p className="mt-7 leading-relaxed text-[17px]" style={{ color: INK }}>
              By the time most buyers are handed the disclosure package, they’re emotionally
              committed and racing a contingency clock. So the package gets a skim, the scary words
              get glossed over, and a $40,000 problem gets waved through. A careful read is the
              cheapest insurance in the entire transaction — and it’s where the leverage to
              renegotiate actually lives.
            </p>
          </Reveal>
        </div>
      </section>

      {/* flip cards */}
      <section id="translate" className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: TEAL }}>Tap any card</div>
          <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>What the jargon really means.</h2>
          <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: INK }}>
            A sample of the terms buried in a typical Bay Area disclosure package — and the plain
            translation you’d get from me. Tap a card to flip it.
          </p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {TRANSLATIONS.map((t, i) => <FlipCard key={t.term} term={t.term} plain={t.plain} i={i} />)}
        </div>
      </section>

      {/* what's inside the package */}
      <section style={{ background: '#f5f8f7' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: TEAL }}>Inside the package</div>
            <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>What a disclosure package actually contains.</h2>
            <p className="mt-5 text-[17px] leading-relaxed max-w-2xl" style={{ color: INK }}>
              It’s not one document — it’s a stack of them, each with its own landmines. Here’s
              the full sweep I read on your behalf.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
            {PACKAGE.map((p, i) => {
              const Icon = p.icon
              return (
                <Reveal key={p.title} delay={0.05 * i}>
                  <div className="mp-lift rounded-[24px] border border-black/[0.07] bg-white p-7 h-full">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(47,143,131,0.12)' }}>
                      <Icon className="w-5 h-5" style={{ color: TEAL }} />
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight" style={{ color: NAVY }}>{p.title}</h3>
                    <p className="text-sm mt-3 leading-relaxed" style={{ color: INK }}>{p.body}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* what you get */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: TEAL }}>What you get</div>
          <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>A report you can act on.</h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {[
            { icon: FileText, title: 'Plain-English summary', body: 'Every document distilled into what matters, minus the legalese.' },
            { icon: AlertTriangle, title: 'Red-flag alerts', body: 'The issues that should change your offer — surfaced, not buried.' },
            { icon: DollarSign, title: 'Repair cost estimates', body: 'Ballpark numbers on what the reports imply you’ll spend.' },
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

      {/* red flags */}
      <section style={{ background: NAVY_DEEP }}>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: '#7fd3c8' }}>The red flags I hunt for</div>
            <h2 className="mp-serif text-white text-[30px] md:text-[44px] leading-[1.08] font-semibold">The lines that change the price.</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-5 mt-12">
            {RED_FLAGS.map((r, i) => (
              <Reveal key={r.title} delay={0.05 * i}>
                <div className="rounded-[22px] p-7 h-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#7fd3c8' }} />
                    <div>
                      <h3 className="text-lg font-semibold text-white">{r.title}</h3>
                      <p className="text-sm mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{r.body}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* process */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: TEAL }}>The process</div>
          <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>Package to plan, in 24 hours.</h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {[
            { icon: FileText, n: '01', t: 'Send me the package', d: 'Forward the disclosure PDF the moment you get it — or I pull it for you as your agent.' },
            { icon: Search, n: '02', t: 'I read every page', d: 'Reports, title, HOA docs, permit history — cross-checked for what’s missing or inconsistent.' },
            { icon: Clock, n: '03', t: 'You get the plan', d: 'A plain-English summary, red flags, cost estimates, and exactly where to renegotiate — within a day.' },
          ].map((s, i) => {
            const Icon = s.icon
            return (
              <Reveal key={s.n} delay={0.07 * i}>
                <div className="mp-lift rounded-[24px] bg-white border border-black/[0.07] p-8 h-full">
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(47,143,131,0.12)' }}>
                      <Icon className="w-5 h-5" style={{ color: TEAL }} />
                    </div>
                    <span className="mp-serif text-3xl font-semibold" style={{ color: 'rgba(47,143,131,0.25)' }}>{s.n}</span>
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight" style={{ color: NAVY }}>{s.t}</h3>
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: INK }}>{s.d}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-6 pb-20 md:pb-24">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: TEAL }}>Common questions</div>
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
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: '#7fd3c8' }}>Buying soon?</div>
            <h2 className="mp-serif text-white text-[36px] md:text-[52px] leading-[1.05] font-semibold">
              Don’t sign <span className="mp-accent">blind</span>.
            </h2>
            <p className="mt-6 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
              Send me the disclosure package and I’ll turn it around within 24 hours — or let’s
              talk through your search on a quick video call.
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
