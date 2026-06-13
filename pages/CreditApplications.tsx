// /credit-applications — agent review queue for $10K credit applications.
// Seller applications arrive 'submitted' and need manual ownership review
// (cross-reference county tax records, then approve/deny). Buyer applications
// auto-approve, shown here read-only for the record. Tenant-scoped via RLS +
// the acting tenant; master admin sees all.

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, EDGE_FUNCTIONS_BASE_URL } from '@/lib/supabase'
import { Inbox, Loader2, Check, X, ChevronDown, ChevronUp } from 'lucide-react'

const REVIEW_URL = `${EDGE_FUNCTIONS_BASE_URL}/review_credit_application`

type Row = {
  id: string
  side: 'buyer' | 'seller'
  status: 'submitted' | 'approved' | 'denied'
  created_at: string
  seller_address: string | null
  seller_unit: string | null
  seller_city: string | null
  seller_zip: string | null
  seller_owner_name: string | null
  seller_notes: string | null
  buyer_profile: Record<string, unknown> | null
  review_note: string | null
  clients: { name: string; email: string | null } | null
}

export default function CreditApplications() {
  const { currentTenant, session } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'submitted' | 'all'>('submitted')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!currentTenant) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('credit_applications')
      .select('id, side, status, created_at, seller_address, seller_unit, seller_city, seller_zip, seller_owner_name, seller_notes, buyer_profile, review_note, clients(name, email)')
      .eq('tenant_id', currentTenant.id)
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    setRows(((data as unknown) as Row[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.id])

  const counts = useMemo(() => {
    let submitted = 0
    for (const r of rows) if (r.status === 'submitted') submitted += 1
    return { submitted, all: rows.length }
  }, [rows])

  const visible = filter === 'submitted' ? rows.filter((r) => r.status === 'submitted') : rows

  async function review(id: string, decision: 'approve' | 'deny') {
    let note: string | null = null
    if (decision === 'deny') {
      note = window.prompt('Reason for denial (the applicant sees a friendly version):') || null
      if (note === null) return // cancelled
    }
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(REVIEW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ application_id: id, decision, note }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body?.error) {
        setError(body?.error || 'Review failed.')
      } else {
        await load()
      }
    } catch {
      setError('Could not reach the server.')
    }
    setBusyId(null)
  }

  if (!currentTenant) {
    return (
      <div className="p-12 flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <div className="p-12 max-w-5xl">
      <div className="border-b border-ink-200 pb-6 mb-8">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2 flex items-center gap-2">
          <Inbox className="w-3 h-3" /> Credit
        </div>
        <h1 className="font-display text-4xl text-ink-900 leading-tight">$10K applications</h1>
        <p className="text-ink-600 mt-3 max-w-2xl">
          Seller applications for <span className="font-medium">{currentTenant.display_name}</span> need
          ownership confirmation against county tax records before the credit goes live. Buyer
          applications auto-approve.
        </p>
      </div>

      <div className="flex items-center gap-1.5 mb-6">
        {(['submitted', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              'px-3 py-1.5 text-2xs uppercase tracking-widest border transition-colors ' +
              (f === filter ? 'bg-ink-900 text-white border-ink-900' : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400')
            }
          >
            {f === 'submitted' ? `Needs review (${counts.submitted})` : `All (${counts.all})`}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-6 border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3">{error}</div>
      ) : null}

      {loading ? (
        <div className="py-16 flex items-center gap-2 text-ink-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading applications…
        </div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-sm text-ink-500 max-w-xl">
          {filter === 'submitted'
            ? 'No seller applications waiting on review. New ones appear here and email you.'
            : 'No credit applications yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <div key={r.id} className="border border-ink-200 bg-white">
              <div className="p-5 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-ink-900 font-medium">{r.clients?.name || '—'}</span>
                    <span className={'text-2xs uppercase tracking-widest border px-2 py-0.5 ' + sideTone(r.side)}>{r.side}</span>
                    <span className={'text-2xs uppercase tracking-widest border px-2 py-0.5 ' + statusTone(r.status)}>{r.status}</span>
                  </div>
                  {r.side === 'seller' ? (
                    <div className="text-sm text-ink-700 mt-2">
                      <span className="font-medium">{r.seller_address}</span>
                      {r.seller_unit ? `, ${r.seller_unit}` : ''}{r.seller_city ? ` · ${r.seller_city}` : ''}{r.seller_zip ? ` ${r.seller_zip}` : ''}
                      <div className="text-ink-600 mt-0.5">Owner on title: <span className="font-medium">{r.seller_owner_name}</span></div>
                    </div>
                  ) : (
                    <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="inline-flex items-center gap-1 text-sm text-ink-600 mt-2 hover:text-ink-900">
                      Search profile {expanded === r.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {r.clients?.email ? (
                    <a href={`mailto:${r.clients.email}`} className="block text-sm text-ink-500 mt-1 hover:text-ink-900">{r.clients.email}</a>
                  ) : null}
                </div>

                {r.status === 'submitted' && r.side === 'seller' ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => review(r.id, 'approve')}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-2xs uppercase tracking-widest border bg-ink-900 text-white border-ink-900 disabled:opacity-50"
                    >
                      {busyId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Approve
                    </button>
                    <button
                      onClick={() => review(r.id, 'deny')}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-2xs uppercase tracking-widest border bg-white text-ink-600 border-ink-300 hover:border-red-400 hover:text-red-700 disabled:opacity-50"
                    >
                      <X className="w-3 h-3" /> Deny
                    </button>
                  </div>
                ) : null}
              </div>

              {expanded === r.id && r.buyer_profile ? (
                <div className="border-t border-ink-100 p-5 bg-ink-50/40 text-sm text-ink-700">
                  <pre className="whitespace-pre-wrap font-sans">{formatProfile(r.buyer_profile)}</pre>
                </div>
              ) : null}

              {r.review_note ? (
                <div className="border-t border-ink-100 px-5 py-2.5 text-xs text-ink-500">Note: {r.review_note}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function sideTone(side: string) {
  return side === 'seller' ? 'bg-ink-900 text-white border-ink-900' : 'bg-white text-ink-700 border-ink-300'
}
function statusTone(status: string) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'denied') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}
function formatProfile(p: Record<string, unknown>): string {
  const lines: string[] = []
  const loc = p.locations as string[] | undefined
  if (loc?.length) lines.push(`Locations: ${loc.join(', ')}`)
  if (p.price_min || p.price_max) lines.push(`Price: ${money(p.price_min)} – ${money(p.price_max)}`)
  if (p.beds_min) lines.push(`Beds (min): ${p.beds_min}`)
  if (p.baths_min) lines.push(`Baths (min): ${p.baths_min}`)
  const types = p.property_types as string[] | undefined
  if (types?.length) lines.push(`Type: ${types.join(', ')}`)
  if (p.timeline) lines.push(`Timeline: ${p.timeline}`)
  if (p.financing) lines.push(`Financing: ${p.financing}`)
  if (p.must_haves) lines.push(`Must-haves: ${p.must_haves}`)
  if (p.ideal_home) lines.push(`Ideal home: ${p.ideal_home}`)
  return lines.join('\n')
}
function money(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v)
  if (!n || Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}
