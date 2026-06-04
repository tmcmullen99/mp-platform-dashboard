// P9.13.1 — Public listings catalog.
//
// Route: /listings (no auth)
//
// Anon-readable index of every sell-side deal currently in
// soft_launch / active / pending. RLS filters down to public rows.
// Grid layout, status filter chips, address search.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Bed, Bath, Square, Search, MapPin } from 'lucide-react'
import PublicLayout from '@/components/public/PublicLayout'

type ListingCard = {
  deal_id: string
  tenant_id: string
  listing_status: string
  slug: string
  name: string
  subtitle: string | null
  neighborhood: string | null
  bedrooms: number | null
  bathrooms: number | null
  area_sqft: number | null
  price_estimate: string | null
  hero_image_url: string | null
  hero_photo_path: string | null
}

type StatusFilter = 'all' | 'soft_launch' | 'active' | 'pending'

export default function ListingsIndex() {
  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState<ListingCard[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      // 1. Get public deals (RLS gates to public statuses)
      const { data: dealRows } = await supabase
        .from('deals')
        .select('id, tenant_id, listing_status, coming_soon_listing_id')
        .eq('deal_type', 'sell')
        .in('listing_status', ['soft_launch', 'active', 'pending'])
        .not('coming_soon_listing_id', 'is', null)
        .order('created_at', { ascending: false })

      if (cancelled) return
      const deals = (dealRows || []) as Array<{
        id: string
        tenant_id: string
        listing_status: string
        coming_soon_listing_id: string
      }>

      if (deals.length === 0) {
        setListings([])
        setLoading(false)
        return
      }

      const listingIds = deals.map((d) => d.coming_soon_listing_id)
      const dealIds = deals.map((d) => d.id)

      // 2. Get CSL data + photos in parallel
      const [csls, photoRows] = await Promise.all([
        supabase
          .from('coming_soon_listings')
          .select(
            'id, slug, name, subtitle, neighborhood, bedrooms, bathrooms, area_sqft, price_estimate, hero_image_url',
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

      // Best photo per deal: hero wins; otherwise first by sort_order
      const photosByDeal = new Map<string, { path: string; is_hero: boolean }>()
      ;(photoRows.data || []).forEach((p) => {
        const row = p as { deal_id: string; storage_path: string; is_hero: boolean }
        const existing = photosByDeal.get(row.deal_id)
        if (!existing || (row.is_hero && !existing.is_hero)) {
          photosByDeal.set(row.deal_id, {
            path: row.storage_path,
            is_hero: row.is_hero,
          })
        }
      })

      const cards: ListingCard[] = deals
        .map((d) => {
          const csl = cslMap.get(d.coming_soon_listing_id) as
            | {
                slug: string
                name: string
                subtitle: string | null
                neighborhood: string | null
                bedrooms: number | null
                bathrooms: number | null
                area_sqft: number | null
                price_estimate: string | null
                hero_image_url: string | null
              }
            | undefined
          if (!csl) return null
          return {
            deal_id: d.id,
            tenant_id: d.tenant_id,
            listing_status: d.listing_status,
            slug: csl.slug,
            name: csl.name,
            subtitle: csl.subtitle,
            neighborhood: csl.neighborhood,
            bedrooms: csl.bedrooms,
            bathrooms: csl.bathrooms,
            area_sqft: csl.area_sqft,
            price_estimate: csl.price_estimate,
            hero_image_url: csl.hero_image_url,
            hero_photo_path: photosByDeal.get(d.id)?.path || null,
          }
        })
        .filter((x): x is ListingCard => x !== null)

      setListings(cards)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (statusFilter !== 'all' && l.listing_status !== statusFilter)
        return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !l.name.toLowerCase().includes(q) &&
          !(l.neighborhood || '').toLowerCase().includes(q) &&
          !(l.subtitle || '').toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [listings, statusFilter, search])

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: listings.length,
      soft_launch: 0,
      active: 0,
      pending: 0,
    }
    listings.forEach((l) => {
      if (l.listing_status === 'soft_launch') c.soft_launch++
      else if (l.listing_status === 'active') c.active++
      else if (l.listing_status === 'pending') c.pending++
    })
    return c
  }, [listings])

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-10">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">
            Listings
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-ink-900 mb-3">
            All listings
          </h1>
          <p className="text-ink-600 max-w-2xl leading-relaxed">
            Browse current and upcoming properties. Click any listing for
            photos, details, and contact information.
          </p>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8 pb-4 border-b border-ink-200">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by address or neighborhood"
              className="w-full pl-9 pr-3 py-2 border border-ink-200 text-sm bg-cream focus:outline-none focus:border-ink-900"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {(['all', 'soft_launch', 'active', 'pending'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-2xs uppercase tracking-widest border ${
                  statusFilter === s
                    ? 'border-ink-900 bg-ink-900 text-cream'
                    : 'border-ink-200 text-ink-600 hover:border-ink-400'
                }`}
              >
                {s === 'all'
                  ? `All (${counts.all})`
                  : s === 'soft_launch'
                    ? `Coming soon (${counts.soft_launch})`
                    : s === 'active'
                      ? `Active (${counts.active})`
                      : `Pending (${counts.pending})`}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-2xs uppercase tracking-widest text-ink-500 py-20 text-center">
            Loading listings…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">
              No listings
            </div>
            <p className="text-ink-600">
              {listings.length === 0
                ? 'No public listings yet.'
                : 'No listings match your filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((l) => (
              <ListingCardItem key={l.deal_id} listing={l} />
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  )
}

function ListingCardItem({ listing }: { listing: ListingCard }) {
  let photoUrl = listing.hero_image_url
  if (listing.hero_photo_path) {
    const { data } = supabase.storage
      .from('listing-photos')
      .getPublicUrl(listing.hero_photo_path)
    photoUrl = data.publicUrl
  }

  const statusBadge =
    listing.listing_status === 'soft_launch'
      ? 'bg-sky-50 text-sky-700'
      : listing.listing_status === 'active'
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-amber-50 text-amber-700'
  const statusLabel =
    listing.listing_status === 'soft_launch'
      ? 'Coming soon'
      : listing.listing_status === 'active'
        ? 'Active'
        : 'Pending'

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
      <div className="mb-1.5">
        <span
          className={`inline-flex items-center text-2xs uppercase tracking-widest px-2 py-0.5 ${statusBadge}`}
        >
          {statusLabel}
        </span>
      </div>
      <h3 className="font-display text-xl text-ink-900 leading-tight group-hover:underline">
        {listing.name}
      </h3>
      {listing.neighborhood && (
        <div className="text-sm text-ink-600 flex items-center gap-1 mt-1">
          <MapPin className="w-3 h-3" strokeWidth={1.5} /> {listing.neighborhood}
        </div>
      )}
      <div className="flex items-center gap-4 mt-3 text-sm text-ink-700">
        {listing.bedrooms !== null && (
          <span className="flex items-center gap-1">
            <Bed className="w-3.5 h-3.5" strokeWidth={1.5} /> {listing.bedrooms}
          </span>
        )}
        {listing.bathrooms !== null && (
          <span className="flex items-center gap-1">
            <Bath className="w-3.5 h-3.5" strokeWidth={1.5} />{' '}
            {listing.bathrooms}
          </span>
        )}
        {listing.area_sqft && (
          <span className="flex items-center gap-1">
            <Square className="w-3.5 h-3.5" strokeWidth={1.5} />{' '}
            {listing.area_sqft.toLocaleString()}
          </span>
        )}
      </div>
      {listing.price_estimate && (
        <div className="font-display text-lg text-ink-900 mt-2">
          {listing.price_estimate}
        </div>
      )}
    </Link>
  )
}
