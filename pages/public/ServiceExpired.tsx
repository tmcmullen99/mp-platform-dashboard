// Bespoke service page: Expired Listing Re-launch (every price point).
//
// SIBLING OF ServiceLuxury.tsx — same components, same rhythm, same motion
// primitives. Deliberately not a copy: the luxury page argues that a trophy
// home has a few hundred buyers on earth and must be found by name. That
// argument does not transfer. A $900k condo has thousands of plausible buyers,
// and it still didn't sell — so the thesis here is different:
//
//   The buyer for your house was already nearby. Nobody went and got them.
//
// PAGE ORDER, and why:
//   1. Hero — name the feeling before making a claim. The owner has just been
//      through months of failure and a broken agent relationship.
//   2. Premise — reframe: not overpriced, unreached.
//   3. What actually went wrong — four honest, checkable causes.
//   4. The re-launch — the seven phases, adapted from the luxury machine to
//      work at every price point.
//   5. What it costs — renovation, funding, and the discounted fee.
//   6. The 2% offer — stated plainly, not buried.
//   7. Ask — half an hour, at the house or on a call.
//
// NOTHING HERE PROMISES A PRICE. Every claim is about process or a stated fee.

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
  Target,
  Users,
  Mail,
  Activity,
  Crosshair,
  Gauge,
  ArrowUpRight,
  Plus,
  Minus,
  Camera,
  Hammer,
  Wallet,
  Handshake,
} from 'lucide-react'

const HERO_IMG =
  'https://kumfuludrhoqirxvaqja.supabase.co/storage/v1/object/public/listing-photos/site/175-huckleberry-drive/000.jpg'

const GOLD = '#b8965a'

// The four honest reasons a listing expires. Order matters: price is last on
// purpose, because every other agent writing to this owner leads with it.
const CAUSES = [
  {
    icon: Users,
    title: 'The buyer never heard about it',
    body: 'A listing goes onto the portals and then waits. The people most likely to buy your house — the under-bidder from a sale two streets away, the family renting nearby who want the school catchment, the neighbour whose parents are moving closer — are never told it exists. Nobody goes and gets them, because going and getting them is work.',
  },
  {
    icon: Camera,
    title: 'It was shown at its worst angle',
    body: 'Buyers decide in the first three photographs. A house shot on a grey afternoon, with the best room at frame nineteen and the front elevation in shadow, has already lost people who would have come. This is the cheapest thing to fix and the most commonly skipped.',
  },
  {
    icon: Hammer,
    title: 'The work nobody organised',
    body: 'Most stalled houses need four or five decisions made early — a kitchen, a bathroom, a garden, a floor. Sellers are told to paint it and hope, because the alternative means finding trades, managing them, and paying up front. So nothing is done, and the house competes against homes where it was.',
  },
  {
    icon: Target,
    title: 'And sometimes, the number',
    body: 'Occasionally the price really was wrong. But it is the last thing to look at, not the first — and if the three above were never addressed, nobody can tell you what the house would have fetched, because it was never properly put in front of anyone.',
  },
]

