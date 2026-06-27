// /tools/off-market — public off-market access teaser + waitlist.
// "Coming soon." A buyer/investor describes what they're hunting for and joins
// the waitlist; the request lands as a lead tagged off-market. Account creation
// is the natural unlock for when the off-market feed goes live.

import { useState } from 'react'
import {
  ToolShell, ToolGate, RequestContactFields, submitToolRequest, NAVY,
} from '@/components/public/tools/ToolKit'
import { CheckCircle2, Loader2, MapPinned, Lock } from 'lucide-react'

export default function OffMarketTool() {
  const [criteria, setCriteria] = useState('')
  const [contact, setContact] = useState({ name: '', email: '', phone: '', website: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [err, setErr] = useState('')

  const valid = contact.name.trim() && /\S+@\S+\.\S+/.test(contact.email)

  async function submit() {
    if (!valid) { setErr('Add your name and a valid email.'); setStatus('error'); return }
    setStatus('sending'); setErr('')
    const message = ['OFF-MARKET WAITLIST', criteria.trim() ? `Looking for: ${criteria.trim()}` : null]
      .filter(Boolean).join('\n')
    const res = await submitToolRequest({ ...contact, message })
    if (res.ok) setStatus('sent')
    else { setErr(res.error || 'Something went wrong.'); setStatus('error') }
  }

  if (status === 'sent') {
    return (
      <ToolShell eyebrow="Buyer & investor access" title={<>You’re on the list.</>}>
        <div className="max-w-lg rounded-[24px] border border-black/[0.08] bg-white p-8 text-center mx-auto">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="mp-serif not-italic text-2xl font-semibold text-[#0D1B2A] mt-4">Welcome to the inside track</h2>
          <p className="text-[#273C46] mt-2">
            When a property matches what you’re after — before it hits Zillow — you’ll be among the first to know.
            Create an account to manage your criteria and get matched automatically.
          </p>
          <div className="mt-6">
            <ToolGate journey="investor" title="Manage your off-market criteria" blurb="A free account lets you set exactly what you’re hunting for and get matched the moment something quiet comes up." cta="Create a free account" />
          </div>
        </div>
      </ToolShell>
    )
  }

  return (
    <ToolShell
      eyebrow="Buyer & investor access"
      title={<>Off-market <span className="mp-serif font-normal">access.</span></>}
      intro="The best deals often never hit the open market. Pocket listings, quiet sales, pre-market opportunities — surfaced through Tim’s network. Tell us what you’re hunting for and get on the list."
    >
      <div className="max-w-2xl">
        <div className="rounded-[24px] overflow-hidden text-white mb-8" style={{ background: NAVY }}>
          <div className="p-7">
            <div className="inline-flex items-center gap-2 mp-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
              <Lock className="w-3.5 h-3.5" /> Coming soon
            </div>
            <h2 className="mp-serif not-italic text-2xl font-semibold mt-3">See it before everyone else.</h2>
            <p className="text-white/70 mt-2 text-sm leading-relaxed">
              We’re building a private feed of off-market and pre-market properties. Get on the waitlist now and
              you’ll be first in line when it opens.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <label className="block">
            <span className="text-2xs uppercase tracking-widest text-[#273C46]">What are you looking for?</span>
            <textarea
              className="mt-1.5 w-full rounded-xl border border-black/[0.12] bg-white px-3.5 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:border-[#0D1B2A]/50 min-h-[100px]"
              placeholder="e.g. 3+ bed single-family in Willow Glen or Cambrian under $2.2M, open to fixers. Or: 1031 exchange, multifamily, Bay Area, $3–5M."
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
            />
          </label>

          <div>
            <span className="text-2xs uppercase tracking-widest text-[#273C46]">Where should we reach you?</span>
            <div className="mt-1.5">
              <RequestContactFields value={contact} onChange={setContact} />
            </div>
          </div>

          {status === 'error' ? <p className="text-sm text-red-600">{err}</p> : null}

          <button
            onClick={submit}
            disabled={status === 'sending'}
            className="inline-flex items-center gap-2 rounded-full bg-[#0D1B2A] text-white px-7 py-3.5 text-sm font-semibold disabled:opacity-50 hover:opacity-90"
          >
            {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPinned className="w-4 h-4" />}
            Join the waitlist
          </button>
        </div>
      </div>
    </ToolShell>
  )
}
