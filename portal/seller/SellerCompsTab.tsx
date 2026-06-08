// P10 — Seller comparable-sales tab.
//
// The seller-side mirror of SavedPropertiesTab. Same table
// (client_external_listings), same Zillow auto-fetch pipeline
// (fetch_zillow_listing Edge Function), but scoped to
// listing_role = 'seller_comp' and framed as pricing comps rather than
// homes-to-tour. The seller (and their agent) build a set of recent comparable
// sales to anchor the list price; each comp is sortable by price, $/sqft, and
// size so the seller can see where their home lands in the range.
//
// Used in:
//   - Seller portal: /portal/comps  (viewerType='client', uses clientProfile)
//   - Agent dashboard: a future /clients/:id tab if desired (viewerType='agent')
//
// Differences from the buyer SavedPropertiesTab, by design:
//   - No "Request tour" affordance (comps aren't homes you tour).
//   - No client_status workflow (interested/toured/offered is buyer language).
//   - Adds a live "your home vs. comps" price-per-sqft delta strip so the
//     number means something at a glance.
//   - Every insert/edit stamps listing_role = 'seller_comp'.

import { useEffect, useMemo, useState } from 'react'
import {
  Loader2,
  Plus,
  Star,
  Heart,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  X,
  Trash2,
  Home,
  Edit3,
  Filter,
  Check,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  supabase,
  SUPABASE_URL,
  ExternalListing,
  PARKING_TYPES,
} from '@/lib/supabase'

type ViewerType = 'agent' | 'client'

type Props = {
  clientId: string
  tenantId: string
  viewerType: ViewerType
  // Optional anchor: the seller's own price + sqft, used to compute where each
  // comp lands relative to their home. When provided, drives the delta strip.
  subjectPrice?: number | null
  subjectSqft?: number | null
  subjectLabel?: string
}

type SortKey = 'created_at' | 'price' | 'pricePerSqft' | 'sqft' | 'bedrooms' | 'year_built'
type SortDir = 'asc' | 'desc'

const SELLER_COMP_ROLE = 'seller_comp' as const

