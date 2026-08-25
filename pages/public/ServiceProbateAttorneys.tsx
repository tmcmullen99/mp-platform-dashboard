// Bespoke service page: Probate — for attorneys.
//
// A DIFFERENT AUDIENCE, NOT A DIFFERENT TONE OF THE SAME PAGE. The petitioner
// page sells reassurance. This one sells competence and, above all, the absence
// of risk to the attorney's file. A probate attorney recommending a broker is
// putting their own reputation behind that person in front of a client who is
// already grieving and litigious-adjacent. What they need to know is: will this
// person create work for me, and will they embarrass me at the hearing.
//
// Of 500 Bay Area filings on file, 366 carry an attorney of record and 271 of
// those are distinct firms. This is the higher-value, lower-risk half of the
// probate audience: business addresses, no DNC exposure, and a referral
// relationship compounds where a petitioner transaction happens once.
//
// THREE LINES THIS PAGE HOLDS:
//   1. No referral fee in either direction. Fee-splitting with attorneys is
//      prohibited by the Rules of Professional Conduct and we do not want the
//      conversation to start there.
//   2. In-house counsel is available to verify OUR process and paperwork. It is
//      explicitly NOT advice to the attorney's client and not a second opinion
//      on their matter — that would be a conflict and, from us, unauthorised.
//   3. Nothing here is legal advice to anyone.

import { useState } from 'react'
import { Link } from 'react-router-dom'
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
  Scale,
  FileText,
  Gavel,
  CalendarClock,
  Users,
  ShieldCheck,
  Briefcase,
  ClipboardCheck,
  TrendingUp,
  Zap,
  ArrowRight,
  Plus,
  Minus,
  Mail,
} from 'lucide-react'

const HERO_IMG =
  'https://kumfuludrhoqirxvaqja.supabase.co/storage/v1/object/public/listing-photos/site/sf-skyline-dusk.webp'

const ACCENT = LOGO_BLUE

/* ── What the attorney actually gets ───────────────────────────────────────
   Framed as removals of work and risk from their file, because that is the
   currency. Every item is something that otherwise lands on their desk. */
const VALUE = [
  {
    icon: FileText,
    title: 'A date-of-death valuation, in days, at no cost',
    body:
      'Written opinion of value as of the date of passing, with the comparable sales it is built from, addressed to the estate so it drops straight into your file. No charge, no listing agreement, no obligation on your client. If the matter never becomes a sale, you still have the document.',
  },
  {
    icon: ClipboardCheck,
    title: 'A carrying-cost model you can put in front of beneficiaries',
    body:
      'Mortgage, taxes, insurance, HOA and utilities, monthly, against the estimated sale proceeds. When beneficiaries disagree about timing, the arithmetic settles it faster than anyone’s opinion — and it comes from us rather than from you.',
  },
  {
    icon: Gavel,
    title: 'Confirmation sales run to the calendar',
    body:
      'We market with the ninety-percent minimum and the overbid in mind, prepare the accepted buyer for the possibility of being outbid in open court, and attend the hearing. A buyer who learns about the overbid on the courthouse steps walks; a buyer who was told in week one usually stays.',
  },
  {
    icon: Users,
    title: 'Every beneficiary on one thread',
    body:
      'One update, same numbers, same day, to everyone entitled to receive it. Most probate sales stall on beneficiaries hearing different things at different times. Keeping them aligned is unglamorous and it is most of the job.',
  },
  {
    icon: Zap,
    title: 'Two speeds, decided by your client',
    body:
      'A clean, certain close on a compressed timeline, or full market exposure for the highest number. These are genuinely different strategies and we will show the trade-off in writing rather than assuming. Estates that need certainty and estates that need proceeds are not the same estate.',
  },
  {
    icon: Briefcase,
    title: 'The vendor bench, so the house stops being your problem',
    body:
      'Clear-out, vacant-property insurance before a standard policy lapses, grounds, security, trades, staging. Coordinated by us, especially where the petitioner is out of county or out of state — more than half of them are.',
  },
]

