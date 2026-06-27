// McMullen Properties — public property detail (immersive single-scroll listing).
// Route: "/listings/:slug" (no auth). Reads one row from public.properties.
//
// Mirrors the 175 Huckleberry Drive listing flow, ported native and re-skinned to
// the McMullen brand. Every section is DATA-GATED: it renders only when the row
// has content for it, and disappears cleanly when it doesn't — so today's thinner
// migrated listings look intentional, and future content-rich listings light up
// the richer sections automatically.
//
// Section order (each gated):
//   Hero (cursor-spotlight) → Overview (stat band + intro) → Gallery (masonry +
//   lightbox) → Film (scroll-autoplay, hidden when sold) → Features/Specs →
//   Location (map CTA) → Review CTA (Comp Review, becomes Deal Review when sold)
//   → Documents (gated request, hidden when sold) → Contact → Footer.
//
// Status rules (listing_stage === 'sold'):
//   1. "Comp Review" CTA  -> "Deal Review" (sale price + comps used + market)
//   2. Documents/disclosures section -> removed
//   3. Film / property tour -> removed

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  MapPin, Phone, ArrowUpRight, X, ChevronLeft, ChevronRight, Plus,
  Play, Volume2, VolumeX, FileText, Check, Lock, CalendarClock,
  TrendingUp, Bed, Bath, Square, Calendar, Car, ArrowLeft, Film,
} from 'lucide-react'

/* ============================== brand tokens ============================== */
// From the McMullen brand kit (Supabase brand_assets). Inlined here so this is a
// single-file drop with no Tailwind-config / global-CSS changes.
const NAVY = '#0D1B2A'   // brand navy — hero/section dark background
const INK = '#273C46'    // slate ink — body text on light
const BLUEGRAY = '#91a1ba' // brand blue-gray — eyebrows, rules, accents
const LOGOBLUE = '#4f82b9' // brighter logo blue — primary CTA / headings
const CREAM = '#f5efe4'  // warm light background
const PAPER = '#faf8f3'  // page light background
const SAND = '#e7e1d4'   // hairline borders on light

const BOOKING_URL = 'https://calendar.app.google/Lsb5v4UTcRn3eZh36'
const PHONE = '(415) 691-9272'
const PHONE_RAW = '+14156919272'
const INQUIRY_URL =
  'https://kumfuludrhoqirxvaqja.supabase.co/functions/v1/submit_inquiry?token=sEeAYucGGAUrHO0LIcfQSj1iBGx79tP8'

/* ============================== types ==================================== */
type ImageJson = { url: string; alt: string | null }
type VideoJson = { url?: string; html?: string } | null

type Row = {
  slug: string
  name: string
  pin_code: string | null
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
  video: VideoJson
  map_link: string | null
  meta_description: string | null
  listing_stage: string | null
  status_name: string | null
  neighborhood_name: string | null
  property_type_name: string | null
}

/* ============================== helpers ================================== */
function money(n: number | null): string {
  if (n == null) return 'Price on request'
  return '$' + Math.round(n).toLocaleString()
}
function compactMoney(n: number | null): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M'
  if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'K'
  return '$' + n
}
// Pull a YouTube/Vimeo id from any of the URL/iframe shapes the CMS stored.
function youTubeId(video: VideoJson): string | null {
  if (!video) return null
  const hay = `${video.url ?? ''} ${video.html ?? ''}`
  const m =
    hay.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/) ||
    hay.match(/[?&]v=([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}
function isSold(stage: string | null): boolean {
  return stage === 'sold'
}
function stageLabel(stage: string | null): string | null {
  switch (stage) {
    case 'coming_soon': return 'Coming Soon'
    case 'active': return 'For Sale'
    case 'pending': return 'Pending'
    case 'sold': return 'Sold'
    default: return null
  }
}

/* ============================== scroll reveal ============================ */
function Reveal({
  children, className = '', delay = 0, as = 'div',
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section'
}) {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            window.setTimeout(() => el.classList.add('in'), delay)
            io.unobserve(el)
          }
        })
      },
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [delay])
  const cls = `mp-reveal ${className}`.trim()
  if (as === 'section') return <section ref={ref as React.Ref<HTMLElement>} className={cls}>{children}</section>
  return <div ref={ref as React.Ref<HTMLDivElement>} className={cls}>{children}</div>
}

/* ============================== page ===================================== */
export default function PropertyDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [p, setP] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  // Coming-soon gate: once a visitor submits their email, the full page unlocks
  // for this browser. Soft gate (lead capture), persisted per-slug in localStorage.
  const [unlocked, setUnlocked] = useState(false)
  useEffect(() => {
    if (!slug) return
    try {
      if (localStorage.getItem(`mp_unlocked_${slug}`) === '1') setUnlocked(true)
    } catch { /* localStorage unavailable — gate stays until submit */ }
  }, [slug])

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('properties')
        .select(
          'slug, name, pin_code, price, price_per_sqft, bedrooms, bathrooms, area_sqft, built_year, parking_description, monthly_hoa_fee, description_html, neighborhood_html, amenities_html, features_html, main_image, images, video, map_link, meta_description, listing_stage, statuses(name), neighborhoods(name), property_types(name)'
        )
        .eq('slug', slug)
        .maybeSingle()
      if (cancelled) return
      if (!data) { setNotFound(true); setLoading(false); return }
      const r = data as Record<string, unknown>
      setP({
        slug: r.slug as string,
        name: r.name as string,
        pin_code: (r.pin_code as string) ?? null,
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
        video: (r.video as VideoJson) ?? null,
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
    return () => { cancelled = true }
  }, [slug])

  const openLb = useCallback((i: number) => setLightbox(i), [])
  const closeLb = useCallback(() => setLightbox(null), [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAPER }}>
        <div className="mp-mono text-xs uppercase tracking-[0.3em]" style={{ color: INK }}>Loading…</div>
      </div>
    )
  }
  if (notFound || !p) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center" style={{ background: PAPER }}>
        <div>
          <div className="mp-display text-3xl mb-3" style={{ color: NAVY }}>Listing not found</div>
          <Link to="/listings" style={{ color: LOGOBLUE }}>← Back to the portfolio</Link>
        </div>
      </div>
    )
  }

  const sold = isSold(p.listing_stage)
  const comingSoon = p.listing_stage === 'coming_soon'

  // Hero image + reveal layer (2nd distinct image powers the spotlight reveal).
  const heroImg = p.main_image ?? (p.images && p.images[0]) ?? null
  const allImages = p.images && p.images.length > 0 ? p.images : []
  const gallery = heroImg ? allImages.filter((im) => im.url !== heroImg.url) : allImages
  const revealImg = gallery[0] ?? null // distinct from hero by construction

  const ytId = sold ? null : youTubeId(p.video) // film removed when sold

  // Coming soon + not yet unlocked → show the email-gated teaser instead of the
  // full page. Submitting captures the lead (submit_inquiry) and unlocks.
  if (comingSoon && !unlocked) {
    return (
      <ComingSoonGate
        name={p.name}
        slug={p.slug}
        pin={p.pin_code}
        neighborhood={p.neighborhood_name}
        heroUrl={heroImg?.url ?? null}
        onUnlock={() => {
          try { localStorage.setItem(`mp_unlocked_${p.slug}`, '1') } catch { /* ignore */ }
          setUnlocked(true)
        }}
      />
    )
  }

  return (
    <div id="top" className="mp-listing min-h-screen" style={{ background: PAPER }}>
      <ScopedStyles />
      <Nav hidden={lightbox !== null} sold={sold} />

      <Hero
        name={p.name}
        pin={p.pin_code}
        priceLabel={sold ? `Sold for ${money(p.price)}` : money(p.price)}
        priceEyebrow={sold ? 'Sold price' : 'Offered at'}
        stage={stageLabel(p.listing_stage)}
        neighborhood={p.neighborhood_name}
        heroUrl={heroImg?.url ?? null}
        revealUrl={revealImg?.url ?? null}
      />

      <Overview p={p} sold={sold} />

      {gallery.length > 0 && <Gallery name={p.name} images={gallery} onOpen={openLb} />}

      {ytId && <FilmSection ytId={ytId} posterUrl={heroImg?.url ?? null} />}

      <FeaturesSpecs p={p} />

      {(p.map_link || heroImg) && <Location p={p} aerialUrl={(gallery[1] ?? heroImg)?.url ?? null} />}

      <ReviewCTA sold={sold} address={p.name} />

      {!sold && <Documents address={p.name} />}

      {!sold && <Contact name={p.name} slug={p.slug} />}

      <Footer />

      {lightbox !== null && gallery[lightbox] && (
        <Lightbox images={gallery} index={lightbox} name={p.name} onClose={closeLb} onIndex={setLightbox} />
      )}
    </div>
  )
}

