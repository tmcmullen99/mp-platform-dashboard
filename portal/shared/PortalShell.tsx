// src/portal/shared/PortalShell.tsx
//
// The chrome both portals share: editorial masthead, adaptive nav, sign-out,
// notification bell, the Buyer/Seller switch (only for client_type='both'),
// and the once-per-member onboarding gate + first-login tour mounts.
//
// Nav items are passed in by the seller/buyer portal so this file stays
// presentational and the two experiences own their own tab sets.
import { ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { LogOut, ArrowLeftRight, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import NotificationBell from '@/components/NotificationBell'
import FirstLoginTour from '@/components/FirstLoginTour'
import ClientOnboarding from './ClientOnboarding'

export type PortalNavItem = {
  to: string
  label: string
  icon: LucideIcon
  exact?: boolean
  dataTour?: string
}

export default function PortalShell({
  nav,
  activeSide,
  onSwitchSide,
  tourSide,
  children,
}: {
  nav: PortalNavItem[]
  // When the client is 'both', activeSide is 'buyer'|'seller' and the switch shows.
  activeSide?: 'buyer' | 'seller' | null
  onSwitchSide?: () => void
  // P9.6 — which first-login tour script to run (independent of the switch UI,
  // since single-mode portals never pass activeSide).
  tourSide?: 'buyer' | 'seller' | null
  children: ReactNode
}) {
  const { clientProfile, currentBranding, signOut } = useAuth()
  const brokerage = currentBranding?.brokerage_affiliation || 'McMullen Properties'

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-ink-200 bg-cream/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-5 flex items-center justify-between">
          <Link to="." className="block">
            <div className="font-display text-xl text-ink-900 leading-tight">{brokerage}</div>
            <div className="text-2xs uppercase tracking-widest text-slate mt-0.5">
              Client portal
            </div>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {activeSide && onSwitchSide && (
              <button
                onClick={onSwitchSide}
                className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 border border-ink-200 hover:border-ink-900 px-3 py-1.5 transition-colors"
                title="Switch between buying and selling"
              >
                <ArrowLeftRight className="w-3 h-3" strokeWidth={1.5} />
                {activeSide === 'seller' ? 'Selling' : 'Buying'}
              </button>
            )}
            <NotificationBell />
            <span className="text-ink-600 hidden sm:inline">{clientProfile?.name}</span>
            <button
              onClick={signOut}
              className="text-slate hover:text-ink-900 flex items-center gap-1.5"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-2xs uppercase tracking-widest hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
        <nav
          className="max-w-6xl mx-auto px-6 md:px-8 flex gap-1 overflow-x-auto"
          data-tour="tools"
        >
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              data-tour={item.dataTour}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3.5 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-ink-900 text-ink-900'
                    : 'border-transparent text-slate hover:text-ink-900'
                }`
              }
            >
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-8 py-10 md:py-14">{children}</main>

      <ClientOnboarding />
      <FirstLoginTour side={tourSide} />
    </div>
  )
}
