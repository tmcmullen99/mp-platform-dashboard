// P9.13.0 — Public layout.
//
// Shared header/footer chrome for public-facing pages (no auth required).
// Takes an optional tenant + branding context to render brand-skinned chrome;
// when omitted, falls back to a generic McMullen Properties header.
//
// Used by: ListingsIndex, PublicListingDetail, TenantHome.

import { Link } from 'react-router-dom'
import { Mail, Phone } from 'lucide-react'

export type TenantPublic = {
  id: string
  slug: string
  name: string
}

export type TenantBrandingPublic = {
  tenant_id: string
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  background_color: string | null
  heading_font: string | null
  body_font: string | null
  agent_name: string | null
  agent_title: string | null
  agent_bio: string | null
  agent_photo_url: string | null
  agent_email: string | null
  agent_phone: string | null
  dre_license: string | null
  brokerage_affiliation: string | null
  social_links: Record<string, string> | null
  hero_title: string | null
  hero_subtitle: string | null
  hero_image_url: string | null
  service_areas: string[] | null
}

export default function PublicLayout({
  tenant,
  branding,
  children,
}: {
  tenant?: TenantPublic
  branding?: TenantBrandingPublic
  children: React.ReactNode
}) {
  const homePath = tenant ? `/t/${tenant.slug}` : '/listings'
  const brandName = tenant?.name || 'McMullen Properties'
  const social = branding?.social_links || {}

  return (
    <div className="min-h-screen bg-cream flex flex-col font-sans text-ink-900">
      {/* Header */}
      <header className="border-b border-ink-200 bg-cream sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link to={homePath} className="flex items-center gap-3 group">
            {branding?.logo_url ? (
              <img
                src={branding.logo_url}
                alt={brandName}
                className="h-8 object-contain"
              />
            ) : (
              <div className="font-display text-xl text-ink-900 group-hover:text-ink-700">
                {brandName}
              </div>
            )}
          </Link>
          <nav className="flex items-center gap-5 text-2xs uppercase tracking-widest text-ink-600">
            {tenant && (
              <Link to={homePath} className="hover:text-ink-900">
                Home
              </Link>
            )}
            <Link to="/listings" className="hover:text-ink-900">
              Listings
            </Link>
            {branding?.agent_email && (
              <a
                href={`mailto:${branding.agent_email}`}
                className="hover:text-ink-900"
              >
                Contact
              </a>
            )}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-ink-200 mt-16 py-10 bg-cream">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="font-display text-lg text-ink-900 mb-2">
              {brandName}
            </div>
            {branding?.brokerage_affiliation && (
              <p className="text-ink-600 text-xs leading-relaxed">
                {branding.brokerage_affiliation}
              </p>
            )}
            {branding?.dre_license && (
              <p className="text-ink-500 text-2xs uppercase tracking-widest mt-2">
                DRE #{branding.dre_license}
              </p>
            )}
          </div>
          <div>
            {branding?.agent_name && (
              <div className="text-ink-900 mb-1.5">{branding.agent_name}</div>
            )}
            <div className="space-y-1.5">
              {branding?.agent_email && (
                <a
                  href={`mailto:${branding.agent_email}`}
                  className="text-ink-600 text-xs flex items-center gap-2 hover:text-ink-900"
                >
                  <Mail className="w-3 h-3" strokeWidth={1.5} />
                  {branding.agent_email}
                </a>
              )}
              {branding?.agent_phone && (
                <a
                  href={`tel:${branding.agent_phone}`}
                  className="text-ink-600 text-xs flex items-center gap-2 hover:text-ink-900"
                >
                  <Phone className="w-3 h-3" strokeWidth={1.5} />
                  {branding.agent_phone}
                </a>
              )}
            </div>
            {Object.keys(social).length > 0 && (
              <div className="mt-3 flex items-center gap-3">
                {Object.entries(social).map(([k, v]) => (
                  <a
                    key={k}
                    href={v}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900"
                  >
                    {k}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="text-2xs uppercase tracking-widest text-ink-400 md:text-right">
            © {new Date().getFullYear()} {brandName}.<br />
            All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
