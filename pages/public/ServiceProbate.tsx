// Bespoke service page: Probate.
//
// THESIS. A probate petitioner is not a seller. They are a fiduciary doing a job
// they did not ask for — personally liable for doing it properly, usually
// grieving, and more than half the time managing the property from somewhere
// else. Of 500 Bay Area filings on file, 279 petitioners live away from the
// estate property and 74 are outside California entirely. Every "we buy houses
// fast" postcard they receive misreads the situation. That gap is the opening.
//
// The offer is therefore NOT "sell your house". It is "discharge a duty you did
// not ask for" — with a free date-of-death valuation letter as the way in,
// because the estate genuinely needs that document whether or not anyone ever
// lists anything.
//
// TWO LINES THIS PAGE WILL NOT CROSS, and both are stated on the page itself
// rather than buried:
//   1. No tax or legal advice. We refer. "Your basis steps up to date-of-death
//      value" is one sentence away from practising without a licence.
//   2. The vendor bench is uncompensated. Fee-splitting with attorneys and CPAs
//      is prohibited by state bar and CPA ethics, and RESPA Section 8 governs
//      anything touching settlement services. Saying so plainly is itself the
//      differentiator against every referral-fee operation in this space.
//
// Accent is LOGO_BLUE, matching sell-with-tenants; gold stays reserved for
// Luxury. Structure mirrors the established service pattern: parallax hero,
// phase-by-phase strategy with click-to-expand, then the bench, then the county
// splits, then the attorney door, closing into the valuation request.

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
  LOGO_BLUE,
} from '@/components/public/motion'
import {
  FileText,
  Scale,
  CalendarClock,
  Home,
  Users,
  Gavel,
  ShieldCheck,
  Truck,
  Sprout,
  Boxes,
  Calculator,
  KeyRound,
  ArrowRight,
  Plus,
  Minus,
  MapPin,
  Mail,
} from 'lucide-react'

const HERO_IMG =
  'https://kumfuludrhoqirxvaqja.supabase.co/storage/v1/object/public/listing-photos/site/sf-skyline-dusk.webp'

const ACCENT = LOGO_BLUE

/* ── The strategy ──────────────────────────────────────────────────────────
   Ordered the way the job actually arrives, not the way a listing pitch would
   sequence it. Selling is phase five of five, and it is the shortest one. */
