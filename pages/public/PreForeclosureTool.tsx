// /tools/pre-foreclosure — the page the pre-foreclosure letters point at.
//
// WHY A SEPARATE PAGE FROM /tools/net-sheet:
// The general net sheet asks what you walk away with. Someone who has had a
// notice recorded is asking a different question — whether selling clears what
// is owed at all — and their arithmetic has two lines the general tool does not
// carry: arrears and trustee fees, and junior liens. Bolting those onto the
// seller tool would make it worse for the many to serve the few, and the
// framing around it would be wrong for both.
//
// NO EMAIL GATE. Every other tool on this site gates saving behind an account.
// This one does not gate anything, because the audience arrives holding a
// letter about their own foreclosure. An email wall in front of "can I keep my
// house" would be the single worst thing this campaign could do, and it would
// also be the thing an owner remembers about us.

import { useMemo, useState } from 'react'
import { ToolShell, usd, NAVY } from '@/components/public/tools/ToolKit'
import { Info, MessageSquare, Phone } from 'lucide-react'

const PHONE = '(415) 691-9272'
const TEL = '+14156919272'

type Inputs = {
  salePrice: number
  loanPayoff: number
  otherLiens: number
  arrears: number
  commissionPct: number
  escrowFees: number
  cityTransferTax: number
  repairs: number
}

const DEFAULTS: Inputs = {
  salePrice: 1_200_000,
  loanPayoff: 0,
  otherLiens: 0,
  arrears: 0,
  commissionPct: 5,
  escrowFees: 4_500,
  cityTransferTax: 0,
  repairs: 0,
}

/* California's documentary transfer tax is $0.55 per $500 of value — $1.10 per
   $1,000 — statewide, so it is computed rather than asked for. City transfer
   taxes are separate and vary enormously (San Francisco's sliding rate is large
   on higher-priced sales; many cities charge nothing), so that one is a field
   the owner fills in rather than a number we guess at and print. */
const countyTransferTax = (price: number) => Math.round((price / 1000) * 1.1)

function compute(i: Inputs) {
  const price = i.salePrice || 0
  const commission = price * (i.commissionPct / 100)
  const countyTax = countyTransferTax(price)
  const sellingCosts = commission + i.escrowFees + countyTax + i.cityTransferTax + i.repairs
  const debt = i.loanPayoff + i.otherLiens
  const beforeDebt = price - sellingCosts
  const net = beforeDebt - debt - i.arrears
  return { price, commission, countyTax, sellingCosts, debt, beforeDebt, net, short: net < 0 }
}

