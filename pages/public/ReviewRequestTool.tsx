// /tools/review — public "CMA & disclosure review" request tool.
// A buyer or seller has a document — a disclosure packet, an inspection report,
// or a CMA from another agent — and wants a second set of eyes. They describe it
// and request a review; the request lands as a lead. The actual AI analysis +
// file upload (analyze_disclosure / analyze_cma) lives behind a free account,
// which is the unlock this page sells.

import { useState } from 'react'
import {
  ToolShell, ToolGate, RequestContactFields, submitToolRequest,
} from '@/components/public/tools/ToolKit'
import { CheckCircle2, Loader2, FileSearch, ShieldCheck, ScrollText, FileBarChart } from 'lucide-react'

type DocType = 'disclosure' | 'cma' | 'inspection' | 'other'

const DOC_TYPES: { value: DocType; label: string; icon: React.ComponentType<{ className?: string }>; blurb: string }[] = [
  { value: 'disclosure', label: 'Disclosure packet', icon: ScrollText, blurb: 'TDS, SPQ, NHD, HOA docs' },
  { value: 'cma', label: 'A CMA / valuation', icon: FileBarChart, blurb: 'From another agent or site' },
  { value: 'inspection', label: 'Inspection report', icon: ShieldCheck, blurb: 'General, roof, pest, etc.' },
  { value: 'other', label: 'Something else', icon: FileSearch, blurb: 'Tell us what you have' },
]

export default function ReviewRequestTool() {
  const [docType, setDocType] = useState<DocType>('disclosure')
  const [details, setDetails] = useState('')
  const [contact, setContact] = useState({ name: '', email: '', phone: '', website: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [err, setErr] = useState('')

  const valid = contact.name.trim() && /\S+@\S+\.\S+/.test(contact.email)

  async function submit() {
    if (!valid) { setErr('Add your name and a valid email.'); setStatus('error'); return }
    setStatus('sending'); setErr('')
    const label = DOC_TYPES.find((d) => d.value === docType)?.label ?? docType
    const message = [`REVIEW REQUEST`, `Document: ${label}`, details.trim() ? `Details: ${details.trim()}` : null]
      .filter(Boolean).join('\n')
    const res = await submitToolRequest({ ...contact, message })
    if (res.ok) setStatus('sent')
    else { setErr(res.error || 'Something went wrong.'); setStatus('error') }
  }

  if (status === 'sent') {
    return (
      <ToolShell eyebrow="Buyer & seller tool" title={<>We’ve got it.</>}>
        <div className="max-w-lg rounded-[24px] border border-black/[0.08] bg-white p-8 text-center mx-auto">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="mp-serif not-italic text-2xl font-semibold text-[#0D1B2A] mt-4">Review requested</h2>
          <p className="text-[#273C46] mt-2">
            Tim will reach out to get your document and walk you through what matters. Create a free account to
            upload it securely and get an instant AI first-pass while you wait.
          </p>
          <div className="mt-6">
            <ToolGate journey="buyer" title="Upload securely & get an instant read" blurb="A free account lets you upload the packet and get an AI summary of the red flags in seconds — then Tim’s full review." cta="Create a free account" />
          </div>
        </div>
      </ToolShell>
    )
  }

  return (
    <ToolShell
      eyebrow="Buyer & seller tool"
      title={<>Get a second <span className="mp-serif font-normal">opinion.</span></>}
      intro="Staring at a 200-page disclosure packet, or a CMA you’re not sure you trust? Get it reviewed. Tell us what you have and Tim will give you a straight read on what actually matters."
    >
      <div className="max-w-2xl space-y-6">
        <div>
          <span className="text-2xs uppercase tracking-widest text-[#273C46]">What do you have?</span>
          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            {DOC_TYPES.map((d) => {
              const Icon = d.icon
              const active = docType === d.value
              return (
                <button
                  key={d.value}
                  onClick={() => setDocType(d.value)}
                  className={'flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ' +
                    (active ? 'border-[#0D1B2A] bg-[#0D1B2A]/[0.03]' : 'border-black/[0.1] bg-white hover:border-[#0D1B2A]/40')}
                >
                  <div className={'w-9 h-9 rounded-full flex items-center justify-center shrink-0 ' +
                    (active ? 'bg-[#0D1B2A] text-white' : 'bg-[#0D1B2A]/[0.06] text-[#0D1B2A]')}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#0D1B2A]">{d.label}</div>
                    <div className="text-xs text-[#273C46]">{d.blurb}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-2xs uppercase tracking-widest text-[#273C46]">Anything we should know? (optional)</span>
          <textarea
            className="mt-1.5 w-full rounded-xl border border-black/[0.12] bg-white px-3.5 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:border-[#0D1B2A]/50 min-h-[90px]"
            placeholder="e.g. In contract on this place, contingency period ends Friday — need a fast read on the disclosures."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </label>

        <div>
          <span className="text-2xs uppercase tracking-widest text-[#273C46]">How can Tim reach you?</span>
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
          {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
          Request a review
        </button>

        <div className="rounded-2xl border border-[#0D1B2A]/15 bg-[#0D1B2A]/[0.03] p-5">
          <div className="text-sm font-medium text-[#0D1B2A]">Want an instant read?</div>
          <p className="text-sm text-[#273C46] mt-1">
            With a free account you can upload a disclosure or CMA and get an AI first-pass — the key risks,
            costs, and questions — in seconds, before Tim’s personal review.
          </p>
        </div>
      </div>
    </ToolShell>
  )
}
