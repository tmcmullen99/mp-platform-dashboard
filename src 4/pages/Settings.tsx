// P9.9 — Settings page. Tenant branding editor.
// Replaces the Placeholder stub that lived at /settings.
// Lets the agent edit every field on tenant_branding from the UI.
// Multi-tenant gate: without this, every new tenant onboarding required
// hand-editing the DB. With this, anyone with tenant_users membership can
// configure their own brokerage.

import { useEffect, useState } from 'react'
import {
  Loader2,
  Check,
  X as XIcon,
  Plus,
  RefreshCw,
  User,
  Phone,
  Globe,
  Palette,
  Type,
  Share2,
  MapPin,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, TenantBranding } from '@/lib/supabase'

const SOCIAL_KEYS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourname' },
  { key: 'x', label: 'X / Twitter', placeholder: 'https://x.com/yourhandle' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel' },
]

export default function Settings() {
  const { currentTenant, currentBranding, profile } = useAuth()
  const [draft, setDraft] = useState<TenantBranding | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newServiceArea, setNewServiceArea] = useState('')

  // Hydrate the form when branding loads
  useEffect(() => {
    if (currentBranding) {
      setDraft(currentBranding)
    }
  }, [currentBranding])

  function upd<K extends keyof TenantBranding>(key: K, value: TenantBranding[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
    setSaved(false)
  }

  function updSocial(key: string, value: string) {
    if (!draft) return
    const next = { ...(draft.social_links || {}) }
    if (value.trim()) {
      next[key] = value
    } else {
      delete next[key]
    }
    setDraft({ ...draft, social_links: next })
    setSaved(false)
  }

  function addServiceArea() {
    if (!draft || !newServiceArea.trim()) return
    if (draft.service_areas.includes(newServiceArea.trim())) {
      setNewServiceArea('')
      return
    }
    setDraft({
      ...draft,
      service_areas: [...draft.service_areas, newServiceArea.trim()],
    })
    setNewServiceArea('')
    setSaved(false)
  }

  function removeServiceArea(area: string) {
    if (!draft) return
    setDraft({
      ...draft,
      service_areas: draft.service_areas.filter((a) => a !== area),
    })
    setSaved(false)
  }

  async function handleSave() {
    if (!draft || !currentTenant) return
    setError(null)
    setSaving(true)
    try {
      const payload = {
        logo_url: draft.logo_url || null,
        primary_color: draft.primary_color,
        secondary_color: draft.secondary_color,
        accent_color: draft.accent_color,
        background_color: draft.background_color,
        heading_font: draft.heading_font,
        body_font: draft.body_font,
        agent_name: draft.agent_name || null,
        agent_title: draft.agent_title || null,
        agent_bio: draft.agent_bio || null,
        agent_photo_url: draft.agent_photo_url || null,
        agent_email: draft.agent_email || null,
        agent_phone: draft.agent_phone || null,
        dre_license: draft.dre_license || null,
        brokerage_affiliation: draft.brokerage_affiliation || null,
        social_links: draft.social_links || {},
        hero_title: draft.hero_title || null,
        hero_subtitle: draft.hero_subtitle || null,
        hero_image_url: draft.hero_image_url || null,
        service_areas: draft.service_areas || [],
        updated_at: new Date().toISOString(),
      }
      const { error: updateError } = await supabase
        .from('tenant_branding')
        .update(payload)
        .eq('tenant_id', currentTenant.id)
      if (updateError) throw updateError
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  if (!currentTenant) return null
  if (!draft) {
    return (
      <div className="p-12">
        <Loader2 className="w-5 h-5 animate-spin text-ink-500" />
      </div>
    )
  }

  const onlyAdminCanEdit = !profile?.is_brokerage_admin
  // For MVP we let any agent in the tenant edit. Multi-role gating lands later.

  return (
    <div className="p-12 max-w-4xl pb-32">
      {/* Hero */}
      <div className="mb-12">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Settings</div>
        <h1 className="font-display text-4xl text-ink-900 leading-tight mb-3">
          Brokerage configuration.
        </h1>
        <p className="text-ink-600 max-w-2xl leading-relaxed">
          Everything on this page renders in the client portal, the agent dashboard, and the public
          site. Save changes at the bottom — a page refresh applies them to the sidebar and login.
        </p>
        {onlyAdminCanEdit && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 mt-4 max-w-2xl">
            You’re editing settings for {currentTenant.display_name}. Changes affect every user in
            this tenant.
          </p>
        )}
      </div>

      {/* Identity */}
      <Section icon={User} title="Identity">
        <FieldGrid>
          <Field label="Agent name" colspan={2}>
            <Input value={draft.agent_name || ''} onChange={(v) => upd('agent_name', v)} />
          </Field>
          <Field label="Title">
            <Input
              value={draft.agent_title || ''}
              placeholder="Realtor, Broker, etc."
              onChange={(v) => upd('agent_title', v)}
            />
          </Field>
          <Field label="DRE license">
            <Input
              value={draft.dre_license || ''}
              placeholder="02016832"
              onChange={(v) => upd('dre_license', v)}
            />
          </Field>
          <Field label="Brokerage affiliation" colspan={2}>
            <Input
              value={draft.brokerage_affiliation || ''}
              placeholder="Real Broker"
              onChange={(v) => upd('brokerage_affiliation', v)}
            />
          </Field>
          <Field label="Bio" colspan={2}>
            <Textarea
              value={draft.agent_bio || ''}
              rows={4}
              placeholder="A few sentences about your practice. Shows on your public site."
              onChange={(v) => upd('agent_bio', v)}
            />
          </Field>
        </FieldGrid>
      </Section>

      {/* Contact */}
      <Section icon={Phone} title="Contact">
        <FieldGrid>
          <Field label="Email">
            <Input
              type="email"
              value={draft.agent_email || ''}
              placeholder="you@brokerage.com"
              onChange={(v) => upd('agent_email', v)}
            />
          </Field>
          <Field label="Phone">
            <Input
              type="tel"
              value={draft.agent_phone || ''}
              placeholder="(415) 555-1234"
              onChange={(v) => upd('agent_phone', v)}
            />
          </Field>
          <Field label="Headshot URL" colspan={2}>
            <Input
              value={draft.agent_photo_url || ''}
              placeholder="https://..."
              onChange={(v) => upd('agent_photo_url', v)}
            />
            <Hint>Paste a URL for now. Direct upload lands in P9.10.</Hint>
          </Field>
        </FieldGrid>
      </Section>

      {/* Public site copy */}
      <Section icon={Globe} title="Public site copy">
        <FieldGrid>
          <Field label="Hero title" colspan={2}>
            <Input
              value={draft.hero_title || ''}
              placeholder="A different way to sell a home."
              onChange={(v) => upd('hero_title', v)}
            />
          </Field>
          <Field label="Hero subtitle" colspan={2}>
            <Textarea
              value={draft.hero_subtitle || ''}
              rows={2}
              placeholder="A one or two sentence positioning statement."
              onChange={(v) => upd('hero_subtitle', v)}
            />
          </Field>
          <Field label="Hero image URL" colspan={2}>
            <Input
              value={draft.hero_image_url || ''}
              placeholder="https://..."
              onChange={(v) => upd('hero_image_url', v)}
            />
          </Field>
        </FieldGrid>
      </Section>

      {/* Service areas */}
      <Section icon={MapPin} title="Service areas">
        <p className="text-sm text-ink-600 mb-3">
          Neighborhoods, cities, or regions you serve. These appear on the public site and on the
          agent profile in the portal.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {draft.service_areas.map((area) => (
            <span
              key={area}
              className="inline-flex items-center gap-2 bg-ink-50 border border-ink-200 px-3 py-1.5 text-sm text-ink-900"
            >
              {area}
              <button
                onClick={() => removeServiceArea(area)}
                className="text-ink-400 hover:text-ink-900"
                title={`Remove ${area}`}
              >
                <XIcon className="w-3 h-3" strokeWidth={2} />
              </button>
            </span>
          ))}
          {draft.service_areas.length === 0 && (
            <span className="text-sm text-ink-400 italic">No service areas yet.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={newServiceArea}
            onChange={(e) => setNewServiceArea(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addServiceArea()
              }
            }}
            placeholder="e.g. Mission District"
            className="flex-1 border border-ink-200 px-3 py-2 text-sm bg-cream max-w-xs"
          />
          <button
            onClick={addServiceArea}
            disabled={!newServiceArea.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-ink-300 text-ink-800 text-2xs uppercase tracking-widest hover:border-ink-900 hover:text-ink-900 disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      </Section>

      {/* Social links */}
      <Section icon={Share2} title="Social links">
        <FieldGrid>
          {SOCIAL_KEYS.map((s) => (
            <Field key={s.key} label={s.label} colspan={2}>
              <Input
                value={draft.social_links?.[s.key] || ''}
                placeholder={s.placeholder}
                onChange={(v) => updSocial(s.key, v)}
              />
            </Field>
          ))}
        </FieldGrid>
      </Section>

      {/* Brand colors */}
      <Section icon={Palette} title="Brand colors">
        <p className="text-sm text-ink-600 mb-4">
          Override the four brand tokens. Defaults are McMullen navy / blue-gray / charcoal / cream.
        </p>
        <FieldGrid>
          <ColorField
            label="Primary"
            value={draft.primary_color}
            onChange={(v) => upd('primary_color', v)}
          />
          <ColorField
            label="Secondary"
            value={draft.secondary_color}
            onChange={(v) => upd('secondary_color', v)}
          />
          <ColorField
            label="Accent"
            value={draft.accent_color}
            onChange={(v) => upd('accent_color', v)}
          />
          <ColorField
            label="Background"
            value={draft.background_color}
            onChange={(v) => upd('background_color', v)}
          />
        </FieldGrid>
        <Hint>Color changes only apply to the public tenant site, not the dashboard chrome.</Hint>
      </Section>

      {/* Typography */}
      <Section icon={Type} title="Typography">
        <FieldGrid>
          <Field label="Heading font">
            <Input
              value={draft.heading_font}
              placeholder="Playfair Display"
              onChange={(v) => upd('heading_font', v)}
            />
          </Field>
          <Field label="Body font">
            <Input
              value={draft.body_font}
              placeholder="DM Sans"
              onChange={(v) => upd('body_font', v)}
            />
          </Field>
          <Field label="Logo URL" colspan={2}>
            <Input
              value={draft.logo_url || ''}
              placeholder="https://..."
              onChange={(v) => upd('logo_url', v)}
            />
          </Field>
        </FieldGrid>
      </Section>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-64 right-0 border-t border-ink-200 bg-cream/95 backdrop-blur px-12 py-4 flex items-center justify-between z-30">
        <div className="text-2xs uppercase tracking-widest text-ink-500">
          {saving ? (
            'Saving…'
          ) : saved ? (
            <span className="text-emerald-700 inline-flex items-center gap-1.5">
              <Check className="w-3 h-3" strokeWidth={2} />
              Saved · refresh to see changes in sidebar
            </span>
          ) : error ? (
            <span className="text-red-700">{error}</span>
          ) : (
            <span className="text-ink-400">
              Editing {currentTenant.display_name} · {currentTenant.slug}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-ink-300 text-ink-800 text-2xs uppercase tracking-widest hover:border-ink-900 hover:text-ink-900"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// UI atoms
// ============================================================

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-12 pb-12 border-b border-ink-100 last:border-b-0">
      <div className="flex items-center gap-3 mb-6">
        <Icon className="w-4 h-4 text-ink-500" strokeWidth={1.5} />
        <h2 className="text-2xs uppercase tracking-widest text-ink-900">{title}</h2>
        <div className="flex-1 h-px bg-ink-100" />
      </div>
      {children}
    </section>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
}

function Field({
  label,
  children,
  colspan,
}: {
  label: string
  children: React.ReactNode
  colspan?: number
}) {
  const cls = colspan === 2 ? 'md:col-span-2' : ''
  return (
    <div className={cls}>
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type || 'text'}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-ink-200 px-3 py-2 text-sm bg-cream focus:outline-none focus:border-ink-900 transition-colors"
    />
  )
}

function Textarea({
  value,
  onChange,
  rows,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      rows={rows || 3}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-ink-200 px-3 py-2 text-sm bg-cream focus:outline-none focus:border-ink-900 transition-colors leading-relaxed"
    />
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 border border-ink-200 cursor-pointer bg-cream shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border border-ink-200 px-3 py-2 text-sm bg-cream font-mono focus:outline-none focus:border-ink-900"
        />
      </div>
    </Field>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-2xs uppercase tracking-widest text-ink-400 mt-2 leading-relaxed">
      {children}
    </p>
  )
}
