import type { TenantBranding } from '@/lib/supabase'

// ===========================================================================
// Page-tree config types — the malleable website is data in this shape.
// ===========================================================================

export type SiteNode = {
  id: string
  type: string
  props: Record<string, unknown>
  children?: SiteNode[]
}

export type SitePageDef = {
  id: string
  slug: string // "" = site root
  title: string
  status: 'published' | 'draft'
  removable?: boolean
  seo?: { title?: string; description?: string; og_image?: string }
  sections: SiteNode[]
}

export type SiteNavItem = { label: string; slug?: string; url?: string }

export type SiteTree = {
  contract_version: number
  pages: SitePageDef[]
  nav: SiteNavItem[]
}

// Runtime context the renderer threads down to every primitive.
export type SiteContext = {
  tenantId: string | null
  branding: TenantBranding | null
  enabledTools: Set<string> // client-facing tool keys that are turned on
  preview?: boolean // true inside the editor preview (renders disabled/empty states)
}

export const EMPTY_TREE: SiteTree = { contract_version: 1, pages: [], nav: [] }
