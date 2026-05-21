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
  LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

type NavItem = { to: string; label: string; Icon: LucideIcon }

const navItems: NavItem[] = [
  { to: '/', label: 'Today', Icon: Sun },
  { to: '/crm', label: 'CRM', Icon: Users },
  { to: '/clients', label: 'Clients', Icon: Briefcase },
  { to: '/cmas/new', label: 'New CMA', Icon: FileBarChart2 },
  { to: '/prospecting', label: 'Prospecting', Icon: Search },
  { to: '/campaigns', label: 'Campaigns', Icon: Send },
  { to: '/listings', label: 'Listings', Icon: Home },
  { to: '/content', label: 'Content Studio', Icon: PenLine },
  { to: '/site', label: 'Site Editor', Icon: Globe },
  { to: '/analytics', label: 'Analytics', Icon: BarChart3 },
  { to: '/settings', label: 'Settings', Icon: Settings },
]

export default function Sidebar() {
  const { currentTenant, currentBranding } = useAuth()

  return (
    <aside className="w-64 bg-ink-900 text-cream/90 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand */}
      <div className="p-7 border-b border-white/5">
        <div className="font-display text-xl text-cream leading-tight tracking-tight">
          {currentTenant?.display_name || 'McMullen Platform'}
        </div>
        <div className="text-2xs uppercase tracking-widest text-cream/40 mt-2">
          {currentBranding?.brokerage_affiliation || 'Brokerage OS'}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
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
        Platform v0.9 · P9.2
      </div>
    </aside>
  )
}
