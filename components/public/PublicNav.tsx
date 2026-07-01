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
  { key: 'buy', to: '/buy', label: 'Buy' },
  { key: 'sell', to: '/sell', label: 'Sell' },
  { key: 'services', to: '/services', label: 'Services' },
  { key: 'about', to: '/meet-tim', label: 'Meet Tim' },
  { key: 'insight', to: '/blog', label: 'Market Insight' },
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

export function PublicFooter() {
  return (
    <footer className="border-t border-black/[0.07] py-12">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-4 text-sm text-[#273C46]">
        <Link
          to="/home"
          className="flex items-center text-[#0D1B2A] hover:opacity-80 transition-opacity"
          aria-label="McMullen Properties — home"
        >
          <LogoWordmark height={18} />
        </Link>
        <div className="flex flex-wrap gap-6">
          <Link to="/tools" className="hover:opacity-70">Tools</Link>
          <Link to="/blog" className="hover:opacity-70">Market Insight</Link>
          <a href="tel:+14156919272" className="hover:opacity-70">(415) 691-9272</a>
          <a href="mailto:tim@mcmullen.properties" className="hover:opacity-70">tim@mcmullen.properties</a>
        </div>
      </div>
    </footer>
  )
}
