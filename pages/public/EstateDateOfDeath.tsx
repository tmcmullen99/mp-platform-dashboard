// The estate's date-of-death page: where the QR code on probate letter 2 lands (Tim, 3 Nov 2026).
//
// Letter 2 says "Scan the code below to request yours". Until today the code opened the general probate
// service page, where a petitioner had to type the address and the date of death themselves. Every letter
// already carries both, so this page arrives with them filled in from the court filing: one screen on a
// phone, a name and an email, and the request is with Tim.
//
//   THE HOME AND THE DATE ARE ALREADY HERE. The date can be corrected; nothing else needs typing.
//   NO NAMES. probate_estate_page returns the property and the dates, never the deceased, the petitioner
//     or the case number: a letter gets forwarded, photographed and mislaid.
//   THE PAGE KEEPS STATE. Scan the same code again next week and it says the request is with Tim, then,
//     once the valuation is published, opens it. Letters 3 to 6 point at the published valuation.
//   THE TIMELINE IS THE LETTERS' OWN. "Everyone you might need" is the list printed on the back of every
//     letter, read from letter 1, grouped by month, with the month the estate is in opened.
//   Where the home sits in a city market with recorded sales, the sales before the date of death are shown,
//     as the app's date-of-death page shows them. Elsewhere Tim builds the set by hand.

import { useEffect, useRef, useState, type RefObject } from 'react'
import { useParams } from 'react-router-dom'
import { cityMarket } from '@/lib/cityMarket'
import { MotionStyles, NAVY, INK, LOGO_BLUE } from '@/components/public/motion'

const ACCENT = LOGO_BLUE
const LINE = 'rgba(13,27,42,0.10)'

type Comp = { a: string; d: string; price: number; sf?: number; b?: string; ba?: string; ppsf?: number; mi?: number }
type Page = {
  ok: true
  property: { address: string; city?: string; zip?: string; county?: string; beds?: number; baths?: number; sqft?: number; year_built?: number; type?: string }
  dod: string | null
  filed: string | null
  months_since_filing: number | null
  requested: { at: string; dod: string | null; status: string } | null
  valuation_url: string | null
  sales: { n: number; window: string; widened: boolean; thin: boolean; withheld: number; comps: Comp[] } | null
  agent: { first: string; name: string; dre: string; phone: string | null }
  timeline: { heading: string; intro: string; footnote: string; rows: [string, string][] } | null
}

const ROLES = ['Executor or administrator', 'Trustee', 'Heir or beneficiary', 'Attorney', 'Other']
const ERR: Record<string, string> = {
  name: 'Add the name I should address it to.',
  email: 'That email address does not look right. Check it and try again.',
  attorney_email: 'Check the attorney’s email address, or leave it blank.',
  bad_date: 'Enter a date of death in the past.',
  too_many: 'Several requests have already come from this email today. I will be in touch.',
  not_found: 'This link is no longer active.',
}

const money = (n?: number | null) => (n == null ? '' : '$' + Math.round(Number(n)).toLocaleString('en-US'))
const asDate = (d?: string | null) => (d ? new Date(String(d).slice(0, 10) + 'T12:00:00') : null)
const longDate = (d?: string | null) => asDate(d)?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) ?? ''
const shortDate = (d?: string | null) => asDate(d)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) ?? ''
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)

/* "From the start" is month 1; "Months 3–5" and "Month 3 on" start in month 3. */
const startMonth = (when: string) => (/start/i.test(when) ? 1 : Number(/(\d+)/.exec(when)?.[1] || 1))
const endMonth = (when: string) => {
  const m = /–\s*(\d+)/.exec(when)
  return m ? Number(m[1]) : Infinity
}
function splitItem(s: string) {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(s)
  return m ? { t: m[1], x: m[2] } : { t: s, x: '' }
}

async function load(token: string): Promise<{ page: Page | null; error: string }> {
  if (!/^[a-f0-9]{32}$/i.test(token)) return { page: null, error: 'not_found' }
  const { data, error } = await cityMarket.rpc('probate_estate_page', { p_token: token.toLowerCase() })
  if (error) return { page: null, error: error.message }
  if (!data?.ok) return { page: null, error: data?.error || 'not_found' }
  return { page: data as Page, error: '' }
}

