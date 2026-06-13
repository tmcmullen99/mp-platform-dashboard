// P-Onb.2 — OnboardingWizard. The concierge first-run flow for a new agent.
// Paste your website → onboard_from_web extracts your identity → review + live
// branded preview → save to tenant_branding. Tech-savvy agents can "set it up
// myself" (skip extraction), and everyone can skip entirely. Full-screen (no
// dashboard chrome); wired at /onboarding in App.tsx behind the onboarded_at gate.
//
// Both "Save & finish" and "Skip for now" stamp tenant_branding.onboarded_at so a
// new agent is routed into the wizard exactly once and never bounces back into it.
// On exit we hard-navigate to "/" so AuthContext re-reads branding (incl. the fresh
// onboarded_at) and the gate releases — no AuthContext changes required.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2,
  Globe,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { supabase, TenantBranding } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type Step = 'ask' | 'extracting' | 'review'

// Flat form draft — assembled into social_links (record) + service_areas (array)
// on save, mirroring the proven Settings.tsx write contract.
type Draft = {
  agent_name: string
  agent_title: string
  brokerage_affiliation: string
  dre_license: string
  agent_email: string
  agent_phone: string
  agent_bio: string
  agent_photo_url: string
  logo_url: string
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  heading_font: string
  body_font: string
  service_areas: string // comma-separated in the form; split on save
  hero_title: string
  hero_subtitle: string
  hero_image_url: string
  instagram: string
  facebook: string
  linkedin: string
  youtube: string
  zillow: string
}

const DEFAULTS: Draft = {
  agent_name: '', agent_title: '', brokerage_affiliation: '', dre_license: '',
  agent_email: '', agent_phone: '', agent_bio: '', agent_photo_url: '', logo_url: '',
  primary_color: '#1a1f2e', secondary_color: '#91a1ba', accent_color: '#353535',
  background_color: '#ffffff', heading_font: 'Playfair Display', body_font: 'DM Sans',
  service_areas: '', hero_title: '', hero_subtitle: '', hero_image_url: '',
  instagram: '', facebook: '', linkedin: '', youtube: '', zillow: '',
}

const PROGRESS = [
  'Reading your website…',
  'Pulling your branding and colors…',
  'Finding your headshot and logo…',
  'Reading your bio and service areas…',
  'Looking for your listings…',
  'Assembling your workspace…',
]

// The shape onboard_from_web returns inside { ok, extracted }.
type Extracted = {
  branding?: {
    primary_color?: string | null
    secondary_color?: string | null
    accent_color?: string | null
    background_color?: string | null
    heading_font?: string | null
    body_font?: string | null
    logo_url?: string | null
  } | null
  profile?: {
    agent_name?: string | null
    agent_title?: string | null
    agent_bio?: string | null
    agent_photo_url?: string | null
    agent_email?: string | null
    agent_phone?: string | null
    dre_license?: string | null
    brokerage_affiliation?: string | null
    service_areas?: string[] | null
    social_links?: Record<string, string | null> | null
  } | null
  site?: {
    hero_title?: string | null
    hero_subtitle?: string | null
    hero_image_url?: string | null
  } | null
  listings?: unknown[] | null
}

type ExtractResponse = {
  ok: boolean
  extracted?: Extracted
  fallback?: boolean
  reason?: string
}

function seedFromBranding(b: TenantBranding | null): Draft {
  if (!b) return { ...DEFAULTS }
  const s = b.social_links || {}
  return {
    agent_name: b.agent_name || '',
    agent_title: b.agent_title || '',
    brokerage_affiliation: b.brokerage_affiliation || '',
    dre_license: b.dre_license || '',
    agent_email: b.agent_email || '',
    agent_phone: b.agent_phone || '',
    agent_bio: b.agent_bio || '',
    agent_photo_url: b.agent_photo_url || '',
    logo_url: b.logo_url || '',
    primary_color: b.primary_color || DEFAULTS.primary_color,
    secondary_color: b.secondary_color || DEFAULTS.secondary_color,
    accent_color: b.accent_color || DEFAULTS.accent_color,
    background_color: b.background_color || DEFAULTS.background_color,
    heading_font: b.heading_font || DEFAULTS.heading_font,
    body_font: b.body_font || DEFAULTS.body_font,
    service_areas: (b.service_areas || []).join(', '),
    hero_title: b.hero_title || '',
    hero_subtitle: b.hero_subtitle || '',
    hero_image_url: b.hero_image_url || '',
    instagram: s.instagram || '',
    facebook: s.facebook || '',
    linkedin: s.linkedin || '',
    youtube: s.youtube || '',
    zillow: s.zillow || '',
  }
}

