// Shared document manager — upload, list, download via signed URLs.
// Used on both agent (/clients/:id/documents) and client (/portal/documents) surfaces.
import { useEffect, useRef, useState } from 'react'
import {
  FileText,
  Upload,
  Loader2,
  Download,
  Trash2,
  X,
} from 'lucide-react'
import {
  supabase,
  DocumentRecord,
  DocumentCategory,
  DOCUMENT_CATEGORIES,
  CLIENT_DOCUMENTS_BUCKET,
} from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function DocumentManager({
  tenantId,
  clientId,
  dealId,
  uploaderType, // 'agent' | 'client'
}: {
  tenantId: string
  clientId: string
  dealId?: string | null
  uploaderType: 'agent' | 'client'
}) {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)

  async function refresh() {
    setLoading(true)
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    setDocuments((data as DocumentRecord[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  async function handleDownload(doc: DocumentRecord) {
    const path = doc.file_url
    const { data, error } = await supabase.storage
      .from(CLIENT_DOCUMENTS_BUCKET)
      .createSignedUrl(path, 300)
    if (error || !data?.signedUrl) {
      alert('Could not generate download link: ' + (error?.message || 'unknown'))
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(doc: DocumentRecord) {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    // Storage delete first; then row
    await supabase.storage.from(CLIENT_DOCUMENTS_BUCKET).remove([doc.file_url])
    await supabase.from('documents').delete().eq('id', doc.id)
    refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-ink-600">
          {documents.length} {documents.length === 1 ? 'document' : 'documents'}
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-ink-900 text-cream text-sm hover:bg-ink-800 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload
        </button>
      </div>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-ink-500" />
      ) : documents.length === 0 ? (
        <div className="border border-dashed border-ink-200 p-10 text-center">
          <FileText className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-ink-600 mb-1">No documents yet.</p>
          <p className="text-xs text-ink-500">
            Upload listing agreements, disclosures, CMAs, inspection reports — anything you both
            need to reference.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((d) => (
            <DocumentRow
              key={d.id}
              doc={d}
              onDownload={() => handleDownload(d)}
              onDelete={() => handleDelete(d)}
              canDelete={
                d.uploaded_by_id === user?.id || uploaderType === 'agent'
              }
            />
          ))}
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          tenantId={tenantId}
          clientId={clientId}
          dealId={dealId || null}
          uploaderType={uploaderType}
          uploaderId={user?.id || null}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            setUploadOpen(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function DocumentRow({
  doc,
  onDownload,
  onDelete,
  canDelete,
}: {
  doc: DocumentRecord
  onDownload: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  return (
    <div className="flex items-center justify-between border border-ink-200 p-4 hover:border-ink-400 transition-colors">
      <button onClick={onDownload} className="flex items-center gap-3 flex-1 text-left">
        <FileText className="w-4 h-4 text-ink-500 shrink-0" strokeWidth={1.5} />
        <div className="min-w-0">
          <div className="text-sm text-ink-900 truncate">{doc.name}</div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mt-0.5 flex items-center gap-2">
            <span>{doc.category}</span>
            <span>·</span>
            <span>{doc.uploaded_by_type}</span>
            <span>·</span>
            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
            {doc.file_size && (
              <>
                <span>·</span>
                <span>{formatFileSize(doc.file_size)}</span>
              </>
            )}
          </div>
        </div>
      </button>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onDownload}
          className="p-2 text-ink-500 hover:text-ink-900 transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4" strokeWidth={1.5} />
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            className="p-2 text-ink-500 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function UploadModal({
  tenantId,
  clientId,
  dealId,
  uploaderType,
  uploaderId,
  onClose,
  onUploaded,
}: {
  tenantId: string
  clientId: string
  dealId: string | null
  uploaderType: 'agent' | 'client'
  uploaderId: string | null
  onClose: () => void
  onUploaded: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<DocumentCategory>('other')
  const [customName, setCustomName] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    if (!customName) {
      // strip extension for default
      setCustomName(f.name.replace(/\.[^/.]+$/, ''))
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || ''
      const rand = Math.random().toString(36).slice(2, 10)
      const path = `${clientId}/${rand}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

      const { error: upErr } = await supabase.storage
        .from(CLIENT_DOCUMENTS_BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        })
      if (upErr) {
        alert('Upload failed: ' + upErr.message)
        return
      }

      const finalName = customName.trim() || file.name.replace(/\.[^/.]+$/, '')
      const displayName = ext ? `${finalName}.${ext}` : finalName

      const { error: insErr } = await supabase.from('documents').insert({
        tenant_id: tenantId,
        client_id: clientId,
        deal_id: dealId,
        name: displayName,
        file_url: path,
        file_type: file.type || null,
        file_size: file.size,
        category,
        uploaded_by_type: uploaderType,
        uploaded_by_id: uploaderId,
      })
      if (insErr) {
        // Roll back the upload
        await supabase.storage.from(CLIENT_DOCUMENTS_BUCKET).remove([path])
        alert('Could not save metadata: ' + insErr.message)
        return
      }
      onUploaded()
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center p-12 overflow-y-auto">
      <div className="bg-cream w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-ink-200">
          <h2 className="font-display text-xl text-ink-900">Upload document</h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleUpload} className="p-6 space-y-5">
          <div>
            <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">
              File
            </label>
            {file ? (
              <div className="border border-ink-200 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-ink-500 shrink-0" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <div className="text-sm text-ink-900 truncate">{file.name}</div>
                    <div className="text-2xs text-ink-500">{formatFileSize(file.size)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                  className="text-ink-500 hover:text-ink-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border border-dashed border-ink-200 hover:border-ink-400 p-6 text-center transition-colors"
              >
                <Upload className="w-6 h-6 text-ink-400 mx-auto mb-2" strokeWidth={1.5} />
                <div className="text-sm text-ink-600">Click to choose a file</div>
                <div className="text-2xs text-ink-500 mt-1">PDF, DOCX, images, etc.</div>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              onChange={onFileChange}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">
              Name
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Display name (extension added automatically)"
              className="w-full px-3 py-2 border border-ink-200 text-sm focus:outline-none focus:border-ink-900"
            />
          </div>

          <div>
            <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              className="w-full px-3 py-2 border border-ink-200 text-sm bg-cream focus:outline-none focus:border-ink-900"
            >
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-ink-600 hover:text-ink-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="px-4 py-2 bg-ink-900 text-cream text-sm hover:bg-ink-800 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {uploading && <Loader2 className="w-3 h-3 animate-spin" />}
              Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
