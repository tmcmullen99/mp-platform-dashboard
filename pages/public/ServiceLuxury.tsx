// Bespoke service page: Luxury Listing Marketing ($10M+).
//
// Thesis: ultra-luxury homes sell through word of mouth, so we ENGINEER it.
// Expanded + interactive: the 7-phase machine is now click-to-expand (each
// phase reveals the detail, a concrete example, and the actual tooling), and
// the proof section embeds the LIVE 175 Huckleberry analytics dashboard
// (interactive metro map + live counters, reading real campaign data).

import { useState } from 'react'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import LiveHuckleberryDashboard from '@/components/public/LiveHuckleberryDashboard'
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
  Plus,
  Minus,
} from 'lucide-react'

const HERO_IMG =
  'https://kumfuludrhoqirxvaqja.supabase.co/storage/v1/object/public/listing-photos/site/175-huckleberry-drive/000.jpg'

const GOLD = '#b8965a'

// The 7-phase machine — each expands to detail + a concrete example + tooling.
const PHASES = [
  {
    icon: Target,
    tag: 'Phase 1',
    title: 'Define the buyer with precision',
    lead: 'Model exactly who buys a home like yours — not a demographic guess, an evidenced profile.',
    detail:
      'We study who actually owns comparable homes: where they live now, what else they own, how they built their wealth, what they buy. For a Jackson Hole trophy property, the buyer is rarely local — they are a coastal or metro high-net-worth secondary-home buyer. We build that profile from real ownership data before a single dollar of marketing is spent.',
    example:
      'For 175 Huckleberry, we assembled a 1,261-owner dataset of comparable luxury and second-home owners to isolate the true buyer origin.',
    tool: 'Ownership data · DealMachine · county records',
  },
  {
    icon: Radar,
    tag: 'Phase 2',
    title: 'Find real people who match',
    lead: 'Use open-source intelligence to surface actual individuals who fit the profile — and their networks.',
    detail:
      'With the profile defined, we locate specific, real people who match it, plus the people around them. Because homes at this level sell through word of mouth, the network matters as much as the individual — the goal is to reach everyone able to buy it or to pass it to someone who will.',
    example:
      'From the buyer profile we build a validated, deduplicated prospect list of named individuals and their likely networks — the people most able to buy or refer.',
    tool: 'OSINT tooling · enrichment · list validation',
  },
  {
    icon: Mail,
    tag: 'Phase 3',
    title: 'Reach them directly',
    lead: 'Pull verified emails and run tailored campaigns asking each person to consider it — or share it.',
    detail:
      'We append verified email addresses to the prospect list and run tailored, automated campaigns. Each message invites the recipient to consider the home or forward it to their circle. This is the megaphone for word of mouth: instead of hoping the right person hears, we put it in front of them by name, at scale, with a preview email reviewed before every send.',
    example:
      'Campaigns segment by buyer type — out-of-area luxury buyers, local move-up, investor — each with its own message and call to action.',
    tool: 'Resend · deliverability (DMARC) · segmentation',
  },
  {
    icon: Activity,
    tag: 'Phase 4',
    title: 'Measure intent at every step',
    lead: 'Track every open, click, and site visit; layer lead-capture offers to grade how serious each prospect is.',
    detail:
      'Every interaction is instrumented. On top of opens and clicks, we offer real value that doubles as an intent signal: an out-of-area market review, a disclosure review, a downloadable property-condition cheat sheet. Who requests what tells us exactly how warm each prospect is — passive interest becomes a scored pipeline.',
    example:
      'A viewer who downloads the condition cheat sheet and requests a market comparison is a materially hotter lead than a one-time page visit — and gets prioritized accordingly.',
    tool: 'Session analytics · multi-step lead capture · scoring',
  },
  {
    icon: Crosshair,
    tag: 'Phase 5',
    title: 'Retarget everyone who clicks',
    lead: 'Follow every engaged prospect around the internet with the property’s ads.',
    detail:
      'Anyone who clicks or visits enters a retargeting audience and sees the property’s advertising on the sites they already browse. The home stays in front of warm prospects until they act — a fraction of the cost and waste of broad luxury advertising, aimed only at people who have already shown intent.',
    example:
      'A prospect who viewed the listing site once will keep seeing tasteful reminders of it across the web for weeks, keeping the property top of mind through a long luxury decision cycle.',
    tool: 'Meta / Google retargeting · pixel audiences',
  },
  {
    icon: PhoneCall,
    tag: 'Phase 6',
    title: 'Pursue every top lead directly',
    lead: 'The data surfaces the hottest prospects; then it gets personal.',
    detail:
      'The pipeline ranks prospects by intent. The top of that list gets direct, one-to-one outreach — to the buyer and their agent. This is the human close layered on top of the machine that found them: the machine does the finding and scoring at scale, then the relationship work happens where it counts.',
    example:
      'Instead of cold-calling the world, outreach is concentrated on the handful of genuinely high-intent buyers the data identified.',
    tool: 'Direct outreach · agent-to-agent · CRM',
  },
  {
    icon: Gauge,
    tag: 'Phase 7',
    title: 'Prove it in real time',
    lead: 'Watch the entire campaign perform on a private, password-protected dashboard.',
    detail:
      'You get your own login to a live analytics dashboard: total visits, time on site, where viewers are watching from, top metros, lead captures, and film views — updating as the campaign runs. No monthly summary spin, no black box. The raw performance of your listing, always on. The live 175 Huckleberry dashboard is embedded below.',
    example:
      'The Huckleberry dashboard revealed 43% of interest coming from the Bay Area — intelligence that directly reshaped where the next wave of outreach was aimed.',
    tool: 'Live seller dashboard · always-on reporting',
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

function PhaseCard({ p, i }: { p: (typeof PHASES)[number]; i: number }) {
  const [open, setOpen] = useState(i === 0)
  const Icon = p.icon
  return (
    <div className="mp-lift rounded-[22px] border border-black/[0.07] bg-white overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left grid grid-cols-[auto_1fr_auto] items-center gap-5 p-6 md:p-7"
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(184,150,90,0.12)' }}
        >
          <Icon className="w-5 h-5" style={{ color: GOLD }} />
        </div>
        <div>
          <div className="mp-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: GOLD }}>
            {p.tag}
          </div>
          <h3 className="mp-serif text-[20px] md:text-[24px] font-semibold mt-0.5" style={{ color: NAVY }}>
            {p.title}
          </h3>
          <p className="text-[14px] mt-1 leading-snug" style={{ color: INK }}>
            {p.lead}
          </p>
        </div>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
          style={{ background: open ? GOLD : 'rgba(13,27,42,0.05)' }}
        >
          {open ? (
            <Minus className="w-4 h-4" style={{ color: '#fff' }} />
          ) : (
            <Plus className="w-4 h-4" style={{ color: NAVY }} />
          )}
        </div>
      </button>

      <div
        className="grid transition-all duration-500 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-6 md:px-7 pb-7 pl-[4.25rem] md:pl-[5rem]">
            <p className="text-[15px] leading-relaxed" style={{ color: INK }}>
              {p.detail}
            </p>
            <div className="mt-4 rounded-xl p-4" style={{ background: '#f7f8fa' }}>
              <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mb-1.5" style={{ color: GOLD }}>
                In practice
              </div>
              <p className="text-[14px] leading-relaxed" style={{ color: NAVY }}>
                {p.example}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="mp-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: INK }}>
                Tools
              </span>
              <span className="text-[12.5px]" style={{ color: INK }}>
                {p.tool}
              </span>
            </div>
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

      {/* HERO */}
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
              <PillButton href="#dashboard" variant="secondary" onDark>
                See the live campaign data
              </PillButton>
            </div>
          </div>
        </div>
      </ParallaxHero>

      <div style={{ background: NAVY_DEEP }}>
        <Marquee items={PROOF} />
      </div>

      {/* THESIS */}
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
              sounds like luck — but it isn&rsquo;t. It can be manufactured. The seven-phase system
              below exists to identify those few hundred people, put the home in front of them by
              name, and turn passive interest into a measurable, closeable pipeline.
            </p>
          </Reveal>
        </div>
      </section>

      {/* THE MACHINE — interactive, expandable */}
      <section id="machine" className="max-w-5xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>
            The outreach machine
          </div>
          <h2 className="mp-serif text-[32px] md:text-[48px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
            Seven phases, hand to hand.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed max-w-2xl" style={{ color: INK }}>
            The opposite of &ldquo;list it and hope.&rdquo; Tap any phase to see how it works, a real
            example from a live campaign, and the tools behind it.
          </p>
        </Reveal>

        <div className="mt-12 flex flex-col gap-4">
          {PHASES.map((p, i) => (
            <Reveal key={p.tag} delay={0.03 * i}>
              <PhaseCard p={p} i={i} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* LIVE DASHBOARD */}
      <section id="dashboard" style={{ background: NAVY_DEEP }}>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <Reveal>
              <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
                The proof · live data
              </div>
              <h2 className="mp-serif text-white text-[30px] md:text-[44px] leading-[1.08] font-semibold">
                This is a real campaign, right now.
              </h2>
              <p className="mt-6 text-[16px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Below is the actual, live analytics for 175 Huckleberry Drive in Jackson Hole —
                pulled straight from the campaign as you read this. Hover or tap any metro to see
                where the buyers are. Note the story it tells: 43% of interest comes from the Bay
                Area, not Wyoming — exactly the out-of-area buyer the strategy targeted.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="mt-10">
              <LiveHuckleberryDashboard />
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <PillButton href="https://175huckleberrydrive.com/analytics/" onDark>
                Open the full live dashboard <ArrowUpRight className="w-4 h-4" />
              </PillButton>
              <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Every seller gets their own password-protected login.
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* STATS */}
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

      {/* CTA */}
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
