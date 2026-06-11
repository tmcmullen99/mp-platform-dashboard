// McMullen Properties — public property detail.
// Route: "/listings/:slug" (no auth). Reads one row from public.properties
// (anon-readable) with its gallery + rich HTML fields. Motionsites aesthetic.

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, MapPin, Bed, Bath, Square, Calendar, Car } from 'lucide-react'

type ImageJson = { url: string; alt: string | null }

type PropertyDetail = {
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
  meta_description: string | null
  status_name: string | null
  neighborhood_name: string | null
  property_type_name: string | null
}

function money(n: number | null): string {
  if (n == null) return 'Price on request'
  return '$' + Math.round(n).toLocaleString()
}

const PRIMARY_SHADOW =
  '0 1px 2px 0 rgba(13,27,42,0.10), 0 4px 4px 0 rgba(13,27,42,0.09), 0 9px 6px 0 rgba(13,27,42,0.05), inset 0 2px 8px 0 rgba(255,255,255,0.30)'

export default function PropertyDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [p, setP] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('properties')
        .select(
          'slug, name, price, price_per_sqft, bedrooms, bathrooms, area_sqft, built_year, parking_description, monthly_hoa_fee, description_html, neighborhood_html, amenities_html, features_html, main_image, images, video, map_link, meta_description, statuses(name), neighborhoods(name), property_types(name)'
        )
        .eq('slug', slug)
        .maybeSingle()
      if (cancelled) return
      if (!data) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const r = data as Record<string, unknown>
      setP({
        slug: r.slug as string,
        name: r.name as string,
        price: (r.price as number) ?? null,
        price_per_sqft: (r.price_per_sqft as number) ?? null,
        bedrooms: (r.bedrooms as number) ?? null,
        bathrooms: (r.bathrooms as number) ?? null,
        area_sqft: (r.area_sqft as number) ?? null,
        built_year: (r.built_year as number) ?? null,
        parking_description: (r.parking_description as string) ?? null,
        monthly_hoa_fee: (r.monthly_hoa_fee as string) ?? null,
        description_html: (r.description_html as string) ?? null,
        neighborhood_html: (r.neighborhood_html as string) ?? null,
        amenities_html: (r.amenities_html as string) ?? null,
        features_html: (r.features_html as string) ?? null,
        main_image: (r.main_image as ImageJson) ?? null,
        images: (r.images as ImageJson[]) ?? null,
        video: (r.video as { url?: string }) ?? null,
        map_link: (r.map_link as string) ?? null,
        meta_description: (r.meta_description as string) ?? null,
        status_name: ((r.statuses as { name?: string } | null)?.name) ?? null,
        neighborhood_name: ((r.neighborhoods as { name?: string } | null)?.name) ?? null,
        property_type_name: ((r.property_types as { name?: string } | null)?.name) ?? null,
      })
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-[#273C46]">Loading…</div>
      </div>
    )
  }

  if (notFound || !p) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6 text-center">
        <div>
          <div className="text-3xl font-semibold text-[#0D1B2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Listing not found
          </div>
          <Link to="/listings" className="text-[#1d4ed8] hover:opacity-70">← Back to the portfolio</Link>
        </div>
      </div>
    )
  }

  // Build gallery: prefer images[], fall back to main_image.
  const gallery: ImageJson[] =
    p.images && p.images.length > 0
      ? p.images
      : p.main_image
      ? [p.main_image]
      : []

  const facts: { icon: typeof Bed; label: string; value: string }[] = []
  if (p.bedrooms != null) facts.push({ icon: Bed, label: 'Beds', value: String(p.bedrooms) })
  if (p.bathrooms != null) facts.push({ icon: Bath, label: 'Baths', value: String(p.bathrooms) })
  if (p.area_sqft != null) facts.push({ icon: Square, label: 'Sq Ft', value: Math.round(p.area_sqft).toLocaleString() })
  if (p.built_year != null) facts.push({ icon: Calendar, label: 'Built', value: String(p.built_year) })
  if (p.parking_description) facts.push({ icon: Car, label: 'Parking', value: p.parking_description })

  return (
    <div className="mp-home min-h-screen bg-white text-[#0D1B2A]">
      <style>{`
        .mp-home { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
        .mp-serif { font-family: 'Playfair Display', Georgia, serif; font-style: italic; letter-spacing: -0.02em; }
        .mp-mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
        .mp-rte p { margin-bottom: 1rem; line-height: 1.75; color: #273C46; }
        .mp-rte h2, .mp-rte h3 { font-family: 'Playfair Display', serif; color: #0D1B2A; font-weight: 600; margin: 1.5rem 0 0.75rem; }
        .mp-rte ul { list-style: disc; padding-left: 1.25rem; margin-bottom: 1rem; color: #273C46; }
        .mp-rte li { margin-bottom: 0.4rem; line-height: 1.6; }
        .mp-rte a { color: #1d4ed8; }
        .mp-rte strong { color: #0D1B2A; }
      `}</style>

      {/* header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="mp-serif text-2xl font-semibold text-[#0D1B2A]">McMullen</Link>
          <Link to="/listings" className="inline-flex items-center gap-2 text-sm text-[#273C46] hover:text-[#0D1B2A]">
            <ArrowLeft className="w-4 h-4" /> Portfolio
          </Link>
          <a href="tel:+14156919272" className="text-sm font-medium text-[#0D1B2A] hover:opacity-70">
            (415) 691-9272
          </a>
        </div>
      </header>

      {/* title */}
      <section className="max-w-6xl mx-auto px-6 pt-12 md:pt-16">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {p.status_name ? (
            <span className="mp-mono text-[11px] uppercase tracking-[0.18em] text-[#273C46]">
              {p.status_name}
            </span>
          ) : null}
          {p.neighborhood_name ? (
            <span className="mp-mono text-[11px] uppercase tracking-[0.18em] text-[#273C46]">
              · {p.neighborhood_name}
            </span>
          ) : null}
          {p.property_type_name ? (
            <span className="mp-mono text-[11px] uppercase tracking-[0.18em] text-[#273C46]">
              · {p.property_type_name}
            </span>
          ) : null}
        </div>
        <h1 className="text-[36px] md:text-[52px] leading-[1.05] font-semibold tracking-tight">
          {p.name}
        </h1>
        <div className="flex items-baseline gap-4 mt-4 flex-wrap">
          <span className="mp-serif text-4xl md:text-5xl font-semibold not-italic text-[#0D1B2A]">
            {money(p.price)}
          </span>
          {p.price_per_sqft ? (
            <span className="text-sm text-[#273C46]">${Number(p.price_per_sqft).toLocaleString()}/sqft</span>
          ) : null}
          {p.monthly_hoa_fee ? (
            <span className="text-sm text-[#273C46]">${p.monthly_hoa_fee}/mo. HOA</span>
          ) : null}
        </div>
      </section>

      {/* gallery */}
      {gallery.length > 0 ? (
        <section className="max-w-6xl mx-auto px-6 mt-8">
          {gallery.length === 1 ? (
            <img
              src={gallery[0].url}
              alt={gallery[0].alt ?? p.name}
              className="w-full h-[340px] md:h-[560px] object-cover rounded-[24px] shadow-xl"
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <img
                src={gallery[0].url}
                alt={gallery[0].alt ?? p.name}
                className="col-span-2 md:col-span-2 row-span-2 w-full h-full object-cover rounded-[20px] shadow-lg aspect-square md:aspect-auto"
              />
              {gallery.slice(1, 5).map((img, i) => (
                <img
                  key={i}
                  src={img.url}
                  alt={img.alt ?? `${p.name} ${i + 2}`}
                  loading="lazy"
                  className="w-full h-full object-cover rounded-[16px] shadow-md aspect-square"
                />
              ))}
            </div>
          )}
          {gallery.length > 5 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {gallery.slice(5).map((img, i) => (
                <img
                  key={i}
                  src={img.url}
                  alt={img.alt ?? `${p.name} ${i + 6}`}
                  loading="lazy"
                  className="w-full h-full object-cover rounded-[16px] shadow-md aspect-square"
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* facts */}
      {facts.length > 0 ? (
        <section className="max-w-6xl mx-auto px-6 mt-10">
          <div className="flex flex-wrap gap-x-12 gap-y-5 border-y border-black/[0.08] py-6">
            {facts.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <f.icon className="w-5 h-5 text-[#273C46]" />
                <div>
                  <div className="text-xl font-semibold leading-none">{f.value}</div>
                  <div className="mp-mono text-[10px] uppercase tracking-[0.15em] text-[#273C46] mt-1">
                    {f.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* body: description + sidebar */}
      <section className="max-w-6xl mx-auto px-6 mt-12 grid md:grid-cols-[1fr_320px] gap-12">
        <div>
          {p.description_html ? (
            <div className="mp-rte" dangerouslySetInnerHTML={{ __html: p.description_html }} />
          ) : p.meta_description ? (
            <p className="text-[#273C46] leading-relaxed text-lg">{p.meta_description}</p>
          ) : null}

          {p.amenities_html ? (
            <div className="mt-10">
              <h2 className="mp-mono text-xs uppercase tracking-[0.2em] text-[#273C46] mb-4">Amenities</h2>
              <div className="mp-rte" dangerouslySetInnerHTML={{ __html: p.amenities_html }} />
            </div>
          ) : null}

          {p.features_html ? (
            <div className="mt-10">
              <h2 className="mp-mono text-xs uppercase tracking-[0.2em] text-[#273C46] mb-4">Features</h2>
              <div className="mp-rte" dangerouslySetInnerHTML={{ __html: p.features_html }} />
            </div>
          ) : null}

          {p.neighborhood_html ? (
            <div className="mt-10">
              <h2 className="mp-mono text-xs uppercase tracking-[0.2em] text-[#273C46] mb-4">
                The neighborhood
              </h2>
              <div className="mp-rte" dangerouslySetInnerHTML={{ __html: p.neighborhood_html }} />
            </div>
          ) : null}

          {p.video?.url ? (
            <div className="mt-10">
              <h2 className="mp-mono text-xs uppercase tracking-[0.2em] text-[#273C46] mb-4">Video tour</h2>
              <a
                href={p.video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1d4ed8] hover:opacity-70"
              >
                Watch the property tour →
              </a>
            </div>
          ) : null}
        </div>

        {/* sidebar contact card */}
        <aside className="md:sticky md:top-24 self-start">
          <div className="rounded-[24px] border border-black/[0.08] p-7 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <div className="mp-serif text-xl font-semibold not-italic text-[#0D1B2A]">
              Interested in this home?
            </div>
            <p className="text-sm text-[#273C46] mt-2 leading-relaxed">
              Send a note and Tim will get back to you shortly — or text and schedule directly below.
            </p>
            <InquiryForm propertyName={p.name} propertySlug={p.slug} />
            <div className="mt-5 pt-5 border-t border-black/[0.07]">
            <a
              href={`sms:+1-415-691-9272?body=${encodeURIComponent(
                `Hi Tim, I'd like to know more about ${p.name}.`
              )}`}
              className="w-full inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium text-white"
              style={{ background: '#0D1B2A', boxShadow: PRIMARY_SHADOW }}
            >
              Text Tim — (415) 691-9272
            </a>
            <a
              href="https://calendar.app.google/Lsb5v4UTcRn3eZh36"
              className="mt-3 w-full inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium text-[#0D1B2A]"
              style={{ background: '#fff', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.06), 0 4px 30px rgba(0,0,0,0.08)' }}
            >
              Schedule a call
            </a>
            {p.map_link ? (
              <a
                href={p.map_link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm text-[#273C46] hover:text-[#0D1B2A]"
              >
                <MapPin className="w-4 h-4" /> View on map
              </a>
            ) : null}
            </div>
          </div>
        </aside>
      </section>

      {/* footer */}
      <footer className="border-t border-black/[0.07] py-12 mt-20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-4 text-sm text-[#273C46]">
          <Link to="/" className="mp-serif text-xl font-semibold text-[#0D1B2A]">McMullen</Link>
          <div className="flex gap-6">
            <Link to="/listings" className="hover:opacity-70">Portfolio</Link>
            <a href="tel:+14156919272" className="hover:opacity-70">(415) 691-9272</a>
            <a href="mailto:tim@mcmullen.properties" className="hover:opacity-70">tim@mcmullen.properties</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------ inquiry form ------------------------------ */
// Posts to the public submit_inquiry Edge Function (token-gated, same auth
// model as the Webflow form ingest). The hidden "website" field is a honeypot.
const INQUIRY_URL =
  'https://kumfuludrhoqirxvaqja.supabase.co/functions/v1/submit_inquiry?token=sEeAYucGGAUrHO0LIcfQSj1iBGx79tP8'

function InquiryForm({ propertyName, propertySlug }: { propertyName: string; propertySlug: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function submit() {
    if (!name.trim() || !email.trim()) {
      setErrorMsg('Please add your name and email.')
      setState('error')
      return
    }
    setState('sending')
    setErrorMsg(null)
    try {
      const res = await fetch(INQUIRY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          message: message.trim() || undefined,
          property_slug: propertySlug,
          page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
          website,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body?.error) {
        setErrorMsg(body?.error || 'Something went wrong — please try again.')
        setState('error')
        return
      }
      setState('sent')
    } catch {
      setErrorMsg('Could not reach the server — please try again.')
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <div className="mt-5 rounded-[16px] bg-[#FAFAF7] border border-black/[0.06] p-5 text-center">
        <div className="mp-serif text-lg font-semibold not-italic text-[#0D1B2A]">Message sent.</div>
        <p className="text-sm text-[#273C46] mt-1.5 leading-relaxed">
          Thanks {name.split(/\s+/)[0]} — Tim will reach out about {propertyName} shortly.
        </p>
      </div>
    )
  }

  const inputCls =
    'w-full rounded-[12px] border border-black/[0.1] bg-white px-3.5 py-2.5 text-sm text-[#0D1B2A] placeholder:text-[#273C46]/50 focus:outline-none focus:border-[#0D1B2A]/40'

  return (
    <div className="mt-5 space-y-2.5">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className={inputCls}
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className={inputCls}
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone (optional)"
        className={inputCls}
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={`I'd like to learn more about ${propertyName}…`}
        rows={3}
        className={inputCls + ' leading-relaxed resize-none'}
      />
      {/* honeypot — humans never see or fill this */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }}
      />
      {state === 'error' && errorMsg ? (
        <p className="text-xs text-red-700">{errorMsg}</p>
      ) : null}
      <button
        onClick={submit}
        disabled={state === 'sending'}
        className="w-full inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
        style={{ background: '#0D1B2A', boxShadow: PRIMARY_SHADOW }}
      >
        {state === 'sending' ? 'Sending…' : 'Send inquiry'}
      </button>
    </div>
  )
}