function mergeExtracted(base: Draft, e: Extracted): Draft {
  const br = e.branding || {}
  const pr = e.profile || {}
  const si = e.site || {}
  const sl = pr.social_links || {}
  const pick = (v: string | null | undefined, fallback: string) =>
    v && String(v).trim() ? String(v).trim() : fallback
  return {
    agent_name: pick(pr.agent_name, base.agent_name),
    agent_title: pick(pr.agent_title, base.agent_title),
    brokerage_affiliation: pick(pr.brokerage_affiliation, base.brokerage_affiliation),
    dre_license: pick(pr.dre_license, base.dre_license),
    agent_email: pick(pr.agent_email, base.agent_email),
    agent_phone: pick(pr.agent_phone, base.agent_phone),
    agent_bio: pick(pr.agent_bio, base.agent_bio),
    agent_photo_url: pick(pr.agent_photo_url, base.agent_photo_url),
    logo_url: pick(br.logo_url, base.logo_url),
    primary_color: pick(br.primary_color, base.primary_color),
    secondary_color: pick(br.secondary_color, base.secondary_color),
    accent_color: pick(br.accent_color, base.accent_color),
    background_color: pick(br.background_color, base.background_color),
    heading_font: pick(br.heading_font, base.heading_font),
    body_font: pick(br.body_font, base.body_font),
    service_areas: (pr.service_areas && pr.service_areas.length)
      ? pr.service_areas.join(', ')
      : base.service_areas,
    hero_title: pick(si.hero_title, base.hero_title),
    hero_subtitle: pick(si.hero_subtitle, base.hero_subtitle),
    hero_image_url: pick(si.hero_image_url, base.hero_image_url),
    instagram: pick(sl.instagram, base.instagram),
    facebook: pick(sl.facebook, base.facebook),
    linkedin: pick(sl.linkedin, base.linkedin),
    youtube: pick(sl.youtube, base.youtube),
    zillow: pick(sl.zillow, base.zillow),
  }
}

