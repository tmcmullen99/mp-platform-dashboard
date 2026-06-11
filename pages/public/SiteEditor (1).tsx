// P10 — Site Editor. Route: /site (agent dashboard).
//
// Admin CRUD for the public website content. Two backing tables, both
// tenant-scoped JSONB with existing RLS write policies (site_home_tenant_write
// / site_core_tenant_write):
//   - public.site_home_content   one row per tenant (the homepage)
//   - public.site_core_pages     one row per (tenant, slug): about/buy/sell/services
//
// A single recursive form renderer drives every page: objects become labeled
// fieldsets, arrays become collapsible item lists with add/remove, strings
// become inputs (textarea when long). No page-specific form code — when a new
// page row is seeded, the editor handles it automatically.

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Globe,
  Loader2,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react'

/* --------------------------------- types --------------------------------- */
type J = string | number | boolean | null | J[] | { [k: string]: J }
type JObj = { [k: string]: J }

type PageDef = {
  key: string
  label: string
  table: 'site_home_content' | 'site_core_pages'
  slug?: string // for site_core_pages
  previewPath: string
}

const PAGES: PageDef[] = [
  { key: 'home', label: 'Homepage', table: 'site_home_content', previewPath: '/' },
  { key: 'about', label: 'About', table: 'site_core_pages', slug: 'about', previewPath: '/about' },
  { key: 'buy', label: 'Buy', table: 'site_core_pages', slug: 'buy', previewPath: '/buy' },
  { key: 'sell', label: 'Sell', table: 'site_core_pages', slug: 'sell', previewPath: '/sell' },
  { key: 'services', label: 'Services', table: 'site_core_pages', slug: 'services', previewPath: '/services' },
]

/* ------------------------------ path helpers ------------------------------ */
type Path = (string | number)[]

function getAtPath(obj: J, path: Path): J {
  let cur: J = obj
  for (const seg of path) {
    if (cur == null || typeof cur !== 'object') return null
    cur = (cur as Record<string | number, J>)[seg as never] ?? null
  }
  return cur
}

function setAtPath(obj: J, path: Path, value: J): J {
  if (path.length === 0) return value
  const [head, ...rest] = path
  if (Array.isArray(obj)) {
    const next = obj.slice()
    next[head as number] = setAtPath(next[head as number] ?? null, rest, value)
    return next
  }
  const base = obj && typeof obj === 'object' ? { ...(obj as JObj) } : {}
  base[head as string] = setAtPath(base[head as string] ?? null, rest, value)
  return base
}

function removeAtPath(obj: J, path: Path): J {
  const parentPath = path.slice(0, -1)
  const last = path[path.length - 1]
  const parent = getAtPath(obj, parentPath)
  if (Array.isArray(parent)) {
    const next = parent.slice()
    next.splice(last as number, 1)
    return setAtPath(obj, parentPath, next)
  }
  if (parent && typeof parent === 'object') {
    const next = { ...(parent as JObj) }
    delete next[last as string]
    return setAtPath(obj, parentPath, next)
  }
  return obj
}

/** Clone the shape of a sample value with empty strings — used by array "Add". */
function blankLike(sample: J): J {
  if (Array.isArray(sample)) return []
  if (sample && typeof sample === 'object') {
    const out: JObj = {}
    for (const [k, v] of Object.entries(sample as JObj)) out[k] = blankLike(v)
    return out
  }
  if (typeof sample === 'number') return 0
  if (typeof sample === 'boolean') return false
  return ''
}

function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

/** Best-effort display title for an array item (first short string value). */
function itemTitle(item: J, index: number): string {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    for (const k of ['title', 'name', 'label', 'address', 'value', 'headline', 'quote']) {
      const v = (item as JObj)[k]
      if (typeof v === 'string' && v.trim()) return v.length > 48 ? v.slice(0, 48) + '…' : v
    }
  }
  if (typeof item === 'string' && item.trim()) {
    return item.length > 48 ? item.slice(0, 48) + '…' : item
  }
  return `Item ${index + 1}`
}

/* ----------------------------- field renderers ---------------------------- */
function StringField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const long = value.length > 80
  return (
    <label className="block">
      <span className="text-2xs uppercase tracking-widest text-ink-500">{label}</span>
      {long ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={Math.min(6, Math.ceil(value.length / 70))}
          className="mt-1 w-full border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-ink-500 leading-relaxed"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-ink-500"
        />
      )}
    </label>
  )
}

