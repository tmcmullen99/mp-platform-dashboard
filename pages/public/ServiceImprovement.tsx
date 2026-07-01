// Bespoke service page: Home Improvement.
// Interactive centerpiece: an ROI explorer. Click a project type and an
// animated bar reveals its typical cost-recouped return.

import { useState } from 'react'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import {
  MotionStyles,
  Reveal,
  ParallaxHero,
  PillButton,
  NAVY,
  INK,
} from '@/components/public/motion'
import { Hammer, PencilRuler, Users, ArrowUpRight } from 'lucide-react'

const TERRA = '#b0654a'

// Illustrative resale ROI ranges for Bay Area improvements.
const PROJECTS = [
  { name: 'Kitchen refresh', roi: 85, note: 'Paint, hardware, counters, lighting — high impact per dollar.' },
  { name: 'Curb appeal & landscaping', roi: 100, note: 'First impressions; often returns more than it costs.' },
  { name: 'Bathroom update', roi: 70, note: 'Vanities, tile, fixtures — strong buyer signal.' },
  { name: 'Interior paint', roi: 107, note: 'The single cheapest way to lift perceived value.' },
  { name: 'Staging', roi: 120, note: 'Helps buyers see the home at its best; speeds the sale.' },
  { name: 'Full remodel', roi: 60, note: 'Bigger spend, lower % return — worth it selectively.' },
]

function RoiExplorer() {
  const [active, setActive] = useState(4) // staging by default
  const sel = PROJECTS[active]
  return (
    <div className="grid md:grid-cols-2 gap-10 items-center">
      {/* selectable list */}
      <div className="flex flex-col gap-2">
        {PROJECTS.map((p, i) => (
          <button
            key={p.name}
            onClick={() => setActive(i)}
            className="text-left rounded-2xl px-5 py-4 transition-all duration-200 border"
            style={{
              background: i === active ? TERRA : '#fff',
              color: i === active ? '#fff' : NAVY,
              borderColor: i === active ? TERRA : 'rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{p.name}</span>
              <span className="mp-serif text-lg font-semibold">{p.roi}%</span>
            </div>
          </button>
        ))}
      </div>

      {/* animated readout */}
      <Reveal>
        <div className="rounded-[28px] p-8 md:p-10" style={{ background: '#faf6f4', border: '1px solid rgba(176,101,74,0.15)' }}>
          <div className="mp-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: TERRA }}>
            Typical cost recouped
          </div>
          <div className="mp-serif text-[64px] font-semibold leading-none mt-2" style={{ color: NAVY }}>
            {sel.roi}%
          </div>
          {/* bar */}
          <div className="h-3 rounded-full mt-6 overflow-hidden" style={{ background: 'rgba(176,101,74,0.15)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(sel.roi, 130) / 130 * 100}%`, background: TERRA }}
            />
          </div>
          <p className="text-[15px] mt-6 leading-relaxed" style={{ color: INK }}>{sel.note}</p>
        </div>
      </Reveal>
    </div>
  )
}

export default function ServiceImprovement() {
  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="services" />

      <ParallaxHero minH="68vh" accent="blue">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <div className="mp-anim mp-mono text-[11px] uppercase tracking-[0.28em] mb-6" style={{ color: TERRA, animationDelay: '0.1s' }}>
              Home Improvement · For Homeowners
            </div>
            <h1 className="mp-anim mp-serif text-white text-[46px] md:text-[64px] leading-[1.03] font-semibold" style={{ animationDelay: '0.2s' }}>
              Spend where it <span className="mp-accent">actually returns</span>.
            </h1>
            <p className="mp-anim text-lg md:text-xl mt-7 leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)', animationDelay: '0.35s', maxWidth: '620px' }}>
              Not every renovation pays you back. I help you increase functionality, desirability,
              and value with the right improvements — a free design consultation, a vetted
              contractor network, and project management from plan to punch-list.
            </p>
            <div className="mp-anim flex flex-wrap gap-3 mt-9" style={{ animationDelay: '0.5s' }}>
              <PillButton href="https://calendar.app.google/Lsb5v4UTcRn3eZh36" onDark>
                Book a design consult <ArrowUpRight className="w-4 h-4" />
              </PillButton>
            </div>
          </div>
        </div>
      </ParallaxHero>

      {/* interactive ROI explorer */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: TERRA }}>
            Explore the returns
          </div>
          <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold mb-4" style={{ color: NAVY }}>
            Which improvements pay off?
          </h2>
          <p className="max-w-2xl leading-relaxed mb-12" style={{ color: INK }}>
            Select a project to see its typical resale return. The highest-ROI moves are rarely the
            most expensive ones.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <RoiExplorer />
        </Reveal>
      </section>

      {/* how I help */}
      <section style={{ background: '#faf6f4' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: TERRA }}>
              How I help
            </div>
            <h2 className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
              From plan to punch-list.
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5 mt-12">
            {[
              { icon: PencilRuler, title: 'Free design consultation', body: 'We walk the home and prioritize the improvements that move your number the most.' },
              { icon: Users, title: 'Vetted contractor network', body: 'Trusted trades I\u2019ve worked with across dozens of projects — no cold-calling strangers.' },
              { icon: Hammer, title: 'Full project management', body: 'I coordinate the work, keep it on budget, and keep the timeline honest.' },
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
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: NAVY }}>
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <Reveal>
            <h2 className="mp-serif text-white text-[36px] md:text-[52px] leading-[1.05] font-semibold">
              Improve with a <span className="mp-accent">plan</span>.
            </h2>
            <p className="mt-6 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Whether you're prepping to sell or investing in your forever home, let's make every
              dollar count.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-9">
              <PillButton href="https://calendar.app.google/Lsb5v4UTcRn3eZh36" onDark>
                Book a consultation <ArrowUpRight className="w-4 h-4" />
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
