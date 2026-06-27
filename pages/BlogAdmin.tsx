// Admin CRUD for the public blog (public.blog_posts). Mirrors ListingsAdmin:
// a list view with filter chips + search, and an edit/create form. Images upload
// to the listing-photos bucket under blog/<slug>/. Live on save.
//
// blog_posts shape (relevant cols): slug (req), name (req, = title),
// card_description (excerpt), body_html, image jsonb {url,alt}, youtube_url,
// publish_date (date), meta_title, meta_description, tags_array text[],
// author_name (default 'Tim McMullen'), is_published (default true),
// is_archived (default false).

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  Newspaper,
  Loader2,
  Save,
  Plus,
  ArrowLeft,
  Upload,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Search,
} from 'lucide-react'

/* --------------------------------- types --------------------------------- */
type ImageJson = { url: string; alt: string | null }

type PostRow = {
  id: string
  slug: string
  name: string
  card_description: string | null
  body_html: string | null
  image: ImageJson | null
  youtube_url: string | null
  publish_date: string | null // 'YYYY-MM-DD'
  meta_title: string | null
  meta_description: string | null
  tags_array: string[] | null
  author_name: string | null
  is_published: boolean | null
  is_archived: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

const BLANK: Omit<PostRow, 'id'> = {
  slug: '',
  name: '',
  card_description: null,
  body_html: null,
  image: null,
  youtube_url: null,
  publish_date: null,
  meta_title: null,
  meta_description: null,
  tags_array: [],
  author_name: 'Tim McMullen',
  is_published: false, // new posts start as draft; flip to publish explicitly
  is_archived: false,
}

/* -------------------------------- helpers -------------------------------- */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function statusOf(r: PostRow): 'Published' | 'Draft' | 'Archived' {
  if (r.is_archived) return 'Archived'
  return r.is_published ? 'Published' : 'Draft'
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-2xs uppercase tracking-widest text-ink-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

const INPUT_CLS =
  'w-full border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-ink-500'

/* --------------------------------- page ---------------------------------- */
export default function BlogAdmin() {
  const [rows, setRows] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'All' | 'Published' | 'Draft' | 'Archived'>('All')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<PostRow | 'new' | null>(null)

  async function loadAll() {
    setLoading(true)
    const { data } = await supabase
      .from('blog_posts')
      .select(
        'id, slug, name, card_description, body_html, image, youtube_url, publish_date, meta_title, meta_description, tags_array, author_name, is_published, is_archived, created_at, updated_at'
      )
      .order('publish_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
    setRows((data as PostRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  const counts = useMemo(() => {
    const c = { All: rows.length, Published: 0, Draft: 0, Archived: 0 }
    for (const r of rows) c[statusOf(r)]++
    return c
  }, [rows])

  const visible = useMemo(() => {
    let v = rows
    if (filter !== 'All') v = v.filter((r) => statusOf(r) === filter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      v = v.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q) ||
          (r.tags_array ?? []).some((t) => t.toLowerCase().includes(q))
      )
    }
    return v
  }, [rows, filter, query])

  function afterSave() {
    setEditing(null)
    loadAll()
  }

  if (editing) {
    return (
      <PostForm
        key={editing === 'new' ? 'new' : editing.id}
        initial={editing === 'new' ? null : editing}
        onBack={() => setEditing(null)}
        onSaved={afterSave}
      />
    )
  }

  const chips: (keyof typeof counts)[] = ['All', 'Published', 'Draft', 'Archived']

  return (
    <div className="p-12 max-w-6xl">
      <div className="border-b border-ink-200 pb-6 mb-8">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2 flex items-center gap-2">
          <Newspaper className="w-3 h-3" />
          <Link to="/site" className="hover:text-ink-900">
            Site Editor
          </Link>
          <span>·</span>
          <span>Blog</span>
        </div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl text-ink-900 leading-tight">Blog &amp; writing</h1>
            <p className="text-ink-600 mt-3 max-w-2xl">
              The public <span className="font-medium">/blog</span> — Campbell Press columns, market
              notes, and strategy write-ups. Write, edit, set publish dates, upload a hero image.
              Drafts stay private until published.
            </p>
          </div>
          <button
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-ink-900 text-white hover:bg-ink-800"
          >
            <Plus className="w-4 h-4" /> New post
          </button>
        </div>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-1.5">
          {chips.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={
                'px-3 py-1.5 text-2xs uppercase tracking-widest border transition-colors ' +
                (s === filter
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400')
              }
            >
              {s} <span className="opacity-60">{counts[s]}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts…"
            className="border border-ink-200 bg-white pl-9 pr-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-ink-500 w-64"
          />
        </div>
      </div>

      {/* list */}
      {loading ? (
        <div className="py-16 flex items-center gap-2 text-ink-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading posts…
        </div>
      ) : (
        <div className="border border-ink-200 bg-white divide-y divide-ink-100">
          {visible.map((r) => {
            const st = statusOf(r)
            return (
              <button
                key={r.id}
                onClick={() => setEditing(r)}
                className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-ink-50/60 transition-colors"
              >
                <div className="w-14 h-11 bg-ink-100 shrink-0 overflow-hidden">
                  {r.image?.url ? (
                    <img src={r.image.url} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-ink-900 truncate">{r.name}</div>
                  <div className="text-2xs uppercase tracking-widest text-ink-500 mt-0.5 truncate">
                    {(r.tags_array ?? []).slice(0, 3).join(' · ') || '—'}
                  </div>
                </div>
                <div className="text-2xs text-ink-500 w-28 text-right shrink-0">
                  {fmtDate(r.publish_date)}
                </div>
                <div className="w-24 text-right shrink-0">
                  <span
                    className={
                      'text-2xs uppercase tracking-widest px-2 py-1 border ' +
                      (st === 'Published'
                        ? 'text-green-700 bg-green-50 border-green-200'
                        : st === 'Draft'
                          ? 'text-amber-700 bg-amber-50 border-amber-200'
                          : 'text-ink-500 bg-ink-50 border-ink-200')
                    }
                  >
                    {st}
                  </span>
                </div>
              </button>
            )
          })}
          {visible.length === 0 ? (
            <div className="px-4 py-10 text-sm text-ink-500">No posts match.</div>
          ) : null}
        </div>
      )}
    </div>
  )
}

/* ------------------------------ edit / create ------------------------------ */
function PostForm({
  initial,
  onBack,
  onSaved,
}: {
  initial: PostRow | null
  onBack: () => void
  onSaved: () => void
}) {
  const isNew = initial == null
  const [form, setForm] = useState<Omit<PostRow, 'id'> & { id?: string }>(
    initial ? { ...initial } : { ...BLANK }
  )
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [tagsText, setTagsText] = useState((initial?.tags_array ?? []).join(', '))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setSavedAt(null)
  }

  function setName(name: string) {
    setForm((f) => ({ ...f, name, slug: !slugTouched ? slugify(name) : f.slug }))
    setSavedAt(null)
  }

  /* ------------------------------ hero upload ------------------------------ */
  async function uploadFile(files: FileList) {
    const slug = form.slug || slugify(form.name)
    if (!slug) {
      setError('Add a title first — the hero image is filed under the post slug.')
      return
    }
    setUploading(true)
    setError(null)
    const file = files[0]
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')
    const path = `blog/${slug}/${Date.now()}-${safe}`
    const { error: upErr } = await supabase.storage.from('listing-photos').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (upErr) {
      setError(`Upload failed: ${upErr.message}`)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('listing-photos').getPublicUrl(path)
    if (data?.publicUrl) {
      setForm((f) => ({ ...f, image: { url: data.publicUrl, alt: f.name || null } }))
      setSavedAt(null)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  /* ---------------------------------- save ---------------------------------- */
  async function save(opts?: { publish?: boolean; archive?: boolean }) {
    if (!form.name.trim()) {
      setError('A title is required.')
      return
    }
    const slug = (form.slug || slugify(form.name)).trim()
    if (!slug) {
      setError('A slug is required.')
      return
    }
    setSaving(true)
    setError(null)

    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const nextPublished = opts?.publish ?? form.is_published ?? false
    const nextArchived = opts?.archive ?? form.is_archived ?? false

    // Default publish_date to today when first publishing without one set.
    let publishDate = form.publish_date
    if (nextPublished && !publishDate) {
      publishDate = new Date().toISOString().slice(0, 10)
    }

    const payload: Record<string, unknown> = {
      slug,
      name: form.name.trim(),
      card_description: form.card_description?.trim() || null,
      body_html: form.body_html || null,
      image: form.image,
      youtube_url: form.youtube_url?.trim() || null,
      publish_date: publishDate,
      meta_title: form.meta_title?.trim() || null,
      meta_description: form.meta_description?.trim() || null,
      tags_array: tags,
      author_name: form.author_name?.trim() || 'Tim McMullen',
      is_published: nextPublished,
      is_archived: nextArchived,
      updated_at: new Date().toISOString(),
    }

    const result = isNew
      ? await supabase.from('blog_posts').insert(payload)
      : await supabase.from('blog_posts').update(payload).eq('id', form.id!)

    setSaving(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    // reflect publish/archive locally so the buttons update before reload
    setForm((f) => ({ ...f, is_published: nextPublished, is_archived: nextArchived, publish_date: publishDate }))
    setSavedAt(Date.now())
    onSaved()
  }

  const status = form.is_archived ? 'Archived' : form.is_published ? 'Published' : 'Draft'

  return (
    <div className="p-12 max-w-5xl">
      <div className="border-b border-ink-200 pb-6 mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 mb-3"
        >
          <ArrowLeft className="w-3 h-3" /> All posts
        </button>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="font-display text-4xl text-ink-900 leading-tight">
            {isNew ? 'New post' : form.name || 'Edit post'}
          </h1>
          <div className="flex items-center gap-2">
            <span
              className={
                'text-2xs uppercase tracking-widest px-2 py-1 border ' +
                (status === 'Published'
                  ? 'text-green-700 bg-green-50 border-green-200'
                  : status === 'Draft'
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-ink-500 bg-ink-50 border-ink-200')
              }
            >
              {status}
            </span>
            {!isNew && form.slug ? (
              <a
                href={`/blog/${form.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900"
              >
                <ExternalLink className="w-3 h-3" /> View
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-6 border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6">
        <Field label="Title">
          <input
            className={INPUT_CLS}
            value={form.name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The headline of your piece"
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-6">
          <Field label="Slug (URL)">
            <input
              className={INPUT_CLS}
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true)
                set('slug', e.target.value)
              }}
              placeholder="auto-generated-from-title"
            />
          </Field>
          <Field label="Publish date">
            <input
              type="date"
              className={INPUT_CLS}
              value={form.publish_date ?? ''}
              onChange={(e) => set('publish_date', e.target.value || null)}
            />
          </Field>
        </div>

        <Field label="Excerpt (card description)">
          <textarea
            className={INPUT_CLS + ' min-h-[60px]'}
            value={form.card_description ?? ''}
            onChange={(e) => set('card_description', e.target.value)}
            placeholder="One or two sentences shown on the blog index card."
          />
        </Field>

        {/* hero image */}
        <Field label="Hero image">
          <div className="flex items-start gap-4">
            <div className="w-40 h-28 bg-ink-100 border border-ink-200 overflow-hidden shrink-0">
              {form.image?.url ? (
                <img src={form.image.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xs uppercase tracking-widest text-ink-400">
                  none
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && uploadFile(e.target.files)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-ink-300 text-ink-800 hover:bg-ink-50 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {form.image?.url ? 'Replace image' : 'Upload image'}
              </button>
              {form.image?.url ? (
                <button
                  onClick={() => set('image', null)}
                  className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              ) : null}
            </div>
          </div>
        </Field>

        <Field label="Body (HTML)">
          <textarea
            className={INPUT_CLS + ' min-h-[320px] font-mono text-xs leading-relaxed'}
            value={form.body_html ?? ''}
            onChange={(e) => set('body_html', e.target.value)}
            placeholder="<p>Write your column here. Basic HTML: &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;&lt;li&gt;, &lt;a&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;blockquote&gt;.</p>"
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-6">
          <Field label="Tags (comma-separated)">
            <input
              className={INPUT_CLS}
              value={tagsText}
              onChange={(e) => {
                setTagsText(e.target.value)
                setSavedAt(null)
              }}
              placeholder="market-update, campbell, strategy"
            />
          </Field>
          <Field label="YouTube URL (optional)">
            <input
              className={INPUT_CLS}
              value={form.youtube_url ?? ''}
              onChange={(e) => set('youtube_url', e.target.value || null)}
              placeholder="https://youtu.be/…"
            />
          </Field>
        </div>

        {/* SEO */}
        <div className="border border-ink-200 bg-ink-50/40 p-5 grid gap-5">
          <div className="text-2xs uppercase tracking-widest text-ink-500">SEO / share</div>
          <Field label="Meta title">
            <input
              className={INPUT_CLS}
              value={form.meta_title ?? ''}
              onChange={(e) => set('meta_title', e.target.value || null)}
              placeholder="Defaults to the title if blank"
            />
          </Field>
          <Field label="Meta description">
            <textarea
              className={INPUT_CLS + ' min-h-[60px]'}
              value={form.meta_description ?? ''}
              onChange={(e) => set('meta_description', e.target.value || null)}
              placeholder="~150 chars for search/social previews."
            />
          </Field>
          <Field label="Author">
            <input
              className={INPUT_CLS}
              value={form.author_name ?? ''}
              onChange={(e) => set('author_name', e.target.value || null)}
            />
          </Field>
        </div>
      </div>

      {/* action bar */}
      <div className="sticky bottom-0 mt-8 -mx-12 px-12 py-4 bg-white/95 backdrop-blur border-t border-ink-200 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => save()}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium border border-ink-300 text-ink-800 hover:bg-ink-50 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save draft
        </button>

        {form.is_published ? (
          <button
            onClick={() => save({ publish: false })}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Unpublish
          </button>
        ) : (
          <button
            onClick={() => save({ publish: true, archive: false })}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-ink-900 text-white hover:bg-ink-800 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" /> Publish
          </button>
        )}

        {!isNew ? (
          form.is_archived ? (
            <button
              onClick={() => save({ archive: false })}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-ink-600 hover:text-ink-900"
            >
              Unarchive
            </button>
          ) : (
            <button
              onClick={() => save({ archive: true, publish: false })}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-ink-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" /> Archive
            </button>
          )
        ) : null}

        {savedAt ? (
          <span className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-green-700 ml-auto">
            <CheckCircle2 className="w-3 h-3" /> Saved
          </span>
        ) : null}
      </div>
    </div>
  )
}
