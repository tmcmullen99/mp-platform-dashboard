// Thirty minutes with Tim, on Google Meet.
//
// Availability is read from Tim's actual calendar (freebusy via domain-wide
// delegation), not from a table of our own bookings — offering a slot that has
// a showing in it is worse than offering nothing. Booking creates the calendar
// event, generates a real Meet link, and sends the invite.
//
// A petitioner is frequently in another state — 279 of 500 live away from the
// estate and 74 are out of state — so a video call is not a convenience here,
// it is the only practical way to sit down with someone.

import { useEffect, useState } from 'react'
import { NAVY, INK, LOGO_BLUE as ACCENT } from '@/components/public/motion'

const FN = 'https://qinuukntpyulqjzndnho.supabase.co/functions/v1/book-probate-consult'
const PUB_KEY = 'sb_publishable_1CzH1AWkEzy1WjMvZqwlhA_xiay_wJ2'

type Slot = { start: string; label: string }
type State = 'loading' | 'idle' | 'booking' | 'done' | 'unavailable'

const REASONS: Record<string, string> = {
  name_required: 'Please add your name.',
  bad_email: 'That email address does not look right.',
  bad_time: 'Pick a time from the list.',
  too_soon: 'That slot has just gone. Pick another.',
  too_far: 'That is further out than the calendar goes.',
  slot_taken: 'Someone just took that one. Pick another.',
}

