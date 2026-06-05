// src/portal/buyer/BuyerPortal.tsx
//
// Buyer experience. Tabs: Home · Interested Properties · Schedule.
// Per-property detail lives at /portal/property/:id with CMA, war room,
// uploads, mortgage calc, and the gated "What Should We Offer" flow.
import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, Heart, Calendar } from 'lucide-react'
import PortalShell, { PortalNavItem } from '@/portal/shared/PortalShell'
import BuyerHome from './BuyerHome'
import InterestedProperties from './InterestedProperties'
import PropertyDetail from './PropertyDetail'
import BuyerSchedule from './BuyerSchedule'

const NAV: PortalNavItem[] = [
  { to: '/portal', label: 'Home', icon: LayoutDashboard, exact: true },
  { to: '/portal/interested', label: 'Interested Properties', icon: Heart, dataTour: 'listing' },
  { to: '/portal/schedule', label: 'Schedule', icon: Calendar },
]

export default function BuyerPortal({
  activeSide,
  onSwitchSide,
}: {
  activeSide?: 'buyer' | 'seller' | null
  onSwitchSide?: () => void
}) {
  return (
    <PortalShell nav={NAV} activeSide={activeSide} onSwitchSide={onSwitchSide}>
      <Routes>
        <Route index element={<BuyerHome />} />
        <Route path="interested" element={<InterestedProperties />} />
        <Route path="property/:id" element={<PropertyDetail />} />
        <Route path="schedule" element={<BuyerSchedule />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </PortalShell>
  )
}
