// P9.12.0 — Listing Builder chassis.
//
// Replaces the previous "single scroll of description editor" view with a
// dashboard of component cards. Each card represents one piece of the listing
// (Photos, Description, Tax Record, Floor Plan, Net Sheet, Service Package,
// Publish Status). The client sees the whole product surface at once, even
// before each card is fully wired in subsequent sprints.
//
// Functional today: Photos, Description, Tax Record upload, Floor Plan upload.
// Stubbed-but-stateful today: Net Sheet, Service Package, Publish Status.
//
// One component renders for both client (mode='client') and agent (mode='agent').
// Agent mode also surfaces the listing_edits approval queue below the cards.

import { useCallback, useEffect, useRef, useState, FormEvent } from 'react'
import {
  Loader2,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  Calculator,
  Sparkles,
  Send as SendIcon,
  Upload,
  Edit3,
  Check,
  X as XIcon,
  AlertCircle,
  CircleDashed,
  CircleDot,
  CircleCheck,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react'
import {
  supabase,
  Deal,
  ListingEdit,
  DocumentRecord,
  SERVICE_PACKAGES,
  ServicePackage,
} from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import ListingPhotos from './ListingPhotos'
import NetSheetModal, { NetSheet, formatCurrency } from './NetSheetModal'
import PublishStatusModal, {
  ListingStatus,
  StatusHistoryEntry,
  StatusHistoryTimeline,
  statusBadgeClasses,
  statusLabel,
} from './PublishStatusModal'

type ComingSoonListing = {
  id: string
  slug: string
  name: string
  subtitle: string | null
  description_html: string | null
  features_html: string | null
}

type CardState = 'not_started' | 'in_progress' | 'complete'

// ============================================================================
// MAIN
// ============================================================================

export default function ListingBuilder({
  deal,
  mode,
}: {
  deal: Deal
  mode: 'agent' | 'client'
}) {
  const [listing, setListing] = useState<ComingSoonListing | null>(null)
  const [photos, setPhotos] = useState<{ count: number; heroSet: boolean } | null>(null)
  const [taxRecords, setTaxRecords] = useState<DocumentRecord[]>([])
  const [floorPlans, setFloorPlans] = useState<DocumentRecord[]>([])
  const [netSheets, setNetSheets] = useState<NetSheet[]>([])
  const [pendingEdits, setPendingEdits] = useState<ListingEdit[]>([])
  const [loading, setLoading] = useState(true)

  // P9.12.1: service_package owned locally so the strategy modal can update
  // it without forcing a parent re-fetch. Re-syncs whenever the prop changes.
  const [servicePackage, setServicePackage] = useState<ServicePackage | null>(
    deal.service_package,
  )
  useEffect(() => {
    setServicePackage(deal.service_package)
  }, [deal.service_package])

  // P9.12.3: listing_status owned locally for the same reason. The deal type
  // doesn't yet declare this column, so we widen + default to 'draft'.
  const initialStatus =
    ((deal as Deal & { listing_status?: ListingStatus }).listing_status as ListingStatus) ||
    'draft'
  const [listingStatus, setListingStatus] = useState<ListingStatus>(initialStatus)
  useEffect(() => {
    const next =
      ((deal as Deal & { listing_status?: ListingStatus }).listing_status as ListingStatus) ||
      'draft'
    setListingStatus(next)
  }, [deal])
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([])

  const refresh = useCallback(async () => {
    setLoading(true)
    const [photoRes, listingRes, taxRes, floorRes, netRes, editsRes, historyRes] =
      await Promise.all([
      supabase
        .from('listing_photos')
        .select('id, is_hero')
        .eq('deal_id', deal.id),
      deal.coming_soon_listing_id
        ? supabase
            .from('coming_soon_listings')
            .select('*')
            .eq('id', deal.coming_soon_listing_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('documents')
        .select('*')
        .eq('deal_id', deal.id)
        .eq('category', 'tax_record')
        .order('created_at', { ascending: false }),
      supabase
        .from('documents')
        .select('*')
        .eq('deal_id', deal.id)
        .eq('category', 'floor_plan')
        .order('created_at', { ascending: false }),
      supabase
        .from('net_sheets')
        .select('*')
        .eq('deal_id', deal.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('listing_edits')
        .select('*')
        .eq('deal_id', deal.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('listing_status_history')
        .select('*')
        .eq('deal_id', deal.id)
        .order('happened_at', { ascending: false })
        .limit(20),
    ])
    const photoRows = (photoRes.data || []) as Array<{ id: string; is_hero: boolean }>
    setPhotos({
      count: photoRows.length,
      heroSet: photoRows.some((p) => p.is_hero),
    })
    setListing((listingRes.data as ComingSoonListing) || null)
    setTaxRecords((taxRes.data as DocumentRecord[]) || [])
    setFloorPlans((floorRes.data as DocumentRecord[]) || [])
    setNetSheets((netRes.data as NetSheet[]) || [])
    setPendingEdits((editsRes.data as ListingEdit[]) || [])
    setStatusHistory((historyRes.data as StatusHistoryEntry[]) || [])
    setLoading(false)
  }, [deal.id, deal.coming_soon_listing_id])

  useEffect(() => {
    refresh()
  }, [refresh])

  // ---- Compute card states ----
  const photoState: CardState = !photos
    ? 'not_started'
    : photos.count >= 3 && photos.heroSet
      ? 'complete'
      : photos.count > 0
        ? 'in_progress'
        : 'not_started'

  const descState: CardState = !listing
    ? 'not_started'
    : listing.description_html && listing.features_html
      ? 'complete'
      : listing.description_html || listing.features_html
        ? 'in_progress'
        : 'not_started'

  const taxState: CardState = taxRecords.length > 0 ? 'complete' : 'not_started'
  const floorState: CardState = floorPlans.length > 0 ? 'complete' : 'not_started'
  const netSheetState: CardState = netSheets.length > 0 ? 'complete' : 'not_started'
  const servicePkgState: CardState =
    servicePackage && servicePackage !== 'tbd' ? 'complete' : 'in_progress'
  const publishState: CardState =
    listingStatus === 'sold'
      ? 'complete'
      : listingStatus === 'soft_launch' ||
          listingStatus === 'active' ||
          listingStatus === 'pending'
        ? 'in_progress'
        : 'not_started'

  const states: CardState[] = [
    photoState,
    descState,
    taxState,
    floorState,
    netSheetState,
    servicePkgState,
    publishState,
  ]
  const completeCount = states.filter((s) => s === 'complete').length
  const inProgressCount = states.filter((s) => s === 'in_progress').length
  const totalScore = completeCount + inProgressCount * 0.5
  const progressPct = Math.round((totalScore / states.length) * 100)

  const pendingForAgent = pendingEdits.filter((e) => e.status === 'pending')

  return (
    <div className="border-t border-ink-200 pt-10 mt-10">
      {/* Header */}
      <div className="mb-8">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">
          Listing builder
        </div>
        <h2 className="font-display text-3xl text-ink-900 leading-tight mb-2">
          {mode === 'client' ? 'Build your listing.' : 'Configure this listing.'}
        </h2>
        <p className="text-ink-600 max-w-2xl leading-relaxed">
          {mode === 'client'
            ? 'Add the photos, write the story, calculate your net, choose your strategy. Your agent reviews and publishes when you’re ready.'
            : `Every component of ${deal.title || 'this listing'}. Photos and documents flow straight through; copy edits route through the approval queue below.`}
        </p>

        {/* Progress bar */}
        <div className="mt-6 max-w-md">
          <div className="flex items-center justify-between mb-2 text-2xs uppercase tracking-widest text-ink-500">
            <span>
              {completeCount} of {states.length} complete
            </span>
            <span className="font-mono">{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-ink-100 overflow-hidden">
            <div
              className="h-full bg-ink-900 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {loading && photos === null ? (
        <Loader2 className="w-5 h-5 animate-spin text-ink-500" />
      ) : (
        <>
          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PhotosCard
              deal={deal}
              mode={mode}
              count={photos?.count || 0}
              heroSet={photos?.heroSet || false}
              state={photoState}
              onChanged={refresh}
            />
            <DescriptionCard
              deal={deal}
              mode={mode}
              listing={listing}
              hasPending={pendingForAgent.length > 0}
              state={descState}
              onChanged={refresh}
            />
            <DocumentCard
              deal={deal}
              mode={mode}
              category="tax_record"
              label="Tax record"
              hint="Your most recent property tax bill or assessor record."
              docs={taxRecords}
              state={taxState}
              icon={FileSpreadsheet}
              onChanged={refresh}
            />
            <DocumentCard
              deal={deal}
              mode={mode}
              category="floor_plan"
              label="Floor plan"
              hint="Professional or hand-drawn floor plan, any format."
              docs={floorPlans}
              state={floorState}
              icon={FileText}
              onChanged={refresh}
            />
            <NetSheetCard
              deal={deal}
              mode={mode}
              scenarios={netSheets}
              state={netSheetState}
              onChanged={refresh}
            />
            <ServicePackageCard
              deal={deal}
              mode={mode}
              currentPackage={servicePackage}
              state={servicePkgState}
              onChange={setServicePackage}
            />
            <PublishStatusCard
              deal={deal}
              mode={mode}
              currentStatus={listingStatus}
              history={statusHistory}
              state={publishState}
              onChange={setListingStatus}
              onChanged={refresh}
            />
          </div>

          {/* Agent-only: approval queue (only if there's something to act on) */}
          {mode === 'agent' && (pendingEdits.length > 0 || pendingForAgent.length > 0) && (
            <ApprovalsSection
              deal={deal}
              edits={pendingEdits}
              onReviewed={refresh}
            />
          )}
        </>
      )}
    </div>
  )
}

// ============================================================================
// CARDS
// ============================================================================

function PhotosCard({
  deal,
  mode,
  count,
  heroSet,
  state,
  onChanged,
}: {
  deal: Deal
  mode: 'agent' | 'client'
  count: number
  heroSet: boolean
  state: CardState
  onChanged: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const summary =
    count === 0
      ? 'No photos yet — drag in the gallery to begin.'
      : `${count} photo${count === 1 ? '' : 's'}${heroSet ? ' · hero set' : ' · no hero'}`

  return (
    <Card state={state} icon={ImageIcon} title="Photos" summary={summary} spanFull>
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-700 hover:text-ink-900"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3 h-3" />
            Collapse
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            {count === 0 ? 'Add photos' : 'Manage photos'}
          </>
        )}
      </button>

      {expanded && (
        <div className="mt-6">
          <ListingPhotos deal={deal} mode={mode} />
        </div>
      )}
    </Card>
  )
}

function DescriptionCard({
  deal,
  mode,
  listing,
  hasPending,
  state,
  onChanged,
}: {
  deal: Deal
  mode: 'agent' | 'client'
  listing: ComingSoonListing | null
  hasPending: boolean
  state: CardState
  onChanged: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const summary = !listing
    ? "Your agent hasn’t set up the listing record yet."
    : listing.description_html
      ? `${wordCount(stripHtml(listing.description_html))} words written${
          listing.features_html ? ' · features set' : ''
        }`
      : 'Not yet written.'

  return (
    <Card state={state} icon={FileText} title="Description" summary={summary} spanFull>
      {!listing ? (
        <span className="text-2xs uppercase tracking-widest text-ink-400">
          Awaiting agent setup
        </span>
      ) : (
        <button
          onClick={() => setExpanded(!expanded)}
          disabled={hasPending && mode === 'client'}
          className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-700 hover:text-ink-900 disabled:opacity-50"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Collapse
            </>
          ) : (
            <>
              <Edit3 className="w-3 h-3" />
              {state === 'complete' ? 'Update description' : 'Write description'}
            </>
          )}
        </button>
      )}

      {expanded && listing && (
        <div className="mt-6">
          <DescriptionEditor
            deal={deal}
            mode={mode}
            listing={listing}
            onSubmitted={() => {
              setExpanded(false)
              onChanged()
            }}
          />
        </div>
      )}
    </Card>
  )
}

function DocumentCard({
  deal,
  mode,
  category,
  label,
  hint,
  docs,
  state,
  icon,
  onChanged,
}: {
  deal: Deal
  mode: 'agent' | 'client'
  category: 'tax_record' | 'floor_plan'
  label: string
  hint: string
  docs: DocumentRecord[]
  state: CardState
  icon: typeof FileText
  onChanged: () => void
}) {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    if (!user || !deal.client_id) {
      setError('Not signed in.')
      return
    }
    setError(null)
    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80)
        const path = `${deal.client_id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}-${safeName}`
        const { error: upErr } = await supabase.storage
          .from('client-documents')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          })
        if (upErr) throw new Error(`Upload failed (${file.name}): ${upErr.message}`)

        const { error: insErr } = await supabase.from('documents').insert({
          tenant_id: deal.tenant_id,
          client_id: deal.client_id,
          deal_id: deal.id,
          name: file.name,
          storage_path: path,
          type: file.type,
          file_size: file.size,
          category,
          uploaded_by_type: mode,
          uploaded_by_id: user.id,
        })
        if (insErr) {
          await supabase.storage.from('client-documents').remove([path]).catch(() => {})
          throw new Error(`Save failed (${file.name}): ${insErr.message}`)
        }
      }
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(doc: DocumentRecord) {
    if (!confirm(`Remove ${doc.name}? This cannot be undone.`)) return
    const { error: delErr } = await supabase.from('documents').delete().eq('id', doc.id)
    if (delErr) {
      setError(delErr.message)
      return
    }
    await supabase.storage
      .from('client-documents')
      .remove([doc.storage_path])
      .catch(() => {})
    onChanged()
  }

  async function handleOpen(doc: DocumentRecord) {
    const { data, error: signErr } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(doc.storage_path, 300)
    if (signErr || !data?.signedUrl) {
      setError(signErr?.message || 'Could not generate download link.')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const Icon = icon
  const summary =
    docs.length === 0
      ? hint
      : `${docs.length} file${docs.length === 1 ? '' : 's'} uploaded`

  return (
    <Card state={state} icon={Icon} title={label} summary={summary}>
      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-1 mb-2">
          {error}
        </div>
      )}

      {docs.length > 0 && (
        <ul className="mb-3 space-y-1">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-2 text-xs text-ink-700 border border-ink-100 px-2 py-1.5"
            >
              <button
                onClick={() => handleOpen(d)}
                className="flex-1 text-left truncate hover:text-ink-900 inline-flex items-center gap-1.5"
                title={d.name}
              >
                <Download className="w-3 h-3 text-ink-400 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{d.name}</span>
              </button>
              <button
                onClick={() => handleDelete(d)}
                className="text-ink-400 hover:text-red-600 shrink-0"
                title="Remove"
              >
                <XIcon className="w-3 h-3" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        onChange={(e) => handleUpload(e.target.files)}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-700 hover:text-ink-900 disabled:opacity-50"
      >
        {uploading ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Upload className="w-3 h-3" strokeWidth={2} />
            {docs.length === 0 ? `Upload ${label.toLowerCase()}` : 'Add another'}
          </>
        )}
      </button>
    </Card>
  )
}

