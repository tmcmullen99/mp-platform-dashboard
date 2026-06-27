// McMullen Properties — public property detail.
// Route: "/listings/:slug" (no auth). Reads one row from public.properties
// (anon-readable) with its gallery + rich HTML fields. Motionsites aesthetic.
//
// Luxury-listing template (Huckleberry interaction vocabulary, ported native):
//   - Cursor-spotlight hero over main_image, with title/price/stat band overlaid
//   - Hero de-duped from the gallery grid (main_image never repeats as a frame)
//   - Click-to-open lightbox gallery (keyboard arrows + escape)
//   - Mortgage estimator tool (down payment + rate -> monthly P&I)
//   - Scroll-reveal sections (reduced-motion respected)
//   - listing_stage pill (coming_soon / active / pending / sold)

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, MapPin, Bed, Bath, Square, Calendar, Car,
  X, ChevronLeft, ChevronRight,
} from 'lucide-react'

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
  listing_stage: string | null
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

// listing_stage -> human label + tone. Drives the hero pill.
function stageMeta(stage: string | null): { label: string; fg: string; bg: string } | null {
  switch (stage) {
    case 'coming_soon': return { label: 'Coming Soon', fg: '#1d4ed8', bg: 'rgba(29,78,216,0.12)' }
    case 'active':      return { label: 'For Sale',     fg: '#1f7a4d', bg: 'rgba(31,122,77,0.12)' }
    case 'pending':     return { label: 'Pending',      fg: '#b45309', bg: 'rgba(180,83,9,0.12)' }
    case 'sold':        return { label: 'Sold',         fg: '#0D1B2A', bg: 'rgba(255,255,255,0.16)' }
    default:            return null
  }
}