/* ============================== scoped styles ============================ */
function ScopedStyles() {
  return (
    <style>{`
      .mp-listing { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; color: ${INK}; }
      .mp-display { font-family: 'Playfair Display', Georgia, serif; letter-spacing: -0.02em; }
      .mp-mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
      .mp-rte p { margin-bottom: 1rem; line-height: 1.8; color: ${INK}; }
      .mp-rte h2, .mp-rte h3 { font-family: 'Playfair Display', serif; color: ${NAVY}; font-weight: 600; margin: 1.5rem 0 0.75rem; }
      .mp-rte ul { list-style: disc; padding-left: 1.25rem; margin-bottom: 1rem; }
      .mp-rte li { margin-bottom: 0.4rem; line-height: 1.65; }
      .mp-rte a { color: ${LOGOBLUE}; }
      .mp-rte strong { color: ${NAVY}; }

      .mp-reveal { opacity: 0; transform: translateY(22px); transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1); }
      .mp-reveal.in { opacity: 1; transform: none; }

      @keyframes mpFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
      @keyframes mpKen { from { transform: scale(1.06); } to { transform: scale(1); } }
      .mp-anim { opacity: 0; animation-fill-mode: forwards; animation-timing-function: cubic-bezier(0.16,1,0.3,1); animation-name: mpFadeUp; animation-duration: 1s; }
      .mp-ken { animation: mpKen 9s cubic-bezier(0.16,1,0.3,1) forwards; }

      @media (prefers-reduced-motion: reduce) {
        .mp-reveal, .mp-anim, .mp-ken { animation: none !important; opacity: 1 !important; transform: none !important; transition: none !important; }
        .mp-spot-reveal { opacity: 1 !important; }
      }
    `}</style>
  )
}

/* ============================== logo ==================================== */
// Real McMullen monogram mark (from brand_assets), inlined so it inherits the
// nav's text color via currentColor — white over the hero, navy once solid.
function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 350 294.64"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M40.66,134c5.69,12.4,2.26,4.26,4.14-1.75a26.33,26.33,0,0,1,5.53-9.62c5.33-6,12.86-9.54,20.08-12.7C87.54,102.45,105,95.68,122.6,89.32A971.18,971.18,0,0,1,232.31,56.89C231.74,57,228,43.8,227.19,44a966.35,966.35,0,0,0-125.74,38.4Q86.69,88,72.14,94.13c-8.83,3.71-18.43,7.27-25.42,14.07-5.74,5.57-9.51,13.87-7.59,21.93,1.33,5.58,4,11.17,6.44,16.36-1.38-3-3.15-8.64-4.91-12.46Z" />
      <path d="M176.62,104a612.63,612.63,0,0,1-66.28,133.32c-1.68,2.55,5.56,10.9,4,13.31a613.08,613.08,0,0,0,66.28-133.32c1.26-3.59-5.19-9.84-4-13.31Z" />
      <path d="M183.48,209.12a409.74,409.74,0,0,1,30.8-94.83l-11.46-7.85a72.78,72.78,0,0,0-.72,24.41c1,6.44,2.38,14.67,7.36,19.36,7.84,7.39,16.81,11.87,27.59,10.95,27.88-2.36,53.33-18.9,67.5-42.87l-11.46-7.84q-7.74,39.95-13.4,80.25c-.57,4.06-3.63,12.64-1.41,16.43,1.36,2.31,6.4,4.47,8.59,6,2.84,1.91,4.37,3,8,2.85,6.18-.24,11.76-2.91,16.5-6.73-1,.78-10.34-8.74-11.46-7.84-4.75,3.82-15.21,9.73-21.41,5.89L289.74,215c-1.05-3,.07-6.62.49-9.71q.81-6,1.68-12.09,1.83-12.75,3.87-25.47,4-24.78,8.77-49.41c.22-1.14-11.82-7.23-11.46-7.84a88.25,88.25,0,0,1-35.24,33.41A86.84,86.84,0,0,1,234.72,152c-7.54,1.5-16.74,3.11-23.8-.68L222.19,159c-6-4.68-7.59-13.24-8.63-20.35a73,73,0,0,1,.72-24.4c.26-1.37-11.89-6.92-11.46-7.85A409.89,409.89,0,0,0,172,201.27c-.36,1.9,11.8,6.14,11.46,7.85Z" />
    </svg>
  )
}

/* Full McMullen wordmark lockup (MCMULLEN. PROPERTIES). fill=currentColor so it
   adapts to the nav: white over the hero, navy/blue once the nav goes solid. */
