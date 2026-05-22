// P9.13.0 — Public listing detail page.
//
// Route: /listings/:slug (no auth)
//
// Anon-RLS-gated. The slug looks up coming_soon_listings; the deal that
// references it MUST exist and have listing_status IN (soft_launch, active,
// pending) — otherwise the lookups return nothing and we render a 404.
// Tenant + branding derived from the deal's tenant_id.

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { trackEvent } from '@/lib/beacon'
import {
  Bed,
  Bath,
  Square,
  MapPin,
  Calendar,
  Mail,
  Phone,
  ArrowLeft,
} from 'lucide-react'
import PublicLayout, {
  TenantPublic,
  TenantBrandingPublic,
} from '@/components/public/PublicLayout'
import InquiryModal from '@/components/public/InquiryModal'

type Listing = {
  id: string
  slug: string
  name: string
  subtitle: string | null
  neighborhood: string | null
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  area_sqft: number | null
  price_estimate: string | null
  expected_list_date: string | null
  description_html: string | null
  features_html: string | null
  hero_image_url: string | null
  hero_image_alt: string | null
}

type Photo = {
  id: string
  storage_path: string
  caption: string | null
  alt_text: string | null
  sort_order: number
  is_hero: boolean
}

type DealRow = {
  id: string
  tenant_id: string
  listing_status: string
}

