// Read-only Supabase client pointed at the Condo Market project.
//
// This is a SECOND, deliberately isolated client. It exists only to call the
// public aggregate RPCs (median $/sf, closed sales, quarterly trends, per-market
// home payload) that power the Market hub. It must never touch the McMullen
// user session:
//   - persistSession: false  (no auth writes)
//   - a distinct storageKey  (never collides with the main client's session)
//   - anon key only, RLS + anon-grants restrict it to aggregate reads
//
// The anon key is public by design (it ships in every browser bundle and is
// protected by row-level security). Access is limited to the aggregate
// intelligence RPCs + home_page_payload granted to `anon` on the Condo Market
// project (all verified anon-executable).

import { createClient } from '@supabase/supabase-js'

const CM_URL = 'https://kfqphwerygccpzntbbif.supabase.co'
const CM_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmcXBod2VyeWdjY3B6bnRiYmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTgxODQsImV4cCI6MjA5MTk3NDE4NH0.FGQD3BMLVLD9lE8LUBUjD3SqKhsCxjdnCiGV8MMnqpg'

export const condoMarket = createClient(CM_URL, CM_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'cm-readonly-noauth',
  },
})

// ---------------------------------------------------------------------------
// Market registry — one entry per market the Market hub covers.
// `dataSlug` is what the Condo Market RPCs expect (p_market_slug).
// `blogTags` are the McMullen blog tags that map a post to this market.
// ---------------------------------------------------------------------------
export type MarketConfig = {
  key: string
  name: string
  shortName: string
  dataSlug: string
  blurb: string
  blogTags: string[]
  available: boolean // false = shown in the selector as "coming soon" (no live feed yet)
}

// Market-agnostic blog tags — general real estate insight that can surface in
// ANY market's feed alongside that market's own tagged posts.
export const GENERAL_TAGS = ['investments', 'markets', 'news']

export const MARKETS: MarketConfig[] = [
  {
    key: 'sf',
    name: 'San Francisco Condos',
    shortName: 'San Francisco',
    dataSlug: 'san-francisco-condo-market',
    blurb:
      'Ten years of closed sales across every San Francisco condo building — median price per square foot, live activity, and building-level detail.',
    blogTags: [
      'san-francisco', 'northside-san-francisco', 'pacific-heights', 'marina-district',
      'russian-hill', 'nob-hill', 'south-beach', 'mission-bay', 'rincon-hill',
      'yerba-buena', 'hayes-valley', 'richmond-district', 'cow-hollow', 'dogpatch',
    ],
    available: true,
  },
  {
    key: 'sv',
    name: 'Silicon Valley Condos',
    shortName: 'Silicon Valley',
    dataSlug: 'silicon-valley-condo-market',
    blurb:
      'The condo and townhome market across Silicon Valley — closed-sale trends, price per square foot, and building activity from Campbell to Palo Alto.',
    blogTags: [
      'campbell', 'san-jose', 'santana-row', 'palo-alto', 'mountain-view',
      'sunnyvale', 'cupertino', 'los-gatos', 'silicon-valley', 'santa-clara',
    ],
    available: true,
  },
  {
    key: 'eichler',
    name: 'Eichler Homes',
    shortName: 'Eichler',
    dataSlug: 'eichler-market',
    blurb:
      'The mid-century Eichler market across the Bay Area — closed sales, price per square foot, and tract-level activity. Live feed coming soon.',
    blogTags: ['eichler', 'mid-century', 'mid-century-modern'],
    available: false,
  },
  {
    key: 'campbell',
    name: 'Campbell Market',
    shortName: 'Campbell',
    dataSlug: 'campbell-market',
    blurb:
      'The Campbell residential market — Tim’s home turf. A dedicated data feed is on the way.',
    blogTags: ['campbell'],
    available: false,
  },
]

export function marketByKey(key: string): MarketConfig | undefined {
  return MARKETS.find((m) => m.key === key)
}

// ---------------------------------------------------------------------------
// Typed shapes for the RPC responses we consume.
// ---------------------------------------------------------------------------
export type RecentSale = {
  building_slug: string
  unit_address: string
  unit_label: string
  sale_price: number
  sale_date: string
  sqft: number | null
}

export type PsfQuarter = {
  quarter_start: string
  median_psf: number
  sale_count: number
}

export type BuildingStat = {
  slug: string
  display_name: string
  neighborhood: string
  latitude: number
  longitude: number
  unit_count: number
  sales: number
  volume: number
  median_price: number | null
  median_psf: number | null
  last_sale: string
}

// home_page_payload — the per-market aggregate that powers the snapshot band,
// the coverage/value/volume cards, and building hero imagery.
export type HomeStats = {
  units: number
  buildings: number
  sales_10y: number
  volume_10y: number
  total_sales: number
  neighborhoods: number
  median_psf_36mo: number
  latest_sale_date: string
}
export type HomeIndexBuilding = {
  slug: string
  name: string
  address: string
  neighborhood: string | null
  units: number | null
  psf: number | null
  lat: number | null
  lng: number | null
  year_built: number | null
  active_count: number
  hero_image_url: string | null
}
export type HomePayload = {
  stats: HomeStats | null
  index: HomeIndexBuilding[]
  market: { region?: string; tagline?: string; brand?: string } | null
}

// ---------------------------------------------------------------------------
// Fetch helpers — thin wrappers over the aggregate RPCs. All swallow errors to
// safe empty values so the page degrades gracefully instead of throwing.
// ---------------------------------------------------------------------------
export async function fetchHomePayload(dataSlug: string): Promise<HomePayload> {
  const { data, error } = await condoMarket.rpc('home_page_payload', { p_market_slug: dataSlug })
  if (error || !data) return { stats: null, index: [], market: null }
  const d = data as any
  return {
    stats: (d.stats as HomeStats) ?? null,
    index: Array.isArray(d.index) ? (d.index as HomeIndexBuilding[]) : [],
    market: (d.market as HomePayload['market']) ?? null,
  }
}

export async function fetchRecentSales(dataSlug: string, limit = 12): Promise<RecentSale[]> {
  const { data, error } = await condoMarket.rpc('intelligence_recent_sales', {
    p_limit: limit,
    p_market_slug: dataSlug,
  })
  if (error) return []
  return (data as RecentSale[]) ?? []
}

export async function fetchPsfQuarterly(dataSlug: string): Promise<PsfQuarter[]> {
  const { data, error } = await condoMarket.rpc('intelligence_psf_quarterly', { p_market_slug: dataSlug })
  if (error) return []
  return (data as PsfQuarter[]) ?? []
}

export async function fetchBuildingStats(dataSlug: string, windowMonths = 12): Promise<BuildingStat[]> {
  const { data, error } = await condoMarket.rpc('intelligence_building_stats', {
    p_window_months: windowMonths,
    p_market_slug: dataSlug,
  })
  if (error) return []
  return (data as BuildingStat[]) ?? []
}
