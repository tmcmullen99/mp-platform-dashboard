import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  MessageCircle,
  Calendar,
  CalendarCheck,
  CalendarX,
  UserPlus,
  FileText,
  Radio,
  Gift,
  Send,
  Home,
  CircleDollarSign,
  CheckCheck,
  Loader2,
  Inbox,
  type LucideIcon,
} from 'lucide-react'
import { supabase, NotificationRecord } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// Map notification_type → icon + human label. Unknown types fall back to a bell
// with the raw type humanized, so new server-side types render gracefully.
const TYPE_META: Record<string, { Icon: LucideIcon; label: string }> = {
  war_room_message: { Icon: MessageCircle, label: 'Situation Room' },
  tour_requested: { Icon: Calendar, label: 'Tour request' },
  tour_confirmed: { Icon: CalendarCheck, label: 'Tour confirmed' },
  tour_cancelled: { Icon: CalendarX, label: 'Tour cancelled' },
  new_lead: { Icon: UserPlus, label: 'New lead' },
  lead: { Icon: UserPlus, label: 'Lead' },
  offer_received: { Icon: FileText, label: 'Offer' },
  offer: { Icon: FileText, label: 'Offer' },
  cold_drip_graduated: { Icon: Radio, label: 'Cold drip' },
  cold_drip: { Icon: Radio, label: 'Cold drip' },
  referral: { Icon: Gift, label: 'Referral' },
  campaign_sent: { Icon: Send, label: 'Campaign' },
  unit_claim: { Icon: Home, label: 'Unit claim' },
  payment: { Icon: CircleDollarSign, label: 'Payment' },
}

function metaFor(type: string): { Icon: LucideIcon; label: string } {
  return TYPE_META[type] || { Icon: Bell, label: type.replace(/_/g, ' ') }
}

type Filter = 'all' | 'unread'

