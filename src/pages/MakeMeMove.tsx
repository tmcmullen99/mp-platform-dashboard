// C1 — Make-Me-Move agent surface.
//
// Route: /make-me-move
//
// Off-MLS opportunities: a price an owner would accept, surfaced to qualified
// buyers without a live listing and no marketing spend until an offer lands.
// This is the agent cockpit for that inventory — create, edit, and run the
// status lifecycle (active → paused → withdrawn → converted → expired).
//
// Backend (all verified live):
//   table  public.make_me_move_listings
//   status  active | paused | withdrawn | converted | expired   (default active)
//   visibility  private | agent_only | market | database         (default database)
//   RLS  mmm_rw — agent/admin read+write within tenant
//   FKs  market_id→markets, contact_id→contacts, unit_id→units (all SET NULL)

import { useEffect, useMemo, useState } from 'react'
import {
  Tag,
  Plus,
  Pencil,
  X,
  Loader2,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

type MMMListing = {
  id: string
  tenant_id: string
  market_id: string | null
  contact_id: string | null
  street_address: string | null
  unit_label: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  neighborhood: string | null
  property_type: string | null
  beds: number | null
  baths: number | null
  area_sqft: number | null
  year_built: number | null
  make_me_move_price: number
  motivation: string | null
  timeframe: string | null
  description: string | null
  visibility: string
  status: string
  source: string
  created_at: string
}

type Market = { id: string; name: string }
type ContactLite = { id: string; first_name: string | null; last_name: string | null; email: string | null }

const STATUSES = ['active', 'paused', 'withdrawn', 'converted', 'expired'] as const
const VISIBILITIES = ['private', 'agent_only', 'market', 'database'] as const
const PROPERTY_TYPES = ['Single Family Home', 'Condo', 'TIC', 'Co-op', 'Loft', 'Multi-Family', 'Acreage']

const VIS_LABEL: Record<string, string> = {
  private: 'Private',
  agent_only: 'Agent network',
  market: 'Market feed',
  database: 'Database',
}

function money(n: number | null): string {
  if (n == null) return '—'
  return `$${Math.round(n).toLocaleString()}`
}

function contactLabel(c: ContactLite): string {
  const n = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
  return n || c.email || 'Unnamed contact'
}

function statusBadge(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-ink-900 text-cream'
    case 'converted':
      return 'bg-emerald-50 text-emerald-700'
    case 'paused':
      return 'bg-sky-50 text-sky-700'
    default:
      return 'bg-ink-100 text-ink-500'
  }
}

