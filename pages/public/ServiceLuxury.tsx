// Bespoke service page: Luxury Listing Marketing ($10M+).
//
// The real thesis (rewritten): ultra-luxury homes sell through word of mouth,
// so we ENGINEER the word of mouth. We define the exact buyer, find real people
// who match with open-source tools, reach them and their networks, measure
// intent at every step, retarget everyone who clicks, and pursue every top
// lead — all visible to the seller in real time on a private analytics
// dashboard (the 175 Huckleberry Drive campaign is the live proof).
//
// Tactics are named plainly — that specificity IS the differentiator.
// Inherits the gold-accented luxury variant of the motionsites vocabulary.

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
  Target,
  Radar,
  Mail,
  Activity,
  Crosshair,
  PhoneCall,
  Gauge,
  ArrowUpRight,
  ArrowRight,
} from 'lucide-react'

const HERO_IMG =
  'https://kumfuludrhoqirxvaqja.supabase.co/storage/v1/object/public/listing-photos/site/175-huckleberry-drive/000.jpg'

const GOLD = '#b8965a'
const DASH_BG = '#0f1621'
const DASH_PANEL = '#161f2c'

// The 7-phase outreach machine — named plainly, in order.
const PHASES = [
  {
    icon: Target,
    tag: 'Phase 1',
    title: 'Define the buyer with precision',
    body: 'We study who actually owns homes like yours and model the most likely buyer: where they live, what they already own, how they made their money, what else they buy. Not a demographic guess — a specific, evidenced profile of the person who writes this check.',
  },
  {
    icon: Radar,
    tag: 'Phase 2',
    title: 'Find real people who match',
    body: 'Using open-source intelligence tools, we surface actual individuals who fit that profile — and the networks around them. Because homes at this level sell through word of mouth, we build the list of people most able to buy it or to whisper it to someone who will.',
  },
  {
    icon: Mail,
    tag: 'Phase 3',
    title: 'Reach them directly',
    body: 'We pull verified email addresses and run tailored, automated campaigns that invite each person to consider the home — or share it with their circle. This is the megaphone for word of mouth: instead of hoping the right person hears, we put it in front of them by name.',
  },
  {
    icon: Activity,
    tag: 'Phase 4',
    title: 'Measure intent at every step',
    body: 'Every open, click, and site visit is tracked. We layer lead-capture offers — an out-of-area market review, a disclosure review, a downloadable property-condition cheat sheet — so each response grades how serious a prospect is. Interest becomes data.',
  },
  {
    icon: Crosshair,
    tag: 'Phase 5',
    title: 'Retarget everyone who clicks',
    body: 'Anyone who engages gets followed across the internet with the property’s ads — on the sites they already browse. The home stays in front of warm prospects until they act, at a fraction of the waste of broad luxury advertising.',
  },
  {
    icon: PhoneCall,
    tag: 'Phase 6',
    title: 'Pursue every top lead directly',
    body: 'The data surfaces the hottest prospects; then it gets personal. Direct, one-to-one outreach to every high-intent lead and their agent — the human close on top of the machine that found them.',
  },
  {
    icon: Gauge,
    tag: 'Phase 7',
    title: 'Prove it in real time',
    body: 'You watch all of it live on a private, password-protected analytics dashboard: total visits, time on site, where viewers are watching from, top metros, lead captures, and film views. No monthly summary spin — the raw performance of your listing, always on.',
  },
]

const PROOF = [
  '175 Huckleberry Drive · $9.95M · Jackson Hole',
  'Buyer-origin intelligence',
  'Open-source prospecting',
  'Automated direct outreach',
  'Click-level retargeting',
  'Live seller dashboard',
]

const METROS = [
  { rank: 1, name: 'Bay Area', pct: 43, views: 22 },
  { rank: 2, name: 'Washington DC', pct: 16, views: 8 },
  { rank: 3, name: 'Dallas–Fort Worth', pct: 14, views: 7 },
  { rank: 4, name: 'Council Bluffs, IA', pct: 6, views: 3 },
  { rank: 5, name: 'Boardman, Oregon', pct: 4, views: 2 },
  { rank: 6, name: 'Rexburg, Idaho', pct: 4, views: 2 },
]
const BUBBLES = [
  { x: 58, y: 96, r: 15 },
  { x: 72, y: 60, r: 7 },
  { x: 120, y: 78, r: 8 },
  { x: 168, y: 96, r: 7 },
  { x: 232, y: 82, r: 9 },
  { x: 244, y: 74, r: 6 },
  { x: 196, y: 128, r: 10 },
  { x: 60, y: 128, r: 5 },
]

