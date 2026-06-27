// /tools/net-sheet — public seller net-sheet calculator.
// Paste your Zillow/Redfin listing to auto-fill the sale price, adjust the
// closing-cost assumptions, and see estimated net proceeds live. Free to use;
// saving / emailing / scenario-compare is gated behind a free account.
//
// Math mirrors the agent-side NetSheetModal (commission %, transfer tax %,
// title insurance %, escrow flat, mortgage payoff) with CA defaults.

import { useMemo, useState } from 'react'
import {
  ToolShell, ToolGate, PropertyPasteInput, ExtractedListing, usd, NAVY,
} from '@/components/public/tools/ToolKit'
import { Home, Info } from 'lucide-react'

type Inputs = {
  salePrice: number
  mortgagePayoff: number
  commissionPct: number
  transferTaxPct: number
  titleInsurancePct: number
  escrowFees: number
  otherCosts: number
}

const DEFAULTS: Inputs = {
  salePrice: 0,
  mortgagePayoff: 0,
  commissionPct: 5.0,
  transferTaxPct: 0.11, // CA county default — varies by city
  titleInsurancePct: 0.5,
  escrowFees: 1500,
  otherCosts: 0,
}

function compute(i: Inputs) {
  const sp = i.salePrice || 0
  const commission = sp * (i.commissionPct / 100)
  const transferTax = sp * (i.transferTaxPct / 100)
  const titleInsurance = sp * (i.titleInsurancePct / 100)
  const totalCosts =
    i.mortgagePayoff + commission + transferTax + titleInsurance + i.escrowFees + i.otherCosts
  const net = sp - totalCosts
  return { sp, commission, transferTax, titleInsurance, totalCosts, net }
}

