// B.1 — Market detail / inventory browser.
//
// Route: /markets/:marketId
//
// The agent's window into the owner graph they just ingested. Data-quality
// summary up top (total units, units with/without an owner, confidence
// breakdown), then a paginated, searchable units table where each row shows the
// addressable property + its owner(s) + last sale. Expand a row for full owner
// detail and sales history. The model warns "data accuracy gates trust" — this
// is where the agent verifies the graph before working it.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  Upload,
  Search,
  Loader2,
  Building2,
  Home,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  CheckCircle2,
  Link2,
  Check,
  UserPlus,
  UserCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import MarketImportModal from '@/components/MarketImportModal'

type Market = {
  id: string
  name: string
  slug: string
  kind: string
  status: string
  geo: Record<string, unknown>
  building_count: number
  unit_count: number
  owner_count: number
}

type OwnerContact = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
}

type OwnerEdge = {
  confidence: string
  source: string | null
  ownership_role: string
  claim_token: string | null
  claim_status: string | null
  contacts: OwnerContact | null
}

type Sale = { sale_price: number; sale_date: string }

type UnitRow = {
  id: string
  full_address: string
  unit_label: string | null
  beds: number | null
  baths: number | null
  area_sqft: number | null
  last_sale_price: number | null
  last_sale_date: string | null
  buildings: {
    name: string | null
    street_address: string
    neighborhood: string | null
    hoa_name: string | null
  } | null
  unit_ownership: OwnerEdge[]
  property_sales: Sale[]
}

type Summary = {
  total_units: number
  units_with_owner: number
  confirmed: number
  probable: number
  unverified: number
  total_sales: number
}

const PAGE_SIZE = 50

const UNIT_SELECT = `
  id, full_address, unit_label, beds, baths, area_sqft, last_sale_price, last_sale_date,
  buildings ( name, street_address, neighborhood, hoa_name ),
  unit_ownership ( confidence, source, ownership_role, claim_token, claim_status, contacts ( id, first_name, last_name, email, phone ) ),
  property_sales ( sale_price, sale_date )
`

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function ownerName(c: OwnerContact | null): string {
  if (!c) return 'Unknown'
  const n = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
  return n || c.email || c.phone || 'Unknown'
}

function confidenceBadge(conf: string): string {
  return conf === 'confirmed'
    ? 'bg-emerald-50 text-emerald-700'
    : conf === 'probable'
      ? 'bg-sky-50 text-sky-700'
      : 'bg-ink-100 text-ink-500'
}

