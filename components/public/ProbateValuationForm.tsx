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

import { useState } from 'react'
import { cityMarket } from '@/lib/cityMarket'
import { NAVY, INK, LOGO_BLUE as ACCENT } from '@/components/public/motion'

type State = 'idle' | 'sending' | 'done'

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
      setState('done')
    } catch {
      /* Never a dead end: if this fails the person still has a way through. */
      setErr('That did not send. Email tim@mcmullen.properties and it will be done the same way.')
      setState('idle')
    }
  }

  if (state === 'done') {
    return (
      <div
        className="mt-9 rounded-2xl p-8 text-left"
        style={{ background: 'rgba(79,130,185,0.07)', border: '1px solid rgba(79,130,185,0.20)' }}
      >
        <h3 className="font-serif text-[22px]" style={{ color: NAVY }}>
          Asked. You will have it within 24 hours.
        </h3>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: INK }}>
          It comes to {f.email} as a written letter addressed to the estate, with the comparable
          sales it is built from, so it can go straight into your attorney’s file. If anything about
          the property needs explaining first, I will call you before I write it.
        </p>
        <p className="mt-4 text-[13.5px]" style={{ color: INK, opacity: 0.7 }}>
          Nothing else happens. There is no listing agreement and no obligation of any kind.
        </p>
      </div>
    )
  }

  const field = 'w-full rounded-xl px-4 py-3 text-[15px] bg-white outline-none transition-colors'
  const border = { border: '1px solid rgba(13,27,42,0.14)', color: INK }
  const label = 'block text-[12px] font-medium mb-1.5'

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
          <label className={label} style={{ color: INK }} htmlFor="pv-phone">
            Mobile <span style={{ opacity: 0.55 }}>— optional</span>
          </label>
          <input id="pv-phone" type="tel" className={field} style={border} value={f.phone}
                 onChange={set('phone')} autoComplete="tel" placeholder="Only if you would rather I called" />
        </div>
        <div>
          <label className={label} style={{ color: INK }} htmlFor="pv-dod">Date of passing</label>
          <input id="pv-dod" type="date" className={field} style={border} value={f.dod}
                 onChange={set('dod')} max={new Date().toISOString().slice(0, 10)} />
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
        no obligation. <span style={{ color: ACCENT }}>Within 24 hours.</span>
      </p>
    </div>
  )
}