export default function EstateDateOfDeath() {
  const { token = '' } = useParams()
  const [p, setP] = useState<Page | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let dead = false
    /* A private page reached by an unguessable token: never indexed. */
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow,noarchive'
    document.head.appendChild(meta)
    load(token).then((r) => {
      if (dead) return
      setP(r.page)
      setErr(r.error)
      setLoading(false)
      if (r.page) document.title = `Date-of-death valuation · ${r.page.property.address}`
    })
    return () => {
      dead = true
      meta.remove()
    }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-white px-6">
        <p className="font-mono text-[12px] uppercase tracking-[0.16em]" style={{ color: INK }}>Loading…</p>
      </div>
    )
  }
  /* A dead link in a letter to a bereaved family is the worst outcome here: apologise and give a person. */
  if (!p) {
    return (
      <div className="min-h-screen grid place-items-center bg-white px-6">
        <div className="max-w-md text-center">
          <MotionStyles />
          <h1 className="font-serif text-[26px]" style={{ color: NAVY }}>This link is no longer active</h1>
          <p className="mt-4 text-[15.5px] leading-relaxed" style={{ color: INK }}>
            It may have been copied incompletely. Email me and I will send the valuation straight away.
            There is nothing you need to do first.
          </p>
          <a href="mailto:tim@mcmullen.properties?subject=Date-of-death%20valuation" className="mt-6 inline-block font-mono text-[12px] uppercase tracking-[0.14em]" style={{ color: ACCENT }}>
            tim@mcmullen.properties
          </a>
          {err && err !== 'not_found' ? <p className="mt-4 text-[12px]" style={{ color: INK, opacity: 0.5 }}>{err}</p> : null}
        </div>
      </div>
    )
  }
  return <EstatePage p={p} token={token} onChange={setP} />
}

