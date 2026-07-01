// Bespoke service page: Home Improvement.
//
// Expanded to the Luxury/1031 standard: keeps the interactive ROI explorer,
// adds a "spend where it returns" thesis, a sell-prep vs live-in framing, a
// what-I-handle process, an expandable FAQ, and the consistent video-call CTA.

import { useState } from 'react'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import ServiceArticleFeed from '@/components/public/ServiceArticleFeed'
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
import {
  Hammer,
  PencilRuler,
  Users,
  ArrowUpRight,
  Video,
  Phone,
  Plus,
  Minus,
  TrendingUp,
  Home,
  ClipboardCheck,
} from 'lucide-react'

const TERRA = '#b0654a'
const CAL = 'https://calendar.app.google/Lsb5v4UTcRn3eZh36'

const PROJECTS = [
  { name: 'Kitchen refresh', roi: 85, note: 'Paint, hardware, counters, lighting — high impact per dollar without a full gut.' },
  { name: 'Curb appeal & landscaping', roi: 100, note: 'First impressions; often returns more than it costs and sets the tone for every showing.' },
  { name: 'Bathroom update', roi: 70, note: 'Vanities, tile, fixtures — a strong buyer signal that the home is cared for.' },
  { name: 'Interior paint', roi: 107, note: 'The single cheapest way to lift perceived value across the whole home.' },
  { name: 'Staging', roi: 120, note: 'Helps buyers see the home at its best; consistently speeds the sale and lifts offers.' },
  { name: 'Full remodel', roi: 60, note: 'Bigger spend, lower % return — worth it selectively, and only with a resale-focused scope.' },
]

