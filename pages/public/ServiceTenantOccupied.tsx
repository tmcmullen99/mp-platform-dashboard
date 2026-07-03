// Bespoke service page: Sell Tenant-Occupied.
//
// Thesis: a tenant-occupied property is not a problem to hide — it's an
// investment asset to be marketed to the right buyer, OR a vacancy to be
// unlocked (via a compliant tenant buyout) for top dollar. We run BOTH tracks
// and let the numbers decide. Structure mirrors the Luxury "machine": a
// phase-by-phase strategy, click-to-expand. Accent is navy/logo-blue (gold is
// reserved for Luxury). Closes into the 1031 Exchange page.

import { useState } from 'react'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'
import ServiceArticleFeed from '@/components/public/ServiceArticleFeed'
import SFInvestorMap from '@/components/public/SFInvestorMap'
import {
  MotionStyles,
  Reveal,
  ParallaxHero,
  Marquee,
  PillButton,
  NAVY,
  NAVY_DEEP,
  INK,
  LOGO_BLUE,
} from '@/components/public/motion'
import {
  Scale,
  FileText,
  Radar,
  Mail,
  Handshake,
  Repeat,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Minus,
  Building2,
  Users,
  TrendingUp,
  ShieldCheck,
  CircleDollarSign,
} from 'lucide-react'

const HERO_IMG =
  'https://kumfuludrhoqirxvaqja.supabase.co/storage/v1/object/public/listing-photos/site/sf-skyline-dusk.webp'

const ACCENT = LOGO_BLUE