export default function SellerCompsTab({
  clientId,
  tenantId,
  viewerType,
  subjectPrice,
  subjectSqft,
  subjectLabel,
}: Props) {
  const { session } = useAuth()
  const [items, setItems] = useState<ExternalListing[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<ExternalListing | null>(null)
  const [favOnly, setFavOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('pricePerSqft')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  async function refresh() {
    setLoading(true)
    const { data } = await supabase
      .from('client_external_listings')
      .select('*')
      .eq('client_id', clientId)
      .eq('listing_role', SELLER_COMP_ROLE)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    setItems((data as ExternalListing[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  // Subject (seller's own) price-per-sqft, for the delta column + range strip.
  const subjectPpsf =
    subjectPrice && subjectSqft ? Math.round(subjectPrice / subjectSqft) : null

  const filtered = useMemo(() => {
    let list = favOnly ? items.filter((i) => i.is_favorite) : items
    list = [...list].sort((a, b) => {
      const av = sortValue(a, sortKey)
      const bv = sortValue(b, sortKey)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
    return list
  }, [items, favOnly, sortKey, sortDir])

  // Comp $/sqft range, for the summary strip.
  const ppsfValues = items
    .map((i) => (i.price && i.sqft ? i.price / i.sqft : null))
    .filter((v): v is number => v != null)
  const ppsfLow = ppsfValues.length ? Math.round(Math.min(...ppsfValues)) : null
  const ppsfHigh = ppsfValues.length ? Math.round(Math.max(...ppsfValues)) : null
  const ppsfAvg = ppsfValues.length
    ? Math.round(ppsfValues.reduce((s, v) => s + v, 0) / ppsfValues.length)
    : null

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setSortDir(key === 'created_at' ? 'desc' : 'asc')
    }
  }

  async function toggleFavorite(item: ExternalListing) {
    const { error } = await supabase
      .from('client_external_listings')
      .update({ is_favorite: !item.is_favorite })
      .eq('id', item.id)
    if (error) {
      alert('Could not update: ' + error.message)
      return
    }
    setItems(items.map((i) => (i.id === item.id ? { ...i, is_favorite: !item.is_favorite } : i)))
  }

  async function deleteItem(item: ExternalListing) {
    if (!confirm(`Remove ${item.address || 'this comp'} from your comparable sales?`)) return
    const { error } = await supabase
      .from('client_external_listings')
      .delete()
      .eq('id', item.id)
    if (error) {
      alert('Delete failed: ' + error.message)
      return
    }
    setItems(items.filter((i) => i.id !== item.id))
  }

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-ink-500" />

  return (
    <div>
      {/* Header */}
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
            Comparable sales
          </div>
          <p className="text-sm text-ink-600">
            {items.length} comp{items.length === 1 ? '' : 's'}
            {items.filter((i) => i.is_favorite).length > 0 &&
              ` · ${items.filter((i) => i.is_favorite).length} starred`}
            {viewerType === 'client'
              ? ' — the recent sales we’re pricing against.'
              : ' — pricing anchors for this listing.'}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700"
        >
          <Plus className="w-3.5 h-3.5" />
          Add comp
        </button>
      </div>

      {/* Range strip — only meaningful once there are comps with $/sqft */}
      {ppsfLow != null && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <RangeStat label="Comp $/sqft — low" value={`$${ppsfLow.toLocaleString()}`} />
          <RangeStat label="Average" value={`$${(ppsfAvg ?? 0).toLocaleString()}`} />
          <RangeStat label="High" value={`$${(ppsfHigh ?? 0).toLocaleString()}`} />
          <RangeStat
            label={subjectLabel ? `${subjectLabel} $/sqft` : 'Your $/sqft'}
            value={subjectPpsf != null ? `$${subjectPpsf.toLocaleString()}` : '—'}
            emphasize
          />
        </div>
      )}

      {/* Filter chip */}
      {items.length > 0 && (
        <div className="flex items-center gap-2 mb-5 text-2xs uppercase tracking-widest">
          <Filter className="w-3 h-3 text-ink-400" />
          <FilterChip active={!favOnly} onClick={() => setFavOnly(false)}>
            All
          </FilterChip>
          <FilterChip active={favOnly} onClick={() => setFavOnly(true)}>
            <Heart className="w-2.5 h-2.5 inline mr-1" />
            Starred
          </FilterChip>
        </div>
      )}

      {/* Body */}
      {items.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} viewerType={viewerType} />
      ) : filtered.length === 0 ? (
        <div className="border border-ink-200 p-8 text-center bg-cream">
          <p className="text-sm text-ink-500">No starred comps yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-ink-200">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <Th></Th>
                <Th>Address</Th>
                <ThSort active={sortKey === 'price'} dir={sortDir} onClick={() => toggleSort('price')}>
                  Sale price
                </ThSort>
                <ThSort
                  active={sortKey === 'pricePerSqft'}
                  dir={sortDir}
                  onClick={() => toggleSort('pricePerSqft')}
                >
                  $/sqft
                </ThSort>
                {subjectPpsf != null && <Th>vs. yours</Th>}
                <ThSort
                  active={sortKey === 'bedrooms'}
                  dir={sortDir}
                  onClick={() => toggleSort('bedrooms')}
                >
                  Bd / Ba
                </ThSort>
                <ThSort active={sortKey === 'sqft'} dir={sortDir} onClick={() => toggleSort('sqft')}>
                  Sqft
                </ThSort>
                <ThSort
                  active={sortKey === 'year_built'}
                  dir={sortDir}
                  onClick={() => toggleSort('year_built')}
                >
                  Built
                </ThSort>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  subjectPpsf={subjectPpsf}
                  onToggleFavorite={() => toggleFavorite(item)}
                  onEdit={() => setEditing(item)}
                  onDelete={() => deleteItem(item)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add dialog */}
      {showAdd && (
        <AddCompDialog
          clientId={clientId}
          tenantId={tenantId}
          viewerType={viewerType}
          accessToken={session?.access_token || ''}
          nextSortOrder={items.length}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false)
            refresh()
          }}
        />
      )}

      {/* Edit dialog */}
      {editing && (
        <EditCompDialog
          comp={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

// ============================================================
// Range stat tile
// ============================================================
function RangeStat({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div
      className={`border p-4 ${
        emphasize ? 'border-ink-900 bg-ink-50' : 'border-ink-200 bg-white'
      }`}
    >
      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1.5">{label}</div>
      <div className="font-display text-2xl text-ink-900 leading-none">{value}</div>
    </div>
  )
}

// ============================================================
// Header cells
// ============================================================
function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="text-left text-2xs uppercase tracking-widest text-ink-500 font-normal px-3 py-3">
      {children}
    </th>
  )
}

function ThSort({
  active,
  dir,
  onClick,
  children,
}: {
  active: boolean
  dir: SortDir
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <th className="text-left text-2xs uppercase tracking-widest font-normal px-3 py-3">
      <button
        onClick={onClick}
        className={`flex items-center gap-1 hover:text-ink-900 ${
          active ? 'text-ink-900' : 'text-ink-500'
        }`}
      >
        {children}
        {active ? (
          dir === 'asc' ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-40" />
        )}
      </button>
    </th>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 border transition-colors ${
        active
          ? 'bg-ink-900 text-cream border-ink-900'
          : 'bg-cream text-ink-600 border-ink-200 hover:border-ink-400'
      }`}
    >
      {children}
    </button>
  )
}

// ============================================================
// Row
// ============================================================
function Row({
  item,
  subjectPpsf,
  onToggleFavorite,
  onEdit,
  onDelete,
}: {
  item: ExternalListing
  subjectPpsf: number | null
  onToggleFavorite: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const ppsf = item.price && item.sqft ? Math.round(item.price / item.sqft) : null
  const delta = ppsf != null && subjectPpsf != null ? ppsf - subjectPpsf : null
  const deltaPct =
    delta != null && subjectPpsf ? Math.round((delta / subjectPpsf) * 100) : null

  return (
    <tr className="hover:bg-ink-50">
      {/* Star */}
      <td className="px-3 py-3 w-10 align-top">
        <button onClick={onToggleFavorite} title={item.is_favorite ? 'Unstar' : 'Star'}>
          <Star
            className={`w-4 h-4 ${
              item.is_favorite ? 'fill-ink-900 text-ink-900' : 'text-ink-300 hover:text-ink-500'
            }`}
            strokeWidth={1.5}
          />
        </button>
      </td>

      {/* Address */}
      <td className="px-3 py-3 min-w-[15rem] align-top">
        <div className="flex items-start gap-3">
          {item.photo_url ? (
            <a href={item.source_url} target="_blank" rel="noreferrer" className="shrink-0" title="Open source listing">
              <img src={item.photo_url} alt="" className="w-12 h-12 object-cover border border-ink-200" />
            </a>
          ) : (
            <div className="w-12 h-12 bg-ink-100 border border-ink-200 shrink-0 flex items-center justify-center">
              <Home className="w-4 h-4 text-ink-400" strokeWidth={1.5} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <a href={item.source_url} target="_blank" rel="noreferrer" className="block group">
              <div className="font-medium text-ink-900 leading-snug group-hover:underline truncate">
                {item.address || 'Unknown address'}
                <ExternalLink className="inline w-3 h-3 ml-1 text-ink-400" />
              </div>
              <div className="text-2xs text-ink-500 truncate">
                {[item.city, item.state].filter(Boolean).join(', ')}
                {item.property_type && ` · ${item.property_type}`}
              </div>
            </a>
            {item.notes && (
              <div className="text-2xs text-ink-500 mt-1.5 line-clamp-2">{item.notes}</div>
            )}
          </div>
        </div>
      </td>

      {/* Sale price */}
      <td className="px-3 py-3 whitespace-nowrap font-medium text-ink-900">
        {item.price ? `$${item.price.toLocaleString()}` : '—'}
      </td>

      {/* $/sqft */}
      <td className="px-3 py-3 whitespace-nowrap text-ink-700">
        {ppsf ? `$${ppsf.toLocaleString()}` : '—'}
      </td>

      {/* vs. yours — only when subject ppsf known */}
      {subjectPpsf != null && (
        <td className="px-3 py-3 whitespace-nowrap">
          {delta == null ? (
            <span className="text-ink-400">—</span>
          ) : delta === 0 ? (
            <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-ink-500">
              <Minus className="w-3 h-3" /> even
            </span>
          ) : delta > 0 ? (
            <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-emerald-700">
              <TrendingUp className="w-3 h-3" />+${delta.toLocaleString()}
              {deltaPct != null && ` (${deltaPct}%)`}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-red-600">
              <TrendingDown className="w-3 h-3" />${delta.toLocaleString()}
              {deltaPct != null && ` (${deltaPct}%)`}
            </span>
          )}
        </td>
      )}

      {/* Bd / Ba */}
      <td className="px-3 py-3 whitespace-nowrap text-ink-700">
        {item.bedrooms ?? '—'} / {item.bathrooms ?? '—'}
      </td>

      {/* Sqft */}
      <td className="px-3 py-3 whitespace-nowrap text-ink-700">
        {item.sqft ? item.sqft.toLocaleString() : '—'}
      </td>

      {/* Built */}
      <td className="px-3 py-3 whitespace-nowrap text-ink-700">{item.year_built ?? '—'}</td>

      {/* Actions */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <button onClick={onEdit} title="Edit details" className="text-ink-500 hover:text-ink-900">
            <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button onClick={onDelete} title="Remove" className="text-ink-500 hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ============================================================
// Helpers
// ============================================================
function sortValue(item: ExternalListing, key: SortKey): number | string | null {
  switch (key) {
    case 'created_at':
      return item.created_at
    case 'price':
      return item.price
    case 'pricePerSqft':
      return item.price && item.sqft ? item.price / item.sqft : null
    case 'sqft':
      return item.sqft
    case 'bedrooms':
      return item.bedrooms
    case 'year_built':
      return item.year_built
    default:
      return null
  }
}

function EmptyState({ onAdd, viewerType }: { onAdd: () => void; viewerType: ViewerType }) {
  return (
    <div className="border border-ink-200 p-12 text-center bg-cream">
      <Home className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.5} />
      <h3 className="font-display text-xl text-ink-900 mb-2">No comparable sales yet.</h3>
      <p className="text-sm text-ink-600 max-w-md mx-auto mb-5">
        {viewerType === 'client'
          ? 'Paste a Zillow, Redfin, or Realtor.com link to a recent nearby sale and it becomes a sortable comp. The more we add, the tighter the pricing picture.'
          : 'Paste a recent comparable sale for this client. You and the client both see the same set — sorted by price, size, and $/sqft.'}
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700"
      >
        <Plus className="w-3.5 h-3.5" />
        Add the first comp
      </button>
    </div>
  )
}

function detectSource(url: string): 'zillow' | 'redfin' | 'realtor' | 'other' {
  const u = url.toLowerCase()
  if (u.includes('zillow.com')) return 'zillow'
  if (u.includes('redfin.com')) return 'redfin'
  if (u.includes('realtor.com')) return 'realtor'
  return 'other'
}

// ============================================================
// Add dialog — Zillow auto-fetch, stamps listing_role='seller_comp'
// ============================================================
function AddCompDialog({
  clientId,
  tenantId,
  viewerType,
  accessToken,
  nextSortOrder,
  onClose,
  onAdded,
}: {
  clientId: string
  tenantId: string
  viewerType: ViewerType
  accessToken: string
  nextSortOrder: number
  onClose: () => void
  onAdded: () => void
}) {
  const [url, setUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<ExternalListing> | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleFetch() {
    setFetchError(null)
    setFetching(true)
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/fetch_zillow_listing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ url }),
      })
      const json = await resp.json()
      if (json.ok && json.extracted) {
        const e = json.extracted
        setDraft({
          source_url: url,
          source_kind: detectSource(url),
          address: e.address || '',
          city: e.city || '',
          state: e.state || '',
          zip: e.zip || '',
          price: e.price || null,
          bedrooms: e.bedrooms || null,
          bathrooms: e.bathrooms || null,
          sqft: e.sqft || null,
          lot_sqft: e.lotSqft || null,
          year_built: e.yearBuilt || null,
          property_type: e.propertyType || '',
          hoa_monthly: e.hoaMonthly ?? null,
          parking_type: e.parkingType || '',
          parking_spaces: e.parkingSpaces || null,
          outdoor_features: Array.isArray(e.outdoorFeatures) ? e.outdoorFeatures : [],
          photo_url: e.photoUrl || '',
          fetch_status: 'success',
        })
      } else {
        setDraft({
          source_url: url,
          source_kind: detectSource(url),
          outdoor_features: [],
          fetch_status: 'manual',
        })
        setFetchError(
          (json.reason || 'Could not auto-fill') + ' — fill the fields below manually and save.',
        )
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e))
      setDraft({
        source_url: url,
        source_kind: detectSource(url),
        outdoor_features: [],
        fetch_status: 'manual',
      })
    } finally {
      setFetching(false)
    }
  }

  async function handleSave() {
    if (!draft) return
    setSaving(true)
    try {
      const payload = {
        tenant_id: tenantId,
        client_id: clientId,
        added_by_type: viewerType,
        listing_role: SELLER_COMP_ROLE,
        sort_order: nextSortOrder,
        source_kind: draft.source_kind || 'zillow',
        source_url: draft.source_url,
        address: draft.address || null,
        city: draft.city || null,
        state: draft.state || null,
        zip: draft.zip || null,
        price: draft.price ?? null,
        bedrooms: draft.bedrooms ?? null,
        bathrooms: draft.bathrooms ?? null,
        sqft: draft.sqft ?? null,
        lot_sqft: draft.lot_sqft ?? null,
        year_built: draft.year_built ?? null,
        property_type: draft.property_type || null,
        hoa_monthly: draft.hoa_monthly ?? null,
        parking_type: draft.parking_type || null,
        parking_spaces: draft.parking_spaces ?? null,
        outdoor_features: draft.outdoor_features || [],
        photo_url: draft.photo_url || null,
        notes: draft.notes || null,
        fetch_status: draft.fetch_status || 'manual',
        fetched_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('client_external_listings').insert(payload)
      if (error) throw error
      onAdded()
    } catch (e) {
      alert('Save failed: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogShell onClose={onClose} title="Add a comparable sale">
      {!draft ? (
        <>
          <p className="text-sm text-ink-600 mb-4">
            Paste a Zillow, Redfin, or Realtor.com link to a recent nearby sale. We’ll auto-fill
            the price, size, and details when possible.
          </p>
          <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
            Listing URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.zillow.com/homedetails/..."
            className="w-full border border-ink-200 px-3 py-2 text-sm bg-cream mb-4"
          />
          {fetchError && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 mb-4">
              {fetchError}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900"
            >
              Cancel
            </button>
            <button
              onClick={handleFetch}
              disabled={fetching || !url}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
            >
              {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Fetch details
            </button>
          </div>
        </>
      ) : (
        <CompForm
          draft={draft}
          setDraft={setDraft}
          onSave={handleSave}
          onCancel={onClose}
          saving={saving}
          fetchError={fetchError}
        />
      )}
    </DialogShell>
  )
}

// ============================================================
// Edit dialog
// ============================================================
function EditCompDialog({
  comp,
  onClose,
  onSaved,
}: {
  comp: ExternalListing
  onClose: () => void
  onSaved: () => void
}) {
  const [draft, setDraft] = useState<Partial<ExternalListing>>(comp)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        source_url: draft.source_url,
        address: draft.address || null,
        city: draft.city || null,
        state: draft.state || null,
        zip: draft.zip || null,
        price: draft.price ?? null,
        bedrooms: draft.bedrooms ?? null,
        bathrooms: draft.bathrooms ?? null,
        sqft: draft.sqft ?? null,
        lot_sqft: draft.lot_sqft ?? null,
        year_built: draft.year_built ?? null,
        property_type: draft.property_type || null,
        hoa_monthly: draft.hoa_monthly ?? null,
        parking_type: draft.parking_type || null,
        parking_spaces: draft.parking_spaces ?? null,
        outdoor_features: draft.outdoor_features || [],
        photo_url: draft.photo_url || null,
        notes: draft.notes || null,
        // listing_role intentionally left unchanged — a comp stays a comp.
      }
      const { error } = await supabase
        .from('client_external_listings')
        .update(payload)
        .eq('id', comp.id)
      if (error) throw error
      onSaved()
    } catch (e) {
      alert('Save failed: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogShell onClose={onClose} title="Edit comparable sale">
      <CompForm
        draft={draft}
        setDraft={(d) => setDraft(d as Partial<ExternalListing>)}
        onSave={handleSave}
        onCancel={onClose}
        saving={saving}
        fetchError={null}
      />
    </DialogShell>
  )
}

// ============================================================
// Shared form
// ============================================================
function CompForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
  fetchError,
}: {
  draft: Partial<ExternalListing>
  setDraft: (d: Partial<ExternalListing>) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  fetchError: string | null
}) {
  const upd = <K extends keyof ExternalListing>(key: K, value: ExternalListing[K]) =>
    setDraft({ ...draft, [key]: value })

  return (
    <div>
      {fetchError && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 mb-4">
          {fetchError}
        </p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <FormField label="Address" colspan={4}>
          <input
            value={draft.address || ''}
            onChange={(e) => upd('address', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </FormField>
        <FormField label="City" colspan={2}>
          <input
            value={draft.city || ''}
            onChange={(e) => upd('city', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </FormField>
        <FormField label="State">
          <input
            value={draft.state || ''}
            onChange={(e) => upd('state', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </FormField>
        <FormField label="Zip">
          <input
            value={draft.zip || ''}
            onChange={(e) => upd('zip', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </FormField>
        <FormField label="Sale price">
          <NumInput value={draft.price ?? null} onChange={(v) => upd('price', v)} />
        </FormField>
        <FormField label="HOA monthly">
          <NumInput value={draft.hoa_monthly ?? null} onChange={(v) => upd('hoa_monthly', v)} />
        </FormField>
        <FormField label="Beds">
          <NumInput value={draft.bedrooms ?? null} onChange={(v) => upd('bedrooms', v)} />
        </FormField>
        <FormField label="Baths">
          <NumInput value={draft.bathrooms ?? null} onChange={(v) => upd('bathrooms', v)} />
        </FormField>
        <FormField label="Sqft">
          <NumInput value={draft.sqft ?? null} onChange={(v) => upd('sqft', v)} />
        </FormField>
        <FormField label="Lot sqft">
          <NumInput value={draft.lot_sqft ?? null} onChange={(v) => upd('lot_sqft', v)} />
        </FormField>
        <FormField label="Year built">
          <NumInput value={draft.year_built ?? null} onChange={(v) => upd('year_built', v)} />
        </FormField>
        <FormField label="Property type">
          <input
            value={draft.property_type || ''}
            onChange={(e) => upd('property_type', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </FormField>
        <FormField label="Parking type">
          <select
            value={draft.parking_type || ''}
            onChange={(e) => upd('parking_type', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          >
            <option value="">—</option>
            {PARKING_TYPES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Parking spaces">
          <NumInput value={draft.parking_spaces ?? null} onChange={(v) => upd('parking_spaces', v)} />
        </FormField>
        <FormField label="Photo URL" colspan={2}>
          <input
            value={draft.photo_url || ''}
            onChange={(e) => upd('photo_url', e.target.value)}
            placeholder="https://..."
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </FormField>
        <FormField label="Notes — why this comp?" colspan={4}>
          <textarea
            value={draft.notes || ''}
            onChange={(e) => upd('notes', e.target.value)}
            rows={2}
            placeholder="Same line, similar view, sold last month after 9 days…"
            className="w-full border border-ink-200 px-3 py-2 text-sm bg-cream"
          />
        </FormField>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-ink-200 pt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Dialog chrome + atoms
// ============================================================
function DialogShell({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode
  onClose: () => void
  title: string
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/40 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-cream border border-ink-200 w-full max-w-3xl mt-12 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5 pb-4 border-b border-ink-200">
          <h2 className="font-display text-2xl text-ink-900 leading-tight">{title}</h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FormField({
  label,
  children,
  colspan,
}: {
  label: string
  children: React.ReactNode
  colspan?: number
}) {
  const cls =
    colspan === 2
      ? 'md:col-span-2'
      : colspan === 3
      ? 'md:col-span-3'
      : colspan === 4
      ? 'col-span-2 md:col-span-4'
      : ''
  return (
    <div className={cls}>
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function NumInput({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === '' ? null : Number(v))
      }}
      className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
    />
  )
}
