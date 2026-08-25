// Date-of-death valuation request.
//
// This replaced a mailto. A mailto loses the request on any device without a
// mail client configured, and it loses it silently — the person believes they
// have asked. Everything typed here lands in probate_valuation_requests and
// emails Tim on insert.
//
// Five fields, no more. Every one of them is needed to produce the document:
// the date of death fixes the valuation date and therefore the beneficiaries'
// stepped-up basis, and without the address there is nothing to value.

import { useEffect, useState } from 'react'
import { cityMarket } from '@/lib/cityMarket'
import { NAVY, INK, LOGO_BLUE as ACCENT } from '@/components/public/motion'
import ProbateMeetScheduler from '@/components/public/ProbateMeetScheduler'

/* Four steps, in the order a petitioner can actually answer them.
     valuation  the two facts that fix the date-of-death figure
     pick       what else to prepare, with each document's own questions
     call       book the review, already knowing who they are
     reading    for anyone who would rather read before they talk

   The picker only appears once the valuation is in, because it is the ask that
   earns the right to a longer form. Putting all of it on one screen would make
   a bereaved reader scroll past nine documents to answer two questions. */
type State = 'idle' | 'sending' | 'pick' | 'saving' | 'call' | 'reading'

type Field = {
  key: string; label: string; type: 'text' | 'textarea' | 'select'
  placeholder?: string; help?: string; options?: string[]
}
type Item = { key: string; title: string; blurb: string; turnaround?: string; fields: Field[] }

/* The server returns a reason, not a boolean. Each one is rewritten here as
   something a person can act on — "email_invalid" tells them nothing. */
const REASONS: Record<string, string> = {
  name_required: 'Please add the name this should be addressed to.',
  email_invalid: 'That email address does not look right — check it and try again.',
  address_required: 'Please add the property address, including the city.',
  date_invalid: 'That date did not read as a date. Use the picker if it is easier.',
  date_in_future: 'The date of passing cannot be in the future.',
  date_too_old: 'That date is more than forty years ago. Check the year.',
}

