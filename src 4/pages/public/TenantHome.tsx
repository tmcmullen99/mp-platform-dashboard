// Tenant home page — route /t/:tenantSlug (no auth).
//
// Renders the tenant's PUBLISHED page-tree through the shared SiteRenderer,
// themed by their branding, with client-enabled tools passed into context.
// Falls back to a minimal branded hero if a tenant has no published site yet.

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { TenantBranding } from '@/lib/supabase'
import { ArrowRight } from 'lucide-react'
import PublicLayout, { TenantPublic, TenantBrandingPublic } from '@/components/public/PublicLayout'
import { SiteRenderer } from '@/site/SiteRenderer'
import type { SiteTree } from '@/site/types'

export default function TenantHome() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenant, setTenant] = useState<TenantPublic | null>(null)
  const [branding, setBranding] = useState<TenantBrandingPublic | null>(null)
  const [tree, setTree] = useState<SiteTree | null>(null)
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set())
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!tenantSlug) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setNotFound(false)

      // 1. Tenant by slug
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, slug, name:display_name')
        .eq('slug', tenantSlug)
        .maybeSingle()

      if (cancelled) return
      if (!tenantData) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setTenant(tenantData as TenantPublic)
      setTenantId((tenantData as { id: string }).id)

      // 2. Branding + published site + client-enabled tools, in parallel
      const [brandingRes, siteRes, toolsRes] = await Promise.all([
        supabase.from('tenant_branding').select('*').eq('tenant_id', (tenantData as { id: string }).id).maybeSingle(),
        supabase.from('tenant_sites').select('published_tree').eq('tenant_id', (tenantData as { id: string }).id).maybeSingle(),
        supabase
          .from('tenant_tool_settings')
          .select('tool_key')
          .eq('tenant_id', (tenantData as { id: string }).id)
          .eq('client_enabled', true),
      ])

      if (cancelled) return
      setBranding(brandingRes.data as TenantBrandingPublic | null)

      const pub = siteRes.data?.published_tree as SiteTree | undefined
      setTree(pub && Array.isArray(pub.pages) && pub.pages.length > 0 ? pub : null)

      setEnabledTools(new Set(((toolsRes.data as { tool_key: string }[] | null) || []).map((r) => r.tool_key)))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [tenantSlug])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-2xs uppercase tracking-widest text-ink-500">Loading…</div>
      </div>
    )
  }

  if (notFound || !tenant) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">404</div>
          <h1 className="font-display text-3xl text-ink-900 mb-3">Site not found</h1>
          <p className="text-ink-600 mb-6">We couldn’t find a brokerage at this address.</p>
          <Link
            to="/listings"
            className="inline-flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-900 hover:text-ink-700 border-b border-ink-300 pb-0.5"
          >
            Browse all listings <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <PublicLayout tenant={tenant} branding={branding || undefined}>
      {tree ? (
        <SiteRenderer
          tree={tree}
          slug=""
          ctx={{
            tenantId,
            branding: (branding as unknown as TenantBranding) || null,
            enabledTools,
            preview: false,
          }}
        />
      ) : (
        <section className="relative bg-ink-900 text-cream overflow-hidden">
          {branding?.hero_image_url && (
            <div className="absolute inset-0">
              <img src={branding.hero_image_url} alt="" className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/50 to-transparent" />
            </div>
          )}
          <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-36">
            <h1 className="font-display text-5xl md:text-6xl leading-tight max-w-3xl">
              {branding?.hero_title || tenant.name}
            </h1>
            {branding?.hero_subtitle && (
              <p className="text-lg md:text-xl text-cream/80 mt-5 max-w-2xl leading-relaxed italic">
                {branding.hero_subtitle}
              </p>
            )}
            <Link
              to="/listings"
              className="inline-flex items-center gap-2 mt-10 px-5 py-3 bg-cream text-ink-900 text-2xs uppercase tracking-widest hover:bg-white"
            >
              View listings <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      )}
    </PublicLayout>
  )
}
