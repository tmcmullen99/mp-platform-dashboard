// The page behind the QR code on letter 2.
//
// A petitioner scans a code on a letter and arrives here, probably on a phone,
// probably within a minute of opening the envelope, quite possibly grieving.
// That sets every decision on this page:
//
//   NO NAVIGATION, NO FOOTER LINKS, NO OTHER PRODUCTS. They came for one
//   document. A nav bar inviting them to browse Luxury Listings is the wrong
//   thing to put in front of someone who has just been appointed to sell their
//   mother's house.
//
//   THE COMPARABLES ARE THE POINT, not decoration. A valuation that shows its
//   working is a document; one that does not is an opinion in a letter. They
//   are rendered as prominently as the number itself.
//
//   THE DISCLAIMER IS NOT FINE PRINT. Petitioners routinely confuse this with
//   the probate referee's Inventory and Appraisal, which the court orders
//   separately and which is the one the estate is actually measured against.
//   Saying so clearly is more useful than any call to action.
//
//   NO NAMES. The RPC deliberately withholds the petitioner's details, so a
//   forwarded or mislaid link exposes a house, not a family.
//
// The only ask is a reply, and it is placed at the very bottom, after the work.

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchProbateValuation, ProbateValuation } from '@/lib/cityMarket'
import { MotionStyles, Reveal, NAVY, INK, LOGO_BLUE } from '@/components/public/motion'

const ACCENT = LOGO_BLUE

const money = (n: number | null | undefined) =>
  n == null ? '—' : '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })

