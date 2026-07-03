// Bespoke service page: Luxury Listing Marketing ($10M+).
//
// Thesis: ultra-luxury homes sell through word of mouth, so we ENGINEER it.
// Expanded + interactive: the 7-phase machine is now click-to-expand (each
// phase reveals the detail, a concrete example, and the actual tooling), and
// the proof section embeds the LIVE 175 Huckleberry analytics dashboard
// (interactive metro map + live counters, reading real campaign data).

import { useState } from 'react'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import ServiceArticleFeed from '@/components/public/ServiceArticleFeed'
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
  Plus,
  Minus,
  FileSearch,
  MapPin,
  Camera,
  Send,
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

// ---------------------------------------------------------------------------
// EXPIRED-LISTING REVIEW — the wedge that wins the listing.
//
// Most luxury homes that "expire" (came off the market unsold) didn't fail on
// price — they failed on reach. This section shows the exact review process,
// using 175 Huckleberry as the worked example, then makes the case for
// applying it to a stuck SF / Silicon Valley luxury home. Numbers are the real
// Huckleberry figures from the listing review.
// ---------------------------------------------------------------------------

const REVIEW_STEPS = [
  {
    icon: FileSearch,
    n: '01',
    title: 'Audit why it really stalled',
    body: 'I review the live listing the way a buyer would — the photography, the video, the channel mix, the price positioning — against best-in-class luxury marketing. Nine times out of ten a "failed" trophy home isn\'t overpriced; it\'s been shown at its worst angle to the wrong audience.',
    hb: 'Huckleberry: the single most persuasive exterior — the Tetons rising behind the home — was buried at photo 33 of 36, while the campaign leaned entirely on local channels.',
  },
  {
    icon: Camera,
    n: '02',
    title: 'Re-frame the home',
    body: 'Before a dollar goes to distribution, the assets have to earn the click. Surgical, low-cost fixes: lead with the hero frame, re-shoot at twilight and in-season, correct staging and color, and cut the gallery to a tight, ordered sequence. Luxury buyers buy the feeling of a place in the first three frames.',
    hb: 'Huckleberry: promote the Teton frame to the cover, re-stain the siding from yellow toward weathered grey, shoot ground-level seasonal angles, and cut 36 photos to a curated ~22.',
  },
  {
    icon: MapPin,
    n: '03',
    title: 'Find where the buyer actually lives',
    body: 'This is the core of the review. I pull an ownership dataset of every comparable luxury owner in the market, isolate the high-net-worth owners whose primary home is elsewhere, and map exactly where they live. That map — not a guess — is the real buyer pool, and it usually overturns the local instinct.',
    hb: 'Huckleberry: of 1,261 valley luxury owners, 538 keep their primary home elsewhere. The buyer pool skews Northeast (~30%), then Midwest and Texas — not local, and not California.',
  },
  {
    icon: Send,
    n: '04',
    title: 'Build a direct-to-buyer campaign',
    body: 'I translate that map into a precise plan: a tracked property site that captures every visitor, then name-by-name outreach to the out-of-area owners the data surfaced — plus their affluent neighbors, who are the most powerful word-of-mouth signal there is. Spend follows interest; nothing is wasted on people who will never buy.',
    hb: 'Huckleberry: 459 out-of-area luxury owners were already reachable by email — a buyer pool that could be marketed to directly on day one, no portal roulette.',
  },
]

// California-adapted buyer-origin illustration for the SF / Silicon Valley market.
// Directional, framed as "how the analysis typically reads" — not a specific
// property's data — so it stays honest as a marketing illustration.
const CA_ORIGINS = [
  { name: 'Silicon Valley tech wealth', pct: 34, lead: true },
  { name: 'SF / Peninsula', pct: 22, lead: false },
  { name: 'Greater LA / SoCal', pct: 14, lead: false },
  { name: 'Out-of-state (NY / TX / FL)', pct: 12, lead: false },
  { name: 'International (Asia / EU)', pct: 10, lead: false },
  { name: 'Other California', pct: 8, lead: false },
]

