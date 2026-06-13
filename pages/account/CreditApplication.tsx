// /account/apply — the $10,000 credit application. Two doorways into one
// engine: buyer (intent profile, auto-grants on submit) and seller (address +
// owner name, queued for manual ownership review). One application per account
// (the backend enforces; the dashboard hides this once an application exists).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EDGE_FUNCTIONS_BASE_URL } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const SUBMIT_URL = `${EDGE_FUNCTIONS_BASE_URL}/submit_credit_application`

const TIMELINES = [
  { v: 'now', label: 'Ready now' },
  { v: '3mo', label: 'Next 3 months' },
  { v: '6mo', label: '3–6 months' },
  { v: 'browsing', label: 'Just exploring' },
]
const FINANCING = [
  { v: 'cash', label: 'All cash' },
  { v: 'preapproved', label: 'Pre-approved' },
  { v: 'need_lender', label: 'Need a lender' },
  { v: 'unsure', label: 'Not sure yet' },
]
const PROP_TYPES = ['Single-family', 'Condo', 'Townhouse', 'Multi-unit', 'Any']

export default function CreditApplication() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [side, setSide] = useState<'choose' | 'buyer' | 'seller'>('choose')

  if (side === 'choose') {
    return (
      <Shell>
        <Eyebrow>Apply for your $10,000 credit</Eyebrow>
        <H1>Which describes you?</H1>
        <p className="text-[#273C46] mt-4 max-w-lg">
          The credit is the same either way — yours to keep, applied at closing when you transact
          with McMullen Properties. We just tailor the next step.
        </p>
        <div className="grid sm:grid-cols-2 gap-5 mt-9">
          <button
            onClick={() => setSide('buyer')}
            className="text-left rounded-[24px] border border-black/[0.08] bg-white p-7 hover:border-[#0D1B2A]/40 transition-colors"
          >
            <div className="mp-mono text-[10px] uppercase tracking-[0.18em] text-[#273C46]/70">I&rsquo;m buying</div>
            <div className="mp-serif text-2xl not-italic mt-3">Tell us your search</div>
            <p className="text-sm text-[#273C46] mt-3 leading-relaxed">
              Share what you&rsquo;re looking for. Your credit is granted the moment you submit.
            </p>
          </button>
          <button
            onClick={() => setSide('seller')}
            className="text-left rounded-[24px] border border-black/[0.08] bg-white p-7 hover:border-[#0D1B2A]/40 transition-colors"
          >
            <div className="mp-mono text-[10px] uppercase tracking-[0.18em] text-[#273C46]/70">I&rsquo;m selling</div>
            <div className="mp-serif text-2xl not-italic mt-3">Confirm your home</div>
            <p className="text-sm text-[#273C46] mt-3 leading-relaxed">
              Enter your property and the owner name. Tim confirms ownership against tax records,
              then your credit goes live.
            </p>
          </button>
        </div>
        <button onClick={() => navigate('/account')} className="mt-9 text-sm text-[#273C46] underline underline-offset-4">
          &larr; Back to dashboard
        </button>
      </Shell>
    )
  }

  return side === 'buyer' ? (
    <BuyerForm token={session?.access_token} onBack={() => setSide('choose')} onDone={() => navigate('/account')} />
  ) : (
    <SellerForm token={session?.access_token} onBack={() => setSide('choose')} onDone={() => navigate('/account')} />
  )
}