const PHASES = [
  {
    icon: FileText,
    tag: 'Phase 1',
    title: 'Establish what the property was worth on the date of death',
    lead:
      'Before anything is decided, the estate needs a defensible value as of the date of passing. We prepare it, in writing, at no cost.',
    detail:
      'This is a retrospective opinion of value — what the property would have sold for on the date the owner died — and it is a different document from the probate referee’s Inventory and Appraisal, which the court orders separately. Estates need a date-of-death figure because that is the value the beneficiaries’ tax basis is measured from. Your attorney will want it in the file. We prepare it from recorded sales in the immediate area, we show our comparables, and we hand it over whether or not you ever list the property with anyone.',
    example:
      'A petitioner who receives this in week two arrives at the first attorney meeting with the one number every subsequent decision depends on, instead of guessing for three months.',
    tool: 'Retrospective comparable analysis · written letter addressed to the estate · no charge, no listing agreement',
  },
  {
    icon: Scale,
    tag: 'Phase 2',
    title: 'Find out what authority you actually have',
    lead:
      'Whether you can sell without returning to court is the single fact that determines your timeline. Most petitioners do not know which they were granted.',
    detail:
      'Under the Independent Administration of Estates Act, letters are issued with either full authority or limited authority. With full authority a sale can usually proceed on a Notice of Proposed Action to the beneficiaries. With limited authority, the sale must be confirmed by the court — which brings a published hearing, a minimum price tied to the appraised value, and an open overbid process. These are completely different sales, on completely different calendars. We read your letters with you and tell you which one you are running, before a single decision is made on price or timing.',
    example:
      'Discovering a confirmation requirement after accepting an offer is how deals fall apart and buyers walk. Discovering it in week two is simply a different plan.',
    tool: 'Review of your Letters · IAEA authority check · timeline mapped to your court',
  },
  {
    icon: Gavel,
    tag: 'Phase 3',
    title: 'If the court must confirm, run it properly',
    lead:
      'A confirmation sale has rules that catch first-time executors. Knowing them in advance is most of the work.',
    detail:
      'A court-confirmed sale generally cannot be accepted below ninety percent of the appraised value. The hearing is published, and at that hearing any qualified buyer may overbid in open court in set increments above the accepted offer. Your buyer may lose the property on the courthouse steps to somebody who has never been inside it. That is not a failure of the sale — it is the process working as designed — but a buyer who has not been told about it in advance walks away, and a petitioner who has not been told feels ambushed. We market to buyers who understand the process, we prepare your accepted buyer for the possibility, and we attend the hearing.',
    example:
      'The overbid is the single most common reason a first-time executor loses faith in the process. It is entirely avoidable as a surprise.',
    tool: 'Confirmation-aware marketing · buyer preparation · attendance at hearing',
  },
  {
    icon: Home,
    tag: 'Phase 4',
    title: 'Deal with the house itself',
    lead:
      'A home lived in for forty years by someone who has died is a problem before it is an asset. Most of this happens before anyone talks about price.',
    detail:
      'The property needs clearing, securing, insuring and — sometimes — repairing. It is generating carrying costs the entire time: mortgage, property tax, insurance, HOA dues and utilities on an empty house, every month, paid by the estate. Those costs, not the market, usually decide how fast this needs to move. We run the arithmetic with you and coordinate the work, which matters most for the petitioners managing all of this from another county or another state.',
    example:
      'Standard homeowner policies frequently restrict or void coverage once a property has been vacant for thirty to sixty days. Almost no first-time executor knows this until something happens.',
    tool: 'Vacant-property insurance referral · clear-out coordination · carrying-cost model · remote oversight',
  },
  {
    icon: Users,
    tag: 'Phase 5',
    title: 'Sell it — and keep every heir in the same conversation',
    lead:
      'Most probate sales stall on beneficiaries disagreeing, not on price. One channel, one set of facts, everybody at once.',
    detail:
      'When heirs receive different information at different times, the sale stops. We send one update to every beneficiary on the same day, containing the same numbers, for the duration. The petitioner remains the decision-maker and the point of contact — but nobody learns about an offer second-hand from a sibling. When the property does go to market it is marketed properly: professional photography, full exposure, and the same preparation any other listing would receive. An estate property is not a discount property.',
    example:
      'A single shared update thread removes the most common cause of a probate sale collapsing, and it costs nothing to run.',
    tool: 'All-beneficiary updates · full-exposure marketing · offer review with your attorney',
  },
]

/* ── The bench ─────────────────────────────────────────────────────────────
   Grouped by when the petitioner needs them, which is not the same as grouping
   by trade. Compensation disclosure sits directly beneath, not in a footnote. */