export default function PropertyDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [p, setP] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Lightbox state: index into the full gallery, or null when closed.
  const [lightbox, setLightbox] = useState<number | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('properties')
        .select(
          'slug, name, price, price_per_sqft, bedrooms, bathrooms, area_sqft, built_year, parking_description, monthly_hoa_fee, description_html, neighborhood_html, amenities_html, features_html, main_image, images, video, map_link, meta_description, listing_stage, statuses(name), neighborhoods(name), property_types(name)'
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
        listing_stage: (r.listing_stage as string) ?? null,
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

  // The hero is main_image when present, else the first gallery frame.
  const heroImg: ImageJson | null =
    p.main_image ?? (p.images && p.images.length > 0 ? p.images[0] : null)

  // Full gallery, de-duped against the hero so the cover never shows twice.
  // (Fixes listings like 1694-clay-drive where 000.jpg is both main + images[0].)
  const allImages: ImageJson[] = p.images && p.images.length > 0 ? p.images : []
  const gallery: ImageJson[] = heroImg
    ? allImages.filter((im) => im.url !== heroImg.url)
    : allImages

  const facts: { icon: typeof Bed; label: string; value: string }[] = []
  if (p.bedrooms != null) facts.push({ icon: Bed, label: 'Beds', value: String(p.bedrooms) })
  if (p.bathrooms != null) facts.push({ icon: Bath, label: 'Baths', value: String(p.bathrooms) })
  if (p.area_sqft != null) facts.push({ icon: Square, label: 'Sq Ft', value: Math.round(p.area_sqft).toLocaleString() })
  if (p.built_year != null) facts.push({ icon: Calendar, label: 'Built', value: String(p.built_year) })
  if (p.parking_description) facts.push({ icon: Car, label: 'Parking', value: p.parking_description })

  const stage = stageMeta(p.listing_stage)

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
        /* scroll-reveal — hidden by default, .is-in when observed; disabled under reduced-motion */
        .mp-reveal { opacity: 0; transform: translateY(18px); transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1); }
        .mp-reveal.is-in { opacity: 1; transform: none; }
        @media (prefers-reduced-motion: reduce) {
          .mp-reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
        }
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

      {/* hero — cursor-spotlight cover with title/price/stat band overlaid */}
      <Hero
        image={heroImg}
        name={p.name}
        price={money(p.price)}
        pricePerSqft={p.price_per_sqft}
        hoa={p.monthly_hoa_fee}
        stage={stage}
        neighborhood={p.neighborhood_name}
        propertyType={p.property_type_name}
        facts={facts}
      />

      {/* gallery (de-duped from hero) */}
      {gallery.length > 0 ? (
        <Reveal as="section" className="max-w-6xl mx-auto px-6 mt-12">
          <div className="flex items-end justify-between mb-4">
            <h2 className="mp-mono text-xs uppercase tracking-[0.2em] text-[#273C46]">Gallery</h2>
            <span className="mp-mono text-[11px] text-[#273C46]/70">{gallery.length} photos</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {gallery.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightbox(i)}
                className="group relative block w-full overflow-hidden rounded-[16px] shadow-md aspect-[4/3] focus:outline-none focus:ring-2 focus:ring-[#0D1B2A]/40"
                aria-label={`Open photo ${i + 1} of ${gallery.length}`}
              >
                <img
                  src={img.url}
                  alt={img.alt ?? `${p.name} — photo ${i + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </button>
            ))}
          </div>
        </Reveal>
      ) : null}

      {/* body: description + sidebar */}
      <section className="max-w-6xl mx-auto px-6 mt-14 grid md:grid-cols-[1fr_320px] gap-12">
        <div>
          {p.description_html ? (
            <Reveal className="mp-rte" dangerouslySetInnerHTML={{ __html: p.description_html }} />
          ) : p.meta_description ? (
            <Reveal as="p" className="text-[#273C46] leading-relaxed text-lg">{p.meta_description}</Reveal>
          ) : null}

          {p.amenities_html ? (
            <Reveal className="mt-10">
              <h2 className="mp-mono text-xs uppercase tracking-[0.2em] text-[#273C46] mb-4">Amenities</h2>
              <div className="mp-rte" dangerouslySetInnerHTML={{ __html: p.amenities_html }} />
            </Reveal>
          ) : null}

          {p.features_html ? (
            <Reveal className="mt-10">
              <h2 className="mp-mono text-xs uppercase tracking-[0.2em] text-[#273C46] mb-4">Features</h2>
              <div className="mp-rte" dangerouslySetInnerHTML={{ __html: p.features_html }} />
            </Reveal>
          ) : null}

          {p.neighborhood_html ? (
            <Reveal className="mt-10">
              <h2 className="mp-mono text-xs uppercase tracking-[0.2em] text-[#273C46] mb-4">
                The neighborhood
              </h2>
              <div className="mp-rte" dangerouslySetInnerHTML={{ __html: p.neighborhood_html }} />
            </Reveal>
          ) : null}

          {/* mortgage estimator — the one interactive tool */}
          {p.price != null ? (
            <Reveal className="mt-10">
              <h2 className="mp-mono text-xs uppercase tracking-[0.2em] text-[#273C46] mb-4">
                Estimate the monthly payment
              </h2>
              <MortgageEstimator price={p.price} hoa={p.monthly_hoa_fee} />
            </Reveal>
          ) : null}

          {p.video?.url ? (
            <Reveal className="mt-10">
              <h2 className="mp-mono text-xs uppercase tracking-[0.2em] text-[#273C46] mb-4">Video tour</h2>
              <a
                href={p.video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1d4ed8] hover:opacity-70"
              >
                Watch the property tour →
              </a>
            </Reveal>
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

      {/* lightbox overlay */}
      {lightbox != null && gallery[lightbox] ? (
        <Lightbox
          images={gallery}
          index={lightbox}
          name={p.name}
          onClose={() => setLightbox(null)}
          onIndex={setLightbox}
        />
      ) : null}
    </div>
  )
}

/* --------------------------------- hero ---------------------------------- */
// Full-bleed cover with a cursor-following radial spotlight (the signature
// interaction). Title, price, stage pill, and a compact stat band sit on a
// bottom scrim. Falls back to a plain navy panel when no image exists.

function Hero({
  image, name, price, pricePerSqft, hoa, stage, neighborhood, propertyType, facts,
}: {
  image: ImageJson | null
  name: string
  price: string
  pricePerSqft: number | null
  hoa: string | null
  stage: { label: string; fg: string; bg: string } | null
  neighborhood: string | null
  propertyType: string | null
  facts: { icon: typeof Bed; label: string; value: string }[]
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    el.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }

  const meta = [neighborhood, propertyType].filter(Boolean) as string[]

  return (
    <section className="max-w-6xl mx-auto px-6 pt-8">
      <div
        ref={ref}
        onMouseMove={onMove}
        className="group/hero relative overflow-hidden rounded-[24px] shadow-xl"
        style={{
          background: image ? '#0D1B2A' : 'linear-gradient(160deg,#0D1B2A,#1a2942)',
        }}
      >
        {/* cover image */}
        {image ? (
          <img
            src={image.url}
            alt={image.alt ?? name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null}

        {/* cursor spotlight — a soft lift that tracks the pointer */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-300 group-hover/hero:opacity-100 motion-reduce:hidden"
          style={{
            background:
              'radial-gradient(420px circle at var(--mx,50%) var(--my,40%), rgba(255,255,255,0.16), transparent 70%)',
          }}
        />
        {/* bottom scrim for legibility */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-2/3"
          style={{ background: 'linear-gradient(to top, rgba(7,15,26,0.86) 6%, rgba(7,15,26,0.34) 48%, transparent)' }}
        />

        {/* content */}
        <div className="relative z-[3] flex flex-col justify-end min-h-[420px] md:min-h-[600px] p-7 md:p-12">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {stage ? (
              <span
                className="mp-mono text-[11px] uppercase tracking-[0.16em] px-3 py-1 rounded-full"
                style={{ color: stage.fg === '#0D1B2A' ? '#fff' : stage.fg, background: stage.bg, backdropFilter: 'blur(4px)' }}
              >
                {stage.label}
              </span>
            ) : null}
            {meta.map((m) => (
              <span key={m} className="mp-mono text-[11px] uppercase tracking-[0.16em] text-white/80">
                {m}
              </span>
            ))}
          </div>

          <h1 className="text-white text-[34px] md:text-[56px] leading-[1.04] font-semibold tracking-tight max-w-3xl">
            {name}
          </h1>

          <div className="flex items-baseline gap-4 mt-4 flex-wrap">
            <span className="mp-serif text-3xl md:text-5xl font-semibold not-italic text-white">
              {price}
            </span>
            {pricePerSqft ? (
              <span className="text-sm text-white/75">${Number(pricePerSqft).toLocaleString()}/sqft</span>
            ) : null}
            {hoa ? <span className="text-sm text-white/75">${hoa}/mo. HOA</span> : null}
          </div>

          {/* stat band */}
          {facts.length > 0 ? (
            <div className="flex flex-wrap gap-x-9 gap-y-4 mt-7 pt-6 border-t border-white/15">
              {facts.map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <f.icon className="w-5 h-5 text-white/70" />
                  <div>
                    <div className="text-xl font-semibold leading-none text-white">{f.value}</div>
                    <div className="mp-mono text-[10px] uppercase tracking-[0.15em] text-white/60 mt-1">
                      {f.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------- lightbox -------------------------------- */
// Full-screen gallery viewer. Arrow keys page, Escape closes. Click backdrop
// to dismiss; the image itself stops propagation.

function Lightbox({
  images, index, name, onClose, onIndex,
}: {
  images: ImageJson[]
  index: number
  name: string
  onClose: () => void
  onIndex: (i: number) => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length)
      else if (e.key === 'ArrowRight') onIndex((index + 1) % images.length)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [index, images.length, onClose, onIndex])

  const img = images[index]
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} photo ${index + 1} of ${images.length}`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 z-[2] inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + images.length) % images.length) }}
        className="absolute left-3 md:left-6 z-[2] inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
        aria-label="Previous photo"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <figure className="max-w-[92vw] max-h-[88vh]" onClick={(e) => e.stopPropagation()}>
        <img
          src={img.url}
          alt={img.alt ?? `${name} — photo ${index + 1}`}
          className="max-w-[92vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />
        <figcaption className="mt-3 text-center mp-mono text-[11px] uppercase tracking-[0.2em] text-white/60">
          {index + 1} / {images.length}
        </figcaption>
      </figure>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % images.length) }}
        className="absolute right-3 md:right-6 z-[2] inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
        aria-label="Next photo"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  )
}

