// Sprint 3 — Public market page (the "mini condo market"). Route: /market/:slug (no auth).
//
// One anon call to market_public(slug) returns market + tenant + branding +
// recent_sales (the comps of the latest CMA tagged to the market). When the MLS
// feed lands later it repoints the same RPC and this page is unchanged. Mirrors
// the public Make-Me-Move chrome (PublicLayout, ink/cream, primary-color accent).

import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowRight, BedDouble, Bath, Ruler, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import PublicLayout, { TenantPublic, TenantBrandingPublic } from '@/components/public/PublicLayout'

type Sale = {
  mls?: string | null
  address?: string | null
  city?: string | null
  soldPrice?: number | null
  listPrice?: number | null
  soldDate?: string | null
  soldDateIso?: string | null
  beds?: number | null
  bathsFull?: number | null
  bathsPartial?: number | null
  sqft?: number | null
  pricePerSqft?: number | null
  daysOnMarket?: number | null
  listingUrl?: string | null
}

type MarketPublic = {
  market: { id: string; name: string; slug: string; geo: { cities?: string[]; state?: string } | null; description: string | null }
  tenant: { id: string; slug: string; display_name: string }
  branding: Record<string, unknown> | null
  recent_sales: { as_of: string | null; count: number; sales: Sale[]; cma_name: string | null }
}

