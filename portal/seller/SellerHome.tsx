// src/portal/seller/SellerHome.tsx
//
// Seller home — entirely focused on the goal: sell for the highest price.
//
// P10 data rewrite: this screen now renders purely from the canonical listing
// record on `properties` (joined off deal.property_id), with the hero image
// from `listing_photos` (is_hero=true) and the going-live date from the
// upcoming `schedule_events` row where event_type='on_market'. No more
// hardcoded subtitle strings or coming_soon_listings fallbacks — every value
// below traces to a column the agent edits in the listing configurator.
//
// Composition:
//   1. Hero with the property + goal/list price (Price/Date no longer collide)
//   2. The milestone timeline (deals.listing_status, advanced once on_market)
//   3. The interactive goal-price slider (set goal -> deals.metadata)
//   4. A viewer-interest stat strip — confidence signal for sellers
import { useEffect, useState } from 'react'
import { Loader2, Eye, FileText, CalendarClock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Deal } from '@/lib/supabase'
import { PageHeader, SectionLabel, Panel, Stat } from '@/portal/shared/ui'
import { usd, fmtDateLong } from '@/portal/shared/format'
import MortgageSlider from '@/portal/shared/MortgageSlider'

const PHOTO_PUBLIC_BASE =
  'https://kumfuludrhoqirxvaqja.supabase.co/storage/v1/object/public/listing-photos/'

// The canonical listing record — a row of `properties`, joined off
// deal.property_id. Only the fields this screen needs are selected.
type PropertyRow = {
  id: string
  name: string | null
  bedrooms: number | string | null
  bathrooms: number | string | null
  area_sqft: number | string | null
  built_year: number | null
  parking_description: string | null
  price: number | string | null
  neighborhood_id: string | null
}

const MILESTONES: { key: string; label: string }[] = [
  { key: 'draft', label: 'Preparing' },
  { key: 'soft_launch', label: 'Soft launch' },
  { key: 'active', label: 'On market' },
  { key: 'pending', label: 'In escrow' },
  { key: 'sold', label: 'Sold' },
]

