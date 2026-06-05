// B.2 — Public unit-claim page.
//
// Route: /claim/:token   (public, no auth)
//
// An owner follows a personalized claim link (token = unit_ownership.claim_token,
// embedded in outreach by Epic C). We look up minimal details through the
// unit_claim Edge Function (service-role; no anon table access), let them
// confirm the property is theirs and tidy their contact info, and submit. A
// successful claim promotes the ownership edge to confirmed and activates them
// in the agent's CRM.

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { trackEvent } from '@/lib/beacon'

type LookupResult = {
  found: boolean
  already_claimed: boolean
  address: string
  neighborhood: string | null
  owner_first_name: string | null
  owner_last_name: string | null
  agent_name: string | null
  brokerage: string | null
}

export default function ClaimUnit() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [lookup, setLookup] = useState<LookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const runLookup = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    const { data, error: fnErr } = await supabase.functions.invoke('unit_claim', {
      body: { action: 'lookup', token },
    })
    if (fnErr || !data?.found) {
      setError('This claim link is no longer valid.')
      setLoading(false)
      return
    }
    const r = data as LookupResult
    setLookup(r)
    const nm = [r.owner_first_name, r.owner_last_name].filter(Boolean).join(' ').trim()
    if (nm) setName(nm)
    if (r.already_claimed) setDone(true)
    setLoading(false)
  }, [token])

  useEffect(() => {
    runLookup()
    if (token) trackEvent({ event_type: 'page_view', claim_token: token })
  }, [runLookup, token])

  async function submit() {
    if (!name.trim() && !email.trim()) {
      setError('Please add your name or email so we can confirm.')
      return
    }
    setError(null)
    setSubmitting(true)
    const { data, error: fnErr } = await supabase.functions.invoke('unit_claim', {
      body: {
        action: 'submit',
        token,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      },
    })
    setSubmitting(false)
    if (fnErr || !data?.ok) {
      setError((data && data.error) || 'Something went wrong. Please try again.')
      return
    }
    setDone(true)
  }

  return (
    <div className="min-h-screen bg-ink-900 text-cream flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="max-w-xl mx-auto">
          <div className="font-display text-lg leading-tight">
            {lookup?.brokerage || lookup?.agent_name || 'McMullen Properties'}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          {loading ? (
            <div className="text-center text-2xs uppercase tracking-widest text-cream/40">
              Loading…
            </div>
          ) : error && !lookup ? (
            <div className="bg-cream text-ink-900 p-8 text-center">
              <h1 className="font-display text-2xl mb-2">Link not valid</h1>
              <p className="text-ink-600 text-sm">{error}</p>
            </div>
          ) : done ? (
            <div className="bg-cream text-ink-900 p-10 text-center">
              <div className="text-2xs uppercase tracking-widest text-emerald-700 mb-3">
                Confirmed
              </div>
              <h1 className="font-display text-3xl mb-3 leading-tight">Thank you</h1>
              <p className="text-ink-600 leading-relaxed">
                We’ve recorded that you own{' '}
                <span className="text-ink-900 font-medium">{lookup?.address}</span>.
                {lookup?.agent_name
                  ? ` ${lookup.agent_name} will be in touch.`
                  : ' Your agent will be in touch.'}
              </p>
            </div>
          ) : (
            <div className="bg-cream text-ink-900 p-8 md:p-10">
              <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">
                Confirm ownership
              </div>
              <h1 className="font-display text-3xl leading-tight mb-1">
                {lookup?.address}
              </h1>
              {lookup?.neighborhood && (
                <p className="text-ink-500 text-sm mb-6">{lookup.neighborhood}</p>
              )}
              <p className="text-ink-600 leading-relaxed mb-7">
                {lookup?.agent_name ? `${lookup.agent_name} has` : 'We have'} this property
                on file as yours. Confirm below and we’ll keep you posted on what’s
                happening with values and activity nearby — no obligation.
              </p>

              <div className="space-y-4">
                <ClaimField label="Your name">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3 py-2.5 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
                  />
                </ClaimField>
                <ClaimField label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2.5 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
                  />
                </ClaimField>
                <ClaimField label="Phone (optional)">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                    className="w-full px-3 py-2.5 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
                  />
                </ClaimField>
              </div>

              {error && <div className="text-sm text-red-700 mt-4">{error}</div>}

              <button
                onClick={submit}
                disabled={submitting}
                className="w-full mt-7 px-4 py-3 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
              >
                {submitting ? 'Confirming…' : 'Yes, this is my property'}
              </button>
              <p className="text-2xs uppercase tracking-widest text-ink-400 mt-4 text-center leading-relaxed">
                Confirming only links you to this address. You can opt out anytime.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ClaimField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}
