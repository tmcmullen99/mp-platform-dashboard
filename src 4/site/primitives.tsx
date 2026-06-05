// src/site/primitives.tsx — Site primitive registry.
//
// RESTORED SCAFFOLD: the original registry was overwritten by a misplaced
// TenantHome upload, which broke `tsc -b` (SiteRenderer.tsx and validate.ts
// import PRIMITIVES + getPrimitive from here). This restores those exports with
// a small set of safe baseline blocks so the build compiles and published site
// trees render. Expand PRIMITIVES with your full block set as the Site Editor grows.

import type { ReactElement } from 'react'
import type { SiteNode, SiteContext } from './types'

export type PropType = 'string' | 'text' | 'number' | 'boolean' | 'enum' | 'string[]'

export type PropSpec = {
  key: string
  label: string
  type: PropType
  required?: boolean
  options?: string[]
  placeholder?: string
}

export type PrimitiveDef = {
  type: string
  label: string
  category?: string
  props: PropSpec[]
  Component: (p: { node: SiteNode; ctx: SiteContext }) => ReactElement | null
}

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : v == null ? fallback : String(v)

// ---------- baseline blocks ----------

const Hero: PrimitiveDef = {
  type: 'hero',
  label: 'Hero',
  category: 'Header',
  props: [
    { key: 'title', label: 'Headline', type: 'string', required: true },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    { key: 'image_url', label: 'Background image URL', type: 'string' },
    { key: 'cta_label', label: 'Button label', type: 'string' },
    { key: 'cta_href', label: 'Button link', type: 'string' },
  ],
  Component: ({ node }) => {
    const p = node.props || {}
    const img = str(p.image_url)
    return (
      <section
        style={{
          padding: '88px 24px',
          textAlign: 'center',
          color: '#fff',
          background: img
            ? `linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.35)), center/cover no-repeat url(${img})`
            : 'var(--site-primary)',
        }}
      >
        <h1 style={{ fontFamily: 'var(--site-heading-font)', fontSize: 46, lineHeight: 1.1, margin: 0 }}>
          {str(p.title, 'Welcome')}
        </h1>
        {str(p.subtitle) && (
          <p style={{ fontSize: 19, opacity: 0.92, marginTop: 14, maxWidth: 620, marginInline: 'auto' }}>
            {str(p.subtitle)}
          </p>
        )}
        {str(p.cta_label) && (
          <a
            href={str(p.cta_href, '#')}
            style={{
              display: 'inline-block',
              marginTop: 26,
              padding: '12px 30px',
              background: '#fff',
              color: 'var(--site-primary)',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            {str(p.cta_label)}
          </a>
        )}
      </section>
    )
  },
}

const RichText: PrimitiveDef = {
  type: 'rich_text',
  label: 'Text block',
  category: 'Content',
  props: [
    { key: 'heading', label: 'Heading', type: 'string' },
    { key: 'body', label: 'Body', type: 'text', required: true },
  ],
  Component: ({ node }) => {
    const p = node.props || {}
    return (
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px' }}>
        {str(p.heading) && (
          <h2 style={{ fontFamily: 'var(--site-heading-font)', color: 'var(--site-primary)', marginTop: 0 }}>
            {str(p.heading)}
          </h2>
        )}
        <p style={{ whiteSpace: 'pre-line', lineHeight: 1.75, fontSize: 17 }}>{str(p.body)}</p>
      </section>
    )
  },
}

const ContactCta: PrimitiveDef = {
  type: 'contact_cta',
  label: 'Contact band',
  category: 'Footer',
  props: [
    { key: 'heading', label: 'Heading', type: 'string' },
    { key: 'phone', label: 'Phone', type: 'string' },
    { key: 'email', label: 'Email', type: 'string' },
  ],
  Component: ({ node }) => {
    const p = node.props || {}
    const phone = str(p.phone)
    const email = str(p.email)
    return (
      <section style={{ padding: '60px 24px', textAlign: 'center', background: 'var(--site-secondary)', color: '#fff' }}>
        <h2 style={{ fontFamily: 'var(--site-heading-font)', margin: 0 }}>{str(p.heading, "Let's talk")}</h2>
        <p style={{ marginTop: 12, fontSize: 18 }}>
          {phone}
          {phone && email ? '  ·  ' : ''}
          {email}
        </p>
      </section>
    )
  },
}

// ---------- registry ----------

export const PRIMITIVES: Record<string, PrimitiveDef> = {
  [Hero.type]: Hero,
  [RichText.type]: RichText,
  [ContactCta.type]: ContactCta,
}

export function getPrimitive(type: string): PrimitiveDef | undefined {
  return PRIMITIVES[type]
}

export const PRIMITIVE_LIST: PrimitiveDef[] = Object.values(PRIMITIVES)
