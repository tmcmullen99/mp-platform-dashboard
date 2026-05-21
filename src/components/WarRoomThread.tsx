// Shared war room thread, used by both agent (/clients/:id/war_room) and
// client (/portal/war-room) surfaces. Differs only by sender_type set on send.
import { useEffect, useRef, useState, FormEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'
import {
  supabase,
  WarRoom,
  EDGE_FUNCTIONS_BASE_URL,
} from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type WarRoomMessage = {
  id: string
  tenant_id: string
  war_room_id: string
  sender_type: 'agent' | 'client' | 'system'
  sender_id: string | null
  body: string | null
  attachments: unknown
  metadata: unknown
  read_by_agent: boolean
  read_by_client: boolean
  created_at: string
}

export default function WarRoomThread({
  warRoom,
  viewerType, // 'agent' | 'client' — determines sender_type on send
}: {
  warRoom: WarRoom
  viewerType: 'agent' | 'client'
}) {
  const { user, session } = useAuth()
  const [messages, setMessages] = useState<WarRoomMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Initial load + Realtime subscribe
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('war_room_messages')
        .select('*')
        .eq('war_room_id', warRoom.id)
        .order('created_at', { ascending: true })
        .limit(500)
      if (cancelled) return
      setMessages((data as WarRoomMessage[]) || [])
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel(`war_room:${warRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'war_room_messages',
          filter: `war_room_id=eq.${warRoom.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            const incoming = payload.new as WarRoomMessage
            if (prev.find((m) => m.id === incoming.id)) return prev
            return [...prev, incoming]
          })
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [warRoom.id])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!body.trim() || !user || sending) return
    setSending(true)
    const text = body.trim()
    setBody('')

    const { data: inserted, error } = await supabase
      .from('war_room_messages')
      .insert({
        tenant_id: warRoom.tenant_id,
        war_room_id: warRoom.id,
        sender_type: viewerType,
        sender_id: user.id,
        body: text,
      })
      .select()
      .single()

    if (error) {
      alert('Could not send: ' + error.message)
      setBody(text) // restore so the user doesn't lose their text
      setSending(false)
      return
    }

    // Fire and forget — notify the other side via email
    if (session?.access_token && inserted) {
      fetch(`${EDGE_FUNCTIONS_BASE_URL}/notify_war_room_message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message_id: inserted.id }),
      }).catch(() => {})
    }

    setSending(false)
  }

  return (
    <div className="flex flex-col h-[600px] border border-ink-200 bg-cream">
      {/* Header */}
      <div className="px-5 py-3 border-b border-ink-200 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-ink-900">{warRoom.name}</div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mt-0.5">War room</div>
        </div>
        <div className="text-2xs text-ink-500">
          {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </div>
      </div>

      {/* Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-ink-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-ink-500 py-12">
            No messages yet. {viewerType === 'agent' ? 'Send the first one to kick off the thread.' : 'Your agent will see anything you send here.'}
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} message={m} isMine={m.sender_type === viewerType} />
          ))
        )}
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="border-t border-ink-200 p-3 flex gap-2 items-end">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(e)
          }}
          rows={2}
          placeholder="Type a message… (⌘+Enter to send)"
          className="flex-1 px-3 py-2 border border-ink-200 text-sm resize-none focus:outline-none focus:border-ink-900"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          className="px-4 py-2 bg-ink-900 text-cream text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-ink-800 transition-colors"
        >
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Send
        </button>
      </form>
    </div>
  )
}

function MessageBubble({ message, isMine }: { message: WarRoomMessage; isMine: boolean }) {
  const when = new Date(message.created_at)
  if (message.sender_type === 'system') {
    return (
      <div className="text-center text-2xs uppercase tracking-widest text-ink-500 py-2">
        {message.body}
      </div>
    )
  }
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%]`}>
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1 px-1">
          {isMine ? 'You' : message.sender_type === 'agent' ? 'Agent' : 'Client'} ·{' '}
          {when.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
        <div
          className={`px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
            isMine ? 'bg-ink-900 text-cream' : 'bg-ink-50 text-ink-900'
          }`}
        >
          {message.body}
        </div>
      </div>
    </div>
  )
}
