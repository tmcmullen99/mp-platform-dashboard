// Shared public-site header + footer. Single source of truth so every public
// page has the same nav and the logo always points at the public homepage
// (/home — which renders McMullenHome regardless of auth, so it doesn't bounce
// a logged-in agent into the dashboard the way "/" does).

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { LogoWordmark } from '@/components/BrandLogo'

export type PublicNavKey = 'portfolio' | 'tools' | 'buy' | 'sell' | 'services' | 'about' | 'insight'

const LINKS: { key: PublicNavKey; to: string; label: string }[] = [
  { key: 'portfolio', to: '/listings', label: 'Portfolio' },
  { key: 'tools', to: '/tools', label: 'Tools' },
  { key: 'services', to: '/services', label: 'Services' },
  { key: 'about', to: '/meet-tim', label: 'Meet Tim' },
  { key: 'insight', to: '/blog', label: 'Market' },
]

export function PublicNav({
  active,
  cta = 'phone',
}: {
  active?: PublicNavKey
  /** Right-side action: the phone number (marketing pages) or a Sign-up button (tools). */
  cta?: 'phone' | 'signup'
}) {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-black/[0.06]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          to="/home"
          className="flex items-center text-[#0D1B2A] hover:opacity-80 transition-opacity"
          aria-label="McMullen Properties — home"
        >
          <LogoWordmark height={20} />
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-[#273C46]">
          {LINKS.map((l) => (
            <Link
              key={l.key}
              to={l.to}
              className={active === l.key ? 'text-[#0D1B2A]' : 'hover:text-[#0D1B2A] transition-colors'}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a href="tel:+14156919272" className="hidden lg:inline text-sm font-medium text-[#0D1B2A] hover:opacity-70">
            (415) 691-9272
          </a>
          <Link
            to="/login"
            className="hidden md:inline text-sm font-medium text-[#273C46] hover:text-[#0D1B2A]"
          >
            Log in
          </Link>
          <Link
            to="/join"
            className="hidden md:inline text-sm font-medium rounded-full bg-[#0D1B2A] text-white px-4 py-2 hover:opacity-90"
          >
            Create account
          </Link>
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center w-10 h-10 -mr-2 text-[#0D1B2A]"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-black/[0.06] bg-white">
          <nav className="max-w-6xl mx-auto px-6 py-3 flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.key}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`py-3 text-base border-b border-black/[0.04] ${active === l.key ? 'text-[#0D1B2A] font-medium' : 'text-[#273C46]'}`}
              >
                {l.label}
              </Link>
            ))}
            <a href="tel:+14156919272" onClick={() => setOpen(false)} className="py-3 text-base text-[#0D1B2A] font-medium">
              (415) 691-9272
            </a>
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="py-3 text-base text-[#0D1B2A] font-medium border-b border-black/[0.04]"
            >
              Log in
            </Link>
            <Link
              to="/join"
              onClick={() => setOpen(false)}
              className="mt-3 py-3 text-base text-center rounded-full bg-[#0D1B2A] text-white font-medium"
            >
              Create account
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}

// Footer column definitions. Kept as data so the sitemap page can reuse the
// exact same link taxonomy (single source of truth for the site's public map).
export const FOOTER_COLUMNS: { heading: string; links: { to: string; label: string; external?: boolean }[] }[] = [
  {
    heading: 'Explore',
    links: [
      { to: '/listings', label: 'Portfolio' },
      { to: '/luxury-listings', label: 'Luxury Listings' },
      { to: '/blog', label: 'Market' },
      { to: '/meet-tim', label: 'Meet Tim' },
    ],
  },
  {
    heading: 'Services',
    links: [
      { to: '/services/luxury-listing', label: 'Luxury Listing' },
      { to: '/services/1031-exchange', label: '1031 Exchange' },
      { to: '/services/commercial', label: 'Commercial' },
      { to: '/services/disclosure-review', label: 'Disclosure Review' },
      { to: '/services/home-improvement', label: 'Home Improvement' },
      { to: '/services/flips', label: 'Flips & Off-Market' },
      { to: '/services/sell-with-tenants', label: 'Sell Tenant-Occupied' },
    ],
  },
  {
    heading: 'Tools',
    links: [
      { to: '/tools/net-sheet', label: 'Net Sheet' },
      { to: '/tools/cma', label: 'Home Value / CMA' },
      { to: '/tools/comps', label: 'Comps Request' },
      { to: '/tools/review', label: 'Review Request' },
      { to: '/tools/off-market', label: 'Off-Market Waitlist' },
      { to: '/cma-review', label: 'CMA Showcase' },
    ],
  },
]

export function PublicFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-black/[0.07] bg-white">
      <div className="max-w-6xl mx-auto px-6 py-14 md:py-16">
        <div className="grid gap-10 md:gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* brand + contact */}
          <div>
            <Link
              to="/home"
              className="flex items-center text-[#0D1B2A] hover:opacity-80 transition-opacity"
              aria-label="McMullen Properties — home"
            >
              <LogoWordmark height={20} />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-[#273C46] max-w-xs">
              Bay Area real estate, marketed like a campaign. Buying, selling, and investing across
              the Peninsula, Silicon Valley, and San Francisco.
            </p>
            <div className="mt-5 flex flex-col gap-1.5 text-sm">
              <a href="tel:+14156919272" className="text-[#0D1B2A] font-semibold hover:opacity-70">(415) 691-9272</a>
              <a href="mailto:tim@mcmullen.properties" className="text-[#273C46] hover:opacity-70">tim@mcmullen.properties</a>
              <span className="text-[#273C46]">Campbell, California</span>
            </div>
          </div>

          {/* link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0D1B2A] mb-4">
                {col.heading}
              </div>
              <ul className="flex flex-col gap-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-[#273C46] hover:text-[#0D1B2A] transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* legal / license bar */}
        <div className="mt-12 pt-8 border-t border-black/[0.07] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-[#273C46]">
          <div className="leading-relaxed">
            © {year} McMullen Properties. Tim McMullen, CA DRE #02016832 · Brokered by Real Broker.
            <br className="hidden md:block" />
            Equal Housing Opportunity. All information deemed reliable but not guaranteed.
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/sitemap" className="hover:text-[#0D1B2A]">Sitemap</Link>
            <Link to="/join" className="hover:text-[#0D1B2A]">Create account</Link>
            <Link to="/login" className="hover:text-[#0D1B2A]">Log in</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
