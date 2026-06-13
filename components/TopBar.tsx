import { useEffect, useRef, useState } from 'react'
import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import NotificationBell from '@/components/NotificationBell'

export default function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { profile, currentTenant, availableTenants, switchTenant, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [menuOpen])

  const initials = profile
    ? (profile.first_name?.[0] || profile.email[0] || '?').toUpperCase()
    : '?'

  return (
    <header className="border-b border-ink-100 bg-cream/95 backdrop-blur sticky top-0 z-10">
      <div className="flex items-center justify-between px-5 sm:px-8 lg:px-12 h-16">
        {/* Hamburger (mobile) + tenant switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-ink-700 hover:text-ink-900 -ml-1 p-1"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" strokeWidth={1.5} />
          </button>
          {availableTenants.length > 1 && currentTenant && (
            <>
              <div className="hidden sm:block text-2xs uppercase tracking-widest text-ink-500">Workspace</div>
              <select
                value={currentTenant.id}
                onChange={(e) => switchTenant(e.target.value)}
                className="text-sm bg-transparent border border-ink-200 px-3 py-1.5 focus:outline-none focus:border-ink-900 cursor-pointer max-w-[160px] sm:max-w-none truncate"
              >
                {availableTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.display_name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Bell + User menu */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 text-sm text-ink-700 hover:text-ink-900"
            aria-label="Open user menu"
          >
            <div className="w-8 h-8 bg-ink-900 text-cream flex items-center justify-center text-xs font-medium">
              {initials}
            </div>
            <span className="hidden md:inline">{profile?.email}</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-ink-100 shadow-xl py-1 z-20">
              <div className="px-4 py-3 border-b border-ink-100">
                <div className="text-sm font-medium text-ink-900">
                  {profile?.first_name} {profile?.last_name}
                </div>
                <div className="text-xs text-ink-500 truncate mt-0.5">{profile?.email}</div>
                {profile?.is_brokerage_admin && (
                  <div className="mt-2 inline-block text-2xs uppercase tracking-widest bg-ink-900 text-cream px-2 py-0.5">
                    Brokerage Admin
                  </div>
                )}
              </div>
              <button
                onClick={async () => {
                  setMenuOpen(false)
                  await signOut()
                }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
                Sign out
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </header>
  )
}
