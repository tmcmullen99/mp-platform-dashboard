// C2 + A — Buyer Feed agent surface, with listing matching.
//
// Route: /buyer-feed
//
// Saved buyer searches. Each subscription now shows the supply side too — which
// make-me-move listings currently match this buyer's criteria
// (match_listings_for_subscription, only_unsent=false so we show all matches).
//
// Backend (all verified live):
//   table  public.buyer_feed_subscriptions
//   frequency  instant | daily | weekly   (default instant)
//   contact_id  REQUIRED (FK -> contacts, CASCADE) — the buyer
//   RLS  bfs_rw — agent/admin read+write within tenant
//   rpc  match_listings_for_subscription(p_subscription_id uuid, p_only_unsent boolean)
//          -> listing_id, make_me_move_price, street_address, city,
//             neighborhood, beds, baths, property_type

import { useEffect, useMemo, useState } from 'react'
import {
  Rss,
  Plus,
  Pencil,
  X,
  Loader2,
  Pause,
  Play,
  MapPin,
  Home,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

type Subscription = {
  id: string
  tenant_id: string
  market_id: string | null
  contact_id: string
  min_price: number | null
  max_price: number | null
  min_beds: number | null
  property_types: string[] | null
  neighborhoods: string[] | null
  channel: string
  frequency: string
  is_active: boolean
  created_at: string
}

type ListingMatch = {
  listing_id: string
  make_me_move_price: number | null
  street_address: string | null
  city: string | null
  neighborhood: string | null
  beds: number | null
  baths: number | null
  property_type: string | null
}

type Market = { id: string; name: string }
type ContactLite = { id: string; first_name: string | null; last_name: string | null; email: string | null }

const FREQUENCIES = ['instant', 'daily', 'weekly'] as const
const PROPERTY_TYPES = ['Single Family Home', 'Condo', 'TIC', 'Co-op', 'Loft', 'Multi-Family', 'Acreage']

function money(n: number | null): string {
  if (n == null) return '—'
  return `$${Math.round(n).toLocaleString()}`
}

function priceLabel(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${money(min)} – ${money(max)}`
  if (min != null) return `${money(min)}+`
  if (max != null) return `up to ${money(max)}`
  return null
}

function contactLabel(c: ContactLite): string {
  const n = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
  return n || c.email || 'Unnamed contact'
}

export default function BuyerFeed() {
  const { currentTenant } = useAuth()
  const [subs, setSubs] = useState<Subscription[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [contacts, setContacts] = useState<ContactLite[]>([])
  const [matches, setMatches] = useState<Map<string, ListingMatch[]>>(new Map())
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [creating, setCreating] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function load() {
    if (!currentTenant) return
    setLoading(true)
    const [{ data: sd }, { data: mk }, { data: ct }] = await Promise.all([
      supabase
        .from('buyer_feed_subscriptions')
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
    const rows = (sd as Subscription[]) || []
    setSubs(rows)
    setMarkets((mk as Market[]) || [])
    setContacts((ct as ContactLite[]) || [])
    setLoading(false)
    loadMatches(rows)
  }

  async function loadMatches(rows: Subscription[]) {
    if (rows.length === 0) {
      setMatches(new Map())
      return
    }
    setMatchesLoading(true)
    const entries = await Promise.all(
      rows.map(async (s) => {
        const { data } = await supabase.rpc('match_listings_for_subscription', {
          p_subscription_id: s.id,
          p_only_unsent: false,
        })
        return [s.id, (data as ListingMatch[]) || []] as const
      }),
    )
    setMatches(new Map(entries))
    setMatchesLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.id])

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

  async function toggleActive(sub: Subscription) {
    setTogglingId(sub.id)
    const next = !sub.is_active
    const { error } = await supabase
      .from('buyer_feed_subscriptions')
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq('id', sub.id)
    if (!error) {
      setSubs((prev) => prev.map((s) => (s.id === sub.id ? { ...s, is_active: next } : s)))
    } else {
      window.alert(`Couldn't update: ${error.message}`)
    }
    setTogglingId(null)
  }

  if (!currentTenant) {
    return (
      <div className="p-10 flex items-center gap-3 text-ink-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    )
  }

  const activeCount = subs.filter((s) => s.is_active).length

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">Marketplace</div>
          <h1 className="font-display text-3xl text-ink-900">Buyer feed</h1>
          <p className="text-ink-600 mt-2 max-w-2xl leading-relaxed">
            Saved buyer searches. When matching off-market or coming-soon inventory appears, it goes
            straight to these buyers — instant, daily, or weekly.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> New subscription
        </button>
      </div>

      {!loading && subs.length > 0 && (
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-6">
          {activeCount} active · {subs.length} total
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-2xs uppercase tracking-widest text-ink-500">Loading…</div>
      ) : subs.length === 0 ? (
        <div className="border border-dashed border-ink-200 py-16 text-center">
          <Rss className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.25} />
          <div className="text-sm text-ink-700 font-medium">No buyer subscriptions yet</div>
          <p className="text-ink-500 text-sm mt-1">
            Capture what a buyer is looking for and matching inventory routes to them automatically.
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
          {subs.map((s) => {
            const criteria = [
              priceLabel(s.min_price, s.max_price),
              s.min_beds != null ? `${s.min_beds}+ bd` : null,
              s.property_types && s.property_types.length ? s.property_types.join(', ') : null,
              s.neighborhoods && s.neighborhoods.length ? s.neighborhoods.join(', ') : null,
            ].filter(Boolean) as string[]
            const listings = matches.get(s.id) || []
            const open = expanded.has(s.id)
            return (
              <div key={s.id} className={`border bg-cream p-5 ${s.is_active ? 'border-ink-200' : 'border-ink-100 opacity-70'}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-display text-xl text-ink-900 truncate">
                        {contactName.get(s.contact_id) || 'Unknown buyer'}
                      </h3>
                      <span
                        className={`text-2xs uppercase tracking-widest px-2 py-0.5 ${
                          s.is_active ? 'bg-ink-900 text-cream' : 'bg-ink-100 text-ink-500'
                        }`}
                      >
                        {s.is_active ? 'active' : 'paused'}
                      </span>
                      <span className="text-2xs uppercase tracking-widest px-2 py-0.5 bg-sky-50 text-sky-700">
                        {s.frequency}
                      </span>
                    </div>

                    {s.market_id && marketName.get(s.market_id) && (
                      <div className="text-sm text-ink-600 inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-ink-400 shrink-0" />
                        {marketName.get(s.market_id)}
                      </div>
                    )}

                    <div className="text-sm text-ink-700 mt-2">
                      {criteria.length ? criteria.join('  ·  ') : 'Any listing in the feed'}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => setEditing(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-ink-300 text-2xs uppercase tracking-widest text-ink-700 hover:border-ink-900 hover:text-ink-900"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => toggleActive(s)}
                      disabled={togglingId === s.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-ink-200 text-2xs uppercase tracking-widest text-ink-600 hover:border-ink-900 hover:text-ink-900 disabled:opacity-50"
                    >
                      {togglingId === s.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : s.is_active ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      {s.is_active ? 'Pause' : 'Resume'}
                    </button>
                  </div>
                </div>

                {/* A — matching listings */}
                <div className="mt-3 pt-3 border-t border-ink-100">
                  {matchesLoading ? (
                    <span className="text-2xs uppercase tracking-widest text-ink-400 inline-flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Matching listings…
                    </span>
                  ) : listings.length === 0 ? (
                    <span className="text-2xs uppercase tracking-widest text-ink-400 inline-flex items-center gap-1.5">
                      <Home className="w-3 h-3" /> No matching listings yet
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => toggleExpanded(s.id)}
                        className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-900 hover:text-ink-600"
                      >
                        <Home className="w-3 h-3" />
                        {listings.length} matching listing{listings.length === 1 ? '' : 's'}
                        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                      {open && (
                        <ul className="mt-2 space-y-1.5">
                          {listings.map((m) => {
                            const spec = [
                              m.beds != null ? `${m.beds} bd` : null,
                              m.baths != null ? `${m.baths} ba` : null,
                              m.property_type,
                            ]
                              .filter(Boolean)
                              .join(' · ')
                            return (
                              <li key={m.listing_id} className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-ink-800 truncate">
                                  {m.street_address || m.neighborhood || m.city || 'Listing'}
                                  {spec ? <span className="text-ink-400"> · {spec}</span> : null}
                                </span>
                                <span className="text-ink-900 tabular-nums shrink-0">
                                  {money(m.make_me_move_price)}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(creating || editing) && (
        <SubscriptionForm
          sub={editing}
          tenantId={currentTenant.id}
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
  contact_id: string
  market_id: string
  min_price: string
  max_price: string
  min_beds: string
  property_types: string[]
  neighborhoods: string
  frequency: string
  is_active: boolean
}

function initialForm(sub: Subscription | null): FormState {
  const num = (n: number | null) => (n == null ? '' : String(n))
  return {
    contact_id: sub?.contact_id ?? '',
    market_id: sub?.market_id ?? '',
    min_price: num(sub?.min_price ?? null),
    max_price: num(sub?.max_price ?? null),
    min_beds: num(sub?.min_beds ?? null),
    property_types: sub?.property_types ?? [],
    neighborhoods: (sub?.neighborhoods ?? []).join(', '),
    frequency: sub?.frequency ?? 'instant',
    is_active: sub?.is_active ?? true,
  }
}

function SubscriptionForm({
  sub,
  tenantId,
  markets,
  contacts,
  onClose,
  onSaved,
}: {
  sub: Subscription | null
  tenantId: string
  markets: Market[]
  contacts: ContactLite[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!sub
  const [f, setF] = useState<FormState>(() => initialForm(sub))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setF((prev) => ({ ...prev, [key]: value }))
  }

  function togglePropertyType(t: string) {
    setF((prev) => ({
      ...prev,
      property_types: prev.property_types.includes(t)
        ? prev.property_types.filter((x) => x !== t)
        : [...prev.property_types, t],
    }))
  }

  async function handleSave() {
    if (!f.contact_id) {
      setError('Pick the buyer this feed is for.')
      return
    }
    const minP = f.min_price.trim() === '' ? null : Number(f.min_price)
    const maxP = f.max_price.trim() === '' ? null : Number(f.max_price)
    if (minP != null && maxP != null && minP > maxP) {
      setError('Min price can’t be greater than max price.')
      return
    }
    setError(null)
    setSaving(true)

    const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s))
    const neighborhoods = f.neighborhoods
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const payload = {
      market_id: f.market_id || null,
      min_price: minP,
      max_price: maxP,
      min_beds: numOrNull(f.min_beds),
      property_types: f.property_types.length ? f.property_types : null,
      neighborhoods: neighborhoods.length ? neighborhoods : null,
      frequency: f.frequency,
      is_active: f.is_active,
      updated_at: new Date().toISOString(),
    }

    let errMsg: string | null = null
    if (isEdit && sub) {
      const { error } = await supabase.from('buyer_feed_subscriptions').update(payload).eq('id', sub.id)
      errMsg = error?.message ?? null
    } else {
      const { error } = await supabase.from('buyer_feed_subscriptions').insert({
        ...payload,
        tenant_id: tenantId,
        contact_id: f.contact_id,
        channel: 'email',
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
            {isEdit ? 'Edit buyer subscription' : 'New buyer subscription'}
          </h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Buyer" required>
            <select value={f.contact_id} onChange={(e) => set('contact_id', e.target.value)} className={inputCls}>
              <option value="">— Select buyer —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {contactLabel(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Market">
            <select value={f.market_id} onChange={(e) => set('market_id', e.target.value)} className={inputCls}>
              <option value="">— Any —</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <Field label="Min price">
            <input type="number" value={f.min_price} onChange={(e) => set('min_price', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Max price">
            <input type="number" value={f.max_price} onChange={(e) => set('max_price', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Min beds">
            <input type="number" value={f.min_beds} onChange={(e) => set('min_beds', e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="mt-4">
          <span className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">Property types</span>
          <div className="flex flex-wrap gap-2">
            {PROPERTY_TYPES.map((t) => {
              const on = f.property_types.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => togglePropertyType(t)}
                  className={`px-2.5 py-1 text-2xs uppercase tracking-widest border transition-colors ${
                    on ? 'bg-ink-900 text-cream border-ink-900' : 'bg-cream text-ink-600 border-ink-200 hover:border-ink-900'
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4">
          <Field label="Neighborhoods (comma-separated)">
            <input
              value={f.neighborhoods}
              onChange={(e) => set('neighborhoods', e.target.value)}
              placeholder="e.g. Monte Sereno, Almaden Valley"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 items-end">
          <Field label="Frequency">
            <select value={f.frequency} onChange={(e) => set('frequency', e.target.value)} className={inputCls}>
              {FREQUENCIES.map((fr) => (
                <option key={fr} value={fr}>
                  {fr}
                </option>
              ))}
            </select>
          </Field>
          <label className="inline-flex items-center gap-2 text-sm text-ink-800 pb-2">
            <input
              type="checkbox"
              checked={f.is_active}
              onChange={(e) => set('is_active', e.target.checked)}
              className="w-4 h-4 accent-ink-900"
            />
            Active
          </label>
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
            {isEdit ? 'Save changes' : 'Create subscription'}
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
