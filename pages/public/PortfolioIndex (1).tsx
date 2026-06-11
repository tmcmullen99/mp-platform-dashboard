// McMullen Properties — public portfolio index.
// Route: "/listings" (no auth). Reads the migrated Webflow portfolio from
// public.properties (anon-readable). Motionsites aesthetic to match the homepage.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

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

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('properties')
        .select(
          'slug, name, price, bedrooms, bathrooms, area_sqft, main_image, statuses(name), neighborhoods(name)'
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

  const visible = useMemo(
    () => (filter === 'All' ? rows : rows.filter((r) => r.status_name === filter)),
    [rows, filter]
  )

  return (
    <div className="mp-home min-h-screen bg-white text-[#0D1B2A]">
      <style>{`
        .mp-home { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
        .mp-serif { font-family: 'Playfair Display', Georgia, serif; font-style: italic; letter-spacing: -0.02em; }
        .mp-mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
      `}</style>

      {/* header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="mp-serif text-2xl font-semibold text-[#0D1B2A]">
            McMullen
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-[#273C46]">
            <Link to="/listings" className="text-[#0D1B2A]">Portfolio</Link>
            <a href="https://mcmullen.properties/buy" className="hover:text-[#0D1B2A] transition-colors">Buy</a>
            <a href="https://mcmullen.properties/sell" className="hover:text-[#0D1B2A] transition-colors">Sell</a>
          </nav>
          <a href="tel:+14156919272" className="text-sm font-medium text-[#0D1B2A] hover:opacity-70">
            (415) 691-9272
          </a>
        </div>
      </header>

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

        {/* filter chips */}
        <div className="flex flex-wrap gap-2 mt-8">
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
        {loading ? (
          <div className="py-24 text-center mp-mono text-xs uppercase tracking-[0.25em] text-[#273C46]">
            Loading portfolio…
          </div>
        ) : visible.length === 0 ? (
          <div className="py-24 text-center text-[#273C46]">No listings in this category yet.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((p) => {
              const tone = statusTone(p.status_name)
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
                      />
                    ) : null}
                    {p.status_name ? (
                      <span
                        className="absolute top-3 left-3 mp-mono text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-full"
                        style={{ color: tone.fg, background: tone.bg, backdropFilter: 'blur(6px)' }}
                      >
                        {p.status_name}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-6">
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
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* footer */}
      <footer className="border-t border-black/[0.07] py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-4 text-sm text-[#273C46]">
          <Link to="/" className="mp-serif text-xl font-semibold text-[#0D1B2A]">McMullen</Link>
          <div className="flex gap-6">
            <a href="tel:+14156919272" className="hover:opacity-70">(415) 691-9272</a>
            <a href="mailto:tim@mcmullen.properties" className="hover:opacity-70">tim@mcmullen.properties</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
