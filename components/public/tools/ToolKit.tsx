// Shared toolkit for the public "be your own agent" tools.
// One data layer (paste a Zillow/Redfin link -> fetch_listing_public), one
// signup gate (-> /join), one page chrome. Every tool imports from here so the
// paste box, gating, and look are identical across Compare / Net Sheet / CMA /
// Comps / Review.

import { useState, useCallback, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { EDGE_FUNCTIONS_BASE_URL } from '@/lib/supabase'
import { LogoWordmark } from '@/components/BrandLogo'
import { Loader2, Link2, ArrowRight, Lock, Sparkles } from 'lucide-react'

/* The public site ingest token — tenant-binds the no-account edge functions.
   Same token used across the public pages (PropertyDetail, Welcome, etc.). */
export const SITE_TOKEN = 'sEeAYucGGAUrHO0LIcfQSj1iBGx79tP8'

/* Brand tokens (match the rest of the public site). */
export const NAVY = '#0D1B2A'
export const INK = '#273C46'
export const BLUEGRAY = '#91a1ba'

/* ---------------------------------------------------------------- types ---- */
export type ExtractedListing = {
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  lotSqft: number | null
  yearBuilt: number | null
  propertyType: string | null
  hoaMonthly: number | null
  parkingType: string | null
  parkingSpaces: number | null
  outdoorFeatures: string[]
  photoUrl: string | null
}

/* ------------------------------------------------------ paste data layer ---- */
/* Calls fetch_listing_public with a Zillow/Redfin URL. Returns extracted
   structured data, or a human reason string on fallback. This is THE ingest
   path for every tool until an MLS feed exists. */
export function usePropertyPaste() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchListing = useCallback(async (url: string): Promise<ExtractedListing | null> => {
    const clean = url.trim()
    if (!/^https?:\/\//i.test(clean)) {
      setError('Paste a full link starting with https://')
      return null
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${EDGE_FUNCTIONS_BASE_URL}/fetch_listing_public?token=${SITE_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: clean }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.reason || 'Could not read that listing. Try a Zillow or Redfin link.')
        return null
      }
      return data.extracted as ExtractedListing
    } catch {
      setError('Network error. Please try again.')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { fetchListing, loading, error, setError }
}

/* ---------------------------------------------------- PropertyPasteInput ---- */
/* The shared paste box. onResult fires with extracted data. */
export function PropertyPasteInput({
  onResult,
  placeholder = 'Paste a Zillow or Redfin link…',
  cta = 'Pull details',
  autoFocus = false,
}: {
  onResult: (listing: ExtractedListing) => void
  placeholder?: string
  cta?: string
  autoFocus?: boolean
}) {
  const { fetchListing, loading, error } = usePropertyPaste()
  const [url, setUrl] = useState('')

  async function submit() {
    const listing = await fetchListing(url)
    if (listing) {
      onResult(listing)
      setUrl('')
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Link2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#91a1ba]" />
          <input
            type="url"
            value={url}
            autoFocus={autoFocus}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && submit()}
            placeholder={placeholder}
            className="w-full rounded-full border border-black/[0.12] bg-white pl-10 pr-4 py-3.5 text-sm text-[#0D1B2A] placeholder:text-[#91a1ba] focus:outline-none focus:border-[#0D1B2A]/50"
          />
        </div>
        <button
          onClick={submit}
          disabled={loading || !url.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0D1B2A] text-white px-6 py-3.5 text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {loading ? 'Reading…' : cta}
        </button>
      </div>
      {error ? <p className="text-sm text-red-600 mt-2 px-1">{error}</p> : null}
      <p className="text-[11px] text-[#91a1ba] mt-2 px-1">
        Works with public Zillow &amp; Redfin links. No MLS access required.
      </p>
    </div>
  )
}

/* ----------------------------------------------------------- ToolGate ------ */
/* The signup prompt shown at the value moment. journey tunes the copy. */
export function ToolGate({
  journey = 'buyer',
  title,
  blurb,
  cta = 'Create a free account',
  variant = 'card',
}: {
  journey?: 'buyer' | 'seller' | 'investor'
  title: string
  blurb: string
  cta?: string
  variant?: 'card' | 'banner'
}) {
  const href = `/join?from=tools&journey=${journey}`
  if (variant === 'banner') {
    return (
      <div className="rounded-2xl border border-[#0D1B2A]/15 bg-[#0D1B2A]/[0.03] p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <Sparkles className="w-5 h-5 text-[#0D1B2A] shrink-0" />
        <div className="flex-1">
          <div className="font-semibold text-[#0D1B2A]">{title}</div>
          <div className="text-sm text-[#273C46] mt-0.5">{blurb}</div>
        </div>
        <Link
          to={href}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0D1B2A] text-white px-5 py-2.5 text-sm font-medium whitespace-nowrap"
        >
          {cta} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    )
  }
  return (
    <div className="rounded-[24px] border border-black/[0.08] bg-white p-7">
      <div className="w-9 h-9 rounded-full bg-[#0D1B2A]/[0.06] flex items-center justify-center">
        <Lock className="w-4 h-4 text-[#0D1B2A]" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight mt-4 text-[#0D1B2A]">{title}</h3>
      <p className="text-sm text-[#273C46] mt-2 leading-relaxed">{blurb}</p>
      <Link
        to={href}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#0D1B2A] text-white px-5 py-2.5 text-sm font-medium mt-5"
      >
        {cta} <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}

/* ----------------------------------------------------------- ToolShell ----- */
/* Page chrome shared by every tool page: brand header w/ nav, footer, fonts. */
export function ToolShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: ReactNode
  intro?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mp-home min-h-screen bg-white text-[#0D1B2A]">
      <style>{`
        .mp-home { font-family: 'DM Sans', system-ui, -apple-system, sans-serif; }
        .mp-serif { font-family: 'Playfair Display', Georgia, serif; font-style: italic; letter-spacing: -0.02em; }
        .mp-mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
      `}</style>

      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center text-[#0D1B2A] hover:opacity-80 transition-opacity" aria-label="McMullen Properties — home">
            <LogoWordmark height={20} />
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-[#273C46]">
            <Link to="/listings" className="hover:text-[#0D1B2A] transition-colors">Portfolio</Link>
            <Link to="/tools" className="text-[#0D1B2A]">Tools</Link>
            <Link to="/buy" className="hover:text-[#0D1B2A] transition-colors">Buy</Link>
            <Link to="/sell" className="hover:text-[#0D1B2A] transition-colors">Sell</Link>
            <Link to="/blog" className="hover:text-[#0D1B2A] transition-colors">Writing</Link>
          </nav>
          <Link to="/join" className="text-sm font-medium rounded-full bg-[#0D1B2A] text-white px-4 py-2 hover:opacity-90">
            Sign up
          </Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-12 md:pt-16 pb-8">
        <div className="mp-mono text-xs uppercase tracking-[0.22em] text-[#273C46] mb-3">{eyebrow}</div>
        <h1 className="text-[36px] md:text-[52px] leading-[1.05] font-semibold tracking-tight max-w-3xl">
          {title}
        </h1>
        {intro ? <p className="text-[#273C46] text-lg mt-4 max-w-2xl leading-relaxed">{intro}</p> : null}
      </section>

      <main className="max-w-6xl mx-auto px-6 pb-24">{children}</main>

      <footer className="border-t border-black/[0.07] py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-4 text-sm text-[#273C46]">
          <Link to="/" className="flex items-center text-[#0D1B2A] hover:opacity-80 transition-opacity" aria-label="McMullen Properties — home"><LogoWordmark height={18} /></Link>
          <div className="flex gap-6">
            <Link to="/tools" className="hover:opacity-70">All tools</Link>
            <a href="tel:+14156919272" className="hover:opacity-70">(415) 691-9272</a>
            <a href="mailto:tim@mcmullen.properties" className="hover:opacity-70">tim@mcmullen.properties</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ---------------------------------------------------------- money utils ---- */
export function usd(n: number | null | undefined, dp = 0): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: dp })
}
export function num(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.-]/g, '')) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}