function EstatePage({ p, token, onChange }: { p: Page; token: string; onChange: (p: Page) => void }) {
  const a = p.agent
  const prop = p.property
  const facts = [prop.beds ? prop.beds + ' bd' : '', prop.baths ? prop.baths + ' ba' : '', prop.sqft ? prop.sqft.toLocaleString('en-US') + ' sq ft' : '', prop.year_built ? 'built ' + prop.year_built : '']
    .filter(Boolean).join(' · ')
  const state: 'ready' | 'requested' | 'new' = p.valuation_url ? 'ready' : p.requested ? 'requested' : 'new'
  const effective = p.requested?.dod || p.dod
  const formRef = useRef<HTMLElement>(null)
  const [formSeen, setFormSeen] = useState(false)

  useEffect(() => {
    const el = formRef.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => setFormSeen(e.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [state])

  const tel = a.phone ? a.phone.replace(/[^\d+]/g, '') : ''
  const telHref = tel ? 'tel:+1' + tel.replace(/^\+?1?/, '') : ''
  const smsHref = tel ? 'sms:+1' + tel.replace(/^\+?1?/, '') : ''

  return (
    <div className="min-h-screen bg-white pb-28 md:pb-16">
      <MotionStyles />

      <header className="px-5 pt-8 pb-6 border-b" style={{ borderColor: LINE }}>
        <div className="max-w-xl mx-auto">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
            Date-of-death valuation · for this estate
          </p>
          <h1 className="mt-3 font-serif text-[clamp(1.75rem,7vw,2.5rem)] leading-tight" style={{ color: NAVY }}>{prop.address}</h1>
          <p className="mt-1.5 text-[15px]" style={{ color: INK }}>
            {[prop.city, prop.zip].filter(Boolean).join(' ')}
            {prop.county ? ` · ${prop.county} County` : ''}
          </p>
          {facts ? <p className="mt-1 text-[13.5px]" style={{ color: INK, opacity: 0.7 }}>{facts}</p> : null}
        </div>
      </header>

      <main className="px-5">
        <div className="max-w-xl mx-auto">
          {state === 'ready' ? (
            <section className="mt-6 rounded-2xl p-6 text-white" style={{ background: NAVY }}>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: '#9fc0e6' }}>Ready</p>
              <h2 className="mt-2 font-serif text-[24px] leading-snug">The valuation is ready.</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-white/80">
                The value as of {longDate(effective) || 'the date of death'}, the recorded sales it is drawn from, and today’s value alongside.
              </p>
              <a href={p.valuation_url!} className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-white text-[15px] font-semibold" style={{ color: NAVY }}>
                Open the valuation
              </a>
            </section>
          ) : state === 'requested' ? (
            <section className="mt-6 rounded-2xl p-6" style={{ background: '#F2F6FB', border: '1px solid rgba(79,130,185,0.25)' }}>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: ACCENT }}>Requested {shortDate(p.requested!.at)}</p>
              <h2 className="mt-2 font-serif text-[23px] leading-snug" style={{ color: NAVY }}>{a.first} has your request.</h2>
              <p className="mt-2 text-[15px] leading-relaxed" style={{ color: INK }}>
                It comes to you by email within 24 hours, and to the attorney if you added them. This page opens it too, so keep the letter.
              </p>
            </section>
          ) : null}

          <DateCard dod={p.dod} effective={effective} locked={state !== 'new'} formAnchor={formRef} />

          {state === 'new' ? <RequestForm token={token} p={p} anchor={formRef} onDone={onChange} /> : null}

          {state !== 'ready' ? <NextSteps p={p} state={state} effective={effective} /> : null}

          {p.sales && (p.sales.n > 0 || p.sales.withheld > 0) && state !== 'ready' ? <Sales s={p.sales} dod={effective} first={a.first} /> : null}

          <section className="mt-8 rounded-2xl p-5" style={{ background: 'rgba(79,130,185,0.07)', border: '1px solid rgba(79,130,185,0.22)' }}>
            <h2 className="font-serif text-[18px]" style={{ color: NAVY }}>What this is, and what it is not</h2>
            <p className="mt-2.5 text-[14.5px] leading-relaxed" style={{ color: INK }}>
              A broker’s opinion of value, not a certified appraisal. It is separate from the probate referee’s Inventory and
              Appraisal, which the court arranges and which the estate is formally measured against. Nothing here is tax or legal
              advice: basis, the estate return and your duties belong with your CPA and your attorney.
            </p>
          </section>

          {p.timeline?.rows?.length ? <MonthsAhead t={p.timeline} months={p.months_since_filing} filed={p.filed} smsHref={smsHref} first={a.first} /> : null}

          <footer className="mt-10 border-t pt-6" style={{ borderColor: LINE }}>
            <div className="grid grid-cols-2 gap-3">
              {telHref ? <a href={telHref} className="flex h-12 items-center justify-center rounded-full border text-[14.5px] font-semibold" style={{ borderColor: NAVY, color: NAVY }}>Call {a.first}</a> : null}
              {smsHref ? <a href={smsHref} className="flex h-12 items-center justify-center rounded-full border text-[14.5px] font-semibold" style={{ borderColor: NAVY, color: NAVY }}>Text {a.first}</a> : null}
            </div>
            <a href="/services/probate" className="mt-4 block text-center text-[14px] font-semibold" style={{ color: ACCENT }}>
              Everything I do for families in probate →
            </a>
            <p className="mt-6 text-center text-[12px] leading-relaxed" style={{ color: INK, opacity: 0.6 }}>
              If you would rather not hear from me, reply to the letter or text me and you won’t.
              <br />
              McMullen Properties LLC, which is not a real estate brokerage. Real estate services provided by {a.name}, Broker · CA DRE #{a.dre}.
            </p>
          </footer>
        </div>
      </main>

      {state === 'new' && !formSeen ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 px-5 py-3 backdrop-blur md:hidden" style={{ borderColor: LINE, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="h-12 w-full rounded-full text-[15px] font-semibold text-white" style={{ background: NAVY }}>
            Request the valuation
          </button>
        </div>
      ) : null}
    </div>
  )
}

