// /compare — free, no-account property comparison tool. Paste Zillow/Redfin
// links (or any listing URL) and each populates via fetch_listing_public
// (public, tenant-bound by site token). Build a side-by-side table, sort by any
// metric, rank your favorites. Session-only: state lives in the browser until
// you leave — which is the prompt to create an account and save it.
//
// Account gates (woven in, not blocking): "Save this comparison" and "Add
// disclosure review" both route to /join. The tool itself never requires login.
//
// Sprint C — condition intelligence. On mount we pull the tenant's PUBLISHED
// property analyses (analyses_public, token-bound). When a pasted listing's
// address matches a published analysis, the row shows a condition score, the
// agent's one-line verdict, and the repair-budget range — the "rank by
// condition, not photos" promise made good. Listings with no analysis just
// show a dash in the condition column.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EDGE_FUNCTIONS_BASE_URL } from '@/lib/supabase'
import {
  Plus, Loader2, ArrowUpDown, Star, Trash2, FileSearch, Save, Home as HomeIcon,
  ShieldCheck, Wrench, ChevronDown, ChevronUp,
} from 'lucide-react'

const SITE_TOKEN = 'sEeAYucGGAUrHO0LIcfQSj1iBGx79tP8'
const FETCH_URL = `${EDGE_FUNCTIONS_BASE_URL}/fetch_listing_public?token=${SITE_TOKEN}`
const ANALYSES_URL = `${EDGE_FUNCTIONS_BASE_URL}/analyses_public?token=${SITE_TOKEN}`

type Listing = {
  localId: string
  url: string
  status: 'loading' | 'ready' | 'error'
  error?: string
  favorite: boolean
  // extracted
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  lotSqft: number | null
  yearBuilt: number | null
  propertyType: string | null
  hoaMonthly: number | null
  parkingType: string | null
  parkingSpaces: number | null
  outdoorFeatures: string[]
  photoUrl: string | null
}

// Published analysis summary (buyer-safe fields from analyses_public).
type Analysis = {
  address: string | null
  condition_score: number | null
  condition_verdict: string | null
  repair_budget_low: number | null
  repair_budget_high: number | null
  agent_condition_note: string | null
  cma_slug: string | null
  cma_published: boolean
}

type SortKey = 'price' | 'sqft' | 'ppsf' | 'bedrooms' | 'bathrooms' | 'yearBuilt' | 'hoaMonthly' | 'condition'

const uid = () => Math.random().toString(36).slice(2, 9)
const ppsf = (l: Listing) => (l.price && l.sqft ? Math.round(l.price / l.sqft) : null)
const money = (n: number | null) =>
  n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const num = (n: number | null) => (n == null ? '—' : n.toLocaleString('en-US'))

