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
  regionSlug: string // URL segment for internal building pages, e.g. 'san-francisco'
  cmDomain: string   // Condo Market domain for outbound backlinks (no www prefix)
  blurb: string
  blogTags: string[]
  available: boolean // false = shown in the selector as "coming soon" (no live feed yet)
}

// Canonical Condo Market building-page URL for a slug on a given market.
// Verified against the Condo Market _worker.js: /building/<slug>/ (singular,
// trailing slash) on the www host. Links to this exact form hit the canonical
// page with zero redirect hops.
export function condoMarketBuildingUrl(cmDomain: string, slug: string): string {
  return `https://www.${cmDomain}/building/${slug}/`
}

// Internal McMullen building-page path — this is what goes in OUR sitemap so we
// rank for the building's address and name on our own domain.
export function marketBuildingPath(regionSlug: string, slug: string): string {
  return `/market/${regionSlug}/${slug}`
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
    regionSlug: 'san-francisco',
    cmDomain: 'sanfranciscocondomarket.com',
    blurb:
      'Ten years of closed sales across every San Francisco condo building — median price per square foot, live activity, and building-level detail.',
    blogTags: ['sf'],
    available: true,
  },
  {
    key: 'sv',
    name: 'Silicon Valley Condos',
    shortName: 'Silicon Valley',
    dataSlug: 'silicon-valley-condo-market',
    regionSlug: 'silicon-valley',
    cmDomain: 'siliconvalleycondomarket.com',
    blurb:
      'The condo and townhome market across Silicon Valley — closed-sale trends, price per square foot, and building activity from Campbell to Palo Alto.',
    blogTags: ['sv'],
    available: true,
  },
  {
    key: 'eichler',
    name: 'Eichler Homes',
    shortName: 'Eichler',
    dataSlug: 'eichler-market',
    regionSlug: 'eichler',
    cmDomain: 'eichlermarket.com',
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
    regionSlug: 'campbell',
    cmDomain: 'siliconvalleycondomarket.com',
    blurb:
      'The Campbell residential market — Tim’s home turf. A dedicated data feed is on the way.',
    blogTags: ['campbell'],
    available: false,
  },
]

export function marketByKey(key: string): MarketConfig | undefined {
  return MARKETS.find((m) => m.key === key)
}

// Resolve a market by its region URL segment (for /market/:region/:slug routes).
export function marketByRegionSlug(regionSlug: string): MarketConfig | undefined {
  return MARKETS.find((m) => m.regionSlug === regionSlug)
}

// ---------------------------------------------------------------------------
// Service registry — one entry per McMullen service page. `tag` is the
// NAMESPACED blog tag used to associate feature articles with the service.
// Namespacing ('service:') guarantees these never collide with the legacy
// location/topic tags migrated from Webflow. Only NEW service articles carry
// these tags; existing posts are untouched.
// ---------------------------------------------------------------------------
export type ServiceConfig = {
  slug: string   // matches the route: /services/<slug>
  name: string
  tag: string    // namespaced blog tag, e.g. 'service:luxury-listing'
}

export const SERVICES: ServiceConfig[] = [
  { slug: 'luxury-listing',    name: 'Luxury Listing Marketing', tag: 'service:luxury-listing' },
  { slug: 'disclosure-review', name: 'Disclosure Review',        tag: 'service:disclosure-review' },
  { slug: '1031-exchange',     name: '1031 Exchange',            tag: 'service:1031-exchange' },
  { slug: 'commercial',        name: 'Commercial Real Estate',   tag: 'service:commercial' },
  { slug: 'home-improvement',  name: 'Home Improvement',         tag: 'service:home-improvement' },
  { slug: 'flips',             name: 'Flips & Off-Market',       tag: 'service:flips' },
  { slug: 'sell-with-tenants', name: 'Sell Tenant-Occupied',     tag: 'service:sell-with-tenants' },
]

export function serviceBySlug(slug: string): ServiceConfig | undefined {
  return SERVICES.find((s) => s.slug === slug)
}

// ---------------------------------------------------------------------------
// Typed shapes for the RPC responses we consume.
// ---------------------------------------------------------------------------

// Citywide monthly aggregate (SF-only; no market slug). Retained for the
// legacy LiveMarketStatBand (Stage-1 proof component). The Market hub itself
// now uses the market-scoped home_page_payload instead.
export type CityMonthly = {
  month: string
  sales: number
  volume: number
  median_price: number
  median_psf: number
  active_buildings: number
}

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
  market: { region?: string; tagline?: string; brand?: string; domain?: string } | null
}

// building_page_payload — per-building detail from the Condo Market marketplace.
// We surface a slice of this on the MR bridge page as a "taste" of the live feed
// before handing the visitor to the full marketplace page.
export type BuildingLastSale = { date: string | null; unit: string | null; price: number | null }
export type BuildingStats = {
  last_sale: BuildingLastSale | null
  sold_12mo: number | null
  median_psf_12mo: number | null
  median_psf_city: number | null
  median_psf_hood: number | null
  psf_vs_city_pct: number | null
  psf_vs_hood_pct: number | null
  median_price_12mo: number | null
}
export type BuildingDetail = {
  slug: string
  name: string
  address: string
  neighborhood: string | null
  year_built: number | null
  unit_count: number | null
  active_count: number | null
  hero_url: string | null
  tagline: string | null
  description: string | null
  market_name: string | null
  stats: BuildingStats | null
  is_live: boolean
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

// Full per-building detail for the MR bridge page. Returns null if the slug
// doesn't resolve or the building isn't live on the marketplace.
export async function fetchBuildingDetail(slug: string): Promise<BuildingDetail | null> {
  const { data, error } = await condoMarket.rpc('building_page_payload', { p_slug: slug })
  if (error || !data) return null
  const d = data as any
  if (d.is_live !== true) return null
  return {
    slug: d.slug ?? slug,
    name: d.name ?? '',
    address: d.address ?? '',
    neighborhood: d.neighborhood ?? null,
    year_built: d.year_built ?? null,
    unit_count: d.unit_count ?? null,
    active_count: d.active_count ?? null,
    hero_url: d.hero_url ?? null,
    tagline: d.tagline ?? null,
    description: d.description ?? null,
    market_name: d.market_name ?? null,
    stats: (d.stats as BuildingStats) ?? null,
    is_live: true,
  }
}

// Citywide monthly aggregate (SF-only; no market slug). Retained for the
// legacy LiveMarketStatBand proof component.
export async function fetchCityMonthly(months = 36): Promise<CityMonthly[]> {
  const { data, error } = await condoMarket.rpc('intelligence_city_monthly', { p_months: months })
  if (error) return []
  return (data as CityMonthly[]) ?? []
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