function Dot() {
  return <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />
}

/* The date the valuation is as of. From the filing; the form below can correct it. */
function DateCard({ dod, effective, locked, formAnchor }: { dod: string | null; effective: string | null; locked: boolean; formAnchor: RefObject<HTMLElement> }) {
  return (
    <section className="mt-6 rounded-2xl border p-5" style={{ borderColor: LINE }}>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.16em]" style={{ color: INK, opacity: 0.65 }}>Effective date · the date of death</p>
      <p className="mt-1.5 font-serif text-[26px] leading-tight" style={{ color: NAVY }}>{longDate(effective) || 'Not on the filing'}</p>
      <p className="mt-1.5 text-[13.5px]" style={{ color: INK, opacity: 0.75 }}>
        {locked
          ? 'Only sales that closed before this date count.'
          : dod
            ? <>From the court filing. Only sales that closed before it count. <button type="button" className="font-semibold underline" style={{ color: ACCENT }} onClick={() => formAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Not right? Correct it below.</button></>
            : 'The filing does not give it. Add it below.'}
      </p>
    </section>
  )
}

function RequestForm({ token, p, anchor, onDone }: { token: string; p: Page; anchor: RefObject<HTMLElement>; onDone: (p: Page) => void }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', role: ROLES[0], attorney: '', dod: p.dod || '', note: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [more, setMore] = useState(false)
  const input = 'w-full rounded-xl border px-3.5 py-3 text-[16px] bg-white outline-none focus:ring-2'
  const box = { borderColor: 'rgba(13,27,42,0.18)', color: NAVY }
  const dodChanged = !!p.dod && f.dod !== p.dod

  async function send() {
    setBusy(true)
    setErr('')
    const { data, error } = await cityMarket.rpc('probate_estate_request', {
      p_token: token.toLowerCase(), p_name: f.name, p_email: f.email, p_phone: f.phone || null, p_role: f.role,
      p_attorney_email: f.attorney || null, p_dod: f.dod || null, p_note: f.note || null,
    })
    if (error || !data?.ok) {
      setBusy(false)
      setErr(ERR[data?.error] || error?.message || 'That did not send. Try again, or text me.')
      return
    }
    const r = await load(token)
    setBusy(false)
    if (r.page) {
      onDone(r.page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <section ref={anchor} className="mt-6 scroll-mt-4 rounded-2xl p-5" style={{ background: '#F7F8FA', border: `1px solid ${LINE}` }}>
      <h2 className="font-serif text-[22px]" style={{ color: NAVY }}>Request yours</h2>
      <ul className="mt-2.5 space-y-1.5 text-[14.5px] leading-relaxed" style={{ color: INK }}>
        <li className="flex gap-2.5"><Dot />What the home was worth on the date of death, the figure the estate has to establish.</li>
        <li className="flex gap-2.5"><Dot />The recorded sales behind it, so you and the attorney can see the reasoning.</li>
        <li className="flex gap-2.5"><Dot />Today’s value alongside, since the same work produces both.</li>
      </ul>
      <p className="mt-2.5 text-[14px] leading-relaxed" style={{ color: INK, opacity: 0.8 }}>
        No charge, nothing attached. I send it by email within 24 hours, and to the attorney if you add them.
      </p>
      <div className="mt-4 space-y-3">
        <input className={input} style={box} placeholder="Your name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={input} style={box} placeholder="Your email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <select className={input} style={box} aria-label="Your role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
        <input className={input} style={box} placeholder="Attorney’s email, for a copy (optional)" type="email" inputMode="email" autoCapitalize="none" value={f.attorney} onChange={(e) => setF({ ...f, attorney: e.target.value })} />
        <label className="block">
          <span className="mb-1 block text-[13px] font-semibold" style={{ color: NAVY }}>Date of death</span>
          <input className={input} style={box} type="date" max={today()} min="1950-01-01" value={f.dod} onChange={(e) => setF({ ...f, dod: e.target.value })} />
          {dodChanged ? <span className="mt-1 block text-[12.5px]" style={{ color: ACCENT }}>Changed from the filing’s {longDate(p.dod)}. I will use yours.</span> : null}
        </label>
        {more ? (
          <>
            <input className={input} style={box} placeholder="Phone (optional)" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <textarea className={input} style={box} rows={3} placeholder="Anything the record won’t show: condition, a remodel, tenants (optional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          </>
        ) : (
          <button type="button" className="text-[14px] font-semibold" style={{ color: ACCENT }} onClick={() => setMore(true)}>+ Add a phone number or a note</button>
        )}
      </div>
      <button type="button" onClick={send} disabled={busy || f.name.trim().length < 2 || !f.email.trim() || !f.dod}
        className="mt-5 h-12 w-full rounded-full text-[15px] font-semibold text-white disabled:opacity-40" style={{ background: NAVY }}>
        {busy ? 'Sending…' : 'Send me the valuation'}
      </button>
      {err ? <p className="mt-3 text-[14px]" style={{ color: '#a33' }}>{err}</p> : null}
      <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: INK, opacity: 0.7 }}>
        Your name and contact come to me only. They are never on the valuation or its page.
      </p>
    </section>
  )
}

