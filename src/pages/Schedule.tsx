// P9.7 — Agent /schedule view.
// Symmetric to the client portal /portal/schedule, but cross-client.
// Shows every tour request across all clients in the current tenant.
// Sections: Upcoming (status not final AND date >= today) + Past.
// Filter chips: All / Needs action / Confirmed / Past.

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Home,
  MapPin,
  ArrowUpRight,
  Loader2,
  Filter,
  Search,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

type ProposedAlternate = { date: string; time: string | null }

type AgentScheduleTour = {
  id: string
  client_id: string
  tenant_id: string
  war_room_id: string | null
  external_listing_id: string | null
  property_address: string | null
  property_photo_url: string | null
  property_url: string | null
  property_price: number | null
  preferred_date: string | null
  preferred_time: string | null
  alternate_date: string | null
  alternate_time: string | null
  scheduled_at: string | null
  notes: string | null
  agent_response: string | null
  proposed_alternates: ProposedAlternate[] | null
  status: 'requested' | 'confirmed' | 'rescheduled' | 'toured' | 'cancelled'
  created_at: string
  clients: { id: string; name: string } | null
}

type FilterValue = 'all' | 'needs_action' | 'confirmed' | 'past'

export default function Schedule() {
  const { currentTenant } = useAuth()
  const [tours, setTours] = useState<AgentScheduleTour[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterValue>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!currentTenant) return
    let cancelled = false
    setLoading(true)
    supabase
      .from('tour_requests')
      .select(
        'id, client_id, tenant_id, war_room_id, external_listing_id, property_address, property_photo_url, property_url, property_price, preferred_date, preferred_time, alternate_date, alternate_time, scheduled_at, notes, agent_response, proposed_alternates, status, created_at, clients!inner(id, name)',
      )
      .eq('tenant_id', currentTenant.id)
      .order('preferred_date', { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        if (cancelled) return
        const normalized = (data || []).map(
          (r: { clients?: unknown } & Record<string, unknown>) => ({
            ...r,
            clients: Array.isArray(r.clients) ? r.clients[0] ?? null : r.clients ?? null,
          }),
        ) as unknown as AgentScheduleTour[]
        setTours(normalized)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [currentTenant])

  const today = new Date().toISOString().slice(0, 10)
  const isPast = (t: AgentScheduleTour) =>
    t.status === 'toured' ||
    t.status === 'cancelled' ||
    (t.preferred_date != null && t.preferred_date < today)

  // Apply filter + search
  const filtered = useMemo(() => {
    const matchFilter = (t: AgentScheduleTour) => {
      switch (filter) {
        case 'needs_action':
          return t.status === 'requested' || t.status === 'rescheduled'
        case 'confirmed':
          return t.status === 'confirmed' && !isPast(t)
        case 'past':
          return isPast(t)
        case 'all':
        default:
          return true
      }
    }
    const matchSearch = (t: AgentScheduleTour) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        (t.clients?.name || '').toLowerCase().includes(q) ||
        (t.property_address || '').toLowerCase().includes(q)
      )
    }
    return tours.filter((t) => matchFilter(t) && matchSearch(t))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tours, filter, search])

  const upcoming = filtered
    .filter((t) => !isPast(t))
    .sort((a, b) => (a.preferred_date || '').localeCompare(b.preferred_date || ''))
  const past = filtered
    .filter(isPast)
    .sort((a, b) => (b.preferred_date || '').localeCompare(a.preferred_date || ''))

  // Counters for chip labels
  const counts = useMemo(() => {
    const c = { all: tours.length, needs_action: 0, confirmed: 0, past: 0 }
    for (const t of tours) {
      if (t.status === 'requested' || t.status === 'rescheduled') c.needs_action++
      else if (t.status === 'confirmed' && !isPast(t)) c.confirmed++
      if (isPast(t)) c.past++
    }
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tours])

  if (!currentTenant) return null

  return (
    <div className="p-12 max-w-6xl">
      {/* Hero */}
      <div className="mb-10">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Schedule</div>
        <h1 className="font-display text-4xl text-ink-900 leading-tight mb-3">
          All tour activity.
        </h1>
        <p className="text-ink-600 max-w-2xl leading-relaxed">
          Every tour request across every client, with status and the time you confirmed it for.
          Use the filters to triage what needs action versus what’s already on the books.
        </p>
      </div>

      {/* Filter chips + search */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Filter className="w-3 h-3 text-ink-400" />
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          All ({counts.all})
        </FilterChip>
        <FilterChip
          active={filter === 'needs_action'}
          onClick={() => setFilter('needs_action')}
        >
          Needs action ({counts.needs_action})
        </FilterChip>
        <FilterChip active={filter === 'confirmed'} onClick={() => setFilter('confirmed')}>
          Confirmed ({counts.confirmed})
        </FilterChip>
        <FilterChip active={filter === 'past'} onClick={() => setFilter('past')}>
          Past ({counts.past})
        </FilterChip>

        <div className="ml-auto relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client or property"
            className="pl-8 pr-3 py-1.5 text-sm border border-ink-200 bg-cream w-56 focus:outline-none focus:border-ink-900"
          />
        </div>
      </div>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-ink-500" />
      ) : tours.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section className="mb-12">
              <SectionLabel>Upcoming · {upcoming.length}</SectionLabel>
              <div className="space-y-3">
                {upcoming.map((t) => (
                  <TourRow key={t.id} tour={t} mode="upcoming" />
                ))}
              </div>
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section className="mb-12">
              <SectionLabel>Past · {past.length}</SectionLabel>
              <div className="space-y-3">
                {past.map((t) => (
                  <TourRow key={t.id} tour={t} mode="past" />
                ))}
              </div>
            </section>
          )}

          {upcoming.length === 0 && past.length === 0 && (
            <p className="text-sm text-ink-500">No tours match this filter.</p>
          )}
        </>
      )}
    </div>
  )
}

