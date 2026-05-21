// P9.11 — ListingPhotos component.
// Drag-and-drop photo gallery keyed on deal_id. Works for both coming_soon_listings
// and properties (any deal type). Both agent and client can upload via mode prop.
//
// Photos live in the PUBLIC `listing-photos` storage bucket; URLs are CDN-served
// directly (no signed URL ceremony) since gallery rendering is a hot path.
//
// Reorder is via up/down arrows for MVP. Hero is a per-deal unique flag enforced
// by the partial unique index `listing_photos_one_hero_per_deal`.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Loader2,
  Upload,
  Star,
  Trash2,
  ChevronUp,
  ChevronDown,
  ImageIcon,
  AlertCircle,
} from 'lucide-react'
import { supabase, SUPABASE_URL, Deal } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type ListingPhoto = {
  id: string
  tenant_id: string
  deal_id: string
  storage_path: string
  caption: string | null
  alt_text: string | null
  sort_order: number
  is_hero: boolean
  width: number | null
  height: number | null
  file_size_bytes: number | null
  mime_type: string | null
  uploaded_by_type: 'agent' | 'client'
  uploaded_by_user_id: string | null
  created_at: string
  updated_at: string
}

const MAX_FILE_SIZE_MB = 15
const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default function ListingPhotos({
  deal,
  mode,
}: {
  deal: Deal
  mode: 'agent' | 'client'
}) {
  const { user } = useAuth()
  const [photos, setPhotos] = useState<ListingPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(
    null,
  )
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // -------- Load --------
  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error: loadErr } = await supabase
      .from('listing_photos')
      .select('*')
      .eq('deal_id', deal.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (loadErr) setError(loadErr.message)
    setPhotos((data as ListingPhoto[]) || [])
    setLoading(false)
  }, [deal.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  // -------- Upload --------
  async function handleFiles(files: FileList | File[]) {
    setError(null)
    if (!user) {
      setError('Not signed in.')
      return
    }
    const arr = Array.from(files).filter((f) => {
      if (!ACCEPTED_MIME.includes(f.type)) {
        setError(`${f.name}: only JPEG, PNG, WEBP, GIF allowed.`)
        return false
      }
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`${f.name}: exceeds ${MAX_FILE_SIZE_MB} MB.`)
        return false
      }
      return true
    })
    if (arr.length === 0) return

    setUploading(true)
    setUploadProgress({ done: 0, total: arr.length })
    const baseSort = photos.length > 0 ? Math.max(...photos.map((p) => p.sort_order)) + 1 : 0
    const noHeroExists = !photos.some((p) => p.is_hero)

    try {
      for (let i = 0; i < arr.length; i++) {
        const file = arr[i]
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-60)
        const path = `${deal.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`

        // 1. Read dimensions client-side (best-effort)
        const dims = await readImageDimensions(file).catch(() => null)

        // 2. Upload to storage
        const { error: upErr } = await supabase.storage
          .from('listing-photos')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          })
        if (upErr) throw new Error(`Upload failed (${file.name}): ${upErr.message}`)

        // 3. Insert metadata row.
        // First file becomes hero if no hero exists; otherwise plain.
        const isHeroPick = noHeroExists && i === 0
        const { error: insErr } = await supabase.from('listing_photos').insert({
          tenant_id: deal.tenant_id,
          deal_id: deal.id,
          storage_path: path,
          sort_order: baseSort + i,
          is_hero: isHeroPick,
          width: dims?.width || null,
          height: dims?.height || null,
          file_size_bytes: file.size,
          mime_type: file.type,
          uploaded_by_type: mode,
          uploaded_by_user_id: user.id,
        })
        if (insErr) {
          // Best-effort cleanup
          await supabase.storage.from('listing-photos').remove([path]).catch(() => {})
          throw new Error(`Save failed (${file.name}): ${insErr.message}`)
        }

        setUploadProgress({ done: i + 1, total: arr.length })
      }
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
      setUploadProgress(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // -------- Drag-drop --------
  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(true)
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  // -------- Reorder --------
  async function moveBy(photo: ListingPhoto, direction: -1 | 1) {
    const idx = photos.findIndex((p) => p.id === photo.id)
    const swapIdx = idx + direction
    if (idx < 0 || swapIdx < 0 || swapIdx >= photos.length) return
    const other = photos[swapIdx]
    // Optimistic local swap
    const next = [...photos]
    next[idx] = { ...other, sort_order: photo.sort_order }
    next[swapIdx] = { ...photo, sort_order: other.sort_order }
    setPhotos(next)
    // Persist both
    const { error: e1 } = await supabase
      .from('listing_photos')
      .update({ sort_order: other.sort_order })
      .eq('id', photo.id)
    const { error: e2 } = await supabase
      .from('listing_photos')
      .update({ sort_order: photo.sort_order })
      .eq('id', other.id)
    if (e1 || e2) {
      setError((e1 || e2)?.message || 'Reorder failed')
      refresh()
    }
  }

  // -------- Set hero --------
  async function setHero(photo: ListingPhoto) {
    if (photo.is_hero) return // already hero
    // 1. Unset current hero(s) first to avoid partial-unique conflict
    const { error: clearErr } = await supabase
      .from('listing_photos')
      .update({ is_hero: false })
      .eq('deal_id', deal.id)
      .eq('is_hero', true)
    if (clearErr) {
      setError(clearErr.message)
      return
    }
    // 2. Set the new hero
    const { error: setErr } = await supabase
      .from('listing_photos')
      .update({ is_hero: true })
      .eq('id', photo.id)
    if (setErr) {
      setError(setErr.message)
      refresh()
      return
    }
    setPhotos((prev) =>
      prev.map((p) => ({ ...p, is_hero: p.id === photo.id })),
    )
  }

  // -------- Delete --------
  async function removePhoto(photo: ListingPhoto) {
    if (!confirm(`Remove this photo? This cannot be undone.`)) return
    setError(null)
    // 1. Delete row first; storage policies allow tenant admin to clean up
    const { error: delErr } = await supabase
      .from('listing_photos')
      .delete()
      .eq('id', photo.id)
    if (delErr) {
      setError(delErr.message)
      return
    }
    // 2. Remove storage object (best-effort)
    await supabase.storage.from('listing-photos').remove([photo.storage_path]).catch(() => {})
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
  }

  // -------- Render --------
  const publicUrlFor = (path: string) =>
    `${SUPABASE_URL}/storage/v1/object/public/listing-photos/${path}`

  return (
    <section className="border-t border-ink-200 pt-10 mt-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
            Listing photos {photos.length > 0 && `· ${photos.length}`}
          </div>
          <h2 className="font-display text-2xl text-ink-900">
            {photos.length === 0
              ? 'Drop in the gallery.'
              : 'The story your buyers will see.'}
          </h2>
        </div>
        {photos.length > 0 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-ink-300 text-ink-800 text-2xs uppercase tracking-widest hover:border-ink-900 hover:text-ink-900 disabled:opacity-50"
          >
            <Upload className="w-3 h-3" strokeWidth={2} />
            Add more
          </button>
        )}
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 p-3 flex items-start gap-2 mb-4 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={1.5} />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-900 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_MIME.join(',')}
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-ink-500" />
      ) : photos.length === 0 ? (
        <DropZone
          dragActive={dragActive}
          uploading={uploading}
          uploadProgress={uploadProgress}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        />
      ) : (
        <>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 ${
              dragActive
                ? 'outline outline-2 outline-dashed outline-ink-400 outline-offset-4'
                : ''
            }`}
          >
            {photos.map((p, idx) => (
              <PhotoCard
                key={p.id}
                photo={p}
                url={publicUrlFor(p.storage_path)}
                isFirst={idx === 0}
                isLast={idx === photos.length - 1}
                onMoveUp={() => moveBy(p, -1)}
                onMoveDown={() => moveBy(p, 1)}
                onSetHero={() => setHero(p)}
                onDelete={() => removePhoto(p)}
              />
            ))}
          </div>
          {uploading && uploadProgress && (
            <div className="mt-4 text-2xs uppercase tracking-widest text-ink-500 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Uploading {uploadProgress.done} / {uploadProgress.total}…
            </div>
          )}
        </>
      )}
    </section>
  )
}

// ============================================================
// DropZone (empty state)
// ============================================================
function DropZone({
  dragActive,
  uploading,
  uploadProgress,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
}: {
  dragActive: boolean
  uploading: boolean
  uploadProgress: { done: number; total: number } | null
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onClick: () => void
}) {
  return (
    <button
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      disabled={uploading}
      className={`w-full border-2 border-dashed p-12 text-center transition-colors ${
        dragActive
          ? 'border-ink-900 bg-ink-50'
          : 'border-ink-300 hover:border-ink-500 bg-cream'
      } disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {uploading && uploadProgress ? (
        <>
          <Loader2 className="w-7 h-7 text-ink-500 mx-auto mb-3 animate-spin" strokeWidth={1.5} />
          <div className="font-display text-lg text-ink-900 mb-1">
            Uploading {uploadProgress.done} / {uploadProgress.total}…
          </div>
          <p className="text-sm text-ink-600">Hold tight.</p>
        </>
      ) : (
        <>
          <ImageIcon
            className="w-8 h-8 text-ink-400 mx-auto mb-3"
            strokeWidth={1.5}
          />
          <div className="font-display text-lg text-ink-900 mb-1">
            Drop photos here, or click to choose.
          </div>
          <p className="text-sm text-ink-600">
            JPEG, PNG, WEBP, or GIF. {MAX_FILE_SIZE_MB} MB max per file. The first photo becomes
            the hero by default.
          </p>
        </>
      )}
    </button>
  )
}