/* --------------------------- mortgage estimator -------------------------- */
// Pure client-side P&I estimate. Down payment % and rate are adjustable;
// payment recomputes live. This is an estimate, not a quote — labeled as such.

function MortgageEstimator({ price, hoa }: { price: number; hoa: string | null }) {
  const [downPct, setDownPct] = useState(20)
  const [rate, setRate] = useState(6.5)
  const years = 30

  const { monthly, loan, down } = useMemo(() => {
    const down = Math.round(price * (downPct / 100))
    const loan = Math.max(price - down, 0)
    const r = rate / 100 / 12
    const n = years * 12
    const pi = r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n))
    const hoaNum = hoa ? Number(String(hoa).replace(/[^0-9.]/g, '')) : 0
    const monthly = Math.round(pi + (Number.isFinite(hoaNum) ? hoaNum : 0))
    return { monthly, loan, down }
  }, [price, downPct, rate, years, hoa])

  const inputWrap = 'flex items-center justify-between gap-4'
  const labelCls = 'text-sm text-[#273C46]'
  return (
    <div className="rounded-[20px] border border-black/[0.08] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div className="mp-serif text-3xl md:text-4xl font-semibold not-italic text-[#0D1B2A]">
          ${monthly.toLocaleString()}<span className="text-base font-normal text-[#273C46]">/mo</span>
        </div>
        <div className="mp-mono text-[10px] uppercase tracking-[0.16em] text-[#273C46]/70">
          Est. principal &amp; interest{hoa ? ' + HOA' : ''}
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <div className={inputWrap}>
            <span className={labelCls}>Down payment</span>
            <span className="text-sm font-medium text-[#0D1B2A]">
              {downPct}% · ${down.toLocaleString()}
            </span>
          </div>
          <input
            type="range" min={5} max={50} step={1} value={downPct}
            onChange={(e) => setDownPct(Number(e.target.value))}
            className="w-full mt-2 accent-[#0D1B2A]"
            aria-label="Down payment percent"
          />
        </div>

        <div>
          <div className={inputWrap}>
            <span className={labelCls}>Interest rate</span>
            <span className="text-sm font-medium text-[#0D1B2A]">{rate.toFixed(2)}%</span>
          </div>
          <input
            type="range" min={3} max={9} step={0.05} value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full mt-2 accent-[#0D1B2A]"
            aria-label="Interest rate percent"
          />
        </div>

        <div className="flex items-center justify-between pt-1 text-sm">
          <span className={labelCls}>Loan amount</span>
          <span className="font-medium text-[#0D1B2A]">${loan.toLocaleString()}</span>
        </div>
      </div>

      <p className="mt-5 text-[11px] leading-relaxed text-[#273C46]/70">
        Estimate only, for a {years}-year fixed loan. Excludes taxes, insurance, and PMI. Not a loan offer or
        commitment to lend — confirm figures with your lender.
      </p>
    </div>
  )
}

/* -------------------------------- reveal --------------------------------- */
// Scroll-reveal wrapper. Adds .is-in when the element scrolls into view.
// Honors reduced-motion via the CSS rule above (which forces .mp-reveal visible).

function Reveal(
  props: {
    children?: React.ReactNode
    className?: string
    as?: 'div' | 'section' | 'p'
    dangerouslySetInnerHTML?: { __html: string }
  }
) {
  const { children, className = '', as = 'div', dangerouslySetInnerHTML } = props
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            obs.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const cls = `mp-reveal ${className}`.trim()

  if (dangerouslySetInnerHTML) {
    return <div ref={ref as React.Ref<HTMLDivElement>} className={cls} dangerouslySetInnerHTML={dangerouslySetInnerHTML} />
  }
  if (as === 'section') return <section ref={ref as React.Ref<HTMLElement>} className={cls}>{children}</section>
  if (as === 'p') return <p ref={ref as React.Ref<HTMLParagraphElement>} className={cls}>{children}</p>
  return <div ref={ref as React.Ref<HTMLDivElement>} className={cls}>{children}</div>
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
