// P9.2 — Saved external listings tab. Used in both:
//   - Agent dashboard: /clients/:id/saved (gets clientId prop)
//   - Client portal: /portal/saved (uses clientProfile from auth)
//
// Interactive sortable table. Add via URL (Claude web_fetch auto-fill).
// Inline edit favorite + status. Sort by any column. Filter by status / favorites.

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
  Trees,
  Home,
  Edit3,
  Filter,
  Check,
  Calendar,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  supabase,
  SUPABASE_URL,
  ExternalListing,
  ExternalListingClientStatus,
  OUTDOOR_FEATURES,
  PARKING_TYPES,
  EXTERNAL_LISTING_STATUSES,
} from '@/lib/supabase'

type ViewerType = 'agent' | 'client'

type Props = {
  clientId: string
  tenantId: string
  viewerType: ViewerType
}

type SortKey =
  | 'created_at'
  | 'price'
  | 'pricePerSqft'
  | 'sqft'
  | 'hoa_monthly'
  | 'parking_spaces'
  | 'outdoor_count'
  | 'bedrooms'
type SortDir = 'asc' | 'desc'

export default function SavedPropertiesTab({ clientId, tenantId, viewerType }: Props) {
  const { session } = useAuth()
  const [items, setItems] = useState<ExternalListing[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<ExternalListing | null>(null)
  const [requestingTour, setRequestingTour] = useState<ExternalListing | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'favorites' | ExternalListingClientStatus>(
    'all',
  )
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  async function refresh() {
    setLoading(true)
    const { data } = await supabase
      .from('client_external_listings')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    setItems((data as ExternalListing[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  // Filter + sort
  const filtered = useMemo(() => {
    let list = items
    if (statusFilter === 'favorites') list = list.filter((i) => i.is_favorite)
    else if (statusFilter !== 'all') list = list.filter((i) => i.client_status === statusFilter)
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
  }, [items, statusFilter, sortKey, sortDir])

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

  async function updateStatus(item: ExternalListing, status: ExternalListingClientStatus) {
    const { error } = await supabase
      .from('client_external_listings')
      .update({ client_status: status })
      .eq('id', item.id)
    if (error) {
      alert('Could not update: ' + error.message)
      return
    }
    setItems(items.map((i) => (i.id === item.id ? { ...i, client_status: status } : i)))
  }

  async function deleteItem(item: ExternalListing) {
    if (!confirm(`Remove ${item.address || 'this listing'} from saved?`)) return
    const { error } = await supabase.from('client_external_listings').delete().eq('id', item.id)
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
            Saved properties
          </div>
          <p className="text-sm text-ink-600">
            {items.length} saved
            {items.filter((i) => i.is_favorite).length > 0 &&
              ` · ${items.filter((i) => i.is_favorite).length} favorite${
                items.filter((i) => i.is_favorite).length === 1 ? '' : 's'
              }`}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Zillow link
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-6 text-2xs uppercase tracking-widest">
        <Filter className="w-3 h-3 text-ink-400" />
        <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
          All
        </FilterChip>
        <FilterChip
          active={statusFilter === 'favorites'}
          onClick={() => setStatusFilter('favorites')}
        >
          <Heart className="w-2.5 h-2.5 inline mr-1" />
          Favorites
        </FilterChip>
        {EXTERNAL_LISTING_STATUSES.map((s) => (
          <FilterChip
            key={s.value}
            active={statusFilter === s.value}
            onClick={() => setStatusFilter(s.value)}
          >
            {s.label}
          </FilterChip>
        ))}
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} viewerType={viewerType} />
      ) : filtered.length === 0 ? (
        <div className="border border-ink-200 p-8 text-center bg-cream">
          <p className="text-sm text-ink-500">No listings match this filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-ink-200">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <Th></Th>
                <Th>Address</Th>
                <ThSort
                  active={sortKey === 'price'}
                  dir={sortDir}
                  onClick={() => toggleSort('price')}
                >
                  Price
                </ThSort>
                <ThSort
                  active={sortKey === 'pricePerSqft'}
                  dir={sortDir}
                  onClick={() => toggleSort('pricePerSqft')}
                >
                  $/sqft
                </ThSort>
                <ThSort
                  active={sortKey === 'bedrooms'}
                  dir={sortDir}
                  onClick={() => toggleSort('bedrooms')}
                >
                  Bd / Ba
                </ThSort>
                <ThSort
                  active={sortKey === 'sqft'}
                  dir={sortDir}
                  onClick={() => toggleSort('sqft')}
                >
                  Sqft
                </ThSort>
                <ThSort
                  active={sortKey === 'hoa_monthly'}
                  dir={sortDir}
                  onClick={() => toggleSort('hoa_monthly')}
                >
                  HOA
                </ThSort>
                <ThSort
                  active={sortKey === 'parking_spaces'}
                  dir={sortDir}
                  onClick={() => toggleSort('parking_spaces')}
                >
                  Parking
                </ThSort>
                <ThSort
                  active={sortKey === 'outdoor_count'}
                  dir={sortDir}
                  onClick={() => toggleSort('outdoor_count')}
                >
                  Outdoor
                </ThSort>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  onToggleFavorite={() => toggleFavorite(item)}
                  onUpdateStatus={(s) => updateStatus(item, s)}
                  onEdit={() => setEditing(item)}
                  onDelete={() => deleteItem(item)}
                  onRequestTour={() => setRequestingTour(item)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add dialog */}
      {showAdd && (
        <AddListingDialog
          clientId={clientId}
          tenantId={tenantId}
          viewerType={viewerType}
          accessToken={session?.access_token || ''}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false)
            refresh()
          }}
        />
      )}

      {/* Edit dialog */}
      {editing && (
        <EditListingDialog
          listing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}

      {/* Request-tour dialog */}
      {requestingTour && (
        <RequestTourDialog
          listing={requestingTour}
          accessToken={session?.access_token || ''}
          onClose={() => setRequestingTour(null)}
          onSubmitted={() => {
            setRequestingTour(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

// ============================================================
// Sortable header cell
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
// Table row
// ============================================================
function Row({
  item,
  onToggleFavorite,
  onUpdateStatus,
  onEdit,
  onDelete,
  onRequestTour,
}: {
  item: ExternalListing
  onToggleFavorite: () => void
  onUpdateStatus: (s: ExternalListingClientStatus) => void
  onEdit: () => void
  onDelete: () => void
  onRequestTour: () => void
}) {
  const ppsf = item.price && item.sqft ? Math.round(item.price / item.sqft) : null
  const status = EXTERNAL_LISTING_STATUSES.find((s) => s.value === item.client_status)
  return (
    <tr className="hover:bg-ink-50">
      {/* Favorite */}
      <td className="px-3 py-3 w-10 align-top">
        <button onClick={onToggleFavorite} title={item.is_favorite ? 'Unfavorite' : 'Favorite'}>
          <Star
            className={`w-4 h-4 ${
              item.is_favorite
                ? 'fill-ink-900 text-ink-900'
                : 'text-ink-300 hover:text-ink-500'
            }`}
            strokeWidth={1.5}
          />
        </button>
      </td>

      {/* Address + prominent Request-tour button */}
      <td className="px-3 py-3 min-w-[16rem] align-top">
        <div className="flex items-start gap-3">
          {item.photo_url ? (
            <a
              href={item.source_url}
              target="_blank"
              rel="noreferrer"
              className="shrink-0"
              title="Open listing on source site"
            >
              <img
                src={item.photo_url}
                alt=""
                className="w-12 h-12 object-cover border border-ink-200"
              />
            </a>
          ) : (
            <div className="w-12 h-12 bg-ink-100 border border-ink-200 shrink-0 flex items-center justify-center">
              <Home className="w-4 h-4 text-ink-400" strokeWidth={1.5} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <a
              href={item.source_url}
              target="_blank"
              rel="noreferrer"
              className="block group"
            >
              <div className="font-medium text-ink-900 leading-snug group-hover:underline truncate">
                {item.address || 'Unknown address'}
                <ExternalLink className="inline w-3 h-3 ml-1 text-ink-400" />
              </div>
              <div className="text-2xs text-ink-500 truncate">
                {[item.city, item.state].filter(Boolean).join(', ')}
                {item.property_type && ` · ${item.property_type}`}
              </div>
            </a>
            <button
              onClick={onRequestTour}
              className="mt-2.5 inline-flex items-center gap-1.5 bg-ink-900 text-cream px-3 py-1.5 text-2xs uppercase tracking-widest hover:bg-ink-700 transition-colors"
            >
              <Calendar className="w-3 h-3" strokeWidth={2} />
              Request tour
            </button>
          </div>
        </div>
      </td>

      {/* Price */}
      <td className="px-3 py-3 whitespace-nowrap font-medium text-ink-900">
        {item.price ? `$${item.price.toLocaleString()}` : '—'}
      </td>

      {/* $/sqft */}
      <td className="px-3 py-3 whitespace-nowrap text-ink-700">
        {ppsf ? `$${ppsf.toLocaleString()}` : '—'}
      </td>

      {/* Bd / Ba */}
      <td className="px-3 py-3 whitespace-nowrap text-ink-700">
        {item.bedrooms ?? '—'} / {item.bathrooms ?? '—'}
      </td>

      {/* Sqft */}
      <td className="px-3 py-3 whitespace-nowrap text-ink-700">
        {item.sqft ? item.sqft.toLocaleString() : '—'}
      </td>

      {/* HOA */}
      <td className="px-3 py-3 whitespace-nowrap text-ink-700">
        {item.hoa_monthly != null ? (
          item.hoa_monthly === 0 ? (
            <span className="text-emerald-700">None</span>
          ) : (
            `$${item.hoa_monthly}/mo`
          )
        ) : (
          '—'
        )}
      </td>

      {/* Parking */}
      <td className="px-3 py-3 whitespace-nowrap text-ink-700">
        {item.parking_spaces ? (
          <span>
            {item.parking_spaces}
            {item.parking_type && (
              <span className="text-ink-500 text-2xs ml-1">{item.parking_type}</span>
            )}
          </span>
        ) : item.parking_type ? (
          <span className="text-2xs">{item.parking_type}</span>
        ) : (
          '—'
        )}
      </td>

      {/* Outdoor */}
      <td className="px-3 py-3 max-w-[12rem]">
        {item.outdoor_features.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {item.outdoor_features.slice(0, 3).map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1 text-2xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5"
              >
                <Trees className="w-2.5 h-2.5" />
                {OUTDOOR_FEATURES.find((o) => o.value === f)?.label || f}
              </span>
            ))}
            {item.outdoor_features.length > 3 && (
              <span className="text-2xs text-ink-500">
                +{item.outdoor_features.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-ink-400">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <select
          value={item.client_status}
          onChange={(e) => onUpdateStatus(e.target.value as ExternalListingClientStatus)}
          className={`text-2xs uppercase tracking-widest px-2 py-1 border-0 cursor-pointer ${
            status?.color || 'bg-ink-100 text-ink-700'
          }`}
        >
          {EXTERNAL_LISTING_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </td>

      {/* Actions */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            title="Edit details"
            className="text-ink-500 hover:text-ink-900"
          >
            <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={onDelete}
            title="Remove"
            className="text-ink-500 hover:text-red-600"
          >
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
    case 'hoa_monthly':
      return item.hoa_monthly
    case 'parking_spaces':
      return item.parking_spaces
    case 'outdoor_count':
      return item.outdoor_features.length
    case 'bedrooms':
      return item.bedrooms
    default:
      return null
  }
}

function EmptyState({
  onAdd,
  viewerType,
}: {
  onAdd: () => void
  viewerType: ViewerType
}) {
  return (
    <div className="border border-ink-200 p-12 text-center bg-cream">
      <Home className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.5} />
      <h3 className="font-display text-xl text-ink-900 mb-2">No saved properties yet.</h3>
      <p className="text-sm text-ink-600 max-w-md mx-auto mb-5">
        {viewerType === 'client'
          ? 'Browsing on Zillow? Paste a link here and it becomes a sortable card you and your agent can both see.'
          : 'Paste a Zillow URL to save it for this client. You and the client both see the same list — favorites, notes, and status sync live.'}
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700"
      >
        <Plus className="w-3.5 h-3.5" />
        Add the first Zillow link
      </button>
    </div>
  )
}

// ============================================================
// Add dialog
// ============================================================
function AddListingDialog({
  clientId,
  tenantId,
  viewerType,
  accessToken,
  onClose,
  onAdded,
}: {
  clientId: string
  tenantId: string
  viewerType: ViewerType
  accessToken: string
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
        // Fallback path — open manual form, pre-fill only the URL
        setDraft({
          source_url: url,
          source_kind: detectSource(url),
          outdoor_features: [],
          fetch_status: 'manual',
        })
        setFetchError(
          (json.reason || 'Could not auto-fill') +
            ' — fill the fields below manually and save.',
        )
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e))
      // Open manual form on error too
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
    <DialogShell onClose={onClose} title="Add a Zillow link">
      {!draft ? (
        <>
          <p className="text-sm text-ink-600 mb-4">
            Paste any Zillow, Redfin, or Realtor.com listing URL. We'll auto-fill the property
            details when possible.
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
            <button onClick={onClose} className="px-4 py-2 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900">
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
        <ListingForm
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
function EditListingDialog({
  listing,
  onClose,
  onSaved,
}: {
  listing: ExternalListing
  onClose: () => void
  onSaved: () => void
}) {
  const [draft, setDraft] = useState<Partial<ExternalListing>>(listing)
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
      }
      const { error } = await supabase
        .from('client_external_listings')
        .update(payload)
        .eq('id', listing.id)
      if (error) throw error
      onSaved()
    } catch (e) {
      alert('Save failed: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogShell onClose={onClose} title="Edit listing">
      <ListingForm
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
// Shared form for both add (post-fetch) and edit
// ============================================================
function ListingForm({
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
        <Field label="Address" colspan={4}>
          <input
            value={draft.address || ''}
            onChange={(e) => upd('address', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="City" colspan={2}>
          <input
            value={draft.city || ''}
            onChange={(e) => upd('city', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="State">
          <input
            value={draft.state || ''}
            onChange={(e) => upd('state', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="Zip">
          <input
            value={draft.zip || ''}
            onChange={(e) => upd('zip', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="Price">
          <NumInput value={draft.price ?? null} onChange={(v) => upd('price', v)} />
        </Field>
        <Field label="HOA monthly">
          <NumInput
            value={draft.hoa_monthly ?? null}
            onChange={(v) => upd('hoa_monthly', v)}
          />
        </Field>
        <Field label="Beds">
          <NumInput value={draft.bedrooms ?? null} onChange={(v) => upd('bedrooms', v)} />
        </Field>
        <Field label="Baths">
          <NumInput value={draft.bathrooms ?? null} onChange={(v) => upd('bathrooms', v)} />
        </Field>
        <Field label="Sqft">
          <NumInput value={draft.sqft ?? null} onChange={(v) => upd('sqft', v)} />
        </Field>
        <Field label="Lot sqft">
          <NumInput value={draft.lot_sqft ?? null} onChange={(v) => upd('lot_sqft', v)} />
        </Field>
        <Field label="Year built">
          <NumInput value={draft.year_built ?? null} onChange={(v) => upd('year_built', v)} />
        </Field>
        <Field label="Property type">
          <input
            value={draft.property_type || ''}
            onChange={(e) => upd('property_type', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="Parking type">
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
        </Field>
        <Field label="Parking spaces">
          <NumInput
            value={draft.parking_spaces ?? null}
            onChange={(v) => upd('parking_spaces', v)}
          />
        </Field>
        <Field label="Photo URL" colspan={2}>
          <input
            value={draft.photo_url || ''}
            onChange={(e) => upd('photo_url', e.target.value)}
            placeholder="https://..."
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="Outdoor features" colspan={4}>
          <div className="flex flex-wrap gap-2">
            {OUTDOOR_FEATURES.map((f) => {
              const checked = (draft.outdoor_features || []).includes(f.value)
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    const current = draft.outdoor_features || []
                    const next = checked
                      ? current.filter((x) => x !== f.value)
                      : [...current, f.value]
                    upd('outdoor_features', next)
                  }}
                  className={`text-2xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                    checked
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-cream text-ink-600 border-ink-200 hover:border-ink-400'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="Notes" colspan={4}>
          <textarea
            value={draft.notes || ''}
            onChange={(e) => upd('notes', e.target.value)}
            rows={3}
            placeholder="Anything you want to remember about this one…"
            className="w-full border border-ink-200 px-3 py-2 text-sm bg-cream"
          />
        </Field>
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
// Dialog chrome + small atoms
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

function Field({
  label,
  children,
  colspan,
}: {
  label: string
  children: React.ReactNode
  colspan?: number
}) {
  // Explicit class strings — Tailwind needs them at build time.
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
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
        {label}
      </label>
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

function detectSource(url: string): 'zillow' | 'redfin' | 'realtor' | 'other' {
  const u = url.toLowerCase()
  if (u.includes('zillow.com')) return 'zillow'
  if (u.includes('redfin.com')) return 'redfin'
  if (u.includes('realtor.com')) return 'realtor'
  return 'other'
}

// ============================================================
// Request-tour dialog (P9.3 — submits to submit_tour_request Edge Function)
// ============================================================
function RequestTourDialog({
  listing,
  accessToken,
  onClose,
  onSubmitted,
}: {
  listing: ExternalListing
  accessToken: string
  onClose: () => void
  onSubmitted: () => void
}) {
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [alternateDate, setAlternateDate] = useState('')
  const [alternateTime, setAlternateTime] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addressLine =
    [listing.address, listing.city, listing.state].filter(Boolean).join(', ') ||
    'this property'
  // 24-hour minimum advance notice — earliest allowed date is tomorrow.
  // (A true sub-24-hour check needs combined date+time validation; this is the
  //  pragmatic floor that prevents same-day requests.)
  const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  async function handleSubmit() {
    if (!preferredDate) {
      setError('Pick a preferred date.')
      return
    }
    if (!accessToken) {
      setError('Not signed in.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/submit_tour_request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          external_listing_id: listing.id,
          client_id: listing.client_id,
          preferred_date: preferredDate,
          preferred_time: preferredTime || null,
          alternate_date: alternateDate || null,
          alternate_time: alternateTime || null,
          notes: notes || null,
        }),
      })
      const json = await resp.json()
      if (!resp.ok || !json.ok) {
        throw new Error(json.error || `HTTP ${resp.status}`)
      }
      onSubmitted()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogShell onClose={onClose} title="Request a tour">
      <p className="text-sm text-ink-600 mb-5">
        Schedule a tour of{' '}
        <span className="text-ink-900 font-medium">{addressLine}</span>. Your agent gets an
        email immediately and confirms (or proposes a new time) in the situation room. Tours need at
        least 24 hours notice — earliest available is tomorrow.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Field label="Preferred date">
          <input
            type="date"
            value={preferredDate}
            min={minDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="Preferred time">
          <input
            type="time"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="Alternate date (optional)">
          <input
            type="date"
            value={alternateDate}
            min={minDate}
            onChange={(e) => setAlternateDate(e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="Alternate time (optional)">
          <input
            type="time"
            value={alternateTime}
            onChange={(e) => setAlternateTime(e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="Notes (optional)" colspan={2}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything your agent should know — financing status, must-see features, parking access, etc."
            className="w-full border border-ink-200 px-3 py-2 text-sm bg-cream"
          />
        </Field>
      </div>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-ink-200 pt-4">
        <button
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !preferredDate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Calendar className="w-3.5 h-3.5" />
          )}
          Send tour request
        </button>
      </div>
    </DialogShell>
  )
}