// ============================================================
// PhotoCard
// ============================================================
function PhotoCard({
  photo,
  url,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onSetHero,
  onDelete,
}: {
  photo: ListingPhoto
  url: string
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onSetHero: () => void
  onDelete: () => void
}) {
  return (
    <div className="relative group aspect-[4/3] bg-ink-100 border border-ink-200 overflow-hidden">
      <img
        src={url}
        alt={photo.alt_text || photo.caption || 'Listing photo'}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* Hero badge */}
      {photo.is_hero && (
        <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-ink-900 text-cream px-2 py-1 text-2xs uppercase tracking-widest">
          <Star className="w-3 h-3 fill-current" strokeWidth={2} />
          Hero
        </div>
      )}

      {/* Hover overlay with controls */}
      <div className="absolute inset-0 bg-ink-900/0 group-hover:bg-ink-900/40 transition-colors flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
        {/* Left cluster: reorder */}
        <div className="flex gap-1">
          <IconButton onClick={onMoveUp} disabled={isFirst} title="Move up">
            <ChevronUp className="w-3.5 h-3.5" strokeWidth={2} />
          </IconButton>
          <IconButton onClick={onMoveDown} disabled={isLast} title="Move down">
            <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
          </IconButton>
        </div>
        {/* Right cluster: hero + delete */}
        <div className="flex gap-1">
          {!photo.is_hero && (
            <IconButton onClick={onSetHero} title="Set as hero">
              <Star className="w-3.5 h-3.5" strokeWidth={2} />
            </IconButton>
          )}
          <IconButton onClick={onDelete} title="Remove photo" danger>
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
          </IconButton>
        </div>
      </div>
    </div>
  )
}

function IconButton({
  onClick,
  disabled,
  title,
  danger,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  title: string
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-7 h-7 flex items-center justify-center transition-colors ${
        danger
          ? 'bg-cream text-red-600 hover:bg-red-600 hover:text-cream'
          : 'bg-cream text-ink-900 hover:bg-ink-900 hover:text-cream'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

// ============================================================
// Helpers
// ============================================================
function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight }
      URL.revokeObjectURL(url)
      resolve(dims)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}