export default function PublicListingDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [loading, setLoading] = useState(true)
  const [listing, setListing] = useState<Listing | null>(null)
  const [deal, setDeal] = useState<DealRow | null>(null)
  const [photos, setPhotos] = useState<Array<Photo & { url: string }>>([])
  const [tenant, setTenant] = useState<TenantPublic | null>(null)
  const [branding, setBranding] = useState<TenantBrandingPublic | null>(null)
  const [activeUrl, setActiveUrl] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [inquiryOpen, setInquiryOpen] = useState(false)

  useEffect(() => {
    if (!slug) return
    // D.0b: beacon a page_view, attributed to a campaign recipient if the link
    // carried ?e=<tracking_token>.
    const e = new URLSearchParams(window.location.search).get('e')
    trackEvent({ event_type: 'page_view', campaign_token: e, page_path: `/listings/${slug}` })
    let cancelled = false

    async function load() {
      setLoading(true)
      setNotFound(false)

      // 1. Look up listing by slug
      const { data: listingData } = await supabase
        .from('coming_soon_listings')
        .select(
          'id, slug, name, subtitle, neighborhood, property_type, bedrooms, bathrooms, area_sqft, price_estimate, expected_list_date, description_html, features_html, hero_image_url, hero_image_alt',
        )
        .eq('slug', slug)
        .maybeSingle()

      if (cancelled) return
      if (!listingData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      // 2. Find the deal that owns this listing (RLS filters to public statuses)
      const { data: dealData } = await supabase
        .from('deals')
        .select('id, tenant_id, listing_status')
        .eq('coming_soon_listing_id', listingData.id)
        .eq('deal_type', 'sell')
        .in('listing_status', ['soft_launch', 'active', 'pending'])
        .limit(1)
        .maybeSingle()

      if (cancelled) return
      if (!dealData) {
        // Listing exists but isn't public — treat as 404
        setNotFound(true)
        setLoading(false)
        return
      }

      setListing(listingData as Listing)
      setDeal(dealData as DealRow)

      // 3. Photos + tenant + branding in parallel
      const [photoRes, tenantRes, brandingRes] = await Promise.all([
        supabase
          .from('listing_photos')
          .select('id, storage_path, caption, alt_text, sort_order, is_hero')
          .eq('deal_id', dealData.id)
          .order('sort_order', { ascending: true }),
        supabase
          .from('tenants')
          .select('id, slug, name:display_name')
          .eq('id', dealData.tenant_id)
          .maybeSingle(),
        supabase
          .from('tenant_branding')
          .select('*')
          .eq('tenant_id', dealData.tenant_id)
          .maybeSingle(),
      ])

      if (cancelled) return

      const photoRows = (photoRes.data || []) as Photo[]
      const withUrls = photoRows.map((p) => {
        const { data: urlData } = supabase.storage
          .from('listing-photos')
          .getPublicUrl(p.storage_path)
        return { ...p, url: urlData.publicUrl }
      })
      setPhotos(withUrls)

      const heroPhoto = withUrls.find((p) => p.is_hero) || withUrls[0]
      if (heroPhoto) {
        setActiveUrl(heroPhoto.url)
      } else if (listingData.hero_image_url) {
        setActiveUrl(listingData.hero_image_url)
      }

      setTenant(tenantRes.data as TenantPublic | null)
      setBranding(brandingRes.data as TenantBrandingPublic | null)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-2xs uppercase tracking-widest text-ink-500">
          Loading listing…
        </div>
      </div>
    )
  }

  if (notFound || !listing) {
    return (
      <PublicLayout
        tenant={tenant || undefined}
        branding={branding || undefined}
      >
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
            404
          </div>
          <h1 className="font-display text-3xl text-ink-900 mb-3">
            Listing not found
          </h1>
          <p className="text-ink-600 mb-6">
            This listing may have been removed, sold, or isn’t public yet.
          </p>
          <Link
            to="/listings"
            className="inline-flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-900 hover:text-ink-700 border-b border-ink-300 pb-0.5"
          >
            <ArrowLeft className="w-3 h-3" /> Browse all listings
          </Link>
        </div>
      </PublicLayout>
    )
  }

  const isPending = deal?.listing_status === 'pending'
  const isSoftLaunch = deal?.listing_status === 'soft_launch'

  return (
    <PublicLayout tenant={tenant || undefined} branding={branding || undefined}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link
          to="/listings"
          className="inline-flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> All listings
        </Link>

        {/* Hero photo */}
        {activeUrl && (
          <div className="aspect-[16/9] bg-ink-100 overflow-hidden mb-3">
            <img
              src={activeUrl}
              alt={listing.hero_image_alt || listing.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Thumbnails */}
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-10">
            {photos.map((p) => {
              const isActive = p.url === activeUrl
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveUrl(p.url)}
                  className={`w-20 h-20 shrink-0 overflow-hidden border-2 ${
                    isActive ? 'border-ink-900' : 'border-transparent hover:border-ink-300'
                  }`}
                >
                  <img
                    src={p.url}
                    alt={p.alt_text || ''}
                    className="w-full h-full object-cover"
                  />
                </button>
              )
            })}
          </div>
        )}

        {/* Content grid */}
        <div className="grid md:grid-cols-3 gap-10">
          {/* Left: details */}
          <div className="md:col-span-2 space-y-10">
            <header>
              {(isPending || isSoftLaunch) && (
                <span
                  className={`inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest px-2 py-0.5 mb-3 ${
                    isPending
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-sky-50 text-sky-700'
                  }`}
                >
                  {isPending ? 'Pending' : 'Coming soon'}
                </span>
              )}
              <h1 className="font-display text-4xl md:text-5xl text-ink-900 leading-tight mb-2">
                {listing.name}
              </h1>
              {listing.subtitle && (
                <p className="text-lg text-ink-600 italic leading-relaxed">
                  {listing.subtitle}
                </p>
              )}
              {listing.neighborhood && (
                <div className="mt-3 flex items-center gap-2 text-sm text-ink-600">
                  <MapPin className="w-4 h-4" strokeWidth={1.5} />
                  {listing.neighborhood}
                </div>
              )}
            </header>

            {/* Stats strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-y border-ink-200 py-6">
              {listing.bedrooms !== null && (
                <Stat
                  icon={Bed}
                  value={listing.bedrooms}
                  label="Bedrooms"
                />
              )}
              {listing.bathrooms !== null && (
                <Stat
                  icon={Bath}
                  value={listing.bathrooms}
                  label="Bathrooms"
                />
              )}
              {listing.area_sqft && (
                <Stat
                  icon={Square}
                  value={listing.area_sqft.toLocaleString()}
                  label="Square feet"
                />
              )}
              {listing.price_estimate && (
                <Stat value={listing.price_estimate} label="Price" />
              )}
            </div>

            {/* Description */}
            {listing.description_html && (
              <section>
                <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
                  About this home
                </div>
                <div
                  className="prose max-w-none text-ink-700 leading-relaxed prose-headings:font-display prose-headings:text-ink-900"
                  dangerouslySetInnerHTML={{ __html: listing.description_html }}
                />
              </section>
            )}

            {/* Features */}
            {listing.features_html && (
              <section>
                <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
                  Features
                </div>
                <div
                  className="prose max-w-none text-ink-700 leading-relaxed prose-headings:font-display prose-headings:text-ink-900"
                  dangerouslySetInnerHTML={{ __html: listing.features_html }}
                />
              </section>
            )}

            {/* Expected list date */}
            {listing.expected_list_date && isSoftLaunch && (
              <div className="text-sm text-ink-600 flex items-center gap-2 border-t border-ink-200 pt-6">
                <Calendar className="w-4 h-4" strokeWidth={1.5} />
                Expected on market:{' '}
                {new Date(listing.expected_list_date).toLocaleDateString(
                  'en-US',
                  { month: 'long', day: 'numeric', year: 'numeric' },
                )}
              </div>
            )}
          </div>

          {/* Right: agent card (sticky on desktop) */}
          <aside className="md:col-span-1">
            <div className="md:sticky md:top-24">
              <AgentCard
                branding={branding}
                onInquire={() => setInquiryOpen(true)}
              />
            </div>
          </aside>
        </div>
      </div>

      {inquiryOpen && deal && (
        <InquiryModal
          dealId={deal.id}
          listingName={listing.name}
          agentName={branding?.agent_name || null}
          onClose={() => setInquiryOpen(false)}
        />
      )}
    </PublicLayout>
  )
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
  value: React.ReactNode
  label: string
}) {
  return (
    <div>
      <div className="font-display text-2xl text-ink-900 flex items-baseline gap-2">
        {Icon && <Icon className="w-5 h-5 text-ink-500" strokeWidth={1.5} />}
        {value}
      </div>
      <div className="text-2xs uppercase tracking-widest text-ink-500 mt-1">
        {label}
      </div>
    </div>
  )
}