export default function MakeMeMove() {
  const { currentTenant, profile } = useAuth()
  const [listings, setListings] = useState<MMMListing[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [contacts, setContacts] = useState<ContactLite[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<MMMListing | null>(null)
  const [creating, setCreating] = useState(false)
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null)

  async function load() {
    if (!currentTenant) return
    setLoading(true)
    const [{ data: ld }, { data: mk }, { data: ct }] = await Promise.all([
      supabase
        .from('make_me_move_listings')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false }),
      supabase.from('markets').select('id, name').eq('tenant_id', currentTenant.id).order('name'),
      supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', currentTenant.id)
        .order('last_name', { nullsFirst: false })
        .limit(500),
    ])
    setListings((ld as MMMListing[]) || [])
    setMarkets((mk as Market[]) || [])
    setContacts((ct as ContactLite[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.id])

  const marketName = useMemo(() => {
    const m = new Map<string, string>()
    markets.forEach((x) => m.set(x.id, x.name))
    return m
  }, [markets])

  const contactName = useMemo(() => {
    const m = new Map<string, string>()
    contacts.forEach((x) => m.set(x.id, contactLabel(x)))
    return m
  }, [contacts])

  async function changeStatus(listing: MMMListing, status: string) {
    if (status === listing.status) return
    setSavingStatusId(listing.id)
    const { error } = await supabase
      .from('make_me_move_listings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', listing.id)
    if (!error) {
      setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, status } : l)))
    } else {
      window.alert(`Couldn't update status: ${error.message}`)
    }
    setSavingStatusId(null)
  }

  if (!currentTenant) {
    return (
      <div className="p-10 flex items-center gap-3 text-ink-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    )
  }

  const activeCount = listings.filter((l) => l.status === 'active').length

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">Marketplace</div>
          <h1 className="font-display text-3xl text-ink-900">Make-Me-Move</h1>
          <p className="text-ink-600 mt-2 max-w-2xl leading-relaxed">
            Prices owners would quietly accept — surfaced to qualified buyers with no listing and no
            marketing spend until an offer materializes.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> New listing
        </button>
      </div>

      {!loading && listings.length > 0 && (
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-6">
          {activeCount} active · {listings.length} total
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-2xs uppercase tracking-widest text-ink-500">Loading…</div>
      ) : listings.length === 0 ? (
        <div className="border border-dashed border-ink-200 py-16 text-center">
          <Tag className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.25} />
          <div className="text-sm text-ink-700 font-medium">No make-me-move listings yet</div>
          <p className="text-ink-500 text-sm mt-1">
            Capture an owner’s walk-away number and it becomes off-market inventory you can match to buyers.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 border border-ink-300 text-2xs uppercase tracking-widest text-ink-800 hover:border-ink-900"
          >
            <Plus className="w-3.5 h-3.5" /> Add the first one
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <div key={l.id} className="border border-ink-200 bg-cream p-5">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-display text-xl text-ink-900 truncate">
                      {l.street_address || 'Address TBD'}
                      {l.unit_label ? ` ${l.unit_label}` : ''}
                    </h3>
                    <span className={`text-2xs uppercase tracking-widest px-2 py-0.5 ${statusBadge(l.status)}`}>
                      {l.status}
                    </span>
                    <span className="text-2xs uppercase tracking-widest px-2 py-0.5 bg-ink-100 text-ink-500">
                      {VIS_LABEL[l.visibility] || l.visibility}
                    </span>
                  </div>

                  {(l.city || l.neighborhood || l.market_id) && (
                    <div className="text-sm text-ink-600 truncate inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-ink-400 shrink-0" />
                      {[l.neighborhood, l.city, l.state].filter(Boolean).join(', ') || '—'}
                      {l.market_id && marketName.get(l.market_id) ? ` · ${marketName.get(l.market_id)}` : ''}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-2xs uppercase tracking-widest text-ink-500 flex-wrap">
                    {l.property_type && <span>{l.property_type}</span>}
                    {l.beds != null && (
                      <span className="inline-flex items-center gap-1">
                        <BedDouble className="w-3 h-3" /> {l.beds}
                      </span>
                    )}
                    {l.baths != null && (
                      <span className="inline-flex items-center gap-1">
                        <Bath className="w-3 h-3" /> {l.baths}
                      </span>
                    )}
                    {l.area_sqft != null && (
                      <span className="inline-flex items-center gap-1">
                        <Ruler className="w-3 h-3" /> {l.area_sqft.toLocaleString()} sqft
                      </span>
                    )}
                  </div>

                  {(l.contact_id && contactName.get(l.contact_id)) || l.timeframe || l.motivation ? (
                    <div className="text-xs text-ink-500 mt-2 truncate">
                      {l.contact_id && contactName.get(l.contact_id) ? `Owner: ${contactName.get(l.contact_id)}` : ''}
                      {l.timeframe ? `${l.contact_id ? ' · ' : ''}${l.timeframe}` : ''}
                      {l.motivation ? `${l.contact_id || l.timeframe ? ' · ' : ''}${l.motivation}` : ''}
                    </div>
                  ) : null}
                </div>

                <div className="text-right shrink-0">
                  <div className="font-display text-2xl text-ink-900 tabular-nums leading-none">
                    {money(l.make_me_move_price)}
                  </div>
                  <div className="text-2xs uppercase tracking-widest text-ink-500 mt-1">walk-away</div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-ink-100 flex-wrap">
                <button
                  onClick={() => setEditing(l)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-ink-300 text-2xs uppercase tracking-widest text-ink-700 hover:border-ink-900 hover:text-ink-900"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <label className="inline-flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-500 ml-auto">
                  Status
                  <select
                    value={l.status}
                    disabled={savingStatusId === l.id}
                    onChange={(e) => changeStatus(l, e.target.value)}
                    className="border border-ink-200 px-2 py-1 text-2xs uppercase tracking-widest bg-cream focus:outline-none focus:border-ink-900 disabled:opacity-50"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {savingStatusId === l.id && <Loader2 className="w-3 h-3 animate-spin" />}
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ListingForm
          listing={editing}
          tenantId={currentTenant.id}
          userId={profile?.id ?? null}
          markets={markets}
          contacts={contacts}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

// ===========================================================================
// Create / edit form
// ===========================================================================

type FormState = {
  make_me_move_price: string
  street_address: string
  unit_label: string
  city: string
  state: string
  postal_code: string
  neighborhood: string
  property_type: string
  beds: string
  baths: string
  area_sqft: string
  year_built: string
  motivation: string
  timeframe: string
  description: string
  visibility: string
  status: string
  market_id: string
  contact_id: string
}

function initialForm(listing: MMMListing | null): FormState {
  const num = (n: number | null) => (n == null ? '' : String(n))
  return {
    make_me_move_price: num(listing?.make_me_move_price ?? null),
    street_address: listing?.street_address ?? '',
    unit_label: listing?.unit_label ?? '',
    city: listing?.city ?? '',
    state: listing?.state ?? '',
    postal_code: listing?.postal_code ?? '',
    neighborhood: listing?.neighborhood ?? '',
    property_type: listing?.property_type ?? '',
    beds: num(listing?.beds ?? null),
    baths: num(listing?.baths ?? null),
    area_sqft: num(listing?.area_sqft ?? null),
    year_built: num(listing?.year_built ?? null),
    motivation: listing?.motivation ?? '',
    timeframe: listing?.timeframe ?? '',
    description: listing?.description ?? '',
    visibility: listing?.visibility ?? 'database',
    status: listing?.status ?? 'active',
    market_id: listing?.market_id ?? '',
    contact_id: listing?.contact_id ?? '',
  }
}

function ListingForm({
  listing,
  tenantId,
  userId,
  markets,
  contacts,
  onClose,
  onSaved,
}: {
  listing: MMMListing | null
  tenantId: string
  userId: string | null
  markets: Market[]
  contacts: ContactLite[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!listing
  const [f, setF] = useState<FormState>(() => initialForm(listing))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof FormState>(key: K, value: string) {
    setF((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    const price = parseFloat(f.make_me_move_price)
    if (!f.make_me_move_price || isNaN(price) || price <= 0) {
      setError('A walk-away price is required.')
      return
    }
    setError(null)
    setSaving(true)

    const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s))
    const txtOrNull = (s: string) => (s.trim() === '' ? null : s.trim())

    const payload = {
      make_me_move_price: price,
      street_address: txtOrNull(f.street_address),
      unit_label: txtOrNull(f.unit_label),
      city: txtOrNull(f.city),
      state: txtOrNull(f.state),
      postal_code: txtOrNull(f.postal_code),
      neighborhood: txtOrNull(f.neighborhood),
      property_type: txtOrNull(f.property_type),
      beds: numOrNull(f.beds),
      baths: numOrNull(f.baths),
      area_sqft: numOrNull(f.area_sqft),
      year_built: numOrNull(f.year_built),
      motivation: txtOrNull(f.motivation),
      timeframe: txtOrNull(f.timeframe),
      description: txtOrNull(f.description),
      visibility: f.visibility,
      status: f.status,
      market_id: f.market_id || null,
      contact_id: f.contact_id || null,
      updated_at: new Date().toISOString(),
    }

    let errMsg: string | null = null
    if (isEdit && listing) {
      const { error } = await supabase.from('make_me_move_listings').update(payload).eq('id', listing.id)
      errMsg = error?.message ?? null
    } else {
      const { error } = await supabase.from('make_me_move_listings').insert({
        ...payload,
        tenant_id: tenantId,
        source: 'agent_added',
        created_by_user_id: userId,
      })
      errMsg = error?.message ?? null
    }

    setSaving(false)
    if (errMsg) {
      setError(errMsg)
      return
    }
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/40 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-cream border border-ink-200 w-full max-w-2xl mt-10 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5 pb-4 border-b border-ink-200">
          <h2 className="font-display text-2xl text-ink-900 leading-tight">
            {isEdit ? 'Edit make-me-move listing' : 'New make-me-move listing'}
          </h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Price */}
        <Field label="Walk-away price" required>
          <input
            type="number"
            inputMode="numeric"
            value={f.make_me_move_price}
            onChange={(e) => set('make_me_move_price', e.target.value)}
            placeholder="2750000"
            className="w-full border border-ink-200 px-3 py-2 text-sm bg-cream focus:outline-none focus:border-ink-900"
          />
        </Field>

        {/* Address */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="col-span-2">
            <Field label="Street address">
              <input value={f.street_address} onChange={(e) => set('street_address', e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="Unit">
            <input value={f.unit_label} onChange={(e) => set('unit_label', e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="col-span-2">
            <Field label="Neighborhood">
              <input value={f.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="City">
            <input value={f.city} onChange={(e) => set('city', e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="State">
              <input value={f.state} onChange={(e) => set('state', e.target.value)} className={inputCls} />
            </Field>
            <Field label="ZIP">
              <input value={f.postal_code} onChange={(e) => set('postal_code', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </div>

        {/* Property */}
        <div className="grid grid-cols-5 gap-3 mt-4">
          <div className="col-span-1">
            <Field label="Beds">
              <input type="number" value={f.beds} onChange={(e) => set('beds', e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="col-span-1">
            <Field label="Baths">
              <input type="number" value={f.baths} onChange={(e) => set('baths', e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="col-span-1">
            <Field label="Sq ft">
              <input type="number" value={f.area_sqft} onChange={(e) => set('area_sqft', e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="col-span-1">
            <Field label="Year">
              <input type="number" value={f.year_built} onChange={(e) => set('year_built', e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="col-span-1">
            <Field label="Type">
              <select value={f.property_type} onChange={(e) => set('property_type', e.target.value)} className={inputCls}>
                <option value="">—</option>
                {PROPERTY_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Context */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Field label="Timeframe">
            <input
              value={f.timeframe}
              onChange={(e) => set('timeframe', e.target.value)}
              placeholder="e.g. Spring 2027, no rush"
              className={inputCls}
            />
          </Field>
          <Field label="Motivation">
            <input
              value={f.motivation}
              onChange={(e) => set('motivation', e.target.value)}
              placeholder="e.g. Downsizing once kids graduate"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Description">
            <textarea
              value={f.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>
        </div>

        {/* Links + controls */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Field label="Market">
            <select value={f.market_id} onChange={(e) => set('market_id', e.target.value)} className={inputCls}>
              <option value="">— None —</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Owner contact">
            <select value={f.contact_id} onChange={(e) => set('contact_id', e.target.value)} className={inputCls}>
              <option value="">— None —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {contactLabel(c)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Field label="Visibility">
            <select value={f.visibility} onChange={(e) => set('visibility', e.target.value)} className={inputCls}>
              {VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {VIS_LABEL[v]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={f.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 mt-4">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-ink-200 pt-4 mt-5">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create listing'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full border border-ink-200 px-3 py-2 text-sm bg-cream focus:outline-none focus:border-ink-900'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
      {children}
    </label>
  )
}
