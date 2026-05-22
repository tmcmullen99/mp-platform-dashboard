// EPIC D.2 — The Hot-Lead Board.
//
// Route: /board
//
// The cockpit centerpiece: every engaged owner, ranked by recency-weighted
// engagement score (the hot_leads RPC does the math). Answers "who do I call
// right now." Each lead shows their property, score + tier, the signal that
// earned it (opens / clicks / claims), and one-tap Call / Email / View actions.
// Optional market filter. This is where acquisition → outreach → signal becomes
// a single daily action list.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Flame,
  Phone,
  Mail,
  ArrowUpRight,
  MousePointerClick,
  Eye,
  CheckCircle2,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Lead = {
  contact_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  lifecycle_stage: string | null
  score: number
  tier: string
  opens: number
  clicks: number
  claims: number
  last_event_at: string | null
  market_id: string | null
  market_name: string | null
  unit_address: string | null
  confidence: string | null
  claim_status: string | null
  source_campaign: string | null
}

type Market = { id: string; name: string }

function leadName(l: Lead): string {
  const n = [l.first_name, l.last_name].filter(Boolean).join(' ').trim()
  return n || l.email || 'Unknown owner'
}

function tierBadge(tier: string): string {
  return tier === 'hot'
    ? 'bg-ink-900 text-cream'
    : tier === 'warm'
      ? 'bg-sky-50 text-sky-700'
      : 'bg-ink-100 text-ink-500'
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

export default function Board() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [marketId, setMarketId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: lk }, { data: mk }] = await Promise.all([
      supabase.rpc('hot_leads', { p_market_id: marketId || null, p_limit: 100 }),
      markets.length === 0
        ? supabase.from('markets').select('id, name').order('created_at')
        : Promise.resolve({ data: null }),
    ])
    setLeads((lk as Lead[]) || [])
    if (mk) setMarkets((mk as Market[]) || [])
    setLoading(false)
  }, [marketId, markets.length])

  useEffect(() => {
    load()
  }, [load])

  const counts = useMemo(() => {
    const c = { hot: 0, warm: 0, cool: 0 }
    for (const l of leads) {
      if (l.tier === 'hot') c.hot++
      else if (l.tier === 'warm') c.warm++
      else c.cool++
    }
    return c
  }, [leads])

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">Engagement</div>
          <h1 className="font-display text-3xl text-ink-900">Hot leads</h1>
          <p className="text-ink-600 mt-2 max-w-2xl leading-relaxed">
            Owners ranked by how recently and how deeply they’ve engaged. The one
            at the top is the one to call.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {markets.length > 0 && (
            <select
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
              className="px-3 py-2 border border-ink-200 text-sm bg-cream focus:outline-none focus:border-ink-900"
            >
              <option value="">All markets</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-ink-200 text-2xs uppercase tracking-widest text-ink-700 hover:border-ink-900 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Tier strip */}
      {!loading && leads.length > 0 && (
        <div className="flex items-center gap-2 mb-6 text-2xs uppercase tracking-widest">
          <span className="px-2 py-1 bg-ink-900 text-cream">{counts.hot} hot</span>
          <span className="px-2 py-1 bg-sky-50 text-sky-700">{counts.warm} warm</span>
          <span className="px-2 py-1 bg-ink-100 text-ink-500">{counts.cool} cool</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-2xs uppercase tracking-widest text-ink-500">Loading…</div>
      ) : leads.length === 0 ? (
        <div className="border border-dashed border-ink-200 py-16 text-center">
          <Flame className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.25} />
          <div className="text-sm text-ink-700 font-medium">No engaged leads yet</div>
          <p className="text-ink-500 text-sm mt-1">
            Send a wave from Outreach — opens, clicks, and claims will surface owners here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((l, i) => (
            <LeadCard key={l.contact_id} lead={l} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function LeadCard({ lead, rank }: { lead: Lead; rank: number }) {
  const isClient = lead.lifecycle_stage === 'customer'
  return (
    <div className="border border-ink-200 bg-cream p-5">
      <div className="flex items-start gap-4">
        <div className="font-display text-xl text-ink-300 tabular-nums w-8 shrink-0 text-right pt-0.5">
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="font-display text-xl text-ink-900 truncate">{leadName(lead)}</h3>
            <span className={`text-2xs uppercase tracking-widest px-2 py-0.5 ${tierBadge(lead.tier)}`}>
              {lead.tier}
            </span>
            {lead.claim_status === 'claimed' && (
              <span className="text-2xs uppercase tracking-widest text-emerald-700 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> claimed
              </span>
            )}
            {isClient && (
              <span className="text-2xs uppercase tracking-widest bg-ink-100 text-ink-500 px-1.5 py-0.5">
                client
              </span>
            )}
          </div>
          {(lead.unit_address || lead.market_name) && (
            <div className="text-sm text-ink-600 truncate">
              {lead.unit_address || '—'}
              {lead.market_name ? ` · ${lead.market_name}` : ''}
            </div>
          )}
          {lead.source_campaign && (
            <div className="text-2xs uppercase tracking-widest text-ink-400 mt-0.5 truncate">
              from {lead.source_campaign}
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 text-2xs uppercase tracking-widest text-ink-500 flex-wrap">
            {lead.opens > 0 && (
              <span className="inline-flex items-center gap-1">
                <Eye className="w-3 h-3" /> {lead.opens}
              </span>
            )}
            {lead.clicks > 0 && (
              <span className="inline-flex items-center gap-1">
                <MousePointerClick className="w-3 h-3" /> {lead.clicks}
              </span>
            )}
            {lead.claims > 0 && (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {lead.claims}
              </span>
            )}
            {lead.last_event_at && <span className="text-ink-400">{relativeTime(lead.last_event_at)}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-3xl text-ink-900 tabular-nums">{Number(lead.score).toFixed(1)}</div>
          <div className="text-2xs uppercase tracking-widest text-ink-500">score</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-ink-100 flex-wrap">
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700"
          >
            <Phone className="w-3 h-3" /> Call
          </a>
        )}
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-ink-300 text-2xs uppercase tracking-widest text-ink-700 hover:border-ink-900 hover:text-ink-900"
          >
            <Mail className="w-3 h-3" /> Email
          </a>
        )}
        {lead.market_id && (
          <Link
            to={`/markets/${lead.market_id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-ink-300 text-2xs uppercase tracking-widest text-ink-700 hover:border-ink-900 hover:text-ink-900"
          >
            <ArrowUpRight className="w-3 h-3" /> View in market
          </Link>
        )}
      </div>
    </div>
  )
}