// The seven phases, adapted from the luxury machine. Same discipline, sized to
// a market where the buyer pool is thousands rather than hundreds.
const PHASES = [
  {
    icon: Target,
    tag: 'Phase 1',
    title: 'Work out who actually buys this house',
    lead: 'Before anything is photographed, decide precisely who the buyer is.',
    detail:
      'Not a demographic guess — a profile built from what has actually sold nearby and who bought it. Their stage of life, where they are moving from, what they are paying now, what they will trade for. A three-bed on a quiet street and a two-bed condo near the station have almost nothing in common as products, and marketing them the same way is why one of them sits.',
    example:
      'For a family house near a good school, the buyer is usually already renting within two miles and waiting for the right listing — a group you can reach by name.',
    tool: 'Recorded sales · ownership data · county records',
  },
  {
    icon: Users,
    title: 'Go to the neighbours first',
    tag: 'Phase 2',
    lead: 'The people who know your buyer live around you.',
    detail:
      'I hold the complete public record for the markets I run — every parcel, every recorded sale, every street. That is what makes it possible to write to your neighbours by name and ask the one question that reliably produces buyers: who do you know who has been trying to buy on this street? Neighbours are not an audience, they are a distribution network, and they are motivated: your sale sets their number.',
    example:
      'A single street mailing routinely surfaces a buyer who was already circling the area but had not seen the listing.',
    tool: 'Full parcel record · targeted mail · street-level campaigns',
  },
  {
    icon: Camera,
    tag: 'Phase 3',
    title: 'Re-frame the house before it goes back out',
    lead: 'The assets have to earn the click before a pound goes to distribution.',
    detail:
      'Lead with the best frame, not the front door. Re-shoot in the right light and the right season. Correct the staging and the colour. Cut the gallery to a tight, ordered sequence that tells one story. And where the house needs real work, say so and organise it — see below, because that is the part almost nobody offers.',
    example:
      'Promoting the strongest exterior to the cover photograph and cutting a bloated gallery to a curated set changes the click-through before a single new buyer has been contacted.',
    tool: 'Photography direction · staging · sequencing',
  },
  {
    icon: Mail,
    tag: 'Phase 4',
    title: 'Reach the buyer pool directly',
    lead: 'By letter, by email, through the agents who already represent them, and through paid campaigns aimed at exactly that group.',
    detail:
      'The profile becomes a list, and the list gets contacted — individually, by name, with a message written for that buyer type rather than a single announcement broadcast at everyone. Agents who already represent matching buyers are contacted directly, because the fastest route to a buyer is often the person already advising them.',
    example:
      'Out-of-area buyers, local move-up buyers and investors each get their own message and their own call to action.',
    tool: 'Direct mail · verified email · agent-to-agent · paid targeting',
  },
  {
    icon: Activity,
    tag: 'Phase 5',
    title: 'Measure who is actually interested',
    lead: 'Every open, click and visit is instrumented, so interest becomes a ranked list rather than a feeling.',
    detail:
      'On top of opens and clicks, real value is offered that doubles as an intent signal: the disclosure package, a condition summary, a market comparison. Who asks for what tells you exactly how warm each person is. Passive traffic becomes a scored pipeline you can act on.',
    example:
      'Someone who downloads the disclosure package and asks for comparable sales is a materially hotter lead than ten page views, and gets pursued accordingly.',
    tool: 'Session analytics · lead capture · intent scoring',
  },
  {
    icon: Crosshair,
    tag: 'Phase 6',
    title: 'Follow the warm ones until they act',
    lead: 'Everyone who engages keeps seeing the house across the web.',
    detail:
      'Anyone who clicks enters a retargeting audience and sees the property on the sites they already use. Nothing is spent on people who have shown no interest — which is what makes this affordable at every price point rather than only on trophy homes.',
    example:
      'A buyer who viewed once keeps seeing the house for weeks, through the entire length of a normal decision.',
    tool: 'Meta / Google retargeting · pixel audiences',
  },
  {
    icon: Gauge,
    tag: 'Phase 7',
    title: 'Show you all of it, as it happens',
    lead: 'Your own login to a live dashboard: visits, time on page, where people are looking from, leads captured.',
    detail:
      'No monthly summary with the bad weeks rounded off. The raw performance of your listing, always on, so that when a decision about price or presentation has to be made, it is made against evidence rather than against a story.',
    example:
      'If the traffic is strong and the offers are not, that is a different problem from thin traffic — and you can only tell the difference if you can see both.',
    tool: 'Live seller dashboard · always-on reporting',
  },
]

const PROOF = [
  'Expired listing re-launch',
  'Every price point',
  'Buyer profiling',
  'Street-level outreach',
  'Renovation managed end to end',
  'Costs settled at close',
  '2% listing fee',
  'Live seller dashboard',
]

// The renovation offer — the part of this that almost no listing agent has.
const RENOVATION = [
  {
    icon: Hammer,
    n: '01',
    title: 'I design it myself',
    body: 'Kitchens, bathrooms, whole-house reworks, front and back gardens. Multiple millions of renovated property sold, designed personally rather than handed to a stager with a mood board. The question is never "what would look nice" — it is which four decisions change what this house sells for, and which are money you will not get back.',
  },
  {
    icon: Users,
    n: '02',
    title: 'My crews, at my rates',
    body: 'Trades and contractors built up over years of running this work, at prices negotiated across many projects rather than a single job. You are not ringing round for quotes and hoping, and you are not paying the premium a one-off homeowner pays.',
  },
  {
    icon: Wallet,
    n: '03',
    title: 'Paid at the close, not up front',
    body: 'Funding is available so the cost of preparing the house comes out of escrow when it sells, not out of your pocket now. That is usually the difference between a house that goes back out properly prepared and one that goes back out the same as before.',
  },
  {
    icon: Handshake,
    n: '04',
    title: 'Managed end to end',
    body: 'I run the work. You are not project-managing trades around your own life, and you are not the one chasing a plumber on a Tuesday. That is the whole point of the offer.',
  },
]

