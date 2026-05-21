// P8.3 — Notification bell. Subscribes to inserts on `notifications`
// where the recipient is the current user (agent via tenant, client via clientProfile).
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, X } from 'lucide-react'
import { supabase, NotificationRecord } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function NotificationBell() {
  const { user, isAgent, isClient, clientProfile, currentTenant } = useAuth()
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const recipientId = isClient ? clientProfile?.id : user?.id
  const recipientType: 'agent' | 'client' = isClient ? 'client' : 'agent'

  useEffect(() => {
    if (!recipientId || !currentTenant) return
    let cancelled = false

    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_type', recipientType)
        .eq('recipient_id', recipientId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (cancelled) return
      setNotifications((data as NotificationRecord[]) || [])
    }

    load()

    const channel = supabase
      .channel(`notifications:${recipientType}:${recipientId}`)
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
          setNotifications((prev) => [n, ...prev].slice(0, 20))
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [recipientId, recipientType, currentTenant])

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function markRead(n: NotificationRecord) {
    if (n.read_at) return
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', n.id)
    setNotifications((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)),
    )
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id)
    if (unreadIds.length === 0) return
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
    )
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-ink-500 hover:text-ink-900 transition-colors"
        title="Notifications"
      >
        <Bell className="w-4 h-4" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-cream border border-ink-200 shadow-lg z-40">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200">
            <div className="text-2xs uppercase tracking-widest text-ink-500">
              Notifications {unreadCount > 0 && `(${unreadCount} new)`}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ink-500">No notifications.</div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onSelect={() => {
                    markRead(n)
                    setOpen(false)
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationItem({
  notification,
  onSelect,
}: {
  notification: NotificationRecord
  onSelect: () => void
}) {
  const navigate = useNavigate()
  const when = new Date(notification.created_at)

  function go() {
    onSelect()
    if (notification.link_url) {
      // External links open in new tab; internal app paths use navigate
      try {
        const url = new URL(notification.link_url)
        if (url.origin === window.location.origin) {
          navigate(url.pathname + url.search)
        } else {
          window.open(notification.link_url, '_blank')
        }
      } catch {
        navigate(notification.link_url)
      }
    }
  }

  return (
    <button
      onClick={go}
      className={`w-full text-left px-4 py-3 border-b border-ink-100 last:border-b-0 hover:bg-ink-50 transition-colors ${
        !notification.read_at ? 'bg-blue-50/30' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {!notification.read_at && (
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-ink-900 leading-tight">{notification.title}</div>
          {notification.body && (
            <div className="text-xs text-ink-600 mt-1 line-clamp-2">{notification.body}</div>
          )}
          <div className="text-2xs uppercase tracking-widest text-ink-500 mt-1.5">
            {when.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    </button>
  )
}
