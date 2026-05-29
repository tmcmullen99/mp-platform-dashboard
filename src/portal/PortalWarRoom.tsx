// src/pages/portal/PortalWarRoom.tsx
//
// Client portal war room view. Fetches the client's primary war room + its
// messages directly via the supabase client (relies on RLS to scope access).
// Provides a text composer and integrates WarRoomDropzone for drag-drop file
// sharing.

import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase' // TODO: adjust path if your supabase client is elsewhere
import WarRoomDropzone from './WarRoomDropzone'
import WarRoomMessage from './WarRoomMessage'

interface Message {
  id: string
  war_room_id: string
  sender_type: 'agent' | 'client' | 'system'
  body: string
  attachments: unknown
  metadata: unknown
  read_by_agent: boolean
  read_by_client: boolean
  created_at: string
}

interface WarRoom {
  id: string
  name: string
  client_id: string
  unread_agent: number
  unread_client: number
  last_message_at: string | null
}

export default function PortalWarRoom() {
  const { session } = useAuth()
  const [room, setRoom] = useState<WarRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadRoomAndMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [messages])

  async function loadRoomAndMessages() {
    if (!session?.user?.id) return
    setLoading(true)
    try {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single()
      if (!client) throw new Error('Client lookup failed')

      const { data: rooms } = await supabase
        .from('war_rooms')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: true })
        .limit(1)
      if (!rooms || rooms.length === 0) {
        setLoading(false)
        return
      }
      const r = rooms[0] as WarRoom
      setRoom(r)

      const { data: msgs } = await supabase
        .from('war_room_messages')
        .select('*')
        .eq('war_room_id', r.id)
        .order('created_at', { ascending: true })
      setMessages((msgs as Message[]) || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    if (!room || !draft.trim() || sending || !session?.access_token) return
    setSending(true)
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/post_war_room_message`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ war_room_id: room.id, body: draft.trim() }),
        },
      )
      const json = await resp.json()
      if (!resp.ok || !json.ok) throw new Error(json.error || 'Send failed')
      setMessages((prev) => [...prev, json.message])
      setDraft('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) return <div className="text-ink-500 text-sm">Loading war room…</div>
  if (error)
    return <div className="text-red-600 text-sm">War room error: {error}</div>
  if (!room) {
    return (
      <div>
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">War room</div>
        <h1 className="font-['Playfair_Display',Georgia,serif] text-3xl text-[#1a1f2e]">
          No conversations yet
        </h1>
        <p className="text-[#353535] text-sm mt-4 max-w-prose">
          Your agent hasn't opened a war room yet. Once one is started, you'll be able to chat
          and share files here.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">War room</div>
        <h1 className="font-['Playfair_Display',Georgia,serif] text-3xl text-[#1a1f2e]">
          {room.name}
        </h1>
      </div>

      <WarRoomDropzone
        warRoomId={room.id}
        clientId={room.client_id}
        onMessage={(msg) => setMessages((prev) => [...prev, msg])}
      >
        <div
          ref={threadRef}
          className="bg-white border border-[#e8e3d8] rounded-2xl overflow-y-auto h-[55vh] p-6 flex flex-col gap-4"
        >
          {messages.length === 0 ? (
            <div className="m-auto text-center text-ink-500">
              <div className="text-sm">No messages yet.</div>
              <div className="text-xs mt-1">
                Type below or drop a file to start the conversation.
              </div>
            </div>
          ) : (
            messages.map((m) => <WarRoomMessage key={m.id} message={m} />)
          )}
        </div>
      </WarRoomDropzone>

      {/* Composer */}
      <div className="mt-4 bg-white border border-[#e8e3d8] rounded-2xl p-3 flex items-end gap-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message — or drag a file into the thread to share it."
          rows={2}
          className="flex-1 resize-none px-3 py-2 text-sm text-[#1a1f2e] placeholder-[#91a1ba] focus:outline-none bg-transparent"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className="bg-[#1a1f2e] text-white rounded-lg px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={14} />
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
