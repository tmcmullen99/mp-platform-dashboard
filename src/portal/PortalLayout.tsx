// src/components/PortalLayout.tsx
//
// Persistent left-sidebar shell for the client portal. Fetches
// client_portal_overview ONCE on mount and exposes it via PortalContext so the
// sidebar, dashboard, and any future surface can read counts/client/agent
// without duplicating the call. Mobile collapses to a hamburger-triggered sheet.

import { createContext, useContext, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import PortalSidebar from './PortalSidebar'

export interface OverviewData {
  ok: boolean
  user: { id: string; email: string }
  client: { id: string; name: string; client_type: string; stage?: string }
  agent: { name: string | null; email: string | null; phone?: string | null } | null
  tenant: { id: string; display_name: string; slug: string } | null
  counts: {
    saved_properties: number
    favorites: number
    deals: number
    cmas: number
    documents: { total: number; signed: number; unsigned: number }
    net_sheets: number
    tour_requests: { pending: number; confirmed: number }
    war_rooms: number
  }
  recent: {
    saved_properties: any[]
    deals: any[]
    cmas: any[]
    documents: any[]
    tour_requests: any[]
    war_rooms: { unread_client?: number; id: string }[]
  }
}

interface PortalContextValue {
  overview: OverviewData | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const PortalContext = createContext<PortalContextValue>({
  overview: null,
  loading: true,
  error: null,
  refresh: async () => {},
})

export function usePortal() {
  return useContext(PortalContext)
}

export default function PortalLayout() {
  const { session } = useAuth()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  async function fetchOverview() {
    if (!session?.access_token) return
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client_portal_overview`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      )
      const json = await resp.json()
      if (!resp.ok || !json.ok) throw new Error(json.error || 'Could not load portal')
      setOverview(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token])

  return (
    <PortalContext.Provider value={{ overview, loading, error, refresh: fetchOverview }}>
      <div className="min-h-screen bg-cream">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col bg-white border-r border-[#e8e3d8] z-30">
          <PortalSidebar onNavigate={() => {}} />
        </aside>

        {/* Mobile sheet */}
        {mobileOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/30 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="md:hidden fixed inset-y-0 left-0 w-72 bg-white border-r border-[#e8e3d8] z-50 flex flex-col">
              <PortalSidebar onNavigate={() => setMobileOpen(false)} />
            </aside>
          </>
        )}

        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-20 bg-white border-b border-[#e8e3d8] px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded hover:bg-cream"
            aria-label="Open menu"
          >
            <Menu size={20} className="text-[#1a1f2e]" />
          </button>
          <div className="font-['Playfair_Display',Georgia,serif] text-lg text-[#1a1f2e]">
            McMullen Properties
          </div>
        </div>

        {/* Main content */}
        <main className="md:pl-64">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10 py-8 md:py-12">
            <Outlet />
          </div>
        </main>
      </div>
    </PortalContext.Provider>
  )
}