export default function ProbateMeetScheduler() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [state, setState] = useState<State>('loading')
  const [pick, setPick] = useState<string>('')
  const [f, setF] = useState({ name: '', email: '', phone: '', address: '', note: '' })
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<{ when: string; meet_url: string | null } | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch(FN + '?action=slots', { headers: { 'x-cbm-key': PUB_KEY } })
        const d = await r.json()
        if (!alive) return
        if (!d?.ok || !Array.isArray(d.slots) || !d.slots.length) { setState('unavailable'); return }
        setSlots(d.slots)
        setState('idle')
      } catch { if (alive) setState('unavailable') }
    })()
    return () => { alive = false }
  }, [])

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  const book = async () => {
    setErr(null)
    if (!pick) { setErr('Pick a time first.'); return }
    setState('booking')
    try {
      const r = await fetch(FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cbm-key': PUB_KEY },
        body: JSON.stringify({ ...f, start: pick }),
      })
      const d = await r.json()
      if (!d?.ok) {
        setErr(REASONS[d?.error] || 'That did not go through. Email tim@mcmullen.properties and we will find a time.')
        setState('idle')
        /* A taken slot must disappear, or they will pick it again. */
        if (d?.error === 'slot_taken') { setSlots(s => s.filter(x => x.start !== pick)); setPick('') }
        return
      }
      setDone({ when: d.when, meet_url: d.meet_url || null })
      setState('done')
    } catch {
      setErr('That did not go through. Email tim@mcmullen.properties and we will find a time.')
      setState('idle')
    }
  }

  if (state === 'unavailable') {
    return (
      <div className="mt-9 rounded-2xl p-7 text-left"
           style={{ background: 'rgba(13,27,42,0.04)', border: '1px solid rgba(13,27,42,0.10)' }}>
        <h3 className="font-serif text-[21px]" style={{ color: NAVY }}>Let us find a time.</h3>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: INK }}>
          The calendar is not loading just now. Email{' '}
          <a href="mailto:tim@mcmullen.properties?subject=Probate%20call" style={{ color: ACCENT }}>
            tim@mcmullen.properties</a>{' '}or call{' '}
          <a href="tel:+14156919272" style={{ color: ACCENT }}>(415) 691-9272</a> and we will sort one out.
        </p>
      </div>
    )
  }

  if (state === 'done' && done) {
    return (
      <div className="mt-9 rounded-2xl p-8 text-left"
           style={{ background: 'rgba(79,130,185,0.07)', border: '1px solid rgba(79,130,185,0.20)' }}>
        <h3 className="font-serif text-[22px]" style={{ color: NAVY }}>You are booked in.</h3>
        <p className="mt-3 text-[17px]" style={{ color: NAVY }}><strong>{done.when}</strong> Pacific</p>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: INK }}>
          The invitation is in your inbox with the link. It is Google Meet, so it opens from a
          phone or a laptop with nothing to install.
        </p>
        {done.meet_url && (
          <a href={done.meet_url} target="_blank" rel="noopener"
             className="mt-5 inline-flex items-center rounded-full px-7 py-3 text-[15px] font-medium"
             style={{ background: NAVY, color: '#fff' }}>Join the call</a>
        )}
        <p className="mt-5 text-[13.5px]" style={{ color: INK, opacity: 0.7 }}>
          Nothing to prepare. If it would be easier to talk on the telephone instead, reply to the
          invitation and say so.
        </p>
      </div>
    )
  }

  const field = 'w-full rounded-xl px-4 py-3 text-[15px] bg-white outline-none'
  const border = { border: '1px solid rgba(13,27,42,0.14)', color: INK }
  const label = 'block text-[12px] font-medium mb-1.5'

  return (
    <div className="mt-9 rounded-2xl p-6 md:p-8 text-left"
         style={{ background: '#fff', border: '1px solid rgba(13,27,42,0.10)' }}>
      <p className={label} style={{ color: INK }}>Pick a time — 30 minutes, Pacific</p>
      {state === 'loading' ? (
        <p className="text-[14px]" style={{ color: INK, opacity: 0.6 }}>Reading the calendar…</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-6 max-h-[188px] overflow-y-auto">
          {slots.map(s => (
            <button key={s.start} type="button" onClick={() => setPick(s.start)}
              className="rounded-full px-4 py-2 text-[13.5px] transition-colors"
              style={pick === s.start
                ? { background: NAVY, color: '#fff', border: '1px solid ' + NAVY }
                : { background: '#fff', color: INK, border: '1px solid rgba(13,27,42,0.16)' }}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className={label} style={{ color: INK }} htmlFor="pm-name">Your name</label>
          <input id="pm-name" className={field} style={border} value={f.name} onChange={set('name')} autoComplete="name" />
        </div>
        <div>
          <label className={label} style={{ color: INK }} htmlFor="pm-email">Email</label>
          <input id="pm-email" type="email" className={field} style={border} value={f.email}
                 onChange={set('email')} autoComplete="email" placeholder="Where the invitation goes" />
        </div>
        <div>
          <label className={label} style={{ color: INK }} htmlFor="pm-phone">
            Mobile <span style={{ opacity: 0.55 }}>— optional</span>
          </label>
          <input id="pm-phone" type="tel" className={field} style={border} value={f.phone} onChange={set('phone')} autoComplete="tel" />
        </div>
        <div>
          <label className={label} style={{ color: INK }} htmlFor="pm-addr">
            Property <span style={{ opacity: 0.55 }}>— optional</span>
          </label>
          <input id="pm-addr" className={field} style={border} value={f.address}
                 onChange={set('address')} placeholder="So I can look it up beforehand" />
        </div>
        <div className="md:col-span-2">
          <label className={label} style={{ color: INK }} htmlFor="pm-note">
            Anything you want to cover <span style={{ opacity: 0.55 }}>— optional</span>
          </label>
          <textarea id="pm-note" className={field} style={{ ...border, minHeight: 74, resize: 'vertical' }}
                    value={f.note} onChange={set('note')} />
        </div>
      </div>

      {err && <p className="mt-4 text-[14px]" style={{ color: '#98301f' }} role="alert">{err}</p>}

      <button type="button" onClick={book} disabled={state === 'booking' || state === 'loading'}
        className="mt-6 w-full md:w-auto inline-flex items-center justify-center rounded-full px-8 py-3.5 text-[15px] font-medium transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
        style={{ background: NAVY, color: '#fff' }}>
        {state === 'booking' ? 'Booking…' : 'Book the call'}
      </button>

      <p className="mt-4 text-[12.5px] leading-relaxed" style={{ color: INK, opacity: 0.62 }}>
        Google Meet, thirty minutes, no charge and no obligation. Whenever you are ready — or not
        at all. <span style={{ color: ACCENT }}>Nothing to prepare.</span>
      </p>
    </div>
  )
}
