// /tools/comps — public "request comps" tool.
// The visitor anchors on an address (paste a Zillow/Redfin link to auto-fill, or
// type one), tells us what they're weighing, and submits. The request lands as a
// lead (submit_inquiry) tagged as a comps request. Creating an account lets the
// pulled comps be delivered + saved to their dashboard.

import { useState } from 'react'
import {
  ToolShell, ToolGate, PropertyPasteInput, ExtractedListing,
  RequestContactFields, submitToolRequest,
} from '@/components/public/tools/ToolKit'
import { Home, CheckCircle2, Loader2, FileStack } from 'lucide-react'

export default function CompsRequestTool() {
  const [subject, setSubject] = useState<ExtractedListing | null>(null)
  const [address, setAddress] = useState('')
  const [context, setContext] = useState('')
  const [contact, setContact] = useState({ name: '', email: '', phone: '', website: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [err, setErr] = useState('')

  function onPaste(l: ExtractedListing) {
    setSubject(l)
    setAddress([l.address, l.city, l.state, l.zip].filter(Boolean).join(', '))
  }

  const resolvedAddress = address.trim() || (subject ? [subject.address, subject.city].filter(Boolean).join(', ') : '')
  const valid = resolvedAddress.length > 3 && contact.name.trim() && /\S+@\S+\.\S+/.test(contact.email)

  async function submit() {
    if (!valid) { setErr('Add the address, your name, and a valid email.'); setStatus('error'); return }
    setStatus('sending'); setErr('')
    const message = [
      `COMPS REQUEST`,
      `Subject: ${resolvedAddress}`,
      subject?.sqft ? `Details: ${[subject.bedrooms && `${subject.bedrooms}bd`, subject.bathrooms && `${subject.bathrooms}ba`, `${subject.sqft} sqft`].filter(Boolean).join(', ')}` : null,
      context.trim() ? `Context: ${context.trim()}` : null,
    ].filter(Boolean).join('\n')
    const res = await submitToolRequest({ ...contact, message })
    if (res.ok) setStatus('sent')
    else { setErr(res.error || 'Something went wrong.'); setStatus('error') }
  }

  if (status === 'sent') {
    return (
      <ToolShell eyebrow="Seller & investor tool" title={<>Comps on the way.</>}>
        <div className="max-w-lg rounded-[24px] border border-black/[0.08] bg-white p-8 text-center mx-auto">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="mp-serif not-italic text-2xl font-semibold text-[#0D1B2A] mt-4">Request received</h2>
          <p className="text-[#273C46] mt-2">
            Tim will hand-pick recent comparable sales for <span className="font-medium">{resolvedAddress}</span> and send them over.
            Create an account to get them delivered to your dashboard and saved.
          </p>
          <div className="mt-6">
            <ToolGate journey="seller" title="Get your comps in your account" blurb="Create a free account so your comps land in one place — and you can run a full CMA on them." cta="Create a free account" />
          </div>
        </div>
      </ToolShell>
    )
  }

  return (
    <ToolShell
      eyebrow="Seller & investor tool"
      title={<>Request <span className="mp-serif font-normal">comps.</span></>}
      intro="Want to know what a home is really worth? Tell us the address and what you're weighing — Tim will hand-pick recent comparable sales, the same set an agent would pull to price it."
    >
      <div className="max-w-2xl space-y-6">
        <div className="rounded-[24px] border border-black/[0.08] bg-[#FAFAF7] p-6">
          <div className="text-sm font-medium text-[#0D1B2A] mb-3">Which property?</div>
          <PropertyPasteInput onResult={onPaste} cta="Auto-fill address" />
          <div className="text-xs text-[#91a1ba] my-3 text-center">— or type it —</div>
          <input
            className="w-full rounded-xl border border-black/[0.12] bg-white px-3.5 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:border-[#0D1B2A]/50"
            placeholder="123 Main St, San Francisco, CA"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          {subject ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-[#273C46]">
              <Home className="w-3.5 h-3.5" />
              {[subject.bedrooms && `${subject.bedrooms} bd`, subject.bathrooms && `${subject.bathrooms} ba`,
                subject.sqft && `${subject.sqft.toLocaleString()} sqft`].filter(Boolean).join(' · ')}
            </div>
          ) : null}
        </div>

        <label className="block">
          <span className="text-2xs uppercase tracking-widest text-[#273C46]">What are you weighing? (optional)</span>
          <textarea
            className="mt-1.5 w-full rounded-xl border border-black/[0.12] bg-white px-3.5 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:border-[#0D1B2A]/50 min-h-[90px]"
            placeholder="e.g. Thinking of selling this spring and want to know where to price it. Or: considering an offer and want to check it's fair."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </label>

        <div>
          <span className="text-2xs uppercase tracking-widest text-[#273C46]">Where should we send them?</span>
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
          {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileStack className="w-4 h-4" />}
          Request my comps
        </button>
      </div>
    </ToolShell>
  )
}
