// P-Mkt.4 — Public Make-Me-Move DETAIL. Route: /m/:tenantSlug/:listingId (no auth).
//
// The buyer-facing detail page for a single off-market / make-me-move listing —
// the click-through target for the grid cards on /m/:tenantSlug AND for the
// marketplace_distribute feed emails. Closes the demand loop: a buyer who gets a
// digest email lands here and can submit an inquiry, which submit_inquiry routes
// into the CRM (contact + inquiry row) and emails the agent.
//
// Anon-readable via the mmm_public_read RLS policy (same columns as the grid).

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowRight, BedDouble, Bath, Ruler, MapPin, ArrowLeft, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import PublicLayout, { TenantPublic, TenantBrandingPublic } from '@/components/public/PublicLayout'

type PublicMMM = {
  id: string
  street_address: string | null
  unit_label: string | null
  city: string | null
  state: string | null
  neighborhood: string | null
  property_type: string | null
  beds: number | null
  baths: number | null
  area_sqft: number | null
  make_me_move_price: number
  timeframe: string | null
  photo_urls: string[] | null
}

const PUBLIC_COLS =
  'id, tenant_id, status, visibility, street_address, unit_label, city, state, neighborhood, property_type, beds, baths, area_sqft, make_me_move_price, timeframe, photo_urls'

// Token-gated public inquiry endpoint (same token/pattern as PropertyDetail).
const INQUIRY_URL =
  'https://kumfuludrhoqirxvaqja.supabase.co/functions/v1/submit_inquiry?token=sEeAYucGGAUrHO0LIcfQSj1iBGx79tP8'

function money(n: number | null): string {
  if (n == null) return 'Price on request'
  return `$${Math.round(n).toLocaleString()}`
}

