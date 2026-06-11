// P10.2 — Listings Admin. Route: /site/listings (agent dashboard).
//
// Admin CRUD for the public portfolio (public.properties — the 52-listing
// table the /listings site reads). Create and edit listings, change status,
// and upload photos straight to the public listing-photos bucket
// (site/{slug}/... paths via the listing_photos_admin_insert policy).
//
// Writes are gated by RLS: properties_admin_insert / properties_agent_update
// (brokerage admin). No delete in v1 — set status to Off Market instead.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  LayoutList,
  Loader2,
  Save,
  Plus,
  ArrowLeft,
  Upload,
  Trash2,
  Star,
  CheckCircle2,
  ExternalLink,
  Search,
} from 'lucide-react'

/* --------------------------------- types --------------------------------- */
type ImageJson = { url: string; alt: string | null }
type Lookup = { id: string; name: string }

type PropertyRow = {
  id: string
  slug: string
  name: string
  price: number | null
  price_per_sqft: number | null
  bedrooms: number | null
  bathrooms: number | null
  area_sqft: number | null
  built_year: number | null
  parking_description: string | null
  monthly_hoa_fee: string | null
  description_html: string | null
  neighborhood_html: string | null
  amenities_html: string | null
  features_html: string | null
  main_image: ImageJson | null
  images: ImageJson[] | null
  video: { url?: string } | null
  map_link: string | null
  meta_title: string | null
  meta_description: string | null
  status_id: string | null
  neighborhood_id: string | null
  property_type_id: string | null
  architecture_style_id: string | null
  updated_at: string | null
}

