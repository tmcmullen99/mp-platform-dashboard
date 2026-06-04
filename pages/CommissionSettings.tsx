// P9.4 Sprint D — Per-tenant commission & closing-cost configuration.
// Form at /settings/commission. Reads + writes tenant_commission_settings for
// the current tenant. Stored as decimals in DB (0.025), displayed as percent in
// the form (2.5). Owners + admins can save; everyone else sees read-only.

import { useEffect, useState } from 'react'
import { Loader2, Save, Check, Lock, Percent } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// Form values are percentages where applicable; defaults mirror the McMullen rate
// card baked into Sprints A/B/C so existing behavior is preserved if the DB row
// is missing for any reason.
const DEFAULTS = {
  regularListingRate: 2.5,
  mmmListingRate: 3.0,
  traditionalComparisonRate: 5.0,
  escrowFeeDiscounted: 1200,
  escrowFeeStandard: 1800,
  transferTaxRate: 0.75,
  titleRecordingMisc: 2800,
  propertyTaxRate: 1.18,
  defaultMortgageRatePct: 6.875,
}

type FormState = typeof DEFAULTS

export default function CommissionSettings() {
  const { currentTenant, session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULTS)

  useEffect(() => {
    if (!currentTenant || !session) return
    let cancelled = false
    async function load() {
      const [settingsResp, membershipResp] = await Promise.all([
        supabase
          .from('tenant_commission_settings')
          .select('*')
          .eq('tenant_id', currentTenant!.id)
          .maybeSingle(),
        supabase
          .from('tenant_users')
          .select('role')
          .eq('tenant_id', currentTenant!.id)
          .eq('user_id', session!.user.id)
          .maybeSingle(),
      ])
      if (cancelled) return
      const s = settingsResp.data
      if (s) {
        setForm({
          regularListingRate: Number(s.regular_listing_rate) * 100,
          mmmListingRate: Number(s.mmm_listing_rate) * 100,
          traditionalComparisonRate: Number(s.traditional_comparison_rate) * 100,
          escrowFeeDiscounted: s.escrow_fee_discounted,
          escrowFeeStandard: s.escrow_fee_standard,
          transferTaxRate: Number(s.transfer_tax_rate) * 100,
          titleRecordingMisc: s.title_recording_misc,
          propertyTaxRate: Number(s.property_tax_rate) * 100,
          defaultMortgageRatePct: Number(s.default_mortgage_rate_pct),
        })
      }
      const role = membershipResp.data?.role
      setCanEdit(role === 'owner' || role === 'admin')
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [currentTenant, session])

  async function handleSave() {
    if (!currentTenant) return
    setSaving(true)
    setSaved(false)
    try {
      const { error } = await supabase
        .from('tenant_commission_settings')
        .upsert(
          {
            tenant_id: currentTenant.id,
            regular_listing_rate: form.regularListingRate / 100,
            mmm_listing_rate: form.mmmListingRate / 100,
            traditional_comparison_rate: form.traditionalComparisonRate / 100,
            escrow_fee_discounted: form.escrowFeeDiscounted,
            escrow_fee_standard: form.escrowFeeStandard,
            transfer_tax_rate: form.transferTaxRate / 100,
            title_recording_misc: form.titleRecordingMisc,
            property_tax_rate: form.propertyTaxRate / 100,
            default_mortgage_rate_pct: form.defaultMortgageRatePct,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id' }
        )
      if (error) throw error
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      alert('Save failed: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  function resetToDefaults() {
    setForm(DEFAULTS)
  }

  if (loading) {
    return (
      <div className="p-12 flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading commission settings…
      </div>
    )
  }

  return (
    <div className="p-12 max-w-4xl">
      <div className="border-b border-ink-200 pb-6 mb-8">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2 flex items-center gap-2">
          <Percent className="w-3 h-3" />
          Settings · Commission &amp; closing costs
        </div>
        <h1 className="font-display text-4xl text-ink-900 leading-tight">
          Tenant rate card.
        </h1>
        <p className="text-ink-600 mt-3 max-w-2xl">
          These values drive the seller-scenario net sheet and the buyer
          Make-Me-Move math rendered on every CMA in this tenant's portal.
          Changes take effect on the next page load — no rebuild required.
        </p>
        {!canEdit && (
          <div className="mt-4 inline-flex items-center gap-2 text-2xs uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
            <Lock className="w-3 h-3" />
            Read-only · only tenant owners and admins can edit
          </div>
        )}
      </div>

      {/* Seller-side rates */}
      <section className="mb-10">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
          Seller-side rates
        </div>
        <p className="text-sm text-ink-600 mb-5 max-w-2xl">
          Drives the side-by-side net proceeds comparison. Regular = standard
          listing; MMM = Make-Me-Move double-end deal on the Campbell market.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <PercentField
            label="Regular listing rate"
            value={form.regularListingRate}
            onChange={(v) => setForm({ ...form, regularListingRate: v })}
            disabled={!canEdit}
            hint="2.5% is the McMullen default"
            step={0.125}
          />
          <PercentField
            label="MMM listing rate"
            value={form.mmmListingRate}
            onChange={(v) => setForm({ ...form, mmmListingRate: v })}
            disabled={!canEdit}
            hint="3% double-end (Campbell)"
            step={0.125}
          />
          <PercentField
            label="Traditional comparison rate"
            value={form.traditionalComparisonRate}
            onChange={(v) => setForm({ ...form, traditionalComparisonRate: v })}
            disabled={!canEdit}
            hint="5% benchmark for net comparison"
            step={0.125}
          />
        </div>
      </section>

      {/* Closing costs */}
      <section className="mb-10">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
          Closing costs (flat amounts)
        </div>
        <p className="text-sm text-ink-600 mb-5 max-w-2xl">
          Flat dollar fees applied at close. Escrow differs between the McMullen
          side (discounted via volume) and the traditional side; title/recording
          is the same on both.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <MoneyField
            label="Escrow · discounted"
            value={form.escrowFeeDiscounted}
            onChange={(v) => setForm({ ...form, escrowFeeDiscounted: v })}
            disabled={!canEdit}
            hint="McMullen side"
          />
          <MoneyField
            label="Escrow · standard"
            value={form.escrowFeeStandard}
            onChange={(v) => setForm({ ...form, escrowFeeStandard: v })}
            disabled={!canEdit}
            hint="Traditional side"
          />
          <MoneyField
            label="Title, recording, misc."
            value={form.titleRecordingMisc}
            onChange={(v) => setForm({ ...form, titleRecordingMisc: v })}
            disabled={!canEdit}
            hint="Same both sides"
          />
        </div>
      </section>

      {/* Buyer-side assumptions */}
      <section className="mb-10">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
          Buyer-side assumptions
        </div>
        <p className="text-sm text-ink-600 mb-5 max-w-2xl">
          Drives the Make-Me-Move buyer calculator (monthly cost + income
          required at 28% DTI) and the transfer tax line on the seller scenario.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <PercentField
            label="Transfer tax rate"
            value={form.transferTaxRate}
            onChange={(v) => setForm({ ...form, transferTaxRate: v })}
            disabled={!canEdit}
            hint="SF 0.75% tier ($1M–$5M)"
            step={0.05}
          />
          <PercentField
            label="Property tax rate"
            value={form.propertyTaxRate}
            onChange={(v) => setForm({ ...form, propertyTaxRate: v })}
            disabled={!canEdit}
            hint="SF annual 1.18%"
            step={0.01}
          />
          <PercentField
            label="Default mortgage rate"
            value={form.defaultMortgageRatePct}
            onChange={(v) => setForm({ ...form, defaultMortgageRatePct: v })}
            disabled={!canEdit}
            hint="Initial buyer assumption · 30yr fixed"
            step={0.125}
          />
        </div>
      </section>

      {/* Actions */}
      {canEdit && (
        <div className="border-t border-ink-200 pt-6 flex items-center justify-between flex-wrap gap-4">
          <button
            onClick={resetToDefaults}
            className="text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900"
          >
            Reset to McMullen defaults
          </button>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-2xs uppercase tracking-widest text-emerald-700 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PercentField({
  label,
  value,
  onChange,
  disabled,
  hint,
  step = 0.125,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  hint?: string
  step?: number
}) {
  return (
    <div>
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          step={step}
          min={0}
          max={100}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full disabled:bg-ink-50 disabled:text-ink-500 disabled:cursor-not-allowed"
          aria-label={label}
        />
        <span className="text-sm text-ink-500 shrink-0">%</span>
      </div>
      {hint && <div className="text-2xs text-ink-500 mt-1.5">{hint}</div>}
    </div>
  )
}

function MoneyField({
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  hint?: string
}) {
  return (
    <div>
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-ink-500 shrink-0">$</span>
        <input
          type="number"
          value={value}
          step={50}
          min={0}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full disabled:bg-ink-50 disabled:text-ink-500 disabled:cursor-not-allowed"
          aria-label={label}
        />
      </div>
      {hint && <div className="text-2xs text-ink-500 mt-1.5">{hint}</div>}
    </div>
  )
}