// The strategy — each phase expands to detail + a concrete example + the tools.
const PHASES = [
  {
    icon: Scale,
    tag: 'Phase 1',
    title: 'Decide the path: sell occupied, or sell vacant',
    lead: 'The single biggest value lever is whether the home sells with the tenant in place or delivered vacant. We model both.',
    detail:
      'A tenant-occupied sale reaches investors; a vacant sale reaches the full buyer pool and almost always commands more per square foot. But vacating has costs, risk, and legal process. Before anything else, we run the numbers on both paths — occupied sale price vs. vacant sale price net of a buyout and carrying costs — so the decision is driven by math, not guesswork.',
    example:
      'On many two-to-four unit properties, delivering even one unit vacant lifts the sale price by far more than the cost of a fair, compliant tenant buyout — but only the side-by-side analysis proves it.',
    tool: 'Occupied-vs-vacant net analysis · comparable sales · carrying-cost model',
  },
  {
    icon: Handshake,
    tag: 'Phase 2',
    title: 'Structure a compliant tenant buyout',
    lead: 'When vacant is the higher-value path, we negotiate a fair, legal buyout — with in-house legal navigating the tenancy rules.',
    detail:
      'Tenant buyouts are heavily regulated, and the rules vary by city — required disclosures, cooling-off periods, filing obligations, and relocation minimums. Done wrong, a buyout is void or worse. We structure the offer, and my in-house legal partner (a California real estate attorney) navigates the tenancy law, the buyout agreement, and every local ordinance so the vacancy is clean and defensible.',
    example:
      'A well-structured buyout is often a win for both sides: the tenant receives a meaningful, fair payment to relocate, and the owner unlocks a materially higher vacant sale price.',
    tool: 'In-house legal · buyout agreements · local ordinance compliance',
  },
  {
    icon: FileText,
    tag: 'Phase 3',
    title: 'Analyze the tenancy and position the asset',
    lead: 'If we sell occupied, we make the property legible to investors — a complete analysis of the lease, income, and upside.',
    detail:
      'Investors buy numbers, not emotion. We perform a full analysis of the tenancy in place — current rent vs. market rent, lease terms and expirations, payment history, deposit status, and the income the property throws off today. Then we build the case for what it could produce, so the buyer sees both the in-place return and the upside.',
    example:
      'A unit renting well below market is not a liability to an investor — it is upside. Positioned correctly, "under-market rent" becomes "value-add opportunity."',
    tool: 'Lease audit · rent-roll analysis · market-rent study',
  },
  {
    icon: FileText,
    tag: 'Phase 4',
    title: 'Build the offering memorandum',
    lead: 'Package the property as a professional investment offering — the document serious investors expect.',
    detail:
      'We produce a full offering memorandum and building analysis: rent roll, income and expense statement, cap rate and cash-on-cash at the asking price, unit mix, condition, and the value-add thesis. This is the same institutional-grade package a commercial broker would prepare — it signals that the property is a serious investment and lets a buyer diligence it in depth without friction.',
    example:
      'When an investor can open one document and see the cap rate, the rent roll, and the upside laid out cleanly, the property competes on its merits — and moves faster.',
    tool: 'Offering memorandum · building analysis · cap-rate / cash-flow modeling',
  },
  {
    icon: Radar,
    tag: 'Phase 5',
    title: 'Find the investors who want it',
    lead: 'The same targeted machine behind our luxury listings — pointed at investors instead of end buyers.',
    detail:
      'We identify real investors who own comparable rental property nearby, then rank them by number of properties owned, estimated net worth, and likelihood of wanting an additional rental asset. This is direct, data-driven prospecting: instead of listing and hoping an investor happens by, we build the list of the specific people most likely to buy — and go to them.',
    example:
      'An owner of six nearby rental units is a far more likely buyer than the open market at large. We surface those owners by name and rank them by capacity and fit.',
    tool: 'Ownership data · portfolio ranking · net-worth enrichment',
  },
  {
    icon: Mail,
    tag: 'Phase 6',
    title: 'Reach them directly, then negotiate hard',
    lead: 'Verified outreach to the ranked investor list — then expert negotiation to retain every dollar of value.',
    detail:
      'We append verified contact details and run tailored campaigns inviting each investor to review the offering — every send previewed first. As interest comes in, the negotiation is where value is won or lost: cap rate framing, lease and buyout contingencies, close timeline, and terms are all negotiated deliberately to hold the price and protect your net proceeds.',
    example:
      'Because the offering memorandum has already answered the investor’s diligence questions, negotiation stays focused on price and terms — not on defending the asset.',
    tool: 'Verified outreach · segmented campaigns · expert negotiation',
  },
  {
    icon: Repeat,
    tag: 'Phase 7',
    title: 'Defer the gain with a 1031 exchange',
    lead: 'Sell the asset, then roll the proceeds into your next property and defer the capital-gains tax.',
    detail:
      'A tenant-occupied property is usually an investment property — which means the gain likely qualifies for a 1031 exchange. Instead of paying capital-gains tax on the sale, you can reinvest the proceeds into a like-kind property and defer it entirely. We coordinate the sale and the exchange timeline together so the two halves line up, and hand off the mechanics to our 1031 process.',
    example:
      'Selling a rental and 1031-exchanging into a larger asset lets an investor move up without the tax drag — often the difference between a good outcome and a great one.',
    tool: 'Coordinated 1031 timeline · qualified intermediary · like-kind sourcing',
  },
]

const PROOF = [
  'Occupied-vs-vacant analysis',
  'Compliant tenant buyouts',
  'In-house legal',
  'Investment offering memorandum',
  'Targeted investor outreach',
  '1031 exchange coordination',
]

// ---------------------------------------------------------------------------
// INVESTOR NETWORK section
//
// Visual language borrows from a clean SaaS "live board" (offer-board cards,
// side-by-side comparison, a live-status panel), rendered entirely in our
// brand colors with our own data. Numbers are intentionally SOFTENED to ranges
// so the page stays honest as the list grows and never overstates.
// The map is an ABSTRACT heat-panel — no real streets — signalling
// "concentration of investor-owned condos" without implying a literal map.
// ---------------------------------------------------------------------------

