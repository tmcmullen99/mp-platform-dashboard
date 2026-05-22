import { NavLink } from 'react-router-dom'
import {
  Sun,
  Calendar,
  Users,
  Briefcase,
  Map,
  Target,
  Megaphone,
  Flame,
  Search,
  Send,
  Home,
  PenLine,
  Globe,
  BarChart3,
  Settings,
  FileBarChart2,
  Building2,
  Workflow,
  Gift,
  CheckSquare,
  LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

type NavItem = { to: string; label: string; Icon: LucideIcon }

const navItems: NavItem[] = [
  { to: '/', label: 'Today', Icon: Sun },
  { to: '/tasks', label: 'Tasks', Icon: CheckSquare },
  { to: '/schedule', label: 'Schedule', Icon: Calendar },
  { to: '/crm', label: 'CRM', Icon: Users },
  { to: '/clients', label: 'Clients', Icon: Briefcase },
  { to: '/pipeline', label: 'Pipeline', Icon: Workflow },
  { to: '/referrals', label: 'Referrals', Icon: Gift },
  { to: '/markets', label: 'Markets', Icon: Map },
  { to: '/audiences', label: 'Audiences', Icon: Target },
  { to: '/outreach', label: 'Outreach', Icon: Megaphone },
  { to: '/board', label: 'Hot leads', Icon: Flame },
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
  const { currentTenant, currentBranding, profile, isOversight, availableTenants, actAsTenant, enterOversight } = useAuth()

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
          {profile?.is_brokerage_admin && (
            <li>
              <NavLink
                to="/brokerage"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-white/10 text-cream'
                      : 'text-cream/60 hover:text-cream hover:bg-white/5'
                  }`
                }
              >
                <Building2 className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span className="font-medium">Brokerage</span>
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      {/* Operating as (brokerage admins only) */}
      {profile?.is_brokerage_admin && (
        <div className="px-3 py-4 border-t border-white/5">
          <div className="text-2xs uppercase tracking-widest text-cream/40 mb-2 px-3">Operating as</div>
          <select
            value={isOversight ? 'oversight' : currentTenant?.id || 'oversight'}
            onChange={(e) => {
              const v = e.target.value
              if (v === 'oversight') enterOversight()
              else actAsTenant(v)
            }}
            className="w-full bg-white/5 text-cream text-sm px-3 py-2 border border-white/10 focus:outline-none focus:border-white/30"
          >
            <option value="oversight" className="text-ink-900">Oversight — all tenants</option>
            {availableTenants.map((t) => (
              <option key={t.id} value={t.id} className="text-ink-900">
                Act as {t.display_name}
              </option>
            ))}
          </select>
          {!isOversight && (
            <div className="text-2xs text-cream/40 mt-2 px-3 leading-relaxed">
              Scoped to one tenant. Switch to oversight for cross-tenant admin.
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="p-7 border-t border-white/5 text-2xs uppercase tracking-widest text-cream/30">
        Platform v0.22 · Epic G
      </div>
    </aside>
  )
}