/* ── The two speeds, side by side ─────────────────────────────────────────── */
const SPEEDS = [
  {
    tag: 'Certainty',
    title: 'Clean and quick',
    lead: 'When the estate needs the matter closed.',
    points: [
      'Marketed to buyers who transact on estate property routinely',
      'Sold as-is, with disclosure of what is known and honest about what is not',
      'No repair contingencies negotiated back onto the estate',
      'Timeline set against your court calendar, not against a market cycle',
    ],
  },
  {
    tag: 'Proceeds',
    title: 'Top of the market',
    lead: 'When the beneficiaries want the number maximised.',
    points: [
      'Prepared, photographed and marketed like any other listing',
      'Targeted clear-out and repair where the return justifies the spend',
      'Full exposure — an estate property is not a discount property',
      'Modelled against carrying cost so the extra weeks are shown to pay for themselves',
    ],
  },
]

const FAQ = [
  {
    q: 'Do you pay referral fees?',
    a: 'No, in either direction. Fee-splitting between a broker and an attorney is prohibited under the Rules of Professional Conduct, and federal law governs referrals for settlement services. We do not offer it, we will not accept it, and we would rather the relationship not begin with that question. What we want is to be useful enough that you keep the number.',
  },
  {
    q: 'What is the in-house counsel for?',
    a: 'To answer questions about OUR process, paperwork and disclosures — how we document an as-is sale, what our listing agreement says in an estate context, how we handle an overbid. It exists so that you can verify how we operate without spending your own billable time reconstructing it. It is explicitly not advice to your client, not a second opinion on your matter, and not a substitute for anything you do.',
  },
  {
    q: 'Will you give my client legal or tax advice?',
    a: 'No. Questions about fiduciary duty, creditor claims, estate tax, basis or the terms of the will go back to you and to the client’s CPA — and we say so plainly rather than guessing. The most common failure mode for a broker in this space is answering a question that was not theirs to answer.',
  },
  {
    q: 'What if the property should not be sold?',
    a: 'Then we say so. Plenty of estates are better served by a beneficiary buying out the others, or by the family keeping the property. We would rather be the broker who told you that than the one who listed it anyway.',
  },
  {
    q: 'Which counties?',
    a: 'San Francisco, San Mateo and Santa Clara. Local practice, realistic hearing timelines and the referees differ across the three, and we work all of them regularly rather than occasionally.',
  },
]