function LogoWordmark({ height = 22 }: { height?: number }) {
  return (
    <svg
      viewBox="0 0 350 75"
      height={height}
      fill="currentColor"
      aria-label="McMullen Properties"
      role="img"
      style={{ display: 'block', width: 'auto' }}
    >
      <path d="M33.69,26.92V43.69H31V32.86c0-.43,0-.9.07-1.4L26,41a1.18,1.18,0,0,1-1.1.68h-.44A1.18,1.18,0,0,1,23.3,41l-5.12-9.56.06.76c0,.24,0,.47,0,.68V43.69H15.51V26.92h2.36l.36,0a.76.76,0,0,1,.27,0,.78.78,0,0,1,.22.15,1.69,1.69,0,0,1,.19.28l5,9.31c.13.25.25.51.37.77s.22.53.33.81c.1-.28.22-.56.33-.83s.24-.52.37-.77l5-9.29a1.69,1.69,0,0,1,.2-.28.83.83,0,0,1,.23-.15.76.76,0,0,1,.27,0l.36,0Z" />
      <path d="M51.26,39.74a.59.59,0,0,1,.45.2l1.23,1.33a6.62,6.62,0,0,1-2.51,1.93,9.43,9.43,0,0,1-6.93,0A7.58,7.58,0,0,1,41,41.47a7.79,7.79,0,0,1-1.61-2.72,10.05,10.05,0,0,1-.57-3.44,9.38,9.38,0,0,1,.61-3.46,7.92,7.92,0,0,1,1.69-2.71,7.78,7.78,0,0,1,2.62-1.77,8.67,8.67,0,0,1,3.36-.63,8.26,8.26,0,0,1,3.25.6,7.63,7.63,0,0,1,2.42,1.58l-1,1.45a.91.91,0,0,1-.24.24.68.68,0,0,1-.4.11.89.89,0,0,1-.36-.1c-.12-.07-.26-.15-.4-.25l-.51-.31a3.58,3.58,0,0,0-.68-.32,5.49,5.49,0,0,0-.88-.25,6.72,6.72,0,0,0-1.17-.1,5.29,5.29,0,0,0-2.06.4A4.52,4.52,0,0,0,43.38,31a5.43,5.43,0,0,0-1.05,1.86,8,8,0,0,0-.37,2.5,7.47,7.47,0,0,0,.4,2.51,5.48,5.48,0,0,0,1.09,1.86,4.49,4.49,0,0,0,1.61,1.15,4.91,4.91,0,0,0,2,.4,8.22,8.22,0,0,0,1.16-.07,4.56,4.56,0,0,0,.95-.22,4.71,4.71,0,0,0,.82-.38,5.1,5.1,0,0,0,.77-.59A1,1,0,0,1,51,39.8.58.58,0,0,1,51.26,39.74Z" />
      <path d="M75.59,26.92V43.69H72.84V32.86c0-.43,0-.9.07-1.4L67.84,41a1.17,1.17,0,0,1-1.1.68H66.3A1.18,1.18,0,0,1,65.2,41l-5.13-9.56c0,.26,0,.51.06.76s0,.47,0,.68V43.69H57.41V26.92h2.35l.36,0a.76.76,0,0,1,.27,0,.66.66,0,0,1,.22.15,1.24,1.24,0,0,1,.19.28l5,9.31c.13.25.25.51.36.77s.22.53.33.81c.11-.28.22-.56.34-.83s.24-.52.37-.77l5-9.29a1.26,1.26,0,0,1,.2-.28A.78.78,0,0,1,72.6,27a.87.87,0,0,1,.28,0l.36,0Z" />
      <path d="M88.39,41.18A4,4,0,0,0,90,40.87a3.42,3.42,0,0,0,1.2-.84A4.06,4.06,0,0,0,92,38.71,5.58,5.58,0,0,0,92.22,37v-10h3.12V37a7.73,7.73,0,0,1-.48,2.76,6.15,6.15,0,0,1-3.57,3.63,8.37,8.37,0,0,1-5.81,0,6,6,0,0,1-2.18-1.44,6.19,6.19,0,0,1-1.38-2.19A7.52,7.52,0,0,1,81.43,37v-10h3.12V37a5.49,5.49,0,0,0,.26,1.74A3.86,3.86,0,0,0,85.57,40a3.32,3.32,0,0,0,1.2.85A4,4,0,0,0,88.39,41.18Z" />
      <path d="M111,41.12v2.57h-9.82V26.92h3.12v14.2Z" />
      <path d="M125.37,41.12v2.57h-9.82V26.92h3.12v14.2Z" />
      <path d="M133.05,29.41v4.65h5.86v2.4h-5.86V41.2h7.44v2.49H129.92V26.92h10.57v2.49Z" />
      <path d="M159.71,26.92V43.69h-1.6a1.48,1.48,0,0,1-.63-.12,1.59,1.59,0,0,1-.48-.41L148.25,32c.05.51.07,1,.07,1.41v10.3h-2.75V26.92h1.63l.35,0a.91.91,0,0,1,.25.07,1.07,1.07,0,0,1,.22.15l.23.26L157,38.65l-.06-.8c0-.26,0-.51,0-.73V26.92Z" />
      <path d="M164.89,42.11a1.79,1.79,0,0,1,.13-.68,1.66,1.66,0,0,1,.37-.56,2,2,0,0,1,.55-.37,1.82,1.82,0,0,1,.7-.14,1.74,1.74,0,0,1,.69.14,2.18,2.18,0,0,1,.56.37,1.82,1.82,0,0,1,.37.56,1.63,1.63,0,0,1,.14.68,1.65,1.65,0,0,1-.14.7,1.9,1.9,0,0,1-.37.55,1.92,1.92,0,0,1-.56.36,1.73,1.73,0,0,1-.69.13,1.82,1.82,0,0,1-.7-.13,1.75,1.75,0,0,1-.55-.36,1.72,1.72,0,0,1-.37-.55A1.82,1.82,0,0,1,164.89,42.11Z" />
      <path d="M187.36,27.08a9.29,9.29,0,0,1,2.74.36,5.17,5.17,0,0,1,1.93,1,4.33,4.33,0,0,1,1.15,1.62,5.75,5.75,0,0,1,.37,2.12,5.46,5.46,0,0,1-.4,2.13A4.54,4.54,0,0,1,192,36,5.45,5.45,0,0,1,190,37.09a8.28,8.28,0,0,1-2.66.39h-2.67v6.21h-2.23V27.08Zm0,8.61a5.2,5.2,0,0,0,1.7-.25,3.52,3.52,0,0,0,1.24-.72,2.87,2.87,0,0,0,.76-1.09,3.8,3.8,0,0,0,.25-1.41,3.17,3.17,0,0,0-1-2.48,4.3,4.3,0,0,0-3-.89h-2.67v6.84Z" />
      <path d="M211,43.69h-2a1,1,0,0,1-.91-.47l-4.31-5.94a1.21,1.21,0,0,0-.42-.4,1.62,1.62,0,0,0-.71-.12h-1.7v6.93H198.7V27.08h4.7a10.34,10.34,0,0,1,2.72.31,5.19,5.19,0,0,1,1.9.93,3.65,3.65,0,0,1,1.11,1.45,4.89,4.89,0,0,1,.36,1.91,5,5,0,0,1-.28,1.65,4.51,4.51,0,0,1-.81,1.37,4.76,4.76,0,0,1-1.29,1,6.61,6.61,0,0,1-1.72.65,2.06,2.06,0,0,1,.74.7Zm-7.68-8.57a5.69,5.69,0,0,0,1.73-.24,3.4,3.4,0,0,0,1.25-.67,2.7,2.7,0,0,0,.76-1,3.35,3.35,0,0,0,.25-1.33,2.66,2.66,0,0,0-1-2.24,4.74,4.74,0,0,0-2.92-.75h-2.46v6.27Z" />
      <path d="M230.74,35.39a9.72,9.72,0,0,1-.59,3.43,7.9,7.9,0,0,1-1.67,2.68,7.55,7.55,0,0,1-2.59,1.75,9.33,9.33,0,0,1-6.69,0,7.61,7.61,0,0,1-2.58-1.75A7.75,7.75,0,0,1,215,38.82,10.27,10.27,0,0,1,215,32a7.89,7.89,0,0,1,1.67-2.69,7.47,7.47,0,0,1,2.58-1.75,9.2,9.2,0,0,1,6.69,0,7.42,7.42,0,0,1,2.59,1.75A8,8,0,0,1,230.15,32,9.68,9.68,0,0,1,230.74,35.39Zm-2.31,0a8.69,8.69,0,0,0-.41-2.75,5.87,5.87,0,0,0-1.19-2.06A5.15,5.15,0,0,0,225,29.29a6.35,6.35,0,0,0-2.44-.45,6.28,6.28,0,0,0-2.42.45,5.1,5.1,0,0,0-1.86,1.29,5.72,5.72,0,0,0-1.19,2.06,9.18,9.18,0,0,0,0,5.49,5.68,5.68,0,0,0,1.19,2,5.1,5.1,0,0,0,1.86,1.29,6.28,6.28,0,0,0,2.42.45,6.35,6.35,0,0,0,2.44-.45,5.15,5.15,0,0,0,1.85-1.29,5.83,5.83,0,0,0,1.19-2A8.62,8.62,0,0,0,228.43,35.39Z" />
      <path d="M241.18,27.08a9.33,9.33,0,0,1,2.74.36,5.17,5.17,0,0,1,1.93,1A4.2,4.2,0,0,1,247,30.1a5.76,5.76,0,0,1,.38,2.12,5.46,5.46,0,0,1-.41,2.13A4.42,4.42,0,0,1,245.77,36a5.4,5.4,0,0,1-1.93,1.09,8.32,8.32,0,0,1-2.66.39h-2.67v6.21h-2.24V27.08Zm0,8.61a5.24,5.24,0,0,0,1.7-.25,3.52,3.52,0,0,0,1.24-.72,3,3,0,0,0,.76-1.09,3.8,3.8,0,0,0,.25-1.41,3.2,3.2,0,0,0-1-2.48,4.3,4.3,0,0,0-3-.89h-2.67v6.84Z" />
      <path d="M262.77,41.86v1.83H252.52V27.08h10.24v1.83h-8v5.52h6.47v1.76h-6.47v5.67Z" />
      <path d="M280.51,43.69h-2a1,1,0,0,1-.9-.47l-4.31-5.94a1.23,1.23,0,0,0-.43-.4,1.54,1.54,0,0,0-.7-.12h-1.7v6.93h-2.24V27.08h4.7a10.34,10.34,0,0,1,2.72.31,5.19,5.19,0,0,1,1.9.93,3.71,3.71,0,0,1,1.1,1.45,4.89,4.89,0,0,1,.36,1.91,4.73,4.73,0,0,1-.28,1.65,4.29,4.29,0,0,1-.8,1.37,4.76,4.76,0,0,1-1.29,1,6.61,6.61,0,0,1-1.72.65,2.14,2.14,0,0,1,.74.7Zm-7.68-8.57a5.58,5.58,0,0,0,1.72-.24,3.45,3.45,0,0,0,1.26-.67,2.8,2.8,0,0,0,.76-1,3.35,3.35,0,0,0,.25-1.33,2.66,2.66,0,0,0-1-2.24,4.76,4.76,0,0,0-2.92-.75h-2.46v6.27Z" />
      <path d="M295.77,29h-5.38V43.69h-2.24V29h-5.39V27.08h13Z" />
      <path d="M302.8,43.69h-2.25V27.08h2.25Z" />
      <path d="M319.61,41.86v1.83H309.36V27.08H319.6v1.83h-8v5.52h6.47v1.76h-6.47v5.67Z" />
      <path d="M333.57,29.67a.73.73,0,0,1-.22.26.51.51,0,0,1-.3.09.82.82,0,0,1-.46-.2c-.18-.13-.4-.27-.67-.43a6.2,6.2,0,0,0-1-.44,4.23,4.23,0,0,0-1.37-.19,3.82,3.82,0,0,0-1.32.2,2.77,2.77,0,0,0-1,.55,2.27,2.27,0,0,0-.58.82,2.6,2.6,0,0,0-.2,1,1.94,1.94,0,0,0,.34,1.16,3,3,0,0,0,.91.78,6.75,6.75,0,0,0,1.27.56l1.46.49c.5.17,1,.37,1.47.58a5.16,5.16,0,0,1,1.27.8,3.74,3.74,0,0,1,.91,1.2,4.09,4.09,0,0,1,.34,1.74,5.73,5.73,0,0,1-.37,2A4.7,4.7,0,0,1,333,42.36a5,5,0,0,1-1.75,1.11,6.45,6.45,0,0,1-2.36.41,7.18,7.18,0,0,1-2.94-.59,6.91,6.91,0,0,1-2.26-1.58l.64-1.07a1.15,1.15,0,0,1,.23-.21.53.53,0,0,1,.3-.09.67.67,0,0,1,.34.12c.13.08.27.19.43.31l.56.41a5.28,5.28,0,0,0,.71.4,4.41,4.41,0,0,0,.91.31A5.08,5.08,0,0,0,329,42a4.25,4.25,0,0,0,1.43-.22,3,3,0,0,0,1.06-.62,2.82,2.82,0,0,0,.67-1,3.26,3.26,0,0,0,.23-1.24,2.13,2.13,0,0,0-.34-1.23,2.94,2.94,0,0,0-.9-.81,6.57,6.57,0,0,0-1.28-.55l-1.46-.46c-.49-.16-1-.35-1.46-.55a4.59,4.59,0,0,1-1.28-.82,3.71,3.71,0,0,1-.9-1.24,4.82,4.82,0,0,1,0-3.56,4.53,4.53,0,0,1,1-1.46,5.15,5.15,0,0,1,1.61-1,6,6,0,0,1,2.2-.38,7,7,0,0,1,2.53.44,5.84,5.84,0,0,1,2,1.28Z" />
    </svg>
  )
}