function NetSheetCard({
  deal,
  mode,
  scenarios,
  state,
  onChanged,
}: {
  deal: Deal
  mode: 'agent' | 'client'
  scenarios: NetSheet[]
  state: CardState
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const latest = scenarios[0]
  const isSellDeal = deal.deal_type === 'sell'

  const summary = !isSellDeal
    ? 'Net sheets are for sell-side engagements.'
    : !latest
      ? 'Estimate what you take home after every closing cost.'
      : `Latest: ${latest.name || 'Scenario'} · ${formatCurrency(latest.computed_net)} net${
          scenarios.length > 1 ? ` (${scenarios.length} scenarios)` : ''
        }`

  return (
    <>
      <Card state={state} icon={Calculator} title="Net sheet" summary={summary}>
        {isSellDeal ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-700 hover:text-ink-900"
          >
            <Calculator className="w-3 h-3" />
            {!latest ? 'Build net sheet' : 'New scenario or edit'}
          </button>
        ) : (
          <span className="text-2xs uppercase tracking-widest text-ink-400">
            Not applicable for buy-side deals
          </span>
        )}
      </Card>

      {open && isSellDeal && (
        <NetSheetModal
          deal={deal}
          mode={mode}
          scenarios={scenarios}
          onClose={() => setOpen(false)}
          onSaved={onChanged}
        />
      )}
    </>
  )
}

