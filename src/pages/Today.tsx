import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarClock,
  MessageSquare,
  Users,
  FileBarChart2,
  Plus,
  Loader2,
  ChevronRight,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// ===========================================================================
// P9.4 — Agent home. Live operating console: tour requests awaiting a
// response, unread war-room messages per client, recent CMAs, quick actions.
// Pure read layer over existing tables (tour_requests, war_rooms,
// war_room_messages, cmas, clients). No writes, no migration, no Edge Function.
// ===========================================================================

type TourRow = {
  id: string
  property_address: string | null
  property_url: string | null
  property_photo_url: string | null
  property_price: number | null
  preferred_date: string | null
  preferred_time: string | null
  status: string
  client_id: string
  war_room_id: string | null
}

type ClientRow = { id: string; name: string; stage: string | null; created_at: string }
type RoomRow = { id: string; client_id: string }
type CmaRow = {
  id: string
  slug: string | null
  name: string | null
  property_address: string | null
  status: string
  created_at: string
  client_id: string | null
}

// Statuses that no longer need to appear on the board.
const TERMINAL_TOUR = new Set(['cancelled', 'canceled', 'toured', 'completed', 'declined'])

export default function Today() {
  const { currentTenant, currentBranding, profile } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [tours, setTours] = useState<TourRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [rooms, setRooms] = useState<RoomRow[]>([])
  const [unreadRoomIds, setUnreadRoomIds] = useState<string[]>([])
  const [cmas, setCmas] = useState<CmaRow[]>([])

  useEffect(() => {
    if (!currentTenant) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const tid = currentTenant.id
      const [t, c, r, m, cm] = await Promise.all([
        supabase
          .from('tour_requests')
          .select(
            'id, property_address, property_url, property_photo_url, property_price, preferred_date, preferred_time, status, client_id, war_room_id'
          )
          .eq('tenant_id', tid),
        supabase
          .from('clients')
          .select('id, name, stage, created_at')
          .eq('tenant_id', tid)
          .order('created_at', { ascending: false }),
        supabase.from('war_rooms').select('id, client_id').eq('tenant_id', tid),
        supabase
          .from('war_room_messages')
          .select('war_room_id')
          .eq('tenant_id', tid)
          .eq('read_by_agent', false)
          .eq('sender_type', 'client'),
        supabase
          .from('cmas')
          .select('id, slug, name, property_address, status, created_at, client_id')
          .eq('tenant_id', tid)
          .order('created_at', { ascending: false })
          .limit(50),
      ])
      if (cancelled) return
      setTours((t.data as TourRow[]) || [])
      setClients((c.data as ClientRow[]) || [])
      setRooms((r.data as RoomRow[]) || [])
      setUnreadRoomIds(((m.data as { war_room_id: string }[]) || []).map((x) => x.war_room_id))
      setCmas((cm.data as CmaRow[]) || [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [currentTenant?.id])

  const clientName = useMemo(() => {
    const map = new Map<string, string>()
    clients.forEach((c) => map.set(c.id, c.name))
    return map
  }, [clients])

  const activeTours = useMemo(() => {
    return [...tours]
      .filter((t) => !TERMINAL_TOUR.has(t.status))
      .sort((a, b) => {
        const ar = a.status === 'requested' ? 0 : 1
        const br = b.status === 'requested' ? 0 : 1
        if (ar !== br) return ar - br
        return (a.preferred_date || '9999-99-99').localeCompare(b.preferred_date || '9999-99-99')
      })
  }, [tours])

  const needsResponse = useMemo(() => tours.filter((t) => t.status === 'requested').length, [tours])

  const unreadByClient = useMemo(() => {
    const roomToClient = new Map<string, string>()
    rooms.forEach((r) => roomToClient.set(r.id, r.client_id))
    const counts = new Map<string, number>()
    unreadRoomIds.forEach((rid) => {
      const cid = roomToClient.get(rid)
      if (!cid) return
      counts.set(cid, (counts.get(cid) || 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([client_id, count]) => ({ client_id, count, name: clientName.get(client_id) || 'Client' }))
      .sort((a, b) => b.count - a.count)
  }, [rooms, unreadRoomIds, clientName])

  const unreadTotal = unreadRoomIds.length
  const activeClients = useMemo(() => clients.filter((c) => c.stage === 'active').length, [clients])
  const publishedCmas = useMemo(() => cmas.filter((c) => c.status === 'published').length, [cmas])
  const recentCmas = useMemo(() => cmas.slice(0, 6), [cmas])

  const goToWarRoom = (clientId: string) => navigate(`/clients/${clientId}/war_room`)

  const name = (currentBranding?.agent_name || profile?.email || '').split(/[ @]/)[0]
  const todayLong = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  if (!currentTenant) {
    return (
      <div className="p-12 flex items-center gap-3 text-ink-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <div className="p-12 max-w-6xl">
      {/* Header */}
      <div className="mb-10">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">P9.4 · Agent home</div>
        <h1 className="font-display text-4xl text-ink-900 leading-tight">
          {greeting()}
          {name ? `, ${capitalize(name)}` : ''}.
        </h1>
        <p className="text-ink-600 mt-2">
          {todayLong} · {currentTenant.display_name}
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatTile Icon={CalendarClock} label="Tours to respond" value={needsResponse} highlight={needsResponse > 0} />
        <StatTile Icon={MessageSquare} label="Unread messages" value={unreadTotal} highlight={unreadTotal > 0} />
        <StatTile Icon={Users} label="Active clients" value={activeClients} />
        <StatTile Icon={FileBarChart2} label="Published CMAs" value={publishedCmas} />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-14">
        <QuickAction to="/cmas/new" Icon={Plus} label="New CMA" primary />
        <QuickAction to="/clients" Icon={Plus} label="New client" />
        <QuickAction to="/campaigns" Icon={Plus} label="New campaign" />
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-ink-500 py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your day…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Tour requests */}
          <section className="lg:col-span-2">
            <SectionLabel>Tour requests</SectionLabel>
            <Card>
              {activeTours.length === 0 ? (
                <Empty>No open tour requests.</Empty>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {activeTours.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => goToWarRoom(t.client_id)}
                        className="w-full text-left flex items-center gap-4 py-4 first:pt-0 last:pb-0 group"
                      >
                        <Thumb url={t.property_photo_url} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-ink-900 font-medium truncate">{tourLabel(t)}</div>
                          <div className="text-xs text-ink-500 mt-1 truncate">
                            {[
                              clientName.get(t.client_id),
                              fmtDate(t.preferred_date),
                              t.preferred_time || null,
                              money(t.property_price),
                            ]
                              .filter(Boolean)
                              .join('  ·  ')}
                          </div>
                        </div>
                        <StatusBadge status={t.status} />
                        <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-ink-900 shrink-0" strokeWidth={1.5} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          {/* Right rail */}
          <div className="space-y-10">
            <section>
              <SectionLabel>Unread by client</SectionLabel>
              <Card>
                {unreadByClient.length === 0 ? (
                  <Empty>You're all caught up.</Empty>
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {unreadByClient.map((u) => (
                      <li key={u.client_id}>
                        <button
                          onClick={() => goToWarRoom(u.client_id)}
                          className="w-full flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 group"
                        >
                          <span className="text-sm text-ink-900 truncate group-hover:text-ink-700">{u.name}</span>
                          <span className="shrink-0 min-w-[1.5rem] text-center text-2xs font-medium px-2 py-1 bg-ink-900 text-cream">
                            {u.count}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>

            <section>
              <SectionLabel>Recent CMAs</SectionLabel>
              <Card>
                {recentCmas.length === 0 ? (
                  <Empty>No CMAs yet.</Empty>
                ) : (
                  <ul className="divide-y divide-ink-100">
                    {recentCmas.map((c) => (
                      <li key={c.id}>
                        <CmaItem cma={c} clientName={c.client_id ? clientName.get(c.client_id) : undefined} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function CmaItem({ cma, clientName }: { cma: CmaRow; clientName?: string }) {
  const label = cma.name || cma.property_address || 'Untitled CMA'
  const sub = [clientName, cma.status === 'published' ? 'Published' : 'Draft', fmtDateTime(cma.created_at)]
    .filter(Boolean)
    .join('  ·  ')
  const inner = (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-ink-900 truncate group-hover:text-ink-700">{label}</div>
        <div className="text-xs text-ink-500 mt-1 truncate">{sub}</div>
      </div>
      {cma.slug && <ArrowUpRight className="w-4 h-4 text-ink-300 group-hover:text-ink-900 shrink-0" strokeWidth={1.5} />}
    </div>
  )
  return cma.slug ? (
    <Link to={`/cmas/${cma.slug}`} className="block">
      {inner}
    </Link>
  ) : (
    inner
  )
}

function Thumb({ url }: { url: string | null }) {
  if (url) {
    return <img src={url} alt="" className="w-12 h-12 object-cover shrink-0 bg-ink-100" />
  }
  return (
    <div className="w-12 h-12 shrink-0 bg-ink-100 flex items-center justify-center">
      <CalendarClock className="w-4 h-4 text-ink-400" strokeWidth={1.5} />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; solid?: boolean }> = {
    requested: { label: 'Needs response', solid: true },
    confirmed: { label: 'Confirmed' },
    rescheduled: { label: 'Rescheduled' },
    proposed: { label: 'Proposed' },
  }
  const conf = map[status] || { label: capitalize(status) }
  return (
    <span
      className={`shrink-0 text-2xs uppercase tracking-widest px-2.5 py-1 ${
        conf.solid ? 'bg-ink-900 text-cream' : 'border border-ink-200 text-ink-500'
      }`}
    >
      {conf.label}
    </span>
  )
}

function StatTile({
  Icon,
  label,
  value,
  highlight,
}: {
  Icon: LucideIcon
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div className={`border p-5 ${highlight ? 'bg-ink-900 border-ink-900' : 'bg-white border-ink-100'}`}>
      <Icon className={`w-4 h-4 mb-3 ${highlight ? 'text-cream/70' : 'text-ink-400'}`} strokeWidth={1.5} />
      <div className={`font-display text-3xl leading-none ${highlight ? 'text-cream' : 'text-ink-900'}`}>{value}</div>
      <div className={`text-2xs uppercase tracking-widest mt-2 ${highlight ? 'text-cream/60' : 'text-ink-500'}`}>
        {label}
      </div>
    </div>
  )
}

function QuickAction({ to, Icon, label, primary }: { to: string; Icon: LucideIcon; label: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        primary
          ? 'bg-ink-900 text-cream hover:bg-ink-900/90'
          : 'border border-ink-200 text-ink-900 hover:border-ink-900'
      }`}
    >
      <Icon className="w-4 h-4" strokeWidth={1.5} />
      {label}
    </Link>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="text-2xs uppercase tracking-widest text-ink-500">{children}</div>
      <div className="flex-1 h-px bg-ink-100" />
    </div>
  )
}

function Card({ children }: { children: ReactNode }) {
  return <div className="bg-white border border-ink-100 p-8">{children}</div>
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="text-sm text-ink-500 py-2">{children}</div>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function fmtDate(d: string | null): string {
  if (!d) return 'Date TBD'
  const dt = new Date(`${d}T00:00:00`)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtDateTime(iso: string): string {
  const dt = new Date(iso)
  if (isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function money(n: number | null): string | null {
  if (n == null) return null
  return `$${Math.round(n).toLocaleString()}`
}

function tourLabel(t: TourRow): string {
  if (t.property_address) return t.property_address
  if (t.property_url) {
    try {
      return new URL(t.property_url).hostname.replace(/^www\./, '')
    } catch {
      /* fall through */
    }
  }
  return 'Saved property'
}
