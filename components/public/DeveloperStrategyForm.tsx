// DeveloperStrategyForm — the exit-strategy request.
//
// THE TRADE. A developer gives up the address, the stage of build and the
// timeline. That is information they normally guard, so the thing they get back
// has to be worth more than a listing presentation: a written strategy for
// selling a specific project at the top of its market, and a 2% listing side.
// The form's job is to make that trade legible before they type anything.
//
// THE LISTING QUESTION IS THE FIRST FIELD, NOT THE LAST. Soliciting a property
// already under a written listing agreement is a DRE and MLS violation, and a
// developer who signed with the agent who sourced the deal cannot be pitched
// however much the strategy would help. Asking it first means nobody fills in
// six fields to be turned away at the end, and the refusal is shown plainly
// with its reason rather than the form silently accepting a request it will
// never answer.
//
// NO PRICE IS QUOTED OR COLLECTED. A projected exit figure is an opinion of
// value on a specific property; it belongs in a written analysis with its
// comparables attached, not in a form response.

import { useState } from 'react'
import { Reveal, NAVY, INK, LOGO_BLUE } from '@/components/public/motion'
import { CheckCircle2, AlertCircle } from 'lucide-react'

const SUPABASE_URL = 'https://qinuukntpyulqjzndnho.supabase.co'
const SUPABASE_ANON = 'sb_publishable_1CzH1AWkEzy1WjMvZqwlhA_xiay_wJ2'

const STAGES: { v: string; label: string }[] = [
  { v: 'acquiring', label: 'Still acquiring' },
  { v: 'permitting', label: 'In permitting' },
  { v: 'demo', label: 'Demo' },
  { v: 'framing', label: 'Framing' },
  { v: 'mep', label: 'Mechanical, electrical, plumbing' },
  { v: 'finishes', label: 'Finishes' },
  { v: 'punch_list', label: 'Punch list' },
  { v: 'complete', label: 'Complete' },
]

type State = 'idle' | 'sending' | 'sent' | 'declined' | 'error'

