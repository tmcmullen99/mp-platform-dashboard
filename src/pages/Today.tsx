import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  CalendarPlus,
  MessageCircle,
  FileBarChart2,
  Users,
  Plus,
  UserPlus,
  Send,
  ArrowUpRight,
  Check,
  X,
  Loader2,
  Minus,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, EDGE_FUNCTIONS_BASE_URL } from '@/lib/supabase'

type PendingTour = {
  id: string
  tenant_id: string
  client_id: string
  war_room_id: string | null
  property_address: string | null
  property_photo_url: string | null
  preferred_date: string | null
  preferred_time: string | null
  alternate_date: string | null
  alternate_time: string | null
  notes: string | null
  created_at: string
  clients: { name: string } | null
}

type UnreadThread = {
  id: string
  client_id: string
  name: string
  unread_agent: number
  last_message_at: string | null
  clients: { name: string; tenant_id: string } | null
}

type RecentCMA = {
  id: string
  slug: string | null
  name: string | null
  property_address: string | null
  status: string
  client_id: string | null
  created_at: string
  clients: { name: string } | null
}

type RecentClient = {
  id: string
  name: string
  email: string | null
  client_type: string | null
  stage: string | null
  created_at: string
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export default function Today() {
  const { currentTenant, profile, session } = useAuth()
  const [pendingTours, setPendingTours] = useState<PendingTour[]>([])
  const [unreadThreads, setUnreadThreads] = useState<UnreadThread[]>([])
  const [recentCMAs, setRecentCMAs] = useState<RecentCMA[]>([])
  const [recentClients, setRecentClients] = useState<RecentClient[]>([])
  const [loading, setLoading] = useState(true)
  const [actingOnTourId, setActingOnTourId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [proposingFor, setProposingFor] = useState<PendingTour | null>(null)

  const PENDING_TOUR_SELECT =
    'id, tenant_id, client_id, war_room_id, property_address, property_photo_url, preferred_date, preferred_time, alternate_date, alternate_time, notes, created_at, clients!inner(name)'

  useEffect(() => {
    if (!currentTenant) return
    let cancelled = false
    setLoading(true)
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS).toISOString()

    Promise.all([
      supabase
        .from('tour_requests')
        .select(PENDING_TOUR_SELECT)
        .eq('tenant_id', currentTenant.id)
        .eq('status', 'requested')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('war_rooms')
        .select(
          'id, client_id, name, unread_agent, last_message_at, clients!inner(name, tenant_id)',
        )
        .eq('clients.tenant_id', currentTenant.id)
        .gt('unread_agent', 0)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(10),
      supabase
        .from('cmas')
        .select(
          'id, slug, name, property_address, status, client_id, created_at, clients(name)',
        )
        .eq('tenant_id', currentTenant.id)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('clients')
        .select('id, name, email, client_type, stage, created_at')
        .eq('tenant_id', currentTenant.id)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(5),
    ]).then(([toursResp, roomsResp, cmasResp, clientsResp]) => {
      if (cancelled) return

      // Supabase joined relations sometimes come back as arrays; normalize to object.
      const normalize = <T extends { clients?: unknown }>(rows: T[]): T[] =>
        rows.map((r) => ({
          ...r,
          clients: Array.isArray(r.clients) ? r.clients[0] ?? null : r.clients ?? null,
        }))

      setPendingTours(normalize((toursResp.data || []) as unknown as PendingTour[]))
      setUnreadThreads(normalize((roomsResp.data || []) as unknown as UnreadThread[]))
      setRecentCMAs(normalize((cmasResp.data || []) as unknown as RecentCMA[]))
      setRecentClients((clientsResp.data || []) as RecentClient[])
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [currentTenant])

  async function refreshPendingTours() {
    if (!currentTenant) return
    const { data } = await supabase
      .from('tour_requests')
      .select(PENDING_TOUR_SELECT)
      .eq('tenant_id', currentTenant.id)
      .eq('status', 'requested')
      .order('created_at', { ascending: false })
      .limit(10)
    const normalized = (data || []).map((r: { clients?: unknown } & Record<string, unknown>) => ({
      ...r,
      clients: Array.isArray(r.clients) ? r.clients[0] ?? null : r.clients ?? null,
    })) as unknown as PendingTour[]
    setPendingTours(normalized)
  }

  async function postTourStatusMessage(tour: PendingTour, newStatus: 'confirmed' | 'cancelled') {
    if (!tour.war_room_id || !session?.access_token) return
    const dateLabel =
      newStatus === 'confirmed'
        ? formatScheduledLabel(tour.preferred_date, tour.preferred_time)
        : null
    const body =
      newStatus === 'confirmed'
        ? `Tour confirmed for ${tour.property_address || 'the property'}${
            dateLabel ? ` on ${dateLabel}` : ''
          }.`
        : `Tour request for ${tour.property_address || 'the property'} declined. Reach out in the war room to find a better time.`
    const { data: msg, error } = await supabase
      .from('war_room_messages')
      .insert({
        tenant_id: tour.tenant_id,
        war_room_id: tour.war_room_id,
        sender_type: 'system',
        body,
        metadata: {
          type: 'tour_status_change',
          tour_request_id: tour.id,
          new_status: newStatus,
        },
      })
      .select()
      .single()
    if (error) {
      console.warn('Could not post tour status message:', error.message)
      return
    }
    if (msg) {
      // Fire-and-forget email to the client via existing notify Edge Function
      fetch(`${EDGE_FUNCTIONS_BASE_URL}/notify_war_room_message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message_id: msg.id }),
      }).catch(() => {})
    }
  }

  async function handleConfirmTour(tour: PendingTour) {
    if (actingOnTourId) return
    setActingOnTourId(tour.id)
    setActionError(null)
    try {
      const scheduledAt = combineDateTimeToISO(tour.preferred_date, tour.preferred_time)
      const { error } = await supabase
        .from('tour_requests')
        .update({
          status: 'confirmed',
          scheduled_at: scheduledAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tour.id)
      if (error) throw error
      await postTourStatusMessage(tour, 'confirmed')
      await refreshPendingTours()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
    } finally {
      setActingOnTourId(null)
    }
  }

  async function handleDeclineTour(tour: PendingTour) {
    if (actingOnTourId) return
    const ok = window.confirm(
      `Decline tour request for ${tour.property_address || 'this property'}? The client will be notified.`,
    )
    if (!ok) return
    setActingOnTourId(tour.id)
    setActionError(null)
    try {
      const { error } = await supabase
        .from('tour_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tour.id)
      if (error) throw error
      await postTourStatusMessage(tour, 'cancelled')
      await refreshPendingTours()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
    } finally {
      setActingOnTourId(null)
    }
  }

  if (!currentTenant || !profile) {
    return <div className="p-12 text-ink-500 text-sm">Loading tenant context…</div>
  }

  const totalActionItems = pendingTours.length + unreadThreads.length

  return (
    <div className="p-12 max-w-6xl">
      {/* Hero */}
      <div className="mb-14">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
        <h1 className="font-display text-5xl text-ink-900 leading-[1.1]">
          {greeting()}, {profile.first_name || 'there'}.
        </h1>
        <p className="mt-5 text-ink-600 text-lg font-light leading-relaxed max-w-2xl">
          {loading ? (
            'Loading today’s queue…'
          ) : totalActionItems === 0 ? (
            <>
              You’re caught up. Nothing pending across{' '}
              <span className="text-ink-900">{currentTenant.display_name}</span>.
            </>
          ) : (
            <>
              You have{' '}
              <span className="text-ink-900 font-normal">{totalActionItems}</span>{' '}
              {totalActionItems === 1 ? 'item' : 'items'} waiting —{' '}
              {pendingTours.length} tour{' '}
              {pendingTours.length === 1 ? 'request' : 'requests'} and{' '}
              {unreadThreads.length} unread war room{' '}
              {unreadThreads.length === 1 ? 'thread' : 'threads'}.
            </>
          )}
        </p>
      </div>

      {/* Action queue */}
      <section className="mb-14">
        <SectionLabel>Action queue</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending tour requests */}
          <Card>
            <CardHeader
              icon={Calendar}
              label="Pending tour requests"
              count={pendingTours.length}
            />
            {loading ? (
              <CardEmpty>Loading…</CardEmpty>
            ) : pendingTours.length === 0 ? (
              <CardEmpty>No pending requests.</CardEmpty>
            ) : (
              <ul className="divide-y divide-ink-100">
                {pendingTours.map((t) => (
                  <li key={t.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      {t.property_photo_url ? (
                        <img
                          src={t.property_photo_url}
                          alt=""
                          className="w-12 h-12 object-cover border border-ink-100 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-ink-50 border border-ink-100 shrink-0 flex items-center justify-center">
                          <Calendar
                            className="w-4 h-4 text-ink-300"
                            strokeWidth={1.5}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-ink-900 truncate">
                          {t.property_address || 'Untitled property'}
                        </div>
                        <div className="text-xs text-ink-500 mt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-ink-700">
                            {t.clients?.name || 'Unknown client'}
                          </span>
                          {t.preferred_date && (
                            <>
                              <span className="text-ink-300">·</span>
                              <span>
                                {formatShortDate(t.preferred_date)}
                                {t.preferred_time ? ` ${t.preferred_time}` : ''}
                              </span>
                            </>
                          )}
                          <span className="text-ink-300">·</span>
                          <span>requested {timeAgo(t.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => handleConfirmTour(t)}
                            disabled={actingOnTourId !== null}
                            className="inline-flex items-center gap-1.5 bg-ink-900 text-cream px-3 py-1.5 text-xs hover:bg-ink-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {actingOnTourId === t.id ? (
                              <Loader2
                                className="w-3 h-3 animate-spin"
                                strokeWidth={2}
                              />
                            ) : (
                              <Check className="w-3 h-3" strokeWidth={2} />
                            )}
                            Confirm
                          </button>
                          <button
                            onClick={() => setProposingFor(t)}
                            disabled={actingOnTourId !== null}
                            className="inline-flex items-center gap-1.5 border border-ink-300 text-ink-800 px-3 py-1.5 text-xs hover:border-ink-900 hover:text-ink-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <CalendarPlus className="w-3 h-3" strokeWidth={2} />
                            Suggest times
                          </button>
                          <button
                            onClick={() => handleDeclineTour(t)}
                            disabled={actingOnTourId !== null}
                            className="inline-flex items-center gap-1.5 border border-ink-200 text-ink-700 px-3 py-1.5 text-xs hover:border-ink-900 hover:text-ink-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <X className="w-3 h-3" strokeWidth={2} />
                            Decline
                          </button>
                          <Link
                            to={`/clients/${t.client_id}`}
                            className="ml-auto text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 inline-flex items-center gap-1"
                          >
                            Open
                            <ArrowUpRight className="w-3 h-3" strokeWidth={1.5} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {actionError && (
              <div className="mt-3 text-xs text-red-700 bg-red-50 px-3 py-2">
                Couldn’t complete action: {actionError}
              </div>
            )}
          </Card>

          {/* Unread war room threads */}
          <Card>
            <CardHeader
              icon={MessageCircle}
              label="Unread war rooms"
              count={unreadThreads.length}
            />
            {loading ? (
              <CardEmpty>Loading…</CardEmpty>
            ) : unreadThreads.length === 0 ? (
              <CardEmpty>Inbox zero.</CardEmpty>
            ) : (
              <ul className="divide-y divide-ink-100">
                {unreadThreads.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/clients/${r.client_id}`}
                      className="block py-3.5 hover:bg-ink-50/60 -mx-2 px-2 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-ink-900 truncate">
                            {r.clients?.name || r.name || 'Unknown client'}
                          </div>
                          <div className="text-xs text-ink-500 mt-1">
                            {r.last_message_at
                              ? `Last message ${timeAgo(r.last_message_at)}`
                              : r.name}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-2xs font-mono bg-ink-900 text-cream px-1.5 py-0.5 tabular-nums">
                            {r.unread_agent}
                          </span>
                          <ArrowUpRight
                            className="w-4 h-4 text-ink-300 group-hover:text-ink-900 transition-colors mt-0.5"
                            strokeWidth={1.5}
                          />
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>

      {/* Last 7 days */}
      <section className="mb-14">
        <SectionLabel>Last 7 days</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent CMAs */}
          <Card>
            <CardHeader
              icon={FileBarChart2}
              label="Recent CMAs"
              count={recentCMAs.length}
            />
            {loading ? (
              <CardEmpty>Loading…</CardEmpty>
            ) : recentCMAs.length === 0 ? (
              <CardEmpty>
                No CMAs this week.{' '}
                <Link to="/cmas/new" className="underline hover:text-ink-900">
                  Build one
                </Link>
                .
              </CardEmpty>
            ) : (
              <ul className="divide-y divide-ink-100">
                {recentCMAs.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={c.slug ? `/cmas/${c.slug}` : '#'}
                      className="block py-3.5 hover:bg-ink-50/60 -mx-2 px-2 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-ink-900 truncate">
                            {c.property_address || c.name || 'Untitled CMA'}
                          </div>
                          <div className="text-xs text-ink-500 mt-1 flex items-center gap-2 flex-wrap">
                            {c.clients?.name && (
                              <>
                                <span className="text-ink-700">{c.clients.name}</span>
                                <span className="text-ink-300">·</span>
                              </>
                            )}
                            <CMAStatusBadge status={c.status} />
                            <span className="text-ink-300">·</span>
                            <span>{timeAgo(c.created_at)}</span>
                          </div>
                        </div>
                        <ArrowUpRight
                          className="w-4 h-4 text-ink-300 group-hover:text-ink-900 transition-colors shrink-0 mt-1"
                          strokeWidth={1.5}
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* New clients */}
          <Card>
            <CardHeader icon={Users} label="New clients" count={recentClients.length} />
            {loading ? (
              <CardEmpty>Loading…</CardEmpty>
            ) : recentClients.length === 0 ? (
              <CardEmpty>No new clients this week.</CardEmpty>
            ) : (
              <ul className="divide-y divide-ink-100">
                {recentClients.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/clients/${c.id}`}
                      className="block py-3.5 hover:bg-ink-50/60 -mx-2 px-2 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-ink-900 truncate">{c.name}</div>
                          <div className="text-xs text-ink-500 mt-1 flex items-center gap-2 flex-wrap">
                            {c.client_type && (
                              <span className="capitalize">{c.client_type}</span>
                            )}
                            {c.stage && (
                              <>
                                <span className="text-ink-300">·</span>
                                <span className="capitalize">
                                  {c.stage.replace('_', ' ')}
                                </span>
                              </>
                            )}
                            <span className="text-ink-300">·</span>
                            <span>{timeAgo(c.created_at)}</span>
                          </div>
                        </div>
                        <ArrowUpRight
                          className="w-4 h-4 text-ink-300 group-hover:text-ink-900 transition-colors shrink-0 mt-1"
                          strokeWidth={1.5}
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <SectionLabel>Quick actions</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickAction
            to="/cmas/new"
            icon={Plus}
            label="New CMA"
            sub="Upload a PDF, review, publish"
          />
          <QuickAction
            to="/clients"
            icon={UserPlus}
            label="New client"
            sub="Add or browse the list"
          />
          <QuickAction
            to="/campaigns"
            icon={Send}
            label="Send campaign"
            sub="Bulk email via Resend"
          />
        </div>
      </section>

      {/* Propose-alternates dialog (P9.6) */}
      {proposingFor && (
        <ProposeAlternatesDialog
          tour={proposingFor}
          accessToken={session?.access_token || ''}
          onClose={() => setProposingFor(null)}
          onSubmitted={() => {
            setProposingFor(null)
            refreshPendingTours()
          }}
        />
      )}
    </div>
  )
}

// ===========================================================================
// UI primitives
// ===========================================================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="text-2xs uppercase tracking-widest text-ink-500">{children}</div>
      <div className="flex-1 h-px bg-ink-100" />
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-ink-100 p-7">{children}</div>
}

function CardHeader({
  icon: Icon,
  label,
  count,
}: {
  icon: LucideIcon
  label: string
  count: number
}) {
  return (
    <div className="flex items-center justify-between mb-4 pb-4 border-b border-ink-100">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-ink-400" strokeWidth={1.5} />
        <div className="text-sm text-ink-900">{label}</div>
      </div>
      <div className="font-display text-2xl text-ink-900 tabular-nums">{count}</div>
    </div>
  )
}

function CardEmpty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-ink-500 py-2">{children}</div>
}

function QuickAction({
  to,
  icon: Icon,
  label,
  sub,
}: {
  to: string
  icon: LucideIcon
  label: string
  sub: string
}) {
  return (
    <Link
      to={to}
      className="bg-white border border-ink-100 p-6 hover:border-ink-900 transition-colors group"
    >
      <Icon
        className="w-5 h-5 text-ink-400 group-hover:text-ink-900 transition-colors mb-4"
        strokeWidth={1.5}
      />
      <div className="font-display text-xl text-ink-900 mb-1">{label}</div>
      <div className="text-xs text-ink-500">{sub}</div>
    </Link>
  )
}

function CMAStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-ink-100 text-ink-700',
    published: 'bg-emerald-50 text-emerald-700',
    archived: 'bg-ink-100 text-ink-400',
  }
  return (
    <span
      className={`text-2xs uppercase tracking-widest px-1.5 py-0.5 ${
        colors[status] || colors.draft
      }`}
    >
      {status}
    </span>
  )
}

// ===========================================================================
// Helpers
// ===========================================================================

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

function combineDateTimeToISO(date: string | null, time: string | null): string | null {
  if (!date) return null
  const baseTime = parseTimeToHHMM(time) ?? '09:00'
  const iso = new Date(`${date}T${baseTime}`)
  return isNaN(iso.getTime()) ? null : iso.toISOString()
}

function parseTimeToHHMM(time: string | null): string | null {
  if (!time) return null
  // 24-hour: "10:00" or "10:00:00"
  const iso = time.match(/^(\d{1,2}):(\d{2})/)
  if (iso) return `${iso[1].padStart(2, '0')}:${iso[2]}`
  // 12-hour with am/pm: "10:00 AM" or "10:00pm"
  const ampm = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/)
  if (ampm) {
    let h = parseInt(ampm[1], 10)
    const period = ampm[3].toLowerCase()
    if (period === 'pm' && h < 12) h += 12
    if (period === 'am' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${ampm[2]}`
  }
  return null
}

function formatScheduledLabel(date: string | null, time: string | null): string | null {
  if (!date) return null
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  const dateLabel = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  return time ? `${dateLabel} at ${time}` : dateLabel
}

// ===========================================================================
// P9.6 — Propose alternative tour times dialog
// ===========================================================================
function ProposeAlternatesDialog({
  tour,
  accessToken,
  onClose,
  onSubmitted,
}: {
  tour: PendingTour
  accessToken: string
  onClose: () => void
  onSubmitted: () => void
}) {
  const [slots, setSlots] = useState<Array<{ date: string; time: string }>>([
    { date: '', time: '' },
    { date: '', time: '' },
    { date: '', time: '' },
  ])
  const [agentNote, setAgentNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 24-hour minimum advance for proposed slots too
  const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  function updateSlot(idx: number, key: 'date' | 'time', value: string) {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s)))
  }

  function clearSlot(idx: number) {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { date: '', time: '' } : s)))
  }

  async function handleSubmit() {
    const filledSlots = slots.filter((s) => s.date)
    if (filledSlots.length === 0) {
      setError('Add at least one suggested time.')
      return
    }
    if (!accessToken) {
      setError('Not signed in.')
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      // 1. Update tour_requests with proposed alternates + agent_response + status
      const proposedAlternates = filledSlots.map((s) => ({
        date: s.date,
        time: s.time || null,
      }))
      const { error: updateError } = await supabase
        .from('tour_requests')
        .update({
          status: 'rescheduled',
          proposed_alternates: proposedAlternates,
          agent_response: agentNote.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tour.id)
      if (updateError) throw updateError

      // 2. Post war room system message (if war room exists)
      if (tour.war_room_id) {
        const slotLines = proposedAlternates
          .map((a, i) => {
            const dateLabel = formatProposedDateLabel(a.date, a.time)
            return `  ${i + 1}. ${dateLabel}`
          })
          .join('\n')
        const body =
          `Your agent suggested ${proposedAlternates.length} alternative time${
            proposedAlternates.length === 1 ? '' : 's'
          } for ${tour.property_address || 'the tour'}:\n${slotLines}` +
          (agentNote.trim() ? `\n\n${agentNote.trim()}` : '') +
          '\n\nPick one from your Schedule tab to confirm.'

        const { data: msg, error: msgErr } = await supabase
          .from('war_room_messages')
          .insert({
            tenant_id: tour.tenant_id,
            war_room_id: tour.war_room_id,
            sender_type: 'system',
            body,
            metadata: {
              type: 'tour_alternates_proposed',
              tour_request_id: tour.id,
              proposed_alternates: proposedAlternates,
            },
          })
          .select('id')
          .single()

        if (!msgErr && msg) {
          // Fire-and-forget email to the client
          fetch(`${EDGE_FUNCTIONS_BASE_URL}/notify_war_room_message`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message_id: msg.id }),
          }).catch(() => {})
        }
      }

      onSubmitted()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const filledCount = slots.filter((s) => s.date).length

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/40 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-cream border border-ink-200 w-full max-w-2xl mt-12 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5 pb-4 border-b border-ink-200">
          <div>
            <h2 className="font-display text-2xl text-ink-900 leading-tight">
              Suggest alternate tour times
            </h2>
            <p className="text-2xs uppercase tracking-widest text-ink-500 mt-1.5">
              {tour.property_address || 'Tour'}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-ink-600 mb-5">
          Propose up to 3 alternate datetime slots based on listing-agent availability. The client
          sees these on their Schedule tab and confirms the one that works for them.
        </p>

        {/* Original request reference */}
        <div className="text-xs text-ink-500 bg-ink-50 border border-ink-100 px-3 py-2 mb-5">
          <span className="text-2xs uppercase tracking-widest text-ink-400">
            Client originally requested
          </span>
          <div className="text-ink-700 mt-0.5">
            {tour.preferred_date
              ? `${formatProposedDateLabel(tour.preferred_date, tour.preferred_time)}`
              : 'No date set'}
          </div>
        </div>

        {/* Slot inputs */}
        <div className="space-y-3 mb-5">
          {slots.map((slot, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
                  Option {idx + 1}
                  {idx === 0 && (
                    <span className="ml-1 text-ink-400 normal-case">(required)</span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={slot.date}
                    min={minDate}
                    onChange={(e) => updateSlot(idx, 'date', e.target.value)}
                    className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
                  />
                  <input
                    type="time"
                    value={slot.time}
                    onChange={(e) => updateSlot(idx, 'time', e.target.value)}
                    className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
                  />
                </div>
              </div>
              {idx > 0 && slot.date && (
                <button
                  type="button"
                  onClick={() => clearSlot(idx)}
                  className="text-ink-500 hover:text-ink-900 p-2"
                  title="Clear this slot"
                >
                  <Minus className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Agent note */}
        <div className="mb-5">
          <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
            Note to client (optional)
          </label>
          <textarea
            value={agentNote}
            onChange={(e) => setAgentNote(e.target.value)}
            rows={3}
            placeholder="e.g. Listing agent only has these access windows this week — let me know which works best."
            className="w-full border border-ink-200 px-3 py-2 text-sm bg-cream"
          />
        </div>

        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-ink-200 pt-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || filledCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Send {filledCount} suggestion{filledCount === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatProposedDateLabel(date: string | null, time: string | null): string {
  if (!date) return 'TBD'
  const d = new Date(date)
  if (isNaN(d.getTime())) return date
  const dateStr = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  return time ? `${dateStr} at ${time}` : dateStr
}
