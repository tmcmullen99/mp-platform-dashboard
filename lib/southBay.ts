// South Bay city-market data layer (Campbell, Los Gatos, Saratoga).
//
// WHY THIS EXISTS, AND WHY IT IS NOT lib/condoMarket.ts:
// The condo marketplaces (SF / Silicon Valley / Eichler) live in the Condo
// Market Supabase project and expose aggregate RPCs. The three CITY markets are
// a different engine entirely — static-JSON-first, served as files from each
// city's own Cloudflare deployment. There is no RPC to call, so this module
// reads the data instead of querying it.
//
// LOADING STRATEGY (live-first, snapshot-fallback):
//   1. try the live city-market asset over HTTPS  -> always current
//   2. fall back to the snapshot bundled in /public -> always works
//
// Today step 1 fails in the browser: the city-market deployments serve
// /assets/* WITHOUT an Access-Control-Allow-Origin header, so a cross-origin
// read from mcmullenresidential.com is blocked. The snapshot therefore carries
// the page. Add this to the city-market repo's `_headers` file:
//
//     /assets/*
//       Access-Control-Allow-Origin: *
//
// ...and this module upgrades itself to live data on the next page load with no
// change required here. Until then the snapshot is authoritative and carries a
// visible "as of" date, so the page is never quietly stale.

export type SbQuarter = {
  q: string       // "2026 Q2"
  ppsf: number    // median $/sf
  price: number   // median sale price
  n: number       // closed sales in the quarter
  thin?: boolean  // fewer than 5 sales — treat with caution
}

export type SbSale = {
  a: string          // address
  s: string          // slug on the city market
  p: number          // sale price
  sf: number         // square feet
  ppsf: number       // $/sf
  d: string          // ISO sale date
  b?: number | null  // beds
  ba?: number | null // baths
}

export type SbTotals = {
  homes_indexed: number
  sales_on_record: number
  streets: number | null
  sales_12mo: number
  median_ppsf_12mo: number | null
  median_price_12mo: number | null
  latest_sale: string | null
}

export type SbMarket = {
  name: string
  domain: string
  totals: SbTotals
  quarters: SbQuarter[]
  feed: SbSale[]
}

export type SouthBayPayload = {
  generated: string
  method: string
  markets: Record<string, SbMarket>
}

// Registry — key must match the keys inside the snapshot's `markets` object.
export const SOUTH_BAY_KEYS = ['campbell', 'los-gatos', 'saratoga'] as const
export type SouthBayKey = (typeof SOUTH_BAY_KEYS)[number]

export const SOUTH_BAY_META: Record<SouthBayKey, { name: string; domain: string; accent: string }> = {
  campbell:    { name: 'Campbell',  domain: 'campbellrealestatemarket.com',  accent: '#4f82b9' },
  'los-gatos': { name: 'Los Gatos', domain: 'losgatosrealestatemarket.com',  accent: '#1f7a4d' },
  saratoga:    { name: 'Saratoga',  domain: 'saratogarealestatemarket.com',  accent: '#1a1f2e' },
}

// Range toggle options, in quarters.
export const RANGES = [
  { key: '1y',  label: '1 YR',  quarters: 4 },
  { key: '3y',  label: '3 YR',  quarters: 12 },
  { key: '5y',  label: '5 YR',  quarters: 20 },
  { key: '10y', label: '10 YR', quarters: 40 },
] as const
export type RangeKey = (typeof RANGES)[number]['key']

const SNAPSHOT_URL = '/market/southbay-intel.json'

// Live sources, tried in order before the snapshot. Same shape is NOT expected
// here — these are the city markets' own per-market intel files, which only
// exist for some markets; the snapshot remains the unified source. Kept as a
// single flag so enabling live mode later is a one-line change.
const TRY_LIVE = false

let cache: Promise<SouthBayPayload | null> | null = null

async function load(): Promise<SouthBayPayload | null> {
  if (TRY_LIVE) {
    try {
      const r = await fetch('https://campbellrealestatemarket.com/assets/southbay-intel.json', { mode: 'cors' })
      if (r.ok) return (await r.json()) as SouthBayPayload
    } catch {
      /* CORS or offline — fall through to the bundled snapshot */
    }
  }
  try {
    const r = await fetch(SNAPSHOT_URL)
    if (!r.ok) return null
    return (await r.json()) as SouthBayPayload
  } catch {
    return null
  }
}

/** Cached across mounts — the snapshot never changes within a session. */
export function fetchSouthBay(): Promise<SouthBayPayload | null> {
  if (!cache) cache = load()
  return cache
}

/** Last `count` quarters of a series, oldest → newest. */
export function sliceQuarters(qs: SbQuarter[], count: number): SbQuarter[] {
  return count >= qs.length ? qs : qs.slice(qs.length - count)
}

/** Percentage change across a series, first → last. Null when not computable. */
export function pctChange(qs: SbQuarter[]): number | null {
  if (qs.length < 2) return null
  const a = qs[0].ppsf, b = qs[qs.length - 1].ppsf
  if (!a || !b) return null
  return ((b - a) / a) * 100
}

export function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n}`
}

export function fmtNum(n: number | null | undefined): string {
  return n == null ? '—' : n.toLocaleString('en-US')
}

export function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
