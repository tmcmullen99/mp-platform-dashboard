// EPIC E.5 — New Deal modal. Creates a deal for a client so it enters the
// pipeline (where offers + close live). Direct insert under RLS (tenant-scoped).

import { useEffect, useState } from 'react'
import { Plus, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ClientOpt = { id: string; name: string }

const DEAL_TYPES = ['sell', 'buy', 'rental', '1031', 'investor', 'referral']
const STAGES = ['exploring', 'active', 'offer', 'accepted', 'escrow']

export default function NewDealModal({
  tenantId,
  onClose,
  onCreated,
}: {
  tenantId: string
  onClose: () => void
  onCreated: (dealId: string) => void
}) {
  const [clients, setClients] = useState<ClientOpt[]>([])
  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('')
  const [dealType, setDealType] = useState('sell')
  const [stage, setStage] = useState('exploring')
  const [estValue, setEstValue] = useState('')
  const [estCommission, setEstCommission] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name')
      .order('name')
      .then(({ data }) => setClients((data as ClientOpt[]) || []))
  }, [])

  async function create() {
    if (!title.trim()) { setError('Give the deal a title.'); return }
    setSaving(true); setError(null)
    const ev = estValue ? parseFloat(estValue.replace(/[^0-9.]/g, '')) : null
    const ec = estCommission ? parseFloat(estCommission.replace(/[^0-9.]/g, '')) : null
    const { data, error: e } = await supabase
      .from('deals')
      .insert({
        tenant_id: tenantId,
        client_id: clientId || null,
        title: title.trim(),
        deal_type: dealType,
        stage,
        estimated_value: ev,
        estimated_commission: ec,
      })
      .select('id')
      .single()
    setSaving(false)
    if (e) { setError(e.message); return }
    onCreated((data as { id: string }).id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40" onClick={() => !saving && onClose()}>
      <div className="bg-cream w-full max-w-md border border-ink-200" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-ink-200 flex items-start justify-between gap-4">
          <div>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">Deals</div>
            <h2 className="font-display text-2xl text-ink-900">New deal</h2>
          </div>
          <button onClick={onClose} disabled={saving} className="text-ink-500 hover:text-ink-900 shrink-0 disabled:opacity-50"><X className="w-5 h-5" strokeWidth={1.5} /></button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <label className="block">
            <span className="text-2xs uppercase tracking-widest text-ink-500">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="123 Main St — Sale"
              className="mt-1 w-full px-3 py-2 border border-ink-200 bg-white text-sm focus:outline-none focus:border-ink-900" />
          </label>
          <label className="block">
            <span className="text-2xs uppercase tracking-widest text-ink-500">Client</span>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-ink-200 bg-white text-sm focus:outline-none focus:border-ink-900">
              <option value="">— No client —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-2xs uppercase tracking-widest text-ink-500">Type</span>
              <select value={dealType} onChange={(e) => setDealType(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-ink-200 bg-white text-sm focus:outline-none focus:border-ink-900">
                {DEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-2xs uppercase tracking-widest text-ink-500">Stage</span>
              <select value={stage} onChange={(e) => setStage(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-ink-200 bg-white text-sm focus:outline-none focus:border-ink-900">
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-2xs uppercase tracking-widest text-ink-500">Est. value</span>
              <input value={estValue} onChange={(e) => setEstValue(e.target.value)} placeholder="$1,250,000"
                className="mt-1 w-full px-3 py-2 border border-ink-200 bg-white text-sm focus:outline-none focus:border-ink-900" />
            </label>
            <label className="block">
              <span className="text-2xs uppercase tracking-widest text-ink-500">Est. commission</span>
              <input value={estCommission} onChange={(e) => setEstCommission(e.target.value)} placeholder="$31,250"
                className="mt-1 w-full px-3 py-2 border border-ink-200 bg-white text-sm focus:outline-none focus:border-ink-900" />
            </label>
          </div>
          {error && <div className="text-sm text-red-700">{error}</div>}
        </div>

        <div className="px-6 py-4 border-t border-ink-200 flex items-center gap-2">
          <button onClick={create} disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create deal
          </button>
          <button onClick={onClose} disabled={saving} className="px-3 py-2 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900">Cancel</button>
        </div>
      </div>
    </div>
  )
}
