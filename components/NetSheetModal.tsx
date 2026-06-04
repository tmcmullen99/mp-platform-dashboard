// P9.12.2 — Net Sheet modal.
//
// Side-by-side form (left) + live preview (right) for estimating a seller's
// net proceeds at closing. Inputs are stored as jsonb on net_sheets.inputs so
// we can add line items in future sprints without DB migrations.
//
// Each save creates a new row. The chassis surfaces the most recent scenario
// in the NetSheetCard summary; older scenarios remain queryable via the
// "Recent scenarios" list at the top of the modal.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, X as XIcon, Calculator, Plus, Trash2 } from 'lucide-react'
import { supabase, Deal } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// ============================================================================
// Types + defaults
// ============================================================================

export type NetSheetInputs = {
  mortgage_payoff: number
  commission_pct: number
  transfer_tax_pct: number
  title_insurance_pct: number
  escrow_fees: number
  home_warranty: number
  repairs_credits: number
  property_tax_prorations: number
  hoa_prorations: number
  misc_closing_costs: number
}

export type NetSheet = {
  id: string
  tenant_id: string
  deal_id: string
  name: string
  sale_price: number
  inputs: NetSheetInputs
  computed_net: number
  notes: string | null
  created_by_user_id: string | null
  created_by_type: 'agent' | 'client'
  created_at: string
  updated_at: string
}

export const DEFAULT_INPUTS: NetSheetInputs = {
  mortgage_payoff: 0,
  commission_pct: 5.0,
  transfer_tax_pct: 0.11, // CA county default — varies by city
  title_insurance_pct: 0.5,
  escrow_fees: 1500,
  home_warranty: 0,
  repairs_credits: 0,
  property_tax_prorations: 0,
  hoa_prorations: 0,
  misc_closing_costs: 500,
}

// ============================================================================
// Compute
// ============================================================================

export type NetSheetBreakdown = {
  commission: number
  transferTax: number
  titleInsurance: number
  totalDeductions: number
  net: number
}

export function computeNetSheet(
  salePrice: number,
  inputs: NetSheetInputs,
): NetSheetBreakdown {
  const sp = Math.max(0, salePrice)
  const commission = sp * (inputs.commission_pct / 100)
  const transferTax = sp * (inputs.transfer_tax_pct / 100)
  const titleInsurance = sp * (inputs.title_insurance_pct / 100)
  const totalDeductions =
    inputs.mortgage_payoff +
    commission +
    transferTax +
    titleInsurance +
    inputs.escrow_fees +
    inputs.home_warranty +
    inputs.repairs_credits +
    inputs.property_tax_prorations +
    inputs.hoa_prorations +
    inputs.misc_closing_costs
  return {
    commission,
    transferTax,
    titleInsurance,
    totalDeductions,
    net: sp - totalDeductions,
  }
}

// ============================================================================
// Modal
// ============================================================================