function ValueEditor({
  value,
  path,
  onSet,
  onRemoveItem,
  depth,
}: {
  value: J
  path: Path
  onSet: (path: Path, v: J) => void
  onRemoveItem: (path: Path) => void
  depth: number
}) {
  if (typeof value === 'string') {
    return (
      <StringField
        label={humanize(String(path[path.length - 1] ?? ''))}
        value={value}
        onChange={(v) => onSet(path, v)}
      />
    )
  }
  if (typeof value === 'number') {
    return (
      <label className="block">
        <span className="text-2xs uppercase tracking-widest text-ink-500">
          {humanize(String(path[path.length - 1] ?? ''))}
        </span>
        <input
          type="number"
          value={value}
          onChange={(e) => onSet(path, Number(e.target.value))}
          className="mt-1 w-full border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-ink-500"
        />
      </label>
    )
  }
  if (typeof value === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={value} onChange={(e) => onSet(path, e.target.checked)} />
        {humanize(String(path[path.length - 1] ?? ''))}
      </label>
    )
  }
  if (Array.isArray(value)) {
    return (
      <ArrayEditor value={value} path={path} onSet={onSet} onRemoveItem={onRemoveItem} depth={depth} />
    )
  }
  if (value && typeof value === 'object') {
    return (
      <div className={depth > 0 ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
        {Object.entries(value as JObj).map(([k, v]) => {
          const childPath = [...path, k]
          const isComplex = v !== null && typeof v === 'object'
          return (
            <div key={k} className={isComplex ? 'md:col-span-2' : ''}>
              {isComplex ? (
                <div className="border border-ink-200 bg-ink-50/40 p-4">
                  <div className="text-2xs uppercase tracking-widest text-ink-700 mb-3">
                    {humanize(k)}
                  </div>
                  <ValueEditor
                    value={v}
                    path={childPath}
                    onSet={onSet}
                    onRemoveItem={onRemoveItem}
                    depth={depth + 1}
                  />
                </div>
              ) : (
                <ValueEditor
                  value={v}
                  path={childPath}
                  onSet={onSet}
                  onRemoveItem={onRemoveItem}
                  depth={depth + 1}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }
  return null
}

function ArrayEditor({
  value,
  path,
  onSet,
  onRemoveItem,
  depth,
}: {
  value: J[]
  path: Path
  onSet: (path: Path, v: J) => void
  onRemoveItem: (path: Path) => void
  depth: number
}) {
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const simpleStrings = value.every((v) => typeof v === 'string')

  function addItem() {
    const sample = value[value.length - 1] ?? ''
    onSet([...path, value.length], blankLike(sample))
  }

  if (simpleStrings) {
    return (
      <div className="space-y-2">
        {value.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={v as string}
              onChange={(e) => onSet([...path, i], e.target.value)}
              className="flex-1 border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-ink-500"
            />
            <button
              onClick={() => onRemoveItem([...path, i])}
              className="px-2 text-ink-400 hover:text-red-600"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={addItem}
          className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 mt-1"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {value.map((item, i) => {
        const isOpen = open[i] ?? false
        return (
          <div key={i} className="border border-ink-200 bg-white">
            <div className="flex items-center justify-between px-3 py-2">
              <button
                onClick={() => setOpen((o) => ({ ...o, [i]: !isOpen }))}
                className="flex items-center gap-2 text-sm text-ink-800 hover:text-ink-900 min-w-0"
              >
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 shrink-0 text-ink-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 shrink-0 text-ink-400" />
                )}
                <span className="truncate">{itemTitle(item, i)}</span>
              </button>
              <button
                onClick={() => onRemoveItem([...path, i])}
                className="px-1 text-ink-400 hover:text-red-600 shrink-0"
                title="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {isOpen ? (
              <div className="border-t border-ink-100 p-4">
                <ValueEditor
                  value={item}
                  path={[...path, i]}
                  onSet={onSet}
                  onRemoveItem={onRemoveItem}
                  depth={depth + 1}
                />
              </div>
            ) : null}
          </div>
        )
      })}
      <button
        onClick={addItem}
        className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900"
      >
        <Plus className="w-3 h-3" /> Add item
      </button>
    </div>
  )
}

/* --------------------------------- editor --------------------------------- */
export default function SiteEditor() {
  const { currentTenant, user } = useAuth()
  const [active, setActive] = useState<string>('home')
  const [content, setContent] = useState<JObj | null>(null)
  const [published, setPublished] = useState(true)
  const [rowExists, setRowExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const page = useMemo(() => PAGES.find((p) => p.key === active)!, [active])

  useEffect(() => {
    if (!currentTenant) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      let q = supabase.from(page.table).select('content, published').eq('tenant_id', currentTenant!.id)
      if (page.table === 'site_core_pages') q = q.eq('slug', page.slug!)
      const { data, error: err } = await q.maybeSingle()
      if (cancelled) return
      if (err) {
        setError(err.message)
        setContent(null)
        setRowExists(false)
      } else if (data) {
        setContent((data.content as JObj) ?? {})
        setPublished(Boolean(data.published))
        setRowExists(true)
      } else {
        setContent(null)
        setRowExists(false)
      }
      setDirty(false)
      setSavedAt(null)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [currentTenant, page])

  function switchTab(key: string) {
    if (key === active) return
    if (dirty && !window.confirm('You have unsaved changes. Discard them?')) return
    setActive(key)
  }

  function onSet(path: Path, v: J) {
    setContent((c) => (c == null ? c : (setAtPath(c, path, v) as JObj)))
    setDirty(true)
    setSavedAt(null)
  }

  function onRemoveItem(path: Path) {
    setContent((c) => (c == null ? c : (removeAtPath(c, path) as JObj)))
    setDirty(true)
    setSavedAt(null)
  }

  async function save(nextPublished?: boolean) {
    if (!currentTenant || content == null) return
    setSaving(true)
    setError(null)
    const pub = nextPublished ?? published
    const row: Record<string, unknown> = {
      tenant_id: currentTenant.id,
      content,
      published: pub,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    }
    let result
    if (page.table === 'site_core_pages') {
      row.slug = page.slug
      result = await supabase.from('site_core_pages').upsert(row, { onConflict: 'tenant_id,slug' })
    } else {
      result = await supabase.from('site_home_content').upsert(row, { onConflict: 'tenant_id' })
    }
    setSaving(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setPublished(pub)
    setDirty(false)
    setSavedAt(Date.now())
  }

  if (!currentTenant) {
    return (
      <div className="p-12 flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading tenant…
      </div>
    )
  }

  return (
    <div className="p-12 max-w-5xl">
      {/* header */}
      <div className="border-b border-ink-200 pb-6 mb-8">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2 flex items-center gap-2">
          <Globe className="w-3 h-3" />
          Site Editor
        </div>
        <h1 className="font-display text-4xl text-ink-900 leading-tight">Public website content</h1>
        <p className="text-ink-600 mt-3 max-w-2xl">
          Every word, number, and photo URL on the public site, editable here. Changes go live on
          save — no code, no rebuild.
        </p>
      </div>

      {/* tabs */}
      <div className="flex flex-wrap gap-1 border-b border-ink-200 mb-8">
        {PAGES.map((p) => (
          <button
            key={p.key}
            onClick={() => switchTab(p.key)}
            className={
              'px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ' +
              (p.key === active
                ? 'border-ink-900 text-ink-900 font-medium'
                : 'border-transparent text-ink-500 hover:text-ink-800')
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-4">
          <a
            href={page.previewPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900"
          >
            <ExternalLink className="w-3 h-3" /> View live page
          </a>
          {rowExists ? (
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => save(e.target.checked)}
                disabled={saving}
              />
              Published
            </label>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {savedAt && !dirty ? (
            <span className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          ) : null}
          <button
            onClick={() => save()}
            disabled={!dirty || saving || content == null}
            className={
              'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ' +
              (dirty && !saving
                ? 'bg-ink-900 text-white hover:bg-ink-800'
                : 'bg-ink-100 text-ink-400 cursor-not-allowed')
            }
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3">
          {error}
        </div>
      ) : null}

      {/* body */}
      {loading ? (
        <div className="py-16 flex items-center gap-2 text-ink-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading {page.label.toLowerCase()} content…
        </div>
      ) : content == null ? (
        <div className="py-16 text-ink-600 text-sm max-w-xl">
          No content row exists for <span className="font-medium">{page.label}</span> on this tenant
          yet. Page templates are seeded during tenant onboarding; once a row exists it becomes
          editable here.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(content).map(([k, v]) => (
            <section key={k} className="border border-ink-200 bg-white p-6">
              <div className="text-2xs uppercase tracking-widest text-ink-900 font-medium mb-4">
                {humanize(k)}
              </div>
              <ValueEditor
                value={v}
                path={[k]}
                onSet={onSet}
                onRemoveItem={onRemoveItem}
                depth={1}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
