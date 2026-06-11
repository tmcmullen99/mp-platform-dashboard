// P10.3 — Inquiries inbox. Route: /inquiries (agent dashboard).
//
// Tenant-scoped lead inbox for website inquiries (public.inquiries, written by
// the submit_inquiry Edge Function). Scoping is enforced twice: RLS
// (inquiries_tenant_rw) at the DB layer, and the query filters by the acting
// tenant (useAuth().currentTenant) — so McMullen's admin sees McMullen's
// inquiries, and acting-as another tenant shows theirs.
//
// Workflow: new → contacted → closed (reopen supported). notify_status shows
// whether the agent notification email was accepted by Resend.

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Inbox,
  Loader2,
  Mail,
  Phone,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
} from 'lucide-react'

type InquiryStatus = 'new' | 'contacted' | 'closed'

type InquiryRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  page_path: string | null
  status: InquiryStatus
  notify_status: string | null
  created_at: string
  properties: { name: string; slug: string } | null
}

const STATUS_LABEL: Record<InquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  closed: 'Closed',
}

const STATUS_TONE: Record<InquiryStatus, string> = {
  new: 'bg-ink-900 text-white border-ink-900',
  contacted: 'bg-white text-ink-700 border-ink-300',
  closed: 'bg-ink-50 text-ink-400 border-ink-200',
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Inquiries() {
  const { currentTenant } = useAuth()
  const [rows, setRows] = useState<InquiryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | InquiryStatus>('all')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentTenant) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('inquiries')
        .select('id, name, email, phone, message, page_path, status, notify_status, created_at, properties(name, slug)')
        .eq('tenant_id', currentTenant!.id)
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (err) setError(err.message)
      setRows(((data as unknown) as InquiryRow[]) ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [currentTenant])

  const counts = useMemo(() => {
    const c = { all: rows.length, new: 0, contacted: 0, closed: 0 }
    for (const r of rows) c[r.status] += 1
    return c
  }, [rows])

  const visible = useMemo(() => {
    let v = rows
    if (filter !== 'all') v = v.filter((r) => r.status === filter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      v = v.filter(
        (r) =>
          (r.name ?? '').toLowerCase().includes(q) ||
          (r.email ?? '').toLowerCase().includes(q) ||
          (r.message ?? '').toLowerCase().includes(q) ||
          (r.properties?.name ?? '').toLowerCase().includes(q)
      )
    }
    return v
  }, [rows, filter, query])

  async function setStatus(id: string, status: InquiryStatus) {
    setBusyId(id)
    setError(null)
    const { error: err } = await supabase.from('inquiries').update({ status }).eq('id', id)
    setBusyId(null)
    if (err) {
      setError(err.message)
      return
    }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
  }

  if (!currentTenant) {
    return (
      <div className="p-12 flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading tenant…
      </div>
    )
  }

  return (
    <div className="p-12 max-w-5xl">
      {/* header */}
      <div className="border-b border-ink-200 pb-6 mb-8">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2 flex items-center gap-2">
          <Inbox className="w-3 h-3" />
          Leads
        </div>
        <h1 className="font-display text-4xl text-ink-900 leading-tight">Inquiries</h1>
        <p className="text-ink-600 mt-3 max-w-2xl">
          Website leads for <span className="font-medium">{currentTenant.display_name}</span> —
          every submission is also captured as a CRM contact and emailed to the listing agent.
        </p>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'new', 'contacted', 'closed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={
                'px-3 py-1.5 text-2xs uppercase tracking-widest border transition-colors ' +
                (s === filter
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400')
              }
            >
              {s === 'all' ? 'All' : STATUS_LABEL[s]} ({counts[s]})
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search inquiries…"
            className="border border-ink-200 bg-white pl-9 pr-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-ink-500 w-64"
          />
        </div>
      </div>

      {error ? (
        <div className="mb-6 border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3">
          {error}
        </div>
      ) : null}

      {/* list */}
      {loading ? (
        <div className="py-16 flex items-center gap-2 text-ink-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading inquiries…
        </div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-sm text-ink-500 max-w-xl">
          {rows.length === 0
            ? 'No inquiries yet. Leads submitted through the public listing pages will land here, in the CRM, and in your email.'
            : 'No inquiries match the current filter.'}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <div key={r.id} className="border border-ink-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-ink-900 font-medium">{r.name ?? '—'}</span>
                    <span
                      className={
                        'text-2xs uppercase tracking-widest border px-2 py-0.5 ' + STATUS_TONE[r.status]
                      }
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                    <NotifyBadge value={r.notify_status} />
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-sm text-ink-600 flex-wrap">
                    {r.email ? (
                      <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 hover:text-ink-900">
                        <Mail className="w-3.5 h-3.5" /> {r.email}
                      </a>
                    ) : null}
                    {r.phone ? (
                      <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 hover:text-ink-900">
                        <Phone className="w-3.5 h-3.5" /> {r.phone}
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="text-2xs uppercase tracking-widest text-ink-400 shrink-0">
                  {timeAgo(r.created_at)}
                </div>
              </div>

              {r.properties ? (
                <a
                  href={`/listings/${r.properties.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900"
                >
                  <ExternalLink className="w-3 h-3" /> {r.properties.name}
                </a>
              ) : r.page_path ? (
                <div className="mt-3 text-2xs uppercase tracking-widest text-ink-400">{r.page_path}</div>
              ) : null}

              {r.message ? (
                <p className="mt-3 text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{r.message}</p>
              ) : null}

              {/* actions */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-ink-100">
                {r.status === 'new' ? (
                  <ActionButton
                    label="Mark contacted"
                    busy={busyId === r.id}
                    onClick={() => setStatus(r.id, 'contacted')}
                    primary
                  />
                ) : null}
                {r.status !== 'closed' ? (
                  <ActionButton label="Close" busy={busyId === r.id} onClick={() => setStatus(r.id, 'closed')} />
                ) : (
                  <ActionButton
                    label="Reopen"
                    Icon={RotateCcw}
                    busy={busyId === r.id}
                    onClick={() => setStatus(r.id, 'new')}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NotifyBadge({ value }: { value: string | null }) {
  if (!value) return null
  const sent = value.startsWith('sent')
  return (
    <span
      title={value}
      className={
        'inline-flex items-center gap-1 text-2xs uppercase tracking-widest ' +
        (sent ? 'text-emerald-700' : 'text-red-700')
      }
    >
      {sent ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {sent ? 'Notified' : 'Email failed'}
    </span>
  )
}

function ActionButton({
  label,
  onClick,
  busy,
  primary,
  Icon,
}: {
  label: string
  onClick: () => void
  busy: boolean
  primary?: boolean
  Icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={
        'inline-flex items-center gap-1.5 px-3.5 py-1.5 text-2xs uppercase tracking-widest border transition-colors disabled:opacity-50 ' +
        (primary
          ? 'bg-ink-900 text-white border-ink-900 hover:bg-ink-800'
          : 'bg-white text-ink-600 border-ink-300 hover:border-ink-900 hover:text-ink-900')
      }
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : Icon ? <Icon className="w-3 h-3" /> : null}
      {label}
    </button>
  )
}
