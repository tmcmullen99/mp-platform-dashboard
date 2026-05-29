// src/pages/portal/WarRoomDropzone.tsx
//
// Wraps the war room message thread. Detects drag-over, shows a dashed-border
// overlay, handles drop: uploads each file to Supabase Storage at
//   client-documents/{clientId}/war-room/{timestamp}-{slug}.ext
// then calls /functions/v1/post_war_room_document so the file lands in the
// documents table AND a war_room_messages row referencing it.

import { useCallback, useState } from 'react'
import { Upload } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase' // TODO: adjust path

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
const BLOCKED_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.scr', '.js', '.jar']

interface DropzoneProps {
  warRoomId: string
  clientId: string
  onMessage?: (message: unknown) => void
  children: React.ReactNode
}

interface PendingFile {
  id: string
  name: string
  status: 'uploading' | 'posting' | 'done' | 'error'
  error?: string
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function WarRoomDropzone({
  warRoomId,
  clientId,
  onMessage,
  children,
}: DropzoneProps) {
  const { session } = useAuth()
  const [dragActive, setDragActive] = useState(false)
  const [pending, setPending] = useState<PendingFile[]>([])

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget === e.target) setDragActive(false)
  }, [])

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length === 0 || !session?.access_token) return

      for (const file of files) {
        const id =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`

        const lower = file.name.toLowerCase()
        if (BLOCKED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
          setPending((prev) => [
            ...prev,
            { id, name: file.name, status: 'error', error: 'File type not allowed' },
          ])
          continue
        }
        if (file.size > MAX_FILE_SIZE) {
          setPending((prev) => [
            ...prev,
            { id, name: file.name, status: 'error', error: 'File exceeds 25 MB' },
          ])
          continue
        }

        setPending((prev) => [...prev, { id, name: file.name, status: 'uploading' }])
        try {
          const path = `${clientId}/war-room/${Date.now()}-${slugify(file.name)}`
          const { error: upErr } = await supabase.storage
            .from('client-documents')
            .upload(path, file, { upsert: false, contentType: file.type })
          if (upErr) throw upErr

          const { data: signed, error: sErr } = await supabase.storage
            .from('client-documents')
            .createSignedUrl(path, 60 * 60 * 24 * 7)
          if (sErr || !signed?.signedUrl) throw sErr || new Error('Could not sign URL')

          setPending((prev) =>
            prev.map((p) => (p.id === id ? { ...p, status: 'posting' } : p)),
          )

          const resp = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/post_war_room_document`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                war_room_id: warRoomId,
                file_url: signed.signedUrl,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
              }),
            },
          )
          const json = await resp.json()
          if (!resp.ok || !json.ok) throw new Error(json.error || 'Post failed')

          if (onMessage && json.message) onMessage(json.message)
          setPending((prev) =>
            prev.map((p) => (p.id === id ? { ...p, status: 'done' } : p)),
          )
          setTimeout(() => {
            setPending((prev) => prev.filter((p) => p.id !== id))
          }, 1500)
        } catch (err) {
          setPending((prev) =>
            prev.map((p) =>
              p.id === id
                ? {
                    ...p,
                    status: 'error',
                    error: err instanceof Error ? err.message : String(err),
                  }
                : p,
            ),
          )
        }
      }
    },
    [warRoomId, clientId, onMessage, session?.access_token],
  )

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="relative"
    >
      {children}

      {/* Drag overlay */}
      {dragActive && (
        <div className="absolute inset-0 z-10 bg-white/95 border-2 border-dashed border-[#1a1f2e] rounded-2xl flex flex-col items-center justify-center pointer-events-none">
          <Upload size={32} className="text-[#1a1f2e] mb-3" />
          <div className="font-['Playfair_Display',Georgia,serif] text-xl text-[#1a1f2e]">
            Drop to share
          </div>
          <div className="text-xs text-ink-500 mt-1">
            PDF, image, or doc — up to 25 MB
          </div>
        </div>
      )}

      {/* Upload status chips */}
      {pending.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {pending.map((p) => (
            <div
              key={p.id}
              className={[
                'text-xs px-3 py-2 rounded-md flex items-center justify-between border',
                p.status === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : p.status === 'done'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-cream text-[#1a1f2e] border-[#e8e3d8]',
              ].join(' ')}
            >
              <span className="truncate">{p.name}</span>
              <span className="ml-2 shrink-0">
                {p.status === 'uploading'
                  ? 'Uploading…'
                  : p.status === 'posting'
                  ? 'Posting…'
                  : p.status === 'done'
                  ? 'Sent'
                  : p.error || 'Error'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
