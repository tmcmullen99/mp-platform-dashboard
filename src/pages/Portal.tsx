// src/pages/Portal.tsx
//
// Client portal entry — App.tsx already wildcards /portal/* to this component,
// so all sub-routes live here. PortalLayout is the outlet wrapping each sub-page
// with the persistent left sidebar.
//
// Surfaces that aren't built yet render a shared "Coming soon" placeholder so
// the nav stays clickable. Replace each placeholder with a real page component
// when you build that tab.

import { Routes, Route, Navigate } from 'react-router-dom'
import PortalLayout from '@/components/PortalLayout'
import PortalHome from '@/pages/portal/PortalHome'
import PortalWarRoom from '@/pages/portal/PortalWarRoom'

function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">{title}</div>
      <h1 className="font-['Playfair_Display',Georgia,serif] text-3xl text-[#1a1f2e]">
        Coming soon
      </h1>
      <p className="text-[#353535] text-sm mt-4 max-w-prose">
        This surface is being wired up. The data layer is already in place — the UI follows
        shortly. Use the nav to jump back to your dashboard or war room in the meantime.
      </p>
    </div>
  )
}

export default function Portal() {
  return (
    <Routes>
      <Route element={<PortalLayout />}>
        <Route index element={<PortalHome />} />
        <Route path="my-listing" element={<ComingSoon title="My Listing" />} />
        <Route path="saved" element={<ComingSoon title="Saved Properties" />} />
        <Route path="cmas" element={<ComingSoon title="Market Analyses" />} />
        <Route path="schedule" element={<ComingSoon title="Schedule" />} />
        <Route path="war-room" element={<PortalWarRoom />} />
        <Route path="documents" element={<ComingSoon title="Documents" />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  )
}
