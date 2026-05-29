// src/portal/PortalLayout.tsx
//
// Persistent left-sidebar shell for the client portal. Wraps all /portal/*
// routes via React Router's <Outlet />. Sidebar is fixed on desktop (≥768px)
// and collapses to a hamburger-triggered sheet on mobile.

import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import PortalSidebar from "./PortalSidebar";

export default function PortalLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f3ee]">
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
          className="p-2 -ml-2 rounded hover:bg-[#f5f3ee]"
          aria-label="Open menu"
        >
          <Menu size={20} className="text-[#1a1f2e]" />
        </button>
        <div className="font-['Playfair_Display',Georgia,serif] text-lg text-[#1a1f2e]">
          McMullen Properties
        </div>
      </div>

      {/* Main content area */}
      <main className="md:pl-64">
        <div className="mx-auto max-w-[1200px] px-6 md:px-10 py-8 md:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
