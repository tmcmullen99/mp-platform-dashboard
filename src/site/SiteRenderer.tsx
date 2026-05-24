import { getPrimitive } from './primitives'
import type { SiteTree, SitePageDef, SiteNode, SiteContext } from './types'
import type { TenantBranding } from '@/lib/supabase'

// Brand → CSS variables the primitives read (var(--site-primary), etc.).
function themeVars(branding: TenantBranding | null): React.CSSProperties {
  return {
    '--site-primary': branding?.primary_color || '#1a1f2e',
    '--site-secondary': branding?.secondary_color || '#91a1ba',
    '--site-bg': branding?.background_color || '#ffffff',
    '--site-heading-font': branding?.heading_font || 'Georgia, "Times New Roman", serif',
    '--site-body-font': branding?.body_font || 'system-ui, -apple-system, sans-serif',
  } as React.CSSProperties
}

export function SiteNodeView({ node, ctx }: { node: SiteNode; ctx: SiteContext }) {
  const def = getPrimitive(node.type)
  if (!def) {
    if (ctx.preview) {
      return (
        <div className="mx-4 my-2 px-4 py-3 text-xs text-red-500 border border-dashed border-red-300">
          Unknown block: {node.type}
        </div>
      )
    }
    return null
  }
  const Component = def.Component
  return <Component node={node} ctx={ctx} />
}

export function SitePageView({ page, ctx }: { page: SitePageDef; ctx: SiteContext }) {
  return (
    <div style={{ ...themeVars(ctx.branding), background: 'var(--site-bg)', fontFamily: 'var(--site-body-font)' }}>
      {(page.sections || []).map((node) => (
        <SiteNodeView key={node.id} node={node} ctx={ctx} />
      ))}
    </div>
  )
}

// Find a page by slug in a full tree and render it ("" = home).
export function SiteRenderer({ tree, slug, ctx }: { tree: SiteTree; slug: string; ctx: SiteContext }) {
  const page = tree.pages.find((p) => p.slug === slug) || tree.pages.find((p) => p.slug === '')
  if (!page) {
    return <div className="px-6 py-24 text-center text-gray-400">Page not found.</div>
  }
  return <SitePageView page={page} ctx={ctx} />
}