function PhaseCard({ p }: { p: (typeof PHASES)[number] }) {
  const [open, setOpen] = useState(false)
  const Icon = p.icon
  return (
    <div className="rounded-[20px] border border-black/[0.07] bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-6 md:px-7 py-6 flex items-start gap-4 md:gap-5"
      >
        <div
          className="shrink-0 w-11 h-11 rounded-full grid place-items-center"
          style={{ background: '#f7f8fa' }}
        >
          <Icon className="w-5 h-5" style={{ color: GOLD }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="mp-mono text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: GOLD }}>
            {p.tag}
          </div>
          <h3 className="mp-serif text-[20px] md:text-[23px] font-semibold leading-snug" style={{ color: NAVY }}>
            {p.title}
          </h3>
          <p className="text-[15px] mt-2 leading-relaxed" style={{ color: INK }}>
            {p.lead}
          </p>
        </div>
        <div className="shrink-0 mt-1">
          {open ? (
            <Minus className="w-4 h-4" style={{ color: NAVY }} />
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

export default function ServiceExpired() {
  return (
    <div className="mp-scope bg-white">
      <MotionStyles />
      <PublicNav active="services" />

      {/* HERO — name the experience before making any claim. */}
      <ParallaxHero image={HERO_IMG} minH="84vh" accent="gold">
        <div className="max-w-6xl mx-auto px-6 py-28">
          <div className="max-w-3xl">
            <div
              className="mp-anim mp-mono text-[11px] uppercase tracking-[0.28em] mb-6"
              style={{ color: GOLD, animationDelay: '0.1s' }}
            >
              Expired Listing Re-launch · Every price point
            </div>
            <h1
              className="mp-anim mp-serif text-white text-[44px] md:text-[66px] leading-[1.03] font-semibold"
              style={{ animationDelay: '0.2s' }}
            >
              Your buyer was probably nearby.
              <br />
              <span className="mp-accent-gold">Nobody went and got them.</span>
            </h1>
            <p
              className="mp-anim text-lg md:text-xl mt-7 leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.82)', animationDelay: '0.35s', maxWidth: '680px' }}
            >
              You have just spent months trying to sell a house that did not sell, and probably
              ended a working relationship over it. I am not going to tell you what went wrong
              &mdash; I was not there. What I can tell you is how I run a listing, because it is
              not what most agents do: I work out exactly who buys a house like yours, go and find
              those people directly, and show you every step of it happening.
            </p>
            <div className="mp-anim flex flex-wrap gap-3 mt-9" style={{ animationDelay: '0.5s' }}>
              <PillButton href="mailto:tim@mcmullen.properties?subject=Re-launching%20my%20listing" onDark>
                Book half an hour <ArrowUpRight className="w-4 h-4" />
              </PillButton>
              <PillButton href="#relaunch" variant="secondary" onDark>
                See how the re-launch works
              </PillButton>
            </div>
            <p
              className="mp-anim text-[14px] mt-7"
              style={{ color: 'rgba(255,255,255,0.55)', animationDelay: '0.6s' }}
            >
              Needs work before it goes back out?{' '}
              <a href="#renovation" className="underline underline-offset-4" style={{ color: 'rgba(255,255,255,0.8)' }}>
                I design it, my crews build it, you pay at the close &rarr;
              </a>
            </p>
          </div>
        </div>
      </ParallaxHero>

      <div style={{ background: NAVY_DEEP }}>
        <Marquee items={PROOF} />
      </div>

      {/* PREMISE */}
      <section style={{ background: '#f7f8fa' }}>
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: GOLD }}>
              The premise
            </div>
            <h2 className="mp-serif text-[30px] md:text-[46px] leading-[1.12] font-semibold" style={{ color: NAVY }}>
              Most houses that don&rsquo;t sell were shown to the wrong people, not priced at the
              wrong number.
            </h2>
            <p className="mt-7 leading-relaxed text-[17px]" style={{ color: INK }}>
              A trophy home has a few hundred plausible buyers on earth. Your house has thousands
              &mdash; and it still sat, which means the ones who would have bought it never properly
              saw it. That is a solvable problem, and it is solved by going and getting them rather
              than listing and waiting. Everything below is how.
            </p>
          </Reveal>
        </div>
      </section>

      {/* WHAT ACTUALLY WENT WRONG */}
      <section className="max-w-5xl mx-auto px-6 py-20 md:py-28">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
            Four honest reasons
          </div>
          <h2 className="mp-serif text-[32px] md:text-[48px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
            What usually actually happened
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed max-w-3xl" style={{ color: INK }}>
            Every other letter you are getting this week opens by implying you priced it wrong.
            That is the easiest thing to say and the least often true. In order of how frequently
            they are the real cause:
          </p>
        </Reveal>

        <div className="mt-10 grid md:grid-cols-2 gap-5">
          {CAUSES.map((c, i) => {
            const Icon = c.icon
            return (
              <Reveal key={c.title} delay={0.04 * i}>
                <div className="rounded-[20px] border border-black/[0.07] bg-white p-7 h-full">
                  <div
                    className="w-11 h-11 rounded-full grid place-items-center mb-5"
                    style={{ background: '#f7f8fa' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: GOLD }} />
                  </div>
                  <h3 className="mp-serif text-[21px] font-semibold leading-snug" style={{ color: NAVY }}>
                    {c.title}
                  </h3>
                  <p className="text-[15px] mt-3 leading-relaxed" style={{ color: INK }}>
                    {c.body}
                  </p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* THE RE-LAUNCH */}
      <section id="relaunch" style={{ background: '#f7f8fa' }}>
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
              The re-launch
            </div>
            <h2 className="mp-serif text-[32px] md:text-[48px] leading-[1.05] font-semibold" style={{ color: NAVY }}>
              I treat a listing the way a company treats a product launch.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed max-w-3xl" style={{ color: INK }}>
              This is the same system I built selling eight-figure homes to buyer pools of a dozen
              people, and it works on a house at any price for the same reason it works there: you
              cannot wait for the right buyer, you have to go and get them. Tap any phase.
            </p>
          </Reveal>

          <div className="mt-10 space-y-4">
            {PHASES.map((p, i) => (
              <Reveal key={p.tag} delay={0.03 * i}>
                <PhaseCard p={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* RENOVATION — the differentiator */}
      <section id="renovation" style={{ background: NAVY_DEEP }}>
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
              The part almost nobody offers
            </div>
            <h2 className="mp-serif text-white text-[32px] md:text-[48px] leading-[1.05] font-semibold">
              If it needs work, I organise the work.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed max-w-3xl" style={{ color: 'rgba(255,255,255,0.78)' }}>
              A house that did not sell is often a house that needed work nobody was willing to
              arrange. Most agents will tell you to paint it and hope. I do the opposite, and I do
              it myself &mdash; because the difference between a house buyers walk through politely
              and one they compete for is usually four or five decisions made early.
            </p>
          </Reveal>

          <div className="mt-10 grid md:grid-cols-2 gap-5">
            {RENOVATION.map((r, i) => {
              const Icon = r.icon
              return (
                <Reveal key={r.n} delay={0.04 * i}>
                  <div
                    className="rounded-[20px] p-7 h-full"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className="w-5 h-5" style={{ color: GOLD }} />
                      <span className="mp-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: GOLD }}>
                        {r.n}
                      </span>
                    </div>
                    <h3 className="mp-serif text-white text-[21px] font-semibold leading-snug">{r.title}</h3>
                    <p className="text-[15px] mt-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
                      {r.body}
                    </p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* THE FEE — stated plainly, never buried */}
      <section className="max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-5" style={{ color: GOLD }}>
            The fee
          </div>
          <h2 className="mp-serif text-[30px] md:text-[46px] leading-[1.12] font-semibold" style={{ color: NAVY }}>
            My listing fee is 2%.
          </h2>
          <p className="mt-7 leading-relaxed text-[17px]" style={{ color: INK }}>
            Most listing agreements in this market are written at two and a half. The most important
            thing is that this home sells; the second is that you keep as much of that sale as
            possible. So I discount my fee and deliver the same arsenal of services either way, in
            exchange for the opportunity to earn your business.
          </p>
          <p className="mt-5 leading-relaxed text-[15px]" style={{ color: INK }}>
            On a two million dollar sale, that half a point is ten thousand dollars that stays with
            you. But the fee is not the argument &mdash; the argument is everything above it.
          </p>
        </Reveal>
      </section>

      {/* ASK */}
      <section style={{ background: '#f7f8fa' }}>
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          <Reveal>
            <h2 className="mp-serif text-[30px] md:text-[44px] leading-[1.08] font-semibold" style={{ color: NAVY }}>
              Half an hour, at the house or on a call.
            </h2>
            <p className="mt-6 leading-relaxed text-[17px] max-w-2xl mx-auto" style={{ color: INK }}>
              I am not asking you to list with me from a web page. I will walk the house with you,
              show you the buyer search I would run for your address, and tell you plainly what I
              would change and what I would leave alone. You decide whether any of it is any good.
            </p>
            <div className="mt-9 flex flex-wrap gap-3 justify-center">
              <PillButton href="mailto:tim@mcmullen.properties?subject=Re-launching%20my%20listing">
                Email me <ArrowUpRight className="w-4 h-4" />
              </PillButton>
              <PillButton href="tel:+14156919272" variant="secondary">
                Call (415) 691-9272
              </PillButton>
            </div>
            <p className="mt-10 text-[13px] leading-relaxed max-w-2xl mx-auto" style={{ color: INK, opacity: 0.65 }}>
              Nothing on this page is an opinion of value on any specific property. If your home is
              currently listed with another broker, this is not a solicitation of that listing.
              Commissions are negotiable and not set by law. Owned and operated by McMullen
              Properties LLC, which is not a real estate brokerage. Real estate services provided by
              Tim McMullen, Broker &middot; CA DRE #02016832.
            </p>
          </Reveal>
        </div>
      </section>

      <ServiceArticleFeed />
      <PublicFooter />
    </div>
  )
}
