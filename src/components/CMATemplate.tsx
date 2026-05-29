// P9.1 — CMA visual template. Renders structured CMASubject + CMAComp[] as a
// polished single-page CMA. Uses the McMullen brand tokens; safe to render both
// in the agent dashboard and inside the client portal (no nav, just content).
// P9.4 Sprint A — SellerScenario block driven by listing_type.
// P9.4 Sprint B — SellerScenario becomes interactive (sale-price slider).
// P9.4 Sprint C — MMMBuyerCalculator added (buyer cost + income @ 28% DTI).
// P9.4 Sprint D — All rate/fee constants moved to commissionSettings prop.
// P9.4 Sprint F — CompPositioningChart added: SVG scatter of sold-date x $/sqft.
// P9.4 Sprint G — cmaType prop drives buy-side rendering (hide SellerScenario,
//                 first-person buyer calculator copy).
// P9.4 Sprint H — Print stylesheet polish: @page rules + print-color-adjust so
//                 the platform's cream + royal-blue accents survive print. All
//                 print:hidden / print:break-inside-avoid utilities from Wave 1
//                 remain in place.

import { useEffect, useState } from 'react'
import type { CMASubject, CMAComp } from '@/lib/supabase'
import type { CMAListingType, CMAType } from '@/lib/cma-types'
import { MapPin, Home, Bath, Maximize2, Calendar, TrendingUp } from 'lucide-react'

// Per-tenant rate card. Stored in tenant_commission_settings; CMAViewer reads it
// and passes it down. Falls back to DEFAULT_COMMISSION_SETTINGS if absent.
export type CommissionSettings = {
  regularListingRate: number          // decimal, e.g. 0.025 = 2.5%
  mmmListingRate: number              // decimal, e.g. 0.03  = 3%
  traditionalComparisonRate: number   // decimal, e.g. 0.05  = 5%
  escrowFeeDiscounted: number         // dollars, McMullen side
  escrowFeeStandard: number           // dollars, traditional side
  transferTaxRate: number             // decimal, e.g. 0.0075 = 0.75%
  titleRecordingMisc: number          // dollars, same both sides
  propertyTaxRate: number             // decimal annual, e.g. 0.0118 = 1.18%
  defaultMortgageRatePct: number      // percent, e.g. 6.875 (NOT decimal)
}

export const DEFAULT_COMMISSION_SETTINGS: CommissionSettings = {
  regularListingRate: 0.025,
  mmmListingRate: 0.03,
  traditionalComparisonRate: 0.05,
  escrowFeeDiscounted: 1200,
  escrowFeeStandard: 1800,
  transferTaxRate: 0.0075,
  titleRecordingMisc: 2800,
  propertyTaxRate: 0.0118,
  defaultMortgageRatePct: 6.875,
}

type Props = {
  subject: CMASubject
  comps: CMAComp[]
  listingType?: CMAListingType | null
  cmaType?: CMAType | null
  commissionSettings?: CommissionSettings | null
  agentName?: string | null
  agentPhone?: string | null
  agentEmail?: string | null
  brokerageName?: string | null
  agentNotes?: string | null
  preparedFor?: string | null
  preparedAt?: string | null
}

// P9.4 Sprint H — Print stylesheet. @page sets letter page size + outer margins;
// body background is forced white so the browser's own page chrome doesn't show
// through behind the article; the article itself uses print-color-adjust: exact
// so the cream + royal-blue accents survive the print pipeline. Tailwind print:
// utilities (print:hidden, print:break-inside-avoid) on individual elements
// handle the rest.
const PRINT_CSS = `
@media print {
  @page {
    size: letter;
    margin: 0.5in 0.55in;
  }
  html, body {
    background: white !important;
  }
  article {
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }
}
`.trim()

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

function fmtRatePct(decimal: number): string {
  return (decimal * 100).toFixed(2).replace(/\.?0+$/, '') + '%'
}

function parseCompDate(c: CMAComp): Date | null {
  const raw = c.soldDateIso || c.soldDate
  if (!raw) return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  return d
}

