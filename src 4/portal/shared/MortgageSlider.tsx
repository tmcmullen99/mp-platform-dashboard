// src/portal/shared/MortgageSlider.tsx
//
// Interactive price calculator used in two modes:
//   • seller: drag the SALE PRICE to see estimated net proceeds (sale price
//     minus mortgage payoff minus est. selling costs) and set a goal price.
//   • buyer:  drag the OFFER PRICE to see the resulting monthly payment given
//     a down-payment % and rate.
//
// Self-contained, in-memory only (no storage), McMullen-styled. The seller
// "set goal" action is surfaced via onSetGoal so the parent can persist it to
// deals.metadata; the slider itself never writes.
import { useState } from 'react'
import { Target } from 'lucide-react'
import { usd, monthlyPI } from './format'
import { PrimaryButton } from './ui'

type Mode = 'seller' | 'buyer'

export default function MortgageSlider({
  mode,
  basePrice,
  mortgageBalance,
  initialGoal,
  onSetGoal,
}: {
  mode: Mode
  basePrice: number
  mortgageBalance?: number | null
  initialGoal?: number | null
  onSetGoal?: (goal: number) => void
}) {
  const min = Math.max(0, Math.round(basePrice * 0.8))
  const max = Math.round(basePrice * 1.25)
  const [price, setPrice] = useState<number>(initialGoal || basePrice)

  // Buyer assumptions
  const [downPct, setDownPct] = useState(20)
  const [ratePct, setRatePct] = useState(6.5)
  const [years] = useState(30)

  // Seller assumptions — selling costs as % of sale (commission + closing).
  const sellingCostPct = 6

  const sliderPct = max > min ? ((price - min) / (max - min)) * 100 : 0

  let resultLabel = ''
  let resultValue = ''
  let subline = ''

  if (mode === 'seller') {
    const costs = price * (sellingCostPct / 100)
    const payoff = mortgageBalance || 0
    const net = price - costs - payoff
    resultLabel = 'Estimated net proceeds'
    resultValue = usd(net)
    subline = `After ~${sellingCostPct}% selling costs${
      payoff ? ` and ${usd(payoff)} mortgage payoff` : ''
    }.`
  } else {
    const down = price * (downPct / 100)
    const loan = price - down
    const pi = monthlyPI(loan, ratePct, years)
    resultLabel = 'Estimated monthly payment'
    resultValue = `${usd(pi)}/mo`
    subline = `${downPct}% down (${usd(down)}) · ${ratePct}% · ${years}-yr · principal & interest only.`
  }

  return (
    <div className="bg-white border border-ink-200 p-6">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-2xs uppercase tracking-widest text-slate">
          {mode === 'seller' ? 'Sale price' : 'Offer price'}
        </span>
        <span className="font-display text-2xl text-ink-900 tabular-nums">{usd(price)}</span>
      </div>

      {/* Track */}
      <div className="relative py-4">
        <input
          type="range"
          min={min}
          max={max}
          step={5000}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="w-full appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-ink-200
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:bg-ink-900 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:-mt-1.5
            [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-ink-200
            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-ink-900 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full"
          style={{
            background: `linear-gradient(to right, #1a1f2e 0%, #1a1f2e ${sliderPct}%, transparent ${sliderPct}%)`,
          }}
        />
        <div className="flex justify-between text-2xs text-ink-400 tabular-nums mt-1">
          <span>{usd(min)}</span>
          <span>{usd(max)}</span>
        </div>
      </div>

      {/* Buyer-only controls */}
      {mode === 'buyer' && (
        <div className="grid grid-cols-2 gap-4 mb-5 pt-2">
          <label className="block">
            <span className="text-2xs uppercase tracking-widest text-slate">Down payment</span>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min={5}
                max={50}
                step={1}
                value={downPct}
                onChange={(e) => setDownPct(Number(e.target.value))}
                className="flex-1 accent-ink-900"
              />
              <span className="text-sm text-ink-900 tabular-nums w-10 text-right">{downPct}%</span>
            </div>
          </label>
          <label className="block">
            <span className="text-2xs uppercase tracking-widest text-slate">Rate</span>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min={3}
                max={9}
                step={0.125}
                value={ratePct}
                onChange={(e) => setRatePct(Number(e.target.value))}
                className="flex-1 accent-ink-900"
              />
              <span className="text-sm text-ink-900 tabular-nums w-14 text-right">{ratePct}%</span>
            </div>
          </label>
        </div>
      )}

      {/* Result */}
      <div className="border-t border-ink-100 pt-5">
        <div className="text-2xs uppercase tracking-widest text-slate mb-1">{resultLabel}</div>
        <div className="font-display text-3xl text-ink-900 mb-1">{resultValue}</div>
        <p className="text-xs text-ink-500 leading-relaxed">{subline}</p>
      </div>

      {/* Seller goal-set */}
      {mode === 'seller' && onSetGoal && (
        <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-ink-500">
            {initialGoal === price ? 'This is your current goal price.' : 'Lock this in as your goal.'}
          </span>
          <PrimaryButton onClick={() => onSetGoal(price)} disabled={initialGoal === price}>
            <Target className="w-3.5 h-3.5" strokeWidth={1.5} />
            Set goal price
          </PrimaryButton>
        </div>
      )}
    </div>
  )
}
