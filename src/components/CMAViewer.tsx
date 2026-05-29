// P9.1 — Fetches a single CMA row by slug and renders it via CMATemplate.
// Used by both the agent dashboard (/cmas/:slug) and the client portal (/portal/cmas/:slug).
// RLS handles access control — agents see CMAs in their tenant; clients see only theirs.
// P9.4 Sprint A — Passes listing_type to CMATemplate.
// P9.4 Sprint D — Also fetches tenant_commission_settings and passes through.
// P9.4 Sprint G — Passes cma_type through (sell-side default, buy-side variant).
// P9.4 Sprint J — Drops the local CMAWithListingType widening; imports CMARow
//                 from @/lib/cma-types instead (single source of truth for the
//                 extended row shape).

import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Loader2, ChevronLeft, Printer, Trash2 } from 'lucide-react'
import { supabase, CMASubject, CMAComp } from '@/lib/supabase'
import type { CMARow } from '@/lib/cma-types'
import { useAuth } from '@/contexts/AuthContext'
import CMATemplate, { CommissionSettings } from '@/components/CMATemplate'

// Row shape returned by SELECT * from tenant_commission_settings (snake_case)
type CommissionSettingsRow = {
  tenant_id: string
  regular_listing_rate: number | string
  mmm_listing_rate: number | string
  traditional_comparison_rate: number | string
  escrow_fee_discounted: number
  escrow_fee_standard: number
  transfer_tax_rate: number | string
  title_recording_misc: number
  property_tax_rate: number | string
  default_mortgage_rate_pct: number | string
}

function rowToSettings(row: CommissionSettingsRow): CommissionSettings {
  // Postgres numeric returns as string in some drivers; coerce defensively
  return {
    regularListingRate: Number(row.regular_listing_rate),
    mmmListingRate: Number(row.mmm_listing_rate),
    traditionalComparisonRate: Number(row.traditional_comparison_rate),
    escrowFeeDiscounted: row.escrow_fee_discounted,
    escrowFeeStandard: row.escrow_fee_standard,
    transferTaxRate: Number(row.transfer_tax_rate),
    titleRecordingMisc: row.title_recording_misc,
    propertyTaxRate: Number(row.property_tax_rate),
    defaultMortgageRatePct: Number(row.default_mortgage_rate_pct),
  }
}

type Props = {
  // If true, render without dashboard chrome (used in portal)
  embedded?: boolean
}

export default function CMAViewer({ embedded = false }: Props) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { currentBranding, isAgent } = useAuth()
  const [cma, setCma] = useState<CMARow | null>(null)
  const [settings, setSettings] = useState<CommissionSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!slug) return
      const { data: cmaData, error: e } = await supabase
        .from('cmas')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()
      if (cancelled) return
      if (e) setError(e.message)
      const cmaRow = (cmaData as CMARow) || null
      setCma(cmaRow)

      // Fetch this tenant's commission settings. RLS permits SELECT for
      // agents/clients on their own tenant's row plus brokerage admins.
      if (cmaRow?.tenant_id) {
        const { data: settingsRow } = await supabase
          .from('tenant_commission_settings')
          .select('*')
          .eq('tenant_id', cmaRow.tenant_id)
          .maybeSingle()
        if (cancelled) return
        if (settingsRow) setSettings(rowToSettings(settingsRow as CommissionSettingsRow))
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="p-12 flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading CMA…
      </div>
    )
  }
  if (error || !cma) {
    return (
      <div className="p-12 max-w-3xl">
        <p className="text-ink-600 mb-4">{error || 'CMA not found.'}</p>
        <BackLink isAgent={isAgent} />
      </div>
    )
  }

  const subject = (cma.subject_data || {
    address: cma.property_address || cma.name || 'Subject property',
    city: '',
    state: '',
    zip: '',
    listPrice: cma.list_price ? Number(cma.list_price.replace(/[^\d]/g, '')) : null,
    mls: '',
    beds: null,
    bathsFull: null,
    bathsPartial: null,
    sqft: null,
    lotSqft: null,
    yearBuilt: null,
    propertyType: '',
    garage: '',
    parking: '',
    cooling: '',
    heating: '',
    hoaMonthly: null,
    listDate: '',
    daysOnMarket: null,
    remarks: '',
  }) as CMASubject
  const comps = (cma.comps_data || []) as CMAComp[]
  const listingType = cma.listing_type ?? 'regular'
  const cmaType = cma.cma_type ?? 'sell'

  async function handleDelete() {
    if (!cma) return
    if (!confirm(`Delete this CMA?\n\nThis cannot be undone.`)) return
    const { error } = await supabase.from('cmas').delete().eq('id', cma.id)
    if (error) {
      alert('Delete failed: ' + error.message)
      return
    }
    navigate(isAgent ? '/clients' : '/portal')
  }

  return (
    <div className={embedded ? '' : 'p-12 max-w-5xl'}>
      {!embedded && (
        <div className="flex items-center justify-between mb-8 print:hidden">
          <BackLink isAgent={isAgent} />
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 flex items-center gap-1.5 px-3 py-2 border border-ink-200"
            >
              <Printer className="w-3 h-3" />
              Print / PDF
            </button>
            {isAgent && (
              <button
                onClick={handleDelete}
                className="text-2xs uppercase tracking-widest text-red-600 hover:text-red-700 flex items-center gap-1.5 px-3 py-2 border border-red-200"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>
        </div>
      )}
      <CMATemplate
        subject={subject}
        comps={comps}
        listingType={listingType}
        cmaType={cmaType}
        commissionSettings={settings}
        agentName={currentBranding?.agent_name}
        agentPhone={currentBranding?.agent_phone}
        agentEmail={currentBranding?.agent_email}
        brokerageName={currentBranding?.brokerage_affiliation}
        agentNotes={cma.agent_notes}
        preparedAt={cma.published_at || cma.created_at}
      />
    </div>
  )
}

function BackLink({ isAgent }: { isAgent: boolean }) {
  return (
    <Link
      to={isAgent ? '/clients' : '/portal'}
      className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900"
    >
      <ChevronLeft className="w-3 h-3" />
      Back
    </Link>
  )
}
