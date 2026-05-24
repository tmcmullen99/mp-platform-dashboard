import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Check, Mail, ArrowRight, Quote } from 'lucide-react'
import { supabase, EDGE_FUNCTIONS_BASE_URL } from '@/lib/supabase'
import type { SiteNode, SiteContext } from './types'

// ===========================================================================
// Prop schema descriptors (drive the validator AND the editor's prop forms)
// ===========================================================================

export type PropType =
  | 'string'
  | 'longtext'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'string[]'
  | 'image'
  | 'url'

export type PropSpec = {
  key: string
  label: string
  type: PropType
  required?: boolean
  options?: string[] // for enum / multi
  help?: string
}

export type PrimitiveDef = {
  type: string
  label: string
  category: 'content' | 'data' | 'layout'
  description: string
  props: PropSpec[]
  defaults: Record<string, unknown>
  Component: React.FC<{ node: SiteNode; ctx: SiteContext }>
}

// ---------- coercion helpers (props arrive as unknown) ----------
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d)
const num = (v: unknown, d = 0): number =>
  typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) || d : d
const arr = (v: unknown): string[] => (Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as string[]) : [])

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// ===========================================================================
// hero
// ===========================================================================

const Hero: PrimitiveDef['Component'] = ({ node, ctx }) => {
  const p = node.props
  const title = str(p.title) || ctx.branding?.hero_title || ''
  const subtitle = str(p.subtitle) || ctx.branding?.hero_subtitle || ''
  const image = str(p.image) || ctx.branding?.hero_image_url || ''
  const ctaLabel = str(p.ctaLabel)
  const ctaHref = str(p.ctaHref)
  return (
    <section
      className="relative px-6 py-24 sm:py-32 text-center"
      style={{
        backgroundImage: image ? `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url(${image})` : undefined,
        backgroundColor: image ? undefined : 'var(--site-primary)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#fff',
      }}
    >
      <div className="max-w-3xl mx-auto">
        {title && <h1 className="text-4xl sm:text-6xl leading-tight" style={{ fontFamily: 'var(--site-heading-font)' }}>{title}</h1>}
        {subtitle && <p className="mt-5 text-lg sm:text-xl opacity-90">{subtitle}</p>}
        {ctaLabel && ctaHref && (
          <Link
            to={ctaHref}
            className="inline-flex items-center gap-2 mt-8 px-6 py-3 text-sm font-medium"
            style={{ background: '#fff', color: 'var(--site-primary)' }}
          >
            {ctaLabel} <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </section>
  )
}

// ===========================================================================
// rich_text
// ===========================================================================

const RichText: PrimitiveDef['Component'] = ({ node }) => {
  const html = str(node.props.html)
  return (
    <section className="px-6 py-12">
      <div
        className="max-w-3xl mx-auto site-prose"
        style={{ lineHeight: 1.7 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  )
}

// ===========================================================================
// image
// ===========================================================================

const ImageBlock: PrimitiveDef['Component'] = ({ node }) => {
  const src = str(node.props.src)
  const alt = str(node.props.alt)
  const caption = str(node.props.caption)
  if (!src) return null
  return (
    <figure className="px-6 py-8 max-w-4xl mx-auto">
      <img src={src} alt={alt} className="w-full h-auto" loading="lazy" />
      {caption && <figcaption className="text-center text-sm text-gray-500 mt-3">{caption}</figcaption>}
    </figure>
  )
}

// ===========================================================================
// listing_grid  (deals + coming_soon_listings, public statuses)
// ===========================================================================

const PUBLIC_STATUSES = ['soft_launch', 'active', 'pending']

type ListingCard = {
  slug: string | null
  name: string | null
  subtitle: string | null
  neighborhood: string | null
  bedrooms: number | null
  bathrooms: number | null
  area_sqft: number | null
  price_estimate: string | null
  hero_image_url: string | null
}

const ListingGrid: PrimitiveDef['Component'] = ({ node }) => {
  const status = str(node.props.status, 'active')
  const limit = num(node.props.limit, 6)
  const heading = str(node.props.heading)
  const [cards, setCards] = useState<ListingCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const statuses = status === 'all' ? PUBLIC_STATUSES : [status]
    async function load() {
      const { data: deals } = await supabase
        .from('deals')
        .select('id, listing_status, coming_soon_listing_id, created_at')
        .eq('deal_type', 'sell')
        .in('listing_status', statuses)
        .not('coming_soon_listing_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit)
      const ids = ((deals as { coming_soon_listing_id: string }[]) || [])
        .map((d) => d.coming_soon_listing_id)
        .filter(Boolean)
      if (ids.length === 0) {
        if (!cancelled) {
          setCards([])
          setLoading(false)
        }
        return
      }
      const { data: csl } = await supabase
        .from('coming_soon_listings')
        .select('id, slug, name, subtitle, neighborhood, bedrooms, bathrooms, area_sqft, price_estimate, hero_image_url')
        .in('id', ids)
      if (cancelled) return
      // preserve deal ordering
      const byId = new Map<string, ListingCard>()
      ;((csl as (ListingCard & { id: string })[]) || []).forEach((c) => byId.set(c.id, c))
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as ListingCard[]
      setCards(ordered)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [status, limit])

  return (
    <section className="px-6 py-16 max-w-6xl mx-auto">
      {heading && <h2 className="text-3xl mb-8" style={{ fontFamily: 'var(--site-heading-font)' }}>{heading}</h2>}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading listings…
        </div>
      ) : cards.length === 0 ? (
        <div className="text-gray-400 py-8">No listings to show right now.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((c, i) => (
            <Link
              key={c.slug || i}
              to={c.slug ? `/listings/${c.slug}` : '#'}
              className="block border border-gray-200 bg-white hover:shadow-lg transition-shadow"
            >
              <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                {c.hero_image_url && (
                  <img src={c.hero_image_url} alt={c.name || ''} className="w-full h-full object-cover" loading="lazy" />
                )}
              </div>
              <div className="p-5">
                <div className="text-lg" style={{ fontFamily: 'var(--site-heading-font)' }}>{c.name}</div>
                {(c.subtitle || c.neighborhood) && (
                  <div className="text-sm text-gray-500 mt-1">{c.subtitle || c.neighborhood}</div>
                )}
                {c.price_estimate && (
                  <div className="mt-3 font-medium" style={{ color: 'var(--site-primary)' }}>{c.price_estimate}</div>
                )}
                <div className="text-xs text-gray-400 mt-2">
                  {[c.bedrooms && `${c.bedrooms} bd`, c.bathrooms && `${c.bathrooms} ba`, c.area_sqft && `${c.area_sqft} sqft`]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

// ===========================================================================
// content_feed  (blog_posts, optional tag)
// ===========================================================================

type PostCard = {
  slug: string | null
  name: string | null
  card_description: string | null
  image: unknown
  publish_date: string | null
}

function imageUrl(image: unknown): string | null {
  if (image && typeof image === 'object' && 'url' in (image as Record<string, unknown>)) {
    const u = (image as Record<string, unknown>).url
    return typeof u === 'string' ? u : null
  }
  return typeof image === 'string' ? image : null
}

const ContentFeed: PrimitiveDef['Component'] = ({ node }) => {
  const tag = str(node.props.tag)
  const limit = num(node.props.limit, 3)
  const heading = str(node.props.heading)
  const [posts, setPosts] = useState<PostCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      let q = supabase
        .from('blog_posts')
        .select('slug, name, card_description, image, publish_date')
        .eq('is_published', true)
        .eq('is_archived', false)
        .order('publish_date', { ascending: false, nullsFirst: false })
        .limit(limit)
      if (tag) q = q.contains('tags_array', [tag])
      const { data } = await q
      if (cancelled) return
      setPosts((data as PostCard[]) || [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [tag, limit])

  return (
    <section className="px-6 py-16 max-w-6xl mx-auto">
      {heading && <h2 className="text-3xl mb-8" style={{ fontFamily: 'var(--site-heading-font)' }}>{heading}</h2>}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : posts.length === 0 ? (
        <div className="text-gray-400 py-8">No content yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post, i) => {
            const img = imageUrl(post.image)
            return (
              <article key={post.slug || i} className="border border-gray-200 bg-white">
                {img && (
                  <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
                    <img src={img} alt={post.name || ''} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="p-5">
                  <div className="text-lg leading-snug" style={{ fontFamily: 'var(--site-heading-font)' }}>{post.name}</div>
                  {post.card_description && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{post.card_description}</p>}
                  {post.publish_date && (
                    <div className="text-xs text-gray-400 mt-3">
                      {new Date(post.publish_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ===========================================================================
// lead_form  (POSTs to ingest_contact?token=…)
// ===========================================================================

const LeadForm: PrimitiveDef['Component'] = ({ node, ctx }) => {
  const heading = str(node.props.heading, 'Get in touch')
  const fields = arr(node.props.fields)
  const token = str(node.props.token)
  const successMessage = str(node.props.successMessage, "Thanks — we'll be in touch shortly.")
  const active = fields.length ? fields : ['name', 'email', 'phone', 'message']

  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!token) {
    return (
      <section className="px-6 py-12 max-w-xl mx-auto">
        <div className="border border-dashed border-gray-300 p-6 text-sm text-gray-500 text-center">
          {ctx.preview
            ? 'Lead form — connect it to your CRM by setting an ingest token in the editor.'
            : null}
        </div>
      </section>
    )
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${EDGE_FUNCTIONS_BASE_URL}/ingest_contact?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        body: JSON.stringify(values),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.error) throw new Error(data?.error || 'Could not submit')
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="px-6 py-16 max-w-xl mx-auto">
      <h2 className="text-3xl mb-6 text-center" style={{ fontFamily: 'var(--site-heading-font)' }}>{heading}</h2>
      {done ? (
        <div className="flex items-center justify-center gap-2 text-green-700 py-6">
          <Check className="w-5 h-5" /> {successMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {active.includes('name') && (
            <input
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900"
              placeholder="Name"
              value={values.name || ''}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            />
          )}
          {active.includes('email') && (
            <input
              type="email"
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900"
              placeholder="Email"
              value={values.email || ''}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
          )}
          {active.includes('phone') && (
            <input
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900"
              placeholder="Phone"
              value={values.phone || ''}
              onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
            />
          )}
          {active.includes('message') && (
            <textarea
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900"
              placeholder="Message"
              rows={4}
              value={values.message || ''}
              onChange={(e) => setValues((v) => ({ ...v, message: e.target.value }))}
            />
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-white text-sm font-medium disabled:opacity-50"
            style={{ background: 'var(--site-primary)' }}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Send
          </button>
        </div>
      )}
    </section>
  )
}

// ===========================================================================
// testimonial_wall
// ===========================================================================

type TestimonialRow = { name: string; review: string | null; buyer_or_seller: string | null }

const TestimonialWall: PrimitiveDef['Component'] = ({ node }) => {
  const heading = str(node.props.heading, 'What clients say')
  const limit = num(node.props.limit, 6)
  const [rows, setRows] = useState<TestimonialRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('testimonials')
      .select('name, review, buyer_or_seller')
      .order('display_order', { ascending: true, nullsFirst: false })
      .limit(limit)
      .then(({ data }) => {
        if (cancelled) return
        setRows((data as TestimonialRow[]) || [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [limit])

  if (!loading && rows.length === 0) return null

  return (
    <section className="px-6 py-16 max-w-6xl mx-auto">
      <h2 className="text-3xl mb-8 text-center" style={{ fontFamily: 'var(--site-heading-font)' }}>{heading}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rows.map((r, i) => (
          <blockquote key={i} className="border border-gray-200 bg-white p-6">
            <Quote className="w-5 h-5 text-gray-300 mb-3" />
            {r.review && <p className="text-gray-700 leading-relaxed">{r.review}</p>}
            <footer className="mt-4 text-sm">
              <span className="font-medium text-gray-900">{r.name}</span>
              {r.buyer_or_seller && <span className="text-gray-400"> · {r.buyer_or_seller}</span>}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  )
}

// ===========================================================================
// agent_bio  (tenant_branding)
// ===========================================================================

const AgentBio: PrimitiveDef['Component'] = ({ ctx }) => {
  const b = ctx.branding
  if (!b) return null
  return (
    <section className="px-6 py-16 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center gap-8">
        {b.agent_photo_url && (
          <img src={b.agent_photo_url} alt={b.agent_name || ''} className="w-40 h-40 object-cover rounded-full shrink-0" />
        )}
        <div>
          {b.agent_name && <h2 className="text-3xl" style={{ fontFamily: 'var(--site-heading-font)' }}>{b.agent_name}</h2>}
          {b.agent_title && <div className="text-sm uppercase tracking-widest text-gray-400 mt-1">{b.agent_title}</div>}
          {b.agent_bio && <p className="text-gray-600 leading-relaxed mt-4">{b.agent_bio}</p>}
          {(b.agent_email || b.agent_phone) && (
            <div className="text-sm text-gray-500 mt-4">{[b.agent_email, b.agent_phone].filter(Boolean).join(' · ')}</div>
          )}
        </div>
      </div>
    </section>
  )
}

// ===========================================================================
// tool_button  (gated by tenant_tool_settings client_enabled)
// ===========================================================================

const ToolButton: PrimitiveDef['Component'] = ({ node, ctx }) => {
  const tool = str(node.props.tool)
  const label = str(node.props.label, 'Open tool')
  const href = str(node.props.href, '/portal')
  const enabled = ctx.enabledTools.has(tool)

  if (!enabled && !ctx.preview) return null

  return (
    <section className="px-6 py-10 text-center">
      <Link
        to={href}
        className="inline-flex items-center gap-2 px-6 py-3 text-white text-sm font-medium"
        style={{ background: 'var(--site-primary)', opacity: enabled ? 1 : 0.5 }}
      >
        {label} <ArrowRight className="w-4 h-4" />
      </Link>
      {!enabled && ctx.preview && (
        <div className="text-xs text-gray-400 mt-2">"{tool}" is off for clients — toggle it on in Site Editor.</div>
      )}
    </section>
  )
}

// ===========================================================================
// Registry
// ===========================================================================

export const PRIMITIVES: Record<string, PrimitiveDef> = {
  hero: {
    type: 'hero',
    label: 'Hero banner',
    category: 'content',
    description: 'Full-width banner with title, subtitle, image, and a CTA.',
    props: [
      { key: 'title', label: 'Title', type: 'string' },
      { key: 'subtitle', label: 'Subtitle', type: 'string' },
      { key: 'image', label: 'Background image', type: 'image' },
      { key: 'ctaLabel', label: 'Button label', type: 'string' },
      { key: 'ctaHref', label: 'Button link', type: 'url' },
    ],
    defaults: { title: '', subtitle: '' },
    Component: Hero,
  },
  rich_text: {
    type: 'rich_text',
    label: 'Text block',
    category: 'content',
    description: 'Free-form rich text.',
    props: [{ key: 'html', label: 'Content', type: 'longtext' }],
    defaults: { html: '<p>Write something…</p>' },
    Component: RichText,
  },
  image: {
    type: 'image',
    label: 'Image',
    category: 'content',
    description: 'A single image with optional caption.',
    props: [
      { key: 'src', label: 'Image', type: 'image', required: true },
      { key: 'alt', label: 'Alt text', type: 'string' },
      { key: 'caption', label: 'Caption', type: 'string' },
    ],
    defaults: { src: '', alt: '' },
    Component: ImageBlock,
  },
  listing_grid: {
    type: 'listing_grid',
    label: 'Listings grid',
    category: 'data',
    description: 'Your live listings, filtered by status.',
    props: [
      { key: 'heading', label: 'Heading', type: 'string' },
      { key: 'status', label: 'Status', type: 'enum', options: ['all', 'active', 'soft_launch', 'pending'] },
      { key: 'limit', label: 'Max listings', type: 'number' },
    ],
    defaults: { heading: 'Featured listings', status: 'active', limit: 6 },
    Component: ListingGrid,
  },
  content_feed: {
    type: 'content_feed',
    label: 'Content feed',
    category: 'data',
    description: 'Your blog posts, optionally filtered by tag.',
    props: [
      { key: 'heading', label: 'Heading', type: 'string' },
      { key: 'tag', label: 'Filter by tag', type: 'string' },
      { key: 'limit', label: 'Max posts', type: 'number' },
    ],
    defaults: { heading: 'From the blog', limit: 3 },
    Component: ContentFeed,
  },
  lead_form: {
    type: 'lead_form',
    label: 'Lead form',
    category: 'data',
    description: 'Capture form that writes straight into your CRM.',
    props: [
      { key: 'heading', label: 'Heading', type: 'string' },
      { key: 'fields', label: 'Fields', type: 'string[]', options: ['name', 'email', 'phone', 'message'] },
      { key: 'token', label: 'CRM ingest token', type: 'string', help: 'Injected from your tenant; do not edit by hand.' },
      { key: 'successMessage', label: 'Success message', type: 'string' },
    ],
    defaults: { heading: 'Get in touch', fields: ['name', 'email', 'phone', 'message'] },
    Component: LeadForm,
  },
  testimonial_wall: {
    type: 'testimonial_wall',
    label: 'Testimonials',
    category: 'data',
    description: 'Your client reviews.',
    props: [
      { key: 'heading', label: 'Heading', type: 'string' },
      { key: 'limit', label: 'Max reviews', type: 'number' },
    ],
    defaults: { heading: 'What clients say', limit: 6 },
    Component: TestimonialWall,
  },
  agent_bio: {
    type: 'agent_bio',
    label: 'Agent bio',
    category: 'data',
    description: 'Your photo, name, title, and bio (from Settings).',
    props: [{ key: 'variant', label: 'Variant', type: 'enum', options: ['card', 'banner'] }],
    defaults: { variant: 'card' },
    Component: AgentBio,
  },
  tool_button: {
    type: 'tool_button',
    label: 'Tool button',
    category: 'data',
    description: 'Launch a tool (shown only if enabled for clients).',
    props: [
      { key: 'tool', label: 'Tool', type: 'enum', options: ['cma', 'net_sheet', 'pool_permit'], required: true },
      { key: 'label', label: 'Button label', type: 'string' },
      { key: 'href', label: 'Link', type: 'url' },
    ],
    defaults: { tool: 'cma', label: 'Request a CMA', href: '/portal' },
    Component: ToolButton,
  },
}

export function getPrimitive(type: string): PrimitiveDef | null {
  return PRIMITIVES[type] || null
}