export default function NetSheetTool() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS)
  const [subject, setSubject] = useState<ExtractedListing | null>(null)
  const r = useMemo(() => compute(inputs), [inputs])

  function onPaste(listing: ExtractedListing) {
    setSubject(listing)
    setInputs((p) => ({ ...p, salePrice: listing.price ?? p.salePrice }))
  }

  function upd<K extends keyof Inputs>(k: K, v: number) {
    setInputs((p) => ({ ...p, [k]: Number.isFinite(v) ? v : 0 }))
  }

  const addr = subject
    ? [subject.address, subject.city, subject.state].filter(Boolean).join(', ')
    : null

  return (
    <ToolShell
      eyebrow="Seller tool"
      title={<>Your net sheet, <span className="mp-serif font-normal">your numbers.</span></>}
      intro="See what you actually walk away with at closing. Paste your listing to start, or just enter a sale price — then tune the assumptions to your situation."
    >
      {/* paste to autofill */}
      <div className="rounded-[24px] border border-black/[0.08] bg-[#FAFAF7] p-6 mb-8">
        <div className="text-sm font-medium text-[#0D1B2A] mb-3">
          Start with your listing <span className="text-[#91a1ba] font-normal">(optional)</span>
        </div>
        <PropertyPasteInput onResult={onPaste} cta="Auto-fill price" />
        {addr ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white border border-black/[0.06] p-3">
            {subject?.photoUrl ? (
              <img src={subject.photoUrl} alt="" className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-[#0D1B2A]/[0.06] flex items-center justify-center">
                <Home className="w-5 h-5 text-[#0D1B2A]" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium text-[#0D1B2A] truncate">{addr}</div>
              <div className="text-xs text-[#273C46]">
                {[subject?.bedrooms && `${subject.bedrooms} bd`, subject?.bathrooms && `${subject.bathrooms} ba`,
                  subject?.sqft && `${subject.sqft.toLocaleString()} sqft`].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8">
        {/* inputs */}
        <div className="space-y-5">
          <MoneyField label="Sale price" value={inputs.salePrice} onChange={(v) => upd('salePrice', v)} big />
          <MoneyField label="Mortgage payoff" value={inputs.mortgagePayoff} onChange={(v) => upd('mortgagePayoff', v)}
            hint="Your remaining loan balance at closing." />
          <div className="grid sm:grid-cols-2 gap-5">
            <PctField label="Agent commission" value={inputs.commissionPct} onChange={(v) => upd('commissionPct', v)}
              hint="Total, typically 5–6%." />
            <PctField label="County transfer tax" value={inputs.transferTaxPct} onChange={(v) => upd('transferTaxPct', v)}
              hint="CA default 0.11%; varies by city." />
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <PctField label="Title insurance" value={inputs.titleInsurancePct} onChange={(v) => upd('titleInsurancePct', v)} />
            <MoneyField label="Escrow / settlement" value={inputs.escrowFees} onChange={(v) => upd('escrowFees', v)} />
          </div>
          <MoneyField label="Other costs" value={inputs.otherCosts} onChange={(v) => upd('otherCosts', v)}
            hint="Repairs, credits, staging, home warranty, etc." />
        </div>

        {/* live result */}
        <div className="lg:sticky lg:top-24 self-start">
          <div className="rounded-[24px] text-white p-7" style={{ background: NAVY }}>
            <div className="mp-mono text-[11px] uppercase tracking-[0.18em] text-white/60">Estimated net proceeds</div>
            <div className="mp-serif not-italic text-5xl font-semibold mt-2">{usd(r.net)}</div>
            <div className="h-px bg-white/15 my-5" />
            <Row label="Sale price" value={usd(r.sp)} bold />
            <Row label="Mortgage payoff" value={`– ${usd(inputs.mortgagePayoff)}`} />
            <Row label={`Commission (${inputs.commissionPct}%)`} value={`– ${usd(r.commission)}`} />
            <Row label={`Transfer tax (${inputs.transferTaxPct}%)`} value={`– ${usd(r.transferTax)}`} />
            <Row label={`Title insurance (${inputs.titleInsurancePct}%)`} value={`– ${usd(r.titleInsurance)}`} />
            <Row label="Escrow / settlement" value={`– ${usd(inputs.escrowFees)}`} />
            {inputs.otherCosts > 0 ? <Row label="Other costs" value={`– ${usd(inputs.otherCosts)}`} /> : null}
            <div className="h-px bg-white/15 my-4" />
            <Row label="Total costs" value={`– ${usd(r.totalCosts)}`} bold />
          </div>

          <div className="flex items-start gap-2 text-xs text-[#273C46] mt-3 px-1">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Estimate only — actual closing costs vary by city, lender, and contract terms.</span>
          </div>

          <div className="mt-5">
            <ToolGate
              journey="seller"
              title="Save this net sheet & compare scenarios"
              blurb="Create a free account to save this estimate, model different price scenarios side-by-side, and have Tim sanity-check your numbers."
              cta="Save my net sheet"
            />
          </div>
        </div>
      </div>
    </ToolShell>
  )
}

/* ------------------------------------------------------------- fields ------ */
function MoneyField({
  label, value, onChange, hint, big,
}: { label: string; value: number; onChange: (v: number) => void; hint?: string; big?: boolean }) {
  return (
    <label className="block">
      <span className="text-2xs uppercase tracking-widest text-[#273C46]">{label}</span>
      <div className="relative mt-1.5">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#91a1ba]">$</span>
        <input
          type="number"
          inputMode="numeric"
          value={value === 0 ? '' : value}
          placeholder="0"
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={
            'w-full rounded-xl border border-black/[0.12] bg-white pl-7 pr-3 text-[#0D1B2A] focus:outline-none focus:border-[#0D1B2A]/50 ' +
            (big ? 'py-3.5 text-2xl mp-serif not-italic font-semibold' : 'py-2.5 text-sm')
          }
        />
      </div>
      {hint ? <span className="text-xs text-[#91a1ba] mt-1 block">{hint}</span> : null}
    </label>
  )
}

function PctField({
  label, value, onChange, hint,
}: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="text-2xs uppercase tracking-widest text-[#273C46]">{label}</span>
      <div className="relative mt-1.5">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full rounded-xl border border-black/[0.12] bg-white pl-3.5 pr-8 py-2.5 text-sm text-[#0D1B2A] focus:outline-none focus:border-[#0D1B2A]/50"
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#91a1ba]">%</span>
      </div>
      {hint ? <span className="text-xs text-[#91a1ba] mt-1 block">{hint}</span> : null}
    </label>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={'text-sm ' + (bold ? 'text-white' : 'text-white/70')}>{label}</span>
      <span className={'text-sm tabular-nums ' + (bold ? 'text-white font-semibold' : 'text-white/85')}>{value}</span>
    </div>
  )
}