export default function ServiceProbateAttorneys() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-white">
      <MotionStyles />
      <PublicNav />

      <ParallaxHero image={HERO_IMG} accent="blue" minH="74vh">
        <div className="max-w-6xl mx-auto px-6 py-28">
          <Reveal>
            <p
              className="font-mono text-[11px] uppercase tracking-[0.22em] mb-5"
              style={{ color: ACCENT }}
            >
              Probate · for attorneys
            </p>
          </Reveal>
          <Reveal delay={90}>
            <h1 className="font-serif text-white text-[clamp(2rem,5.4vw,4rem)] leading-[1.05] tracking-[-0.02em]">
              Your client will ask you
              <br />
              <span style={{ color: ACCENT }}>who to call about the house.</span>
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p className="mt-7 text-[17px] leading-relaxed text-white/80 max-w-2xl">
              Recommending a broker puts your name behind theirs. This page is the case for why
              that is safe — and what comes off your desk when it is.
            </p>
          </Reveal>
          <Reveal delay={260}>
            <div className="mt-9 flex flex-wrap gap-3">
              <PillButton href="/contact?topic=probate-attorney" onDark>
                Start a conversation
              </PillButton>
              <PillButton href="/services/probate" variant="secondary" onDark>
                What your client sees
              </PillButton>
            </div>
          </Reveal>
        </div>
      </ParallaxHero>

      <Marquee
        items={[
          'Date-of-death valuations',
          'Carrying-cost models',
          'Confirmation sales',
          'Overbid preparation',
          'All-beneficiary updates',
          'In-house counsel on process',
          'No referral fees',
        ]}
      />

      {/* ── The premise ──────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <h2
              className="font-serif text-[clamp(1.7rem,3.6vw,2.6rem)] leading-tight"
              style={{ color: NAVY }}
            >
              The goal is to add to your role, not overlap it.
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-6 space-y-5 text-[16.5px] leading-relaxed" style={{ color: INK }}>
              <p>
                You are running the estate. The property is one asset in it, and it is the one that
                generates the most questions per dollar of value — what is it worth, who clears it,
                who insures it, why is the sister objecting, what happens at the hearing. Most of
                those questions are not legal questions, but they arrive at your desk because there
                is nobody else to ask.
              </p>
              <p>
                That is the work we take. Not the parts that are yours — authority, notices,
                accountings, distribution — but everything about the house that currently
                interrupts them.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── What you get ─────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-6" style={{ background: '#F7F8FA' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p
              className="font-mono text-[11px] uppercase tracking-[0.2em] mb-4"
              style={{ color: ACCENT }}
            >
              What comes off your desk
            </p>
            <h2
              className="font-serif text-[clamp(1.8rem,4vw,2.9rem)] leading-tight max-w-3xl"
              style={{ color: NAVY }}
            >
              Six things you stop having to answer.
            </h2>
          </Reveal>

          <div className="mt-12 grid md:grid-cols-2 gap-5">
            {VALUE.map((v, i) => {
              const Icon = v.icon
              return (
                <Reveal key={v.title} delay={i * 60}>
                  <div
                    className="h-full rounded-2xl border p-7 bg-white"
                    style={{ borderColor: 'rgba(13,27,42,0.09)' }}
                  >
                    <span
                      className="inline-grid place-items-center w-10 h-10 rounded-xl"
                      style={{ background: 'rgba(79,130,185,0.10)' }}
                    >
                      <Icon size={19} color={ACCENT} strokeWidth={1.7} />
                    </span>
                    <h3 className="mt-4 font-serif text-[20px] leading-snug" style={{ color: NAVY }}>
                      {v.title}
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed" style={{ color: INK }}>
                      {v.body}
                    </p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Two speeds ───────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p
              className="font-mono text-[11px] uppercase tracking-[0.2em] mb-4"
              style={{ color: ACCENT }}
            >
              Two ways to run it
            </p>
            <h2
              className="font-serif text-[clamp(1.8rem,4vw,2.9rem)] leading-tight max-w-3xl"
              style={{ color: NAVY }}
            >
              Clean and quick, or top of the market. Your client decides — with the numbers in
              front of them.
            </h2>
            <p className="mt-5 text-[16.5px] leading-relaxed max-w-2xl" style={{ color: INK }}>
              These are genuinely different strategies with different outcomes, and we will not
              pretend one is the other. We model both against carrying cost and let the estate
              choose.
            </p>
          </Reveal>

          <div className="mt-12 grid md:grid-cols-2 gap-5">
            {SPEEDS.map((s, i) => (
              <Reveal key={s.title} delay={i * 90}>
                <div
                  className="h-full rounded-2xl p-8"
                  style={{
                    background: i === 0 ? '#F7F8FA' : NAVY,
                    border: i === 0 ? '1px solid rgba(13,27,42,0.09)' : 'none',
                  }}
                >
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.18em]"
                    style={{ color: ACCENT }}
                  >
                    {s.tag}
                  </p>
                  <h3
                    className="mt-3 font-serif text-[26px]"
                    style={{ color: i === 0 ? NAVY : '#fff' }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="mt-2 text-[15px]"
                    style={{ color: i === 0 ? INK : 'rgba(255,255,255,0.7)' }}
                  >
                    {s.lead}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {s.points.map((p) => (
                      <li
                        key={p}
                        className="flex gap-3 text-[15px] leading-relaxed"
                        style={{ color: i === 0 ? INK : 'rgba(255,255,255,0.82)' }}
                      >
                        <ArrowRight size={15} color={ACCENT} className="mt-1 shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── In-house counsel ─────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-6" style={{ background: NAVY_DEEP }}>
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <span
              className="inline-grid place-items-center w-14 h-14 rounded-2xl"
              style={{ background: 'rgba(79,130,185,0.14)' }}
            >
              <Scale size={24} color={ACCENT} strokeWidth={1.7} />
            </span>
          </Reveal>
          <Reveal delay={70}>
            <h2 className="mt-7 font-serif text-white text-[clamp(1.8rem,4vw,2.8rem)] leading-tight">
              Counsel in-house — so you can verify how we work without spending your own time on
              it.
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <div className="mt-6 space-y-5 text-[16.5px] leading-relaxed text-white/75">
              <p>
                If you want to see how we document an as-is estate sale, what our listing agreement
                says in a probate context, how disclosures are handled where nobody living has
                occupied the property, or how we manage an overbid — you can have that
                conversation with counsel on our side rather than reconstructing it yourself.
              </p>
              <p>
                To be exact about what this is and is not:{' '}
                <span className="text-white">
                  it is verification of our process, our paperwork and our procedures.
                </span>{' '}
                It is not advice to your client, not a second opinion on your matter, and not a
                substitute for any part of your role. Your client remains your client.
              </p>
            </div>
          </Reveal>
          <Reveal delay={210}>
            <div
              className="mt-8 rounded-2xl p-6"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <p className="text-[15px] leading-relaxed text-white/70">
                <ShieldCheck size={16} color={ACCENT} className="inline mr-2 -mt-0.5" />
                We pay no referral fees and accept none. Fee-splitting between a broker and an
                attorney is prohibited under the Rules of Professional Conduct, and federal law
                governs referrals for settlement services. The relationship is worth more than the
                fee would be.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <h2
              className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] leading-tight"
              style={{ color: NAVY }}
            >
              The questions you would ask first.
            </h2>
          </Reveal>

          <div className="mt-10 space-y-2">
            {FAQ.map((f, i) => {
              const isOpen = open === i
              return (
                <Reveal key={f.q} delay={i * 50}>
                  <div
                    className="rounded-2xl border"
                    style={{ borderColor: isOpen ? ACCENT : 'rgba(13,27,42,0.09)' }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="w-full text-left px-6 py-5 flex items-start gap-4"
                    >
                      <span
                        className="flex-1 font-serif text-[18px] leading-snug"
                        style={{ color: NAVY }}
                      >
                        {f.q}
                      </span>
                      <span className="shrink-0 mt-1" style={{ color: ACCENT }}>
                        {isOpen ? <Minus size={17} /> : <Plus size={17} />}
                      </span>
                    </button>
                    {isOpen && (
                      <p className="px-6 pb-6 text-[15.5px] leading-relaxed" style={{ color: INK }}>
                        {f.a}
                      </p>
                    )}
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <ServiceArticleFeed serviceSlug="probate" heading="Reading on probate sales" />

      {/* ── Close ────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-6" style={{ background: NAVY }}>
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <h2 className="font-serif text-white text-[clamp(1.8rem,4vw,2.8rem)] leading-tight">
              One valuation, no obligation,
              <br />
              <span style={{ color: ACCENT }}>and you can judge from there.</span>
            </h2>
          </Reveal>
          <Reveal delay={90}>
            <p className="mt-6 text-[16.5px] leading-relaxed text-white/75">
              Send the next matter where the property is the complicated part. You will get a
              written date-of-death valuation for the file within days, at no cost and with no
              listing agreement attached, and you can decide from the quality of that document
              whether the rest is worth having.
            </p>
          </Reveal>
          <Reveal delay={160}>
            <div className="mt-9 flex flex-wrap gap-3 justify-center">
              <PillButton href="/contact?topic=probate-attorney" onDark>
                Start a conversation
              </PillButton>
              <PillButton href="/meet-tim" variant="secondary" onDark>
                Meet Tim
              </PillButton>
            </div>
          </Reveal>
          <Reveal delay={230}>
            <p className="mt-8 text-[13px] leading-relaxed text-white/45 max-w-xl mx-auto">
              <Mail size={13} className="inline mr-1.5 -mt-0.5" />
              Nothing on this page is legal advice, to you or to your client. Real estate services
              only.
            </p>
          </Reveal>
          <Reveal delay={280}>
            <div className="mt-6">
              <Link
                to="/services/probate"
                className="font-mono text-[11px] uppercase tracking-[0.16em]"
                style={{ color: ACCENT }}
              >
                The page your client sees &rarr;
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