export default function MarketDetail() {
  const { marketId } = useParams<{ marketId: string }>()
  const [market, setMarket] = useState<Market | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [units, setUnits] = useState<UnitRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingUnits, setLoadingUnits] = useState(false)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [clientContactIds, setClientContactIds] = useState<Set<string>>(new Set())

  const loadMarket = useCallback(async () => {
    if (!marketId) return
    setLoading(true)
    const { data } = await supabase
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .maybeSingle()
    if (!data) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setMarket(data as Market)
    const { data: sum } = await supabase.rpc('market_inventory_summary', {
      p_market_id: marketId,
    })
    if (sum) setSummary(sum as Summary)
    setLoading(false)
  }, [marketId])

  const loadUnits = useCallback(async () => {
    if (!marketId) return
    setLoadingUnits(true)
    let q = supabase
      .from('units')
      .select(UNIT_SELECT)
      .eq('market_id', marketId)
      .order('full_address', { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
    if (appliedSearch.trim()) {
      q = q.ilike('full_address', `%${appliedSearch.trim()}%`)
    }
    const { data } = await q
    setUnits((data as UnitRow[]) || [])
    setLoadingUnits(false)
  }, [marketId, page, appliedSearch])

  const loadClients = useCallback(async () => {
    const { data } = await supabase
      .from('clients')
      .select('contact_id')
      .not('contact_id', 'is', null)
    setClientContactIds(new Set(((data as { contact_id: string }[]) || []).map((r) => r.contact_id)))
  }, [])

  useEffect(() => {
    loadMarket()
  }, [loadMarket])

  useEffect(() => {
    loadUnits()
  }, [loadUnits])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  const missingOwner = useMemo(() => {
    if (!summary) return 0
    return Math.max(0, summary.total_units - summary.units_with_owner)
  }, [summary])

  function runSearch() {
    setPage(0)
    setExpanded(null)
    setAppliedSearch(search)
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-20 text-center text-2xs uppercase tracking-widest text-ink-500">
        Loading market…
      </div>
    )
  }

  if (notFound || !market) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-20 text-center">
        <h1 className="font-display text-2xl text-ink-900 mb-3">Market not found</h1>
        <Link
          to="/markets"
          className="inline-flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-700 hover:text-ink-900"
        >
          <ArrowLeft className="w-3 h-3" /> Back to markets
        </Link>
      </div>
    )
  }

  const geo = market.geo || {}
  const geoSummary = [
    ((geo.neighborhoods as string[]) || []).join(', ') ||
      ((geo.cities as string[]) || []).join(', '),
    geo.state ? String(geo.state) : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Back */}
      <Link
        to="/markets"
        className="inline-flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 mb-6"
      >
        <ArrowLeft className="w-3 h-3" /> Markets
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="font-display text-3xl text-ink-900">{market.name}</h1>
            <span className="text-2xs uppercase tracking-widest bg-ink-100 text-ink-600 px-2 py-0.5">
              {market.kind}
            </span>
          </div>
          {geoSummary && (
            <div className="text-sm text-ink-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-ink-400" strokeWidth={1.5} />
              {geoSummary}
            </div>
          )}
        </div>
        <button
          onClick={() => setImporting(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 shrink-0"
        >
          <Upload className="w-3.5 h-3.5" strokeWidth={2} />
          Import owners
        </button>
      </div>

      {/* Data-quality summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryStat icon={Building2} label="Buildings" value={market.building_count} />
        <SummaryStat icon={Home} label="Units" value={summary?.total_units ?? market.unit_count} />
        <SummaryStat icon={Users} label="Owners" value={market.owner_count} />
        <SummaryStat
          icon={AlertTriangle}
          label="Units missing owner"
          value={missingOwner}
          warn={missingOwner > 0}
        />
      </div>

      {/* Confidence breakdown */}
      {summary && (summary.confirmed + summary.probable + summary.unverified) > 0 && (
        <div className="flex items-center gap-2 mb-8 flex-wrap text-2xs uppercase tracking-widest">
          <span className="text-ink-500">Ownership confidence:</span>
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700">
            {summary.confirmed.toLocaleString()} confirmed
          </span>
          <span className="px-2 py-0.5 bg-sky-50 text-sky-700">
            {summary.probable.toLocaleString()} probable
          </span>
          <span className="px-2 py-0.5 bg-ink-100 text-ink-500">
            {summary.unverified.toLocaleString()} unverified
          </span>
          <span className="text-ink-400 ml-2">·</span>
          <span className="text-ink-500">{summary.total_sales.toLocaleString()} sales on record</span>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="Search by address"
            className="w-full pl-9 pr-3 py-2 border border-ink-200 text-sm bg-cream focus:outline-none focus:border-ink-900"
          />
        </div>
        <button
          onClick={runSearch}
          className="px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700"
        >
          Search
        </button>
        {appliedSearch && (
          <button
            onClick={() => {
              setSearch('')
              setAppliedSearch('')
              setPage(0)
            }}
            className="px-3 py-2 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900"
          >
            Clear
          </button>
        )}
      </div>

      {/* Units table */}
      <div className="border border-ink-200">
        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-ink-50 text-2xs uppercase tracking-widest text-ink-500 border-b border-ink-200">
          <div className="col-span-5">Property</div>
          <div className="col-span-2 hidden md:block">Specs</div>
          <div className="col-span-3">Owner</div>
          <div className="col-span-2 text-right">Last sale</div>
        </div>

        {loadingUnits ? (
          <div className="py-16 text-center">
            <Loader2 className="w-5 h-5 text-ink-400 animate-spin mx-auto" />
          </div>
        ) : units.length === 0 ? (
          <div className="py-16 text-center text-ink-500 text-sm">
            {appliedSearch
              ? 'No properties match that search.'
              : 'No properties yet. Import owners to populate this market.'}
          </div>
        ) : (
          units.map((u) => {
            const owners = u.unit_ownership || []
            const first = owners[0]
            const isOpen = expanded === u.id
            return (
              <div key={u.id} className="border-b border-ink-100 last:border-b-0">
                <button
                  onClick={() => setExpanded(isOpen ? null : u.id)}
                  className="w-full grid grid-cols-12 gap-3 px-4 py-3 text-left hover:bg-ink-50/50 items-center"
                >
                  <div className="col-span-5 min-w-0 flex items-start gap-2">
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-ink-400 mt-0.5 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-ink-400 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm text-ink-900 truncate">{u.full_address}</div>
                      {u.buildings?.neighborhood && (
                        <div className="text-2xs uppercase tracking-widest text-ink-400 mt-0.5">
                          {u.buildings.neighborhood}
                          {u.buildings.hoa_name ? ` · ${u.buildings.hoa_name}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 hidden md:block text-xs text-ink-600">
                    {[
                      u.beds != null ? `${u.beds} bd` : null,
                      u.baths != null ? `${u.baths} ba` : null,
                      u.area_sqft != null ? `${u.area_sqft.toLocaleString()} sf` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </div>
                  <div className="col-span-3 min-w-0">
                    {first ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-ink-800 truncate">
                          {ownerName(first.contacts)}
                        </span>
                        <span
                          className={`text-2xs uppercase tracking-widest px-1.5 py-0.5 shrink-0 ${confidenceBadge(
                            first.confidence,
                          )}`}
                        >
                          {first.confidence}
                        </span>
                        {owners.length > 1 && (
                          <span className="text-2xs text-ink-400 shrink-0">
                            +{owners.length - 1}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-2xs uppercase tracking-widest text-amber-700 inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> No owner
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 text-right text-sm text-ink-700 tabular-nums">
                    {u.last_sale_price ? (
                      <>
                        {fmtMoney(u.last_sale_price)}
                        {u.last_sale_date && (
                          <div className="text-2xs text-ink-400">
                            {new Date(u.last_sale_date).getFullYear()}
                          </div>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 bg-ink-50/40 grid md:grid-cols-2 gap-6">
                    {/* Owners */}
                    <div>
                      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">
                        Owners ({owners.length})
                      </div>
                      {owners.length === 0 ? (
                        <p className="text-sm text-ink-500">
                          No ownership records for this unit.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {owners.map((o, i) => (
                            <li key={i} className="text-sm">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-ink-900">
                                  {ownerName(o.contacts)}
                                </span>
                                <span
                                  className={`text-2xs uppercase tracking-widest px-1.5 py-0.5 ${confidenceBadge(
                                    o.confidence,
                                  )}`}
                                >
                                  {o.confidence}
                                </span>
                                <span className="text-2xs uppercase tracking-widest text-ink-400">
                                  {o.ownership_role}
                                  {o.source ? ` · ${o.source}` : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-0.5 text-xs text-ink-600">
                                {o.contacts?.email && (
                                  <a
                                    href={`mailto:${o.contacts.email}`}
                                    className="inline-flex items-center gap-1 hover:text-ink-900"
                                  >
                                    <Mail className="w-3 h-3" /> {o.contacts.email}
                                  </a>
                                )}
                                {o.contacts?.phone && (
                                  <span className="inline-flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> {o.contacts.phone}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1.5 flex items-center gap-4 flex-wrap">
                                {o.claim_status === 'claimed' ? (
                                  <span className="text-2xs uppercase tracking-widest text-emerald-700 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Claimed by owner
                                  </span>
                                ) : (
                                  o.claim_token && <ClaimLinkButton token={o.claim_token} />
                                )}
                                {o.contacts?.id &&
                                  (clientContactIds.has(o.contacts.id) ? (
                                    <Link
                                      to="/clients"
                                      className="text-2xs uppercase tracking-widest text-emerald-700 inline-flex items-center gap-1 hover:text-emerald-800"
                                    >
                                      <UserCheck className="w-3 h-3" /> Portal client
                                    </Link>
                                  ) : (
                                    <PromoteOwnerButton
                                      contactId={o.contacts.id}
                                      unitId={u.id}
                                      hasEmail={!!o.contacts.email}
                                      onPromoted={(cid) =>
                                        setClientContactIds((prev) => new Set(prev).add(cid))
                                      }
                                    />
                                  ))}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Sales */}
                    <div>
                      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">
                        Sale history ({u.property_sales?.length || 0})
                      </div>
                      {(u.property_sales?.length || 0) === 0 ? (
                        <p className="text-sm text-ink-500">No sales on record.</p>
                      ) : (
                        <ul className="space-y-1">
                          {[...u.property_sales]
                            .sort(
                              (a, b) =>
                                new Date(b.sale_date).getTime() -
                                new Date(a.sale_date).getTime(),
                            )
                            .map((s, i) => (
                              <li
                                key={i}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-ink-700 tabular-nums">
                                  {fmtMoney(s.sale_price)}
                                </span>
                                <span className="text-ink-500 text-xs">
                                  {new Date(s.sale_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {(page > 0 || units.length === PAGE_SIZE) && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => {
              setPage((p) => Math.max(0, p - 1))
              setExpanded(null)
            }}
            disabled={page === 0 || loadingUnits}
            className="px-3 py-1.5 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-2xs uppercase tracking-widest text-ink-400">
            Page {page + 1}
          </span>
          <button
            onClick={() => {
              setPage((p) => p + 1)
              setExpanded(null)
            }}
            disabled={units.length < PAGE_SIZE || loadingUnits}
            className="px-3 py-1.5 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {importing && (
        <MarketImportModal
          marketId={market.id}
          marketName={market.name}
          onClose={() => setImporting(false)}
          onComplete={() => {
            loadMarket()
            loadUnits()
          }}
        />
      )}
    </div>
  )
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  warn,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  value: number
  warn?: boolean
}) {
  return (
    <div className={`border px-4 py-3 ${warn ? 'border-amber-200 bg-amber-50/40' : 'border-ink-200'}`}>
      <div
        className={`font-display text-2xl tabular-nums flex items-center gap-2 ${
          warn ? 'text-amber-700' : 'text-ink-900'
        }`}
      >
        <Icon className={`w-4 h-4 ${warn ? 'text-amber-600' : 'text-ink-400'}`} strokeWidth={1.5} />
        {value.toLocaleString()}
      </div>
      <div className="text-2xs uppercase tracking-widest text-ink-500 mt-1">{label}</div>
    </div>
  )
}

function ClaimLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/claim/${token}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked — select-prompt fallback
      window.prompt('Copy this claim link:', url)
    }
  }

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-700" /> Copied
        </>
      ) : (
        <>
          <Link2 className="w-3 h-3" /> Copy claim link
        </>
      )}
    </button>
  )
}

function PromoteOwnerButton({
  contactId,
  unitId,
  hasEmail,
  onPromoted,
}: {
  contactId: string
  unitId: string
  hasEmail: boolean
  onPromoted: (contactId: string) => void
}) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function go() {
    setState('working')
    // 1. Reusable conversion: ensure client + war room (idempotent)
    const { data, error } = await supabase.rpc('provision_client_for_contact', {
      p_contact_id: contactId,
      p_source: 'unit_claim',
      p_unit_id: unitId,
    })
    if (error) {
      setState('error')
      setMsg(error.message)
      return
    }
    const clientId = (data as { client_id?: string } | null)?.client_id
    // 2. Chain the existing portal invite (transactional — sends regardless of marketing opt-out)
    let invited = false
    if (clientId && hasEmail) {
      const { error: invErr } = await supabase.functions.invoke('invite_client', {
        body: { client_id: clientId },
      })
      invited = !invErr
    }
    setState('done')
    setMsg(
      invited
        ? 'Client created · portal invite sent'
        : hasEmail
          ? 'Client created · invite didn’t send'
          : 'Client created · add an email to invite',
    )
    if (contactId) onPromoted(contactId)
  }

  if (state === 'done') {
    return (
      <span className="text-2xs uppercase tracking-widest text-emerald-700 inline-flex items-center gap-1">
        <UserCheck className="w-3 h-3" /> {msg}
      </span>
    )
  }
  if (state === 'error') {
    return (
      <span className="text-2xs uppercase tracking-widest text-red-700 inline-flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> {msg || 'Could not promote'}
      </span>
    )
  }
  return (
    <button
      onClick={go}
      disabled={state === 'working'}
      className="text-2xs uppercase tracking-widest text-ink-700 hover:text-ink-900 inline-flex items-center gap-1 disabled:opacity-50"
    >
      {state === 'working' ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <UserPlus className="w-3 h-3" />
      )}
      Promote to client
    </button>
  )
}
