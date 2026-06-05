// src/portal/shared/ui.tsx
//
// Phase 2 — the luxury visual layer, shared by both seller and buyer portals.
// Direction: refined real-estate editorial. Bold imagery and confident cards
// (HomeLight density) executed in the McMullen palette — navy ink, cream paper,
// blue-gray accents — with Playfair display headings over DM Sans. Restrained,
// not loud: big type, generous whitespace, hairline borders, one accent.
//
// These are presentational primitives only. No data, no Supabase. Seller/buyer
// feature files compose them so the look stays consistent and tunable in one
// place.
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { type LucideIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// Page header — the editorial masthead at the top of every portal screen
// ---------------------------------------------------------------------------
export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="mb-10">
      <div className="text-2xs uppercase tracking-widest text-slate mb-3">{eyebrow}</div>
      <h1 className="font-display text-4xl md:text-5xl text-ink-900 leading-[1.05] tracking-tight mb-4">
        {title}
      </h1>
      {children && <div className="text-ink-600 max-w-2xl leading-relaxed">{children}</div>}
    </div>
  )
}

// Section divider label — hairline rule with an uppercase tag
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="text-2xs uppercase tracking-widest text-slate">{children}</div>
      <div className="flex-1 h-px bg-ink-200" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

// A bold, image-forward card — the HomeLight-style hero unit. Image bleeds to
// the card edges; content sits below on cream.
export function ImageCard({
  image,
  imageAlt,
  to,
  href,
  badge,
  children,
}: {
  image?: string | null
  imageAlt?: string
  to?: string
  href?: string
  badge?: ReactNode
  children: ReactNode
}) {
  const inner = (
    <>
      <div className="relative aspect-[16/10] bg-ink-100 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={imageAlt || ''}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-ink-100 to-ink-200" />
        )}
        {badge && <div className="absolute top-4 left-4">{badge}</div>}
      </div>
      <div className="p-6">{children}</div>
    </>
  )
  const cls =
    'group block bg-cream border border-ink-200 hover:border-ink-400 transition-colors overflow-hidden'
  if (to) return <Link to={to} className={cls}>{inner}</Link>
  if (href)
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {inner}
      </a>
    )
  return <div className={cls}>{inner}</div>
}

// A flat content card — no image, hairline border, for stats and panels
export function Panel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white border border-ink-200 p-6 ${className}`}>{children}</div>
  )
}

// Clickable navigation/stat tile
export function StatTile({
  to,
  icon: Icon,
  label,
  primary,
  secondary,
  badge,
}: {
  to: string
  icon: LucideIcon
  label: string
  primary: string
  secondary?: string
  badge?: number
}) {
  return (
    <Link
      to={to}
      className="group block bg-white border border-ink-200 hover:border-ink-900 p-6 transition-colors"
    >
      <div className="flex items-start justify-between mb-5">
        <Icon
          className="w-5 h-5 text-slate group-hover:text-ink-900 transition-colors"
          strokeWidth={1.5}
        />
        {badge != null && badge > 0 && (
          <span className="text-2xs font-mono bg-ink-900 text-cream px-1.5 py-0.5 tabular-nums">
            {badge}
          </span>
        )}
      </div>
      <div className="text-2xs uppercase tracking-widest text-slate mb-2">{label}</div>
      <div className="font-display text-2xl text-ink-900 mb-1 leading-tight">{primary}</div>
      {secondary && <div className="text-xs text-ink-500 truncate">{secondary}</div>}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5">{children}</dl>
  )
}

export function Stat({
  label,
  value,
  large,
}: {
  label: string
  value: ReactNode
  large?: boolean
}) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-widest text-slate mb-1.5">{label}</dt>
      <dd className={large ? 'font-display text-2xl text-ink-900' : 'text-sm text-ink-900'}>
        {value}
      </dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------
export function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-ink-900 text-cream text-sm hover:bg-ink-700 disabled:opacity-50 transition-colors ${className}`}
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  onClick,
  type = 'button',
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-ink-200 text-ink-900 text-sm hover:border-ink-900 disabled:opacity-50 transition-colors bg-white ${className}`}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'positive' | 'warning' | 'info' | 'dark'
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-ink-100 text-ink-700',
    positive: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    info: 'bg-blue-50 text-blue-700',
    dark: 'bg-ink-900 text-cream',
  }
  return (
    <span
      className={`text-2xs uppercase tracking-widest px-2.5 py-1 ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

// Empty-state shell
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="border border-ink-200 bg-white p-12 text-center">
      <Icon className="w-10 h-10 text-ink-300 mx-auto mb-4" strokeWidth={1.5} />
      <h2 className="font-display text-xl text-ink-900 mb-2">{title}</h2>
      <p className="text-sm text-ink-600 max-w-md mx-auto mb-6 leading-relaxed">{body}</p>
      {action}
    </div>
  )
}
