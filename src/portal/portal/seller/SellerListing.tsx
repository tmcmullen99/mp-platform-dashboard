// src/portal/seller/SellerListing.tsx
//
// The seller's center of gravity. The agent creates the account with an
// address; this page is the back-and-forth workspace to get the listing perfect
// before launch. It folds in:
//   • the ListingBuilder chassis (existing component, client mode)
//   • the War Room as the listing-prep dialogue (moved here from its own tab)
//   • the Offer Board (HomeLight-style ranked incoming offers) once offers exist
//
// Data paths unchanged: deals, coming_soon_listings, war_rooms, offers,
// deal_buyer_parties. Listing photos/docs surface via the existing
// ListingBuilder + DocumentManager, which is also where the 1515 Union assets
// land once the storage files are in place.
import { useEffect, useState } from 'react'
import { Loader2, MessageSquare, Gavel } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Deal, WarRoom } from '@/lib/supabase'
import { PageHeader, SectionLabel, Panel, Badge, EmptyState } from '@/portal/shared/ui'
import { usd } from '@/portal/shared/format'
import ListingEditor from '@/components/ListingEditor'
import WarRoomThread from '@/components/WarRoomThread'

type OfferRow = {
  id: string
  amount: number | null
  status: string
  direction: string
  terms: unknown
  counterparty: string | null
  buyer_party_id: string | null
  created_at: string
}

type BuyerParty = { id: string; party_name: string | null; primary_contact_name: string | null }

export default function SellerListing() {
  const { clientProfile } = useAuth()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [warRoom, setWarRoom] = useState<WarRoom | null>(null)
  const [offers, setOffers] = useState<OfferRow[]>([])
  const [parties, setParties] = useState<Map<string, BuyerParty>>(new Map())
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

      let wr: WarRoom | null = null
      let offerRows: OfferRow[] = []
      const partyMap = new Map<string, BuyerParty>()

      if (sellDeal) {
        const { data: wrs } = await supabase
          .from('war_rooms')
          .select('*')
          .eq('deal_id', sellDeal.id)
          .order('last_message_at', { ascending: false, nullsFirst: false })
        wr = ((wrs || [])[0] as WarRoom) || null

        const { data: oData } = await supabase
          .from('offers')
          .select('id, amount, status, direction, terms, counterparty, buyer_party_id, created_at')
          .eq('deal_id', sellDeal.id)
          .eq('direction', 'incoming')
          .order('amount', { ascending: false, nullsFirst: false })
        offerRows = (oData as OfferRow[]) || []

        const { data: pData } = await supabase
          .from('deal_buyer_parties')
          .select('id, party_name, primary_contact_name')
          .eq('deal_id', sellDeal.id)
        for (const p of (pData as BuyerParty[]) || []) partyMap.set(p.id, p)
      }

      if (cancelled) return
      setDeal(sellDeal)
      setWarRoom(wr)
      setOffers(offerRows)
      setParties(partyMap)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [clientProfile])

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-ink-500" />

  if (!deal) {
    return (
      <div>
        <PageHeader eyebrow="My Listing" title="Your listing, in the making." />
        <EmptyState
          icon={MessageSquare}
          title="Your listing isn't set up yet"
          body="Your agent creates your listing with the property address, then you'll build it out together right here — photos, description, pricing, and the prep conversation."
        />
      </div>
    )
  }

  const goalPrice = (deal.metadata?.goal_price as number) || deal.estimated_value || 0

  return (
    <div>
      <PageHeader eyebrow="My Listing" title={deal.title || 'Your property'}>
        This is where we get your listing perfect before it hits the market — and where you and
        your agent talk it all through. Everything below updates live.
      </PageHeader>

      {/* Offer board — only once incoming offers exist */}
      {offers.length > 0 && (
        <section className="mb-12">
          <SectionLabel>Offers · {offers.length}</SectionLabel>
          <Panel>
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xs uppercase tracking-widest text-slate flex items-center gap-2">
                <Gavel className="w-3.5 h-3.5" strokeWidth={1.5} />
                Live offer board
              </span>
              {goalPrice > 0 && offers[0]?.amount != null && (
                <span className="text-2xs uppercase tracking-widest text-slate">
                  Top vs. goal{' '}
                  <span
                    className={
                      offers[0].amount - goalPrice >= 0 ? 'text-emerald-700' : 'text-amber-700'
                    }
                  >
                    {offers[0].amount - goalPrice >= 0 ? '+' : ''}
                    {usd(offers[0].amount - goalPrice)}
                  </span>
                </span>
              )}
            </div>
            <div className="divide-y divide-ink-100">
              {offers.map((o, idx) => {
                const party = o.buyer_party_id ? parties.get(o.buyer_party_id) : null
                const name =
                  party?.party_name ||
                  party?.primary_contact_name ||
                  o.counterparty ||
                  'Buyer party'
                const tone =
                  o.status === 'accepted'
                    ? 'positive'
                    : o.status === 'countered'
                    ? 'info'
                    : o.status === 'rejected' || o.status === 'withdrawn'
                    ? 'neutral'
                    : 'warning'
                return (
                  <div key={o.id} className="flex items-center gap-4 py-4">
                    <div className="w-8 h-8 bg-ink-900 text-cream flex items-center justify-center text-sm font-mono shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink-900 truncate">{name}</div>
                      <div className="text-xs text-ink-500">
                        {typeof o.terms === 'object' && o.terms && 'finance_type' in o.terms
                          ? String((o.terms as Record<string, unknown>).finance_type)
                          : 'Terms on file'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display text-xl text-ink-900">{usd(o.amount)}</div>
                    </div>
                    <Badge tone={tone as 'positive' | 'info' | 'neutral' | 'warning'}>
                      {o.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </Panel>
        </section>
      )}

      {/* Listing builder — photos, description, pricing, publish */}
      <section className="mb-12">
        <SectionLabel>Build your listing</SectionLabel>
        <ListingEditor deal={deal} />
      </section>

      {/* War room — folded in as the listing-prep dialogue */}
      <section data-tour="documents">
        <SectionLabel>Listing prep · talk to your agent</SectionLabel>
        {warRoom ? (
          <WarRoomThread warRoom={warRoom} viewerType="client" />
        ) : (
          <Panel>
            <p className="text-sm text-ink-600">
              Your agent will open the prep conversation here shortly. This is where you'll discuss
              photos, staging, pricing, and timing — all in one thread tied to your listing.
            </p>
          </Panel>
        )}
      </section>
    </div>
  )
}