function RoiExplorer() {
  const [active, setActive] = useState(4)
  const sel = PROJECTS[active]
  return (
    <div className="grid md:grid-cols-2 gap-10 items-center">
      <div className="flex flex-col gap-2">
        {PROJECTS.map((p, i) => (
          <button key={p.name} onClick={() => setActive(i)} className="text-left rounded-2xl px-5 py-4 transition-all duration-200 border"
            style={{ background: i === active ? TERRA : '#fff', color: i === active ? '#fff' : NAVY, borderColor: i === active ? TERRA : 'rgba(0,0,0,0.08)' }}>
            <div className="flex items-center justify-between">
              <span className="font-medium">{p.name}</span>
              <span className="mp-serif text-lg font-semibold">{p.roi}%</span>
            </div>
          </button>
        ))}
      </div>
      <Reveal>
        <div className="rounded-[28px] p-8 md:p-10" style={{ background: '#faf6f4', border: '1px solid rgba(176,101,74,0.15)' }}>
          <div className="mp-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: TERRA }}>Typical cost recouped</div>
          <div className="mp-serif text-[64px] font-semibold leading-none mt-2" style={{ color: NAVY }}>{sel.roi}%</div>
          <div className="h-3 rounded-full mt-6 overflow-hidden" style={{ background: 'rgba(176,101,74,0.15)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(sel.roi, 130) / 130 * 100}%`, background: TERRA }} />
          </div>
          <p className="text-[15px] mt-6 leading-relaxed" style={{ color: INK }}>{sel.note}</p>
        </div>
      </Reveal>
    </div>
  )
}

function FAQItem({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(i === 0)
  return (
    <div className="rounded-[18px] border border-black/[0.08] bg-white overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-4 text-left p-5 md:p-6">
        <span className="font-semibold" style={{ color: NAVY }}>{q}</span>
        <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: open ? TERRA : 'rgba(176,101,74,0.1)' }}>
          {open ? <Minus className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4" style={{ color: TERRA }} />}
        </span>
      </button>
      <div className="grid transition-all duration-400 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="overflow-hidden"><p className="px-5 md:px-6 pb-6 text-[15px] leading-relaxed" style={{ color: INK }}>{a}</p></div>
      </div>
    </div>
  )
}
const FAQS = [
  { q: 'Do I pay for the improvements up front?', a: 'The design consultation and my project management are part of how I serve my clients. The improvement costs themselves are yours — but I help you sequence them, and in many sale-prep cases those costs can be handled through a concierge program and settled at closing. We’ll map the right structure for your situation.' },
  { q: 'How do you decide what’s worth doing?', a: 'Return per dollar, not personal taste. We walk the home, look at your comps and buyer pool, and prioritize the handful of moves that lift your number most. Sometimes that’s paint and landscaping, not a $90k kitchen.' },
  { q: 'I’m not selling — is this still useful?', a: 'Yes. The same lens works for a forever home: increase daily functionality and long-term value without over-improving for the neighborhood. I’ll tell you honestly when a project is for you versus for resale.' },
  { q: 'Who does the actual work?', a: 'A vetted network of trades I’ve worked with across dozens of projects — not strangers off a search result. I coordinate them, keep the budget honest, and manage the timeline to the punch-list.' },
]

export default function ServiceImprovement() {
  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="services" />

      <ParallaxHero minH="74vh" accent="blue">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <div className="mp-anim mp-mono text-[11px] uppercase tracking-[0.28em] mb-6" style={{ color: TERRA, animationDelay: '0.1s' }}>
              Home Improvement · For Homeowners
            </div>
            <h1 className="mp-anim mp-serif text-white text-[46px] md:text-[64px] leading-[1.03] font-semibold" style={{ animationDelay: '0.2s' }}>
              Spend where it <span className="mp-accent">actually returns</span>.
            </h1>
            <p className="mp-anim text-lg md:text-xl mt-7 leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', animationDelay: '0.35s', maxWidth: '640px' }}>
              Not every renovation pays you back. I help you increase functionality, desirability,
              and value with the right improvements — a design consultation, a vetted contractor
              network, and project management from plan to punch-list.
            </p>
            <div className="mp-anim flex flex-wrap gap-3 mt-9" style={{ animationDelay: '0.5s' }}>
              <PillButton href={CAL} onDark>
                <Video className="w-4 h-4" /> Schedule a video call with Tim
              </PillButton>
              <PillButton href="#roi" variant="secondary" onDark>
                Explore the returns
              </PillButton>
            </div>
          </div>
        </div>
      </ParallaxHero>

      <div style={{ background: NAVY_DEEP }}>
        <Marquee items={['Design consultation', 'Vetted contractor network', 'Project management', 'ROI-focused scope', 'Sale-prep concierge', 'On budget, on time']} />
      </div>

      {/* thesis */}
      <section style={{ background: '#faf6f4' }}>
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: TERRA }}>The principle</div>
            <h2 className="mp-serif text-[30px] md:text-[46px] leading-[1.12] font-semibold" style={{ color: NAVY }}>
              The most expensive renovation is the one that doesn’t move your number.
            </h2>
            <p className="mt-7 leading-relaxed text-[17px]" style={{ color: INK }}>
              Homeowners routinely pour money into the projects they personally want and skip the
              cheap, unglamorous ones that actually lift value and speed a sale. The difference
              between a smart improvement plan and an expensive one isn’t the budget — it’s
              knowing, for your specific home and buyer pool, where each dollar comes back.
            </p>
          </Reveal>
        </div>
      </section>

      {/* interactive ROI explorer */}
      <section id="roi" className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: TERRA }}>Explore the returns</div>
          <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold mb-4" style={{ color: NAVY }}>Which improvements pay off?</h2>
          <p className="max-w-2xl leading-relaxed mb-12" style={{ color: INK }}>
            Select a project to see its typical resale return. The highest-ROI moves are rarely the
            most expensive ones — illustrative ranges for Bay Area homes.
          </p>
        </Reveal>
        <Reveal delay={0.1}><RoiExplorer /></Reveal>
      </section>

      {/* sell-prep vs live-in */}
      <section style={{ background: '#faf6f4' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: TERRA }}>Two goals, two plans</div>
            <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>Prepping to sell, or building your forever home?</h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-5 mt-12">
            {[
              { icon: TrendingUp, title: 'Sale-prep', body: 'A tight, high-ROI scope timed to your listing: the paint, staging, landscaping, and targeted fixes that lift offers and shorten days on market. Nothing that won’t come back at the closing table.' },
              { icon: Home, title: 'Live-in value', body: 'Improvements scoped for how you actually live, without over-improving for the block. We protect long-term value while making the home work better today.' },
            ].map((c, i) => {
              const Icon = c.icon
              return (
                <Reveal key={c.title} delay={0.06 * i}>
                  <div className="mp-lift rounded-[24px] bg-white border border-black/[0.07] p-8 h-full">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(176,101,74,0.12)' }}>
                      <Icon className="w-5 h-5" style={{ color: TERRA }} />
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight" style={{ color: NAVY }}>{c.title}</h3>
                    <p className="text-sm mt-3 leading-relaxed" style={{ color: INK }}>{c.body}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* how I help */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: TERRA }}>How I help</div>
          <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>From plan to punch-list.</h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {[
            { icon: PencilRuler, title: 'Design consultation', body: 'We walk the home and prioritize the improvements that move your number the most — with honest ROI, not upsells.' },
            { icon: Users, title: 'Vetted contractor network', body: 'Trusted trades I’ve worked with across dozens of projects — no cold-calling strangers, no chasing bids.' },
            { icon: ClipboardCheck, title: 'Full project management', body: 'I coordinate the work, keep it on budget, and keep the timeline honest — you get updates, not headaches.' },
          ].map((c, i) => {
            const Icon = c.icon
            return (
              <Reveal key={c.title} delay={0.07 * i}>
                <div className="mp-lift rounded-[24px] bg-white border border-black/[0.07] p-8 h-full">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(176,101,74,0.12)' }}>
                    <Icon className="w-5 h-5" style={{ color: TERRA }} />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight" style={{ color: NAVY }}>{c.title}</h3>
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: INK }}>{c.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-6 pb-20 md:pb-24">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: TERRA }}>Common questions</div>
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
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: '#e0a890' }}>Improve with a plan</div>
            <h2 className="mp-serif text-white text-[36px] md:text-[52px] leading-[1.05] font-semibold">
              Make every dollar <span className="mp-accent">count</span>.
            </h2>
            <p className="mt-6 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
              Whether you’re prepping to sell or investing in your forever home, let’s map the
              highest-return plan on a quick video call.
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

      <ServiceArticleFeed />
      <PublicFooter />
    </div>
  )
}