/* ------------------------------- buyer form ------------------------------- */
function BuyerForm({ token, onBack, onDone }: { token?: string; onBack: () => void; onDone: () => void }) {
  const [locations, setLocations] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [beds, setBeds] = useState('')
  const [baths, setBaths] = useState('')
  const [propType, setPropType] = useState<string[]>([])
  const [timeline, setTimeline] = useState('')
  const [financing, setFinancing] = useState('')
  const [mustHaves, setMustHaves] = useState('')
  const [idealHome, setIdealHome] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function toggleType(t: string) {
    setPropType((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
  }

  async function submit() {
    if (!timeline) {
      setErr('Let us know your timeline.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          side: 'buyer',
          buyer_profile: {
            locations: locations.split(',').map((s) => s.trim()).filter(Boolean),
            price_min: priceMin ? Number(priceMin.replace(/[^0-9]/g, '')) : null,
            price_max: priceMax ? Number(priceMax.replace(/[^0-9]/g, '')) : null,
            beds_min: beds ? Number(beds) : null,
            baths_min: baths ? Number(baths) : null,
            property_types: propType,
            timeline,
            financing,
            must_haves: mustHaves.trim() || null,
            ideal_home: idealHome.trim() || null,
          },
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body?.error) {
        setErr(body?.error || 'Could not submit. Please try again.')
        setBusy(false)
        return
      }
      onDone()
    } catch {
      setErr('Could not reach the server. Please try again.')
      setBusy(false)
    }
  }

  return (
    <Shell>
      <Eyebrow>Buyer · $10,000 credit</Eyebrow>
      <H1>Tell us about your ideal home.</H1>
      <p className="text-[#273C46] mt-4 max-w-lg">
        The more you share, the sharper the matches — and your credit is granted as soon as you submit.
      </p>

      <div className="mt-9 space-y-6 max-w-2xl">
        <Field label="Target locations" hint="Neighborhoods or cities, comma-separated">
          <input className={inp} value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Noe Valley, Bernal Heights, Sunnyside" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price min">
            <input className={inp} value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="$1,200,000" inputMode="numeric" />
          </Field>
          <Field label="Price max">
            <input className={inp} value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="$1,800,000" inputMode="numeric" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Beds (min)">
            <input className={inp} value={beds} onChange={(e) => setBeds(e.target.value)} placeholder="2" inputMode="numeric" />
          </Field>
          <Field label="Baths (min)">
            <input className={inp} value={baths} onChange={(e) => setBaths(e.target.value)} placeholder="1" inputMode="numeric" />
          </Field>
        </div>
        <Field label="Property type">
          <div className="flex flex-wrap gap-2">
            {PROP_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={
                  'px-3.5 py-2 rounded-full text-sm border transition-colors ' +
                  (propType.includes(t)
                    ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
                    : 'bg-white text-[#273C46] border-black/15 hover:border-[#0D1B2A]/40')
                }
              >
                {t}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Timeline" hint="Required">
          <div className="flex flex-wrap gap-2">
            {TIMELINES.map((t) => (
              <Choice key={t.v} active={timeline === t.v} onClick={() => setTimeline(t.v)}>{t.label}</Choice>
            ))}
          </div>
        </Field>
        <Field label="Financing">
          <div className="flex flex-wrap gap-2">
            {FINANCING.map((f) => (
              <Choice key={f.v} active={financing === f.v} onClick={() => setFinancing(f.v)}>{f.label}</Choice>
            ))}
          </div>
        </Field>
        <Field label="Must-haves" hint="Parking, outdoor space, no stairs…">
          <input className={inp} value={mustHaves} onChange={(e) => setMustHaves(e.target.value)} placeholder="Parking, a yard, home office" />
        </Field>
        <Field label="Describe your ideal home" hint="Optional, free-form">
          <textarea className={inp + ' min-h-[96px] resize-none'} value={idealHome} onChange={(e) => setIdealHome(e.target.value)} placeholder="What would make a place feel right?" />
        </Field>

        {err ? <p className="text-sm text-red-700">{err}</p> : null}

        <div className="flex items-center gap-4 pt-2">
          <button onClick={submit} disabled={busy} className="inline-flex items-center justify-center rounded-full bg-[#0D1B2A] text-white px-7 py-3.5 text-sm font-medium disabled:opacity-60">
            {busy ? 'Submitting…' : 'Submit & claim my $10,000'}
          </button>
          <button onClick={onBack} className="text-sm text-[#273C46] underline underline-offset-4">Back</button>
        </div>
      </div>
    </Shell>
  )
}

/* ------------------------------ seller form ------------------------------- */
function SellerForm({ token, onBack, onDone }: { token?: string; onBack: () => void; onDone: () => void }) {
  const [address, setAddress] = useState('')
  const [unit, setUnit] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (!address.trim() || !ownerName.trim()) {
      setErr('Property address and owner name are both required.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          side: 'seller',
          seller: {
            address: address.trim(),
            unit: unit.trim() || null,
            city: city.trim() || null,
            state: 'CA',
            zip: zip.trim() || null,
            owner_name: ownerName.trim(),
            notes: notes.trim() || null,
          },
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body?.error) {
        setErr(body?.error || 'Could not submit. Please try again.')
        setBusy(false)
        return
      }
      onDone()
    } catch {
      setErr('Could not reach the server. Please try again.')
      setBusy(false)
    }
  }

  return (
    <Shell>
      <Eyebrow>Seller · $10,000 credit</Eyebrow>
      <H1>Confirm the home you own.</H1>
      <p className="text-[#273C46] mt-4 max-w-lg">
        Enter your property and the owner name exactly as it appears on title. Tim cross-references
        county tax records to confirm ownership, then your $10,000 credit goes live — usually within
        a day.
      </p>

      <div className="mt-9 space-y-6 max-w-2xl">
        <Field label="Property address" hint="Required">
          <input className={inp} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Valley Street" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Unit / Apt" hint="Optional">
            <input className={inp} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit 4" />
          </Field>
          <Field label="ZIP">
            <input className={inp} value={zip} onChange={(e) => setZip(e.target.value)} placeholder="94110" inputMode="numeric" />
          </Field>
        </div>
        <Field label="City">
          <input className={inp} value={city} onChange={(e) => setCity(e.target.value)} placeholder="San Francisco" />
        </Field>
        <Field label="Owner name (as on title)" hint="Required">
          <input className={inp} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Jane A. Homeowner" />
        </Field>
        <Field label="Anything we should know?" hint="Optional">
          <textarea className={inp + ' min-h-[96px] resize-none'} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Trust ownership, recently inherited, planning to sell in spring…" />
        </Field>

        {err ? <p className="text-sm text-red-700">{err}</p> : null}

        <div className="flex items-center gap-4 pt-2">
          <button onClick={submit} disabled={busy} className="inline-flex items-center justify-center rounded-full bg-[#0D1B2A] text-white px-7 py-3.5 text-sm font-medium disabled:opacity-60">
            {busy ? 'Submitting…' : 'Submit for ownership review'}
          </button>
          <button onClick={onBack} className="text-sm text-[#273C46] underline underline-offset-4">Back</button>
        </div>
      </div>
    </Shell>
  )
}

/* -------------------------------- shared --------------------------------- */
const inp =
  'w-full rounded-[12px] border border-black/15 bg-white px-4 py-3 text-sm text-[#0D1B2A] placeholder:text-[#273C46]/45 focus:outline-none focus:border-[#0D1B2A]/45'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mp-public min-h-screen bg-[#FAFAF7] text-[#0D1B2A]">
      <div className="max-w-3xl mx-auto px-6 py-14 md:py-20">{children}</div>
    </div>
  )
}
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46] mb-4">{children}</div>
}
function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="text-[34px] md:text-[46px] leading-[1.05] font-semibold tracking-tight">{children}</h1>
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-sm font-medium text-[#0D1B2A]">{label}</label>
        {hint ? <span className="text-xs text-[#273C46]/60">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}
function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'px-3.5 py-2 rounded-full text-sm border transition-colors ' +
        (active ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]' : 'bg-white text-[#273C46] border-black/15 hover:border-[#0D1B2A]/40')
      }
    >
      {children}
    </button>
  )
}