// Normalize a street address for matching: lowercase, drop the city/state/zip
// after the first comma, strip common street-suffix punctuation, collapse
// whitespace. We only compare the street line.
function normAddr(s: string | null | undefined): string {
  if (!s) return ''
  return String(s)
    .toLowerCase()
    .replace(/,.*$/, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function Compare() {
  const [input, setInput] = useState('')
  const [listings, setListings] = useState<Listing[]>([])
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [adding, setAdding] = useState(false)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  // Pull the tenant's published condition analyses once.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(ANALYSES_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        const body = await res.json().catch(() => ({}))
        if (!cancelled && body?.ok && Array.isArray(body.analyses)) setAnalyses(body.analyses as Analysis[])
      } catch { /* the tool works without analyses */ }
    })()
    return () => { cancelled = true }
  }, [])

  // Map normalized address → analysis for O(1) lookup per row.
  const analysisByAddr = useMemo(() => {
    const m = new Map<string, Analysis>()
    for (const a of analyses) {
      const k = normAddr(a.address)
      if (k) m.set(k, a)
    }
    return m
  }, [analyses])

  const analysisFor = (l: Listing): Analysis | null => analysisByAddr.get(normAddr(l.address)) || null

  async function addListing() {
    const url = input.trim()
    if (!url) return
    if (!/^https?:\/\//.test(url)) {
      const id = uid()
      setListings((ls) => [...ls, blankListing(id, url, 'ready')])
      setInput('')
      return
    }
    const id = uid()
    setListings((ls) => [...ls, blankListing(id, url, 'loading')])
    setInput('')
    setAdding(true)
    try {
      const res = await fetch(FETCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.ok || !body?.extracted) {
        setListings((ls) =>
          ls.map((l) => (l.localId === id ? { ...l, status: 'error', error: body?.reason || 'Could not read that listing.' } : l)),
        )
      } else {
        const e = body.extracted
        setListings((ls) =>
          ls.map((l) =>
            l.localId === id
              ? {
                  ...l,
                  status: 'ready',
                  address: e.address ?? null,
                  city: e.city ?? null,
                  state: e.state ?? null,
                  zip: e.zip ?? null,
                  price: numOrNull(e.price),
                  bedrooms: numOrNull(e.bedrooms),
                  bathrooms: numOrNull(e.bathrooms),
                  sqft: numOrNull(e.sqft),
                  lotSqft: numOrNull(e.lotSqft),
                  yearBuilt: numOrNull(e.yearBuilt),
                  propertyType: e.propertyType ?? null,
                  hoaMonthly: numOrNull(e.hoaMonthly),
                  parkingType: e.parkingType ?? null,
                  parkingSpaces: numOrNull(e.parkingSpaces),
                  outdoorFeatures: Array.isArray(e.outdoorFeatures) ? e.outdoorFeatures : [],
                  photoUrl: e.photoUrl ?? null,
                }
              : l,
          ),
        )
      }
    } catch {
      setListings((ls) =>
        ls.map((l) => (l.localId === id ? { ...l, status: 'error', error: 'Could not reach the server.' } : l)),
      )
    }
    setAdding(false)
  }

  function remove(id: string) {
    setListings((ls) => ls.filter((l) => l.localId !== id))
    setExpanded((x) => (x === id ? null : x))
  }
  function toggleFav(id: string) {
    setListings((ls) => ls.map((l) => (l.localId === id ? { ...l, favorite: !l.favorite } : l)))
  }
  function sortBy(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(k)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return listings
    const val = (l: Listing): number | null =>
      sortKey === 'ppsf' ? ppsf(l)
        : sortKey === 'condition' ? (analysisByAddr.get(normAddr(l.address))?.condition_score ?? null)
          : (l[sortKey] as number | null)
    return [...listings].sort((a, b) => {
      const av = val(a), bv = val(b)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [listings, sortKey, sortDir, analysisByAddr])

  const ready = listings.filter((l) => l.status === 'ready')
  const hasData = listings.length > 0
  const anyMatched = ready.some((l) => analysisFor(l))

  return (
    <div className="mp-public min-h-screen bg-[#FAFAF7] text-[#0D1B2A]">
      {/* header */}
      <header className="border-b border-black/[0.06] bg-white/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="mp-serif text-lg not-italic">McMullen Properties</Link>
          <Link to="/join" className="text-sm text-[#273C46] hover:text-[#0D1B2A]">Create account</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46] mb-3">Free tool · no account</div>
        <h1 className="text-[34px] md:text-[48px] leading-[1.05] font-semibold tracking-tight">
          Compare homes <span className="mp-serif font-normal">side by side.</span>
        </h1>
        <p className="text-[#273C46] mt-4 max-w-2xl leading-relaxed">
          Paste a Zillow or Redfin link and we pull the details automatically. Add as many as you
          like, sort by any number, and star your favorites. Where Tim has already reviewed a home&rsquo;s
          disclosures, you&rsquo;ll also see a condition score and repair estimate — the analysis buyers
          usually only get at offer time.
        </p>

        {/* input */}
        <div className="mt-8 flex gap-2 max-w-2xl">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addListing() }}
            placeholder="Paste a Zillow or Redfin link…"
            className="flex-1 rounded-[12px] border border-black/15 bg-white px-4 py-3 text-sm focus:outline-none focus:border-[#0D1B2A]/45"
          />
          <button
            onClick={addListing}
            disabled={adding || !input.trim()}
            className="inline-flex items-center gap-2 rounded-[12px] bg-[#0D1B2A] text-white px-5 py-3 text-sm font-medium disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
          </button>
        </div>

        {!hasData ? (
          <EmptyState />
        ) : (
          <>
            {/* comparison table */}
            <div className="mt-10 overflow-x-auto -mx-6 px-6">
              <table className="w-full border-separate border-spacing-0 min-w-[760px]">
                <thead>
                  <tr>
                    <Th className="text-left w-[180px]">Property</Th>
                    <SortableTh label="Price" k="price" {...{ sortKey, sortDir, sortBy }} />
                    <SortableTh label="$/sqft" k="ppsf" {...{ sortKey, sortDir, sortBy }} />
                    <SortableTh label="Condition" k="condition" {...{ sortKey, sortDir, sortBy }} />
                    <SortableTh label="Beds" k="bedrooms" {...{ sortKey, sortDir, sortBy }} />
                    <SortableTh label="Baths" k="bathrooms" {...{ sortKey, sortDir, sortBy }} />
                    <SortableTh label="Sqft" k="sqft" {...{ sortKey, sortDir, sortBy }} />
                    <SortableTh label="Year" k="yearBuilt" {...{ sortKey, sortDir, sortBy }} />
                    <SortableTh label="HOA/mo" k="hoaMonthly" {...{ sortKey, sortDir, sortBy }} />
                    <Th className="w-[80px]"> </Th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((l) => {
                    const a = analysisFor(l)
                    const isOpen = expanded === l.localId
                    return (
                      <FragmentRow key={l.localId}>
                        <tr className={l.favorite ? 'bg-[#0D1B2A]/[0.03]' : ''}>
                          <Td className="text-left">
                            <div className="flex items-start gap-3">
                              {l.photoUrl ? (
                                <img src={l.photoUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 bg-black/5" />
                              ) : (
                                <div className="w-14 h-14 rounded-lg bg-black/5 grid place-items-center shrink-0">
                                  <HomeIcon className="w-5 h-5 text-[#273C46]/40" />
                                </div>
                              )}
                              <div className="min-w-0">
                                {l.status === 'loading' ? (
                                  <span className="inline-flex items-center gap-1.5 text-sm text-[#273C46]">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading…
                                  </span>
                                ) : l.status === 'error' ? (
                                  <span className="text-sm text-red-700">{l.error}</span>
                                ) : (
                                  <>
                                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline block truncate">
                                      {l.address || 'Listing'}
                                    </a>
                                    <span className="text-xs text-[#273C46]/70">
                                      {[l.city, l.state].filter(Boolean).join(', ')}
                                      {l.propertyType ? ` · ${l.propertyType}` : ''}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </Td>
                          <Td className="font-medium">{money(l.price)}</Td>
                          <Td>{ppsf(l) == null ? '—' : `$${num(ppsf(l))}`}</Td>
                          <Td>
                            {a?.condition_score != null ? (
                              <button
                                onClick={() => setExpanded(isOpen ? null : l.localId)}
                                className="inline-flex items-center gap-1.5"
                                title="See the condition read"
                              >
                                <ScoreBadge score={a.condition_score} />
                                {isOpen ? <ChevronUp className="w-3 h-3 text-[#273C46]/50" /> : <ChevronDown className="w-3 h-3 text-[#273C46]/50" />}
                              </button>
                            ) : (
                              <span className="text-xs text-[#273C46]/40">—</span>
                            )}
                          </Td>
                          <Td>{num(l.bedrooms)}</Td>
                          <Td>{num(l.bathrooms)}</Td>
                          <Td>{num(l.sqft)}</Td>
                          <Td>{l.yearBuilt ?? '—'}</Td>
                          <Td>{money(l.hoaMonthly)}</Td>
                          <Td>
                            <div className="flex items-center gap-1.5 justify-center">
                              <button onClick={() => toggleFav(l.localId)} title="Favorite" className={l.favorite ? 'text-[#0D1B2A]' : 'text-[#273C46]/40 hover:text-[#273C46]'}>
                                <Star className="w-4 h-4" fill={l.favorite ? 'currentColor' : 'none'} />
                              </button>
                              <button onClick={() => remove(l.localId)} title="Remove" className="text-[#273C46]/40 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </Td>
                        </tr>
                        {isOpen && a && (
                          <tr>
                            <td colSpan={10} className="border-b border-black/[0.06] bg-[#0D1B2A]/[0.02] px-3 pb-5 pt-1">
                              <ConditionCard a={a} />
                            </td>
                          </tr>
                        )}
                      </FragmentRow>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {anyMatched && (
              <p className="mt-4 text-xs text-[#273C46]/70 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Condition scores reflect Tim&rsquo;s review of each home&rsquo;s actual seller disclosures. Tap a score to see the read.
              </p>
            )}

            {/* account prompts */}
            {ready.length >= 1 ? (
              <div className="mt-10 grid sm:grid-cols-2 gap-5">
                <PromptCard
                  Icon={Save}
                  title="Save this comparison"
                  blurb="Create a free account and your comparison is saved — pick up where you left off on any device."
                  cta="Save with a free account"
                />
                <PromptCard
                  Icon={FileSearch}
                  title="Rank by condition, not photos"
                  blurb="With an account you can request disclosures on these homes and have Tim rank them by actual condition against market value — the analysis buyers usually only do at offer time."
                  cta="Unlock disclosure review"
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

/* ----------------------------- condition UI ----------------------------- */

function scoreColor(score: number): string {
  if (score >= 75) return '#1f7a4d'
  if (score >= 55) return '#273C46'
  if (score >= 35) return '#9a6b00'
  return '#b42318'
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-xs font-semibold text-white w-10 h-7"
      style={{ backgroundColor: scoreColor(score) }}
    >
      {score}
    </span>
  )
}

function ConditionCard({ a }: { a: Analysis }) {
  const fmt = (n: number | null) =>
    n == null ? null : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const lo = fmt(a.repair_budget_low)
  const hi = fmt(a.repair_budget_high)
  return (
    <div className="rounded-[16px] border border-black/[0.08] bg-white p-5 max-w-3xl">
      <div className="flex items-start gap-4">
        <div className="shrink-0 text-center">
          <ScoreBadge score={a.condition_score ?? 0} />
          <div className="mt-1.5 text-[10px] uppercase tracking-widest text-[#273C46]/60">Condition</div>
        </div>
        <div className="min-w-0 flex-1">
          {a.condition_verdict && (
            <p className="text-sm text-[#0D1B2A] leading-relaxed">{a.condition_verdict}</p>
          )}
          {a.agent_condition_note && (
            <p className="text-sm text-[#273C46] mt-2 leading-relaxed italic">&ldquo;{a.agent_condition_note}&rdquo;</p>
          )}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3">
            {(lo || hi) && (
              <span className="inline-flex items-center gap-1.5 text-sm text-[#273C46]">
                <Wrench className="w-3.5 h-3.5" />
                Estimated repairs: <strong className="text-[#0D1B2A]">{lo || '—'}{hi ? `–${hi}` : ''}</strong>
              </span>
            )}
            {a.cma_published && a.cma_slug && (
              <Link to={`/cmas/${a.cma_slug}`} className="text-sm font-medium text-[#0D1B2A] underline">
                See the full market analysis
              </Link>
            )}
          </div>
          <p className="text-[11px] text-[#273C46]/55 mt-3">
            Planning estimate from the seller&rsquo;s disclosure package — not a contractor bid.
          </p>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------- helpers -------------------------------- */
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
function blankListing(localId: string, url: string, status: Listing['status']): Listing {
  return {
    localId, url, status, favorite: false,
    address: status === 'ready' && !/^https?:\/\//.test(url) ? url : null,
    city: null, state: null, zip: null, price: null, bedrooms: null, bathrooms: null,
    sqft: null, lotSqft: null, yearBuilt: null, propertyType: null, hoaMonthly: null,
    parkingType: null, parkingSpaces: null, outdoorFeatures: [], photoUrl: null,
  }
}
function numOrNull(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : null
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-center text-2xs uppercase tracking-widest text-[#273C46]/70 font-medium pb-3 px-3 border-b border-black/10 ${className}`}>{children}</th>
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`text-center text-sm py-4 px-3 border-b border-black/[0.06] align-top ${className}`}>{children}</td>
}
function SortableTh({
  label, k, sortKey, sortDir, sortBy,
}: { label: string; k: SortKey; sortKey: SortKey | null; sortDir: 'asc' | 'desc'; sortBy: (k: SortKey) => void }) {
  const active = sortKey === k
  return (
    <th className="pb-3 px-3 border-b border-black/10">
      <button onClick={() => sortBy(k)} className={`inline-flex items-center gap-1 text-2xs uppercase tracking-widest font-medium ${active ? 'text-[#0D1B2A]' : 'text-[#273C46]/70 hover:text-[#0D1B2A]'}`}>
        {label} <ArrowUpDown className="w-3 h-3" />
        {active ? <span className="text-[9px]">{sortDir === 'asc' ? '↑' : '↓'}</span> : null}
      </button>
    </th>
  )
}
function PromptCard({ Icon, title, blurb, cta }: { Icon: React.ComponentType<{ className?: string }>; title: string; blurb: string; cta: string }) {
  return (
    <div className="rounded-[24px] border border-black/[0.08] bg-white p-7">
      <Icon className="w-5 h-5 text-[#0D1B2A]" />
      <h3 className="text-lg font-semibold tracking-tight mt-4">{title}</h3>
      <p className="text-sm text-[#273C46] mt-2 leading-relaxed">{blurb}</p>
      <Link to="/join" className="inline-flex items-center justify-center rounded-full bg-[#0D1B2A] text-white px-5 py-2.5 text-sm font-medium mt-5">
        {cta}
      </Link>
    </div>
  )
}
function EmptyState() {
  return (
    <div className="mt-12 rounded-[24px] border border-dashed border-black/15 bg-white/50 p-10 text-center">
      <HomeIcon className="w-7 h-7 text-[#273C46]/40 mx-auto" />
      <p className="text-[#273C46] mt-4 max-w-md mx-auto leading-relaxed">
        Paste your first listing link above to start. Try two or three homes you&rsquo;re weighing —
        or your own home plus the comps you want to beat.
      </p>
    </div>
  )
}