export default function CMATemplate({
  subject,
  comps,
  listingType,
  cmaType,
  commissionSettings,
  agentName,
  agentPhone,
  agentEmail,
  brokerageName,
  agentNotes,
  preparedFor,
  preparedAt,
}: Props) {
  const settings = commissionSettings ?? DEFAULT_COMMISSION_SETTINGS

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

  const showScenario = subject.listPrice != null && subject.listPrice > 0
  const effectiveListingType: CMAListingType = listingType === 'mmm' ? 'mmm' : 'regular'
  const effectiveCmaType: CMAType = cmaType === 'buy' ? 'buy' : 'sell'
  const isBuy = effectiveCmaType === 'buy'

  return (
    <article className="bg-cream text-ink-900 font-body">
      {/* P9.4 Sprint H — print-only stylesheet (no effect on screen render) */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* ============ HERO ============ */}
      <section className="border-b border-ink-200 pb-12 mb-12 print:break-inside-avoid">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
          {isBuy ? 'Comparative Market Analysis · buyer-side' : 'Comparative Market Analysis'}
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
          <Stat
            label={isBuy ? 'Asking price' : 'List price'}
            value={fmtMoney(subject.listPrice)}
            accent
          />
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
        <section className="border-b border-ink-200 pb-12 mb-12 print:break-inside-avoid">
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
                label={isBuy ? 'Asking vs market avg' : 'Subject vs market avg'}
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

      {/* ============ COMP POSITIONING CHART (P9.4 Sprint F) ============ */}
      <CompPositioningChart subject={subject} comps={comps} />

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
          settings={settings}
          isBuy={isBuy}
        />
      )}

      {/* ============ SELLER SCENARIO (Sprints A + B + D) — sell-side only ============ */}
      {showScenario && !isBuy && (
        <SellerScenario
          listPrice={subject.listPrice as number}
          listingType={effectiveListingType}
          settings={settings}
        />
      )}

      {/* ============ AGENT NOTES ============ */}
      {agentNotes && (
        <section className="border-t border-ink-200 pt-10 mb-12 print:break-inside-avoid">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Agent notes</div>
          <p className="text-sm text-ink-700 leading-relaxed max-w-3xl whitespace-pre-wrap">
            {agentNotes}
          </p>
        </section>
      )}

      {/* ============ AGENT FOOTER ============ */}
      {(agentName || agentEmail || agentPhone || brokerageName) && (
        <footer className="border-t border-ink-200 pt-8 mt-12 text-sm text-ink-600 leading-relaxed print:break-inside-avoid">
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
// CompPositioningChart — P9.4 Sprint F
// ============================================================
function CompPositioningChart({
  subject,
  comps,
}: {
  subject: CMASubject
  comps: CMAComp[]
}) {
  const points = comps
    .map((c) => {
      const date = parseCompDate(c)
      if (!date || !c.soldPrice || !c.sqft) return null
      return {
        date,
        ppsf: Math.round(c.soldPrice / c.sqft),
        address: c.address,
        soldPrice: c.soldPrice,
        sqft: c.sqft,
        overList: c.percentOverList,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  if (points.length < 2) return null

  const subjectPpsf =
    subject.listPrice && subject.sqft
      ? Math.round(Number(subject.listPrice) / Number(subject.sqft))
      : null

  const dates = points.map((p) => p.date.getTime())
  const ppsfsForRange = points.map((p) => p.ppsf)
  if (subjectPpsf) ppsfsForRange.push(subjectPpsf)
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)
  const minPpsf = Math.min(...ppsfsForRange) * 0.95
  const maxPpsf = Math.max(...ppsfsForRange) * 1.05

  const W = 800
  const H = 380
  const M = 60
  const innerW = W - M * 2
  const innerH = H - M * 2

  const xScale = (date: number) =>
    M + ((date - minDate) / (maxDate - minDate || 1)) * innerW
  const yScale = (ppsf: number) =>
    H - M - ((ppsf - minPpsf) / (maxPpsf - minPpsf || 1)) * innerH

  const fmtAxisDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

  return (
    <section className="border-b border-ink-200 pb-12 mb-12 print:break-inside-avoid">
      <div className="text-2xs uppercase tracking-widest text-blue-700 mb-3">
        Comp positioning
      </div>
      <h2 className="font-display text-3xl text-ink-900 mb-8">
        Time and price · where these sales sit.
      </h2>
      <div className="border border-ink-200 bg-cream p-6 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-full h-auto block">
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <line
              key={`grid-${i}`}
              x1={M}
              y1={M + t * innerH}
              x2={W - M}
              y2={M + t * innerH}
              stroke="#e5e7eb"
              strokeWidth="0.5"
            />
          ))}

          {subjectPpsf && subjectPpsf >= minPpsf && subjectPpsf <= maxPpsf && (
            <>
              <line
                x1={M}
                y1={yScale(subjectPpsf)}
                x2={W - M}
                y2={yScale(subjectPpsf)}
                stroke="#1d4ed8"
                strokeWidth="1.5"
                strokeDasharray="6,3"
              />
              <text
                x={W - M - 6}
                y={yScale(subjectPpsf) - 6}
                fontSize="12"
                fill="#1d4ed8"
                textAnchor="end"
                fontFamily="serif"
                fontStyle="italic"
              >
                Subject · ${subjectPpsf.toLocaleString()}/sqft
              </text>
            </>
          )}

          {points.map((p, i) => {
            const cx = xScale(p.date.getTime())
            const cy = yScale(p.ppsf)
            const overList = p.overList != null && p.overList > 1
            return (
              <g key={`pt-${i}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={5.5}
                  fill={overList ? '#1f7a4d' : '#91a1ba'}
                  stroke="#1a1f2e"
                  strokeWidth="0.5"
                  fillOpacity="0.85"
                />
                <text
                  x={cx}
                  y={cy - 11}
                  fontSize="10"
                  fill="#41454f"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  ${p.ppsf.toLocaleString()}
                </text>
              </g>
            )
          })}

          {[0, 0.33, 0.66, 1].map((t, i) => {
            const date = new Date(minDate + t * (maxDate - minDate))
            return (
              <text
                key={`xt-${i}`}
                x={M + t * innerW}
                y={H - M + 22}
                fontSize="11"
                fill="#7a8298"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {fmtAxisDate(date)}
              </text>
            )
          })}

          {[0, 0.5, 1].map((t, i) => {
            const ppsf = minPpsf + (1 - t) * (maxPpsf - minPpsf)
            return (
              <text
                key={`yt-${i}`}
                x={M - 10}
                y={M + t * innerH + 4}
                fontSize="11"
                fill="#7a8298"
                textAnchor="end"
                fontFamily="sans-serif"
              >
                ${Math.round(ppsf).toLocaleString()}
              </text>
            )
          })}

          <text
            x={W / 2}
            y={H - 12}
            fontSize="11"
            fill="#7a8298"
            textAnchor="middle"
            fontStyle="italic"
            fontFamily="serif"
          >
            Sold date
          </text>
          <text
            x={18}
            y={H / 2}
            fontSize="11"
            fill="#7a8298"
            textAnchor="middle"
            fontStyle="italic"
            fontFamily="serif"
            transform={`rotate(-90 18 ${H / 2})`}
          >
            $/sqft sold
          </text>
        </svg>
      </div>
      <p className="text-sm text-ink-600 mt-4 max-w-2xl leading-relaxed">
        Each dot is a comp, plotted by sold date and $/sqft.
        {subjectPpsf
          ? ' The dashed royal-blue line marks the subject\'s asking $/sqft — anything above it sold richer, anything below it sold cheaper.'
          : ' Add a list price + sqft on the subject to see a reference line.'}{' '}
        Green dots sold over list; blue-gray dots sold at or under list.
      </p>
    </section>
  )
}

// ============================================================
// MMMBuyerCalculator — Sprints C + D + G
// ============================================================
function MMMBuyerCalculator({
  listPrice,
  defaultHoa,
  settings,
  isBuy,
}: {
  listPrice: number
  defaultHoa?: number | null
  settings: CommissionSettings
  isBuy: boolean
}) {
  const minPrice = Math.round((listPrice * 0.85) / 1000) * 1000
  const maxPrice = Math.round((listPrice * 1.15) / 1000) * 1000

  const [askingPrice, setAskingPrice] = useState<number>(listPrice)
  const [hoa, setHoa] = useState<number>(defaultHoa ?? 0)
  const [ratePct, setRatePct] = useState<number>(settings.defaultMortgageRatePct)

  useEffect(() => {
    setAskingPrice(listPrice)
  }, [listPrice])
  useEffect(() => {
    setHoa(defaultHoa ?? 0)
  }, [defaultHoa])
  useEffect(() => {
    setRatePct(settings.defaultMortgageRatePct)
  }, [settings.defaultMortgageRatePct])

  const down = askingPrice * 0.20
  const loan = askingPrice - down
  const monthlyRate = ratePct / 100 / 12
  const n = 360
  const pi =
    monthlyRate > 0
      ? (loan * monthlyRate * Math.pow(1 + monthlyRate, n)) /
        (Math.pow(1 + monthlyRate, n) - 1)
      : loan / n
  const tax = (askingPrice * settings.propertyTaxRate) / 12
  const totalMonthly = pi + (hoa || 0) + tax
  const income = (totalMonthly * 12) / 0.28

  const propertyTaxLabel = fmtRatePct(settings.propertyTaxRate)

  return (
    <section className="border-b border-ink-200 pb-12 mb-12 print:break-inside-avoid">
      <div className="text-2xs uppercase tracking-widest text-blue-700 mb-3">
        {isBuy ? 'Your monthly cost' : 'What a buyer would pay'}
      </div>
      <h2 className="font-display text-3xl text-ink-900 mb-3">
        {isBuy ? 'Buyer-side math.' : 'Make-Me-Move math.'}
      </h2>
      <p className="text-sm text-ink-600 max-w-2xl mb-8 leading-relaxed">
        {isBuy
          ? `Drag the slider to see your all-in monthly cost at any offer price — and the household income you'd need to qualify. Standard assumptions: 20% down, fixed-rate 30-year mortgage, property tax at ${propertyTaxLabel}, household debt-to-income at 28%.`
          : `Drag the slider to see the all-in monthly cost a buyer would face at any asking price — and the household income they'd need to qualify. This is what creates the bidding floor. Standard assumptions: 20% down, fixed-rate 30-year mortgage, property tax at ${propertyTaxLabel}, household debt-to-income at 28%.`}
      </p>

      <div className="border border-ink-200 bg-cream px-6 py-6 mb-6">
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
              {isBuy ? 'If you offered…' : 'If you asked…'}
            </div>
            <div className="font-display text-4xl text-ink-900 leading-none">
              {fmtMoney(askingPrice)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
              {isBuy ? 'Income needed' : 'Buyer income needed'}
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
          aria-label={isBuy ? 'Offer price' : 'Asking price'}
        />
        <div className="flex justify-between text-2xs uppercase tracking-widest text-ink-500 mt-2 print:hidden">
          <span>{fmtMoneyShort(minPrice)}</span>
          <span>{isBuy ? 'Listed at' : 'Recommended ask'} · {fmtMoneyShort(listPrice)}</span>
          <span>{fmtMoneyShort(maxPrice)}</span>
        </div>
      </div>

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

      <div className="mt-4 border border-ink-200 border-l-2 border-l-blue-700 bg-cream px-6 py-4 flex items-baseline justify-between flex-wrap gap-3">
        <span className="text-2xs uppercase tracking-widest text-blue-700 font-semibold">
          Total monthly · all-in
        </span>
        <span className="font-display text-3xl text-ink-900 leading-none">
          {fmtMoney(totalMonthly)}
          <span className="text-base text-ink-500 font-body ml-1">/mo</span>
        </span>
      </div>

      <div className="mt-4 text-sm text-ink-700 italic leading-relaxed">
        {isBuy ? 'Household income needed at 28% DTI: ' : 'Buyer household income needed at 28% DTI: '}
        <span className="font-display not-italic text-lg text-blue-700 font-semibold">
          {fmtMoney(income)}
        </span>{' '}
        annually.{' '}
        {isBuy
          ? `At ${fmtMoney(askingPrice)} this is the qualifying threshold.`
          : `At ${fmtMoney(askingPrice)} this is the income threshold for a qualified buyer — below this, the bidding floor weakens.`}
      </div>

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
// SellerScenario — Sprints A + B + D (sell-side only)
// ============================================================
function SellerScenario({
  listPrice,
  listingType,
  settings,
}: {
  listPrice: number
  listingType: CMAListingType
  settings: CommissionSettings
}) {
  const minPrice = Math.round((listPrice * 0.85) / 1000) * 1000
  const maxPrice = Math.round((listPrice * 1.15) / 1000) * 1000

  const [salePrice, setSalePrice] = useState<number>(listPrice)

  useEffect(() => {
    setSalePrice(listPrice)
  }, [listPrice])

  const mcRate = listingType === 'mmm' ? settings.mmmListingRate : settings.regularListingRate
  const tdRate = settings.traditionalComparisonRate
  const transferTaxRate = settings.transferTaxRate
  const titleEtc = settings.titleRecordingMisc
  const mcEscrow = settings.escrowFeeDiscounted
  const tdEscrow = settings.escrowFeeStandard

  const transferTax = Math.round(salePrice * transferTaxRate)
  const mcCommission = Math.round(salePrice * mcRate)
  const tdCommission = Math.round(salePrice * tdRate)
  const mcNet = salePrice - mcCommission - mcEscrow - transferTax - titleEtc
  const tdNet = salePrice - tdCommission - tdEscrow - transferTax - titleEtc
  const savings = mcNet - tdNet

  const mcRateLabel = fmtRatePct(mcRate)
  const tdRateLabel = fmtRatePct(tdRate)
  const transferTaxLabel = fmtRatePct(transferTaxRate)
  const mcStamp =
    listingType === 'mmm'
      ? `With McMullen · MMM · ${mcRateLabel} fee`
      : `With McMullen · ${mcRateLabel} fee`

  const deltaVsList = salePrice - listPrice
  const deltaPct = (deltaVsList / listPrice) * 100
  const atList = Math.abs(deltaVsList) < 500

  return (
    <section className="border-b border-ink-200 pb-12 mb-12 print:break-inside-avoid">
      <div className="text-2xs uppercase tracking-widest text-blue-700 mb-3">
        Model your own scenarios
      </div>
      <h2 className="font-display text-3xl text-ink-900 mb-3">
        Net proceeds at any sale price.
      </h2>
      <p className="text-sm text-ink-600 max-w-2xl mb-8 leading-relaxed">
        Drag the slider to model any sale price between {fmtMoneyShort(minPrice)} and {fmtMoneyShort(maxPrice)}.
        The comparison runs side-by-side: McMullen at {mcRateLabel} vs traditional at {tdRateLabel}, with escrow,
        transfer tax ({transferTaxLabel}), and standard closing costs included on both sides.
        Excludes mortgage payoff and capital gains.
      </p>

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
        <div className="border border-ink-200 border-l-2 border-l-blue-700 p-6 bg-cream print:break-inside-avoid">
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
            <ScenarioRow label="Transfer tax" value={'−' + fmtMoney(transferTax)} />
            <ScenarioRow label="Title, recording, misc." value={'−' + fmtMoney(titleEtc)} />
          </dl>
          <div className="border-t border-ink-200 mt-4 pt-4 flex items-baseline justify-between">
            <span className="text-2xs uppercase tracking-widest text-ink-500">
              Net to seller
            </span>
            <span className="font-display text-2xl text-ink-900">{fmtMoney(mcNet)}</span>
          </div>
        </div>

        <div className="border border-ink-200 p-6 bg-cream print:break-inside-avoid">
          <div className="text-2xs uppercase tracking-widest text-ink-500 font-semibold mb-2">
            Traditional sale · {tdRateLabel} fee
          </div>
          <div className="font-display text-lg text-ink-900 mb-5">
            Net proceeds, before mortgage
          </div>
          <dl className="text-sm space-y-2.5">
            <ScenarioRow label="Sale price" value={fmtMoney(salePrice)} />
            <ScenarioRow label={`Total commission (${tdRateLabel})`} value={'−' + fmtMoney(tdCommission)} />
            <ScenarioRow label="Escrow (avg)" value={'−' + fmtMoney(tdEscrow)} />
            <ScenarioRow label="Transfer tax" value={'−' + fmtMoney(transferTax)} />
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

      <div className="mt-6 bg-blue-50 border-l-2 border-blue-700 px-6 py-5 text-center print:break-inside-avoid">
        <div className="font-display text-3xl text-blue-700 leading-none">
          {fmtMoney(savings)}
        </div>
        <div className="text-sm text-ink-700 italic mt-2 max-w-xl mx-auto">
          more in your pocket vs a traditional {tdRateLabel} sale, at the same {fmtMoney(salePrice)} closing price
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
    <div className="border border-ink-200 p-5 print:break-inside-avoid">
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
