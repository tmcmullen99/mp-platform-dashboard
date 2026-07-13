// P9.1 — Fetches a single CMA row by slug and renders it via CMATemplate.
// Used by both the agent dashboard (/cmas/:slug) and the client portal (/portal/cmas/:slug).
// RLS handles access control — agents see CMAs in their tenant; clients see only theirs.
// P9.4 Sprint A — Passes listing_type to CMATemplate.
// P9.4 Sprint D — Also fetches tenant_commission_settings and passes through.
// P9.4 Sprint G — Passes cma_type through (sell-side default, buy-side variant).
// P9.4 Sprint J — Drops the local CMAWithListingType widening; imports CMARow
//                 from @/lib/cma-types instead.
// P9.4 Sprint H — Renames the print button text to "Download PDF" (the browser
//                 print dialog has Save as PDF; this matches user intent).
// P9.4 Sprint I — Adds an Edit button (agent-only) linking to /cmas/:slug/edit.
// P9.5 — HTML-first CMAs. Rows whose cma_html column is populated (full
//        self-contained landing pages authored outside the structured editor)
//        now render that document in a sandboxed iframe instead of the sparse
//        CMATemplate. The iframe auto-sizes to its content (same pattern as
//        CMAShowcaseViewer); its scripts (Leaflet map, cost calculator,
//        sortable tables) run isolated from the app session. Action bar in
//        this mode: Back · Open full page (branded /view/cma/:id) · Delete.
//        Edit and window.print() are hidden — the structured editor has no
//        content for these rows and printing would capture dashboard chrome.

import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Loader2, ChevronLeft, Printer, Trash2, Pencil, ExternalLink } from 'lucide-react'
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

// P9.5 — cma_html column (returned by SELECT *, not yet in the shared type)
type CMARowWithHtml = CMARow & { cma_html?: string | null }

type Props = {
  // If true, render without dashboard chrome (used in portal)
  embedded?: boolean
}

export default function CMAViewer({ embedded = false }: Props) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { currentBranding, isAgent } = useAuth()
  const [cma, setCma] = useState<CMARowWithHtml | null>(null)
  const [settings, setSettings] = useState<CommissionSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)

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
      const cmaRow = (cmaData as CMARowWithHtml) || null
      setCma(cmaRow)

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

  // P9.5 — auto-size the html-mode iframe to its content so the dashboard
  // page scrolls as one document. Re-measures as fonts/map tiles settle.
  useEffect(() => {
    if (!cma?.cma_html) return
    const frame = frameRef.current
    if (!frame) return
    const resize = () => {
      try {
        const doc = frame.contentDocument
        if (doc) frame.style.height = doc.body.scrollHeight + 'px'
      } catch {
        /* sandboxed without allow-same-origin — fall back to CSS min-height */
      }
    }
    frame.addEventListener('load', () => {
      resize()
      setTimeout(resize, 300)
      setTimeout(resize, 1200)
      setTimeout(resize, 3000)
    })
    const onWinResize = () => resize()
    window.addEventListener('resize', onWinResize)
    return () => window.removeEventListener('resize', onWinResize)
  }, [cma?.cma_html])

  async function handleDelete() {
    if (!cma) return
    if (!confirm(`Delete this CMA?\n\nThis cannot be undone.`)) return
    const { error: delErr } = await supabase.from('cmas').delete().eq('id', cma.id)
    if (delErr) {
      alert('Delete failed: ' + delErr.message)
      return
    }
    navigate(isAgent ? '/clients' : '/portal')
  }

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

  // ---- P9.5: HTML-first CMA — render the stored document, not the template ----
  if (cma.cma_html) {
    const fullPageUrl = `/view/cma/${cma.id}`
    return (
      <div className={embedded ? '' : 'px-6 pt-6 pb-0 md:px-12 md:pt-10'}>
        <div className="flex items-center justify-between mb-4 print:hidden">
          <BackLink isAgent={isAgent} />
          <div className="flex items-center gap-3">
            <a
              href={fullPageUrl}
              target="_blank"
              rel="noopener"
              className="text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 flex items-center gap-1.5 px-3 py-2 border border-ink-200"
            >
              <ExternalLink className="w-3 h-3" />
              Open full page
            </a>
            {isAgent && !embedded && (
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
        <iframe
          ref={frameRef}
          title={cma.name || 'Comparative Market Analysis'}
          srcDoc={cma.cma_html}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          style={{
            display: 'block',
            width: '100%',
            minHeight: '85vh',
            border: '1px solid rgba(13,27,42,.08)',
            background: '#faf7f1',
          }}
        />
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
              Download PDF
            </button>
            {isAgent && (
              <Link
                to={`/cmas/${cma.slug}/edit`}
                className="text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 flex items-center gap-1.5 px-3 py-2 border border-ink-200"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </Link>
            )}
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
