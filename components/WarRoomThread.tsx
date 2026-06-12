// Shared war room thread, used by both agent (/clients/:id/war_room) and
// client (/portal/war-room) surfaces. Differs only by sender_type set on send.
//
// Supports drag-and-drop file sharing — drop any file onto the thread to upload
// it to client-documents storage and post it as a message via the
// post_war_room_document edge function. Attachments render as inline chips
// that mint a fresh 1-hour signed URL on click (so links never expire).
import { useEffect, useRef, useState, FormEvent, DragEvent } from 'react'
import { Send, Loader2, Paperclip, FileText, Upload } from 'lucide-react'
import {
  supabase,
  WarRoom,
  EDGE_FUNCTIONS_BASE_URL,
} from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type WarRoomAttachment = {
  type?: string
  document_id?: string
  file_url?: string
  name?: string
  file_type?: string | null
  file_size?: number | null
  category?: string
  signed_status?: string
}

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
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragDepthRef = useRef(0)

  // Initial load + Realtime subscribe
  useEffect(() => {
    let cancelled = false

    // Viewing the thread marks the other party's messages as read. The
    // war_room_recount trigger keeps war_rooms.unread_* in sync, and
    // Today.tsx's unread indicator (read_by_agent=false) clears as a result.
    const readColumn = viewerType === 'agent' ? 'read_by_agent' : 'read_by_client'

    function markThreadRead() {
      supabase
        .from('war_room_messages')
        .update({ [readColumn]: true })
        .eq('war_room_id', warRoom.id)
        .neq('sender_type', viewerType)
        .eq(readColumn, false)
        .then(({ error }) => {
          if (error) console.error('mark-read failed:', error.message)
        })
    }

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
      markThreadRead()
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
          // Thread is open — incoming messages from the other party are
          // read on arrival.
          const incoming = payload.new as WarRoomMessage
          if (incoming.sender_type !== viewerType) markThreadRead()
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [warRoom.id, viewerType])

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

  async function uploadAndShareFile(file: File) {
    if (!session?.access_token) {
      throw new Error('Not signed in.')
    }

    // Build path: {client_id}/war-room/{timestamp}-{safe-name}
    // First folder must equal client_id to pass the storage RLS policy.
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${warRoom.client_id}/war-room/${timestamp}-${safeName}`

    // 1. Upload to client-documents bucket
    const { error: uploadErr } = await supabase.storage
      .from('client-documents')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      })
    if (uploadErr) {
      throw new Error('Upload failed: ' + uploadErr.message)
    }

    // 2. Tell post_war_room_document the path. It creates the documents row,
    //    chains post_war_room_message, which the war_room_message_bump trigger
    //    + Realtime subscription handle from there.
    const resp = await fetch(`${EDGE_FUNCTIONS_BASE_URL}/post_war_room_document`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        war_room_id: warRoom.id,
        file_url: path, // storage path; signed URL minted on click
        file_name: file.name,
        file_type: file.type || null,
        file_size: file.size,
      }),
    })
    const json = await resp.json().catch(() => ({}))
    if (!resp.ok || !json.ok) {
      throw new Error(json.error || 'Share failed')
    }
  }

  async function handleFiles(files: FileList) {
    if (files.length === 0) return
    setUploading(true)
    setUploadError(null)
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        if (!f) continue
        await uploadAndShareFile(f)
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
    }
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    const hasFiles = Array.from(e.dataTransfer.types).includes('Files')
    if (!hasFiles) return
    dragDepthRef.current += 1
    setIsDragging(true)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current -= 1
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0
      setIsDragging(false)
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current = 0
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative flex flex-col h-[600px] border border-ink-200 bg-cream"
    >
      {/* Header */}
      <div className="px-5 py-3 border-b border-ink-200 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-ink-900">{warRoom.name}</div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mt-0.5">
            {viewerType === 'client' ? 'Listing chat' : 'War room'}
          </div>
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

      {/* Upload error */}
      {uploadError && (
        <div className="px-5 py-2 border-t border-red-200 bg-red-50 text-xs text-red-700 flex items-start justify-between gap-3">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-2xs uppercase tracking-widest text-red-700 hover:text-red-900 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Composer */}
      <form onSubmit={handleSend} className="border-t border-ink-200 p-3 flex gap-2 items-end">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(e)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          rows={2}
          placeholder="Type a message… (⌘+Enter to send, or drag a file in)"
          className="flex-1 px-3 py-2 border border-ink-200 text-sm resize-none focus:outline-none focus:border-ink-900"
          disabled={sending || uploading}
        />
        <button
          type="submit"
          disabled={!body.trim() || sending || uploading}
          className="px-4 py-2 bg-ink-900 text-cream text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-ink-800 transition-colors"
        >
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Send
        </button>
      </form>

      {/* Uploading toast (during upload, not during drag) */}
      {uploading && !isDragging && (
        <div className="absolute inset-x-0 bottom-24 mx-auto w-fit px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest flex items-center gap-2 shadow-lg">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Sharing file…
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-cream/95 border-2 border-dashed border-ink-900 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center">
            <Upload className="w-10 h-10 text-ink-900 mx-auto mb-3" strokeWidth={1.5} />
            <div className="font-['Playfair_Display',Georgia,serif] text-2xl text-ink-900 mb-1">
              Drop to share
            </div>
            <div className="text-2xs uppercase tracking-widest text-ink-500">
              {viewerType === 'agent' ? 'Send file to your client' : 'Send file to your agent'}
            </div>
          </div>
        </div>
      )}
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

  const attachment = parseAttachment(message.attachments)
  // When attachment is present, the edge function prefixes the body with
  // "📎 Shared a file: {name}" — strip that since the chip below shows the same.
  // Preserve any user-supplied caption that appears before the 📎 marker.
  const renderedBody = attachment ? extractCaption(message.body) : message.body

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
        {renderedBody && (
          <div
            className={`px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
              isMine ? 'bg-ink-900 text-cream' : 'bg-ink-50 text-ink-900'
            }`}
          >
            {renderedBody}
          </div>
        )}
        {attachment && <AttachmentChip attachment={attachment} isMine={isMine} />}
      </div>
    </div>
  )
}

function parseAttachment(raw: unknown): WarRoomAttachment | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  // post_war_room_document writes a single attachment object {type: 'document', ...}
  if (obj.type === 'document' && typeof obj.file_url === 'string' && typeof obj.name === 'string') {
    return {
      type: 'document',
      document_id: typeof obj.document_id === 'string' ? obj.document_id : undefined,
      file_url: obj.file_url,
      name: obj.name,
      file_type: typeof obj.file_type === 'string' ? obj.file_type : null,
      file_size: typeof obj.file_size === 'number' ? obj.file_size : null,
      category: typeof obj.category === 'string' ? obj.category : undefined,
      signed_status: typeof obj.signed_status === 'string' ? obj.signed_status : undefined,
    }
  }
  return null
}

function extractCaption(body: string | null): string | null {
  if (!body) return null
  const idx = body.indexOf('📎')
  if (idx === -1) return body
  if (idx === 0) return null // pure announcement, no caption
  const trimmed = body.slice(0, idx).replace(/\n+$/, '').trim()
  return trimmed || null
}

function AttachmentChip({
  attachment,
  isMine,
}: {
  attachment: WarRoomAttachment
  isMine: boolean
}) {
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleOpen() {
    if (!attachment.file_url || opening) return
    setError(null)
    setOpening(true)
    try {
      const { data, error: signErr } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(attachment.file_url, 60 * 60) // 1 hour
      if (signErr || !data?.signedUrl) {
        throw new Error(signErr?.message || 'Could not open file')
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setOpening(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={opening}
      className={`mt-2 flex items-center gap-2 px-3 py-2 border w-full text-left transition-colors ${
        isMine
          ? 'border-ink-700 bg-cream hover:bg-ink-50'
          : 'border-ink-200 bg-white hover:border-ink-400'
      } disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      <Paperclip className="w-3.5 h-3.5 text-ink-500 shrink-0" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-ink-900 truncate">{attachment.name}</div>
        {(attachment.file_size != null || (attachment.category && attachment.category !== 'other')) && (
          <div className="text-2xs text-ink-500 mt-0.5 flex items-center gap-2">
            {attachment.file_size != null && <span>{formatBytes(attachment.file_size)}</span>}
            {attachment.category && attachment.category !== 'other' && (
              <span className="uppercase tracking-widest">· {attachment.category}</span>
            )}
          </div>
        )}
        {error && <div className="text-2xs text-red-700 mt-0.5">{error}</div>}
      </div>
      {opening ? (
        <Loader2 className="w-3.5 h-3.5 text-ink-500 animate-spin shrink-0" />
      ) : (
        <FileText className="w-3.5 h-3.5 text-ink-500 shrink-0" strokeWidth={1.5} />
      )}
    </button>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