export default function Notifications() {
  const { user, isClient, clientProfile, currentTenant } = useAuth()
  const [items, setItems] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [marking, setMarking] = useState(false)
  const navigate = useNavigate()

  const recipientId = isClient ? clientProfile?.id : user?.id
  const recipientType: 'agent' | 'client' = isClient ? 'client' : 'agent'

  useEffect(() => {
    if (!recipientId || !currentTenant) return
    let cancelled = false
    setLoading(true)

    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_type', recipientType)
        .eq('recipient_id', recipientId)
        .order('created_at', { ascending: false })
        .limit(200)
      if (cancelled) return
      setItems((data as NotificationRecord[]) || [])
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel(`notifications-page:${recipientType}:${recipientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${recipientId}`,
        },
        (payload) => {
          const n = payload.new as NotificationRecord
          if (n.recipient_type !== recipientType) return
          setItems((prev) => [n, ...prev])
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [recipientId, recipientType, currentTenant])

  async function markRead(n: NotificationRecord) {
    if (n.read_at) return
    const ts = new Date().toISOString()
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: ts } : x)))
    await supabase.from('notifications').update({ read_at: ts }).eq('id', n.id)
  }

  async function markAllRead() {
    const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id)
    if (unreadIds.length === 0 || marking) return
    setMarking(true)
    const ts = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: ts })))
    await supabase.from('notifications').update({ read_at: ts }).in('id', unreadIds)
    setMarking(false)
  }

  function open(n: NotificationRecord) {
    markRead(n)
    if (!n.link_url) return
    // Internal app paths route in-app; external links open in a new tab.
    try {
      const url = new URL(n.link_url)
      if (url.origin === window.location.origin) navigate(url.pathname + url.search)
      else window.open(n.link_url, '_blank')
    } catch {
      navigate(n.link_url)
    }
  }

  const unreadCount = items.filter((n) => !n.read_at).length
  const visible = filter === 'unread' ? items.filter((n) => !n.read_at) : items
  const groups = groupByDay(visible)

  return (
    <div className="p-12 max-w-6xl">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap mb-10">
        <div>
          <div className="flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-500 mb-3">
            <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
            Notifications
          </div>
          <h1 className="font-display text-5xl text-ink-900 leading-[1.1]">Notifications</h1>
          <p className="mt-4 text-ink-600 text-lg font-light">
            {unreadCount > 0
              ? `${unreadCount} unread of ${items.length}`
              : `${items.length} ${items.length === 1 ? 'notification' : 'notifications'} · all caught up`}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={marking}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-ink-200 text-2xs uppercase tracking-widest text-ink-700 hover:border-ink-900 hover:text-ink-900 transition-colors disabled:opacity-50 shrink-0"
          >
            {marking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" strokeWidth={1.75} />}
            Mark all read
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-8">
        <FilterTab active={filter === 'all'} onClick={() => setFilter('all')} label={`All (${items.length})`} />
        <FilterTab active={filter === 'unread'} onClick={() => setFilter('unread')} label={`Unread (${unreadCount})`} />
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-400 py-12">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading notifications…
        </div>
      ) : visible.length === 0 ? (
        <div className="border border-dashed border-ink-200 py-16 flex flex-col items-center justify-center text-center">
          <Inbox className="w-8 h-8 text-ink-300 mb-3" strokeWidth={1.25} />
          <div className="text-sm text-ink-500">
            {filter === 'unread' ? "You're all caught up — no unread notifications." : 'No notifications yet.'}
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.label}>
              <SectionLabel>{group.label}</SectionLabel>
              <div className="space-y-2">
                {group.items.map((n) => (
                  <Row key={n.id} n={n} onActivate={() => open(n)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// UI primitives
// ===========================================================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="text-2xs uppercase tracking-widest text-ink-500">{children}</div>
      <div className="flex-1 h-px bg-ink-100" />
    </div>
  )
}

function FilterTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-2xs uppercase tracking-widest transition-colors ${
        active ? 'bg-ink-900 text-cream' : 'border border-ink-200 text-ink-600 hover:border-ink-900 hover:text-ink-900'
      }`}
    >
      {label}
    </button>
  )
}

function Row({ n, onActivate }: { n: NotificationRecord; onActivate: () => void }) {
  const { Icon, label } = metaFor(n.notification_type)
  const unread = !n.read_at
  const clickable = !!n.link_url || unread
  const when = new Date(n.created_at)
  return (
    <div
      onClick={clickable ? onActivate : undefined}
      className={`flex items-start gap-4 px-6 py-4 bg-white border border-ink-100 transition-colors ${
        clickable ? 'cursor-pointer hover:border-ink-300' : ''
      } ${unread ? 'border-l-2 border-l-ink-900' : ''}`}
    >
      <div className="w-9 h-9 rounded-full bg-cream border border-ink-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-ink-600" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-2xs uppercase tracking-widest text-ink-400">{label}</span>
          {unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
        </div>
        <div className={`text-sm mt-1 leading-snug ${unread ? 'text-ink-900' : 'text-ink-700'}`}>{n.title}</div>
        {n.body && <div className="text-sm text-ink-500 mt-1 leading-relaxed">{n.body}</div>}
        <div className="text-2xs uppercase tracking-widest text-ink-400 mt-2 tabular-nums">
          {when.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  )
}

// ===========================================================================
// Helpers
// ===========================================================================

function groupByDay(items: NotificationRecord[]): { label: string; items: NotificationRecord[] }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const buckets: { label: string; items: NotificationRecord[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Earlier this week', items: [] },
    { label: 'Earlier', items: [] },
  ]
  for (const n of items) {
    const d = new Date(n.created_at)
    if (d >= today) buckets[0].items.push(n)
    else if (d >= yesterday) buckets[1].items.push(n)
    else if (d >= weekAgo) buckets[2].items.push(n)
    else buckets[3].items.push(n)
  }
  return buckets.filter((b) => b.items.length > 0)
}