export default function PreForeclosureTool() {
  const [i, setI] = useState<Inputs>(DEFAULTS)
  const r = useMemo(() => compute(i), [i])
  const upd = <K extends keyof Inputs>(k: K, v: number) =>
    setI((p) => ({ ...p, [k]: Number.isFinite(v) ? v : 0 }))

  return (
    <ToolShell
      eyebrow="If a notice has been recorded"
      title={<>What a sale would <span className="mp-serif font-normal">actually leave you.</span></>}
      intro="A recorded notice does not mean the property is lost. Most owners who receive one do not lose it. This works out whether selling clears what is owed — and what would be left if it does."
    >
      {/* ---------------------------------------------------------- timeline -- */}
      <section className="rounded-[24px] border border-black/[0.08] bg-[#FAFAF7] p-6 md:p-8 mb-10">
        <h2 className="text-xl font-semibold mb-1">Where you are on the clock</h2>
        <p className="text-[#273C46] text-sm mb-6 max-w-2xl">
          California runs the same sequence for everyone. Knowing which step you are on is most of
          what makes the next decision obvious.
        </p>
        <ol className="space-y-4">
          {[
            ['Notice of Default recorded', 'The first public step. A three-month period begins in which you can bring the loan current and stop the process entirely.'],
            ['Three months pass', 'You can reinstate the whole time. Most people resolve it here — they reinstate, refinance, or sell on their own terms.'],
            ['Notice of Trustee Sale', 'Only after those three months. It sets an auction date at least twenty days out, and no earlier than three months and twenty days from the first notice.'],
            ['Five business days before the sale', 'Reinstatement closes. After this only paying the loan off in full stops a sale.'],
            ['The auction', 'Title passes by Trustee\u2019s Deed. California has no redemption period afterwards. Anything the sale raises above what is owed is yours, claimed from the trustee directly.'],
          ].map(([head, body], n) => (
            <li key={head} className="flex gap-4">
              <span
                className="mp-mono shrink-0 w-7 h-7 rounded-full grid place-items-center text-[12px] text-white"
                style={{ background: NAVY }}
              >
                {n + 1}
              </span>
              <div>
                <div className="font-medium">{head}</div>
                <div className="text-sm text-[#273C46] leading-relaxed max-w-2xl">{body}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------------ options -- */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-1">Four ways this ends</h2>
        <p className="text-[#273C46] text-sm mb-5 max-w-2xl">
          I can only help with one of them. I would rather say which than pretend otherwise.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ['Reinstate', 'Pay everything past due plus fees and the process stops. Cheapest outcome if you can reach it. Your lender handles this, not me.'],
            ['Refinance or modify', 'Also your lender. A recorded default makes it harder, not impossible. Worth asking before anything else.'],
            ['Sell', 'Clears the debt and you keep what is above it. On most Bay Area property that is the larger number by far. This is the part I do.'],
            ['Let it go to auction', 'The only outcome that guarantees you keep nothing but the surplus — and auctions reliably raise less than a normal sale.'],
          ].map(([head, body]) => (
            <div key={head} className="rounded-2xl border border-black/[0.08] p-5">
              <div className="font-medium mb-1">{head}</div>
              <div className="text-sm text-[#273C46] leading-relaxed">{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- calculator -- */}
      <section>
        <h2 className="text-xl font-semibold mb-1">Run your own numbers</h2>
        <p className="text-[#273C46] text-sm mb-6 max-w-2xl">
          Everything here happens in your browser. Nothing is sent anywhere, nothing is saved, and
          there is no account to make.
        </p>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8">
          <div className="space-y-5">
            <div>
              <Money label="Sale price" value={i.salePrice} onChange={(v) => upd('salePrice', v)} big />
              <input
                type="range" min={100_000} max={5_000_000} step={25_000}
                value={Math.min(Math.max(i.salePrice, 100_000), 5_000_000)}
                onChange={(e) => upd('salePrice', Number(e.target.value))}
                aria-label="Sale price"
                className="w-full mt-3 accent-[#0D1B2A]"
              />
              <div className="flex justify-between mp-mono text-[11px] text-[#91a1ba]">
                <span>$100k</span><span>$5M</span>
              </div>
            </div>

            <Group title="What has to be paid off">
              <Money label="Loan payoff" value={i.loanPayoff} onChange={(v) => upd('loanPayoff', v)}
                hint="The balance, not the monthly payment. Your servicer will give you an exact figure." />
              <Money label="Other liens" value={i.otherLiens} onChange={(v) => upd('otherLiens', v)}
                hint="Second mortgage, HELOC, tax liens, judgments, contractor liens." />
              <Money label="Arrears, fees and trustee costs" value={i.arrears} onChange={(v) => upd('arrears', v)}
                hint="What it would take to bring the loan current. These come out of the sale too." />
            </Group>

            <Group title="Costs of selling">
              <Pct label="Total commission" value={i.commissionPct} onChange={(v) => upd('commissionPct', v)}
                hint="Covering both sides. Negotiable, and worth negotiating." />
              <Money label="Escrow, title and recording" value={i.escrowFees} onChange={(v) => upd('escrowFees', v)}
                hint="Roughly $3,000–$6,000 on a typical Bay Area sale." />
              <Money label="City transfer tax" value={i.cityTransferTax} onChange={(v) => upd('cityTransferTax', v)}
                hint="Varies enormously — San Francisco's is large on higher prices, many cities charge nothing. County tax is calculated for you." />
              <Money label="Repairs and buyer credits" value={i.repairs} onChange={(v) => upd('repairs', v)} />
            </Group>
          </div>

          <div className="lg:sticky lg:top-24 self-start">
            <div className="rounded-[24px] text-white p-7" style={{ background: NAVY }}>
              <div className="mp-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
                {r.short ? 'A sale at this price falls short by' : 'What would be left for you'}
              </div>
              <div
                className={
                  'mp-serif not-italic text-5xl font-semibold mt-2 tabular-nums ' +
                  (r.short ? 'text-[#E88B6B]' : 'text-white')
                }
              >
                {usd(Math.abs(r.net))}
              </div>
              <div className="h-px bg-white/15 my-5" />
              <Row label="Sale price" value={usd(r.price)} bold />
              <Row label={`Commission (${i.commissionPct}%)`} value={`– ${usd(r.commission)}`} />
              <Row label="Escrow, title, recording" value={`– ${usd(i.escrowFees)}`} />
              <Row label="Transfer taxes" value={`– ${usd(r.countyTax + i.cityTransferTax)}`} />
              {i.repairs > 0 ? <Row label="Repairs and credits" value={`– ${usd(i.repairs)}`} /> : null}
              <div className="h-px bg-white/15 my-4" />
              <Row label="Before debt" value={usd(r.beforeDebt)} bold />
              <Row label="Loan and liens" value={`– ${usd(r.debt)}`} />
              {i.arrears > 0 ? <Row label="Arrears and fees" value={`– ${usd(i.arrears)}`} /> : null}
            </div>

            {/* Naming a shortfall plainly matters more than a soft message: it
                changes who has to agree and how long it takes, and an owner who
                does not know that will waste weeks. */}
            {r.short ? (
              <div className="mt-3 rounded-2xl border border-[#E88B6B]/40 bg-[#E88B6B]/[0.08] p-4 text-sm leading-relaxed">
                <strong className="font-medium">This would be a short sale.</strong> A sale at this
                price would not cover what is owed, so the lender has to approve it in writing and it
                takes longer. A higher price, or reducing what is owed, is what closes the gap.
              </div>
            ) : null}

            <div className="flex items-start gap-2 text-xs text-[#273C46] mt-3 px-1">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Arithmetic on the figures you enter — not an appraisal or an opinion of value. Get
                real payoff, escrow and transfer-tax figures before relying on them. Tax on any gain
                is a question for a CPA.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- CTA -- */}
      <section className="mt-12 rounded-[24px] p-7 md:p-9 text-white" style={{ background: NAVY }}>
        <h2 className="text-2xl md:text-[28px] font-semibold leading-tight max-w-2xl">
          The one number this all turns on is the price
        </h2>
        <p className="text-white/75 mt-3 max-w-2xl leading-relaxed">
          Everything above is arithmetic. What the property would actually sell for comes from
          recorded sales of comparable homes nearby, and I will work that out for you at no charge.
          Text me two things the public record cannot tell me — roughly what condition it is in, and
          whether it is occupied — and I will send the comparable sales and a realistic price back.
          Then come back here and run it.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <a href={`sms:${TEL}`} className="inline-flex items-center gap-2 rounded-full bg-white text-[#0D1B2A] px-6 py-3 font-medium">
            <MessageSquare className="w-4 h-4" /> Text {PHONE}
          </a>
          <a href={`tel:${TEL}`} className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-medium">
            <Phone className="w-4 h-4" /> Call instead
          </a>
        </div>
        <p className="text-white/55 text-xs mt-6 max-w-3xl leading-relaxed">
          I am a licensed real estate broker, not a foreclosure consultant. I cannot stop a sale,
          negotiate with your lender, arrange a forbearance, or repair credit — those are regulated
          activities I am not licensed for, and anyone offering them to you should be treated with
          care. I can tell you what the property is worth and sell it. Nothing here is tax or legal
          advice.
        </p>
      </section>
    </ToolShell>
  )
}

/* ------------------------------------------------------------------ bits --- */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-black/[0.08] pt-5">
      <legend className="sr-only">{title}</legend>
      <div className="text-sm font-medium mb-4">{title}</div>
      <div className="space-y-4">{children}</div>
    </fieldset>
  )
}

function Money({
  label, value, onChange, hint, big,
}: { label: string; value: number; onChange: (v: number) => void; hint?: string; big?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm">{label}</span>
      <div className="relative mt-1.5">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#91a1ba]">$</span>
        <input
          type="number" inputMode="numeric" min={0}
          value={value === 0 ? '' : value}
          placeholder="0"
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={
            'w-full rounded-xl border border-black/[0.12] bg-white pl-7 pr-3 text-[#0D1B2A] tabular-nums focus:outline-none focus:border-[#0D1B2A]/50 ' +
            (big ? 'py-3.5 text-2xl font-semibold' : 'py-2.5 text-sm')
          }
        />
      </div>
      {hint ? <span className="text-xs text-[#91a1ba] mt-1 block leading-relaxed">{hint}</span> : null}
    </label>
  )
}

function Pct({
  label, value, onChange, hint,
}: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm">{label}</span>
      <div className="relative mt-1.5">
        <input
          type="number" inputMode="decimal" step="0.1" min={0}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full rounded-xl border border-black/[0.12] bg-white pl-3.5 pr-8 py-2.5 text-sm text-[#0D1B2A] tabular-nums focus:outline-none focus:border-[#0D1B2A]/50"
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#91a1ba]">%</span>
      </div>
      {hint ? <span className="text-xs text-[#91a1ba] mt-1 block leading-relaxed">{hint}</span> : null}
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
