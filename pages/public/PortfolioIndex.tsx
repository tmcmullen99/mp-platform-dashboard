// McMullen Properties — public portfolio index.
// Route: "/listings" (no auth). Reads the migrated Webflow portfolio from
// public.properties (anon-readable). Motionsites aesthetic to match the homepage.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { LogoWordmark } from '@/components/BrandLogo'
import { PublicNav, PublicFooter } from '@/components/public/PublicNav'

type ImageJson = { url: string; alt: string | null } | null

type PropertyRow = {
  slug: string
  name: string
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  area_sqft: number | null
  main_image: ImageJson
  status_name: string | null
  neighborhood_name: string | null
  listing_stage: string | null
}

const STATUS_ORDER = ['Active', 'New Construction', 'Coming Soon', 'Off Market', '1031', 'Sold']

function money(n: number | null): string {
  if (n == null) return 'Price on request'
  return '$' + Math.round(n).toLocaleString()
}

function statusTone(status: string | null): { fg: string; bg: string } {
  switch (status) {
    case 'Active':
      return { fg: '#1f7a4d', bg: 'rgba(31,122,77,0.10)' }
    case 'Sold':
      return { fg: '#0D1B2A', bg: 'rgba(13,27,42,0.08)' }
    case 'New Construction':
    case 'Coming Soon':
      return { fg: '#1d4ed8', bg: 'rgba(29,78,216,0.10)' }
    default:
      return { fg: '#273C46', bg: 'rgba(39,60,70,0.08)' }
  }
}