const NETWORK_STATS = [
  { icon: Users, value: '1,800+', label: 'SF condo investors', sub: 'compiled & maintained' },
  { icon: Building2, value: '60+', label: 'multi-unit holders', sub: 'own 2+ SF condos' },
  { icon: CircleDollarSign, value: '$10M+', label: 'top-tier net worth', sub: 'highest-capacity buyers' },
  { icon: TrendingUp, value: '29', label: 'target buildings', sub: 'active investor demand' },
]

// Anonymized, representative "matched investor" cards — profiles, never PII.
// These illustrate how we line qualified buyers up against a tenant-occupied
// unit, in the spirit of a side-by-side offer board.
const MATCHED = [
  {
    rank: '#1',
    profile: 'Downtown SF · owns 4 condos',
    tag: 'MULTI-UNIT',
    band: '$10M+ net worth',
    fit: 'Highest fit',
    hot: true,
  },
  {
    rank: '#2',
    profile: 'Peninsula-based · owns 3 SF units',
    tag: 'ABSENTEE',
    band: '$10M+ net worth',
    fit: 'Strong fit',
    hot: false,
  },
  {
    rank: '#3',
    profile: 'Mission Bay · owns 2 condos',
    tag: 'CASH-CAPABLE',
    band: '$5M–10M net worth',
    fit: 'Strong fit',
    hot: false,
  },
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
          style={{ background: 'rgba(79,130,185,0.12)' }}
        >
          <Icon className="w-5 h-5" style={{ color: ACCENT }} />
        </div>
        <div>
          <div className="mp-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
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
          style={{ background: open ? ACCENT : 'rgba(13,27,42,0.05)' }}
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
              <div className="mp-mono text-[10px] uppercase tracking-[0.16em] mb-1.5" style={{ color: ACCENT }}>
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

export default function ServiceTenantOccupied() {
  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="services" />

      {/* HERO */}
      <ParallaxHero image={HERO_IMG} minH="82vh">
        <div className="max-w-6xl mx-auto px-6 py-28">
          <div className="max-w-3xl">
            <div
              className="mp-anim mp-mono text-[11px] uppercase tracking-[0.28em] mb-6"
              style={{ color: '#c3cfe0', animationDelay: '0.1s' }}
            >
              Sell Tenant-Occupied
            </div>
            <h1
              className="mp-anim mp-serif text-white text-[44px] md:text-[64px] leading-[1.03] font-semibold"
              style={{ animationDelay: '0.2s' }}
            >
              A tenant isn&rsquo;t a problem.
              <br />
              It&rsquo;s a strategy.
            </h1>
            <p
              className="mp-anim text-lg md:text-xl mt-7 leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.85)', animationDelay: '0.35s', maxWidth: '680px' }}
            >
              Selling a property with a tenant in place has two paths to top dollar: market it as
              an income asset to the right investor, or unlock a vacancy through a fair, compliant
              buyout and sell to the full market. I run both — backed by in-house legal — and let
              the numbers decide.
            </p>
            <div className="mp-anim flex flex-wrap gap-3 mt-9" style={{ animationDelay: '0.5s' }}>
              <PillButton href="tel:+14156919272" onDark>
                Talk through your property <ArrowUpRight className="w-4 h-4" />
              </PillButton>
              <PillButton href="#strategy" variant="secondary" onDark>
                See the strategy
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
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: ACCENT }}>
              The premise
            </div>
            <h2 className="mp-serif text-[30px] md:text-[46px] leading-[1.12] font-semibold" style={{ color: NAVY }}>
              Most agents treat a tenant as an obstacle. The right buyer treats it as income.
            </h2>
            <p className="mt-7 leading-relaxed text-[17px]" style={{ color: INK }}>
              A tenant-occupied home can quietly cost you money if it&rsquo;s marketed like a vacant
              one and shown to buyers who don&rsquo;t want a lease. The value is unlocked by choosing
              the right path deliberately &mdash; investor sale or compliant vacancy &mdash; and
              executing it with the analysis, legal work, and targeted outreach it deserves. The
              strategy below is how that&rsquo;s done, end to end.
            </p>
          </Reveal>
        </div>
      </section>

      {/* THE STRATEGY — interactive, expandable */}
      <section id="strategy" className="max-w-5xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: ACCENT }}>
            The strategy
          </div>
          <h2 className="mp-serif text-[32px] md:text-[48px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
            Two paths, one goal: your top dollar.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed max-w-2xl" style={{ color: INK }}>
            Tap any phase to see how it works, a concrete example, and the tools behind it. The
            first two phases decide the path; the rest execute it.
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

      {/* INVESTOR NETWORK — the differentiator behind Phase 5/6 */}
      <section style={{ background: '#f7f8fa' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <Reveal>
            <div className="max-w-2xl">
              <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: ACCENT }}>
                Why phase 5 is different
              </div>
              <h2 className="mp-serif text-[32px] md:text-[48px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
                We don&rsquo;t list and hope. We already know the buyers.
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed" style={{ color: INK }}>
                Most agents put a tenant-occupied unit on the open market and wait for an investor
                to wander in. We&rsquo;ve done the opposite: built and maintained a working list of
                the actual investors who own condos across San Francisco &mdash; ranked by how many
                units they hold, where they buy, and their capacity to move. When your property is
                ready, we already know who to call.
              </p>
            </div>
          </Reveal>

          {/* Heat panel + live board, side by side */}
          <div className="mt-12 grid lg:grid-cols-[1.15fr_1fr] gap-6 items-stretch">
            {/* Heat panel card */}
            <Reveal>
              <div
                className="mp-lift rounded-[22px] overflow-hidden h-full flex flex-col"
                style={{ background: NAVY_DEEP }}
              >
                <div className="flex items-center justify-between px-6 pt-6">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                        style={{ background: ACCENT }}
                      />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: ACCENT }} />
                    </span>
                    <span className="mp-mono text-[10px] uppercase tracking-[0.2em] text-white/90">
                      Live &middot; SF investor demand
                    </span>
                  </div>
                  <span className="mp-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                    Investor-owned condos
                  </span>
                </div>
                <div className="px-4 pt-4 pb-2">
                  <SFInvestorMap />
                </div>
                <div className="px-6 pb-6 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#fff' }} />
                    <span className="text-[11px] text-white/70">Multi-unit &amp; high-value owners</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: ACCENT }} />
                    <span className="text-[11px] text-white/70">Investor-owned condos</span>
                  </div>
                  <span className="text-[10px] text-white/40 ml-auto">
                    Representative &middot; SoMa · Mission Bay · Downtown
                  </span>
                </div>
              </div>
            </Reveal>

            {/* Stats board */}
            <Reveal delay={0.05}>
              <div className="mp-lift rounded-[22px] border border-black/[0.07] bg-white h-full p-6 md:p-7 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <span className="mp-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
                    The list, by the numbers
                  </span>
                  <ShieldCheck className="w-4 h-4" style={{ color: ACCENT }} />
                </div>
                <div className="grid grid-cols-2 gap-4 grow">
                  {NETWORK_STATS.map((s) => {
                    const Icon = s.icon
                    return (
                      <div key={s.label} className="rounded-2xl p-4" style={{ background: '#f7f8fa' }}>
                        <Icon className="w-5 h-5 mb-2" style={{ color: ACCENT }} />
                        <div className="mp-serif text-[28px] font-semibold leading-none" style={{ color: NAVY }}>
                          {s.value}
                        </div>
                        <div className="text-[13px] font-medium mt-1.5" style={{ color: NAVY }}>
                          {s.label}
                        </div>
                        <div className="text-[11.5px] mt-0.5" style={{ color: INK }}>
                          {s.sub}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[11.5px] leading-relaxed mt-4" style={{ color: INK }}>
                  Figures reflect our maintained San Francisco investor list and update as it grows.
                  Every owner is stored as first-party data; do-not-contact preferences are recorded
                  and honored.
                </p>
              </div>
            </Reveal>
          </div>

          {/* Matched-investor strip — offer-board style */}
          <Reveal delay={0.05}>
            <div className="mt-6 rounded-[22px] border border-black/[0.07] bg-white overflow-hidden">
              <div className="flex items-center justify-between px-6 md:px-7 pt-6">
                <div>
                  <div className="mp-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
                    Illustrative match board
                  </div>
                  <h3 className="mp-serif text-[22px] md:text-[26px] font-semibold mt-1" style={{ color: NAVY }}>
                    How we line buyers up against your unit
                  </h3>
                </div>
                <Radar className="w-6 h-6 shrink-0" style={{ color: ACCENT }} />
              </div>
              <div className="px-6 md:px-7 pb-3 pt-1">
                <p className="text-[13.5px] leading-relaxed max-w-2xl" style={{ color: INK }}>
                  When your property is ready, we rank the specific investors most likely to buy it
                  &mdash; then reach out directly. Below is a representative view; real profiles are
                  matched to your building and never shown publicly.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-4 p-6 md:p-7 pt-3">
                {MATCHED.map((m) => (
                  <div
                    key={m.rank}
                    className="rounded-2xl border p-5"
                    style={{
                      borderColor: m.hot ? ACCENT : 'rgba(0,0,0,0.08)',
                      background: m.hot ? 'rgba(79,130,185,0.05)' : '#fff',
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center mp-mono text-[13px] font-semibold"
                        style={{ background: NAVY, color: '#fff' }}
                      >
                        {m.rank}
                      </div>
                      <span
                        className="mp-mono text-[9px] uppercase tracking-[0.14em] px-2 py-1 rounded-full"
                        style={{
                          background: m.hot ? ACCENT : 'rgba(13,27,42,0.06)',
                          color: m.hot ? '#fff' : NAVY,
                        }}
                      >
                        {m.tag}
                      </span>
                    </div>
                    <div className="text-[14.5px] font-semibold" style={{ color: NAVY }}>
                      {m.profile}
                    </div>
                    <div className="text-[12.5px] mt-1" style={{ color: INK }}>
                      {m.band}
                    </div>
                    <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
                      <span className="mp-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: INK }}>
                        Match
                      </span>
                      <span className="text-[12.5px] font-semibold" style={{ color: m.hot ? ACCENT : NAVY }}>
                        {m.fit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 1031 BRIDGE */}
      <section style={{ background: NAVY_DEEP }}>
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-24">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-4" style={{ color: ACCENT }}>
              After the sale
            </div>
            <h2 className="mp-serif text-white text-[30px] md:text-[44px] leading-[1.08] font-semibold">
              Sold the asset? Don&rsquo;t hand the gain to the IRS.
            </h2>
            <p className="mt-6 text-[16px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
              Because a tenant-occupied property is an investment, the gain usually qualifies for a
              1031 exchange &mdash; letting you reinvest the proceeds into your next property and
              defer the capital-gains tax entirely. It&rsquo;s the natural next move, and we
              coordinate the two timelines together.
            </p>
            <div className="mt-8">
              <PillButton href="/services/1031-exchange" onDark>
                See the 1031 exchange strategy <ArrowRight className="w-4 h-4" />
              </PillButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: NAVY }}>
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: ACCENT }}>
              Own a property with a tenant?
            </div>
            <h2 className="mp-serif text-white text-[36px] md:text-[52px] leading-[1.05] font-semibold">
              Let&rsquo;s find your top dollar.
            </h2>
            <p className="mt-6 text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              A no-obligation conversation to run the occupied-vs-vacant numbers and map the right
              path for your property.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-9">
              <PillButton href="tel:+14156919272" onDark>
                (415) 691-9272 <ArrowUpRight className="w-4 h-4" />
              </PillButton>
              <PillButton href="/services/1031-exchange" variant="secondary" onDark>
                Explore 1031 exchanges
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
