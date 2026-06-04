// EPIC E.3 — Pipeline board.  Route: /pipeline
// Deals grouped by stage with per-column value and a stage selector to advance
// each deal. Cards link to the deal detail (offers + close live there).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Workflow, RefreshCw, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import NewDealModal from '@/components/NewDealModal'

type Deal = {
  id: string
  title: string | null
  stage: string
  deal_type: string | null
  estimated_value: number | null
  actual_value: number | null
  estimated_commission: number | null
  actual_commission: number | null
  client_id: string | null
  clients?: { name: string } | null
}

const STAGES = ['exploring', 'active', 'offer', 'accepted', 'escrow', 'closed'] as const
const ALL_STAGES = [...STAGES, 'lost']

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const dealValue = (d: Deal) => Number(d.actual_value ?? d.estimated_value ?? 0)
const dealCommission = (d: Deal) => Number(d.actual_commission ?? d.estimated_commission ?? 0)

export default function Pipeline() {
  const navigate = useNavigate()
  const { currentTenant } = useAuth()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [moving, setMoving] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('deals')
      .select('id, title, stage, deal_type, estimated_value, actual_value, estimated_commission, actual_commission, client_id, clients(name)')
      .order('updated_at', { ascending: false })
    const norm = ((data as any[]) || []).map((d) => ({
      ...d,
      clients: Array.isArray(d.clients) ? d.clients[0] ?? null : d.clients ?? null,
    })) as Deal[]
    setDeals(norm)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function move(dealId: string, stage: string) {
    setMoving(dealId)
    await supabase.from('deals').update({ stage }).eq('id', dealId)
    setMoving(null)
    load()
  }

  const byStage = useMemo(() => {
    const m: Record<string, Deal[]> = {}
    for (const s of ALL_STAGES) m[s] = []
    for (const d of deals) (m[d.stage] ?? (m[d.stage] = [])).push(d)
    return m
  }, [deals])

  const openValue = useMemo(
    () => deals.filter((d) => d.stage !== 'closed' && d.stage !== 'lost').reduce((a, d) => a + dealValue(d), 0),
    [deals],
  )
  const closedCommission = useMemo(
    () => deals.filter((d) => d.stage === 'closed').reduce((a, d) => a + dealCommission(d), 0),
    [deals],
  )

  return (
    <div className="px-8 py-10">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap max-w-6xl">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">Deals</div>
          <h1 className="font-display text-3xl text-ink-900">Pipeline</h1>
          <p className="text-ink-600 mt-2">
            {money(openValue)} in open pipeline · {money(closedCommission)} commission closed.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700">
            <Plus className="w-3.5 h-3.5" /> New deal
          </button>
          <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-2 border border-ink-200 text-2xs uppercase tracking-widest text-ink-700 hover:border-ink-900">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {creating && currentTenant && (
        <NewDealModal
          tenantId={currentTenant.id}
          onClose={() => setCreating(false)}
          onCreated={(id) => navigate(`/deals/${id}`)}
        />
      )}

      {loading ? (
        <div className="py-20 text-center text-2xs uppercase tracking-widest text-ink-500">Loading…</div>
      ) : deals.length === 0 ? (
        <div className="border border-dashed border-ink-200 py-16 text-center max-w-2xl">
          <Workflow className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.25} />
          <div className="text-sm text-ink-700 font-medium">No deals yet</div>
          <p className="text-ink-500 text-sm mt-1">Deals appear here as you convert clients and start working transactions.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const col = byStage[stage] || []
            const total = col.reduce((a, d) => a + dealValue(d), 0)
            return (
              <div key={stage} className="w-72 shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-2xs uppercase tracking-widest text-ink-700">{stage}</span>
                  <span className="text-2xs uppercase tracking-widest text-ink-400">{col.length}{total > 0 ? ` · ${money(total)}` : ''}</span>
                </div>
                <div className="space-y-2 min-h-[60px]">
                  {col.map((d) => (
                    <div key={d.id} className="border border-ink-200 bg-cream p-3">
                      <Link to={`/deals/${d.id}`} className="block">
                        <div className="text-ink-900 text-sm font-medium truncate hover:underline">{d.title || 'Untitled deal'}</div>
                        <div className="text-2xs uppercase tracking-widest text-ink-400 mt-0.5 truncate">
                          {d.clients?.name || 'No client'}{d.deal_type ? ` · ${d.deal_type}` : ''}
                        </div>
                        {dealValue(d) > 0 && (
                          <div className="font-display text-lg text-ink-900 mt-1 tabular-nums">{money(dealValue(d))}</div>
                        )}
                      </Link>
                      <select
                        value={d.stage}
                        disabled={moving === d.id}
                        onChange={(e) => move(d.id, e.target.value)}
                        className="mt-2 w-full text-2xs uppercase tracking-widest px-2 py-1 border border-ink-200 bg-white focus:outline-none focus:border-ink-900"
                      >
                        {ALL_STAGES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {col.length === 0 && <div className="border border-dashed border-ink-100 py-6 text-center text-2xs uppercase tracking-widest text-ink-300">empty</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