const BLANK: Omit<PropertyRow, 'id'> = {
  slug: '',
  name: '',
  price: null,
  price_per_sqft: null,
  bedrooms: null,
  bathrooms: null,
  area_sqft: null,
  built_year: null,
  parking_description: null,
  monthly_hoa_fee: null,
  description_html: null,
  neighborhood_html: null,
  amenities_html: null,
  features_html: null,
  main_image: null,
  images: null,
  video: null,
  map_link: null,
  meta_title: null,
  meta_description: null,
  status_id: null,
  neighborhood_id: null,
  property_type_id: null,
  architecture_style_id: null,
  updated_at: null,
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function money(n: number | null): string {
  return n == null ? '—' : '$' + Math.round(n).toLocaleString()
}

/* --------------------------------- atoms --------------------------------- */
function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
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
export default function ListingsAdmin() {
  const [rows, setRows] = useState<PropertyRow[]>([])
  const [statuses, setStatuses] = useState<Lookup[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Lookup[]>([])
  const [propertyTypes, setPropertyTypes] = useState<Lookup[]>([])
  const [archStyles, setArchStyles] = useState<Lookup[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('All')
  const [query, setQuery] = useState('')
  // editing: null = list view; 'new' = create; otherwise the row being edited
  const [editing, setEditing] = useState<PropertyRow | 'new' | null>(null)

  async function loadAll() {
    setLoading(true)
    const [p, s, n, pt, ar] = await Promise.all([
      supabase.from('properties').select('*').order('price', { ascending: false, nullsFirst: false }),
      supabase.from('statuses').select('id, name').order('name'),
      supabase.from('neighborhoods').select('id, name').order('name'),
      supabase.from('property_types').select('id, name').order('name'),
      supabase.from('architecture_styles').select('id, name').order('name'),
    ])
    setRows((p.data as PropertyRow[]) ?? [])
    setStatuses((s.data as Lookup[]) ?? [])
    setNeighborhoods((n.data as Lookup[]) ?? [])
    setPropertyTypes((pt.data as Lookup[]) ?? [])
    setArchStyles((ar.data as Lookup[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  const statusName = useMemo(() => {
    const m = new Map(statuses.map((s) => [s.id, s.name]))
    return (id: string | null) => (id ? m.get(id) ?? '—' : '—')
  }, [statuses])

  const hoodName = useMemo(() => {
    const m = new Map(neighborhoods.map((s) => [s.id, s.name]))
    return (id: string | null) => (id ? m.get(id) ?? '' : '')
  }, [neighborhoods])

  const statusChips = useMemo(() => {
    const present = new Set(rows.map((r) => statusName(r.status_id)))
    return ['All', ...statuses.map((s) => s.name).filter((n) => present.has(n))]
  }, [rows, statuses, statusName])

  const visible = useMemo(() => {
    let v = rows
    if (filter !== 'All') v = v.filter((r) => statusName(r.status_id) === filter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      v = v.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q) ||
          hoodName(r.neighborhood_id).toLowerCase().includes(q)
      )
    }
    return v
  }, [rows, filter, query, statusName, hoodName])

  function afterSave() {
    setEditing(null)
    loadAll()
  }

  if (editing) {
    return (
      <ListingForm
        key={editing === 'new' ? 'new' : editing.id}
        initial={editing === 'new' ? null : editing}
        statuses={statuses}
        neighborhoods={neighborhoods}
        propertyTypes={propertyTypes}
        archStyles={archStyles}
        onBack={() => setEditing(null)}
        onSaved={afterSave}
      />
    )
  }

  return (
    <div className="p-12 max-w-6xl">
      <div className="border-b border-ink-200 pb-6 mb-8">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2 flex items-center gap-2">
          <LayoutList className="w-3 h-3" />
          <Link to="/site" className="hover:text-ink-900">Site Editor</Link>
          <span>·</span>
          <span>Listings</span>
        </div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl text-ink-900 leading-tight">Portfolio listings</h1>
            <p className="text-ink-600 mt-3 max-w-2xl">
              The public <span className="font-medium">/listings</span> portfolio — create listings,
              edit details, change status, upload photos. Live on save.
            </p>
          </div>
          <button
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-ink-900 text-white hover:bg-ink-800"
          >
            <Plus className="w-4 h-4" /> New listing
          </button>
        </div>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-1.5">
          {statusChips.map((s) => (
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
              {s}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search listings…"
            className="border border-ink-200 bg-white pl-9 pr-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-ink-500 w-64"
          />
        </div>
      </div>

      {/* table */}
      {loading ? (
        <div className="py-16 flex items-center gap-2 text-ink-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading listings…
        </div>
      ) : (
        <div className="border border-ink-200 bg-white divide-y divide-ink-100">
          {visible.map((r) => (
            <button
              key={r.id}
              onClick={() => setEditing(r)}
              className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-ink-50/60 transition-colors"
            >
              <div className="w-14 h-11 bg-ink-100 shrink-0 overflow-hidden">
                {r.main_image?.url ? (
                  <img src={r.main_image.url} alt="" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-ink-900 truncate">{r.name}</div>
                <div className="text-2xs uppercase tracking-widest text-ink-500 mt-0.5">
                  {hoodName(r.neighborhood_id) || '—'}
                </div>
              </div>
              <div className="text-sm font-medium text-ink-900 w-28 text-right shrink-0">
                {money(r.price)}
              </div>
              <div className="w-32 text-right shrink-0">
                <span className="text-2xs uppercase tracking-widest text-ink-600 bg-ink-50 border border-ink-200 px-2 py-1">
                  {statusName(r.status_id)}
                </span>
              </div>
            </button>
          ))}
          {visible.length === 0 ? (
            <div className="px-4 py-10 text-sm text-ink-500">No listings match.</div>
          ) : null}
        </div>
      )}
    </div>
  )
}

/* ------------------------------ edit / create ------------------------------ */
function ListingForm({
  initial,
  statuses,
  neighborhoods,
  propertyTypes,
  archStyles,
  onBack,
  onSaved,
}: {
  initial: PropertyRow | null
  statuses: Lookup[]
  neighborhoods: Lookup[]
  propertyTypes: Lookup[]
  archStyles: Lookup[]
  onBack: () => void
  onSaved: () => void
}) {
  const isNew = initial == null
  const [form, setForm] = useState<Omit<PropertyRow, 'id'> & { id?: string }>(
    initial ? { ...initial } : { ...BLANK }
  )
  const [slugTouched, setSlugTouched] = useState(!isNew)
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

  function num(v: string): number | null {
    if (v.trim() === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  /* ------------------------------ photo upload ------------------------------ */
  async function uploadFiles(files: FileList) {
    if (!form.slug) {
      setError('Set a name (and slug) before uploading photos — photos are filed under the slug.')
      return
    }
    setUploading(true)
    setError(null)
    const added: ImageJson[] = []
    for (const file of Array.from(files)) {
      const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')
      const path = `site/${form.slug}/${Date.now()}-${safe}`
      const { error: upErr } = await supabase.storage.from('listing-photos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (upErr) {
        setError(`Upload failed for ${file.name}: ${upErr.message}`)
        continue
      }
      const { data } = supabase.storage.from('listing-photos').getPublicUrl(path)
      if (data?.publicUrl) added.push({ url: data.publicUrl, alt: null })
    }
    if (added.length > 0) {
      setForm((f) => {
        const images = [...(f.images ?? []), ...added]
        return { ...f, images, main_image: f.main_image ?? added[0] }
      })
      setSavedAt(null)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function removeImage(i: number) {
    setForm((f) => {
      const images = (f.images ?? []).slice()
      const [removed] = images.splice(i, 1)
      const main = f.main_image?.url === removed?.url ? images[0] ?? null : f.main_image
      return { ...f, images: images.length ? images : null, main_image: main }
    })
    setSavedAt(null)
  }

  function setAsMain(i: number) {
    setForm((f) => ({ ...f, main_image: (f.images ?? [])[i] ?? f.main_image }))
    setSavedAt(null)
  }

  /* ---------------------------------- save ---------------------------------- */
  async function save() {
    if (!form.name.trim() || !form.slug.trim()) {
      setError('Name and slug are required.')
      return
    }
    setSaving(true)
    setError(null)
    const payload: Record<string, unknown> = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      price: form.price,
      price_per_sqft: form.price_per_sqft,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      area_sqft: form.area_sqft,
      built_year: form.built_year,
      parking_description: form.parking_description,
      monthly_hoa_fee: form.monthly_hoa_fee,
      description_html: form.description_html,
      neighborhood_html: form.neighborhood_html,
      amenities_html: form.amenities_html,
      features_html: form.features_html,
      main_image: form.main_image,
      images: form.images,
      video: form.video?.url ? { url: form.video.url } : null,
      map_link: form.map_link,
      meta_title: form.meta_title,
      meta_description: form.meta_description,
      status_id: form.status_id,
      neighborhood_id: form.neighborhood_id,
      property_type_id: form.property_type_id,
      architecture_style_id: form.architecture_style_id,
      updated_at: new Date().toISOString(),
    }
    const result = isNew
      ? await supabase.from('properties').insert(payload)
      : await supabase.from('properties').update(payload).eq('id', form.id!)
    setSaving(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setSavedAt(Date.now())
    onSaved()
  }

  const selects: { label: string; key: keyof typeof form; options: Lookup[] }[] = [
    { label: 'Status', key: 'status_id', options: statuses },
    { label: 'Neighborhood', key: 'neighborhood_id', options: neighborhoods },
    { label: 'Property type', key: 'property_type_id', options: propertyTypes },
    { label: 'Architecture style', key: 'architecture_style_id', options: archStyles },
  ]

  return (
    <div className="p-12 max-w-5xl">
      <div className="border-b border-ink-200 pb-6 mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 mb-3"
        >
          <ArrowLeft className="w-3 h-3" /> All listings
        </button>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="font-display text-4xl text-ink-900 leading-tight">
            {isNew ? 'New listing' : form.name || 'Edit listing'}
          </h1>
          <div className="flex items-center gap-3">
            {!isNew ? (
              <a
                href={`/listings/${form.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900"
              >
                <ExternalLink className="w-3 h-3" /> View live
              </a>
            ) : null}
            {savedAt ? (
              <span className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            ) : null}
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-ink-900 text-white hover:bg-ink-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : isNew ? 'Create listing' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-6 border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3">
          {error}
        </div>
      ) : null}

      {/* identity */}
      <section className="border border-ink-200 bg-white p-6 mb-6">
        <div className="text-2xs uppercase tracking-widest text-ink-900 font-medium mb-4">Listing</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name / address">
            <input className={INPUT_CLS} value={form.name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Slug (URL: /listings/…)">
            <input
              className={INPUT_CLS}
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true)
                set('slug', slugify(e.target.value))
              }}
            />
          </Field>
          {selects.map((s) => (
            <Field key={s.key as string} label={s.label}>
              <select
                className={INPUT_CLS}
                value={(form[s.key] as string | null) ?? ''}
                onChange={(e) => set(s.key, (e.target.value || null) as never)}
              >
                <option value="">—</option>
                {s.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
          ))}
        </div>
      </section>

      {/* numbers */}
      <section className="border border-ink-200 bg-white p-6 mb-6">
        <div className="text-2xs uppercase tracking-widest text-ink-900 font-medium mb-4">Facts</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Price ($)">
            <input className={INPUT_CLS} inputMode="numeric" value={form.price ?? ''} onChange={(e) => set('price', num(e.target.value))} />
          </Field>
          <Field label="$ / sqft">
            <input className={INPUT_CLS} inputMode="numeric" value={form.price_per_sqft ?? ''} onChange={(e) => set('price_per_sqft', num(e.target.value))} />
          </Field>
          <Field label="Beds">
            <input className={INPUT_CLS} inputMode="decimal" value={form.bedrooms ?? ''} onChange={(e) => set('bedrooms', num(e.target.value))} />
          </Field>
          <Field label="Baths">
            <input className={INPUT_CLS} inputMode="decimal" value={form.bathrooms ?? ''} onChange={(e) => set('bathrooms', num(e.target.value))} />
          </Field>
          <Field label="Area (sqft)">
            <input className={INPUT_CLS} inputMode="numeric" value={form.area_sqft ?? ''} onChange={(e) => set('area_sqft', num(e.target.value))} />
          </Field>
          <Field label="Built year">
            <input className={INPUT_CLS} inputMode="numeric" value={form.built_year ?? ''} onChange={(e) => set('built_year', num(e.target.value))} />
          </Field>
          <Field label="Parking">
            <input className={INPUT_CLS} value={form.parking_description ?? ''} onChange={(e) => set('parking_description', e.target.value || null)} />
          </Field>
          <Field label="Monthly HOA ($)">
            <input className={INPUT_CLS} value={form.monthly_hoa_fee ?? ''} onChange={(e) => set('monthly_hoa_fee', e.target.value || null)} />
          </Field>
        </div>
      </section>

      {/* photos */}
      <section className="border border-ink-200 bg-white p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-2xs uppercase tracking-widest text-ink-900 font-medium">Photos</div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 text-2xs uppercase tracking-widest border border-ink-300 text-ink-700 hover:border-ink-900 hover:text-ink-900 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? 'Uploading…' : 'Upload photos'}
            </button>
          </div>
        </div>
        <p className="text-xs text-ink-500 mb-4">
          First photo becomes the hero unless you star another. Photos upload to the public
          listing-photos bucket under <span className="font-mono">site/{form.slug || '{slug}'}/</span>.
        </p>
        {(form.images ?? []).length === 0 ? (
          <div className="text-sm text-ink-500 py-4">No photos yet.</div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {(form.images ?? []).map((img, i) => {
              const isMain = form.main_image?.url === img.url
              return (
                <div key={img.url + i} className="relative group border border-ink-200">
                  <img src={img.url} alt={img.alt ?? ''} className="w-full h-24 object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex justify-between items-center px-1.5 py-1 bg-white/90">
                    <button
                      onClick={() => setAsMain(i)}
                      title={isMain ? 'Hero photo' : 'Set as hero'}
                      className={isMain ? 'text-amber-500' : 'text-ink-300 hover:text-amber-500'}
                    >
                      <Star className="w-4 h-4" fill={isMain ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => removeImage(i)}
                      title="Remove from listing"
                      className="text-ink-300 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* copy */}
      <section className="border border-ink-200 bg-white p-6 mb-6">
        <div className="text-2xs uppercase tracking-widest text-ink-900 font-medium mb-4">
          Copy (HTML allowed)
        </div>
        <div className="space-y-4">
          {(
            [
              ['Description', 'description_html'],
              ['Amenities', 'amenities_html'],
              ['Features', 'features_html'],
              ['Neighborhood', 'neighborhood_html'],
            ] as const
          ).map(([label, key]) => (
            <Field key={key} label={label}>
              <textarea
                rows={4}
                className={INPUT_CLS + ' leading-relaxed'}
                value={(form[key] as string | null) ?? ''}
                onChange={(e) => set(key, (e.target.value || null) as never)}
              />
            </Field>
          ))}
        </div>
      </section>

      {/* links + seo */}
      <section className="border border-ink-200 bg-white p-6 mb-10">
        <div className="text-2xs uppercase tracking-widest text-ink-900 font-medium mb-4">
          Links &amp; SEO
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Video tour URL">
            <input
              className={INPUT_CLS}
              value={form.video?.url ?? ''}
              onChange={(e) => set('video', e.target.value ? { url: e.target.value } : null)}
            />
          </Field>
          <Field label="Map link">
            <input className={INPUT_CLS} value={form.map_link ?? ''} onChange={(e) => set('map_link', e.target.value || null)} />
          </Field>
          <Field label="Meta title">
            <input className={INPUT_CLS} value={form.meta_title ?? ''} onChange={(e) => set('meta_title', e.target.value || null)} />
          </Field>
          <Field label="Meta description">
            <input className={INPUT_CLS} value={form.meta_description ?? ''} onChange={(e) => set('meta_description', e.target.value || null)} />
          </Field>
        </div>
      </section>
    </div>
  )
}
