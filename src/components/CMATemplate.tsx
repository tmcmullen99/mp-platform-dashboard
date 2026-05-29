// P9.1 — CMA visual template. Renders structured CMASubject + CMAComp[] as a
// polished single-page CMA. Uses the McMullen brand tokens; safe to render both
// in the agent dashboard and inside the client portal (no nav, just content).
// P9.4 Sprint A — SellerScenario block driven by listing_type (2.5% regular vs
//                 3% MMM Campbell double-end) vs traditional 5%, with SF transfer
//                 tax + escrow + title/recording rolled into net proceeds.
// P9.4 Sprint B — SellerScenario becomes interactive: sale-price slider drives
//                 live recalc of all rows + savings callout. Slider hides on
//                 print so PDFs snapshot the modeled scenario.
// P9.4 Sprint C — MMMBuyerCalculator added: parallel interactive block models
//                 buyer cost at any asking price (20% down + P&I + HOA + tax +
//                 total monthly + buyer income needed @ 28% DTI). HOA + rate
//                 editable, both hide on print.

import { useEffect, useState } from 'react'
import type { CMASubject, CMAComp } from '@/lib/supabase'
import { MapPin, Home, Bath, Maximize2, Calendar, TrendingUp } from 'lucide-react'

type ListingType = 'regular' | 'mmm'

type Props = {
  subject: CMASubject
  comps: CMAComp[]
  listingType?: ListingType | null
  agentName?: string | null
  agentPhone?: string | null
  agentEmail?: string | null
  brokerageName?: string | null
  agentNotes?: string | null
  preparedFor?: string | null
  preparedAt?: string | null
}

// Shared slider styling — used by both SellerScenario (Sprint B) and
// MMMBuyerCalculator (Sprint C). Tailwind arbitrary selectors target the
// WebKit and Moz range thumbs; the slider + bound labels hide on print.
const SLIDER_THUMB_CLASSES = [
  'w-full h-1.5 rounded-full bg-ink-200 appearance-none cursor-pointer outline-none',
  '[&::-webkit-slider-thumb]:appearance-none',
  '[&::-webkit-slider-thumb]:w-5',
  '[&::-webkit-slider-thumb]:h-5',
  '[&::-webkit-slider-thumb]:rounded-full',
  '[&::-webkit-slider-thumb]:bg-blue-700',
  '[&::-webkit-slider-thumb]:border-2',
  '[&::-webkit-slider-thumb]:border-cream',
  '[&::-webkit-slider-thumb]:shadow-md',
  '[&::-webkit-slider-thumb]:cursor-grab',
  '[&::-webkit-slider-thumb]:active:cursor-grabbing',
  '[&::-moz-range-thumb]:w-5',
  '[&::-moz-range-thumb]:h-5',
  '[&::-moz-range-thumb]:rounded-full',
  '[&::-moz-range-thumb]:bg-blue-700',
  '[&::-moz-range-thumb]:border-2',
  '[&::-moz-range-thumb]:border-cream',
  '[&::-moz-range-thumb]:cursor-grab',
  'print:hidden',
].join(' ')

function fmtMoney(n: number | null | undefined, fallback = '—'): string {
  if (n == null || isNaN(n)) return fallback
  return '$' + Math.round(Number(n)).toLocaleString()
}

function fmtMoneyShort(n: number): string {
  // Compact bound labels ($1.23M, $987K)
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'K'
  return '$' + n.toLocaleString()
}

function fmtSqft(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toLocaleString() + ' sqft'
}

function fmtBaths(full: number | null, partial: number | null): string {
  if (full == null && partial == null) return '—'
  if (!partial) return String(full ?? 0)
  return `${full ?? 0}.${partial}`
}

function fmtPpsf(price: number | null, sqft: number | null): string {
  if (!price || !sqft) return '—'
  return '$' + Math.round(price / sqft).toLocaleString() + '/sqft'
}