export default function PortfolioIndex() {
  const [rows, setRows] = useState<PropertyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('All')
  const [query, setQuery] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('properties')
        .select(
          'slug, name, price, bedrooms, bathrooms, area_sqft, main_image, listing_stage, statuses(name), neighborhoods(name)'
        )
        .order('price', { ascending: false, nullsFirst: false })
      if (cancelled) return
      const mapped: PropertyRow[] = (data ?? []).map((r: Record<string, unknown>) => ({
        slug: r.slug as string,
        name: r.name as string,
        price: (r.price as number) ?? null,
        bedrooms: (r.bedrooms as number) ?? null,
        bathrooms: (r.bathrooms as number) ?? null,
        area_sqft: (r.area_sqft as number) ?? null,
        main_image: (r.main_image as ImageJson) ?? null,
        status_name: ((r.statuses as { name?: string } | null)?.name) ?? null,
        neighborhood_name: ((r.neighborhoods as { name?: string } | null)?.name) ?? null,
        listing_stage: (r.listing_stage as string) ?? null,
      }))
      setRows(mapped)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const statuses = useMemo(() => {
    const present = new Set(rows.map((r) => r.status_name).filter(Boolean) as string[])
    const ordered = STATUS_ORDER.filter((s) => present.has(s))
    return ['All', ...ordered]
  }, [rows])

  /* Search matches address, neighbourhood and status together. Someone typing
     "cortland" wants the home; someone typing "bernal" wants the area; someone
     typing "sold" is filtering by outcome. Splitting those into separate inputs
     would make the visitor choose a field before they know which one holds what
     they remember. Terms are ANDed, so "bernal sold" narrows rather than widens. */
  const visible = useMemo(() => {
    const byStatus = filter === 'All' ? rows : rows.filter((r) => r.status_name === filter)
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return byStatus
    return byStatus.filter((r) => {
      const hay = [r.name, r.neighborhood_name, r.status_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return terms.every((t) => hay.includes(t))
    })
  }, [rows, filter, query])

  return (
    <div className="mp-home min-h-screen bg-white text-[#0D1B2A]">
      <style>{`
        .mp-home { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
        .mp-serif { font-family: 'Playfair Display', Georgia, serif; font-style: italic; letter-spacing: -0.02em; }
        .mp-mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
      `}</style>

      {/* header */}
      <PublicNav active="portfolio" />

      {/* intro */}
      <section className="max-w-6xl mx-auto px-6 pt-16 md:pt-20 pb-8">
        <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46] mb-3">
          The portfolio
        </div>
        <h1 className="text-[40px] md:text-[56px] leading-[1.05] font-semibold tracking-tight">
          Every deal, <span className="mp-serif font-normal">mapped.</span>
        </h1>
        <p className="text-[#273C46] text-lg mt-4 max-w-xl leading-relaxed">
          From starter condos to $31M lakefront estates — the homes I&rsquo;ve sold, listed, and held
          across the Bay Area and beyond.
        </p>

        {/* search */}
        <div className="mt-8 relative max-w-md">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="rgba(13,27,42,0.4)" strokeWidth="2" strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by address, neighbourhood or status…"
            aria-label="Search the portfolio"
            className="w-full rounded-full border py-3 pl-11 pr-11 text-sm outline-none transition-colors
                       focus:border-[#0D1B2A]"
            style={{ borderColor: 'rgba(13,27,42,0.15)', color: '#0D1B2A' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm leading-none"
              style={{ color: 'rgba(13,27,42,0.45)' }}
            >
              &times;
            </button>
          )}
        </div>

        {/* filter chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {statuses.map((s) => {
            const active = s === filter
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className="rounded-full px-4 py-2 text-sm font-medium transition-colors border"
                style={
                  active
                    ? { background: '#0D1B2A', color: '#fff', borderColor: '#0D1B2A' }
                    : { background: '#fff', color: '#0D1B2A', borderColor: 'rgba(13,27,42,0.15)' }
                }
              >
                {s}
              </button>
            )
          })}
        </div>
      </section>

      {/* grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        {!loading && query && visible.length > 0 && (
          <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46] pb-6">
            {visible.length} {visible.length === 1 ? 'listing' : 'listings'}
          </div>
        )}
        {loading ? (
          <div className="py-24 text-center mp-mono text-xs uppercase tracking-[0.25em] text-[#273C46]">
            Loading portfolio…
          </div>
        ) : visible.length === 0 ? (
          /* The old copy said "in this category", which reads as a gap in the
             portfolio rather than a search that found nothing. Name the query
             back so the visitor knows the site heard them, and give them a way
             out that does not involve reloading. */
          <div className="py-24 text-center text-[#273C46]">
            {query ? (
              <>
                <div>
                  No listings match &ldquo;{query}&rdquo;
                  {filter !== 'All' ? ` in ${filter}` : ''}.
                </div>
                <button
                  onClick={() => {
                    setQuery('')
                    setFilter('All')
                  }}
                  className="mt-4 underline underline-offset-4"
                >
                  Clear search
                </button>
              </>
            ) : (
              'No listings in this category yet.'
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((p) => {
              const comingSoon = p.listing_stage === 'coming_soon'
              const tone = comingSoon
                ? { fg: '#1d4ed8', bg: 'rgba(29,78,216,0.10)' }
                : statusTone(p.status_name)
              const badge = comingSoon ? 'Coming Soon' : p.status_name
              return (
                <Link
                  key={p.slug}
                  to={`/listings/${p.slug}`}
                  className="group block rounded-[20px] overflow-hidden border border-black/[0.07] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(13,27,42,0.35)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#FAFAF7]">
                    {p.main_image?.url ? (
                      <img
                        src={p.main_image.url}
                        alt={p.main_image.alt ?? p.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        style={comingSoon ? { filter: 'blur(8px)', transform: 'scale(1.08)' } : undefined}
                      />
                    ) : null}
                    {badge ? (
                      <span
                        className="absolute top-3 left-3 mp-mono text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-full"
                        style={{ color: tone.fg, background: tone.bg, backdropFilter: 'blur(6px)' }}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-6">
                    {comingSoon ? (
                      <>
                        <div className="mp-serif text-2xl font-semibold not-italic text-[#0D1B2A]">
                          {p.name}
                        </div>
                        {p.neighborhood_name ? (
                          <div className="text-sm text-[#273C46] mt-0.5">{p.neighborhood_name}</div>
                        ) : null}
                        <div className="mp-mono text-[11px] uppercase tracking-[0.14em] text-[#1d4ed8] mt-3">
                          Get early access →
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mp-serif text-2xl font-semibold not-italic text-[#0D1B2A]">
                          {money(p.price)}
                        </div>
                        <div className="text-[#0D1B2A] mt-1">{p.name}</div>
                        {p.neighborhood_name ? (
                          <div className="text-sm text-[#273C46] mt-0.5">{p.neighborhood_name}</div>
                        ) : null}
                        <div className="flex gap-4 mt-3 text-xs text-[#273C46]">
                          {p.bedrooms != null ? <span>{p.bedrooms} bd</span> : null}
                          {p.bathrooms != null ? <span>{p.bathrooms} ba</span> : null}
                          {p.area_sqft != null ? <span>{Math.round(p.area_sqft).toLocaleString()} sqft</span> : null}
                        </div>
                      </>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* footer */}
      <PublicFooter />
    </div>
  )
}
