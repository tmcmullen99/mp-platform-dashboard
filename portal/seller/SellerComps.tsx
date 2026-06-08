// src/portal/seller/SellerComps.tsx
//
// P10 — Comparable Sales tab for the seller portal. A thin wrapper that resolves
// the seller's sell-side deal and its backing property (for the "your home"
// anchor on $/sqft), then hands off to the reusable SellerCompsTab.
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Deal } from '@/lib/supabase'
import { PageHeader } from '@/portal/shared/ui'
import SellerCompsTab from '@/components/SellerCompsTab'

function toNum(v: number | string | null | undefined): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export default function SellerComps() {
  const { clientProfile } = useAuth()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [subjectPrice, setSubjectPrice] = useState<number | null>(null)
  const [subjectSqft, setSubjectSqft] = useState<number | null>(null)
  const [subjectName, setSubjectName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientProfile) return
    let cancelled = false
    ;(async () => {
      const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .eq('client_id', clientProfile.id)
        .eq('deal_type', 'sell')
        .order('created_at', { ascending: false })
      const sellDeal = ((deals || [])[0] as Deal) || null

      if (sellDeal?.property_id) {
        const { data: p } = await supabase
          .from('properties')
          .select('name, price, area_sqft')
          .eq('id', sellDeal.property_id)
          .maybeSingle()
        const prop = p as { name: string | null; price: number | string | null; area_sqft: number | string | null } | null
        if (prop) {
          // Prefer the seller's chosen goal price as the anchor; fall back to
          // the property's list price.
          const goal = (sellDeal.metadata?.goal_price as number) || null
          setSubjectPrice(goal || toNum(prop.price))
          setSubjectSqft(toNum(prop.area_sqft))
          setSubjectName(prop.name)
        }
      }

      if (cancelled) return
      setDeal(sellDeal)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [clientProfile])

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-ink-500" />

  return (
    <div>
      <PageHeader eyebrow="Pricing" title="Comparable sales.">
        Recent nearby sales we’re pricing against. Add any Zillow, Redfin, or Realtor.com link and
        it becomes a sortable comp — by price, size, and price per square foot — so we can see
        exactly where your home lands in the range.
      </PageHeader>

      {!deal || !clientProfile?.tenant_id ? (
        <p className="text-sm text-ink-600">
          Your listing is being set up. Comparable sales will appear here once your property is
          added.
        </p>
      ) : (
        <SellerCompsTab
          clientId={clientProfile.id}
          tenantId={clientProfile.tenant_id}
          viewerType="client"
          subjectPrice={subjectPrice}
          subjectSqft={subjectSqft}
          subjectLabel={subjectName || 'Your home'}
        />
      )}
    </div>
  )
}
