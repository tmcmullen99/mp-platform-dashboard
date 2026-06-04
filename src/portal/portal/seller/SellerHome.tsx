// src/portal/seller/SellerHome.tsx
//
// Seller home — entirely focused on the goal: sell for the highest price.
// (The old "Understand your options" package-education section is gone.)
//
// Composition:
//   1. Hero with the property + current goal/list price
//   2. The milestone timeline (HomeLight "closing services" idea, mapped to
//      deals.listing_status: draft -> soft_launch -> active -> pending -> sold)
//   3. The interactive mortgage/goal-price slider (set goal -> deals.metadata)
//   4. A viewer-interest stat strip (HomeLight "buyer interest" idea, from
//      document_shares view_count + pageviews) — confidence signal for sellers
import { useEffect, useState } from 'react'
import { Loader2, TrendingUp, Eye, FileText } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Deal } from '@/lib/supabase'
import { PageHeader, SectionLabel, Panel, Stat, StatRow } from '@/portal/shared/ui'
import { usd, fmtDateLong } from '@/portal/shared/format'
import MortgageSlider from '@/portal/shared/MortgageSlider'

type ListingRow = {
  id: string
  name: string
  subtitle: string | null
  hero_image_url: string | null
  expected_list_date: string | null
}

const MILESTONES: { key: string; label: string }[] = [
  { key: 'draft', label: 'Preparing' },
  { key: 'soft_launch', label: 'Soft launch' },
  { key: 'active', label: 'On market' },
  { key: 'pending', label: 'In escrow' },
  { key: 'sold', label: 'Sold' },
]

export default function SellerHome() {
  const { clientProfile, currentBranding } = useAuth()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [listing, setListing] = useState<ListingRow | null>(null)
  const [viewCount, setViewCount] = useState(0)
  const [docCount, setDocCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientProfile) return
    let cancelled = false
    const cid = clientProfile.id
    ;(async () => {
      const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .eq('client_id', cid)
        .eq('deal_type', 'sell')
        .order('created_at', { ascending: false })
      const sellDeal = ((deals || [])[0] as Deal) || null

      let listingRow: ListingRow | null = null
      if (sellDeal?.coming_soon_listing_id) {
        const { data: l } = await supabase
          .from('coming_soon_listings')
          .select('id, name, subtitle, hero_image_url, expected_list_date')
          .eq('id', sellDeal.coming_soon_listing_id)
          .maybeSingle()
        listingRow = (l as ListingRow) || null
      }

      // Viewer interest — count document_shares views for this client's docs.
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
      setListing(listingRow)
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
  const goalPrice = (deal?.metadata?.goal_price as number) || deal?.estimated_value || 0
  const currentStatus = deal?.listing_status || 'draft'
  const currentIdx = Math.max(
    0,
    MILESTONES.findIndex((m) => m.key === currentStatus),
  )

  return (
    <div>
      <PageHeader eyebrow={`Welcome, ${firstName}`} title="Let's get your top price.">
        Everything here is built around one goal — selling{' '}
        {listing?.name ? <span className="text-ink-900">{listing.name}</span> : 'your home'} for the
        most the market will bear. You're working with{' '}
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
              {listing?.hero_image_url ? (
                <img
                  src={listing.hero_image_url}
                  alt={listing.name}
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
                <div className="font-display text-2xl leading-tight">
                  {listing?.name || deal.title}
                </div>
                {listing?.subtitle && <div className="text-sm opacity-90 mt-1">{listing.subtitle}</div>}
              </div>
            </div>
            <div className="lg:col-span-2">
              <Panel className="h-full">
                <StatRow>
                  <Stat label="Goal price" value={usd(goalPrice)} large />
                  <Stat
                    label="Going live"
                    value={listing?.expected_list_date ? fmtDateLong(listing.expected_list_date) : 'TBD'}
                  />
                </StatRow>
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
                          done
                            ? 'bg-ink-900 border-ink-900'
                            : 'bg-cream border-ink-300'
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
                <TrendingUp className="w-5 h-5 text-slate mb-3" strokeWidth={1.5} />
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