function BuyerOriginPanel() {
  return (
    <div className="rounded-[22px] border border-black/[0.07] bg-white overflow-hidden">
      <div className="px-6 md:px-8 pt-7 pb-2">
        <div className="mp-mono text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: GOLD }}>
          How the analysis typically reads · SF / Silicon Valley
        </div>
        <h3 className="mp-serif text-[22px] md:text-[26px] font-semibold" style={{ color: NAVY }}>
          For a Bay Area trophy home, the buyer pool has a shape.
        </h3>
      </div>
      <div className="px-6 md:px-8 py-6 flex flex-col gap-0">
        {CA_ORIGINS.map((o) => (
          <div
            key={o.name}
            className="grid items-center gap-4 py-3.5 border-b last:border-b-0"
            style={{
              gridTemplateColumns: '190px 1fr 44px',
              borderColor: 'rgba(0,0,0,0.07)',
            }}
          >
            <span
              className="text-[13px] font-semibold leading-tight"
              style={{ color: o.lead ? GOLD : NAVY }}
            >
              {o.name}
            </span>
            <span className="h-2.5 rounded-full overflow-hidden" style={{ background: '#f0ece3' }}>
              <span
                className="block h-full rounded-full"
                style={{ width: `${o.pct * 2.6}%`, background: o.lead ? GOLD : NAVY }}
              />
            </span>
            <span
              className="mp-serif text-[16px] font-semibold text-right"
              style={{ color: o.lead ? GOLD : NAVY }}
            >
              {o.pct}%
            </span>
          </div>
        ))}
      </div>
      <div className="px-6 md:px-8 pb-6">
        <p className="text-[12.5px] leading-relaxed" style={{ color: INK }}>
          Illustrative of method, not a specific property. For any listing, I build the real
          distribution from an ownership dataset of comparable luxury owners — then market straight
          to the pool it reveals.
        </p>
      </div>
    </div>
  )
}

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
              Luxury Listing Marketing · California
            </div>
            <h1
              className="mp-anim mp-serif text-white text-[44px] md:text-[66px] leading-[1.03] font-semibold"
              style={{ animationDelay: '0.2s' }}
            >
              Your home didn&rsquo;t fail to sell.
              <br />
              The marketing <span className="mp-accent-gold">missed the buyer.</span>
            </h1>
            <p
              className="mp-anim text-lg md:text-xl mt-7 leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.82)', animationDelay: '0.35s', maxWidth: '660px' }}
            >
              A luxury home that came off the market unsold almost never has a price problem &mdash;
              it has a reach problem. I review exactly why a trophy listing stalled, find where the
              buyer actually lives, and market the home to that person directly. It&rsquo;s the same
              system running live on a $9.95M listing right now &mdash; and it&rsquo;s how I&rsquo;d
              re-launch yours.
            </p>
            <div className="mp-anim flex flex-wrap gap-3 mt-9" style={{ animationDelay: '0.5s' }}>
              <PillButton href="/luxury-listings" onDark>
                Request a private listing review <ArrowUpRight className="w-4 h-4" />
              </PillButton>
              <PillButton href="#review" variant="secondary" onDark>
                See how the review works
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
              A luxury home has maybe a few hundred plausible buyers on earth. Marketing to
              &ldquo;everyone&rdquo; reaches none of them.
            </h2>
            <p className="mt-7 leading-relaxed text-[17px]" style={{ color: INK }}>
              This is why trophy homes stall. The sale almost never comes from a sign in the yard or
              a portal listing &mdash; it comes from the right person hearing about it. That sounds
              like luck, but it isn&rsquo;t: it can be manufactured. Everything below is how I do it
              &mdash; starting with a candid review of why a home stalled, and ending with a live,
              measurable pipeline pointed at the few hundred people who can actually buy it.
            </p>
          </Reveal>
        </div>
      </section>

      {/* EXPIRED-LISTING REVIEW — the wedge */}
      <section id="review" className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="max-w-3xl">
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>
              How I review a stalled listing
            </div>
            <h2 className="mp-serif text-[32px] md:text-[48px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
              A trophy home that didn&rsquo;t sell gets a real diagnosis &mdash; not a price cut.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed" style={{ color: INK }}>
              When a luxury listing comes off the market unsold, the reflex is to blame the price.
              It&rsquo;s almost always the wrong call. I run the same four-step review on every
              stuck home &mdash; and it consistently finds that the marketing was aimed at the wrong
              pool. Here it is, with the live 175 Huckleberry review as the worked example.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid md:grid-cols-2 gap-5">
          {REVIEW_STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <Reveal key={s.n} delay={0.05 * i}>
                <div className="mp-lift h-full rounded-[22px] border border-black/[0.07] bg-white p-7 md:p-8 flex flex-col">
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(184,150,90,0.12)' }}
                    >
                      <Icon className="w-5 h-5" style={{ color: GOLD }} />
                    </div>
                    <span className="mp-serif text-[34px] font-semibold leading-none" style={{ color: 'rgba(13,27,42,0.14)' }}>
                      {s.n}
                    </span>
                  </div>
                  <h3 className="mp-serif text-[22px] md:text-[25px] font-semibold" style={{ color: NAVY }}>
                    {s.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed mt-3" style={{ color: INK }}>
                    {s.body}
                  </p>
                  <div className="mt-5 rounded-xl p-4" style={{ background: '#f7f8fa' }}>
                    <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mb-1.5" style={{ color: GOLD }}>
                      Huckleberry, in practice
                    </div>
                    <p className="text-[13.5px] leading-relaxed" style={{ color: NAVY }}>
                      {s.hb}
                    </p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* BUYER-ORIGIN + DIRECT-TO-BUYER */}
      <section style={{ background: '#f7f8fa' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-16 items-center">
            <Reveal>
              <div>
                <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>
                  Where your buyer actually lives
                </div>
                <h2 className="mp-serif text-[30px] md:text-[44px] leading-[1.08] font-semibold" style={{ color: NAVY }}>
                  I find the buyer directly &mdash; which is also how you keep more of the sale.
                </h2>
                <p className="mt-5 text-[16px] leading-relaxed" style={{ color: INK }}>
                  The Huckleberry review proved the buyer wasn&rsquo;t local &mdash; and named 459 of
                  them, reachable by email, on day one. For a San Francisco or Silicon Valley trophy
                  home the pool has a different shape, but the method is identical: build the real
                  ownership map, then market straight to the people in it.
                </p>
                <p className="mt-4 text-[16px] leading-relaxed" style={{ color: INK }}>
                  Reaching the buyer directly does something a portal listing never can &mdash; it can
                  bring the buyer to the table without a second brokerage in the middle. When the buyer
                  arrives through my marketing rather than another agent, there&rsquo;s often meaningful
                  room to structure the deal so <strong style={{ color: NAVY }}>more of the sale price
                  stays with you</strong> instead of going to commissions.
                </p>
                <p className="mt-4 text-[13px] leading-relaxed" style={{ color: INK }}>
                  Exact savings depend on the transaction and are confirmed in writing up front. The
                  point of the system is simple: find the right buyer myself, so the home sells for
                  more and costs you less to sell.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <BuyerOriginPanel />
            </Reveal>
          </div>
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
              Home came off the market unsold?
            </div>
            <h2 className="mp-serif text-white text-[36px] md:text-[52px] leading-[1.05] font-semibold">
              Let&rsquo;s find the buyer it <span className="mp-accent-gold">actually has.</span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              A private, no-obligation review of your California luxury listing &mdash; why it
              stalled, where your buyer really is, and exactly how I&rsquo;d re-launch it to reach
              them directly.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-9">
              <PillButton href="/luxury-listings" onDark>
                Request a private listing review <ArrowUpRight className="w-4 h-4" />
              </PillButton>
              <PillButton href="tel:+14156919272" variant="secondary" onDark>
                (415) 691-9272
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