export default function ProbateValuationForm({ source = 'services/probate' }: { source?: string }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', address: '', dod: '', note: '' })
  const [state, setState] = useState<State>('idle')
  const [err, setErr] = useState<string | null>(null)
  const [reqId, setReqId] = useState<number | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [chosen, setChosen] = useState<Record<string, Record<string, string>>>({})

  /* Fetched once the valuation is away, so the catalogue never delays the
     thing that matters. */
  useEffect(() => {
    if (state !== 'pick' || items.length) return
    let alive = true
    ;(async () => {
      const { data } = await cityMarket.rpc('probate_deliverables_catalog')
      if (alive && data?.ok) setItems(data.items || [])
    })()
    return () => { alive = false }
  }, [state, items.length])

  const toggle = (k: string) =>
    setChosen(c => {
      const n = { ...c }
      if (n[k]) delete n[k]; else n[k] = {}
      return n
    })
  const setInput = (k: string, fk: string, v: string) =>
    setChosen(c => ({ ...c, [k]: { ...(c[k] || {}), [fk]: v } }))

  const sendPicks = async (wantsCall: boolean) => {
    setErr(null); setState('saving')
    const payload = Object.entries(chosen).map(([key, inputs]) => ({ key, inputs }))
    try {
      const { data, error } = await cityMarket.rpc('request_probate_deliverables', {
        p_request_id: reqId, p_items: payload,
        p_wants_call: wantsCall, p_documents_first: !wantsCall,
      })
      if (error || !data?.ok) throw new Error('failed')
      setState(wantsCall ? 'call' : 'reading')
    } catch {
      /* Never a dead end: the valuation is already safely in. */
      setErr('That did not save. Email tim@mcmullen.properties with what you need and it will be done the same way.')
      setState('pick')
    }
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  const submit = async () => {
    setErr(null)
    setState('sending')
    try {
      const { data, error } = await cityMarket.rpc('request_probate_valuation', {
        p_name: f.name, p_email: f.email, p_phone: f.phone,
        p_address: f.address, p_dod: f.dod, p_note: f.note || null, p_source: source,
      })
      if (error) throw new Error(error.message)
      if (!data || data.ok !== true) {
        setErr(REASONS[data?.error] || 'That did not send. Email tim@mcmullen.properties and it will be done the same way.')
        setState('idle')
        return
      }
      setReqId(Number(data.request_id) || null)
      setState('pick')
    } catch {
      /* Never a dead end: if this fails the person still has a way through. */
      setErr('That did not send. Email tim@mcmullen.properties and it will be done the same way.')
      setState('idle')
    }
  }

  const field = 'w-full rounded-xl px-4 py-3 text-[15px] bg-white outline-none transition-colors'
  const border = { border: '1px solid rgba(13,27,42,0.14)', color: INK }
  const label = 'block text-[12px] font-medium mb-1.5'

  // ── Step 2: what else to prepare ────────────────────────────────────────
  if (state === 'pick' || state === 'saving') {
    const n = Object.keys(chosen).length
    return (
      <div className="mt-9 rounded-2xl p-6 md:p-8 text-left"
           style={{ background: '#fff', border: '1px solid rgba(13,27,42,0.10)' }}>
        <div className="flex items-start gap-3">
          <span aria-hidden="true" style={{ color: ACCENT, fontSize: 20, lineHeight: '24px' }}>✓</span>
          <div>
            <h3 className="font-serif text-[21px]" style={{ color: NAVY }}>
              That is the valuation under way.
            </h3>
            <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: INK, opacity: 0.8 }}>
              It comes to {f.email} within 24 hours. While I am in the file, is there anything else
              worth preparing? Tick whatever would help. All of it is free, and none of it commits
              you to anything.
            </p>
          </div>
        </div>

        <div className="mt-7 space-y-3">
          {!items.length && (
            <p className="text-[14px]" style={{ color: INK, opacity: 0.6 }}>Loading…</p>
          )}
          {items.map(it => {
            const on = !!chosen[it.key]
            return (
              <div key={it.key} className="rounded-xl overflow-hidden"
                   style={{ border: '1px solid ' + (on ? 'rgba(176,111,36,0.55)' : 'rgba(13,27,42,0.12)'),
                            background: on ? '#FCF8F1' : '#fff' }}>
                <button type="button" onClick={() => toggle(it.key)}
                        className="w-full text-left px-5 py-4 flex items-start gap-3.5">
                  <span aria-hidden="true" className="flex-none mt-0.5 rounded-[5px] flex items-center justify-center"
                        style={{ width: 22, height: 22, background: on ? NAVY : '#fff',
                                 border: '2px solid ' + (on ? NAVY : 'rgba(13,27,42,0.28)'),
                                 color: '#fff', fontSize: 13, lineHeight: '18px' }}>
                    {on ? '✓' : ''}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[15.5px] font-medium" style={{ color: NAVY }}>{it.title}</span>
                    <span className="block mt-1 text-[13.5px] leading-relaxed" style={{ color: INK, opacity: 0.75 }}>
                      {it.blurb}
                    </span>
                    {it.turnaround && (
                      <span className="block mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em]"
                            style={{ color: ACCENT }}>{it.turnaround}</span>
                    )}
                  </span>
                </button>

                {/* The questions this document cannot be produced without, asked
                    on its own card at the moment it is chosen rather than in an
                    email three days later. */}
                {on && it.fields && it.fields.length > 0 && (
                  <div className="px-5 pb-5 pt-1" style={{ borderTop: '1px dashed rgba(176,111,36,0.35)' }}>
                    <p className="mt-3 mb-3 font-mono text-[10.5px] uppercase tracking-[0.16em]"
                       style={{ color: '#8a5d10' }}>
                      Helpful for this one — skip anything you do not have
                    </p>
                    <div className="grid md:grid-cols-2 gap-3.5">
                      {it.fields.map(fd => (
                        <div key={fd.key} className={fd.type === 'textarea' ? 'md:col-span-2' : ''}>
                          <label className={label} style={{ color: INK }} htmlFor={it.key + '-' + fd.key}>
                            {fd.label}
                          </label>
                          {fd.type === 'select' ? (
                            <select id={it.key + '-' + fd.key} className={field} style={border}
                                    value={chosen[it.key]?.[fd.key] || ''}
                                    onChange={e => setInput(it.key, fd.key, e.target.value)}>
                              <option value="">—</option>
                              {(fd.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : fd.type === 'textarea' ? (
                            <textarea id={it.key + '-' + fd.key} className={field}
                                      style={{ ...border, minHeight: 64, resize: 'vertical' }}
                                      placeholder={fd.placeholder}
                                      value={chosen[it.key]?.[fd.key] || ''}
                                      onChange={e => setInput(it.key, fd.key, e.target.value)} />
                          ) : (
                            <input id={it.key + '-' + fd.key} className={field} style={border}
                                   placeholder={fd.placeholder}
                                   value={chosen[it.key]?.[fd.key] || ''}
                                   onChange={e => setInput(it.key, fd.key, e.target.value)} />
                          )}
                          {fd.help && (
                            <p className="mt-1 text-[11.5px]" style={{ color: INK, opacity: 0.6 }}>{fd.help}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {err && <p className="mt-4 text-[14px]" style={{ color: '#98301f' }} role="alert">{err}</p>}

        <button type="button" disabled={state === 'saving'} onClick={() => sendPicks(true)}
          className="mt-7 w-full md:w-auto inline-flex items-center justify-center rounded-full px-8 py-3.5 text-[15px] font-medium transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60"
          style={{ background: NAVY, color: '#fff' }}>
          {state === 'saving'
            ? 'Saving…'
            : n
              ? 'Prepare ' + (n === 1 ? 'this' : 'these ' + n) + ' and book a call'
              : 'Book a call to go through it'}
        </button>

        {/* Reading before talking is a legitimate choice, so it is offered
            plainly rather than buried as a way out. */}
        <p className="mt-4">
          <button type="button" onClick={() => sendPicks(false)} disabled={state === 'saving'}
                  className="text-[13.5px] underline disabled:opacity-60"
                  style={{ color: INK, opacity: 0.7 }}>
            Send me the documents first — I will book a call later if I want one
          </button>
        </p>
      </div>
    )
  }

  // ── Step 3: book the review ─────────────────────────────────────────────
  if (state === 'call') {
    return (
      <div className="mt-9">
        <div className="rounded-2xl p-6 md:p-8 text-left"
             style={{ background: '#fff', border: '1px solid rgba(13,27,42,0.10)' }}>
          <h3 className="font-serif text-[21px]" style={{ color: NAVY }}>
            Last thing — when shall we go through it?
          </h3>
          <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: INK, opacity: 0.8 }}>
            Everything you ticked will be with you before we speak, so the call is a review rather
            than a briefing. Thirty minutes on Google Meet, from wherever you are.
          </p>
        </div>
        <ProbateMeetScheduler compact
          prefill={{ name: f.name, email: f.email, phone: f.phone, address: f.address }} />
        <p className="mt-3 text-[13px]" style={{ color: INK, opacity: 0.6 }}>
          Not now? Close the page — the documents are already on their way.
        </p>
      </div>
    )
  }

  // ── Documents only ──────────────────────────────────────────────────────
  if (state === 'reading') {
    return (
      <div className="mt-9 rounded-2xl p-8 text-left"
           style={{ background: 'rgba(79,130,185,0.07)', border: '1px solid rgba(79,130,185,0.20)' }}>
        <h3 className="font-serif text-[22px]" style={{ color: NAVY }}>
          On their way. Read them in your own time.
        </h3>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: INK }}>
          Everything comes to {f.email}, starting with the valuation within 24 hours. Forward any of
          it to your attorney — that is what it is written for.
        </p>
        <p className="mt-4 text-[14px]" style={{ color: INK, opacity: 0.8 }}>
          If you would like to talk once you have read it,{' '}
          <a href="#talk" style={{ color: ACCENT }}>book half an hour</a> whenever suits, or reply to
          the email. No hurry from me.
        </p>
      </div>
    )
  }


  return (
    <div
      className="mt-9 rounded-2xl p-6 md:p-8 text-left"
      style={{ background: '#fff', border: '1px solid rgba(13,27,42,0.10)' }}
    >
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className={label} style={{ color: INK }} htmlFor="pv-name">Your full name</label>
          <input id="pv-name" className={field} style={border} value={f.name}
                 onChange={set('name')} autoComplete="name" placeholder="As it should be addressed" />
        </div>
        <div>
          <label className={label} style={{ color: INK }} htmlFor="pv-email">Email</label>
          <input id="pv-email" type="email" className={field} style={border} value={f.email}
                 onChange={set('email')} autoComplete="email" placeholder="Where the letter goes" />
        </div>
        <div>
          <label className={label} style={{ color: INK }} htmlFor="pv-dod">
            Date of passing <span style={{ color: ACCENT }}>— this sets the valuation date</span>
          </label>
          <input id="pv-dod" type="date" className={field}
                 style={{ ...border, borderColor: 'rgba(176,111,36,0.55)' }} value={f.dod}
                 onChange={set('dod')} max={new Date().toISOString().slice(0, 10)} />
        </div>
        <div>
          <label className={label} style={{ color: INK }} htmlFor="pv-phone">
            Mobile <span style={{ opacity: 0.55 }}>— optional</span>
          </label>
          <input id="pv-phone" type="tel" className={field} style={border} value={f.phone}
                 onChange={set('phone')} autoComplete="tel" placeholder="Only if you would rather I called" />
        </div>
        <div className="md:col-span-2">
          <label className={label} style={{ color: INK }} htmlFor="pv-addr">Property address</label>
          <input id="pv-addr" className={field} style={border} value={f.address}
                 onChange={set('address')} autoComplete="street-address"
                 placeholder="Street, city — the property in the estate" />
        </div>
        <div className="md:col-span-2">
          <label className={label} style={{ color: INK }} htmlFor="pv-note">
            Anything I should know <span style={{ opacity: 0.55 }}>— optional</span>
          </label>
          <textarea id="pv-note" className={field} style={{ ...border, minHeight: 80, resize: 'vertical' }}
                    value={f.note} onChange={set('note')}
                    placeholder="Condition, tenants, a second property, siblings who disagree — anything at all" />
        </div>
      </div>

      {err && (
        <p className="mt-4 text-[14px]" style={{ color: '#98301f' }} role="alert">{err}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={state === 'sending'}
        className="mt-6 w-full md:w-auto inline-flex items-center justify-center rounded-full px-8 py-3.5 text-[15px] font-medium transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
        style={{ background: NAVY, color: '#fff' }}
      >
        {state === 'sending' ? 'Sending…' : 'Request the valuation letter'}
      </button>

      <p className="mt-4 text-[12.5px] leading-relaxed" style={{ color: INK, opacity: 0.62 }}>
        Sent to me only, and used for this one letter. No charge, no listing agreement,
        no obligation. <span style={{ color: ACCENT }}>Written up and with you within 24 hours,
        ready for your attorney.</span>
      </p>
    </div>
  )
}
