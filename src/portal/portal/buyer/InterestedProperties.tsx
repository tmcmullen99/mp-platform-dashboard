// src/portal/buyer/InterestedProperties.tsx
//
// The buyer's core surface: a rankable list of interested properties. Paste a
// Zillow/Redfin/Realtor link -> fetch_zillow_listing parses it -> a card is
// added. Drag cards to reorder most→least interested (persists sort_order).
// Each card shows enough Zillow data to compare at a glance and clicks through
// to the per-property detail page. Create/edit/delete from both agent & client.
//
// Data path: client_external_listings + fetch_zillow_listing edge function,
// both pre-existing. This screen owns the add + rank UX; PropertyDetail owns
// the deep per-property workspace.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Loader2,
  Plus,
  GripVertical,
  Heart,
  Trash2,
  X,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  supabase,
  SUPABASE_URL,
  ExternalListing,
  EXTERNAL_LISTING_STATUSES,
} from '@/lib/supabase'
import { PageHeader, Badge, EmptyState, PrimaryButton, GhostButton } from '@/portal/shared/ui'
import { usd } from '@/portal/shared/format'

function detectSource(url: string): ExternalListing['source_kind'] {
  const u = url.toLowerCase()
  if (u.includes('zillow')) return 'zillow'
  if (u.includes('redfin')) return 'redfin'
  if (u.includes('realtor')) return 'realtor'
  return 'other'
}

export default function InterestedProperties() {
  const { clientProfile, session } = useAuth()
  const [items, setItems] = useState<ExternalListing[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const dragId = useRef<string | null>(null)

  async function load() {
    if (!clientProfile) return
    const { data } = await supabase
      .from('client_external_listings')
      .select('*')
      .eq('client_id', clientProfile.id)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    setItems((data as ExternalListing[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientProfile])

  // Persist the current order to sort_order (0-based, most interested first).
  async function persistOrder(ordered: ExternalListing[]) {
    setItems(ordered)
    await Promise.all(
      ordered.map((it, idx) =>
        supabase
          .from('client_external_listings')
          .update({ sort_order: idx, updated_at: new Date().toISOString() })
          .eq('id', it.id),
      ),
    )
  }

  function onDrop(targetId: string) {
    const fromId = dragId.current
    dragId.current = null
    if (!fromId || fromId === targetId) return
    const fromIdx = items.findIndex((i) => i.id === fromId)
    const toIdx = items.findIndex((i) => i.id === targetId)
    if (fromIdx < 0 || toIdx < 0) return
    const next = [...items]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    persistOrder(next)
  }

  async function toggleFavorite(it: ExternalListing) {
    const next = !it.is_favorite
    setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, is_favorite: next } : p)))
    await supabase
      .from('client_external_listings')
      .update({ is_favorite: next, updated_at: new Date().toISOString() })
      .eq('id', it.id)
  }

  async function remove(it: ExternalListing) {
    if (!confirm(`Remove ${it.address || 'this property'} from your list?`)) return
    setItems((prev) => prev.filter((p) => p.id !== it.id))
    await supabase.from('client_external_listings').delete().eq('id', it.id)
  }

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-ink-500" />

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <PageHeader eyebrow="Interested Properties" title="Homes you're tracking.">
          Paste a Zillow, Redfin, or Realtor.com link and we'll pull in the details. Drag to rank
          them most-to-least interested — you and your agent see the same order.
        </PageHeader>
        <PrimaryButton onClick={() => setShowAdd(true)} className="shrink-0">
          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
          Add property
        </PrimaryButton>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No properties yet"
          body="Paste any listing link to add your first property. We'll fetch the photo, price, beds, baths, and more automatically."
          action={
            <PrimaryButton onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5" />
              Add a property
            </PrimaryButton>
          }
        />
      ) : (
        <ol className="space-y-3">
          {items.map((it, idx) => {
            const status = EXTERNAL_LISTING_STATUSES.find((s) => s.value === it.client_status)
            return (
              <li
                key={it.id}
                draggable
                onDragStart={() => (dragId.current = it.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(it.id)}
                className="group flex items-stretch bg-white border border-ink-200 hover:border-ink-400 transition-colors"
              >
                {/* Rank + drag handle */}
                <div className="flex flex-col items-center justify-center px-3 border-r border-ink-100 cursor-grab active:cursor-grabbing text-slate">
                  <span className="font-display text-lg text-ink-900 leading-none">{idx + 1}</span>
                  <GripVertical className="w-4 h-4 mt-1" strokeWidth={1.5} />
                </div>

                {/* Photo */}
                <Link to={`/portal/property/${it.id}`} className="shrink-0">
                  {it.photo_url ? (
                    <img
                      src={it.photo_url}
                      alt={it.address || ''}
                      className="w-28 h-full object-cover"
                    />
                  ) : (
                    <div className="w-28 h-full min-h-[88px] bg-ink-100" />
                  )}
                </Link>

                {/* Body */}
                <Link to={`/portal/property/${it.id}`} className="flex-1 min-w-0 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {status && (
                      <span className={`text-2xs uppercase tracking-widest px-2 py-0.5 ${status.color}`}>
                        {status.label}
                      </span>
                    )}
                    {it.is_favorite && <Badge tone="dark">Favorite</Badge>}
                  </div>
                  <div className="font-display text-lg text-ink-900 leading-tight truncate">
                    {it.address || 'Property'}
                  </div>
                  <div className="text-sm text-ink-600 mt-0.5">
                    {usd(it.price)}
                    {it.bedrooms ? ` · ${it.bedrooms} bd` : ''}
                    {it.bathrooms ? ` · ${it.bathrooms} ba` : ''}
                    {it.sqft ? ` · ${it.sqft.toLocaleString()} sqft` : ''}
                    {it.price && it.sqft ? ` · $${Math.round(it.price / it.sqft)}/sqft` : ''}
                  </div>
                </Link>

                {/* Actions */}
                <div className="flex flex-col items-center justify-center gap-2 px-3 border-l border-ink-100">
                  <button
                    onClick={() => toggleFavorite(it)}
                    className={it.is_favorite ? 'text-ink-900' : 'text-ink-300 hover:text-ink-900'}
                    title="Favorite"
                  >
                    <Heart className="w-4 h-4" fill={it.is_favorite ? 'currentColor' : 'none'} strokeWidth={1.5} />
                  </button>
                  <Link to={`/portal/property/${it.id}`} className="text-ink-400 hover:text-ink-900" title="Open">
                    <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
                  </Link>
                  <button
                    onClick={() => remove(it)}
                    className="text-ink-300 hover:text-red-700"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {showAdd && clientProfile && (
        <AddPropertyModal
          clientId={clientProfile.id}
          tenantId={clientProfile.tenant_id}
          accessToken={session?.access_token || ''}
          nextSort={items.length}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false)
            load()
          }}
        />
      )}
    </div>
  )
}