/* ============================== coming-soon gate ======================= */
// Email-gated teaser for listing_stage === 'coming_soon'. Shows the address +
// a blurred hero behind a capture form; submitting posts to submit_inquiry
// (captures the lead + emails Tim) and unlocks the full page for this browser.
function ComingSoonGate({
  name, slug, pin, neighborhood, heroUrl, onUnlock,
}: {
  name: string
  slug: string
  pin: string | null
  neighborhood: string | null
  heroUrl: string | null
  onUnlock: () => void
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [err, setErr] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const valid =
    form.name.trim().length > 1 && /\S+@\S+\.\S+/.test(form.email)

  const submit = async () => {
    if (!valid) { setErr('Please add your name and a valid email.'); setStatus('error'); return }
    setStatus('sending'); setErr('')
    try {
      const res = await fetch(INQUIRY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          message: `Coming Soon early-access request for ${name}.`,
          property_slug: slug,
          page_path: typeof window !== 'undefined' ? `${window.location.pathname}?unlock=coming_soon` : undefined,
          website,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body?.error) throw new Error(body?.error || 'Something went wrong.')
      onUnlock() // reveal the full page
    } catch (e) {
      setStatus('error')
      setErr(e instanceof Error ? e.message : 'Could not reach the server — please try again.')
    }
  }

  const inputStyle = { borderColor: 'rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)' }
  const inputCls = 'text-sm px-4 py-3 rounded-xl border text-white placeholder-white/45 focus:outline-none transition'

  return (
    <div className="mp-listing min-h-screen relative overflow-hidden" style={{ background: NAVY }}>
      <ScopedStyles />
      {/* blurred hero behind */}
      {heroUrl && (
        <div className="absolute inset-0 z-0 bg-center bg-cover" style={{ backgroundImage: `url(${heroUrl})`, filter: 'blur(22px) brightness(0.5)', transform: 'scale(1.1)' }} />
      )}
      <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(to bottom, rgba(13,27,42,0.7), rgba(13,27,42,0.92))' }} />

      {/* top bar with the wordmark */}
      <div className="relative z-10 px-6 sm:px-10 md:px-14 pt-6">
        <Link to="/home" className="inline-flex items-center text-white hover:opacity-80 transition-opacity" aria-label="McMullen Properties — home">
          <LogoWordmark height={22} />
        </Link>
      </div>

      <div className="relative z-10 min-h-[calc(100dvh-80px)] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mp-mono text-[11px] uppercase mb-5" style={{ letterSpacing: '0.34em', color: BLUEGRAY }}>
            Coming Soon{neighborhood ? ` · ${neighborhood}` : ''}
          </div>
          <h1 className="mp-display text-4xl sm:text-5xl font-semibold text-white leading-tight">{name}</h1>
          {pin && <div className="text-white/55 text-sm mt-2">CA {pin}</div>}
          <p className="mt-5 text-white/70 leading-relaxed text-sm sm:text-base">
            This listing is coming to market soon. Enter your details for early access to photos,
            pricing, and full details the moment it goes live.
          </p>

          <div className="mt-8 flex flex-col gap-3 text-left">
            <input value={form.name} onChange={set('name')} placeholder="Full name" autoComplete="name" className={inputCls} style={inputStyle} />
            <input value={form.email} onChange={set('email')} placeholder="Email address" type="email" autoComplete="email" className={inputCls} style={inputStyle} />
            <input value={form.phone} onChange={set('phone')} placeholder="Phone (optional)" type="tel" autoComplete="tel" className={inputCls} style={inputStyle} />
            {/* honeypot */}
            <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1} autoComplete="off" aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }} />
            {status === 'error' && <p className="text-sm text-red-300 text-center">{err}</p>}
            <button onClick={submit} disabled={status === 'sending'}
              className="w-full text-sm font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-50"
              style={{ background: '#fff', color: NAVY }}>
              {status === 'sending' ? 'Unlocking…' : 'Get early access'}
            </button>
            <p className="text-[11px] text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              We'll notify you the moment {name} is live. No spam — unsubscribe anytime.
            </p>
          </div>

          <div className="mt-8">
            <Link to="/listings" className="mp-mono text-[11px] uppercase tracking-widest text-white/50 hover:text-white transition-colors">
              ← View available listings
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================== nav ===================================== */
function Nav({ hidden, sold }: { hidden?: boolean; sold: boolean }) {
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 0.7)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links: [string, string][] = [
    ['Overview', '#overview'],
    ['Gallery', '#gallery'],
    [sold ? 'Deal Review' : 'Compare', '#review'],
    ['Location', '#location'],
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
        hidden ? 'opacity-0 pointer-events-none -translate-y-full' : ''
      }`}
      style={{
        background: solid ? 'rgba(250,248,243,0.9)' : 'transparent',
        backdropFilter: solid ? 'blur(10px)' : undefined,
        borderBottom: solid ? `1px solid ${SAND}` : '1px solid transparent',
        paddingTop: solid ? '0.75rem' : '1.25rem',
        paddingBottom: solid ? '0.75rem' : '1.25rem',
      }}
    >
      <div className="px-5 sm:px-8 md:px-14 flex items-center justify-between">
        <Link to="/" className="flex items-center transition-colors"
          style={{ color: solid ? NAVY : '#fff' }}
          aria-label="McMullen Properties — home">
          <LogoWordmark height={22} />
        </Link>

        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1">
          {links.map(([label, href]) => (
            <a key={href} href={href}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{ color: solid ? INK : 'rgba(255,255,255,0.85)' }}>
              {label}
            </a>
          ))}
        </div>

        <a href="#contact"
          className="text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:scale-[1.03]"
          style={solid ? { background: NAVY, color: '#fff' } : { background: '#fff', color: NAVY }}>
          Inquire
        </a>
      </div>
    </nav>
  )
}

/* ============================== hero ==================================== */
// Cursor-spotlight reveal: base = hero cover, spotlight reveals a 2nd image.
// Falls back to a still hero (no reveal layer) when only one image exists.
const SPOTLIGHT_R = 230

function Hero({
  name, pin, priceLabel, priceEyebrow, stage, neighborhood, heroUrl, revealUrl,
}: {
  name: string
  pin: string | null
  priceLabel: string
  priceEyebrow: string
  stage: string | null
  neighborhood: string | null
  heroUrl: string | null
  revealUrl: string | null
}) {
  const mouse = useRef({ x: -999, y: -999 })
  const smooth = useRef({ x: -999, y: -999 })
  const raf = useRef<number>(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mask, setMask] = useState('')

  // Smoothed pointer + radial mask, only when there's a reveal image.
  useEffect(() => {
    if (!revealUrl) return
    const resize = () => {
      const c = canvasRef.current
      if (!c) return
      c.width = window.innerWidth
      c.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const onMove = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', onMove)
    const loop = () => {
      smooth.current.x += (mouse.current.x - smooth.current.x) * 0.1
      smooth.current.y += (mouse.current.y - smooth.current.y) * 0.1
      const c = canvasRef.current
      if (c) {
        const ctx = c.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, c.width, c.height)
          const g = ctx.createRadialGradient(smooth.current.x, smooth.current.y, 0, smooth.current.x, smooth.current.y, SPOTLIGHT_R)
          g.addColorStop(0, 'rgba(255,255,255,1)')
          g.addColorStop(0.55, 'rgba(255,255,255,0.85)')
          g.addColorStop(0.8, 'rgba(255,255,255,0.35)')
          g.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(smooth.current.x, smooth.current.y, SPOTLIGHT_R, 0, Math.PI * 2)
          ctx.fill()
          setMask(c.toDataURL())
        }
      }
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf.current)
    }
  }, [revealUrl])

  return (
    <section className="relative w-full overflow-hidden" style={{ height: '100dvh', background: NAVY }}>
      {/* base cover */}
      {heroUrl && (
        <div className="absolute inset-0 bg-center bg-cover bg-no-repeat z-10 mp-ken"
          style={{ backgroundImage: `url(${heroUrl})` }} />
      )}
      <div className="absolute inset-0 z-20" style={{ background: 'rgba(13,27,42,0.38)' }} />

      {/* spotlight reveal layer */}
      {revealUrl && (
        <>
          <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ display: 'none' }} />
          <div className="mp-spot-reveal absolute inset-0 bg-center bg-cover bg-no-repeat z-30 pointer-events-none"
            style={{
              backgroundImage: `url(${revealUrl})`,
              maskImage: mask ? `url(${mask})` : undefined,
              WebkitMaskImage: mask ? `url(${mask})` : undefined,
              maskSize: '100% 100%', WebkitMaskSize: '100% 100%',
            }} />
        </>
      )}

      <div className="absolute inset-0 z-40 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(13,27,42,0.4), transparent 35%, rgba(13,27,42,0.78))' }} />

      {/* eyebrow + title */}
      <div className="absolute z-50 top-[22%] left-0 right-0 flex flex-col items-center text-center px-5 pointer-events-none">
        {(stage || neighborhood) && (
          <span className="mp-anim mp-mono text-[11px] sm:text-xs uppercase mb-5"
            style={{ letterSpacing: '0.32em', color: BLUEGRAY, animationDelay: '0.15s' }}>
            {[stage, neighborhood].filter(Boolean).join(' · ')}
          </span>
        )}
        <h1 className="text-white leading-[0.98] mp-display mp-anim text-4xl sm:text-6xl md:text-7xl font-semibold max-w-4xl"
          style={{ animationDelay: '0.3s' }}>
          {name}
        </h1>
        {revealUrl && (
          <p className="mp-anim mt-6 max-w-md text-sm sm:text-base text-white/75 leading-relaxed hidden md:block"
            style={{ animationDelay: '0.6s' }}>
            Move your cursor across the image to explore the home.
          </p>
        )}
      </div>

      {/* bottom bar: address + price + jump */}
      <div className="absolute z-50 bottom-8 sm:bottom-10 left-0 right-0 px-6 sm:px-10 md:px-14">
        <div className="mp-anim flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5" style={{ animationDelay: '0.8s' }}>
          <div className="text-white">
            <div className="mp-display text-2xl sm:text-3xl">{name}</div>
            {pin && <div className="text-white/65 text-sm mt-1">CA {pin}</div>}
          </div>
          <div className="flex items-end gap-6">
            <div className="text-white">
              <div className="mp-mono text-[10px] uppercase tracking-widest text-white/50">{priceEyebrow}</div>
              <div className="mp-display text-2xl sm:text-3xl">{priceLabel}</div>
            </div>
            <a href="#overview"
              className="group hidden sm:inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95"
              style={{ background: '#fff', color: NAVY }}>
              View the home
              <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================== overview ================================ */
function Overview({ p, sold }: { p: Row; sold: boolean }) {
  const stats: { value: string; label: string }[] = []
  if (p.bedrooms != null) stats.push({ value: String(p.bedrooms), label: 'Bedrooms' })
  if (p.bathrooms != null) stats.push({ value: String(p.bathrooms), label: 'Bathrooms' })
  if (p.area_sqft != null) stats.push({ value: Math.round(p.area_sqft).toLocaleString(), label: 'Square Feet' })
  if (p.built_year != null) stats.push({ value: String(p.built_year), label: 'Year Built' })
  if (stats.length < 4 && p.parking_description) stats.push({ value: p.parking_description, label: 'Parking' })

  return (
    <section id="overview" className="relative" style={{ background: PAPER }}>
      {stats.length > 0 && (
        <div style={{ borderBottom: `1px solid ${SAND}` }}>
          <div className="max-w-6xl mx-auto px-6 sm:px-10 grid grid-cols-2 md:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 90}
                className="py-8 sm:py-12 text-center"
                >
                <div className="mp-display text-4xl sm:text-5xl" style={{ color: LOGOBLUE }}>{s.value}</div>
                <div className="mt-2 mp-mono text-[10px] sm:text-xs uppercase tracking-widest" style={{ color: `${INK}80` }}>
                  {s.label}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-20 sm:py-28 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-4">
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-widest" style={{ color: BLUEGRAY }}>
              {sold ? 'The Result' : 'The Residence'}
            </div>
            <div className="mt-4 h-px w-16" style={{ background: NAVY }} />
            <h2 className="mt-6 mp-display text-3xl sm:text-4xl leading-tight" style={{ color: NAVY }}>
              {sold ? (
                <>A sale worth <span className="italic">studying.</span></>
              ) : (
                <>A home worth <span className="italic">a closer look.</span></>
              )}
            </h2>
          </Reveal>
        </div>
        <div className="md:col-span-8">
          <Reveal>
            {p.description_html ? (
              <div className="mp-rte text-base sm:text-lg" dangerouslySetInnerHTML={{ __html: p.description_html }} />
            ) : p.meta_description ? (
              <p className="text-base sm:text-lg leading-relaxed" style={{ color: `${INK}d9` }}>{p.meta_description}</p>
            ) : null}
          </Reveal>
          {(p.neighborhood_name || p.property_type_name) && (
            <Reveal delay={160}>
              <div className="pt-6 flex flex-wrap gap-x-6 gap-y-2 mp-mono text-xs" style={{ color: `${INK}99` }}>
                {p.property_type_name && <span>{p.property_type_name}</span>}
                {p.property_type_name && p.neighborhood_name && <span style={{ color: BLUEGRAY }}>·</span>}
                {p.neighborhood_name && <span>{p.neighborhood_name}</span>}
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  )
}

/* ============================== gallery ================================= */
function Gallery({ name, images, onOpen }: { name: string; images: ImageJson[]; onOpen: (i: number) => void }) {
  return (
    <section id="gallery" className="py-20 sm:py-28" style={{ background: NAVY }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        <Reveal className="flex items-end justify-between mb-12">
          <div>
            <div className="mp-mono text-xs uppercase tracking-widest" style={{ color: BLUEGRAY }}>The Gallery</div>
            <h2 className="mt-4 mp-display text-3xl sm:text-5xl text-white">The full collection</h2>
          </div>
          <div className="hidden sm:block mp-mono text-xs text-white/40 text-right">
            Click any image<br />to expand
          </div>
        </Reveal>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4" style={{ columnFill: 'balance' }}>
          {images.map((img, i) => (
            <Reveal key={img.url} delay={(i % 3) * 70} className="mb-4 break-inside-avoid">
              <button onClick={() => onOpen(i)}
                className="group relative w-full overflow-hidden rounded-lg text-left block"
                style={{ background: INK }}
                aria-label={`Open photo ${i + 1} of ${images.length}`}>
                <img src={img.url} alt={img.alt ?? `${name} — photo ${i + 1}`} loading="lazy"
                  className="w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'linear-gradient(to top, rgba(13,27,42,0.8), transparent 55%)' }} />
                <div className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Plus size={15} className="text-white" />
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Lightbox({
  images, index, name, onClose, onIndex,
}: {
  images: ImageJson[]; index: number; name: string; onClose: () => void; onIndex: (i: number) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndex((index + 1) % images.length)
      if (e.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [index, images.length, onClose, onIndex])

  const img = images[index]
  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: 'rgba(13,27,42,0.97)', backdropFilter: 'blur(4px)' }}
      onClick={onClose} role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 text-white">
        <div>
          <div className="mp-display text-lg">{img.alt || name}</div>
          <div className="mp-mono text-[10px] uppercase tracking-widest text-white/50">{index + 1} / {images.length}</div>
        </div>
        <button onClick={onClose} className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" aria-label="Close">
          <X size={18} className="text-white" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 sm:px-16 pb-6 min-h-0 relative">
        <button onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + images.length) % images.length) }}
          className="absolute left-2 sm:left-5 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10" aria-label="Previous">
          <ChevronLeft size={20} className="text-white" />
        </button>
        <img src={img.url} alt={img.alt ?? name} onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full object-contain rounded-lg" />
        <button onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % images.length) }}
          className="absolute right-2 sm:right-5 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10" aria-label="Next">
          <ChevronRight size={20} className="text-white" />
        </button>
      </div>
    </div>
  )
}

/* ============================== film =================================== */
function FilmSection({ ytId, posterUrl }: { ytId: string; posterUrl: string | null }) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [active, setActive] = useState(false)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setActive(true); io.unobserve(el) } }),
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const toggleMute = () => {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    const cmd = (func: string, args: unknown[] = []) =>
      win.postMessage(JSON.stringify({ event: 'command', func, args }), '*')
    if (muted) { cmd('unMute'); cmd('setVolume', [100]); cmd('playVideo'); setMuted(false) }
    else { cmd('mute'); setMuted(true) }
  }

  const src =
    `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}` +
    `&controls=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`

  return (
    <section id="film" className="py-20 sm:py-28" style={{ background: NAVY }}>
      <div ref={sectionRef} className="max-w-6xl mx-auto px-6 sm:px-10">
        <Reveal className="flex items-end justify-between mb-10">
          <div>
            <div className="mp-mono text-xs uppercase tracking-widest" style={{ color: BLUEGRAY }}>The Film</div>
            <h2 className="mt-4 mp-display text-3xl sm:text-5xl text-white leading-tight">See it in motion</h2>
          </div>
          <div className="hidden sm:flex items-center gap-2 mp-mono text-xs text-white/40">
            <Film size={14} /> Property tour
          </div>
        </Reveal>
        <Reveal>
          <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black aspect-video">
            {active ? (
              <>
                <iframe ref={iframeRef} className="absolute inset-0 h-full w-full" src={src}
                  title="Property film" frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
                <button onClick={toggleMute}
                  className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white transition-colors"
                  style={{ background: 'rgba(13,27,42,0.7)', backdropFilter: 'blur(8px)' }}
                  aria-label={muted ? 'Unmute film' : 'Mute film'}>
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  {muted ? 'Tap for sound' : 'Mute'}
                </button>
              </>
            ) : (
              <div className="absolute inset-0">
                {posterUrl && <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${posterUrl})` }} />}
                <div className="absolute inset-0" style={{ background: 'rgba(13,27,42,0.45)' }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                  <span className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full shadow-2xl" style={{ background: '#fff', color: NAVY }}>
                    <Play size={26} className="ml-1" fill="currentColor" />
                  </span>
                  <span className="hidden sm:block mp-display text-xl sm:text-2xl text-white">Property film</span>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ============================== features + specs ======================= */
// Renders amenities/features RTE when present, plus a spec sheet built from the
// structured fields that exist. Whole section hides if there's nothing to show.
function FeaturesSpecs({ p }: { p: Row }) {
  const specRows: { k: string; v: string }[] = []
  if (p.listing_stage) {
    const lbl = stageLabel(p.listing_stage)
    if (lbl) specRows.push({ k: 'Status', v: lbl })
  }
  if (p.price != null) specRows.push({ k: 'Price', v: money(p.price) })
  if (p.bedrooms != null) specRows.push({ k: 'Bedrooms', v: String(p.bedrooms) })
  if (p.bathrooms != null) specRows.push({ k: 'Bathrooms', v: String(p.bathrooms) })
  if (p.area_sqft != null) specRows.push({ k: 'Living Area', v: `${Math.round(p.area_sqft).toLocaleString()} sq ft` })
  if (p.price_per_sqft != null) specRows.push({ k: 'Price / Sq Ft', v: `$${Number(p.price_per_sqft).toLocaleString()}` })
  if (p.built_year != null) specRows.push({ k: 'Year Built', v: String(p.built_year) })
  if (p.parking_description) specRows.push({ k: 'Parking', v: p.parking_description })
  if (p.monthly_hoa_fee) specRows.push({ k: 'HOA', v: `$${p.monthly_hoa_fee}/mo` })
  if (p.property_type_name) specRows.push({ k: 'Type', v: p.property_type_name })
  if (p.neighborhood_name) specRows.push({ k: 'Neighborhood', v: p.neighborhood_name })

  const hasRte = !!(p.features_html || p.amenities_html)
  if (!hasRte && specRows.length < 3) return null

  return (
    <section id="features" className="py-20 sm:py-28" style={{ background: PAPER }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        <Reveal className="mb-14">
          <div className="mp-mono text-xs uppercase tracking-widest" style={{ color: BLUEGRAY }}>Appointments</div>
          <h2 className="mt-4 mp-display text-3xl sm:text-5xl" style={{ color: NAVY }}>The details</h2>
        </Reveal>

        {(p.features_html || p.amenities_html) && (
          <div className="grid lg:grid-cols-2 gap-10 mb-16">
            {p.features_html && (
              <Reveal>
                <div className="mp-display text-xl mb-4" style={{ color: LOGOBLUE }}>Features</div>
                <div className="h-px w-full mb-4" style={{ background: SAND }} />
                <div className="mp-rte" dangerouslySetInnerHTML={{ __html: p.features_html }} />
              </Reveal>
            )}
            {p.amenities_html && (
              <Reveal delay={90}>
                <div className="mp-display text-xl mb-4" style={{ color: LOGOBLUE }}>Amenities</div>
                <div className="h-px w-full mb-4" style={{ background: SAND }} />
                <div className="mp-rte" dangerouslySetInnerHTML={{ __html: p.amenities_html }} />
              </Reveal>
            )}
          </div>
        )}

        {specRows.length >= 3 && (
          <Reveal>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${SAND}`, background: CREAM }}>
              <div className="px-6 sm:px-8 py-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${SAND}` }}>
                <span className="mp-display text-xl" style={{ color: NAVY }}>Property specifications</span>
              </div>
              <div className="grid sm:grid-cols-2">
                {specRows.map((row, i) => (
                  <div key={row.k}
                    className="flex justify-between gap-4 px-6 sm:px-8 py-3.5"
                    style={{
                      borderBottom: `1px solid ${SAND}`,
                      borderRight: i % 2 === 0 ? `1px solid ${SAND}` : undefined,
                    }}>
                    <span className="mp-mono text-xs uppercase tracking-wide" style={{ color: `${INK}80` }}>{row.k}</span>
                    <span className="text-sm text-right font-medium" style={{ color: NAVY }}>{row.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}

/* ============================== location =============================== */
function Location({ p, aerialUrl }: { p: Row; aerialUrl: string | null }) {
  return (
    <section id="location" className="py-20 sm:py-28" style={{ background: NAVY }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-10 grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <div className="mp-mono text-xs uppercase tracking-widest" style={{ color: BLUEGRAY }}>The Setting</div>
          <h2 className="mt-4 mp-display text-3xl sm:text-5xl text-white leading-tight">
            {p.neighborhood_name ? (
              <>In the heart of <span className="italic">{p.neighborhood_name}.</span></>
            ) : (
              <>Where it <span className="italic">sits.</span></>
            )}
          </h2>
          {p.neighborhood_html ? (
            <div className="mt-6 mp-rte" style={{ color: 'rgba(255,255,255,0.75)' }}
              dangerouslySetInnerHTML={{ __html: p.neighborhood_html }} />
          ) : (
            <p className="mt-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {p.name}{p.pin_code ? `, CA ${p.pin_code}` : ''}.
            </p>
          )}
          {p.map_link && (
            <a href={p.map_link} target="_blank" rel="noreferrer"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full hover:scale-[1.03] transition-transform"
              style={{ background: '#fff', color: NAVY }}>
              Get directions <ArrowUpRight size={15} />
            </a>
          )}
        </Reveal>

        {aerialUrl && (
          <Reveal delay={120} className="relative">
            <div className="rounded-2xl overflow-hidden border border-white/10">
              <img src={aerialUrl} alt={`${p.name} — setting`} className="w-full h-full object-cover" />
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}

/* ============================== review CTA ============================= */
// Comp Review when active; Deal Review when sold (per the status rules).
function ReviewCTA({ sold, address }: { sold: boolean; address: string }) {
  const points = sold
    ? [
        `A walkthrough of the final sale price for ${address} and how it was achieved`,
        'The exact comparable sales we used to position and price the home',
        'A detailed read on the current market — what it means for buying or selling now',
        'Honest, no-pressure guidance from a local McMullen Properties advisor',
      ]
    : [
        'A current comparable-sales set for the building and immediate area',
        'How this home is positioned against active and recently-sold listings',
        'A pricing and value walkthrough tailored to your goals — buying or selling',
        'Honest, no-pressure guidance from a local McMullen Properties advisor',
      ]

  return (
    <section id="review" className="relative overflow-hidden py-20 sm:py-28" style={{ background: NAVY }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(900px circle at 80% 20%, rgba(145,161,186,0.12), transparent 60%)' }} />
      <div className="relative max-w-6xl mx-auto px-6 sm:px-10 grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <div className="inline-flex items-center gap-2 mb-5" style={{ color: BLUEGRAY }}>
            <TrendingUp size={16} />
            <span className="mp-mono text-xs uppercase tracking-widest">Know the market</span>
          </div>
          <h2 className="mp-display text-3xl sm:text-5xl text-white leading-tight">
            {sold ? (
              <>Review the <span className="italic">deal</span></>
            ) : (
              <>See how this home <span className="italic">compares</span></>
            )}
          </h2>
          <p className="mt-5 leading-relaxed max-w-md" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {sold
              ? `Book a Deal Review with McMullen Properties. We'll walk through what ${address} sold for, the comps behind it, and what today's market means for you — on a short video call, no obligation.`
              : `Request a complimentary comp review from McMullen Properties. We'll put this home in context with a current comp set and walk you through it on a short video call — no obligation.`}
          </p>
          <div className="mt-8 space-y-3">
            {points.map((pt) => (
              <div key={pt} className="flex gap-3">
                <Check size={18} className="shrink-0 mt-0.5" style={{ color: BLUEGRAY }} />
                <span className="leading-relaxed text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>{pt}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-2xl border border-white/10 p-8 sm:p-10 text-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(6px)' }}>
            <div className="mx-auto h-14 w-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(145,161,186,0.18)', color: BLUEGRAY }}>
              <CalendarClock size={26} />
            </div>
            <div className="mt-5 mp-display text-2xl text-white">
              {sold ? 'Book a Deal Review' : 'Book a video call'}
            </div>
            <p className="mt-2 text-sm leading-relaxed max-w-xs mx-auto" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Pick a time that works for you. We'll share the comps live and answer your questions.
            </p>
            <a href={BOOKING_URL} target="_blank" rel="noreferrer"
              className="mt-7 inline-flex items-center justify-center gap-2 w-full text-sm font-semibold py-3.5 rounded-xl transition-colors"
              style={{ background: '#fff', color: NAVY }}>
              <CalendarClock size={16} />
              {sold ? 'Schedule my Deal Review' : 'Schedule my review'}
            </a>
            <div className="mt-4 flex items-center justify-center gap-3 text-white/40">
              <span className="h-px w-8 bg-white/15" />
              <span className="mp-mono text-[10px] uppercase tracking-widest">or</span>
              <span className="h-px w-8 bg-white/15" />
            </div>
            <a href={`tel:${PHONE_RAW}`} className="mt-4 inline-flex items-center justify-center gap-2 text-sm text-white/80 hover:text-white transition-colors">
              <Phone size={15} style={{ color: BLUEGRAY }} /> Call {PHONE}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ============================== documents ============================= */
// Gated disclosure request. Hidden entirely when sold. Posts to the existing
// submit_inquiry function (tagged as a disclosure request via message).
function Documents({ address }: { address: string }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [err, setErr] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const valid =
    form.name.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.phone.replace(/\D/g, '').length >= 10

  const submit = async () => {
    if (!valid) return
    setStatus('sending'); setErr('')
    try {
      const res = await fetch(INQUIRY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          message: `Disclosure package request for ${address}.`,
          page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body?.error) throw new Error(body?.error || 'Something went wrong.')
      setStatus('sent')
    } catch (e) {
      setStatus('error')
      setErr(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    }
  }

  const docs = [
    { title: 'Disclosure Package', desc: 'Seller disclosures and reports for this home.' },
    { title: 'Floor Plan', desc: 'Measured plan with room dimensions, where available.' },
    { title: 'Preliminary Title', desc: 'Title report and supporting documents.' },
  ]

  const inputCls =
    'text-sm px-4 py-3 rounded-xl border text-white placeholder-white/40 focus:outline-none transition'
  const inputStyle = { borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)' }

  return (
    <section id="documents" className="py-20 sm:py-28" style={{ background: NAVY }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-10 grid lg:grid-cols-2 gap-12">
        <div>
          <Reveal>
            <div className="mp-mono text-xs uppercase tracking-widest" style={{ color: BLUEGRAY }}>For Buyers</div>
            <h2 className="mt-4 mp-display text-3xl sm:text-5xl text-white leading-tight">Documents &amp; disclosures</h2>
            <p className="mt-5 leading-relaxed max-w-md" style={{ color: 'rgba(255,255,255,0.65)' }}>
              The disclosure package for {address} is available on request and released after a quick review.
            </p>
          </Reveal>
          <div className="mt-8 space-y-3">
            {docs.map((doc, i) => (
              <Reveal key={doc.title} delay={i * 70}>
                <div className="flex items-center gap-4 rounded-xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/40" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <FileText size={20} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block mp-display text-lg text-white">{doc.title}</span>
                    <span className="block text-sm text-white/45 truncate">{doc.desc}</span>
                  </span>
                  <Lock size={16} className="shrink-0 text-white/30" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div>
          <Reveal>
            <div className="rounded-2xl border border-white/10 p-6 sm:p-8" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {status === 'sent' ? (
                <div className="min-h-[340px] flex flex-col items-center justify-center text-center gap-4">
                  <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ background: '#fff', color: NAVY }}>
                    <Check size={26} />
                  </div>
                  <div className="mp-display text-2xl text-white">Request received</div>
                  <p className="text-sm max-w-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Thank you, {form.name.split(' ')[0]}. Tim will review your request and follow up with the package.
                  </p>
                  <a href={`tel:${PHONE_RAW}`} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-full hover:scale-[1.03] transition-transform" style={{ background: '#fff', color: NAVY }}>
                    <Phone size={15} /> {PHONE}
                  </a>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1" style={{ color: BLUEGRAY }}>
                    <Lock size={15} />
                    <span className="mp-mono text-xs uppercase tracking-widest">Request access</span>
                  </div>
                  <div className="mp-display text-2xl text-white mb-5">Get the disclosure package</div>
                  <div className="flex flex-col gap-3">
                    <input value={form.name} onChange={set('name')} placeholder="Full name" autoComplete="name" className={inputCls} style={inputStyle} />
                    <input value={form.email} onChange={set('email')} placeholder="Email address" type="email" autoComplete="email" className={inputCls} style={inputStyle} />
                    <input value={form.phone} onChange={set('phone')} placeholder="Phone number" type="tel" autoComplete="tel" className={inputCls} style={inputStyle} />
                    <button onClick={submit} disabled={!valid || status === 'sending'}
                      className="w-full text-sm font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: '#fff', color: NAVY }}>
                      {status === 'sending' ? 'Sending…' : 'Request disclosures'}
                    </button>
                    {status === 'error' && <p className="text-sm text-red-300 text-center">{err}</p>}
                    <p className="text-[11px] text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Your details are sent to McMullen Properties for review. Documents are released after approval.
                      Information deemed reliable but not guaranteed; buyer to verify.
                    </p>
                  </div>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ============================== contact =============================== */
function Contact({ name, slug }: { name: string; slug: string }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [err, setErr] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) { setErr('Please add your name and email.'); setStatus('error'); return }
    setStatus('sending'); setErr('')
    try {
      const res = await fetch(INQUIRY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          message: form.message.trim() || undefined,
          property_slug: slug,
          page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
          website,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body?.error) throw new Error(body?.error || 'Something went wrong.')
      setStatus('sent')
    } catch (e) {
      setStatus('error')
      setErr(e instanceof Error ? e.message : 'Could not reach the server — please try again.')
    }
  }

  const inputCls = 'text-sm px-4 py-3 rounded-xl border focus:outline-none transition'
  const inputStyle = { borderColor: SAND, background: '#fff', color: NAVY }

  return (
    <section id="contact" className="py-20 sm:py-28" style={{ background: PAPER }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-10 grid lg:grid-cols-2 gap-14">
        <div>
          <div className="mp-mono text-xs uppercase tracking-widest" style={{ color: BLUEGRAY }}>Inquire</div>
          <h2 className="mt-4 mp-display text-3xl sm:text-5xl leading-tight" style={{ color: NAVY }}>Arrange a private showing</h2>
          <p className="mt-6 leading-relaxed max-w-md" style={{ color: `${INK}d9` }}>
            This home is represented by Tim McMullen of McMullen Properties, under Real Broker.
            Reach out to schedule a tour of {name}.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full flex items-center justify-center mp-display text-2xl" style={{ background: NAVY, color: '#fff' }}>M</div>
            <div>
              <div className="mp-display text-xl" style={{ color: LOGOBLUE }}>Tim McMullen</div>
              <div className="text-sm" style={{ color: `${INK}99` }}>McMullen Properties · Real Broker</div>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            <a href={`tel:${PHONE_RAW}`} className="flex items-center gap-3 transition-colors" style={{ color: INK }}>
              <Phone size={16} style={{ color: BLUEGRAY }} /> {PHONE}
            </a>
            <a href="mailto:tim@mcmullen.properties" className="flex items-center gap-3 transition-colors" style={{ color: INK }}>
              <MapPin size={16} style={{ color: BLUEGRAY }} /> tim@mcmullen.properties
            </a>
          </div>
        </div>

        <div className="rounded-2xl p-6 sm:p-8" style={{ background: CREAM, border: `1px solid ${SAND}` }}>
          {status === 'sent' ? (
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center gap-3">
              <div className="h-14 w-14 rounded-full flex items-center justify-center text-2xl" style={{ background: NAVY, color: '#fff' }}>✓</div>
              <div className="mp-display text-2xl" style={{ color: NAVY }}>Message sent</div>
              <p className="text-sm max-w-xs" style={{ color: `${INK}99` }}>
                Thank you. Tim will follow up with you about {name} shortly.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="mp-display text-2xl mb-1" style={{ color: NAVY }}>Request information</div>
              <input value={form.name} onChange={set('name')} placeholder="Your name" className={inputCls} style={inputStyle} />
              <input value={form.email} onChange={set('email')} placeholder="Email address" type="email" className={inputCls} style={inputStyle} />
              <input value={form.phone} onChange={set('phone')} placeholder="Phone (optional)" type="tel" className={inputCls} style={inputStyle} />
              <textarea value={form.message} onChange={set('message')} rows={4}
                placeholder={`I'd like to schedule a showing of ${name}…`}
                className={inputCls + ' resize-none'} style={inputStyle} />
              {/* honeypot */}
              <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1} autoComplete="off" aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }} />
              {status === 'error' && <p className="text-xs text-red-700">{err}</p>}
              <button onClick={submit} disabled={status === 'sending'}
                className="w-full text-sm font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60"
                style={{ background: NAVY, color: '#fff' }}>
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </button>
              <p className="text-[11px] text-center leading-relaxed" style={{ color: `${INK}66` }}>
                Represented by Tim McMullen, McMullen Properties under Real Broker. Information deemed reliable but not guaranteed.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ============================== footer =============================== */
function Footer() {
  return (
    <footer style={{ background: NAVY, borderTop: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-12 grid sm:grid-cols-2 gap-8 items-center">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
            <LogoMark size={24} />
          </span>
          <div>
            <Link to="/home" className="text-white font-semibold text-sm tracking-wide">McMULLEN PROPERTIES</Link>
            <div className="text-xs text-white/50">Campbell, CA · under Real Broker</div>
          </div>
        </div>
        <div className="sm:text-right text-sm">
          <a href={`tel:${PHONE_RAW}`} className="hover:text-white transition-colors">{PHONE}</a>
          <div className="text-xs text-white/40 mt-2 leading-relaxed">
            © {new Date().getFullYear()} McMullen Properties LLC. DRE #02016832. Deemed reliable but not guaranteed.
          </div>
          <Link to="/listings" className="inline-flex items-center gap-1 mt-3 text-xs text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={12} /> Back to portfolio
          </Link>
        </div>
      </div>
    </footer>
  )
}