export default function PublicMakeMeMoveDetail() {
  const { tenantSlug, listingId } = useParams<{ tenantSlug: string; listingId: string }>()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tenant, setTenant] = useState<TenantPublic | null>(null)
  const [branding, setBranding] = useState<TenantBrandingPublic | null>(null)
  const [listing, setListing] = useState<PublicMMM | null>(null)
  const [activePhoto, setActivePhoto] = useState(0)

  useEffect(() => {
    if (!tenantSlug || !listingId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setNotFound(false)

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, slug, name:display_name')
        .eq('slug', tenantSlug)
        .maybeSingle()

      if (cancelled) return
      if (!tenantData) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const tid = (tenantData as { id: string }).id
      setTenant(tenantData as TenantPublic)

      const [brandingRes, listingRes] = await Promise.all([
        supabase.from('tenant_branding').select('*').eq('tenant_id', tid).maybeSingle(),
        supabase
          .from('make_me_move_listings')
          .select(PUBLIC_COLS)
          .eq('id', listingId)
          .eq('tenant_id', tid)
          .eq('status', 'active')
          .in('visibility', ['market', 'database'])
          .maybeSingle(),
      ])

      if (cancelled) return
      setBranding(brandingRes.data as TenantBrandingPublic | null)
      if (!listingRes.data) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setListing(listingRes.data as PublicMMM)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [tenantSlug, listingId])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-2xs uppercase tracking-widest text-ink-500">Loading…</div>
      </div>
    )
  }

  if (notFound || !tenant || !listing) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">404</div>
          <h1 className="font-display text-3xl text-ink-900 mb-3">Listing not found</h1>
          <p className="text-ink-600 mb-6">This home may no longer be available.</p>
          {tenantSlug && (
            <Link
              to={`/m/${tenantSlug}`}
              className="inline-flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-900 hover:text-ink-700 border-b border-ink-300 pb-0.5"
            >
              Browse all off-market homes <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    )
  }

  const accent = branding?.primary_color || '#1a1f2e'
  const photos = Array.isArray(listing.photo_urls) ? listing.photo_urls.filter(Boolean) : []
  const where = [listing.neighborhood, listing.city, listing.state].filter(Boolean).join(', ')
  const headline = listing.street_address
    ? `${listing.street_address}${listing.unit_label ? ` ${listing.unit_label}` : ''}`
    : where || 'Off-market home'

  return (
    <PublicLayout tenant={tenant} branding={branding || undefined}>
      <section className="max-w-5xl mx-auto px-5 sm:px-6 py-8 sm:py-12">
        <Link
          to={`/m/${tenant.slug}`}
          className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> All off-market homes
        </Link>

        {/* Gallery */}
        <div className="border border-ink-200 bg-white">
          <div className="aspect-[16/10] bg-ink-50 overflow-hidden flex items-center justify-center">
            {photos.length > 0 ? (
              <img
                src={photos[activePhoto]}
                alt={headline}
                className="w-full h-full object-cover"
              />
            ) : (
              <MapPin className="w-10 h-10 text-ink-300" strokeWidth={1.25} />
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar">
              {photos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActivePhoto(i)}
                  className={`shrink-0 w-20 h-16 overflow-hidden border-2 transition-colors ${
                    i === activePhoto ? 'border-ink-900' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details + inquiry */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12 mt-8">
          <div>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">
              {listing.timeframe || 'Make-me-move'}
            </div>
            <div className="font-display text-4xl text-ink-900 tabular-nums leading-none">
              {money(listing.make_me_move_price)}
            </div>
            <h1 className="font-display text-2xl text-ink-900 mt-3 leading-snug">{headline}</h1>
            {where && listing.street_address && (
              <div className="text-sm text-ink-600 mt-1">{where}</div>
            )}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 text-sm text-ink-700">
              {listing.property_type && (
                <span className="text-2xs uppercase tracking-widest text-ink-500">
                  {listing.property_type}
                </span>
              )}
              {listing.beds != null && (
                <span className="inline-flex items-center gap-1.5">
                  <BedDouble className="w-4 h-4 text-ink-400" /> {listing.beds} bd
                </span>
              )}
              {listing.baths != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Bath className="w-4 h-4 text-ink-400" /> {listing.baths} ba
                </span>
              )}
              {listing.area_sqft != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-ink-400" /> {listing.area_sqft.toLocaleString()} sqft
                </span>
              )}
            </div>

            <p className="text-sm text-ink-700 leading-relaxed mt-6 max-w-prose">
              This is an off-market opportunity represented by {branding?.agent_name || tenant.name}. The
              owner has named a price they'd move for — reach out to learn more, arrange a viewing, or make
              an offer before it ever lists publicly.
            </p>
          </div>

          {/* Inquiry form */}
          <div className="lg:sticky lg:top-8 self-start">
            <MMMInquiryForm
              listingId={listing.id}
              agentName={branding?.agent_name || tenant.name}
              accent={accent}
            />
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}

/* ------------------------------ inquiry form ------------------------------ */
// Posts to the public submit_inquiry Edge Function with mmm_listing_id so the
// inquiry is tied to this off-market listing. Hidden "website" field is a honeypot.
function MMMInquiryForm({
  listingId,
  agentName,
  accent,
}: {
  listingId: string
  agentName: string
  accent: string
}) {
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
          mmm_listing_id: listingId,
          page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
          website,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not send.')
      setState('sent')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not send your inquiry.')
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <div className="border border-ink-200 bg-white p-6 text-center">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 text-cream"
          style={{ background: accent }}
        >
          <Check className="w-5 h-5" />
        </div>
        <div className="font-display text-xl text-ink-900">Message sent</div>
        <p className="text-sm text-ink-600 mt-2">
          {agentName} will be in touch shortly. Keep an eye on your inbox.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-ink-200 bg-white p-6">
      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">Interested?</div>
      <h2 className="font-display text-xl text-ink-900 mb-4">Ask about this home</h2>

      <div className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full px-3 py-2.5 border border-ink-200 bg-white outline-none focus:border-ink-900 transition-colors text-sm text-ink-900 placeholder:text-ink-300"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-3 py-2.5 border border-ink-200 bg-white outline-none focus:border-ink-900 transition-colors text-sm text-ink-900 placeholder:text-ink-300"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
          className="w-full px-3 py-2.5 border border-ink-200 bg-white outline-none focus:border-ink-900 transition-colors text-sm text-ink-900 placeholder:text-ink-300"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Anything you'd like to know?"
          rows={3}
          className="w-full px-3 py-2.5 border border-ink-200 bg-white outline-none focus:border-ink-900 transition-colors text-sm text-ink-900 placeholder:text-ink-300 resize-none"
        />
        {/* honeypot — visually hidden, off-screen */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="absolute -left-[9999px] w-px h-px opacity-0"
          aria-hidden="true"
        />

        {state === 'error' && errorMsg && (
          <div className="text-xs text-red-600">{errorMsg}</div>
        )}

        <button
          onClick={submit}
          disabled={state === 'sending'}
          className="w-full py-3 text-2xs uppercase tracking-widest text-cream disabled:opacity-60 transition-opacity"
          style={{ background: accent }}
        >
          {state === 'sending' ? 'Sending…' : 'Send inquiry'}
        </button>
        <p className="text-2xs text-ink-400 leading-relaxed">
          By sending, you agree to be contacted by {agentName} about this and similar homes.
        </p>
      </div>
    </div>
  )
}