export default function NetSheetModal({
  deal,
  mode,
  scenarios,
  onClose,
  onSaved,
}: {
  deal: Deal
  mode: 'agent' | 'client'
  scenarios: NetSheet[]
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()

  // Form state. Seed from most recent scenario if there is one.
  const seed = scenarios[0]
  const [name, setName] = useState(
    seed ? `${seed.name || 'Scenario'} (revised)` : `Scenario ${scenarios.length + 1}`,
  )
  const [salePrice, setSalePrice] = useState<number>(seed?.sale_price || 0)
  const [inputs, setInputs] = useState<NetSheetInputs>(
    seed?.inputs ? { ...DEFAULT_INPUTS, ...seed.inputs } : { ...DEFAULT_INPUTS },
  )
  const [notes, setNotes] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const breakdown = useMemo(() => computeNetSheet(salePrice, inputs), [salePrice, inputs])

  function updNum<K extends keyof NetSheetInputs>(key: K, raw: string) {
    const v = Number(raw.replace(/,/g, ''))
    setInputs((prev) => ({ ...prev, [key]: isFinite(v) ? v : 0 }))
  }

  function loadScenario(s: NetSheet) {
    setName(`${s.name || 'Scenario'} (revised)`)
    setSalePrice(s.sale_price)
    setInputs({ ...DEFAULT_INPUTS, ...s.inputs })
    setNotes('')
    setError(null)
  }

  async function handleDeleteScenario(id: string) {
    if (!confirm('Remove this scenario? This cannot be undone.')) return
    setDeletingId(id)
    const { error: delErr } = await supabase.from('net_sheets').delete().eq('id', id)
    setDeletingId(null)
    if (delErr) {
      setError(delErr.message)
      return
    }
    onSaved() // refresh the list
  }

  async function handleSave() {
    if (!user) {
      setError('Not signed in.')
      return
    }
    if (salePrice <= 0) {
      setError('Sale price must be greater than 0.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { error: insErr } = await supabase.from('net_sheets').insert({
        tenant_id: deal.tenant_id,
        deal_id: deal.id,
        name: name.trim() || `Scenario ${scenarios.length + 1}`,
        sale_price: salePrice,
        inputs,
        computed_net: breakdown.net,
        notes: notes.trim() || null,
        created_by_user_id: user.id,
        created_by_type: mode,
      })
      if (insErr) throw insErr
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-cream w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-ink-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-ink-200 flex items-start justify-between gap-4">
          <div>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1 inline-flex items-center gap-1.5">
              <Calculator className="w-3 h-3" strokeWidth={1.5} />
              Net sheet · {deal.title || 'Listing'}
            </div>
            <h2 className="font-display text-2xl text-ink-900 leading-tight">
              {mode === 'client' ? 'What you take home.' : 'Build a net sheet.'}
            </h2>
            <p className="text-sm text-ink-600 mt-2 max-w-2xl leading-relaxed">
              Adjust the inputs on the left, see the breakdown on the right. Save as many
              scenarios as you want — Make Me Move price, Coming Soon, full retail.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-ink-500 hover:text-ink-900 shrink-0 disabled:opacity-50"
            aria-label="Close"
          >
            <XIcon className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Recent scenarios */}
        {scenarios.length > 0 && (
          <div className="px-8 py-4 border-b border-ink-200 bg-ink-50/40">
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">
              Saved scenarios ({scenarios.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {scenarios.map((s) => (
                <div
                  key={s.id}
                  className="inline-flex items-center gap-2 border border-ink-200 bg-cream px-2.5 py-1 text-xs"
                >
                  <button
                    onClick={() => loadScenario(s)}
                    className="text-ink-700 hover:text-ink-900 flex items-center gap-2"
                    title="Load this scenario into the form"
                  >
                    <span className="font-medium">{s.name || 'Scenario'}</span>
                    <span className="text-ink-400">·</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(s.computed_net)} net
                    </span>
                    <span className="text-ink-400 uppercase tracking-widest text-2xs">
                      ({s.created_by_type})
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteScenario(s.id)}
                    disabled={deletingId === s.id}
                    className="text-ink-400 hover:text-red-600 disabled:opacity-50"
                    title="Remove scenario"
                  >
                    {deletingId === s.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Body: inputs + preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Inputs */}
          <div className="px-8 py-6 border-r border-ink-200">
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-4">
              Inputs
            </div>

            <Field label="Scenario name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Base case"
                className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
              />
            </Field>

            <CurrencyInput
              label="Sale price"
              value={salePrice}
              onChange={(v) => setSalePrice(v)}
            />

            <CurrencyInput
              label="Mortgage payoff"
              value={inputs.mortgage_payoff}
              onChange={(v) => setInputs((p) => ({ ...p, mortgage_payoff: v }))}
            />

            <PercentInput
              label="Agent commission"
              salePrice={salePrice}
              value={inputs.commission_pct}
              onChange={(s) => updNum('commission_pct', s)}
              hint="Total commission split between buyer + seller agent (typical 5–6%)."
            />

            <PercentInput
              label="County transfer tax"
              salePrice={salePrice}
              value={inputs.transfer_tax_pct}
              onChange={(s) => updNum('transfer_tax_pct', s)}
              hint="Varies by city. SF is ~0.75% under $1M, higher above."
            />

            <PercentInput
              label="Title insurance"
              salePrice={salePrice}
              value={inputs.title_insurance_pct}
              onChange={(s) => updNum('title_insurance_pct', s)}
            />

            <CurrencyInput
              label="Escrow fees"
              value={inputs.escrow_fees}
              onChange={(v) => setInputs((p) => ({ ...p, escrow_fees: v }))}
            />

            <CurrencyInput
              label="Home warranty"
              value={inputs.home_warranty}
              onChange={(v) => setInputs((p) => ({ ...p, home_warranty: v }))}
            />

            <CurrencyInput
              label="Repairs / credits to buyer"
              value={inputs.repairs_credits}
              onChange={(v) => setInputs((p) => ({ ...p, repairs_credits: v }))}
            />

            <CurrencyInput
              label="Property tax prorations"
              value={inputs.property_tax_prorations}
              onChange={(v) => setInputs((p) => ({ ...p, property_tax_prorations: v }))}
            />

            <CurrencyInput
              label="HOA prorations"
              value={inputs.hoa_prorations}
              onChange={(v) => setInputs((p) => ({ ...p, hoa_prorations: v }))}
            />

            <CurrencyInput
              label="Misc closing costs"
              value={inputs.misc_closing_costs}
              onChange={(v) => setInputs((p) => ({ ...p, misc_closing_costs: v }))}
            />

            <Field label="Notes (optional)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Anything to remember about this scenario."
                className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900 leading-relaxed"
              />
            </Field>
          </div>

          {/* Live preview */}
          <div className="px-8 py-6 bg-ink-50/40">
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-4">
              Estimated breakdown
            </div>

            <div className="space-y-1.5 text-sm">
              <PreviewRow label="Sale price" value={salePrice} bold />

              <div className="text-2xs uppercase tracking-widest text-ink-500 pt-3 pb-1">
                Less:
              </div>
              <PreviewRow
                label="Mortgage payoff"
                value={inputs.mortgage_payoff}
                deduct
                indent
              />
              <PreviewRow
                label={`Commission (${inputs.commission_pct}%)`}
                value={breakdown.commission}
                deduct
                indent
              />
              <PreviewRow
                label={`Transfer tax (${inputs.transfer_tax_pct}%)`}
                value={breakdown.transferTax}
                deduct
                indent
              />
              <PreviewRow
                label={`Title insurance (${inputs.title_insurance_pct}%)`}
                value={breakdown.titleInsurance}
                deduct
                indent
              />
              <PreviewRow
                label="Escrow fees"
                value={inputs.escrow_fees}
                deduct
                indent
              />
              <PreviewRow
                label="Home warranty"
                value={inputs.home_warranty}
                deduct
                indent
                muted={inputs.home_warranty === 0}
              />
              <PreviewRow
                label="Repairs / credits"
                value={inputs.repairs_credits}
                deduct
                indent
                muted={inputs.repairs_credits === 0}
              />
              <PreviewRow
                label="Property tax prorations"
                value={inputs.property_tax_prorations}
                deduct
                indent
                muted={inputs.property_tax_prorations === 0}
              />
              <PreviewRow
                label="HOA prorations"
                value={inputs.hoa_prorations}
                deduct
                indent
                muted={inputs.hoa_prorations === 0}
              />
              <PreviewRow
                label="Misc closing costs"
                value={inputs.misc_closing_costs}
                deduct
                indent
              />

              <div className="border-t border-ink-200 pt-2 mt-3">
                <PreviewRow
                  label="Total deductions"
                  value={breakdown.totalDeductions}
                  deduct
                  bold
                />
              </div>

              <div className="border-t border-ink-900 pt-4 mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xs uppercase tracking-widest text-ink-500">
                    Net proceeds
                  </span>
                  <span
                    className={`font-display text-3xl tabular-nums ${
                      breakdown.net < 0 ? 'text-red-700' : 'text-ink-900'
                    }`}
                  >
                    {formatCurrency(breakdown.net)}
                  </span>
                </div>
                {salePrice > 0 && breakdown.net >= 0 && (
                  <div className="text-2xs uppercase tracking-widest text-ink-400 text-right mt-1">
                    {((breakdown.net / salePrice) * 100).toFixed(1)}% of sale price
                  </div>
                )}
                {breakdown.net < 0 && (
                  <div className="text-2xs uppercase tracking-widest text-red-700 text-right mt-1">
                    Underwater — bring money to close
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-ink-200 flex items-center justify-between gap-3 flex-wrap">
          {error ? (
            <div className="text-sm text-red-700 flex-1 min-w-0">{error}</div>
          ) : (
            <div className="text-2xs uppercase tracking-widest text-ink-400">
              {scenarios.length === 0
                ? 'First scenario — save it to start a history.'
                : `${scenarios.length} scenarios saved.`}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-3 py-2 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || salePrice <= 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  Save scenario
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Form atoms
// ============================================================================

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-4">
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function CurrencyInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  // Keep a local string so the user can type freely; commit numeric on blur/change
  const [raw, setRaw] = useState<string>(value === 0 ? '' : value.toString())

  // Re-sync when external value changes
  useEffect(() => {
    setRaw(value === 0 ? '' : formatNumberNoCurrency(value))
  }, [value])

  return (
    <Field label={label}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm font-mono">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^0-9.,]/g, '')
            setRaw(cleaned)
            const n = Number(cleaned.replace(/,/g, ''))
            onChange(isFinite(n) ? n : 0)
          }}
          onBlur={() => setRaw(value === 0 ? '' : formatNumberNoCurrency(value))}
          placeholder="0"
          className="w-full pl-7 pr-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900 font-mono tabular-nums"
        />
      </div>
    </Field>
  )
}

function PercentInput({
  label,
  salePrice,
  value,
  onChange,
  hint,
}: {
  label: string
  salePrice: number
  value: number
  onChange: (s: string) => void
  hint?: string
}) {
  const dollars = salePrice * (value / 100)
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <div className="relative w-24 shrink-0">
          <input
            type="text"
            inputMode="decimal"
            value={value === 0 ? '' : String(value)}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^0-9.]/g, '')
              onChange(cleaned)
            }}
            placeholder="0"
            className="w-full pl-3 pr-7 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900 font-mono tabular-nums"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">
            %
          </span>
        </div>
        <span className="text-2xs uppercase tracking-widest text-ink-500 font-mono tabular-nums">
          = {formatCurrency(dollars)}
        </span>
      </div>
      {hint && (
        <p className="text-2xs uppercase tracking-widest text-ink-400 mt-1.5 leading-relaxed normal-case tracking-normal italic">
          {hint}
        </p>
      )}
    </Field>
  )
}

function PreviewRow({
  label,
  value,
  bold,
  deduct,
  indent,
  muted,
}: {
  label: string
  value: number
  bold?: boolean
  deduct?: boolean
  indent?: boolean
  muted?: boolean
}) {
  const displayValue = deduct && value > 0 ? -value : value
  return (
    <div
      className={`flex items-baseline justify-between gap-3 ${indent ? 'pl-3' : ''} ${
        muted ? 'opacity-50' : ''
      }`}
    >
      <span className={`${bold ? 'text-ink-900 font-medium' : 'text-ink-700'}`}>
        {label}
      </span>
      <span
        className={`font-mono tabular-nums ${bold ? 'text-ink-900 font-medium' : 'text-ink-700'} ${
          deduct && value > 0 ? 'text-red-700' : ''
        }`}
      >
        {formatCurrency(displayValue)}
      </span>
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

export function formatCurrency(n: number): string {
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(Math.round(n))
  return `${sign}$${abs.toLocaleString('en-US')}`
}

function formatNumberNoCurrency(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

// Expose a small badge component for the chassis to show the latest net at a glance
export function NetSheetSummary({ scenario }: { scenario: NetSheet }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span className="font-medium text-ink-900">{scenario.name || 'Scenario'}</span>
      <span className="text-ink-400">·</span>
      <span className="font-mono tabular-nums text-ink-900">
        {formatCurrency(scenario.computed_net)} net
      </span>
    </span>
  )
}
