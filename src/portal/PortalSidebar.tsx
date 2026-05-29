// src/components/PortalSidebar.tsx
//
// Left navigation. Brand block, nav items, account + sign-out. Active route
// gets a navy left border. Reads client_type + unread/unsigned badge counts
// from PortalContext (no separate fetch). Routes are relative to /portal
// because Portal.tsx is mounted under /portal/* in App.tsx.

import { useNavigate, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Home,
  Heart,
  BarChart3,
  Calendar,
  MessageSquare,
  FileText,
  LogOut,
  Bell,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePortal } from '@/components/PortalLayout'

interface NavItemProps {
  to: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  badge?: number
  onNavigate: () => void
}

function NavItem({ to, icon: Icon, label, badge, onNavigate }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'group flex items-center gap-3 pl-5 pr-4 py-2.5 mx-2 rounded-md text-sm transition-colors relative',
          isActive
            ? 'bg-cream text-[#1a1f2e] font-medium'
            : 'text-[#353535] hover:bg-cream hover:text-[#1a1f2e]',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#1a1f2e]" />
          )}
          <Icon
            size={18}
            className={
              isActive ? 'text-[#1a1f2e]' : 'text-[#91a1ba] group-hover:text-[#1a1f2e]'
            }
          />
          <span className="flex-1">{label}</span>
          {badge != null && badge > 0 && (
            <span className="bg-[#1a1f2e] text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

interface SidebarProps {
  onNavigate: () => void
}

export default function PortalSidebar({ onNavigate }: SidebarProps) {
  const navigate = useNavigate()
  const { signOut } = useAuth() as { signOut?: () => Promise<void> } // optional method
  const { overview } = usePortal()

  const clientName = overview?.client.name || '—'
  const clientType = overview?.client.client_type || 'buyer'
  const showMyListing = clientType === 'seller' || clientType === 'both'

  // Sum unread across recent war rooms (capped at 5 in the overview response;
  // sufficient for typical one-room-per-client setups).
  const unreadMessages = (overview?.recent.war_rooms || []).reduce(
    (acc, r) => acc + (r.unread_client || 0),
    0,
  )
  const unsignedDocs = overview?.counts.documents.unsigned || 0

  async function handleSignOut() {
    if (signOut) {
      await signOut()
    } else {
      // Fallback if AuthContext doesn't expose signOut directly
      const { supabase } = await import('@/lib/supabase')
      await supabase.auth.signOut()
    }
    navigate('/login')
  }

  return (
    <>
      {/* Brand */}
      <div className="px-6 pt-8 pb-6">
        <div className="font-['Playfair_Display',Georgia,serif] text-xl leading-tight text-[#1a1f2e]">
          McMullen
          <br />
          Properties
        </div>
        <div className="mt-2 text-2xs uppercase tracking-widest text-ink-500">
          Client Portal
        </div>
      </div>

      <div className="h-px bg-[#e8e3d8] mx-4" />

      {/* Nav — paths are relative to /portal */}
      <nav className="flex-1 py-4 flex flex-col gap-0.5">
        <NavItem to="/portal" icon={LayoutDashboard} label="Dashboard" onNavigate={onNavigate} />
        {showMyListing && (
          <NavItem
            to="/portal/my-listing"
            icon={Home}
            label="My Listing"
            onNavigate={onNavigate}
          />
        )}
        <NavItem
          to="/portal/saved"
          icon={Heart}
          label="Saved Properties"
          onNavigate={onNavigate}
        />
        <NavItem
          to="/portal/cmas"
          icon={BarChart3}
          label="Market Analyses"
          onNavigate={onNavigate}
        />
        <NavItem to="/portal/schedule" icon={Calendar} label="Schedule" onNavigate={onNavigate} />
        <NavItem
          to="/portal/war-room"
          icon={MessageSquare}
          label="War Room"
          badge={unreadMessages}
          onNavigate={onNavigate}
        />
        <NavItem
          to="/portal/documents"
          icon={FileText}
          label="Documents"
          badge={unsignedDocs}
          onNavigate={onNavigate}
        />
      </nav>

      <div className="h-px bg-[#e8e3d8] mx-4" />

      {/* Account */}
      <div className="px-4 py-4 flex flex-col gap-1">
        <button
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[#353535] hover:bg-cream"
        >
          <Bell size={18} className="text-[#91a1ba]" />
          <span>Notifications</span>
        </button>
        <div className="px-3 py-2">
          <div className="text-sm font-medium text-[#1a1f2e] truncate">{clientName}</div>
          <div className="text-xs text-ink-500">Signed in</div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[#353535] hover:bg-cream hover:text-[#1a1f2e]"
        >
          <LogOut size={18} className="text-[#91a1ba]" />
          <span>Sign out</span>
        </button>
      </div>
    </>
  )
}