function longDate(d: string | null | undefined) {
  if (!d) return null
  const t = new Date(String(d).length <= 10 ? d + 'T00:00:00' : d)
  if (Number.isNaN(t.getTime())) return null
  return t.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function ProbateValuationPage() {
  const { token = '' } = useParams()
  const [v, setV] = useState<ProbateValuation | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let dead = false
    /* A valuation is a private document reached by an unguessable token. It
       must never be indexed, and the tag is set here rather than in index.html
       so it applies to this route only. */
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow,noarchive'
    document.head.appendChild(meta)

    fetchProbateValuation(token).then((r) => {
      if (dead) return
      setV(r.data)
      setErr(r.error ?? '')
      setLoading(false)
      if (r.data?.property) document.title = `Valuation — ${r.data.property}`
    })
    return () => {
      dead = true
      meta.remove()
    }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-white px-6">
        <p className="font-mono text-[12px] uppercase tracking-[0.16em]" style={{ color: INK }}>
          Loading your valuation…
        </p>
      </div>
    )
  }

  /* A dead link in a letter to a bereaved family is the worst outcome on this
     page, so the failure state apologises and gives a human to contact rather
     than showing a 404. */
  if (err || !v) {
    return (
      <div className="min-h-screen grid place-items-center bg-white px-6">
        <div className="max-w-md text-center">
          <MotionStyles />
          <h1 className="font-serif text-[26px]" style={{ color: NAVY }}>
            This valuation link is no longer active
          </h1>
          <p className="mt-4 text-[15.5px] leading-relaxed" style={{ color: INK }}>
            It may have been replaced by a newer version, or the link may have been copied
            incompletely. Email me and I will send it again straight away — there is nothing
            you need to do first.
          </p>
          <a
            href="mailto:tim@mcmullen.properties?subject=Valuation%20link"
            className="mt-6 inline-block font-mono text-[12px] uppercase tracking-[0.14em]"
            style={{ color: ACCENT }}
          >
            tim@mcmullen.properties
          </a>
        </div>
      </div>
    )
  }

  const asOf = longDate(v.as_of)
  const comps = Array.isArray(v.comparables) ? v.comparables : []

  return (
    <div className="min-h-screen bg-white">
      <MotionStyles />

      {/* Header — the document's own masthead, not the site's */}
      <header className="px-6 pt-10 pb-8 border-b" style={{ borderColor: 'rgba(13,27,42,0.10)' }}>
        <div className="max-w-3xl mx-auto">
          <p
            className="font-mono text-[10.5px] uppercase tracking-[0.2em]"
            style={{ color: ACCENT }}
          >
            Date-of-death valuation
          </p>
          <h1
            className="mt-3 font-serif text-[clamp(1.7rem,4.4vw,2.6rem)] leading-tight"
            style={{ color: NAVY }}
          >
            {v.property}
          </h1>
          <p className="mt-2 text-[15px]" style={{ color: INK }}>
            {[v.city, v.state, v.zip].filter(Boolean).join(' ')}
            {v.county ? ` · ${v.county} County` : ''}
          </p>
          {asOf && (
            <p className="mt-4 text-[15px] leading-relaxed" style={{ color: INK }}>
              Value as of <strong>{asOf}</strong> — the date of passing.
            </p>
          )}
        </div>
      </header>

      {/* The range */}
      <section className="px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div
              className="rounded-2xl p-8 md:p-10 text-center"
              style={{ background: '#F7F8FA', border: '1px solid rgba(13,27,42,0.09)' }}
            >
              <p
                className="font-mono text-[10.5px] uppercase tracking-[0.18em]"
                style={{ color: ACCENT }}
              >
                Opinion of value
              </p>
              <div
                className="mt-4 font-serif leading-none"
                style={{ color: NAVY, fontSize: 'clamp(2.2rem,8vw,3.6rem)' }}
              >
                {money(v.mid)}
              </div>
              {(v.low != null || v.high != null) && (
                <p className="mt-4 font-mono text-[13px]" style={{ color: INK }}>
                  {money(v.low)} &mdash; {money(v.high)}
                </p>
              )}
              <p
                className="mt-5 text-[14px] leading-relaxed max-w-md mx-auto"
                style={{ color: INK, opacity: 0.8 }}
              >
                A range, not a single figure. The midpoint is the most likely outcome; the ends
                are what condition and timing could reasonably move it to.
              </p>
            </div>
          </Reveal>

          {v.narrative && (
            <Reveal delay={80}>
              <div className="mt-10">
                <h2 className="font-serif text-[22px]" style={{ color: NAVY }}>
                  How I arrived at it
                </h2>
                <p className="mt-4 text-[16px] leading-relaxed" style={{ color: INK }}>
                  {v.narrative}
                </p>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* Comparables — the working, shown */}
      {comps.length > 0 && (
        <section className="px-6 pb-12">
          <div className="max-w-3xl mx-auto">
            <Reveal>
              <h2 className="font-serif text-[22px]" style={{ color: NAVY }}>
                The sales it is built from
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed" style={{ color: INK }}>
                Recorded sales near the property, around the date of passing. These are the whole
                basis for the figure above — if one of them looks wrong to you, tell me and I will
                revisit it.
              </p>
            </Reveal>

            <div className="mt-6 space-y-3">
              {comps.map((c, i) => (
                <Reveal key={`${c.address}-${i}`} delay={i * 60}>
                  <div
                    className="rounded-xl border p-5"
                    style={{ borderColor: 'rgba(13,27,42,0.09)' }}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <span className="font-serif text-[17px]" style={{ color: NAVY }}>
                        {c.address}
                      </span>
                      <span className="font-mono text-[15px]" style={{ color: ACCENT }}>
                        {money(c.price ?? null)}
                      </span>
                    </div>
                    <div
                      className="mt-1.5 font-mono text-[11.5px] uppercase tracking-[0.08em]"
                      style={{ color: INK, opacity: 0.65 }}
                    >
                      {[
                        longDate(c.sold),
                        c.sqft ? `${Number(c.sqft).toLocaleString('en-US')} sq ft` : null,
                        c.sqft && c.price
                          ? `$${Math.round(Number(c.price) / Number(c.sqft)).toLocaleString('en-US')}/sq ft`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                    {c.note && (
                      <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: INK }}>
                        {c.note}
                      </p>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* What this is, and what it is not */}
      <section className="px-6 pb-12">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div
              className="rounded-2xl p-7 md:p-8"
              style={{ background: 'rgba(79,130,185,0.07)', border: '1px solid rgba(79,130,185,0.22)' }}
            >
              <h2 className="font-serif text-[19px]" style={{ color: NAVY }}>
                What this is, and what it is not
              </h2>
              <div className="mt-4 space-y-3 text-[15px] leading-relaxed" style={{ color: INK }}>
                <p>
                  This is an opinion of value prepared by a licensed real estate broker. It is
                  <strong> not a certified appraisal</strong>, and it is
                  <strong> not the probate referee&rsquo;s Inventory and Appraisal</strong> — that is a
                  separate document the court arranges, and it is the one the estate is formally
                  measured against. People mix the two up constantly; they are different things
                  for different purposes.
                </p>
                {v.method_note && <p>{v.method_note}</p>}
                {v.condition_note && <p>{v.condition_note}</p>}
                <p>
                  Nothing here is tax or legal advice. Questions about basis, the estate return,
                  creditor claims or your duties belong with your CPA and your attorney.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* The only ask, at the end */}
      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <p className="text-[16px] leading-relaxed" style={{ color: INK }}>
              If it is useful, keep it — your attorney will want it in the file. If something looks
              off, or you want to talk through what the options actually are, reply to the letter
              or email me directly. There is no obligation attached to any of this.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <a
              href="mailto:tim@mcmullen.properties?subject=My%20valuation"
              className="mt-6 inline-block rounded-full px-7 py-3.5 text-[14px] font-semibold text-white"
              style={{ background: ACCENT }}
            >
              Email Tim
            </a>
          </Reveal>
          <Reveal delay={140}>
            <p
              className="mt-8 text-[12.5px] leading-relaxed"
              style={{ color: INK, opacity: 0.6 }}
            >
              Prepared by {v.prepared_by || 'Tim McMullen'}
              {v.published_at ? ` · ${longDate(v.published_at)}` : ''}
              <br />
              McMullen Properties LLC, which is not a real estate brokerage. Real estate services
              provided by Tim McMullen, Broker · CA DRE #02016832.
            </p>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
