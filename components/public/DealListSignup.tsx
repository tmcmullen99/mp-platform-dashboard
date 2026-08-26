// DealListSignup — one component, three placements.
//
// The same ask appears at the top of the page, in the middle and at the end,
// because a developer decides at different points depending on what convinced
// them: the sourcing argument, the estate pipeline, or the exit-strategy piece.
// Repeating a form is only nagging if it is the same form; each placement
// carries the copy that belongs where it sits, and once someone is on the list
// every instance on the page switches to the confirmed state so nobody is
// asked twice.
//
// The list itself lives on the campbell-market project rather than this site's
// own, and that is deliberate: unsubscribed, bounced and do-not-contact all
// live there. A list held anywhere else would mail people who have already
// asked not to be mailed. Suppression is checked at signup, not only at send.
//
// Nothing is promised that cannot be delivered. No "exclusive", no volume
// claim, no frequency the desk has not committed to — the copy says what
// arrives and roughly how often, and the unsubscribe line is in the form
// rather than only in the footer of the mail.

import { useState } from 'react'
import { Reveal, NAVY, INK, LOGO_BLUE } from '@/components/public/motion'
import { CheckCircle2 } from 'lucide-react'

const SUPABASE_URL = 'https://qinuukntpyulqjzndnho.supabase.co'
const SUPABASE_ANON = 'sb_publishable_1CzH1AWkEzy1WjMvZqwlhA_xiay_wJ2'

/* Module-level so every placement on the page agrees. A second form still
   showing "join the list" after the first one succeeded reads as a failure. */
let JOINED = false
const listeners = new Set<() => void>()
function markJoined() {
  JOINED = true
  listeners.forEach((fn) => fn())
}

export type DealListVariant = 'band' | 'inline' | 'panel'

const COPY: Record<DealListVariant, { eyebrow: string; heading: string; body: string; cta: string }> = {
  band: {
    eyebrow: 'Off-market deal list',
    heading: 'See them before they are listed.',
    body:
      'Off-market opportunities across the Peninsula, Silicon Valley and San Francisco — sent as they come up, with the numbers already run. Usually two or three a month. Never a blast.',
    cta: 'Send me deals',
  },
  inline: {
    eyebrow: 'Get the flow',
    heading: 'Want these before anyone else does?',
    body:
      'Estates, expireds and quiet sellers reach my desk before they reach the MLS. Leave an address and I will send the ones that fit what you build.',
    cta: 'Add me to the list',
  },
  panel: {
    eyebrow: 'Deal list',
    heading: 'Deals, as they come up.',
    body:
      'No newsletter and no drip. Just the properties worth your time, with the basis and the exit sketched out. Unsubscribe from any one of them.',
    cta: 'Join the list',
  },
}

const FOCUS = [
  { v: 'flips', label: 'Flips / rehab' },
  { v: 'ground_up', label: 'Ground-up' },
  { v: 'multifamily', label: 'Multifamily' },
  { v: 'commercial', label: 'Commercial' },
  { v: 'land', label: 'Land' },
  { v: 'any', label: 'Anything that pencils' },
]