export default function DeveloperStrategyForm() {
  const [listed, setListed] = useState<boolean | null>(null)
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')
  const [f, setF] = useState({
    name: '', email: '', phone: '', company: '',
    address: '', city: '', stage: '', market_date: '', units: '', note: '',
  })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  async function submit() {
    if (!f.email.trim()) { setState('error'); setMessage('An email address is needed to send the strategy.'); return }
    if (listed === null) { setState('error'); setMessage('Let me know whether a listing agreement is already signed.'); return }
    setState('sending')
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/request_selling_strategy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({
          p_email: f.email, p_has_listing_agreement: listed,
          p_name: f.name || null, p_phone: f.phone || null, p_company: f.company || null,
          p_address: f.address || null, p_city: f.city || null,
          p_stage: f.stage || null, p_market_date: f.market_date || null,
          p_units: f.units || null, p_note: f.note || null,
        }),
      })
      if (!r.ok) throw new Error(`rpc_${r.status}`)
      const j = await r.json()
      if (!j?.ok) throw new Error(j?.reason ?? 'refused')
      if (j.declined) { setState('declined'); setMessage(j.message); return }
      setState('sent')
    } catch (e) {
      // Surface the real reason. A form that fails silently reads as a form
      // that worked, and the developer waits for a strategy nobody received.
      console.error('request_selling_strategy failed', e)
      setState('error')
      setMessage('That did not send. Try again, or call (415) 691-9272.')
    }
  }

  const field =
    'w-full rounded-xl border border-black/[0.12] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#4f82b9]'
  const label = 'block text-[13px] font-medium mb-2'

  return (
    <section id="strategy" className="scroll-mt-24" style={{ background: '#fff' }}>
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="grid lg:grid-cols-[1fr,1.05fr] gap-12 lg:gap-16 items-start">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-3" style={{ color: LOGO_BLUE }}>
              For projects already underway
            </div>
            <h2
              className="mp-serif text-[32px] md:text-[46px] leading-[1.05] font-semibold"
              style={{ color: NAVY }}
            >
              The agent who found you the deal is not automatically the right one to sell it.
            </h2>
            <div className="mt-6 space-y-4 text-[16.5px] leading-relaxed" style={{ color: INK }}>
              <p>
                It is the standard arrangement — whoever sourced the property gets the listing when
                it is done. It is fair, it is how relationships work, and on a high-basis Bay Area
                project it can be the most expensive handshake in the deal.
              </p>
              <p>
                Sourcing and selling are different skills. Finding an off-market opportunity is about
                access. Getting the last few percent out of a finished build is about pricing against
                comparables that have not closed yet, controlling the release, and holding a number
                through the first two weeks. On a $3M exit, a few percent is six figures.
              </p>
              <p>
                Tell me about a project you have running and I will write you the strategy for it —
                the comparable set as it will look when you hit the market rather than as it looks
                today, where the pricing ceiling actually sits, how to build interest while the site
                is still a site, and what I would do differently from the plan you have.
              </p>
              <p className="font-medium" style={{ color: NAVY }}>
                No charge, no obligation, and it is yours whether or not you ever list with me.
              </p>
            </div>

            <div className="mt-8 rounded-[20px] border border-black/[0.08] p-6" style={{ background: '#f4f7fb' }}>
              <div className="mp-mono text-[11px] uppercase tracking-[0.18em] mb-3" style={{ color: LOGO_BLUE }}>
                What you get back
              </div>
              <ul className="space-y-3 text-[15px]" style={{ color: INK }}>
                {[
                  'A comparable set projected to your market date, not today’s — 0 to 24 months out, with the assumptions written down.',
                  'A pricing position with the evidence behind it, and the point at which I would not go higher.',
                  'A plan for marketing the build before it is finished, if certainty of sale is worth more to you than the last dollar.',
                  'A 2% listing side, guaranteed in writing.',
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <CheckCircle2 className="w-[18px] h-[18px] mt-[3px] shrink-0" style={{ color: LOGO_BLUE }} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-[24px] border border-black/[0.08] bg-white p-7 md:p-9 shadow-[0_2px_20px_rgba(13,27,42,0.06)]">
              {state === 'sent' ? (
                <div className="py-6">
                  <CheckCircle2 className="w-9 h-9 mb-4" style={{ color: LOGO_BLUE }} />
                  <h3 className="mp-serif text-[24px] font-semibold" style={{ color: NAVY }}>
                    Got it.
                  </h3>
                  <p className="mt-3 text-[15.5px] leading-relaxed" style={{ color: INK }}>
                    I will pull the comparables for that address and come back within a couple of
                    working days. If it is time-sensitive, call me on (415) 691-9272 and say which
                    project it is.
                  </p>
                </div>
              ) : state === 'declined' ? (
                <div className="py-6">
                  <AlertCircle className="w-9 h-9 mb-4" style={{ color: '#b0552b' }} />
                  <h3 className="mp-serif text-[24px] font-semibold" style={{ color: NAVY }}>
                    Then I will leave it alone.
                  </h3>
                  <p className="mt-3 text-[15.5px] leading-relaxed" style={{ color: INK }}>
                    {message}
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="mp-serif text-[26px] leading-tight font-semibold" style={{ color: NAVY }}>
                    Tell me about the project
                  </h3>
                  <p className="mt-2 text-[14.5px]" style={{ color: '#5c6771' }}>
                    Six fields. The address is the one that matters — without it there are no
                    comparables and no strategy, only generalities.
                  </p>

                  {/* First, because a signed listing ends the conversation and
                      nobody should fill in a form to find that out. */}
                  <div className="mt-7 rounded-2xl p-5" style={{ background: '#f4f7fb' }}>
                    <span className={label} style={{ color: NAVY }}>
                      Is a listing agreement already signed on this project?
                    </span>
                    <div className="flex gap-2 mt-1">
                      {[
                        { v: false, t: 'No, it is open' },
                        { v: true, t: 'Yes, already signed' },
                      ].map((o) => (
                        <button
                          key={String(o.v)}
                          type="button"
                          onClick={() => setListed(o.v)}
                          aria-pressed={listed === o.v}
                          className="flex-1 rounded-xl px-4 py-3 text-[14.5px] font-medium border transition-colors"
                          style={
                            listed === o.v
                              ? { background: NAVY, color: '#fff', borderColor: NAVY }
                              : { background: '#fff', color: INK, borderColor: 'rgba(0,0,0,0.12)' }
                          }
                        >
                          {o.t}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: '#5c6771' }}>
                      I will not approach a property another broker is contracted on. Asking first
                      saves us both the conversation.
                    </p>
                  </div>

                  <div className="mt-6 grid sm:grid-cols-2 gap-4">
                    <div>
                      <span className={label} style={{ color: NAVY }}>Your name</span>
                      <input className={field} value={f.name} onChange={set('name')} autoComplete="name" />
                    </div>
                    <div>
                      <span className={label} style={{ color: NAVY }}>Company</span>
                      <input className={field} value={f.company} onChange={set('company')} autoComplete="organization" />
                    </div>
                    <div>
                      <span className={label} style={{ color: NAVY }}>Email</span>
                      <input className={field} type="email" value={f.email} onChange={set('email')} autoComplete="email" />
                    </div>
                    <div>
                      <span className={label} style={{ color: NAVY }}>Phone</span>
                      <input className={field} type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" />
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className={label} style={{ color: NAVY }}>Project address</span>
                    <input
                      className={field}
                      value={f.address}
                      onChange={set('address')}
                      placeholder="Street address of the build"
                      autoComplete="off"
                    />
                  </div>

                  <div className="mt-4 grid sm:grid-cols-3 gap-4">
                    <div>
                      <span className={label} style={{ color: NAVY }}>City</span>
                      <input className={field} value={f.city} onChange={set('city')} />
                    </div>
                    <div>
                      <span className={label} style={{ color: NAVY }}>Stage</span>
                      <select className={field} value={f.stage} onChange={set('stage')}>
                        <option value="">Select…</option>
                        {STAGES.map((s) => (
                          <option key={s.v} value={s.v}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className={label} style={{ color: NAVY }}>Units</span>
                      <input className={field} value={f.units} onChange={set('units')} placeholder="1" />
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className={label} style={{ color: NAVY }}>When do you expect to hit the market?</span>
                    <input
                      className={field}
                      value={f.market_date}
                      onChange={set('market_date')}
                      placeholder="e.g. Spring 2027, or 8 months out"
                    />
                  </div>

                  <div className="mt-4">
                    <span className={label} style={{ color: NAVY }}>Anything I should know</span>
                    <textarea
                      className={field}
                      rows={3}
                      value={f.note}
                      onChange={set('note')}
                      placeholder="Scope, finish level, whether it is a spec or a hold, anything unusual about the site."
                    />
                  </div>

                  {state === 'error' && (
                    <p className="mt-4 text-[14px]" style={{ color: '#b0552b' }}>{message}</p>
                  )}

                  <button
                    type="button"
                    onClick={submit}
                    disabled={state === 'sending'}
                    className="mt-6 w-full rounded-full px-6 py-4 text-[15.5px] font-medium text-white disabled:opacity-60"
                    style={{ background: NAVY }}
                  >
                    {state === 'sending' ? 'Sending…' : 'Send me the selling strategy'}
                  </button>

                  <p className="mt-4 text-[12.5px] leading-relaxed" style={{ color: '#5c6771' }}>
                    Your project details go to me and nowhere else. No list, no share, no broker
                    tour. Tim McMullen, Broker · CA DRE #02016832.
                  </p>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
