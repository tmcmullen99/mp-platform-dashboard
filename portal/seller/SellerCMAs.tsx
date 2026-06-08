// src/portal/seller/SellerCMAs.tsx
//
// CMAs / strategy tab. Shows every published CMA for the client as a card,
// styled like the 5c-launch-strategy page — multiple strategies/CMAs supported.
// Clicking a card opens the full CMA via the existing CMAViewer (embedded) at
// /portal/cmas/:slug. Data path: cmas table, unchanged.
import { useEffect, useState } from 'react'
import { Loader2, FileBarChart2, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, CMA, Deal } from '@/lib/supabase'
import { PageHeader, ImageCard, Badge, EmptyState, Panel } from '@/portal/shared/ui'
import { fmtDateLong } from '@/portal/shared/format'

export default function SellerCMAs() {
  const { clientProfile } = useAuth()
  const [cmas, setCmas] = useState<CMA[]>([])
  const [strategyUrl, setStrategyUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientProfile) return
    let cancelled = false
    const cid = clientProfile.id
    ;(async () => {
      // Launch-strategy link lives on the sell-side deal (metadata.strategy_url),
      // set by the agent in the listing configurator.
      const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .eq('client_id', cid)
        .eq('deal_type', 'sell')
        .order('created_at', { ascending: false })
      const sellDeal = ((deals || [])[0] as Deal) || null
      const url = (sellDeal?.metadata?.strategy_url as string) || null

      const { data } = await supabase
        .from('cmas')
        .select('*')
        .eq('client_id', cid)
        .eq('status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false })

      if (cancelled) return
      setStrategyUrl(url)
      setCmas((data as CMA[]) || [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [clientProfile])

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-ink-500" />

  return (
    <div>
      <PageHeader eyebrow="CMAs & Strategy" title="Your pricing strategy.">
        Side-by-side pricing analyses and launch strategies your agent has built — recent sales,
        market context, and the rationale behind your number. Open any card for the full breakdown.
      </PageHeader>

      {strategyUrl && (
        <a
          href={strategyUrl}
          target="_blank"
          rel="noreferrer"
          className="block mb-8 group"
        >
          <Panel className="flex items-center justify-between gap-4 hover:border-ink-900 transition-colors">
            <div className="min-w-0">
              <div className="text-2xs uppercase tracking-widest text-slate mb-1.5">
                Launch strategy
              </div>
              <h2 className="font-display text-xl text-ink-900 leading-tight">
                Your full launch strategy
              </h2>
              <p className="text-sm text-ink-600 mt-1">
                The complete pricing and go-to-market plan for your listing.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-ink-700 group-hover:text-ink-900 shrink-0">
              Open
              <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </span>
          </Panel>
        </a>
      )}

      {cmas.length === 0 ? (
        <EmptyState
          icon={FileBarChart2}
          title="No analyses yet"
          body="Your agent will share comparative market analyses and your launch strategy here as they're ready."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cmas.map((cma) => {
            const subj = cma.subject_data as unknown as Record<string, unknown> | null
            const heroImg: string | undefined =
              (subj?.hero_image_url as string) || (subj?.image as string) || undefined
            return (
              <ImageCard
                key={cma.id}
                to={`/portal/cmas/${cma.slug || ''}`}
                image={heroImg}
                imageAlt={cma.property_address || cma.name || ''}
                badge={
                  <Badge tone="dark">
                    {cma.cma_type === 'buy' ? 'Buyer strategy' : 'Pricing strategy'}
                  </Badge>
                }
              >
                <div className="text-2xs uppercase tracking-widest text-slate mb-2">
                  {cma.published_at ? fmtDateLong(cma.published_at) : 'Strategy'}
                </div>
                <h2 className="font-display text-xl text-ink-900 leading-tight mb-2">
                  {cma.property_address || cma.name}
                </h2>
                {cma.list_price && (
                  <div className="text-sm text-ink-600 mb-3">{cma.list_price}</div>
                )}
                <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-ink-700 group-hover:text-ink-900">
                  View breakdown
                  <ArrowUpRight className="w-3 h-3" strokeWidth={1.5} />
                </span>
              </ImageCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
