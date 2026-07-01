import { NavLink } from 'react-router-dom'
import {
  Sun,
  Users,
  Briefcase,
  Search,
  Send,
  Home,
  PenLine,
  Globe,
  BarChart3,
  Settings,
  FileBarChart2,
  Percent,
  LucideIcon,
  Inbox,
  BadgeDollarSign,
  FileSearch,
  Building2,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

type NavItem = { to: string; label: string; Icon: LucideIcon }

const navItems: NavItem[] = [
  { to: '/app', label: 'Today', Icon: Sun },
  { to: '/crm', label: 'CRM', Icon: Users },
  { to: '/inquiries', label: 'Inquiries', Icon: Inbox },
  { to: '/credit-applications', label: '$10K Credits', Icon: BadgeDollarSign },
  { to: '/clients', label: 'Clients', Icon: Briefcase },
  { to: '/cmas/new', label: 'New CMA', Icon: FileBarChart2 },
  { to: '/analyze', label: 'Analyze', Icon: FileSearch },
  { to: '/prospecting', label: 'Prospecting', Icon: Search },
  { to: '/campaigns', label: 'Campaigns', Icon: Send },
  { to: '/listings', label: 'Listings', Icon: Home },
  { to: '/content', label: 'Content Studio', Icon: PenLine },
  { to: '/site', label: 'Site Editor', Icon: Globe },
  { to: '/analytics', label: 'Analytics', Icon: BarChart3 },
  { to: '/settings/commission', label: 'Commission', Icon: Percent },
  { to: '/settings', label: 'Settings', Icon: Settings },
]

// Sidebar is a static rail on desktop (lg+) and an off-canvas drawer on mobile.
// `open` / `onClose` drive the mobile drawer; on desktop they're inert because
// the aside is always translated into view at the lg breakpoint.
export default function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const { currentTenant, currentBranding, profile } = useAuth()

  // Brokerage operator console is admin-only — appended for brokerage admins.
  const items: NavItem[] = profile?.is_brokerage_admin
    ? [...navItems, { to: '/brokerage', label: 'Brokerage', Icon: Building2 }]
    : navItems

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-ink-900 text-cream/90 flex flex-col h-screen
        transform transition-transform duration-200 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto lg:shrink-0
      `}
    >
      {/* Brand + mobile close */}
      <div className="p-7 border-b border-white/5 flex items-start justify-between">
        <div>
          <div className="font-display text-xl text-cream leading-tight tracking-tight">
            {currentTenant?.display_name || 'McMullen Platform'}
          </div>
          <div className="text-2xs uppercase tracking-widest text-cream/40 mt-2">
            {currentBranding?.brokerage_affiliation || 'Brokerage OS'}
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-cream/50 hover:text-cream -mr-1 -mt-1 p-1"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-white/10 text-cream'
                      : 'text-cream/60 hover:text-cream hover:bg-white/5'
                  }`
                }
              >
                <item.Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-7 border-t border-white/5 text-2xs uppercase tracking-widest text-cream/30">
        Platform v0.10 · P9.4
      </div>
    </aside>
  )
}
