// EPIC B — Markets (the Acquisition cockpit section).
//
// Lists a tenant's bounded markets with live counts (buildings / units /
// owners), lets the agent create a new market (their farm), and launches the
// CSV import that fills the spine. The agent's "feed the top" motion lives here.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MapPin,
  Plus,
  Upload,
  Loader2,
  X as XIcon,
  Building2,
  Home,
  Users,
  LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import MarketImportModal from '@/components/MarketImportModal'

type Market = {
  id: string
  tenant_id: string
  name: string
  slug: string
  kind: string
  description: string | null
  geo: Record<string, unknown>
  status: string
  building_count: number
  unit_count: number
  owner_count: number
  created_at: string
}

const KINDS = [
  { value: 'residential', label: 'Residential (single-family)' },
  { value: 'condo', label: 'Condo / multi-unit' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'commercial', label: 'Commercial' },
]

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export default function Markets() {
  const { currentTenant } = useAuth()
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [importMarket, setImportMarket] = useState<Market | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('markets')
      .select('*')
      .order('created_at', { ascending: true })
    setMarkets((data as Market[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
            Acquisition
          </div>
          <h1 className="font-display text-3xl text-ink-900">Markets</h1>
          <p className="text-ink-600 mt-2 max-w-2xl leading-relaxed">
            Each market is a bounded farm — a neighborhood, a building class, a
            city’s condos. Define one, feed it owners, and work it building by
            building.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          New market
        </button>
      </div>

      {loading ? (
        <div className="text-2xs uppercase tracking-widest text-ink-500 py-20 text-center">
          Loading markets…
        </div>
      ) : markets.length === 0 ? (
        <div className="border border-dashed border-ink-200 py-16 text-center">
          <MapPin className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.25} />
          <div className="text-sm text-ink-700 font-medium">No markets yet</div>
          <p className="text-ink-500 text-sm mt-1">
            Create your first farm to start building the owner graph.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {markets.map((m) => (
            <MarketCard
              key={m.id}
              market={m}
              onImport={() => setImportMarket(m)}
            />
          ))}
        </div>
      )}

      {creating && currentTenant && (
        <NewMarketModal
          tenantId={currentTenant.id}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            refresh()
          }}
        />
      )}

      {importMarket && (
        <MarketImportModal
          marketId={importMarket.id}
          marketName={importMarket.name}
          onClose={() => setImportMarket(null)}
          onComplete={refresh}
        />
      )}
    </div>
  )
}

function MarketCard({
  market,
  onImport,
}: {
  market: Market
  onImport: () => void
}) {
  const geoSummary = useMemo(() => {
    const g = market.geo || {}
    const parts: string[] = []
    const nbhd = (g.neighborhoods as string[]) || []
    const cities = (g.cities as string[]) || []
    if (nbhd.length) parts.push(nbhd.join(', '))
    else if (cities.length) parts.push(cities.join(', '))
    if (g.state) parts.push(String(g.state))
    return parts.join(' · ')
  }, [market.geo])

  return (
    <div className="border border-ink-200 bg-cream p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link
              to={`/markets/${market.id}`}
              className="font-display text-xl text-ink-900 hover:text-ink-600 transition-colors"
            >
              {market.name}
            </Link>
            <span className="text-2xs uppercase tracking-widest bg-ink-100 text-ink-600 px-2 py-0.5">
              {market.kind}
            </span>
            {market.status !== 'active' && (
              <span className="text-2xs uppercase tracking-widest bg-ink-100 text-ink-500 px-2 py-0.5">
                {market.status}
              </span>
            )}
          </div>
          {geoSummary && (
            <div className="text-sm text-ink-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-ink-400" strokeWidth={1.5} />
              {geoSummary}
            </div>
          )}
        </div>
        <button
          onClick={onImport}
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-ink-300 text-2xs uppercase tracking-widest text-ink-700 hover:border-ink-900 hover:text-ink-900 shrink-0"
        >
          <Upload className="w-3 h-3" strokeWidth={1.5} />
          Import owners
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-ink-100">
        <Counter icon={Building2} label="Buildings" value={market.building_count} />
        <Counter icon={Home} label="Units" value={market.unit_count} />
        <Counter icon={Users} label="Owners" value={market.owner_count} />
      </div>

      <div className="mt-4">
        <Link
          to={`/markets/${market.id}`}
          className="text-2xs uppercase tracking-widest text-ink-700 hover:text-ink-900"
        >
          View inventory →
        </Link>
      </div>
    </div>
  )
}

function Counter({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: number
}) {
  return (
    <div>
      <div className="font-display text-2xl text-ink-900 tabular-nums flex items-center gap-2">
        <Icon className="w-4 h-4 text-ink-400" strokeWidth={1.5} />
        {value.toLocaleString()}
      </div>
      <div className="text-2xs uppercase tracking-widest text-ink-500 mt-1">
        {label}
      </div>
    </div>
  )
}

function NewMarketModal({
  tenantId,
  onClose,
  onCreated,
}: {
  tenantId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState('residential')
  const [city, setCity] = useState('')
  const [state, setState] = useState('CA')
  const [neighborhood, setNeighborhood] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) {
      setError('Give the market a name.')
      return
    }
    setSaving(true)
    setError(null)
    const geo: Record<string, unknown> = {}
    if (city.trim()) geo.cities = [city.trim()]
    if (state.trim()) geo.state = state.trim()
    if (neighborhood.trim()) geo.neighborhoods = [neighborhood.trim()]

    const baseSlug = slugify(name) || 'market'
    let slug = baseSlug
    let attempt = 0
    // retry on slug collision
    while (attempt < 4) {
      const { error: insErr } = await supabase.from('markets').insert({
        tenant_id: tenantId,
        name: name.trim(),
        slug,
        kind,
        geo,
        criteria: {},
      })
      if (!insErr) {
        setSaving(false)
        onCreated()
        return
      }
      if (insErr.code === '23505') {
        attempt++
        slug = `${baseSlug}-${attempt + 1}`
        continue
      }
      setSaving(false)
      setError(insErr.message)
      return
    }
    setSaving(false)
    setError('Could not create market (slug conflict).')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-cream w-full max-w-md border border-ink-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-7 py-5 border-b border-ink-200 flex items-start justify-between gap-4">
          <div>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
              New market
            </div>
            <h2 className="font-display text-2xl text-ink-900">Define a farm</h2>
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

        <div className="px-7 py-6 space-y-4">
          <Field label="Market name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="East Side Los Gatos — Single Family"
              className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
            />
          </Field>
          <Field label="Kind">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Los Gatos"
                className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
              />
            </Field>
            <Field label="State">
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
              />
            </Field>
          </div>
          <Field label="Neighborhood (optional)">
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="East Side Los Gatos"
              className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
            />
          </Field>
          <p className="text-2xs uppercase tracking-widest text-ink-400 leading-relaxed">
            The scope is a starting point — you can refine criteria later. Owners
            get imported into this market on the next step.
          </p>
        </div>

        <div className="px-7 py-4 border-t border-ink-200 flex items-center justify-between gap-3">
          {error ? (
            <div className="text-sm text-red-700 flex-1 min-w-0">{error}</div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-3 py-2 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create market'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}