// --- Add modal: paste link -> fetch_zillow_listing -> review -> save ---------
function AddPropertyModal({
  clientId,
  tenantId,
  accessToken,
  nextSort,
  onClose,
  onAdded,
}: {
  clientId: string
  tenantId: string
  accessToken: string
  nextSort: number
  onClose: () => void
  onAdded: () => void
}) {
  const [url, setUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<ExternalListing> | null>(null)

  async function handleFetch() {
    if (!url.trim()) return
    setError(null)
    setFetching(true)
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/fetch_zillow_listing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
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
          price: e.price ?? null,
          bedrooms: e.bedrooms ?? null,
          bathrooms: e.bathrooms ?? null,
          sqft: e.sqft ?? null,
          year_built: e.yearBuilt ?? null,
          property_type: e.propertyType || '',
          photo_url: e.photoUrl || '',
          outdoor_features: Array.isArray(e.outdoorFeatures) ? e.outdoorFeatures : [],
          fetch_status: 'success',
        })
      } else {
        setDraft({
          source_url: url,
          source_kind: detectSource(url),
          outdoor_features: [],
          fetch_status: 'manual',
        })
        setError((json.reason || 'Could not auto-fill') + ' — add the address below and save.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setFetching(false)
    }
  }

  async function handleSave() {
    if (!draft) return
    setSaving(true)
    setError(null)
    try {
      const { error: insErr } = await supabase.from('client_external_listings').insert({
        tenant_id: tenantId,
        client_id: clientId,
        added_by_type: 'client',
        source_kind: draft.source_kind || 'other',
        source_url: draft.source_url || url,
        address: draft.address || null,
        city: draft.city || null,
        state: draft.state || null,
        zip: draft.zip || null,
        price: draft.price ?? null,
        bedrooms: draft.bedrooms ?? null,
        bathrooms: draft.bathrooms ?? null,
        sqft: draft.sqft ?? null,
        year_built: draft.year_built ?? null,
        property_type: draft.property_type || null,
        photo_url: draft.photo_url || null,
        outdoor_features: draft.outdoor_features || [],
        client_status: 'interested',
        fetch_status: draft.fetch_status || 'manual',
        sort_order: nextSort,
      })
      if (insErr) throw insErr
      onAdded()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm flex items-start justify-center p-6 md:p-12 overflow-y-auto">
      <div className="bg-cream w-full max-w-lg shadow-2xl border border-ink-200">
        <div className="flex items-center justify-between p-6 border-b border-ink-200">
          <h2 className="font-display text-xl text-ink-900">Add a property</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-2xs uppercase tracking-widest text-slate mb-2">
              Listing link
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a Zillow / Redfin / Realtor link"
                className="flex-1 px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
              />
              <GhostButton onClick={handleFetch} disabled={fetching || !url.trim()}>
                {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Fetch'}
              </GhostButton>
            </div>
          </div>

          {error && (
            <div className="bg-amber-50 text-amber-800 text-xs px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={1.5} />
              <span>{error}</span>
            </div>
          )}

          {draft && (
            <div className="space-y-4 border-t border-ink-100 pt-5">
              {draft.photo_url && (
                <img
                  src={draft.photo_url}
                  alt=""
                  className="w-full aspect-[16/10] object-cover border border-ink-200"
                />
              )}
              <div>
                <label className="block text-2xs uppercase tracking-widest text-slate mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={draft.address || ''}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                  placeholder="123 Main St, City, ST"
                  className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <NumField label="Price" value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })} />
                <NumField label="Beds" value={draft.bedrooms} onChange={(v) => setDraft({ ...draft, bedrooms: v })} />
                <NumField label="Baths" value={draft.bathrooms} onChange={(v) => setDraft({ ...draft, bathrooms: v })} />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-ink-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-ink-600 hover:text-ink-900">
            Cancel
          </button>
          <PrimaryButton onClick={handleSave} disabled={!draft || saving}>
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Add to my list
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null | undefined
  onChange: (v: number | null) => void
}) {
  return (
    <div>
      <label className="block text-2xs uppercase tracking-widest text-slate mb-2">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900 font-mono"
      />
    </div>
  )
}