function ServicePackageCard({
  deal,
  mode,
  currentPackage,
  state,
  onChange,
}: {
  deal: Deal
  mode: 'agent' | 'client'
  currentPackage: ServicePackage | null
  state: CardState
  onChange: (next: ServicePackage) => void
}) {
  const [open, setOpen] = useState(false)
  const pkg = SERVICE_PACKAGES.find((p) => p.value === currentPackage)
  const isSellDeal = deal.deal_type === 'sell'
  const summary = !pkg || pkg.value === 'tbd'
    ? 'Three tiers of distribution. Start where you’re comfortable, upgrade anytime.'
    : `${pkg.label} — ${truncate(pkg.blurb, 110)}`

  return (
    <>
      <Card state={state} icon={Sparkles} title="Service strategy" summary={summary}>
        {isSellDeal ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-700 hover:text-ink-900"
          >
            <Sparkles className="w-3 h-3" />
            {!pkg || pkg.value === 'tbd' ? 'Choose your strategy' : 'Compare & change'}
          </button>
        ) : (
          <span className="text-2xs uppercase tracking-widest text-ink-400">
            {pkg?.label || 'Buyer engagement'}
          </span>
        )}
      </Card>

      {open && isSellDeal && (
        <StrategyModal
          deal={deal}
          mode={mode}
          currentPackage={currentPackage}
          onClose={() => setOpen(false)}
          onSelect={async (next) => {
            const prev = currentPackage
            onChange(next) // optimistic
            const { error } = await supabase
              .from('deals')
              .update({ service_package: next })
              .eq('id', deal.id)
            if (error) {
              onChange(prev as ServicePackage) // revert
              alert('Could not save strategy: ' + error.message)
              return
            }
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

// ============================================================================
// Strategy comparable feature table — the value ladder
// ============================================================================

type SellTier = Extract<ServicePackage, 'make_me_move' | 'coming_soon' | 'active_listing'>

const SELL_TIERS: Array<{
  value: SellTier
  label: string
  tagline: string
}> = [
  {
    value: 'make_me_move',
    label: 'Make Me Move',
    tagline: 'Test the market quietly, no commitment.',
  },
  {
    value: 'coming_soon',
    label: 'Coming Soon',
    tagline: 'Build demand before the MLS clock starts.',
  },
  {
    value: 'active_listing',
    label: 'Active Listing',
    tagline: 'Maximum reach across every channel.',
  },
]

const STRATEGY_FEATURES: Array<{
  label: string
  tiers: Record<SellTier, boolean>
}> = [
  // Foundation — every tier
  {
    label: 'Hero photo + dedicated property landing page',
    tiers: { make_me_move: true, coming_soon: true, active_listing: true },
  },
  {
    label: 'Email drip to warm buyer pool',
    tiers: { make_me_move: true, coming_soon: true, active_listing: true },
  },
  {
    label: 'Soft launch — no MLS days-on-market clock',
    tiers: { make_me_move: true, coming_soon: true, active_listing: false },
  },
  // Coming Soon adds
  {
    label: 'Professional photography',
    tiers: { make_me_move: false, coming_soon: true, active_listing: true },
  },
  {
    label: 'Pre-MLS broker network announcement',
    tiers: { make_me_move: false, coming_soon: true, active_listing: true },
  },
  {
    label: 'Social media campaign',
    tiers: { make_me_move: false, coming_soon: true, active_listing: true },
  },
  {
    label: 'Yard sign',
    tiers: { make_me_move: false, coming_soon: true, active_listing: true },
  },
  // Active adds
  {
    label: 'Staging consultation',
    tiers: { make_me_move: false, coming_soon: false, active_listing: true },
  },
  {
    label: 'Full MLS syndication (Zillow, Redfin, Trulia, Realtor.com)',
    tiers: { make_me_move: false, coming_soon: false, active_listing: true },
  },
  {
    label: 'Public open houses',
    tiers: { make_me_move: false, coming_soon: false, active_listing: true },
  },
  {
    label: 'Drone + video tour',
    tiers: { make_me_move: false, coming_soon: false, active_listing: true },
  },
  {
    label: 'Weekly seller reports',
    tiers: { make_me_move: false, coming_soon: false, active_listing: true },
  },
  {
    label: 'Showings management + lockbox',
    tiers: { make_me_move: false, coming_soon: false, active_listing: true },
  },
]

function StrategyModal({
  deal,
  mode,
  currentPackage,
  onClose,
  onSelect,
}: {
  deal: Deal
  mode: 'agent' | 'client'
  currentPackage: ServicePackage | null
  onClose: () => void
  onSelect: (next: SellTier) => Promise<void> | void
}) {
  const [submitting, setSubmitting] = useState<SellTier | null>(null)

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Compute "next upgrade" tier for the upgrade badge
  const currentIdx = SELL_TIERS.findIndex((t) => t.value === currentPackage)
  const nextUpgradeIdx = currentIdx >= 0 && currentIdx < SELL_TIERS.length - 1 ? currentIdx + 1 : -1

  async function pick(tier: SellTier) {
    if (tier === currentPackage) {
      onClose()
      return
    }
    setSubmitting(tier)
    try {
      await onSelect(tier)
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40"
      onClick={onClose}
    >
      <div
        className="bg-cream w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-ink-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-ink-200 flex items-start justify-between gap-4">
          <div>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
              Service strategy · {deal.title || 'Listing'}
            </div>
            <h2 className="font-display text-2xl text-ink-900 leading-tight">
              {mode === 'client'
                ? 'Choose your distribution.'
                : 'Choose the distribution for this client.'}
            </h2>
            <p className="text-sm text-ink-600 mt-2 max-w-2xl leading-relaxed">
              Each tier adds reach. Start where you’re comfortable — you can upgrade to a higher
              tier any time without re-doing the work below it.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-500 hover:text-ink-900 shrink-0"
            aria-label="Close"
          >
            <XIcon className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Tier columns */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SELL_TIERS.map((tier, idx) => {
              const isCurrent = tier.value === currentPackage
              const isUpgrade = idx === nextUpgradeIdx
              return (
                <div
                  key={tier.value}
                  className={`border bg-white p-5 flex flex-col ${
                    isCurrent
                      ? 'border-ink-900 ring-2 ring-ink-900/10'
                      : 'border-ink-200'
                  }`}
                >
                  {/* Column header */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between gap-2 mb-1.5 h-5">
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest bg-ink-900 text-cream px-1.5 py-0.5">
                          <Check className="w-3 h-3" strokeWidth={2} />
                          Current
                        </span>
                      )}
                      {!isCurrent && isUpgrade && (
                        <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest bg-emerald-50 text-emerald-700 px-1.5 py-0.5">
                          <Sparkles className="w-3 h-3" strokeWidth={2} />
                          Upgrade
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-xl text-ink-900 leading-tight">
                      {tier.label}
                    </h3>
                    <p className="text-xs text-ink-600 mt-1 leading-relaxed min-h-[2.5rem]">
                      {tier.tagline}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-5 flex-1">
                    {STRATEGY_FEATURES.map((f) => {
                      const included = f.tiers[tier.value]
                      return (
                        <li
                          key={f.label}
                          className={`flex items-start gap-2 text-xs leading-relaxed ${
                            included ? 'text-ink-800' : 'text-ink-400'
                          }`}
                        >
                          {included ? (
                            <Check
                              className="w-3 h-3 mt-1 shrink-0 text-emerald-700"
                              strokeWidth={2}
                            />
                          ) : (
                            <XIcon
                              className="w-3 h-3 mt-1 shrink-0 text-ink-300"
                              strokeWidth={2}
                            />
                          )}
                          <span>{f.label}</span>
                        </li>
                      )
                    })}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => pick(tier.value)}
                    disabled={submitting !== null || isCurrent}
                    className={`w-full inline-flex items-center justify-center gap-2 py-2.5 text-2xs uppercase tracking-widest transition-colors ${
                      isCurrent
                        ? 'bg-ink-50 text-ink-500 cursor-default'
                        : isUpgrade
                          ? 'bg-ink-900 text-cream hover:bg-ink-700'
                          : 'bg-cream text-ink-900 border border-ink-300 hover:border-ink-900'
                    } disabled:opacity-50`}
                  >
                    {submitting === tier.value ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Saving…
                      </>
                    ) : isCurrent ? (
                      'Currently selected'
                    ) : isUpgrade ? (
                      <>
                        Upgrade to {tier.label}
                        <Sparkles className="w-3 h-3" strokeWidth={2} />
                      </>
                    ) : (
                      `Choose ${tier.label}`
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          <p className="text-2xs uppercase tracking-widest text-ink-400 text-center mt-6">
            You can change strategies any time. Your photos, description, and uploads carry over.
          </p>
        </div>
      </div>
    </div>
  )
}

function PublishStatusCard({
  deal,
  mode,
  currentStatus,
  history,
  state,
  onChange,
  onChanged,
}: {
  deal: Deal
  mode: 'agent' | 'client'
  currentStatus: ListingStatus
  history: StatusHistoryEntry[]
  state: CardState
  onChange: (next: ListingStatus) => void
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const sinceLatest = history[0]?.happened_at
  const summary =
    currentStatus === 'draft'
      ? 'Building behind the scenes. Move to Soft Launch when photos and copy are ready.'
      : currentStatus === 'soft_launch'
        ? 'Visible to your warm buyer pool. No MLS clock yet.'
        : currentStatus === 'active'
          ? 'Live on MLS, syndicated everywhere. Days-on-market clock is running.'
          : currentStatus === 'pending'
            ? 'Under contract. Escrow in progress.'
            : currentStatus === 'sold'
              ? 'Closed and archived.'
              : currentStatus === 'expired'
                ? 'Listing period ended without a sale. Eligible for re-engagement.'
                : 'Pulled by seller. Can re-launch any time.'

  return (
    <>
      <Card
        state={state}
        icon={SendIcon}
        title="Publish status"
        summary={summary}
        spanFull
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest px-2 py-1 ${statusBadgeClasses(
                currentStatus,
              )}`}
            >
              {statusLabel(currentStatus)}
            </span>
            {sinceLatest && (
              <span className="text-2xs uppercase tracking-widest text-ink-500">
                · changed{' '}
                {new Date(sinceLatest).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
                {history[0]?.changed_by_type && ` by ${history[0].changed_by_type}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900"
              >
                {showHistory ? 'Hide history' : `History (${history.length})`}
              </button>
            )}
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700"
            >
              <SendIcon className="w-3 h-3" strokeWidth={2} />
              Update status
            </button>
          </div>
        </div>

        {showHistory && history.length > 0 && (
          <div className="mt-4 pt-4 border-t border-ink-100">
            <StatusHistoryTimeline entries={history} />
          </div>
        )}
      </Card>

      {open && (
        <PublishStatusModal
          deal={deal}
          mode={mode}
          currentStatus={currentStatus}
          onClose={() => setOpen(false)}
          onChanged={(next) => {
            onChange(next) // optimistic local update
            onChanged() // refetch history etc.
          }}
        />
      )}
    </>
  )
}

// ============================================================================
// Card shell + state badge
// ============================================================================

function Card({
  state,
  icon: Icon,
  title,
  summary,
  spanFull,
  children,
}: {
  state: CardState
  icon: typeof ImageIcon
  title: string
  summary: string
  spanFull?: boolean
  children: React.ReactNode
}) {
  return (
    <article
      className={`border border-ink-200 bg-cream p-5 ${spanFull ? 'md:col-span-2' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <Icon className="w-4 h-4 text-ink-500 mt-1 shrink-0" strokeWidth={1.5} />
          <div className="min-w-0">
            <h3 className="font-display text-lg text-ink-900 leading-tight">{title}</h3>
          </div>
        </div>
        <StateBadge state={state} />
      </div>
      <p className="text-sm text-ink-600 leading-relaxed mb-3">{summary}</p>
      <div>{children}</div>
    </article>
  )
}

function StateBadge({ state }: { state: CardState }) {
  if (state === 'complete') {
    return (
      <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-emerald-700 bg-emerald-50 px-1.5 py-0.5 shrink-0">
        <CircleCheck className="w-3 h-3" strokeWidth={2} />
        Complete
      </span>
    )
  }
  if (state === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-amber-700 bg-amber-50 px-1.5 py-0.5 shrink-0">
        <CircleDot className="w-3 h-3" strokeWidth={2} />
        In progress
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-ink-500 bg-ink-50 px-1.5 py-0.5 shrink-0">
      <CircleDashed className="w-3 h-3" strokeWidth={2} />
      Not started
    </span>
  )
}

// ============================================================================
// DescriptionEditor — lifted from the old ListingEditor
// ============================================================================

function DescriptionEditor({
  deal,
  mode,
  listing,
  onSubmitted,
}: {
  deal: Deal
  mode: 'agent' | 'client'
  listing: ComingSoonListing
  onSubmitted: () => void
}) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(true)
  const [pendingEdit, setPendingEdit] = useState<ListingEdit | null>(null)
  const [description, setDescription] = useState(stripHtml(listing.description_html || ''))
  const [features, setFeatures] = useState(stripHtml(listing.features_html || ''))
  const [showingTimes, setShowingTimes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('listing_edits')
      .select('*')
      .eq('deal_id', deal.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setPendingEdit((data as ListingEdit) || null)
      })
    return () => {
      cancelled = true
    }
  }, [deal.id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setSubmitting(true)
    try {
      // Agent edits go directly to the listing; client edits route through approval
      if (mode === 'agent' && deal.coming_soon_listing_id) {
        const payload: Record<string, string> = {
          description_html: paragraphsToHtml(description.trim()),
          features_html: paragraphsToHtml(features.trim()),
        }
        const { error: updErr } = await supabase
          .from('coming_soon_listings')
          .update(payload)
          .eq('id', deal.coming_soon_listing_id)
        if (updErr) throw updErr
      } else {
        // Client path: insert into listing_edits as pending
        const changes: Record<string, string> = {}
        const currentDesc = stripHtml(listing.description_html || '')
        const currentFeat = stripHtml(listing.features_html || '')
        if (description.trim() !== currentDesc) {
          changes['description_html'] = paragraphsToHtml(description.trim())
        }
        if (features.trim() !== currentFeat) {
          changes['features_html'] = paragraphsToHtml(features.trim())
        }
        if (showingTimes.trim()) {
          changes['_preferred_showing_times'] = showingTimes.trim()
        }
        if (Object.keys(changes).length === 0) {
          setEditing(false)
          setSubmitting(false)
          onSubmitted()
          return
        }
        const { error: insErr } = await supabase.from('listing_edits').insert({
          tenant_id: deal.tenant_id,
          deal_id: deal.id,
          listing_id: deal.coming_soon_listing_id,
          proposed_by_user_id: user.id,
          proposed_by_type: 'client',
          field_changes: changes,
          status: 'pending',
        })
        if (insErr) throw insErr
      }
      onSubmitted()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (pendingEdit && mode === 'client') {
    return (
      <div className="border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-sm text-amber-900">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
        <div className="flex-1">
          <strong>Pending review.</strong> Your latest edits were submitted{' '}
          {new Date(pendingEdit.created_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}{' '}
          and are awaiting your agent's approval before going live.
        </div>
      </div>
    )
  }

  return editing ? (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
      <div>
        <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
          What makes the home special
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          placeholder="A few paragraphs about what you love about this home — the morning light in the kitchen, the rooftop deck at sunset…"
          className="w-full px-3 py-2 border border-ink-200 text-sm focus:outline-none focus:border-ink-900 leading-relaxed bg-white"
        />
      </div>
      <div>
        <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
          Features and highlights
        </label>
        <textarea
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
          rows={3}
          placeholder="Updated kitchen 2023, in-unit laundry, deeded storage, dog-friendly building…"
          className="w-full px-3 py-2 border border-ink-200 text-sm focus:outline-none focus:border-ink-900 bg-white"
        />
      </div>
      {mode === 'client' && (
        <div>
          <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
            Preferred showing times (optional)
          </label>
          <input
            type="text"
            value={showingTimes}
            onChange={(e) => setShowingTimes(e.target.value)}
            placeholder="Weekends 11am–4pm, weekday evenings after 6pm, no Mondays…"
            className="w-full px-3 py-2 border border-ink-200 text-sm focus:outline-none focus:border-ink-900 bg-white"
          />
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="px-3 py-2 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
        >
          {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
          {mode === 'agent' ? 'Save changes' : 'Submit for review'}
        </button>
      </div>
    </form>
  ) : null
}

// ============================================================================
// Agent approvals queue (only renders if there are edits to review)
// ============================================================================

function ApprovalsSection({
  deal,
  edits,
  onReviewed,
}: {
  deal: Deal
  edits: ListingEdit[]
  onReviewed: () => void
}) {
  const { user } = useAuth()
  const pending = edits.filter((e) => e.status === 'pending')

  async function review(edit: ListingEdit, decision: 'approved' | 'rejected', note: string) {
    if (!user) return
    const { error: eErr } = await supabase
      .from('listing_edits')
      .update({
        status: decision,
        agent_response: note || null,
        reviewed_by_user_id: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', edit.id)
    if (eErr) {
      alert('Could not update edit: ' + eErr.message)
      return
    }

    if (decision === 'approved' && edit.listing_id) {
      const changes = edit.field_changes as Record<string, string>
      const applicable: Record<string, string> = {}
      for (const k of Object.keys(changes)) {
        if (k.startsWith('_')) continue
        applicable[k] = changes[k]
      }
      if (Object.keys(applicable).length > 0) {
        await supabase
          .from('coming_soon_listings')
          .update(applicable)
          .eq('id', edit.listing_id)
      }
    }

    const { data: dealRow } = await supabase
      .from('deals')
      .select('client_id, tenant_id')
      .eq('id', deal.id)
      .single()
    if (dealRow) {
      await supabase.from('notifications').insert({
        tenant_id: dealRow.tenant_id,
        recipient_type: 'client',
        recipient_id: dealRow.client_id,
        notification_type: `listing_edit_${decision}`,
        title:
          decision === 'approved'
            ? 'Your listing edits are live'
            : "Your edits weren't accepted",
        body: note || null,
        link_url: '/portal/listing',
      })
    }

    onReviewed()
  }

  return (
    <section className="mt-12">
      <h3 className="text-2xs uppercase tracking-widest text-ink-500 mb-4">
        Client edits {pending.length > 0 && `(${pending.length} pending)`}
      </h3>
      <div className="space-y-3">
        {edits.map((edit) => (
          <EditRow key={edit.id} edit={edit} onReview={review} />
        ))}
      </div>
    </section>
  )
}

function EditRow({
  edit,
  onReview,
}: {
  edit: ListingEdit
  onReview: (e: ListingEdit, d: 'approved' | 'rejected', note: string) => void
}) {
  const [note, setNote] = useState('')
  const [expanded, setExpanded] = useState(edit.status === 'pending')
  const changes = edit.field_changes as Record<string, string>
  const fieldKeys = Object.keys(changes)

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
    cancelled: 'bg-ink-100 text-ink-500',
  }

  return (
    <div className="border border-ink-200 p-4 bg-cream">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className={`text-2xs uppercase tracking-widest px-2 py-0.5 ${
              statusColors[edit.status]
            }`}
          >
            {edit.status}
          </span>
          <span className="text-sm text-ink-700">
            {edit.proposed_by_type} proposed {fieldKeys.length}{' '}
            {fieldKeys.length === 1 ? 'change' : 'changes'}
          </span>
        </div>
        <span className="text-2xs uppercase tracking-widest text-ink-500">
          {new Date(edit.created_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
      </button>
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-ink-100 pt-4">
          {fieldKeys.map((key) => (
            <div key={key}>
              <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
                {humanizeField(key)}
              </div>
              <div className="text-sm text-ink-700 bg-ink-50 p-3 whitespace-pre-wrap">
                {stripHtml(changes[key])}
              </div>
            </div>
          ))}
          {edit.status === 'pending' && (
            <div className="flex items-end gap-3 pt-3 border-t border-ink-100">
              <div className="flex-1">
                <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1">
                  Note to client (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Looks great — applied to the live listing."
                  className="w-full px-3 py-2 border border-ink-200 text-sm focus:outline-none focus:border-ink-900"
                />
              </div>
              <button
                onClick={() => onReview(edit, 'rejected', note)}
                className="px-3 py-2 text-sm text-ink-700 border border-ink-200 hover:bg-ink-50 transition-colors flex items-center gap-1.5"
              >
                <XIcon className="w-3.5 h-3.5" />
                Reject
              </button>
              <button
                onClick={() => onReview(edit, 'approved', note)}
                className="px-3 py-2 bg-ink-900 text-cream text-sm hover:bg-ink-800 transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Approve & apply
              </button>
            </div>
          )}
          {edit.agent_response && edit.status !== 'pending' && (
            <div className="text-xs text-ink-600 italic pt-3 border-t border-ink-100">
              Agent note: {edit.agent_response}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/?[^>]+>/g, '')
    .trim()
}

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return s.slice(0, n - 1).trimEnd() + '…'
}

function humanizeField(key: string): string {
  const map: Record<string, string> = {
    description_html: 'What makes the home special',
    features_html: 'Features & highlights',
    _preferred_showing_times: 'Preferred showing times',
  }
  return map[key] || key.replace(/_/g, ' ')
}
