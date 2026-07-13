// src/portal/seller/SellerPortal.tsx
//
// Seller experience. Tabs: Home · My Listing · Comps · CMAs · Schedule · Documents.
// (P10 adds "Comparable Sales" — the seller-side mirror of the buyer Saved view,
// scoped to client_external_listings.listing_role='seller_comp'.)
// Renders inside PortalShell.
import { Routes, Route, Navigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Home,
  Scale,
  FileBarChart2,
  Calendar,
  FileText,
} from 'lucide-react'
import PortalShell, { PortalNavItem } from '@/portal/shared/PortalShell'
import SellerHome from './SellerHome'
import SellerListing from './SellerListing'
import SellerComps from './SellerComps'
import SellerCMAs from './SellerCMAs'
import SellerSchedule from './SellerSchedule'
import SellerDocuments from './SellerDocuments'
import CMAViewer from '@/components/CMAViewer'

const NAV: PortalNavItem[] = [
  { to: '/portal', label: 'Home', icon: LayoutDashboard, exact: true },
  { to: '/portal/listing', label: 'My Listing', icon: Home, dataTour: 'listing' },
  { to: '/portal/comps', label: 'Comparable Sales', icon: Scale },
  { to: '/portal/cmas', label: 'CMAs', icon: FileBarChart2 },
  { to: '/portal/schedule', label: 'Schedule', icon: Calendar },
  { to: '/portal/documents', label: 'Documents', icon: FileText, dataTour: 'documents' },
]

export default function SellerPortal({
  activeSide,
  onSwitchSide,
}: {
  activeSide?: 'buyer' | 'seller' | null
  onSwitchSide?: () => void
}) {
  return (
    <PortalShell nav={NAV} activeSide={activeSide} onSwitchSide={onSwitchSide} tourSide="seller">
      <Routes>
        <Route index element={<SellerHome />} />
        <Route path="listing" element={<SellerListing />} />
        <Route path="comps" element={<SellerComps />} />
        <Route path="cmas" element={<SellerCMAs />} />
        <Route path="cmas/:slug" element={<CMAViewer embedded />} />
        <Route path="schedule" element={<SellerSchedule />} />
        <Route path="documents" element={<SellerDocuments />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </PortalShell>
  )
}