export default function OnboardingWizard() {
  const navigate = useNavigate()
  const { currentTenant, currentBranding } = useAuth()

  const [step, setStep] = useState<Step>('ask')
  const [url, setUrl] = useState('')
  const [instagram, setInstagram] = useState('')
  const [zillow, setZillow] = useState('')
  const [showExtras, setShowExtras] = useState(false)
  const [draft, setDraft] = useState<Draft>(DEFAULTS)
  const [listingsFound, setListingsFound] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressIdx, setProgressIdx] = useState(0)
  const progressTimer = useRef<number | null>(null)

  // Seed from any branding that already exists (re-visits / fast lane).
  useEffect(() => {
    setDraft(seedFromBranding(currentBranding))
  }, [currentBranding])

  // Rotate the progress messages while extracting.
  useEffect(() => {
    if (step === 'extracting') {
      setProgressIdx(0)
      progressTimer.current = window.setInterval(() => {
        setProgressIdx((i) => (i + 1) % PROGRESS.length)
      }, 1800)
    } else if (progressTimer.current) {
      window.clearInterval(progressTimer.current)
      progressTimer.current = null
    }
    return () => {
      if (progressTimer.current) {
        window.clearInterval(progressTimer.current)
        progressTimer.current = null
      }
    }
  }, [step])

  function upd<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  async function runExtraction() {
    const clean = url.trim()
    if (!/^https?:\/\//i.test(clean)) {
      setError('Enter your website starting with https://')
      return
    }
    setError(null)
    setNotice(null)
    setListingsFound(0)
    setStep('extracting')

    const extraUrls = [instagram.trim(), zillow.trim()].filter((u) => /^https?:\/\//i.test(u))

    try {
      const { data, error: fnErr } = await supabase.functions.invoke<ExtractResponse>(
        'onboard_from_web',
        { body: { url: clean, extraUrls } },
      )
      if (fnErr) throw fnErr

      if (data?.ok && data.extracted) {
        setDraft((prev) => mergeExtracted(prev, data.extracted as Extracted))
        const n = Array.isArray(data.extracted.listings) ? data.extracted.listings.length : 0
        setListingsFound(n)
        setNotice(null)
      } else {
        // Graceful fallback — site blocked / unreadable. Let them fill it in.
        setNotice(
          data?.reason
            ? `We couldn't fully read that site (${data.reason}). Fill in what you can below — you can always change it later in Settings.`
            : "We couldn't read that site automatically. Fill in what you can below — you can always change it later in Settings.",
        )
      }
    } catch (e) {
      setNotice(
        `Extraction hit an error (${e instanceof Error ? e.message : String(e)}). You can still set everything up by hand below.`,
      )
    } finally {
      setStep('review')
    }
  }

  function setUpManually() {
    setError(null)
    setNotice(null)
    setDraft(seedFromBranding(currentBranding))
    setStep('review')
  }

  // Builds the tenant_branding payload from the flat draft. `markOnboarded`
  // stamps onboarded_at so the gate releases (used by both finish and skip).
  function buildPayload(d: Draft, markOnboarded: boolean) {
    const social: Record<string, string> = {}
    const addSocial = (k: string, v: string) => {
      if (v.trim()) social[k] = v.trim()
    }
    addSocial('instagram', d.instagram)
    addSocial('facebook', d.facebook)
    addSocial('linkedin', d.linkedin)
    addSocial('youtube', d.youtube)
    addSocial('zillow', d.zillow)

    const areas = d.service_areas
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)

    const payload: Record<string, unknown> = {
      logo_url: d.logo_url || null,
      primary_color: d.primary_color,
      secondary_color: d.secondary_color,
      accent_color: d.accent_color,
      background_color: d.background_color,
      heading_font: d.heading_font,
      body_font: d.body_font,
      agent_name: d.agent_name || null,
      agent_title: d.agent_title || null,
      agent_bio: d.agent_bio || null,
      agent_photo_url: d.agent_photo_url || null,
      agent_email: d.agent_email || null,
      agent_phone: d.agent_phone || null,
      dre_license: d.dre_license || null,
      brokerage_affiliation: d.brokerage_affiliation || null,
      social_links: social,
      hero_title: d.hero_title || null,
      hero_subtitle: d.hero_subtitle || null,
      hero_image_url: d.hero_image_url || null,
      service_areas: areas,
      updated_at: new Date().toISOString(),
    }
    if (markOnboarded) payload.onboarded_at = new Date().toISOString()
    return payload
  }

  async function finishOnboarding(saveBranding: boolean) {
    if (!currentTenant) {
      setError('No active workspace — try reloading.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      // On skip we still stamp onboarded_at, but don't overwrite branding with an
      // empty form — write only the marker so the agent's later Settings edits win.
      const payload = saveBranding
        ? buildPayload(draft, true)
        : { onboarded_at: new Date().toISOString(), updated_at: new Date().toISOString() }

      const { error: updErr } = await supabase
        .from('tenant_branding')
        .update(payload)
        .eq('tenant_id', currentTenant.id)
      if (updErr) throw updErr

      // Hard navigate so AuthContext re-reads branding (incl. onboarded_at) and the
      // /onboarding gate releases. Avoids a stale-state redirect loop.
      window.location.assign('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  // ---- Render ----------------------------------------------------------------

  return (
    <div className="min-h-screen bg-cream text-ink-900 font-sans">
      {/* slim header */}
      <header className="border-b border-ink-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-ink-900" />
            <span className="text-2xs uppercase tracking-widest text-ink-500">
              Workspace setup
            </span>
          </div>
          {step !== 'extracting' && (
            <button
              onClick={() => finishOnboarding(false)}
              disabled={saving}
              className="text-2xs uppercase tracking-widest text-ink-400 hover:text-ink-700 transition-colors disabled:opacity-50"
            >
              Skip for now
            </button>
          )}
        </div>
      </header>

      {step === 'ask' && (
        <main className="max-w-2xl mx-auto px-5 sm:px-6 pt-14 sm:pt-20 pb-24">
          <h1 className="font-display text-3xl sm:text-4xl leading-tight text-ink-900">
            Let's build your workspace.
          </h1>
          <p className="mt-4 text-ink-600 leading-relaxed">
            Paste your existing website and we'll read it for you — your branding,
            headshot, bio, service areas, and listings — then hand it back to confirm.
            The more you give us, the less you type.
          </p>

          <div className="mt-10">
            <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">
              Your website
            </label>
            <div className="flex items-center border border-ink-200 bg-white focus-within:border-ink-900 transition-colors">
              <span className="pl-4 text-ink-400">
                <Globe className="w-4 h-4" />
              </span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') runExtraction() }}
                placeholder="https://your-site.com"
                className="flex-1 px-3 py-3 bg-transparent outline-none text-ink-900 placeholder:text-ink-300"
              />
            </div>

            {!showExtras && (
              <button
                onClick={() => setShowExtras(true)}
                className="mt-3 text-xs text-ink-500 hover:text-ink-800 transition-colors"
              >
                + Add Instagram or Zillow (helps us learn your voice)
              </button>
            )}
            {showExtras && (
              <div className="mt-4 grid gap-3">
                <input
                  type="url"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="https://instagram.com/yourhandle"
                  className="w-full px-4 py-3 border border-ink-200 bg-white outline-none focus:border-ink-900 transition-colors text-ink-900 placeholder:text-ink-300"
                />
                <input
                  type="url"
                  value={zillow}
                  onChange={(e) => setZillow(e.target.value)}
                  placeholder="https://zillow.com/profile/you"
                  className="w-full px-4 py-3 border border-ink-200 bg-white outline-none focus:border-ink-900 transition-colors text-ink-900 placeholder:text-ink-300"
                />
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-start gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={runExtraction}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-ink-900 text-cream py-3.5 font-medium hover:bg-ink-800 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Build my workspace
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="mt-6 text-center">
              <button
                onClick={setUpManually}
                className="text-xs text-ink-500 hover:text-ink-800 transition-colors"
              >
                I'll set it up myself →
              </button>
            </div>
          </div>
        </main>
      )}

      {step === 'extracting' && (
        <main className="max-w-2xl mx-auto px-6 pt-40 pb-24 flex flex-col items-center text-center">
          <Loader2 className="w-8 h-8 animate-spin text-ink-900" />
          <p className="mt-6 font-display text-2xl text-ink-900">{PROGRESS[progressIdx]}</p>
          <p className="mt-3 text-sm text-ink-500">
            This usually takes 15–30 seconds. Hang tight.
          </p>
        </main>
      )}

      {step === 'review' && (
        <main className="max-w-5xl mx-auto px-5 sm:px-6 pt-10 sm:pt-12 pb-28">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-3xl text-ink-900">Does this look right?</h1>
              <p className="mt-2 text-ink-600">
                Edit anything below — it saves to your branding and shows up across your
                workspace and public site.
                {listingsFound > 0 && (
                  <span className="text-ink-900"> We also spotted {listingsFound} listing{listingsFound === 1 ? '' : 's'}.</span>
                )}
              </p>
            </div>
            <button
              onClick={() => { setStep('ask') }}
              className="flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Start over
            </button>
          </div>

          {notice && (
            <div className="mt-6 flex items-start gap-2 border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-ink-500" />
              <span>{notice}</span>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
            {/* form */}
            <div className="space-y-10">
              <Section title="Identity">
                <Field label="Full name" value={draft.agent_name} onChange={(v) => upd('agent_name', v)} placeholder="Jane Agent" />
                <Field label="Title" value={draft.agent_title} onChange={(v) => upd('agent_title', v)} placeholder="REALTOR®" />
                <Field label="Brokerage" value={draft.brokerage_affiliation} onChange={(v) => upd('brokerage_affiliation', v)} placeholder="Real Broker" />
                <Field label="DRE #" value={draft.dre_license} onChange={(v) => upd('dre_license', v)} placeholder="02000000" />
                <Field label="Bio" value={draft.agent_bio} onChange={(v) => upd('agent_bio', v)} placeholder="A sentence or two about how you work." textarea />
              </Section>

              <Section title="Contact">
                <Field label="Email" value={draft.agent_email} onChange={(v) => upd('agent_email', v)} placeholder="you@brokerage.com" />
                <Field label="Phone" value={draft.agent_phone} onChange={(v) => upd('agent_phone', v)} placeholder="(415) 555-0100" />
                <Field label="Service areas" value={draft.service_areas} onChange={(v) => upd('service_areas', v)} placeholder="Noe Valley, Mission, Bernal Heights" hint="Comma-separated" />
              </Section>

              <Section title="Brand">
                <div className="grid grid-cols-2 gap-4">
                  <ColorField label="Primary" value={draft.primary_color} onChange={(v) => upd('primary_color', v)} />
                  <ColorField label="Secondary" value={draft.secondary_color} onChange={(v) => upd('secondary_color', v)} />
                  <ColorField label="Accent" value={draft.accent_color} onChange={(v) => upd('accent_color', v)} />
                  <ColorField label="Background" value={draft.background_color} onChange={(v) => upd('background_color', v)} />
                </div>
                <Field label="Logo URL" value={draft.logo_url} onChange={(v) => upd('logo_url', v)} placeholder="https://…/logo.png" />
                <Field label="Headshot URL" value={draft.agent_photo_url} onChange={(v) => upd('agent_photo_url', v)} placeholder="https://…/headshot.jpg" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Heading font" value={draft.heading_font} onChange={(v) => upd('heading_font', v)} placeholder="Playfair Display" />
                  <Field label="Body font" value={draft.body_font} onChange={(v) => upd('body_font', v)} placeholder="DM Sans" />
                </div>
              </Section>

              <Section title="Homepage hero">
                <Field label="Headline" value={draft.hero_title} onChange={(v) => upd('hero_title', v)} placeholder="Helping you find home in San Francisco" />
                <Field label="Subheadline" value={draft.hero_subtitle} onChange={(v) => upd('hero_subtitle', v)} placeholder="Boutique service, market-leading results." />
                <Field label="Hero image URL" value={draft.hero_image_url} onChange={(v) => upd('hero_image_url', v)} placeholder="https://…/hero.jpg" />
              </Section>

              <Section title="Social">
                <Field label="Instagram" value={draft.instagram} onChange={(v) => upd('instagram', v)} placeholder="https://instagram.com/…" />
                <Field label="Facebook" value={draft.facebook} onChange={(v) => upd('facebook', v)} placeholder="https://facebook.com/…" />
                <Field label="LinkedIn" value={draft.linkedin} onChange={(v) => upd('linkedin', v)} placeholder="https://linkedin.com/in/…" />
                <Field label="YouTube" value={draft.youtube} onChange={(v) => upd('youtube', v)} placeholder="https://youtube.com/@…" />
                <Field label="Zillow" value={draft.zillow} onChange={(v) => upd('zillow', v)} placeholder="https://zillow.com/profile/…" />
              </Section>
            </div>

            {/* live preview */}
            <div className="lg:sticky lg:top-12 self-start">
              <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Live preview</div>
              <PreviewCard draft={draft} />
            </div>
          </div>

          {error && (
            <div className="mt-8 flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-10 flex items-center gap-4">
            <button
              onClick={() => finishOnboarding(true)}
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-ink-900 text-cream px-8 py-3.5 font-medium hover:bg-ink-800 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save &amp; finish
            </button>
            <button
              onClick={() => finishOnboarding(false)}
              disabled={saving}
              className="text-sm text-ink-500 hover:text-ink-800 transition-colors disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>
        </main>
      )}
    </div>
  )
}

// ---- Small building blocks ---------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl text-ink-900 mb-5">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  textarea,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  textarea?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
        {label}
        {hint && <span className="ml-2 normal-case tracking-normal text-ink-300">{hint}</span>}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-4 py-2.5 border border-ink-200 bg-white outline-none focus:border-ink-900 transition-colors text-ink-900 placeholder:text-ink-300 resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 border border-ink-200 bg-white outline-none focus:border-ink-900 transition-colors text-ink-900 placeholder:text-ink-300"
        />
      )}
    </label>
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
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#1a1f2e'
  return (
    <label className="block">
      <span className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">{label}</span>
      <div className="flex items-center border border-ink-200 bg-white focus-within:border-ink-900 transition-colors">
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 border-0 bg-transparent cursor-pointer p-1"
          aria-label={`${label} color picker`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#1a1f2e"
          className="flex-1 px-2 py-2.5 bg-transparent outline-none text-ink-900 placeholder:text-ink-300 font-mono text-sm"
        />
      </div>
    </label>
  )
}

function PreviewCard({ draft }: { draft: Draft }) {
  const initials = (draft.agent_name || 'Y N')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const areas = draft.service_areas
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 4)
  const headingFont = draft.heading_font ? `"${draft.heading_font}", Georgia, serif` : 'Georgia, serif'
  const bodyFont = draft.body_font ? `"${draft.body_font}", system-ui, sans-serif` : 'system-ui, sans-serif'

  return (
    <div
      className="overflow-hidden shadow-sm border border-ink-100"
      style={{ background: draft.background_color || '#ffffff' }}
    >
      <div style={{ background: draft.primary_color || '#1a1f2e', padding: '28px 28px 24px' }}>
        <div
          style={{
            width: 64, height: 64, borderRadius: '50%',
            background: draft.agent_photo_url
              ? `center/cover no-repeat url(${draft.agent_photo_url})`
              : 'rgba(255,255,255,.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: headingFont, fontSize: 22, color: '#fff',
            border: '2px solid rgba(255,255,255,.4)',
          }}
        >
          {!draft.agent_photo_url && initials}
        </div>
        <div style={{ fontFamily: headingFont, fontSize: 24, lineHeight: 1.15, color: '#fff', marginTop: 14 }}>
          {draft.agent_name || 'Your name'}
        </div>
        <div style={{ fontFamily: bodyFont, fontSize: 13, opacity: 0.85, color: '#fff', marginTop: 4 }}>
          {[draft.agent_title, draft.brokerage_affiliation].filter(Boolean).join(' · ') || 'Title · Brokerage'}
        </div>
      </div>
      <div style={{ padding: '22px 28px', fontFamily: bodyFont }}>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#374151', margin: 0 }}>
          {draft.agent_bio || 'Your bio will appear here — a sentence or two about who you are and how you work.'}
        </p>
        {areas.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
            {areas.map((a) => (
              <span
                key={a}
                style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 999,
                  background: draft.secondary_color || '#91a1ba', color: '#fff',
                }}
              >
                {a}
              </span>
            ))}
          </div>
        )}
        <button
          style={{
            marginTop: 20, width: '100%', padding: '11px 0', borderRadius: 8, border: 'none',
            background: draft.accent_color || draft.primary_color || '#1a1f2e', color: '#fff',
            fontFamily: bodyFont, fontSize: 14, fontWeight: 600, cursor: 'default',
          }}
        >
          Work with {draft.agent_name ? draft.agent_name.split(' ')[0] : 'me'}
        </button>
      </div>
    </div>
  )
}