// ============================================================
// Tour row card
// ============================================================
function TourRow({
  tour,
  mode,
}: {
  tour: AgentScheduleTour
  mode: 'upcoming' | 'past'
}) {
  const isPast = mode === 'past'
  const scheduledLabel =
    tour.scheduled_at && (tour.status === 'confirmed' || tour.status === 'toured')
      ? new Date(tour.scheduled_at).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : null
  const preferredLabel = tour.preferred_date
    ? `${formatShortDate(tour.preferred_date)}${
        tour.preferred_time ? ` · ${tour.preferred_time}` : ''
      }`
    : 'No date'

  return (
    <article
      className={`border border-ink-200 bg-white p-4 ${isPast ? 'opacity-75' : ''}`}
    >
      <div className="flex items-start gap-4">
        {tour.property_photo_url ? (
          <img
            src={tour.property_photo_url}
            alt=""
            className="w-16 h-16 object-cover border border-ink-200 shrink-0"
          />
        ) : (
          <div className="w-16 h-16 bg-ink-100 border border-ink-200 shrink-0 flex items-center justify-center">
            <Home className="w-5 h-5 text-ink-400" strokeWidth={1.5} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Top line: client name + status */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <Link
              to={`/clients/${tour.client_id}`}
              className="text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900"
            >
              {tour.clients?.name || 'Unknown client'}
            </Link>
            <TourStatusBadge status={tour.status} />
          </div>

          {/* Address */}
          {tour.property_url ? (
            <a
              href={tour.property_url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-ink-900 hover:underline flex items-start gap-1 mb-1"
            >
              <MapPin
                className="w-3.5 h-3.5 mt-1 text-ink-400 shrink-0"
                strokeWidth={1.5}
              />
              <span className="truncate">{tour.property_address || 'Property'}</span>
            </a>
          ) : (
            <div className="font-medium text-ink-900 flex items-start gap-1 mb-1">
              <MapPin
                className="w-3.5 h-3.5 mt-1 text-ink-400 shrink-0"
                strokeWidth={1.5}
              />
              <span className="truncate">{tour.property_address || 'Property'}</span>
            </div>
          )}

          {/* Date meta */}
          <div className="text-xs text-ink-600 flex items-center gap-2 flex-wrap mb-2">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3 text-ink-400" strokeWidth={1.5} />
              {scheduledLabel ? (
                <>
                  <span className="text-ink-900 font-medium">{scheduledLabel}</span>
                  <span className="text-ink-400">(scheduled)</span>
                </>
              ) : (
                <>
                  <span>{preferredLabel}</span>
                  <span className="text-ink-400">(preferred)</span>
                </>
              )}
            </span>
            {tour.alternate_date && tour.status === 'requested' && (
              <>
                <span className="text-ink-300">·</span>
                <span className="text-ink-500">
                  alt {formatShortDate(tour.alternate_date)}
                  {tour.alternate_time ? ` ${tour.alternate_time}` : ''}
                </span>
              </>
            )}
            <span className="text-ink-300">·</span>
            <span className="text-ink-500">requested {timeAgo(tour.created_at)}</span>
          </div>

          {/* Proposed alternates summary — shown when status='rescheduled' */}
          {tour.status === 'rescheduled' &&
            Array.isArray(tour.proposed_alternates) &&
            tour.proposed_alternates.length > 0 && (
              <div className="text-xs text-ink-600 mb-2 bg-ink-50 px-3 py-2 border border-ink-100">
                <span className="text-2xs uppercase tracking-widest text-ink-500 mr-2">
                  Waiting on client
                </span>
                You suggested {tour.proposed_alternates.length} time
                {tour.proposed_alternates.length === 1 ? '' : 's'}:{' '}
                {tour.proposed_alternates
                  .map(
                    (a) =>
                      `${formatShortDate(a.date)}${a.time ? ` ${a.time}` : ''}`,
                  )
                  .join(', ')}
              </div>
            )}

          {/* Notes (client) */}
          {tour.notes && (
            <div className="text-xs text-ink-600 mb-2 line-clamp-2 italic">
              <span className="text-2xs uppercase tracking-widest text-ink-500 not-italic mr-1">
                Note:
              </span>
              {tour.notes}
            </div>
          )}

          {/* Footer links */}
          <div className="flex items-center gap-4 mt-2 text-2xs uppercase tracking-widest">
            <Link
              to={`/clients/${tour.client_id}`}
              className="text-ink-600 hover:text-ink-900 inline-flex items-center gap-1"
            >
              Open client
              <ArrowUpRight className="w-3 h-3" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

// ============================================================
// UI atoms
// ============================================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="text-2xs uppercase tracking-widest text-ink-500">{children}</div>
      <div className="flex-1 h-px bg-ink-100" />
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 border text-2xs uppercase tracking-widest transition-colors ${
        active
          ? 'bg-ink-900 text-cream border-ink-900'
          : 'bg-cream text-ink-600 border-ink-200 hover:border-ink-400'
      }`}
    >
      {children}
    </button>
  )
}

function TourStatusBadge({
  status,
}: {
  status: AgentScheduleTour['status']
}) {
  const styles: Record<AgentScheduleTour['status'], string> = {
    requested: 'bg-amber-50 text-amber-700',
    confirmed: 'bg-emerald-50 text-emerald-700',
    rescheduled: 'bg-blue-50 text-blue-700',
    toured: 'bg-ink-100 text-ink-700',
    cancelled: 'bg-red-50 text-red-700',
  }
  return (
    <span
      className={`text-2xs uppercase tracking-widest px-2 py-1 shrink-0 ${styles[status]}`}
    >
      {status}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="border border-ink-200 p-12 text-center bg-cream">
      <Calendar
        className="w-8 h-8 text-ink-300 mx-auto mb-3"
        strokeWidth={1.5}
      />
      <h3 className="font-display text-xl text-ink-900 mb-2">No tour activity yet.</h3>
      <p className="text-sm text-ink-600 max-w-md mx-auto">
        Once clients request tours from their portal, every one — pending, confirmed, past, and
        cancelled — shows up here in one searchable view.
      </p>
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (isNaN(then)) return iso
  const diff = Date.now() - then
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  const days = Math.floor(diff / 86_400_000)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
