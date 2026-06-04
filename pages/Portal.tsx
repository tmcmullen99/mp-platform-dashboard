// src/pages/Portal.tsx
//
// Portal entry router. Reads clientType from auth and dispatches to the seller
// or buyer experience. For client_type='both' (a client both buying AND
// selling), a top-level Buyer/Seller switch toggles between the two; the chosen
// side persists in localStorage for the session.
//
// The previous 2,151-line monolith was decomposed into src/portal/seller/* and
// src/portal/buyer/* behind these two portals. All data paths (deals, cmas,
// war_rooms, schedule_events, client_external_listings, documents) are unchanged
// — only the routing and presentation were rebuilt.
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import SellerPortal from '@/portal/seller/SellerPortal'
import BuyerPortal from '@/portal/buyer/BuyerPortal'

const SIDE_KEY = 'mp_portal_active_side'

export default function Portal() {
  const { clientProfile, clientType, loading } = useAuth()
  const [hasBuy, setHasBuy] = useState(false)
  const [hasSell, setHasSell] = useState(false)
  const [resolved, setResolved] = useState(false)
  const [side, setSide] = useState<'buyer' | 'seller'>(
    () => (localStorage.getItem(SIDE_KEY) as 'buyer' | 'seller') || 'seller',
  )

  // Determine, from actual deals, whether this client has both buy and sell
  // activity. This catches the edge case where client_type says one thing but
  // deals span both (e.g. a 'buyer' who also has a sell deal).
  useEffect(() => {
    if (!clientProfile) return
    let cancelled = false
    supabase
      .from('deals')
      .select('deal_type')
      .eq('client_id', clientProfile.id)
      .then(({ data }) => {
        if (cancelled) return
        const types = new Set((data || []).map((d) => (d as { deal_type: string }).deal_type))
        setHasBuy(types.has('buy') || types.has('lease') || types.has('investment'))
        setHasSell(types.has('sell'))
        setResolved(true)
      })
    return () => {
      cancelled = true
    }
  }, [clientProfile])

  function switchSide() {
    setSide((s) => {
      const next = s === 'seller' ? 'buyer' : 'seller'
      localStorage.setItem(SIDE_KEY, next)
      return next
    })
  }

  if (loading || !resolved) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink-500" />
      </div>
    )
  }

  // Show the switch when the client is explicitly 'both' OR has deals on both sides.
  const isDual = clientType === 'both' || (hasBuy && hasSell)

  if (isDual) {
    return side === 'seller' ? (
      <SellerPortal activeSide="seller" onSwitchSide={switchSide} />
    ) : (
      <BuyerPortal activeSide="buyer" onSwitchSide={switchSide} />
    )
  }

  // Single-mode clients route purely on client_type, falling back to deal shape.
  if (clientType === 'buyer' || (hasBuy && !hasSell)) {
    return <BuyerPortal />
  }
  // Default to seller (covers 'seller', and any client with a sell deal).
  return <SellerPortal />
}