const BENCH = [
  {
    icon: Boxes,
    title: 'Clearing the home',
    items: [
      'Estate sale companies and auction houses for genuine antiques',
      'Donation with itemised tax receipts for the estate',
      'Clean-out and haul-away',
      'Packing and shipping heirlooms to beneficiaries out of state',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Holding it safely',
    items: [
      'Vacant-property insurance — before a standard policy lapses',
      'Grounds and exterior upkeep so the home does not look empty',
      'Periodic interior checks, mail hold, utility management',
      'Re-keying and lockbox control',
    ],
  },
  {
    icon: Sprout,
    title: 'Preparing it',
    items: [
      'Painters, handymen, roofers, plumbers, electricians',
      'Floor refinishing and deep cleaning',
      'Staging, or a considered decision not to stage',
      'Honest triage of what is worth doing and what is not',
    ],
  },
  {
    icon: Calculator,
    title: 'Professional',
    items: [
      'Probate attorneys, where you do not already have one',
      'CPAs for the estate return and the basis question',
      'Independent appraisers',
      'Movers and storage',
    ],
  },
]

const COUNTIES = [
  { name: 'San Francisco', slug: 'san-francisco', court: 'San Francisco Superior Court · Probate Department' },
  { name: 'San Mateo', slug: 'san-mateo', court: 'San Mateo County Superior Court · Probate' },
  { name: 'Santa Clara', slug: 'santa-clara', court: 'Santa Clara County Superior Court · Probate' },
]

export default function ServiceProbate() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="min-h-screen bg-white">
      <MotionStyles />
      <PublicNav />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <ParallaxHero image={HERO_IMG} accent="blue" minH="82vh">
        <div className="max-w-4xl">
          <Reveal>
            <p
              className="font-mono text-[11px] uppercase tracking-[0.22em] mb-5"
              style={{ color: ACCENT }}
            >
              Probate · San Francisco · San Mateo · Santa Clara
            </p>
          </Reveal>
          <Reveal delay={90}>
            <h1 className="font-serif text-white text-[clamp(2.2rem,6vw,4.4rem)] leading-[1.04] tracking-[-0.02em]">
              You have been handed a job
              <br />
              <span style={{ color: ACCENT }}>you did not ask for.</span>
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p className="mt-7 text-[17px] leading-relaxed text-white/80 max-w-2xl">
              Being appointed to administer an estate makes you responsible for a property, to a
              court, on a timetable, while you are grieving. Often from another city. Usually for
              the first time. This page is what I would want to know if it were me.
            </p>
          </Reveal>
          <Reveal delay={260}>
            <div className="mt-9 flex flex-wrap gap-3">
              <PillButton href="#valuation" onDark>
                Request a date-of-death valuation
              </PillButton>
              <PillButton href="#process" variant="secondary" onDark>
                How probate sales actually work
              </PillButton>
            </div>
          </Reveal>
          <Reveal delay={340}>
            <p className="mt-5 text-[13px] text-white/55">
              No charge. No listing agreement. The letter is yours either way.
            </p>
          </Reveal>
        </div>
      </ParallaxHero>

      <div style={{ background: NAVY }}>
        <Marquee
          items={[
            'Date-of-death valuation letters',
            'IAEA authority review',
            'Court-confirmation sales',
            'Overbid preparation',
            'Estate clear-out',
            'Vacant-property insurance',
            'All-beneficiary updates',
            'Out-of-state executors',
          ]}
        />
      </div>

      {/* ── The frame ────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <h2
              className="font-serif text-[clamp(1.7rem,3.6vw,2.6rem)] leading-tight"
              style={{ color: NAVY }}
            >
              You are not a seller. You are a fiduciary.
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-6 space-y-5 text-[16.5px] leading-relaxed" style={{ color: INK }}>
              <p>
                That distinction is the whole thing. A seller chooses to sell, on their own
                timeline, for their own benefit. You have been appointed by a court to manage
                someone else’s property for someone else’s benefit, you can be held personally
                responsible for doing it badly, and you did not volunteer.
              </p>
              <p>
                Which is why the postcards you are already receiving — cash offer, close in seven
                days, no repairs — land so poorly. They are addressed to a seller. Your actual
                problems are a court calendar, a house full of a lifetime of belongings, siblings
                who each have a view, and carrying costs running every month in the background.
              </p>
              <p>
                I handle the property side of that. The attorney handles the law, the CPA handles
                the tax, and I will tell you plainly when a question belongs to one of them rather
                than to me.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── The strategy ─────────────────────────────────────────────── */}
      <section id="process" className="py-20 md:py-28 px-6" style={{ background: '#F7F8FA' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p
              className="font-mono text-[11px] uppercase tracking-[0.2em] mb-4"
              style={{ color: ACCENT }}
            >
              The work, in order
            </p>
            <h2
              className="font-serif text-[clamp(1.8rem,4vw,2.9rem)] leading-tight max-w-3xl"
              style={{ color: NAVY }}
            >
              Selling is the last phase, and the shortest.
            </h2>
          </Reveal>

          <div className="mt-12 space-y-3">
            {PHASES.map((p, i) => {
              const Icon = p.icon
              const isOpen = open === i
              return (
                <Reveal key={p.title} delay={i * 60}>
                  <div
                    className="bg-white rounded-2xl border transition-shadow"
                    style={{
                      borderColor: isOpen ? ACCENT : 'rgba(13,27,42,0.09)',
                      boxShadow: isOpen ? '0 10px 40px rgba(13,27,42,0.08)' : 'none',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="w-full text-left px-6 md:px-8 py-6 flex items-start gap-5"
                    >
                      <span
                        className="shrink-0 w-11 h-11 rounded-xl grid place-items-center"
                        style={{ background: isOpen ? ACCENT : 'rgba(79,130,185,0.10)' }}
                      >
                        <Icon size={20} color={isOpen ? '#fff' : ACCENT} strokeWidth={1.7} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span
                          className="block font-mono text-[10px] uppercase tracking-[0.18em] mb-1.5"
                          style={{ color: ACCENT }}
                        >
                          {p.tag}
                        </span>
                        <span
                          className="block font-serif text-[19px] md:text-[22px] leading-snug"
                          style={{ color: NAVY }}
                        >
                          {p.title}
                        </span>
                        <span
                          className="block mt-2 text-[15px] leading-relaxed"
                          style={{ color: INK }}
                        >
                          {p.lead}
                        </span>
                      </span>
                      <span className="shrink-0 mt-1" style={{ color: ACCENT }}>
                        {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-6 md:px-8 pb-8 pl-6 md:pl-[5.5rem]">
                        <p className="text-[15.5px] leading-relaxed" style={{ color: INK }}>
                          {p.detail}
                        </p>
                        <div
                          className="mt-5 pl-4 border-l-2 text-[15px] leading-relaxed italic"
                          style={{ borderColor: ACCENT, color: INK }}
                        >
                          {p.example}
                        </div>
                        <p
                          className="mt-5 font-mono text-[11.5px] uppercase tracking-[0.12em]"
                          style={{ color: ACCENT }}
                        >
                          {p.tool}
                        </p>
                      </div>
                    )}
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── The bench ────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p
              className="font-mono text-[11px] uppercase tracking-[0.2em] mb-4"
              style={{ color: ACCENT }}
            >
              The bench
            </p>
            <h2
              className="font-serif text-[clamp(1.8rem,4vw,2.9rem)] leading-tight max-w-3xl"
              style={{ color: NAVY }}
            >
              Everyone you are about to need, already vetted.
            </h2>
            <p className="mt-5 text-[16.5px] leading-relaxed max-w-2xl" style={{ color: INK }}>
              Most of what an estate property needs has nothing to do with a real estate licence.
              These are people I have used and would use again.
            </p>
          </Reveal>

          <div className="mt-12 grid md:grid-cols-2 gap-5">
            {BENCH.map((b, i) => {
              const Icon = b.icon
              return (
                <Reveal key={b.title} delay={i * 70}>
                  <div className="h-full rounded-2xl border p-7" style={{ borderColor: 'rgba(13,27,42,0.09)' }}>
                    <div className="flex items-center gap-3">
                      <span
                        className="w-10 h-10 rounded-xl grid place-items-center"
                        style={{ background: 'rgba(79,130,185,0.10)' }}
                      >
                        <Icon size={19} color={ACCENT} strokeWidth={1.7} />
                      </span>
                      <h3 className="font-serif text-[20px]" style={{ color: NAVY }}>
                        {b.title}
                      </h3>
                    </div>
                    <ul className="mt-5 space-y-2.5">
                      {b.items.map((it) => (
                        <li key={it} className="flex gap-3 text-[15px] leading-relaxed" style={{ color: INK }}>
                          <span
                            className="mt-[0.55em] w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: ACCENT }}
                          />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )
            })}
          </div>

          {/* Compensation disclosure. On the page, not in a footnote — it is the
              difference between this bench and a referral-fee operation. */}
          <Reveal delay={120}>
            <div
              className="mt-8 rounded-2xl p-7 md:p-8"
              style={{ background: 'rgba(79,130,185,0.07)', border: '1px solid rgba(79,130,185,0.22)' }}
            >
              <div className="flex items-start gap-4">
                <ShieldCheck size={22} color={ACCENT} strokeWidth={1.7} className="mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-serif text-[19px]" style={{ color: NAVY }}>
                    I am not paid to make these referrals
                  </h3>
                  <p className="mt-3 text-[15.5px] leading-relaxed" style={{ color: INK }}>
                    No referral fee, no revenue share, no arrangement of any kind with anyone on
                    this list. That is partly ethics rules — fee-splitting with attorneys and
                    accountants is prohibited, and federal law governs referrals for settlement
                    services — and partly the point. A recommendation you have paid for is not a
                    recommendation. If someone on this bench does poor work, tell me and they come
                    off it.
                  </p>
                  <p className="mt-3 text-[15.5px] leading-relaxed" style={{ color: INK }}>
                    For the same reason: I do not give tax or legal advice. Questions about basis,
                    estate returns, creditor claims or your duties as a fiduciary go to your CPA and
                    your attorney — and I will say so rather than guess.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Counties ─────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-6" style={{ background: NAVY_DEEP }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p
              className="font-mono text-[11px] uppercase tracking-[0.2em] mb-4"
              style={{ color: ACCENT }}
            >
              Where I work
            </p>
            <h2 className="font-serif text-white text-[clamp(1.8rem,4vw,2.9rem)] leading-tight max-w-3xl">
              Three counties, three different courts.
            </h2>
            <p className="mt-5 text-[16.5px] leading-relaxed text-white/70 max-w-2xl">
              Timelines, local practice and how quickly a hearing can be set differ by county.
              Tell me which one you are in and I will tell you what to expect.
            </p>
          </Reveal>

          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {COUNTIES.map((c, i) => (
              <Reveal key={c.slug} delay={i * 80}>
                <div
                  className="block h-full rounded-2xl p-7"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <MapPin size={20} color={ACCENT} strokeWidth={1.7} />
                  <h3 className="mt-4 font-serif text-[22px] text-white">{c.name} County</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/60">{c.court}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Valuation request ────────────────────────────────────────── */}
      <section id="valuation" className="py-20 md:py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <span
              className="inline-grid place-items-center w-14 h-14 rounded-2xl"
              style={{ background: 'rgba(79,130,185,0.10)' }}
            >
              <FileText size={24} color={ACCENT} strokeWidth={1.7} />
            </span>
          </Reveal>
          <Reveal delay={70}>
            <h2
              className="mt-7 font-serif text-[clamp(1.8rem,4vw,2.9rem)] leading-tight"
              style={{ color: NAVY }}
            >
              Start with the date-of-death valuation.
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-5 text-[16.5px] leading-relaxed" style={{ color: INK }}>
              Tell me the property and the date of passing. I will prepare a written opinion of
              value as of that date, with the comparable sales it is built from, addressed to the
              estate so it can go straight into your attorney’s file. It takes a few days. There
              is no charge, no listing agreement, and no obligation of any kind — the letter is
              yours whatever you decide to do next.
            </p>
          </Reveal>
          <Reveal delay={210}>
            <div className="mt-9 flex flex-wrap gap-3 justify-center">
              <PillButton href="mailto:tim@mcmullen.properties?subject=Date-of-death%20valuation%20request&body=Property%20address%3A%0ADate%20of%20passing%3A%0AYour%20name%3A%0A">
                Request the valuation letter
              </PillButton>
              <PillButton href="/services/probate/for-attorneys" variant="secondary">
                I’m an attorney
              </PillButton>
            </div>
          </Reveal>
          <Reveal delay={280}>
            <p className="mt-6 text-[13.5px] leading-relaxed" style={{ color: INK, opacity: 0.7 }}>
              A date-of-death valuation is an opinion of value prepared by a licensed real estate
              broker. It is not a certified appraisal, and it is not the probate referee’s
              Inventory and Appraisal, which the court arranges separately.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Attorneys ────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-6" style={{ background: '#F7F8FA' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-[1.2fr,1fr] gap-12 items-start">
            <Reveal>
              <p
                className="font-mono text-[11px] uppercase tracking-[0.2em] mb-4"
                style={{ color: ACCENT }}
              >
                For probate attorneys
              </p>
              <h2
                className="font-serif text-[clamp(1.7rem,3.6vw,2.6rem)] leading-tight"
                style={{ color: NAVY }}
              >
                Your client will ask you who to call about the house.
              </h2>
              <div className="mt-6 space-y-4 text-[16px] leading-relaxed" style={{ color: INK }}>
                <p>
                  I work the property side of estates without creating work for you: date-of-death
                  valuations turned around in days, confirmation sales run to the calendar, and
                  beneficiaries kept in one conversation so the disagreements surface early rather
                  than at the hearing.
                </p>
                <p>
                  No referral fee in either direction — that is prohibited and I would not want it
                  anyway. What I would like is to be useful enough that you keep my number.
                </p>
              </div>
              <div className="mt-8">
                <PillButton href="/services/probate/for-attorneys" variant="secondary">
                  How I work with counsel
                </PillButton>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="rounded-2xl border p-7" style={{ borderColor: 'rgba(13,27,42,0.09)', background: '#fff' }}>
                <h3 className="font-serif text-[19px]" style={{ color: NAVY }}>
                  What I send you
                </h3>
                <ul className="mt-5 space-y-3">
                  {[
                    'Date-of-death valuation, written, with comparables',
                    'Carrying-cost model for the estate file',
                    'Marketing plan aware of confirmation and overbid',
                    'One update thread, every beneficiary, same day',
                  ].map((x) => (
                    <li key={x} className="flex gap-3 text-[15px] leading-relaxed" style={{ color: INK }}>
                      <ArrowRight size={15} color={ACCENT} className="mt-1 shrink-0" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <ServiceArticleFeed serviceSlug="probate" heading="Reading on probate sales" />

      {/* ── Close ────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-6" style={{ background: NAVY }}>
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <h2 className="font-serif text-white text-[clamp(1.8rem,4vw,2.9rem)] leading-tight">
              If you are not ready to sell anything,
              <br />
              <span style={{ color: ACCENT }}>that is a normal place to be.</span>
            </h2>
          </Reveal>
          <Reveal delay={90}>
            <p className="mt-6 text-[16.5px] leading-relaxed text-white/75">
              Most people I speak with are months away from a decision, and a good number never sell
              at all — the house goes to a beneficiary, or the family keeps it. The valuation letter
              is useful in every one of those outcomes. Ask for it, use it, and if the property does
              go to market later, you will already know who I am.
            </p>
          </Reveal>
          <Reveal delay={160}>
            <div className="mt-9 flex flex-wrap gap-3 justify-center">
              <PillButton href="mailto:tim@mcmullen.properties?subject=Date-of-death%20valuation%20request&body=Property%20address%3A%0ADate%20of%20passing%3A%0AYour%20name%3A%0A" onDark>
                Request the valuation letter
              </PillButton>
              <PillButton href="/meet-tim" variant="secondary" onDark>
                Meet Tim
              </PillButton>
            </div>
          </Reveal>
          <Reveal delay={230}>
            <p className="mt-8 text-[13px] leading-relaxed text-white/45 max-w-xl mx-auto">
              <Mail size={13} className="inline mr-1.5 -mt-0.5" />
              Nothing on this page is tax or legal advice. Questions about your duties as an
              executor or administrator, creditor claims, estate taxes or basis belong to your
              attorney and your CPA.
            </p>
          </Reveal>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