export default function DealListSignup({
  variant = 'band',
  source,
  showFocus = false,
}: {
  variant?: DealListVariant
  source: string
  showFocus?: boolean
}) {
  const [email, setEmail] = useState('')
  const [focus, setFocus] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>(JOINED ? 'done' : 'idle')
  const [err, setErr] = useState('')

  // Re-render this instance when any other one succeeds.
  useState(() => {
    const fn = () => setState('done')
    listeners.add(fn)
    return () => listeners.delete(fn)
  })

  const copy = COPY[variant]

  async function join() {
    const e = email.trim()
    if (!e) { setState('error'); setErr('An email address, and that is all.'); return }
    setState('sending')
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/join_deal_list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({
          p_email: e,
          p_focus: focus || null,
          p_source: source,
        }),
      })
      if (!r.ok) throw new Error(`rpc_${r.status}`)
      const j = await r.json()
      if (!j?.ok) {
        setState('error')
        setErr(j?.reason === 'email_invalid' ? 'That address does not look right.' : 'That did not save.')
        return
      }
      markJoined()
      setState('done')
    } catch (ex) {
      // Surface it. A signup that fails silently is worse than one that
      // refuses — the developer thinks they are on a list they are not on.
      console.error('join_deal_list failed', ex)
      setState('error')
      setErr('That did not save. Try again, or call (415) 691-9272.')
    }
  }

  const input =
    'flex-1 min-w-0 rounded-full px-5 py-3.5 text-[15px] outline-none border'

  /* ---- the form row, shared by every variant ---- */
  const onDark = variant === 'band'
  const form =
    state === 'done' ? (
      <div className="flex items-center gap-3" style={{ color: onDark ? '#fff' : NAVY }}>
        <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: LOGO_BLUE }} />
        <span className="text-[15.5px]">
          You are on the list. The next one that fits comes straight to you.
        </span>
      </div>
    ) : (
      <>
        {showFocus && (
          <div className="flex flex-wrap gap-2 mb-3">
            {FOCUS.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setFocus(focus === o.v ? '' : o.v)}
                aria-pressed={focus === o.v}
                className="rounded-full px-4 py-2 text-[13px] border transition-colors"
                style={
                  focus === o.v
                    ? { background: LOGO_BLUE, borderColor: LOGO_BLUE, color: '#fff' }
                    : onDark
                      ? { background: 'transparent', borderColor: 'rgba(255,255,255,0.28)', color: 'rgba(255,255,255,0.8)' }
                      : { background: '#fff', borderColor: 'rgba(0,0,0,0.12)', color: INK }
                }
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className={input}
            style={
              onDark
                ? { background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.22)', color: '#fff' }
                : { background: '#fff', borderColor: 'rgba(0,0,0,0.12)', color: INK }
            }
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === 'Enter') join() }}
            aria-label="Email address"
          />
          <button
            type="button"
            onClick={join}
            disabled={state === 'sending'}
            className="rounded-full px-7 py-3.5 text-[15px] font-medium whitespace-nowrap disabled:opacity-60"
            style={onDark ? { background: '#fff', color: NAVY } : { background: NAVY, color: '#fff' }}
          >
            {state === 'sending' ? 'Adding…' : copy.cta}
          </button>
        </div>
        {state === 'error' && (
          <p className="mt-3 text-[13.5px]" style={{ color: onDark ? '#ffb4a2' : '#b0552b' }}>{err}</p>
        )}
        <p
          className="mt-3 text-[12.5px] leading-relaxed"
          style={{ color: onDark ? 'rgba(255,255,255,0.55)' : '#5c6771' }}
        >
          Deals only. No newsletter, no sharing your address, unsubscribe from any message.
        </p>
      </>
    )

  /* ---- placements ---- */
  if (variant === 'inline') {
    return (
      <Reveal>
        <div className="rounded-[24px] border border-black/[0.08] bg-white p-7 md:p-9">
          <div className="mp-mono text-[11px] uppercase tracking-[0.2em] mb-3" style={{ color: LOGO_BLUE }}>
            {copy.eyebrow}
          </div>
          <h3 className="mp-serif text-[26px] md:text-[32px] leading-tight font-semibold" style={{ color: NAVY }}>
            {copy.heading}
          </h3>
          <p className="mt-4 text-[16px] leading-relaxed max-w-2xl" style={{ color: INK }}>{copy.body}</p>
          <div className="mt-6 max-w-xl">{form}</div>
        </div>
      </Reveal>
    )
  }

  if (variant === 'panel') {
    return (
      <Reveal>
        <div className="rounded-[24px] p-7 md:p-8" style={{ background: '#f4f7fb' }}>
          <div className="mp-mono text-[11px] uppercase tracking-[0.2em] mb-2" style={{ color: LOGO_BLUE }}>
            {copy.eyebrow}
          </div>
          <h3 className="mp-serif text-[22px] leading-tight font-semibold" style={{ color: NAVY }}>
            {copy.heading}
          </h3>
          <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: INK }}>{copy.body}</p>
          <div className="mt-5">{form}</div>
        </div>
      </Reveal>
    )
  }

  return (
    <section style={{ background: NAVY }}>
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-[0.22em] mb-4" style={{ color: '#a8c5e6' }}>
            {copy.eyebrow}
          </div>
          <h2 className="mp-serif text-white text-[30px] md:text-[42px] leading-[1.08] font-semibold">
            {copy.heading}
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
            {copy.body}
          </p>
          <div className="mt-8 max-w-xl">{form}</div>
        </Reveal>
      </div>
    </section>
  )
}