function money(n: number | null | undefined): string {
  if (n == null) return '—'
  return `$${Math.round(n).toLocaleString()}`
}
function bathsLabel(s: Sale): string | null {
  const f = s.bathsFull ?? 0
  const p = s.bathsPartial ?? 0
  if (!f && !p) return null
  return String(f + p * 0.5)
}
function soldDateLabel(s: Sale): string | null {
  if (s.soldDate) return s.soldDate
  if (s.soldDateIso) {
    const d = new Date(s.soldDateIso)
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  return null
}
function overList(s: Sale): number | null {
  if (s.soldPrice && s.listPrice && s.listPrice > 0) return (s.soldPrice / s.listPrice - 1) * 100
  return null
}
function ppsf(s: Sale): number | null {
  if (s.pricePerSqft) return s.pricePerSqft
  if (s.soldPrice && s.sqft && s.sqft > 0) return Math.round(s.soldPrice / s.sqft)
  return null
}

export default function PublicMarket() {
  const { slug } = useParams<{ slug: string }>()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [data, setData] = useState<MarketPublic | null>(null)
  const [sortBy, setSortBy] = useState<'recent' | 'price' | 'ppsf'>('recent')

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setNotFound(false)
      const { data: res } = await supabase.rpc('market_public', { p_slug: slug })
      if (cancelled) return
      if (!res) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setData(res as MarketPublic)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  const sales = useMemo(() => {
    const list = [...(data?.recent_sales?.sales || [])]
    if (sortBy === 'price') list.sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0))
    else if (sortBy === 'ppsf') list.sort((a, b) => (ppsf(b) ?? 0) - (ppsf(a) ?? 0))
    else list.sort((a, b) => (b.soldDateIso || '').localeCompare(a.soldDateIso || ''))
    return list
  }, [data, sortBy])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-2xs uppercase tracking-widest text-ink-500">Loading…</div>
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">404</div>
          <h1 className="font-display text-3xl text-ink-900 mb-3">Market not found</h1>
          <p className="text-ink-600 mb-6">We couldn’t find an active market at this address.</p>
          <Link
            to="/listings"
            className="inline-flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-900 hover:text-ink-700 border-b border-ink-300 pb-0.5"
          >
            Browse all listings <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    )
  }

  const { market } = data
  const tenant: TenantPublic = { id: data.tenant.id, slug: data.tenant.slug, name: data.tenant.display_name }
  const b = data.branding
  const branding = (b || undefined) as unknown as TenantBrandingPublic | undefined
  const accent = (b?.primary_color as string) || '#1a1f2e'
  const agentEmail = (b?.agent_email as string | null) || null
  const agentName = (b?.agent_name as string | null) || tenant.name
  const cities = Array.isArray(market.geo?.cities) && market.geo!.cities!.length ? market.geo!.cities!.join(', ') : market.name
  const asOf = data.recent_sales?.as_of
    ? new Date(data.recent_sales.as_of).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <PublicLayout tenant={tenant} branding={branding}>
      {/* Hero */}
      <section className="border-b border-ink-200">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">The {market.name} Market</div>
          <h1 className="font-display text-4xl md:text-5xl text-ink-900 leading-tight max-w-3xl">
            What’s really happening in {market.name}.
          </h1>
          <p className="text-ink-600 mt-4 max-w-2xl leading-relaxed">
            Recent sales, real values, and off-market opportunities in {cities} — tracked and curated by {agentName}.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            {agentEmail && (
              <a
                href={`mailto:${agentEmail}?subject=My ${market.name} home value`}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-2xs uppercase tracking-widest text-cream"
                style={{ background: accent }}
              >
                Get your home’s value <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
            <Link
              to={`/m/${tenant.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-2xs uppercase tracking-widest text-ink-900 border border-ink-300 hover:border-ink-900"
            >
              Browse off-market homes <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Recent sales */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <h2 className="font-display text-2xl text-ink-900">Recent sales</h2>
            {asOf && <div className="text-2xs uppercase tracking-widest text-ink-400 mt-1">As of {asOf}</div>}
          </div>
          {sales.length > 0 && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'price' | 'ppsf')}
              className="border border-ink-200 px-3 py-2 text-2xs uppercase tracking-widest bg-white text-ink-700"
            >
              <option value="recent">Most recent</option>
              <option value="price">Highest price</option>
              <option value="ppsf">$ / sqft</option>
            </select>
          )}
        </div>

        {sales.length === 0 ? (
          <div className="border border-dashed border-ink-200 py-20 text-center">
            <div className="text-sm text-ink-700 font-medium">Recent {market.name} sales are being compiled.</div>
            <p className="text-ink-500 text-sm mt-1">
              Check back shortly — or reach out to {agentName} for the latest comparable sales.
            </p>
            {agentEmail && (
              <a
                href={`mailto:${agentEmail}`}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-2xs uppercase tracking-widest text-cream"
                style={{ background: accent }}
              >
                Get in touch <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sales.map((s, i) => {
              const ol = overList(s)
              const pps = ppsf(s)
              const baths = bathsLabel(s)
              const sd = soldDateLabel(s)
              const card = (
                <div className="border border-ink-200 bg-white p-5 h-full flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-display text-2xl text-ink-900 tabular-nums leading-none">{money(s.soldPrice)}</div>
                    {ol != null && ol >= 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-2xs uppercase tracking-widest bg-emerald-50 text-emerald-700 shrink-0">
                        <TrendingUp className="w-3 h-3" /> {ol < 1 ? '<1' : Math.round(ol)}% over
                      </span>
                    )}
                  </div>
                  {s.address && <div className="text-sm text-ink-800 mt-2 truncate">{s.address}</div>}
                  {s.city && <div className="text-xs text-ink-500 mt-0.5 truncate">{s.city}</div>}
                  <div className="flex items-center gap-3 mt-3 text-2xs uppercase tracking-widest text-ink-500 flex-wrap">
                    {s.beds != null && (
                      <span className="inline-flex items-center gap-1">
                        <BedDouble className="w-3 h-3" /> {s.beds}
                      </span>
                    )}
                    {baths && (
                      <span className="inline-flex items-center gap-1">
                        <Bath className="w-3 h-3" /> {baths}
                      </span>
                    )}
                    {s.sqft != null && (
                      <span className="inline-flex items-center gap-1">
                        <Ruler className="w-3 h-3" /> {s.sqft.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between text-2xs uppercase tracking-widest text-ink-400">
                    <span>{sd || 'Sold'}</span>
                    {pps != null && <span className="text-ink-600">${pps.toLocaleString()}/sqft</span>}
                  </div>
                </div>
              )
              return s.listingUrl ? (
                <a
                  key={s.mls || i}
                  href={s.listingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:opacity-95 transition-opacity"
                >
                  {card}
                </a>
              ) : (
                <div key={s.mls || i}>{card}</div>
              )
            })}
          </div>
        )}
      </section>

      {/* Make-me-move CTA band */}
      <section className="border-t border-ink-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-14 text-center">
          <h2 className="font-display text-3xl text-ink-900">Would you sell at the right price?</h2>
          <p className="text-ink-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            Many {market.name} owners quietly set a “make-me-move” number — the price that would make selling worth it.
            Name yours, and {agentName} will bring you qualified, off-market interest.
          </p>
          {agentEmail && (
            <a
              href={`mailto:${agentEmail}?subject=My ${market.name} make-me-move price`}
              className="mt-6 inline-flex items-center gap-2 px-5 py-3 text-2xs uppercase tracking-widest text-cream"
              style={{ background: accent }}
            >
              Name your make-me-move price <ArrowRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </section>
    </PublicLayout>
  )
}