export default function CMATemplate({
  subject,
  comps,
  listingType,
  agentName,
  agentPhone,
  agentEmail,
  brokerageName,
  agentNotes,
  preparedFor,
  preparedAt,
}: Props) {
  // Stats roll-up
  const soldPrices = comps.map((c) => c.soldPrice).filter((p): p is number => !!p)
  const ppsfs = comps
    .map((c) => (c.soldPrice && c.sqft ? Math.round(c.soldPrice / c.sqft) : null))
    .filter((p): p is number => !!p)
  const avgSold = soldPrices.length ? Math.round(soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length) : null
  const medianPpsf = ppsfs.length
    ? ppsfs.sort((a, b) => a - b)[Math.floor(ppsfs.length / 2)]
    : null
  const subjectPpsf = subject.listPrice && subject.sqft ? Math.round(subject.listPrice / subject.sqft) : null

  // Scenario gating — only renders when we have a list price to model
  const showScenario = subject.listPrice != null && subject.listPrice > 0
  const effectiveListingType: ListingType = listingType === 'mmm' ? 'mmm' : 'regular'

  return (
    <article className="bg-cream text-ink-900 font-body">
      {/* ============ HERO ============ */}
      <section className="border-b border-ink-200 pb-12 mb-12">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
          Comparative Market Analysis
          {preparedAt && <span className="ml-3">{new Date(preparedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>}
        </div>

        <h1 className="font-display text-5xl text-ink-900 leading-tight">
          {subject.address || 'Subject property'}
        </h1>
        {(subject.city || subject.state || subject.zip) && (
          <p className="text-ink-600 text-lg mt-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" strokeWidth={1.5} />
            {[subject.city, subject.state, subject.zip].filter(Boolean).join(', ')}
          </p>
        )}

        {preparedFor && (
          <p className="text-sm text-ink-500 mt-4">
            Prepared for <span className="text-ink-900">{preparedFor}</span>
            {agentName && <span> by {agentName}{brokerageName ? `, ${brokerageName}` : ''}</span>}
          </p>
        )}

        {/* Key stats */}
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 mt-10">
          <Stat label="List price" value={fmtMoney(subject.listPrice)} accent />
          <Stat label="Beds / Baths" value={`${subject.beds ?? '—'} / ${fmtBaths(subject.bathsFull, subject.bathsPartial)}`} />
          <Stat label="Living area" value={fmtSqft(subject.sqft)} />
          <Stat label="$ / sqft" value={subjectPpsf ? '$' + subjectPpsf.toLocaleString() : '—'} />
          <Stat label="Year built" value={subject.yearBuilt ? String(subject.yearBuilt) : '—'} />
          <Stat label="Lot size" value={fmtSqft(subject.lotSqft)} />
          <Stat label="MLS#" value={subject.mls || '—'} />
          <Stat label="DOM" value={subject.daysOnMarket != null ? String(subject.daysOnMarket) : '—'} />
        </dl>

        {subject.remarks && (
          <p className="mt-10 text-sm text-ink-700 leading-relaxed max-w-3xl whitespace-pre-wrap">
            {subject.remarks}
          </p>
        )}
      </section>

      {/* ============ MARKET CONTEXT ============ */}
      {comps.length > 0 && (avgSold || medianPpsf) && (
        <section className="border-b border-ink-200 pb-12 mb-12">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Market context</div>
          <h2 className="font-display text-3xl text-ink-900 mb-8">What the comps tell us.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {avgSold && (
              <StatCard
                Icon={TrendingUp}
                label="Average sold price"
                value={fmtMoney(avgSold)}
                hint={`Across ${comps.length} comparable${comps.length === 1 ? '' : 's'}`}
              />
            )}
            {medianPpsf && (
              <StatCard
                Icon={Maximize2}
                label="Median $/sqft sold"
                value={'$' + medianPpsf.toLocaleString()}
                hint={subjectPpsf ? `Subject at $${subjectPpsf.toLocaleString()}/sqft` : ''}
              />
            )}
            {avgSold && subject.listPrice && (
              <StatCard
                Icon={Home}
                label="Subject vs market avg"
                value={
                  subject.listPrice > avgSold
                    ? `+${Math.round(((subject.listPrice - avgSold) / avgSold) * 100)}%`
                    : `${Math.round(((subject.listPrice - avgSold) / avgSold) * 100)}%`
                }
                hint={subject.listPrice > avgSold ? 'Above average' : 'Below average'}
              />
            )}
          </div>
        </section>
      )}

      {/* ============ COMPS GRID ============ */}
      {comps.length > 0 && (
        <section className="mb-12">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Comparables</div>
          <h2 className="font-display text-3xl text-ink-900 mb-8">
            {comps.length} recently sold {comps.length === 1 ? 'home' : 'homes'}.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comps.map((c, i) => (
              <CompCard key={`${c.address}-${i}`} comp={c} index={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* ============ MMM BUYER CALCULATOR (P9.4 Sprint C) ============ */}
      {showScenario && (
        <MMMBuyerCalculator
          listPrice={subject.listPrice as number}
          defaultHoa={subject.hoaMonthly}
        />
      )}

      {/* ============ SELLER SCENARIO (P9.4 Sprints A + B) ============ */}
      {showScenario && (
        <SellerScenario
          listPrice={subject.listPrice as number}
          listingType={effectiveListingType}
        />
      )}

      {/* ============ AGENT NOTES ============ */}
      {agentNotes && (
        <section className="border-t border-ink-200 pt-10 mb-12">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Agent notes</div>
          <p className="text-sm text-ink-700 leading-relaxed max-w-3xl whitespace-pre-wrap">
            {agentNotes}
          </p>
        </section>
      )}

      {/* ============ AGENT FOOTER ============ */}
      {(agentName || agentEmail || agentPhone || brokerageName) && (
        <footer className="border-t border-ink-200 pt-8 mt-12 text-sm text-ink-600 leading-relaxed">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">Prepared by</div>
          {agentName && <div className="text-ink-900 font-medium">{agentName}</div>}
          {brokerageName && <div>{brokerageName}</div>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {agentEmail && <span>{agentEmail}</span>}
            {agentPhone && <span>{agentPhone}</span>}
          </div>
        </footer>
      )}
    </article>
  )
}

// ============================================================
// MMMBuyerCalculator — P9.4 Sprint C
// Buyer-side cost model. Drag asking price (85%–115% of listPrice) to see
// 20% down + P&I @ editable rate + editable HOA + monthly tax @ 1.18%/12 +
// total monthly + buyer household income needed at 28% DTI.
// HOA defaults from subject.hoaMonthly; rate defaults to 6.875%/30yr.
// Both adjustment inputs hide on print so PDFs snapshot the modeled values.
// ============================================================
function MMMBuyerCalculator({
  listPrice,
  defaultHoa,
}: {
  listPrice: number
  defaultHoa?: number | null
}) {
  const minPrice = Math.round((listPrice * 0.85) / 1000) * 1000
  const maxPrice = Math.round((listPrice * 1.15) / 1000) * 1000

  const [askingPrice, setAskingPrice] = useState<number>(listPrice)
  const [hoa, setHoa] = useState<number>(defaultHoa ?? 0)
  const [ratePct, setRatePct] = useState<number>(6.875)

  // Reset slider + HOA if user navigates to a different CMA
  useEffect(() => {
    setAskingPrice(listPrice)
  }, [listPrice])
  useEffect(() => {
    setHoa(defaultHoa ?? 0)
  }, [defaultHoa])

  // Math
  const down = askingPrice * 0.20
  const loan = askingPrice - down
  const monthlyRate = ratePct / 100 / 12
  const n = 360
  const pi =
    monthlyRate > 0
      ? (loan * monthlyRate * Math.pow(1 + monthlyRate, n)) /
        (Math.pow(1 + monthlyRate, n) - 1)
      : loan / n
  const tax = (askingPrice * 0.0118) / 12
  const totalMonthly = pi + (hoa || 0) + tax
  const income = (totalMonthly * 12) / 0.28

  return (
    <section className="border-b border-ink-200 pb-12 mb-12">
      <div className="text-2xs uppercase tracking-widest text-blue-700 mb-3">
        What a buyer would pay
      </div>
      <h2 className="font-display text-3xl text-ink-900 mb-3">
        Make-Me-Move math.
      </h2>
      <p className="text-sm text-ink-600 max-w-2xl mb-8 leading-relaxed">
        Drag the slider to see the all-in monthly cost a buyer would face at any asking price
        — and the household income they'd need to qualify. This is what creates the bidding
        floor. Standard assumptions: 20% down, fixed-rate 30-year mortgage, SF property tax
        at 1.18% of value, household debt-to-income at 28%.
      </p>

      {/* Slider block */}
      <div className="border border-ink-200 bg-cream px-6 py-6 mb-6">
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
              If you asked…
            </div>
            <div className="font-display text-4xl text-ink-900 leading-none">
              {fmtMoney(askingPrice)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
              Buyer income needed
            </div>
            <div className="font-display text-2xl text-blue-700 leading-none">
              {fmtMoney(income)}
            </div>
          </div>
        </div>
        <input
          type="range"
          min={minPrice}
          max={maxPrice}
          step={1000}
          value={askingPrice}
          onChange={(e) => setAskingPrice(Number(e.target.value))}
          className={SLIDER_THUMB_CLASSES}
          aria-label="Asking price"
        />
        <div className="flex justify-between text-2xs uppercase tracking-widest text-ink-500 mt-2 print:hidden">
          <span>{fmtMoneyShort(minPrice)}</span>
          <span>Recommended ask · {fmtMoneyShort(listPrice)}</span>
          <span>{fmtMoneyShort(maxPrice)}</span>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <BuyerStat label="Down (20%)" value={fmtMoney(down)} />
        <BuyerStat
          label={`P&I @ ${ratePct}%/30yr`}
          value={fmtMoney(pi)}
          suffix="/mo"
        />
        <BuyerStat label="HOA · monthly" value={fmtMoney(hoa)} suffix="/mo" />
        <BuyerStat label="Tax · monthly" value={fmtMoney(tax)} suffix="/mo" />
      </div>

      {/* Total monthly highlight */}
      <div className="mt-4 border border-ink-200 border-l-2 border-l-blue-700 bg-cream px-6 py-4 flex items-baseline justify-between flex-wrap gap-3">
        <span className="text-2xs uppercase tracking-widest text-blue-700 font-semibold">
          Total monthly · all-in
        </span>
        <span className="font-display text-3xl text-ink-900 leading-none">
          {fmtMoney(totalMonthly)}
          <span className="text-base text-ink-500 font-body ml-1">/mo</span>
        </span>
      </div>

      {/* Income callout */}
      <div className="mt-4 text-sm text-ink-700 italic leading-relaxed">
        Buyer household income needed at 28% DTI:{' '}
        <span className="font-display not-italic text-lg text-blue-700 font-semibold">
          {fmtMoney(income)}
        </span>{' '}
        annually. At {fmtMoney(askingPrice)} this is the income threshold for a qualified
        buyer — below this, the bidding floor weakens.
      </div>

      {/* Adjustments — hidden on print, so PDF snapshots reflect the modeled values */}
      <div className="mt-6 pt-4 border-t border-dashed border-ink-200 flex flex-wrap items-center gap-x-6 gap-y-3 print:hidden">
        <span className="text-2xs uppercase tracking-widest text-ink-500">Adjust to match your unit</span>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <span className="text-2xs uppercase tracking-widest text-ink-500">HOA</span>
          <input
            type="number"
            value={hoa || 0}
            step={25}
            min={0}
            onChange={(e) => setHoa(Number(e.target.value) || 0)}
            className="border border-ink-200 px-3 py-1 text-sm bg-cream w-24"
            aria-label="HOA monthly"
          />
          <span className="text-2xs text-ink-500">$/mo</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <span className="text-2xs uppercase tracking-widest text-ink-500">Rate</span>
          <input
            type="number"
            value={ratePct}
            step={0.125}
            min={0}
            max={20}
            onChange={(e) => setRatePct(Number(e.target.value) || 0)}
            className="border border-ink-200 px-3 py-1 text-sm bg-cream w-20"
            aria-label="Mortgage rate percent"
          />
          <span className="text-2xs text-ink-500">% / 30yr</span>
        </label>
      </div>
    </section>
  )
}

function BuyerStat({
  label,
  value,
  suffix,
}: {
  label: string
  value: string
  suffix?: string
}) {
  return (
    <div className="border border-ink-200 bg-cream px-4 py-3">
      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1 leading-tight">
        {label}
      </div>
      <div className="font-display text-xl text-ink-900 leading-tight">
        {value}
        {suffix && <span className="text-sm text-ink-500 font-body ml-0.5">{suffix}</span>}
      </div>
    </div>
  )
}

// ============================================================
// SellerScenario — P9.4 Sprints A + B
// Side-by-side net proceeds at the modeled sale price.
// McMullen rate: 2.5% (regular) or 3% (MMM double-end). Traditional: 5%.
// SF transfer tax assumed at the $1M–$5M tier (0.75%); escrow $1,200 discounted
// vs $1,800 average; title/recording/misc $2,800 on both sides.
// Sprint B: interactive sale-price slider (85%–115% of listPrice, $1k steps)
// drives live recalc; slider hides on print so PDFs snapshot the modeled value.
// ============================================================
function SellerScenario({
  listPrice,
  listingType,
}: {
  listPrice: number
  listingType: ListingType
}) {
  // Slider bounds — 85% to 115% of the recommended ask, rounded to nearest $1,000
  const minPrice = Math.round((listPrice * 0.85) / 1000) * 1000
  const maxPrice = Math.round((listPrice * 1.15) / 1000) * 1000

  const [salePrice, setSalePrice] = useState<number>(listPrice)

  // Reset slider if user navigates to a different CMA (listPrice changes)
  useEffect(() => {
    setSalePrice(listPrice)
  }, [listPrice])

  // Math — recomputed on every render (cheap)
  const mcRate = listingType === 'mmm' ? 0.03 : 0.025
  const tdRate = 0.05
  const transferTaxRate = 0.0075
  const titleEtc = 2800
  const mcEscrow = 1200
  const tdEscrow = 1800

  const transferTax = Math.round(salePrice * transferTaxRate)
  const mcCommission = Math.round(salePrice * mcRate)
  const tdCommission = Math.round(salePrice * tdRate)
  const mcNet = salePrice - mcCommission - mcEscrow - transferTax - titleEtc
  const tdNet = salePrice - tdCommission - tdEscrow - transferTax - titleEtc
  const savings = mcNet - tdNet

  const mcRateLabel = (mcRate * 100).toFixed(1).replace(/\.0$/, '') + '%'
  const mcStamp =
    listingType === 'mmm'
      ? `With McMullen · MMM · ${mcRateLabel} fee`
      : `With McMullen · ${mcRateLabel} fee`

  // Indicator of where current slider position sits vs the recommended ask
  const deltaVsList = salePrice - listPrice
  const deltaPct = (deltaVsList / listPrice) * 100
  const atList = Math.abs(deltaVsList) < 500

  return (
    <section className="border-b border-ink-200 pb-12 mb-12">
      <div className="text-2xs uppercase tracking-widest text-blue-700 mb-3">
        Model your own scenarios
      </div>
      <h2 className="font-display text-3xl text-ink-900 mb-3">
        Net proceeds at any sale price.
      </h2>
      <p className="text-sm text-ink-600 max-w-2xl mb-8 leading-relaxed">
        Drag the slider to model any sale price between {fmtMoneyShort(minPrice)} and {fmtMoneyShort(maxPrice)}.
        The comparison runs side-by-side: McMullen at {mcRateLabel} vs traditional at 5%, with escrow,
        SF transfer tax (0.75% tier), and standard closing costs included on both sides. Excludes
        mortgage payoff and capital gains.
      </p>

      {/* Slider block */}
      <div className="border border-ink-200 bg-cream px-6 py-6 mb-6">
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
              If you sold for…
            </div>
            <div className="font-display text-4xl text-ink-900 leading-none">
              {fmtMoney(salePrice)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
              vs recommended ask
            </div>
            <div
              className={
                'font-display text-lg ' +
                (atList
                  ? 'text-ink-500 italic'
                  : deltaVsList > 0
                  ? 'text-emerald-700'
                  : 'text-ink-700')
              }
            >
              {atList
                ? 'at list'
                : (deltaVsList > 0 ? '+' : '') +
                  fmtMoney(deltaVsList) +
                  ' · ' +
                  (deltaPct > 0 ? '+' : '') +
                  deltaPct.toFixed(1) +
                  '%'}
            </div>
          </div>
        </div>
        <input
          type="range"
          min={minPrice}
          max={maxPrice}
          step={1000}
          value={salePrice}
          onChange={(e) => setSalePrice(Number(e.target.value))}
          className={SLIDER_THUMB_CLASSES}
          aria-label="Sale price"
        />
        <div className="flex justify-between text-2xs uppercase tracking-widest text-ink-500 mt-2 print:hidden">
          <span>{fmtMoneyShort(minPrice)}</span>
          <span>Recommended ask · {fmtMoneyShort(listPrice)}</span>
          <span>{fmtMoneyShort(maxPrice)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* McMullen column */}
        <div className="border border-ink-200 border-l-2 border-l-blue-700 p-6 bg-cream">
          <div className="text-2xs uppercase tracking-widest text-blue-700 font-semibold mb-2">
            {mcStamp}
          </div>
          <div className="font-display text-lg text-ink-900 mb-5">
            Net proceeds, before mortgage
          </div>
          <dl className="text-sm space-y-2.5">
            <ScenarioRow label="Sale price" value={fmtMoney(salePrice)} />
            <ScenarioRow
              label={`Total commission (${mcRateLabel})`}
              value={'−' + fmtMoney(mcCommission)}
            />
            <ScenarioRow label="Escrow (discounted)" value={'−' + fmtMoney(mcEscrow)} />
            <ScenarioRow label="SF transfer tax" value={'−' + fmtMoney(transferTax)} />
            <ScenarioRow label="Title, recording, misc." value={'−' + fmtMoney(titleEtc)} />
          </dl>
          <div className="border-t border-ink-200 mt-4 pt-4 flex items-baseline justify-between">
            <span className="text-2xs uppercase tracking-widest text-ink-500">
              Net to seller
            </span>
            <span className="font-display text-2xl text-ink-900">{fmtMoney(mcNet)}</span>
          </div>
        </div>

        {/* Traditional column */}
        <div className="border border-ink-200 p-6 bg-cream">
          <div className="text-2xs uppercase tracking-widest text-ink-500 font-semibold mb-2">
            Traditional sale · 5% fee
          </div>
          <div className="font-display text-lg text-ink-900 mb-5">
            Net proceeds, before mortgage
          </div>
          <dl className="text-sm space-y-2.5">
            <ScenarioRow label="Sale price" value={fmtMoney(salePrice)} />
            <ScenarioRow label="Total commission (5%)" value={'−' + fmtMoney(tdCommission)} />
            <ScenarioRow label="Escrow (avg SF)" value={'−' + fmtMoney(tdEscrow)} />
            <ScenarioRow label="SF transfer tax" value={'−' + fmtMoney(transferTax)} />
            <ScenarioRow label="Title, recording, misc." value={'−' + fmtMoney(titleEtc)} />
          </dl>
          <div className="border-t border-ink-200 mt-4 pt-4 flex items-baseline justify-between">
            <span className="text-2xs uppercase tracking-widest text-ink-500">
              Net to seller
            </span>
            <span className="font-display text-2xl text-ink-900">{fmtMoney(tdNet)}</span>
          </div>
        </div>
      </div>

      {/* Savings callout */}
      <div className="mt-6 bg-blue-50 border-l-2 border-blue-700 px-6 py-5 text-center">
        <div className="font-display text-3xl text-blue-700 leading-none">
          {fmtMoney(savings)}
        </div>
        <div className="text-sm text-ink-700 italic mt-2 max-w-xl mx-auto">
          more in your pocket vs a traditional 5% sale, at the same {fmtMoney(salePrice)} closing price
        </div>
      </div>
    </section>
  )
}

function ScenarioRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-ink-600">{label}</span>
      <span className="text-ink-900 font-medium">{value}</span>
    </div>
  )
}

// ============================================================
// Atoms
// ============================================================
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-widest text-ink-500 mb-1.5">{label}</dt>
      <dd
        className={
          accent
            ? 'font-display text-2xl text-ink-900 leading-none'
            : 'text-sm text-ink-900'
        }
      >
        {value}
      </dd>
    </div>
  )
}

function StatCard({
  Icon,
  label,
  value,
  hint,
}: {
  Icon: typeof Home
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="border border-ink-200 p-5">
      <Icon className="w-4 h-4 text-ink-500 mb-3" strokeWidth={1.5} />
      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1.5">{label}</div>
      <div className="font-display text-2xl text-ink-900 leading-tight">{value}</div>
      {hint && <div className="text-xs text-ink-500 mt-2">{hint}</div>}
    </div>
  )
}

function CompCard({ comp, index }: { comp: CMAComp; index: number }) {
  return (
    <div className="border border-ink-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
            Comp #{index}
          </div>
          <div className="text-base text-ink-900 font-medium leading-snug">
            {comp.address}
          </div>
          {comp.city && <div className="text-xs text-ink-500">{comp.city}</div>}
        </div>
        {comp.percentOverList != null && comp.percentOverList !== 1 && (
          <div
            className={`text-2xs uppercase tracking-wider px-2 py-1 border ${
              comp.percentOverList > 1
                ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                : 'border-ink-200 text-ink-600 bg-ink-50'
            }`}
          >
            {comp.percentOverList > 1 ? '+' : ''}
            {Math.round((comp.percentOverList - 1) * 100)}% over list
          </div>
        )}
      </div>

      {comp.photoUrl && (
        <a href={comp.listingUrl || '#'} target="_blank" rel="noreferrer" className="block mb-4">
          <img
            src={comp.photoUrl}
            alt={comp.address}
            className="w-full h-44 object-cover border border-ink-200"
          />
        </a>
      )}

      <div className="border-t border-ink-200 pt-4">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-2xs uppercase tracking-widest text-ink-500">Sold</span>
          <span className="font-display text-xl text-ink-900">
            {fmtMoney(comp.soldPrice)}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <dt className="text-ink-500">Beds/Baths</dt>
          <dd className="text-ink-900 text-right">
            {comp.beds ?? '—'} / {fmtBaths(comp.bathsFull, comp.bathsPartial)}
          </dd>
          <dt className="text-ink-500">Living area</dt>
          <dd className="text-ink-900 text-right">{fmtSqft(comp.sqft)}</dd>
          <dt className="text-ink-500">$ / sqft</dt>
          <dd className="text-ink-900 text-right">{fmtPpsf(comp.soldPrice, comp.sqft)}</dd>
          <dt className="text-ink-500">Sold</dt>
          <dd className="text-ink-900 text-right">{comp.soldDate || '—'}</dd>
          {comp.daysOnMarket != null && (
            <>
              <dt className="text-ink-500">DOM</dt>
              <dd className="text-ink-900 text-right">{comp.daysOnMarket}</dd>
            </>
          )}
          {comp.mls && (
            <>
              <dt className="text-ink-500">MLS#</dt>
              <dd className="text-ink-900 text-right">{comp.mls}</dd>
            </>
          )}
        </dl>
      </div>
    </div>
  )
}