/* What happens after the request, so nobody is left wondering. */
function NextSteps({ p, state, effective }: { p: Page; state: 'new' | 'requested'; effective: string | null }) {
  const steps = [
    { t: 'You ask', x: state === 'requested' ? `Done, ${shortDate(p.requested!.at)}.` : 'A name and an email, on this page.', done: state === 'requested' },
    { t: `${p.agent.first} pulls the recorded sales`, x: `Sales of comparable homes that closed before ${longDate(effective) || 'the date of death'}, checked by hand.`, done: false },
    { t: 'The valuation, by email', x: 'The value on that date, the sales behind it, and today’s value. A copy to the attorney if you added one.', done: false },
    { t: 'Kept on this page', x: 'Scan the letter again any time and it opens here.', done: false },
  ]
  return (
    <section className="mt-8">
      <h2 className="font-serif text-[22px]" style={{ color: NAVY }}>What happens next</h2>
      <ol className="mt-4">
        {steps.map((s, i) => (
          <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
            {i < steps.length - 1 ? <span className="absolute left-[13px] top-7 bottom-0 w-px" style={{ background: LINE }} /> : null}
            <span className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[12px]"
              style={s.done ? { background: ACCENT, color: '#fff' } : { border: `1.5px solid ${ACCENT}`, color: ACCENT, background: '#fff' }}>
              {s.done ? '✓' : i + 1}
            </span>
            <div className="pt-0.5">
              <p className="text-[15px] font-semibold" style={{ color: NAVY }}>{s.t}</p>
              <p className="mt-0.5 text-[14px] leading-relaxed" style={{ color: INK }}>{s.x}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* The app's sales-before-the-date list, for homes in a city market with recorded sales. */
function Sales({ s, dod, first }: { s: NonNullable<Page['sales']>; dod: string | null; first: string }) {
  return (
    <section className="mt-8">
      <h2 className="font-serif text-[22px]" style={{ color: NAVY }}>Recorded sales before {shortDate(dod)}</h2>
      {s.n > 0 ? (
        <>
          <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: INK }}>
            {s.n} comparable {s.n === 1 ? 'sale' : 'sales'} found in the {s.window}, as selected automatically. I check each one before anything is sent.
          </p>
          <ul className="mt-3 divide-y rounded-2xl border px-4" style={{ borderColor: LINE }}>
            {s.comps.map((c, i) => (
              <li key={i} className="grid grid-cols-[1fr_auto] gap-x-3 py-3" style={{ borderColor: LINE }}>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold" style={{ color: NAVY }}>{c.a}</p>
                  <p className="text-[12.5px]" style={{ color: INK, opacity: 0.75 }}>
                    {[shortDate(c.d), c.mi != null ? c.mi + ' mi' : '', [c.b ? c.b + ' bd' : '', c.ba ? c.ba + ' ba' : '', c.sf ? Number(c.sf).toLocaleString('en-US') + ' sq ft' : ''].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-[17px]" style={{ color: NAVY }}>{money(c.price)}</p>
                  {c.ppsf ? <p className="text-[12px]" style={{ color: INK, opacity: 0.7 }}>{money(c.ppsf)}/sq ft</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {s.withheld > 0 ? (
        <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: INK, opacity: 0.8 }}>
          {s.withheld} {s.withheld === 1 ? 'sale in the area is an MLS record' : 'sales in the area are MLS records'}, which can’t be shown publicly. {first}’s valuation includes them.
        </p>
      ) : null}
    </section>
  )
}

/* The list on the back of every letter, grouped by the month it tends to matter, the estate's month opened. */
function MonthsAhead({ t, months, filed, smsHref, first }: { t: NonNullable<Page['timeline']>; months: number | null; filed: string | null; smsHref: string; first: string }) {
  const now = months == null ? null : months + 1
  const groups = new Map<number, [string, string][]>()
  for (const r of t.rows) {
    const k = startMonth(r[1])
    groups.set(k, [...(groups.get(k) || []), r])
  }
  const keys = [...groups.keys()].sort((x, y) => x - y)
  const current = now == null ? 1 : keys.filter((k) => k <= now).pop() ?? 1
  return (
    <section className="mt-10">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: ACCENT }}>The months ahead</p>
      <h2 className="mt-1.5 font-serif text-[22px] leading-snug" style={{ color: NAVY }}>{t.heading}</h2>
      {filed ? (
        <p className="mt-1.5 text-[13.5px]" style={{ color: INK, opacity: 0.75 }}>
          The petition was filed {longDate(filed)}{months != null ? `, about ${months <= 1 ? 'a month' : months + ' months'} ago` : ''}.
        </p>
      ) : null}
      <p className="mt-2.5 text-[14.5px] leading-relaxed" style={{ color: INK }}>{t.intro}</p>
      <div className="mt-4 space-y-2.5">
        {keys.map((k) => {
          const rows = groups.get(k)!
          const isNow = k === current
          const live = now != null && rows.some((r) => startMonth(r[1]) <= now && now <= endMonth(r[1]))
          return (
            <details key={k} open={isNow || k === 1} className="group rounded-2xl border" style={{ borderColor: isNow ? 'rgba(79,130,185,0.45)' : LINE, background: isNow ? '#F2F6FB' : '#fff' }}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">
                <span className="text-[15px] font-semibold" style={{ color: NAVY }}>
                  {k === 1 ? 'From the start' : `From month ${k}`}
                  <span className="ml-2 text-[12.5px] font-normal" style={{ color: INK, opacity: 0.65 }}>{rows.length}</span>
                </span>
                <span className="flex items-center gap-2">
                  {isNow ? <span className="rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white" style={{ background: ACCENT }}>About now</span>
                    : live ? <span className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: ACCENT }}>Still open</span> : null}
                  <span className="text-[18px] leading-none transition-transform group-open:rotate-45" style={{ color: ACCENT }}>+</span>
                </span>
              </summary>
              <ul className="space-y-3 px-4 pb-4">
                {rows.map((r, i) => {
                  const it = splitItem(r[0])
                  return (
                    <li key={i}>
                      <p className="text-[14.5px] font-semibold leading-snug" style={{ color: NAVY }}>{it.t}</p>
                      <p className="text-[13.5px] leading-relaxed" style={{ color: INK }}>
                        {it.x ? it.x + ' · ' : ''}<span style={{ opacity: 0.65 }}>{r[1]}</span>
                      </p>
                    </li>
                  )
                })}
              </ul>
            </details>
          )
        })}
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: INK, opacity: 0.7 }}>
        Months are counted from the petition here; your attorney has your court’s dates. {t.footnote}
      </p>
      {smsHref ? (
        <a href={smsHref} className="mt-4 flex h-12 w-full items-center justify-center rounded-full text-[15px] font-semibold text-white" style={{ background: ACCENT }}>
          Text {first} for a name
        </a>
      ) : null}
    </section>
  )
}