function toNum(v: number | string | null | undefined): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export default function SellerHome() {
  const { clientProfile, currentBranding } = useAuth()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [property, setProperty] = useState<PropertyRow | null>(null)
  const [neighborhood, setNeighborhood] = useState<string | null>(null)
  const [heroUrl, setHeroUrl] = useState<string | null>(null)
  const [onMarketAt, setOnMarketAt] = useState<string | null>(null)
  const [viewCount, setViewCount] = useState(0)
  const [docCount, setDocCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientProfile) return
    let cancelled = false
    const cid = clientProfile.id
    ;(async () => {
      // 1. The seller's sell-side deal.
      const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .eq('client_id', cid)
        .eq('deal_type', 'sell')
        .order('created_at', { ascending: false })
      const sellDeal = ((deals || [])[0] as Deal) || null

      let prop: PropertyRow | null = null
      let hood: string | null = null
      let hero: string | null = null
      let onMarket: string | null = null

      if (sellDeal?.property_id) {
        // 2. The canonical listing record + its neighborhood label.
        const { data: p } = await supabase
          .from('properties')
          .select(
            'id, name, bedrooms, bathrooms, area_sqft, built_year, parking_description, price, neighborhood_id',
          )
          .eq('id', sellDeal.property_id)
          .maybeSingle()
        prop = (p as PropertyRow) || null

        if (prop?.neighborhood_id) {
          const { data: n } = await supabase
            .from('neighborhoods')
            .select('name')
            .eq('id', prop.neighborhood_id)
            .maybeSingle()
          hood = (n as { name: string } | null)?.name || null
        }
      }

      if (sellDeal?.id) {
        // 3. Hero photo from listing_photos (is_hero=true).
        const { data: photo } = await supabase
          .from('listing_photos')
          .select('storage_path')
          .eq('deal_id', sellDeal.id)
          .eq('is_hero', true)
          .order('sort_order', { ascending: true })
          .limit(1)
          .maybeSingle()
        const path = (photo as { storage_path: string } | null)?.storage_path
        hero = path ? PHOTO_PUBLIC_BASE + path : null

        // 4. Going-live date — next on_market schedule_event.
        const { data: ev } = await supabase
          .from('schedule_events')
          .select('starts_at')
          .eq('deal_id', sellDeal.id)
          .eq('event_type', 'on_market')
          .order('starts_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        onMarket = (ev as { starts_at: string } | null)?.starts_at || null
      }

      // Viewer-interest signals (unchanged).
      const { count: shares } = await supabase
        .from('document_shares')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', cid)
      const { count: docs } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', cid)

      if (cancelled) return
      setDeal(sellDeal)
      setProperty(prop)
      setNeighborhood(hood)
      setHeroUrl(hero)
      setOnMarketAt(onMarket)
      setViewCount(shares ?? 0)
      setDocCount(docs ?? 0)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [clientProfile])

  async function setGoal(goal: number) {
    if (!deal) return
    const nextMeta = { ...(deal.metadata || {}), goal_price: goal }
    await supabase
      .from('deals')
      .update({ metadata: nextMeta, updated_at: new Date().toISOString() })
      .eq('id', deal.id)
    setDeal({ ...deal, metadata: nextMeta })
  }

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-ink-500" />

  const firstName = (clientProfile?.name || 'there').split(' ')[0]
  const agentName = currentBranding?.agent_name || 'your agent'

  // All listing facts come from the property record.
  const propName = property?.name || deal?.title || 'your home'
  const beds = toNum(property?.bedrooms)
  const baths = toNum(property?.bathrooms)
  const sqft = toNum(property?.area_sqft)
  const propPrice = toNum(property?.price)

  // Subtitle composed from real fields — no hardcoded string.
  const subtitleParts: string[] = []
  if (neighborhood) subtitleParts.push(neighborhood)
  if (beds != null && baths != null) subtitleParts.push(`${beds} bed / ${baths} bath`)
  if (sqft != null) subtitleParts.push(`${sqft.toLocaleString()} sqft`)
  if (property?.built_year) subtitleParts.push(`Built ${property.built_year}`)
  const subtitle = subtitleParts.join(' · ')

  const goalPrice =
    (deal?.metadata?.goal_price as number) || deal?.estimated_value || propPrice || 0
  const currentStatus = deal?.listing_status || 'draft'
  const currentIdx = Math.max(
    0,
    MILESTONES.findIndex((m) => m.key === currentStatus),
  )
  const goingLiveLabel = onMarketAt ? fmtDateLong(onMarketAt) : 'TBD'

  return (
    <div>
      <PageHeader eyebrow={`Welcome, ${firstName}`} title="Let's get your top price.">
        Everything here is built around one goal — selling{' '}
        {property?.name ? <span className="text-ink-900">{property.name}</span> : 'your home'} for
        the most the market will bear. You're working with{' '}
        <span className="text-ink-900">{agentName}</span>.
      </PageHeader>

      {!deal ? (
        <Panel>
          <p className="text-ink-600">
            Your listing is being set up. Once {agentName} adds your property, your goal price,
            timeline, and market activity will appear here.
          </p>
        </Panel>
      ) : (
        <>
          {/* Hero strip */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-12">
            <div className="lg:col-span-3 relative bg-ink-100 overflow-hidden border border-ink-200 min-h-[260px]">
              {heroUrl ? (
                <img
                  src={heroUrl}
                  alt={propName}
                  className="w-full h-full object-cover absolute inset-0"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-ink-100 to-ink-200" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 text-cream">
                <div className="text-2xs uppercase tracking-widest opacity-80 mb-1">
                  {currentStatus === 'sold' ? 'Sold' : 'Going to market'}
                </div>
                <div className="font-display text-2xl leading-tight">{propName}</div>
                {subtitle && <div className="text-sm opacity-90 mt-1">{subtitle}</div>}
              </div>
            </div>

            {/* Goal-price card. Fix for the Price/Date overlap: the two facts
                are now stacked in a vertical flow (price block over a hairline
                divider over the date block) instead of sharing a 2-col grid
                track where the wide "$2,988,888" string collided with the date.
                Each value gets its own full-width row, so neither can overrun
                the other regardless of price magnitude. */}
            <div className="lg:col-span-2">
              <Panel className="h-full flex flex-col justify-center">
                <div>
                  <div className="text-2xs uppercase tracking-widest text-slate mb-1.5">
                    Goal price
                  </div>
                  <div className="font-display text-3xl md:text-4xl text-ink-900 leading-none tabular-nums break-words">
                    {usd(goalPrice)}
                  </div>
                </div>
                <div className="h-px bg-ink-200 my-5" />
                <div className="flex items-start gap-2">
                  <CalendarClock className="w-4 h-4 text-slate mt-0.5 shrink-0" strokeWidth={1.5} />
                  <Stat label="Going live" value={goingLiveLabel} />
                </div>
              </Panel>
            </div>
          </div>

          {/* Milestone timeline */}
          <section className="mb-12">
            <SectionLabel>Where things stand</SectionLabel>
            <Panel>
              <div className="flex items-center justify-between">
                {MILESTONES.map((m, idx) => {
                  const done = idx <= currentIdx
                  const active = idx === currentIdx
                  return (
                    <div key={m.key} className="flex-1 flex flex-col items-center relative">
                      {idx > 0 && (
                        <div
                          className={`absolute top-2 right-1/2 w-full h-px ${
                            idx <= currentIdx ? 'bg-ink-900' : 'bg-ink-200'
                          }`}
                        />
                      )}
                      <div
                        className={`relative z-10 w-4 h-4 rounded-full border-2 ${
                          done ? 'bg-ink-900 border-ink-900' : 'bg-cream border-ink-300'
                        } ${active ? 'ring-4 ring-ink-100' : ''}`}
                      />
                      <div
                        className={`text-2xs uppercase tracking-widest mt-3 text-center ${
                          done ? 'text-ink-900' : 'text-ink-400'
                        }`}
                      >
                        {m.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          </section>

          {/* Goal price slider */}
          <section className="mb-12">
            <SectionLabel>Set your goal</SectionLabel>
            <p className="text-sm text-ink-600 mb-4 max-w-2xl leading-relaxed">
              Drag the sale price to see your estimated net after selling costs
              {deal.mortgage_balance ? ' and mortgage payoff' : ''}. Lock in the number you're
              aiming for — {agentName} will see it and build the pricing strategy around it.
            </p>
            <MortgageSlider
              mode="seller"
              basePrice={goalPrice || 1_000_000}
              mortgageBalance={deal.mortgage_balance}
              initialGoal={(deal.metadata?.goal_price as number) || null}
              onSetGoal={setGoal}
            />
          </section>

          {/* Interest signals */}
          <section>
            <SectionLabel>Market activity</SectionLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              <Panel>
                <Eye className="w-5 h-5 text-slate mb-3" strokeWidth={1.5} />
                <div className="font-display text-3xl text-ink-900">{viewCount}</div>
                <div className="text-2xs uppercase tracking-widest text-slate mt-1">
                  Document views
                </div>
              </Panel>
              <Panel>
                <FileText className="w-5 h-5 text-slate mb-3" strokeWidth={1.5} />
                <div className="font-display text-3xl text-ink-900">{docCount}</div>
                <div className="text-2xs uppercase tracking-widest text-slate mt-1">
                  Documents shared
                </div>
              </Panel>
              <Panel>
                <CalendarClock className="w-5 h-5 text-slate mb-3" strokeWidth={1.5} />
                <div className="font-display text-3xl text-ink-900">
                  {currentStatus === 'sold' ? 'Closed' : MILESTONES[currentIdx]?.label || '—'}
                </div>
                <div className="text-2xs uppercase tracking-widest text-slate mt-1">
                  Listing stage
                </div>
              </Panel>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
