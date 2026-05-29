// src/portal/PortalSidebar.tsx
//
// Left navigation. Brand block at the top, nav items in the middle, account
// + sign-out at the bottom. Active route gets a navy left border and slightly
// heavier text weight. Fetches client_portal_overview once to derive client
// name, client_type (for the conditional "My Listing" link), and the
// unsigned-docs/war-room-unread badges.

import { NavLink, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // TODO: adjust to your project's path

interface NavItemProps {
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  badge?: number;
  onNavigate: () => void;
}

function NavItem({ to, icon: Icon, label, badge, onNavigate }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "group flex items-center gap-3 pl-5 pr-4 py-2.5 mx-2 rounded-md text-sm transition-colors relative",
          isActive
            ? "bg-[#f5f3ee] text-[#1a1f2e] font-medium"
            : "text-[#353535] hover:bg-[#f5f3ee] hover:text-[#1a1f2e]",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#1a1f2e]" />
          )}
          <Icon
            size={18}
            className={isActive ? "text-[#1a1f2e]" : "text-[#91a1ba] group-hover:text-[#1a1f2e]"}
          />
          <span className="flex-1">{label}</span>
          {badge != null && badge > 0 && (
            <span className="bg-[#1a1f2e] text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

interface SidebarProps {
  onNavigate: () => void;
}

export default function PortalSidebar({ onNavigate }: SidebarProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    name: string;
    clientType: string;
    unreadMessages: number;
    unsignedDocs: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) return;
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client_portal_overview`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const json = await resp.json();
        if (json.ok) {
          // Sum unread across recent war rooms (recent list is capped at 5,
          // fine for typical one-room-per-client setups)
          const unread = (json.recent?.war_rooms || []).reduce(
            (acc: number, r: { unread_client?: number }) => acc + (r.unread_client || 0),
            0,
          );
          setProfile({
            name: json.client?.name || "Client",
            clientType: json.client?.client_type || "buyer",
            unreadMessages: unread,
            unsignedDocs: json.counts?.documents?.unsigned || 0,
          });
        }
      } catch {
        // Sidebar renders without badges if the call fails
      }
    })();
  }, []);

  const showMyListing =
    profile?.clientType === "seller" || profile?.clientType === "both";

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
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
        <div className="mt-2 text-[10px] tracking-[0.2em] uppercase text-[#91a1ba]">
          Client Portal
        </div>
      </div>

      <div className="h-px bg-[#e8e3d8] mx-4" />

      {/* Nav */}
      <nav className="flex-1 py-4 flex flex-col gap-0.5">
        <NavItem to="/portal" icon={LayoutDashboard} label="Dashboard" onNavigate={onNavigate} />
        {showMyListing && (
          <NavItem to="/portal/my-listing" icon={Home} label="My Listing" onNavigate={onNavigate} />
        )}
        <NavItem to="/portal/saved" icon={Heart} label="Saved Properties" onNavigate={onNavigate} />
        <NavItem to="/portal/cmas" icon={BarChart3} label="Market Analyses" onNavigate={onNavigate} />
        <NavItem to="/portal/schedule" icon={Calendar} label="Schedule" onNavigate={onNavigate} />
        <NavItem
          to="/portal/war-room"
          icon={MessageSquare}
          label="War Room"
          badge={profile?.unreadMessages}
          onNavigate={onNavigate}
        />
        <NavItem
          to="/portal/documents"
          icon={FileText}
          label="Documents"
          badge={profile?.unsignedDocs}
          onNavigate={onNavigate}
        />
      </nav>

      <div className="h-px bg-[#e8e3d8] mx-4" />

      {/* Account */}
      <div className="px-4 py-4 flex flex-col gap-1">
        <button
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[#353535] hover:bg-[#f5f3ee]"
        >
          <Bell size={18} className="text-[#91a1ba]" />
          <span>Notifications</span>
        </button>
        <div className="px-3 py-2">
          <div className="text-sm font-medium text-[#1a1f2e] truncate">
            {profile?.name || "—"}
          </div>
          <div className="text-xs text-[#91a1ba]">Signed in</div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[#353535] hover:bg-[#f5f3ee] hover:text-[#1a1f2e]"
        >
          <LogOut size={18} className="text-[#91a1ba]" />
          <span>Sign out</span>
        </button>
      </div>
    </>
  );
}
