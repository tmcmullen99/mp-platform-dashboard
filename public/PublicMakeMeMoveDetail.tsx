// P-Mkt.3 — Public Make-Me-Move browse. Route: /m/:tenantSlug (no auth).
//
// The buyer-facing demand on-ramp: a tenant's active, distributable (market /
// database) Make-Me-Move listings — the same set marketplace_distribute emails
// to the buyer feed. Anon-readable via the mmm_public_read RLS policy. A
// shareable link an agent can drop anywhere; also the link target for feed
// emails. Inquiry / subscribe capture lands in the next sprint.

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowRight, BedDouble, Bath, Ruler, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import PublicLayout, { TenantPublic, TenantBrandingPublic } from '@/components/public/PublicLayout'

type PublicMMM = {
  id: string
  street_address: string | null
  unit_label: string | null
  city: string | null
  state: string | null
  neighborhood: string | null
  property_type: string | null
  beds: number | null
  baths: number | null
  area_sqft: number | null
  make_me_move_price: number
  timeframe: string | null
  photo_urls: string[] | null
}

const PUBLIC_COLS =
  'id, street_address, unit_label, city, state, neighborhood, property_type, beds, baths, area_sqft, make_me_move_price, timeframe, photo_urls'

function money(n: number | null): string {
  if (n == null) return 'Price on request'
  return `$${Math.round(n).toLocaleString()}`
}

function firstPhoto(urls: string[] | null): string | null {
  return Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'string' ? urls[0] : null
}

export default function PublicMakeMeMove() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tenant, setTenant] = useState<TenantPublic | null>(null)
  const [branding, setBranding] = useState<TenantBrandingPublic | null>(null)
  const [listings, setListings] = useState<PublicMMM[]>([])

  useEffect(() => {
    if (!tenantSlug) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setNotFound(false)

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, slug, name:display_name')
        .eq('slug', tenantSlug)
        .maybeSingle()

      if (cancelled) return
      if (!tenantData) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const tid = (tenantData as { id: string }).id
      setTenant(tenantData as TenantPublic)

      const [brandingRes, listingsRes] = await Promise.all([
        supabase.from('tenant_branding').select('*').eq('tenant_id', tid).maybeSingle(),
        supabase
          .from('make_me_move_listings')
          .select(PUBLIC_COLS)
          .eq('tenant_id', tid)
          .eq('status', 'active')
          .in('visibility', ['market', 'database'])
          .order('created_at', { ascending: false }),
      ])

      if (cancelled) return
      setBranding(brandingRes.data as TenantBrandingPublic | null)
      setListings((listingsRes.data as PublicMMM[]) || [])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [tenantSlug])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-2xs uppercase tracking-widest text-ink-500">Loading…</div>
      </div>
    )
  }

  if (notFound || !tenant) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">404</div>
          <h1 className="font-display text-3xl text-ink-900 mb-3">Not found</h1>
          <p className="text-ink-600 mb-6">We couldn’t find a brokerage at this address.</p>
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

  const accent = branding?.primary_color || '#1a1f2e'

  return (
    <PublicLayout tenant={tenant} branding={branding || undefined}>
      {/* Hero */}
      <section className="border-b border-ink-200">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Off-market & make-me-move</div>
          <h1 className="font-display text-4xl md:text-5xl text-ink-900 leading-tight max-w-3xl">
            Homes you won’t find on the open market.
          </h1>
          <p className="text-ink-600 mt-4 max-w-2xl leading-relaxed">
            These owners have named a price they’d move for. Reach out through {branding?.agent_name || tenant.name} to
            explore any of them before they ever list publicly.
          </p>
        </div>
      </section>

      {/* Listings */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        {listings.length === 0 ? (
          <div className="border border-dashed border-ink-200 py-20 text-center">
            <div className="text-sm text-ink-700 font-medium">No off-market homes available right now.</div>
            <p className="text-ink-500 text-sm mt-1">
              Check back soon — or contact {branding?.agent_name || tenant.name} to be matched as new listings appear.
            </p>
            {branding?.agent_email && (
              <a
                href={`mailto:${branding.agent_email}`}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-2xs uppercase tracking-widest text-cream"
                style={{ background: accent }}
              >
                Get in touch <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-6">
              {listings.length} home{listings.length === 1 ? '' : 's'} available
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((l) => {
                const photo = firstPhoto(l.photo_urls)
                const where = [l.neighborhood, l.city, l.state].filter(Boolean).join(', ')
                return (
                  <Link
                    key={l.id}
                    to={`/m/${tenant.slug}/${l.id}`}
                    className="group border border-ink-200 bg-white overflow-hidden hover:border-ink-900 transition-colors flex flex-col"
                  >
                    <div className="aspect-[4/3] bg-ink-100 overflow-hidden">
                      {photo ? (
                        <img
                          src={photo}
                          alt={l.street_address || 'Off-market home'}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-ink-300">
                          <MapPin className="w-8 h-8" strokeWidth={1.25} />
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="font-display text-2xl text-ink-900 tabular-nums leading-none">
                        {money(l.make_me_move_price)}
                      </div>
                      {(l.street_address || where) && (
                        <div className="text-sm text-ink-700 mt-2 truncate">
                          {l.street_address ? `${l.street_address}${l.unit_label ? ` ${l.unit_label}` : ''}` : where}
                        </div>
                      )}
                      {l.street_address && where && (
                        <div className="text-xs text-ink-500 mt-0.5 truncate">{where}</div>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-2xs uppercase tracking-widest text-ink-500 flex-wrap">
                        {l.property_type && <span>{l.property_type}</span>}
                        {l.beds != null && (
                          <span className="inline-flex items-center gap-1">
                            <BedDouble className="w-3 h-3" /> {l.beds}
                          </span>
                        )}
                        {l.baths != null && (
                          <span className="inline-flex items-center gap-1">
                            <Bath className="w-3 h-3" /> {l.baths}
                          </span>
                        )}
                        {l.area_sqft != null && (
                          <span className="inline-flex items-center gap-1">
                            <Ruler className="w-3 h-3" /> {l.area_sqft.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between text-2xs uppercase tracking-widest text-ink-400 group-hover:text-ink-900 transition-colors">
                        <span>{l.timeframe || 'View details'}</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </section>
    </PublicLayout>
  )
}