function AgentCard({
  branding,
  onInquire,
}: {
  branding: TenantBrandingPublic | null
  onInquire: () => void
}) {
  if (!branding) {
    return (
      <div className="border border-ink-200 bg-cream p-6 text-sm text-ink-600">
        Agent info not available.
      </div>
    )
  }

  return (
    <div className="border border-ink-200 bg-cream p-6">
      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-4">
        Listing agent
      </div>
      {branding.agent_photo_url ? (
        <img
          src={branding.agent_photo_url}
          alt={branding.agent_name || ''}
          className="w-20 h-20 rounded-full object-cover mb-4"
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-ink-100 mb-4 flex items-center justify-center font-display text-2xl text-ink-500">
          {(branding.agent_name?.[0] || 'A').toUpperCase()}
        </div>
      )}
      <div className="font-display text-xl text-ink-900">
        {branding.agent_name}
      </div>
      {branding.agent_title && (
        <div className="text-sm text-ink-600 mt-1">{branding.agent_title}</div>
      )}
      {branding.brokerage_affiliation && (
        <div className="text-xs text-ink-500 mt-1">
          {branding.brokerage_affiliation}
        </div>
      )}
      {branding.dre_license && (
        <div className="text-2xs uppercase tracking-widest text-ink-400 mt-1">
          DRE #{branding.dre_license}
        </div>
      )}

      <div className="mt-5 space-y-2">
        {branding.agent_email && (
          <a
            href={`mailto:${branding.agent_email}`}
            className="flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900"
          >
            <Mail className="w-4 h-4" strokeWidth={1.5} />
            {branding.agent_email}
          </a>
        )}
        {branding.agent_phone && (
          <a
            href={`tel:${branding.agent_phone}`}
            className="flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900"
          >
            <Phone className="w-4 h-4" strokeWidth={1.5} />
            {branding.agent_phone}
          </a>
        )}
      </div>

      {/* P9.13.3 — opens the inquiry form (lead capture into CRM) */}
      <button
        onClick={onInquire}
        className="block w-full text-center mt-6 px-4 py-3 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700"
      >
        Request more info
      </button>
    </div>
  )
}