function DashboardMock() {
  return (
    <div
      className="rounded-[20px] overflow-hidden"
      style={{ background: DASH_BG, boxShadow: '0 40px 100px -50px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center mp-serif text-sm font-bold"
            style={{ background: GOLD, color: '#1a1205' }}
          >
            P
          </div>
          <div>
            <div className="mp-mono text-[9px] tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              PRUGH REAL ESTATE
            </div>
            <div className="mp-serif text-white text-lg leading-tight">175 Huckleberry Drive</div>
          </div>
        </div>
        <div
          className="mp-mono text-[9px] tracking-[0.16em] px-2.5 py-1 rounded"
          style={{ background: 'rgba(184,150,90,0.15)', color: GOLD }}
        >
          ● LIVE · 30d
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px px-6" style={{ color: '#fff' }}>
        {[
          { k: 'TOTAL VISITS', v: '51', s: '51 unique' },
          { k: 'AVG. TIME ON SITE', v: '40m 46s', s: 'median 15s' },
          { k: 'FORM SUBMISSIONS', v: '46', s: 'call requests' },
        ].map((s) => (
          <div key={s.k} className="rounded-lg p-4" style={{ background: DASH_PANEL }}>
            <div className="mp-mono text-[8.5px] tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {s.k}
            </div>
            <div className="mp-serif text-2xl mt-1">{s.v}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {s.s}
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 p-6">
        <div className="rounded-xl p-4" style={{ background: DASH_PANEL }}>
          <div className="text-white text-sm font-semibold">Where viewers are watching from</div>
          <div className="text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Bubble size = share of visits
          </div>
          <svg viewBox="0 0 320 200" className="w-full" style={{ maxHeight: 190 }}>
            <path
              d="M40 70 L110 52 L180 58 L250 55 L290 72 L292 96 L258 104 L250 128 L210 150 L150 156 L96 150 L70 128 L52 104 L40 88 Z"
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth="1"
            />
            {BUBBLES.map((b, i) => (
              <g key={i}>
                <circle cx={b.x} cy={b.y} r={b.r} fill={GOLD} opacity={0.32} />
                <circle cx={b.x} cy={b.y} r={Math.max(2, b.r * 0.4)} fill={GOLD} opacity={0.95} />
              </g>
            ))}
          </svg>
        </div>
        <div className="rounded-xl p-4" style={{ background: DASH_PANEL }}>
          <div className="text-white text-sm font-semibold">Top metros</div>
          <div className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
            By share of total site visits
          </div>
          <div className="flex flex-col gap-2.5">
            {METROS.map((m) => (
              <div key={m.rank} className="flex items-center gap-3">
                <span className="mp-mono text-[10px] w-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {m.rank}
                </span>
                <span className="text-white text-[12.5px] flex-1 truncate">{m.name}</span>
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: GOLD }} />
                </div>
                <span className="mp-mono text-[11px] w-8 text-right" style={{ color: GOLD }}>
                  {m.pct}%
                </span>
                <span className="mp-mono text-[10px] w-12 text-right" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {m.views} views
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ServiceLuxury() {
  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="services" />

      <ParallaxHero image={HERO_IMG} minH="84vh" accent="gold">
        <div className="max-w-6xl mx-auto px-6 py-28">
          <div className="max-w-3xl">
            <div
              className="mp-anim mp-mono text-[11px] uppercase tracking-[0.28em] mb-6"
              style={{ color: GOLD, animationDelay: '0.1s' }}
            >
              Luxury Listing Marketing · $10M+
            </div>
            <h1
              className="mp-anim mp-serif text-white text-[44px] md:text-[66px] leading-[1.03] font-semibold"
              style={{ animationDelay: '0.2s' }}
            >
              Trophy homes sell by <span className="mp-accent-gold">word of mouth.</span>
              <br />
              So we build the megaphone.
            </h1>
            <p
              className="mp-anim text-lg md:text-xl mt-7 leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.82)', animationDelay: '0.35s', maxWidth: '660px' }}
            >
              Most agents post your property and wait for the right buyer to wander by. I go find
              them — defining exactly who buys a home like yours, locating real people who match,
              reaching them and their networks directly, and measuring every click until the deal
              is done. All visible to you, live.
            </p>
            <div className="mp-anim flex flex-wrap gap-3 mt-9" style={{ animationDelay: '0.5s' }}>
              <PillButton href="/luxury-listings" onDark>
                Request a private consultation <ArrowUpRight className="w-4 h-4" />
              </PillButton>
              <PillButton href="#machine" variant="secondary" onDark>
                See how it works
              </PillButton>
            </div>
          </div>
        </div>
      </ParallaxHero>

      <div style={{ background: NAVY_DEEP }}>
        <Marquee items={PROOF} />
      </div>

      <section style={{ background: '#f7f8fa' }}>
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: GOLD }}>
              The premise
            </div>
            <h2 className="mp-serif text-[30px] md:text-[46px] leading-[1.12] font-semibold" style={{ color: NAVY }}>
              A $10M home has maybe a few hundred plausible buyers on earth. Marketing to
              &ldquo;everyone&rdquo; reaches none of them.
            </h2>
            <p className="mt-7 leading-relaxed text-[17px]" style={{ color: INK }}>
              At this level, the sale almost never comes from a sign in the yard or a portal
              listing. It comes from the right person hearing about it from someone they trust. That
              sounds like luck — but it isn&rsquo;t. It can be manufactured. The entire strategy
              below exists to identify those few hundred people, put the home in front of them by
              name, and turn passive interest into a measurable, closeable pipeline.
            </p>
          </Reveal>
        </div>
      </section>

      <section id="machine" className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>
            The outreach machine
          </div>
          <h2 className="mp-serif text-[32px] md:text-[48px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
            Seven phases, hand to hand.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed max-w-2xl" style={{ color: INK }}>
            This is the opposite of &ldquo;list it and hope.&rdquo; Every phase compounds the last —
            from defining the buyer to closing the lead the data surfaced.
          </p>
        </Reveal>

        <div className="mt-14 flex flex-col gap-4">
          {PHASES.map((p, i) => {
            const Icon = p.icon
            return (
              <Reveal key={p.tag} delay={0.04 * i}>
                <div className="mp-lift grid md:grid-cols-[auto_1fr] gap-6 rounded-[22px] border border-black/[0.07] bg-white p-7 md:p-8">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(184,150,90,0.12)' }}
                    >
                      <Icon className="w-5 h-5" style={{ color: GOLD }} />
                    </div>
                    <div className="md:hidden">
                      <div className="mp-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: GOLD }}>
                        {p.tag}
                      </div>
                      <h3 className="mp-serif text-xl font-semibold mt-1" style={{ color: NAVY }}>
                        {p.title}
                      </h3>
                    </div>
                  </div>
                  <div>
                    <div className="hidden md:block">
                      <div className="mp-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: GOLD }}>
                        {p.tag}
                      </div>
                      <h3 className="mp-serif text-[22px] font-semibold mt-1 mb-2" style={{ color: NAVY }}>
                        {p.title}
                      </h3>
                    </div>
                    <p className="text-[15px] leading-relaxed" style={{ color: INK }}>
                      {p.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      <section style={{ background: NAVY_DEEP }}>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
                The proof · always on
              </div>
              <h2 className="mp-serif text-white text-[30px] md:text-[44px] leading-[1.08] font-semibold">
                Watch your listing perform, in real time.
              </h2>
              <p className="mt-6 text-[16px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Every campaign gets a private, password-protected dashboard. This is the live one
                for 175 Huckleberry Drive in Jackson Hole — real visits, real buyer origins, real
                intent. You see exactly where demand is coming from and what the marketing is doing,
                the moment it happens.
              </p>
              <ul className="mt-6 flex flex-col gap-2.5">
                {[
                  'Total visits, unique viewers, and time on site',
                  'A live map of where your buyers are watching from',
                  'Top metros ranked by share of interest',
                  'Lead captures, call requests, and film views',
                ].map((li) => (
                  <li key={li} className="flex items-start gap-2.5 text-[14.5px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    <ArrowRight className="w-4 h-4 mt-0.5 shrink-0" style={{ color: GOLD }} />
                    {li}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <PillButton href="https://175huckleberrydrive.com/analytics/" onDark>
                  See the live dashboard <ArrowUpRight className="w-4 h-4" />
                </PillButton>
                <p className="mt-2.5 text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Password-protected · sellers get their own login
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <DashboardMock />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { v: 100, prefix: '$', suffix: 'M+', label: 'Career sales volume' },
            { v: 31, prefix: '$', suffix: 'M', label: 'Largest sale' },
            { raw: '$3,000/ft', label: 'Record price achieved' },
            { raw: '24/7', label: 'Live campaign tracking' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={0.06 * i}>
              <div className="mp-serif text-[38px] md:text-[52px] font-semibold leading-none" style={{ color: NAVY }}>
                <CountUp value={s.v} prefix={s.prefix} suffix={s.suffix} raw={s.raw} />
              </div>
              <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mt-3" style={{ color: INK }}>
                {s.label}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section style={{ background: NAVY }}>
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: GOLD }}>
              Selling above $10M?
            </div>
            <h2 className="mp-serif text-white text-[36px] md:text-[52px] leading-[1.05] font-semibold">
              Let&rsquo;s build your <span className="mp-accent-gold">megaphone.</span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              A private, no-obligation consultation to map exactly who your buyer is and how
              we&rsquo;d reach them.
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
