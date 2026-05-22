// P9.13.2 — Tenant home page.
//
// Route: /t/:tenantSlug (no auth)
//
// Hero with tenant_branding's hero_title / hero_subtitle / hero_image_url.
// Agent bio + photo. Up to 6 featured public listings. Service areas chips.
// Once mcmullen.properties points at the platform (P9.13.5), the apex of
// that domain will route here.

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ArrowRight, MapPin } from 'lucide-react'
import PublicLayout, {
  TenantPublic,
  TenantBrandingPublic,
} from '@/components/public/PublicLayout'

type FeaturedListing = {
  deal_id: string
  slug: string
  name: string
  neighborhood: string | null
  hero_image_url: string | null
  hero_photo_path: string | null
  price_estimate: string | null
  listing_status: string
}

export default function TenantHome() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const [loading, setLoading] = useState(true)
  const [tenant, setTenant] = useState<TenantPublic | null>(null)
  const [branding, setBranding] = useState<TenantBrandingPublic | null>(null)
  const [listings, setListings] = useState<FeaturedListing[]>([])
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!tenantSlug) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setNotFound(false)

      // 1. Tenant by slug
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

      setTenant(tenantData as TenantPublic)

      // 2. Branding + featured deals
      const [brandingRes, dealsRes] = await Promise.all([
        supabase
          .from('tenant_branding')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .maybeSingle(),
        supabase
          .from('deals')
          .select('id, listing_status, coming_soon_listing_id, created_at')
          .eq('tenant_id', tenantData.id)
          .eq('deal_type', 'sell')
          .in('listing_status', ['soft_launch', 'active', 'pending'])
          .not('coming_soon_listing_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(6),
      ])

      if (cancelled) return
      setBranding(brandingRes.data as TenantBrandingPublic | null)

      const deals = (dealsRes.data || []) as Array<{
        id: string
        listing_status: string
        coming_soon_listing_id: string
      }>

      if (deals.length > 0) {
        const listingIds = deals.map((d) => d.coming_soon_listing_id)
        const dealIds = deals.map((d) => d.id)

        const [csls, photoRows] = await Promise.all([
          supabase
            .from('coming_soon_listings')
            .select(
              'id, slug, name, neighborhood, hero_image_url, price_estimate',
            )
            .in('id', listingIds),
          supabase
            .from('listing_photos')
            .select('deal_id, storage_path, is_hero, sort_order')
            .in('deal_id', dealIds)
            .order('sort_order', { ascending: true }),
        ])

        if (cancelled) return

        const cslMap = new Map<string, Record<string, unknown>>()
        ;(csls.data || []).forEach((c) => {
          cslMap.set((c as { id: string }).id, c as Record<string, unknown>)
        })
        const photosByDeal = new Map<
          string,
          { path: string; is_hero: boolean }
        >()
        ;(photoRows.data || []).forEach((p) => {
          const row = p as {
            deal_id: string
            storage_path: string
            is_hero: boolean
          }
          const existing = photosByDeal.get(row.deal_id)
          if (!existing || (row.is_hero && !existing.is_hero)) {
            photosByDeal.set(row.deal_id, {
              path: row.storage_path,
              is_hero: row.is_hero,
            })
          }
        })

        const featured: FeaturedListing[] = deals
          .map((d) => {
            const csl = cslMap.get(d.coming_soon_listing_id) as
              | {
                  slug: string
                  name: string
                  neighborhood: string | null
                  hero_image_url: string | null
                  price_estimate: string | null
                }
              | undefined
            if (!csl) return null
            return {
              deal_id: d.id,
              slug: csl.slug,
              name: csl.name,
              neighborhood: csl.neighborhood,
              hero_image_url: csl.hero_image_url,
              hero_photo_path: photosByDeal.get(d.id)?.path || null,
              price_estimate: csl.price_estimate,
              listing_status: d.listing_status,
            }
          })
          .filter((x): x is FeaturedListing => x !== null)

        setListings(featured)
      }

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
        <div className="text-2xs uppercase tracking-widest text-ink-500">
          Loading…
        </div>
      </div>
    )
  }

  if (notFound || !tenant) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
            404
          </div>
          <h1 className="font-display text-3xl text-ink-900 mb-3">
            Site not found
          </h1>
          <p className="text-ink-600 mb-6">
            We couldn’t find a brokerage at this address.
          </p>
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

  return (
    <PublicLayout tenant={tenant} branding={branding || undefined}>
      {/* Hero */}
      <section className="relative bg-ink-900 text-cream overflow-hidden">
        {branding?.hero_image_url && (
          <div className="absolute inset-0">
            <img
              src={branding.hero_image_url}
              alt=""
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/50 to-transparent" />
          </div>
        )}
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-36">
          <h1 className="font-display text-5xl md:text-6xl leading-tight max-w-3xl">
            {branding?.hero_title || tenant.name}
          </h1>
          {branding?.hero_subtitle && (
            <p className="text-lg md:text-xl text-cream/80 mt-5 max-w-2xl leading-relaxed italic">
              {branding.hero_subtitle}
            </p>
          )}
          <Link
            to="/listings"
            className="inline-flex items-center gap-2 mt-10 px-5 py-3 bg-cream text-ink-900 text-2xs uppercase tracking-widest hover:bg-white"
          >
            View listings <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Agent intro */}
      {(branding?.agent_bio || branding?.agent_name) && (
        <section className="max-w-5xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-3 gap-10 items-start">
            {branding.agent_photo_url && (
              <div>
                <img
                  src={branding.agent_photo_url}
                  alt={branding.agent_name || ''}
                  className="w-full aspect-[3/4] object-cover"
                />
              </div>
            )}
            <div
              className={branding.agent_photo_url ? 'md:col-span-2' : 'md:col-span-3 max-w-3xl'}
            >
              <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">
                About
              </div>
              <h2 className="font-display text-3xl text-ink-900 mb-2">
                {branding.agent_name}
              </h2>
              {branding.agent_title && (
                <div className="text-ink-600 mb-5">{branding.agent_title}</div>
              )}
              {branding.agent_bio && (
                <div
                  className="prose max-w-none text-ink-700 leading-relaxed prose-headings:font-display prose-headings:text-ink-900"
                  dangerouslySetInnerHTML={{ __html: branding.agent_bio }}
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* Featured listings */}
      {listings.length > 0 && (
        <section className="bg-ink-50 py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-baseline justify-between mb-10 flex-wrap gap-4">
              <div>
                <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
                  Featured
                </div>
                <h2 className="font-display text-3xl text-ink-900">
                  Current listings
                </h2>
              </div>
              <Link
                to="/listings"
                className="text-2xs uppercase tracking-widest text-ink-700 hover:text-ink-900 inline-flex items-center gap-1.5"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {listings.map((l) => (
                <FeaturedListingCard key={l.deal_id} listing={l} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Service areas */}
      {branding?.service_areas && branding.service_areas.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
            Service areas
          </div>
          <h2 className="font-display text-3xl text-ink-900 mb-6">
            Where we serve
          </h2>
          <div className="flex flex-wrap gap-2">
            {branding.service_areas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1.5 border border-ink-200 px-3 py-1.5 text-sm text-ink-700"
              >
                <MapPin
                  className="w-3.5 h-3.5 text-ink-400"
                  strokeWidth={1.5}
                />
                {area}
              </span>
            ))}
          </div>
        </section>
      )}
    </PublicLayout>
  )
}

function FeaturedListingCard({ listing }: { listing: FeaturedListing }) {
  let photoUrl = listing.hero_image_url
  if (listing.hero_photo_path) {
    const { data } = supabase.storage
      .from('listing-photos')
      .getPublicUrl(listing.hero_photo_path)
    photoUrl = data.publicUrl
  }
  return (
    <Link to={`/listings/${listing.slug}`} className="group block">
      <div className="aspect-[4/3] bg-ink-100 overflow-hidden mb-3">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={listing.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-400 text-2xs uppercase tracking-widest">
            No photo
          </div>
        )}
      </div>
      <h3 className="font-display text-xl text-ink-900 group-hover:underline">
        {listing.name}
      </h3>
      {listing.neighborhood && (
        <div className="text-sm text-ink-600 mt-1">{listing.neighborhood}</div>
      )}
      {listing.price_estimate && (
        <div className="text-sm text-ink-900 mt-1">{listing.price_estimate}</div>
      )}
    </Link>
  )
}
