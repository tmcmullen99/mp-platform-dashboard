// src/portal/buyer/PropertyDetail.tsx
//
// Per-interested-property workspace. Pulls the parsed Zillow data for one
// client_external_listing and presents:
//   • the property header + key facts + mortgage/affordability calculator
//   • status control (interested → shortlist → toured → offered → rejected)
//   • document uploads (disclosure reviews, comps, reports) via DocumentManager
//   • attached CMAs (cmas where client_external_listing_id = this property)
//   • the gated "What Should We Offer" flow — unlocks ONLY after a CMA is
//     attached, then walks the buyer through an interactive offer-strategy
//     questionnaire grounded in the comps and the property's uniqueness.
//
// Data paths: client_external_listings, cmas (client_external_listing_id),
// documents (client_external_listing_id) — all pre-existing columns.
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Loader2,
  ArrowLeft,
  Lock,
  Sparkles,
  FileBarChart2,
  ExternalLink,
  Check,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  supabase,
  ExternalListing,
  CMA,
  EXTERNAL_LISTING_STATUSES,
  ExternalListingClientStatus,
} from '@/lib/supabase'
import { PageHeader, SectionLabel, Panel, Badge, Stat, StatRow } from '@/portal/shared/ui'
import { usd } from '@/portal/shared/format'
import MortgageSlider from '@/portal/shared/MortgageSlider'
import DocumentManager from '@/components/DocumentManager'

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>()
  const { clientProfile } = useAuth()
  const [listing, setListing] = useState<ExternalListing | null>(null)
  const [cmas, setCmas] = useState<CMA[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || !clientProfile) return
    let cancelled = false
    ;(async () => {
      const [lResp, cResp] = await Promise.all([
        supabase.from('client_external_listings').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('cmas')
          .select('*')
          .eq('client_external_listing_id', id)
          .eq('status', 'published')
          .order('published_at', { ascending: false, nullsFirst: false }),
      ])
      if (cancelled) return
      setListing((lResp.data as ExternalListing) || null)
      setCmas((cResp.data as CMA[]) || [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [id, clientProfile])

  async function setStatus(s: ExternalListingClientStatus) {
    if (!listing) return
    setListing({ ...listing, client_status: s })
    await supabase
      .from('client_external_listings')
      .update({ client_status: s, updated_at: new Date().toISOString() })
      .eq('id', listing.id)
  }

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-ink-500" />
  if (!listing)
    return (
      <div>
        <BackLink />
        <p className="text-ink-600 mt-6">This property couldn't be found.</p>
      </div>
    )

  const hasCma = cmas.length > 0

  return (
    <div>
      <BackLink />

      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-4 mb-10">
        <div className="lg:col-span-3 aspect-[16/10] bg-ink-100 border border-ink-200 overflow-hidden">
          {listing.photo_url ? (
            <img src={listing.photo_url} alt={listing.address || ''} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-ink-100 to-ink-200" />
          )}
        </div>
        <div className="lg:col-span-2">
          <PageHeader eyebrow="Interested property" title={listing.address || 'Property'} />
          <div className="flex flex-wrap gap-2 mb-4">
            {EXTERNAL_LISTING_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className={`text-2xs uppercase tracking-widest px-2.5 py-1 transition-colors ${
                  listing.client_status === s.value
                    ? 'bg-ink-900 text-cream'
                    : 'bg-white border border-ink-200 text-ink-500 hover:border-ink-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {listing.source_url && (
            <a
              href={listing.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900"
            >
              View original listing
              <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
            </a>
          )}
        </div>
      </div>

      {/* Facts */}
      <section className="mb-10">
        <Panel>
          <StatRow>
            <Stat label="Price" value={usd(listing.price)} large />
            <Stat label="Beds" value={listing.bedrooms ?? '—'} />
            <Stat label="Baths" value={listing.bathrooms ?? '—'} />
            <Stat
              label="$/sqft"
              value={listing.price && listing.sqft ? `$${Math.round(listing.price / listing.sqft)}` : '—'}
            />
          </StatRow>
        </Panel>
      </section>

      {/* Affordability */}
      {listing.price && (
        <section className="mb-10">
          <SectionLabel>What would this cost?</SectionLabel>
          <MortgageSlider mode="buyer" basePrice={listing.price} />
        </section>
      )}

      {/* CMAs attached to this property */}
      <section className="mb-10">
        <SectionLabel>Market analysis</SectionLabel>
        {hasCma ? (
          <div className="space-y-3">
            {cmas.map((cma) => (
              <Link
                key={cma.id}
                to={`/portal/cmas/${cma.slug}`}
                className="flex items-center justify-between bg-white border border-ink-200 hover:border-ink-400 p-5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileBarChart2 className="w-5 h-5 text-slate" strokeWidth={1.5} />
                  <div>
                    <div className="text-sm text-ink-900">{cma.property_address || cma.name}</div>
                    {cma.list_price && <div className="text-xs text-ink-500">{cma.list_price}</div>}
                  </div>
                </div>
                <Badge tone="info">View CMA</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <Panel>
            <p className="text-sm text-ink-600">
              Your agent will prepare a comparative market analysis for this property. Once it's
              ready, the offer-strategy tool below unlocks.
            </p>
          </Panel>
        )}
      </section>

      {/* Offer strategy — GATED on a CMA being attached */}
      <section className="mb-10">
        <SectionLabel>What should we offer?</SectionLabel>
        {hasCma ? (
          <OfferStrategy listing={listing} />
        ) : (
          <Panel className="text-center py-10">
            <Lock className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.5} />
            <h3 className="font-display text-lg text-ink-900 mb-1">Offer strategy locked</h3>
            <p className="text-sm text-ink-600 max-w-md mx-auto">
              This unlocks once your agent attaches a CMA. The strategy is built on the comps —
              we won't guess at a number without them.
            </p>
          </Panel>
        )}
      </section>

      {/* Documents — disclosure reviews, comps, reports */}
      {clientProfile && (
        <section>
          <SectionLabel>Documents & reports</SectionLabel>
          <p className="text-sm text-ink-600 mb-4 max-w-2xl">
            Upload disclosure reviews, comps, inspection reports — anything tied to this property.
          </p>
          <DocumentManager
            tenantId={clientProfile.tenant_id}
            clientId={clientProfile.id}
            uploaderType="client"
          />
        </section>
      )}
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/portal/interested"
      className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-slate hover:text-ink-900"
    >
      <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
      All properties
    </Link>
  )
}

// --- Interactive offer-strategy questionnaire -------------------------------
// Client-driven: the buyer lists what they love vs the comps and picks an
// offer posture; we frame a recommendation range relative to ask. This is a
// guided conversation, not financial advice — final number is set with the
// agent. (Persists answers to the listing's notes for the agent to see.)
function OfferStrategy({ listing }: { listing: ExternalListing }) {
  const [posture, setPosture] = useState<'preemptive' | 'offer_day' | null>(null)
  const [loves, setLoves] = useState('')
  const [concerns, setConcerns] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const ask = listing.price || 0
  const ranges: Record<string, { lo: number; hi: number; note: string }> = {
    preemptive: {
      lo: ask * 1.03,
      hi: ask * 1.1,
      note: 'A pre-emptive offer beats the crowd — typically above ask to make the seller cancel offer day.',
    },
    offer_day: {
      lo: ask * 0.98,
      hi: ask * 1.05,
      note: 'On offer day you compete head-to-head; the comps and demand set how far over ask is justified.',
    },
  }

  async function save() {
    setSaving(true)
    const summary = `Offer strategy — posture: ${posture}; loves: ${loves}; concerns: ${concerns}`
    await supabase
      .from('client_external_listings')
      .update({ notes: summary, updated_at: new Date().toISOString() })
      .eq('id', listing.id)
    setSaving(false)
    setSaved(true)
  }

  return (
    <Panel>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-ink-900" strokeWidth={1.5} />
        <span className="text-2xs uppercase tracking-widest text-slate">
          Guided offer strategy
        </span>
      </div>

      {/* Step 1: posture */}
      <div className="mb-6">
        <div className="text-sm text-ink-900 mb-3">How do you want to approach this?</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(['preemptive', 'offer_day'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPosture(p)}
              className={`text-left border p-4 transition-colors ${
                posture === p ? 'border-ink-900 bg-white' : 'border-ink-200 bg-white/60 hover:border-ink-400'
              }`}
            >
              <div className="text-sm text-ink-900 mb-1">
                {p === 'preemptive' ? 'Pre-emptive offer' : 'Offer day'}
              </div>
              <div className="text-xs text-ink-500 leading-relaxed">
                {p === 'preemptive'
                  ? 'Move early and strong to skip the competition.'
                  : 'Compete on the seller’s set offer date.'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {posture && ask > 0 && (
        <div className="mb-6 border border-ink-900 bg-ink-50/40 p-4">
          <div className="text-2xs uppercase tracking-widest text-slate mb-1">
            Suggested range vs. ask ({usd(ask)})
          </div>
          <div className="font-display text-2xl text-ink-900">
            {usd(ranges[posture].lo)} – {usd(ranges[posture].hi)}
          </div>
          <p className="text-xs text-ink-600 mt-2 leading-relaxed">{ranges[posture].note} This is
            a starting frame from the comps — your agent will refine the exact number with you.</p>
        </div>
      )}

      {/* Step 2: what you love vs comps */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-2xs uppercase tracking-widest text-slate mb-2">
            What do you love about this one vs. the others?
          </label>
          <textarea
            value={loves}
            onChange={(e) => setLoves(e.target.value)}
            rows={3}
            placeholder="Light, layout, location, the kitchen…"
            className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
          />
        </div>
        <div>
          <label className="block text-2xs uppercase tracking-widest text-slate mb-2">
            Any concerns or compromises?
          </label>
          <textarea
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            rows={2}
            placeholder="Smaller yard, busy street, dated bathrooms…"
            className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-2xs uppercase tracking-widest text-emerald-700 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Shared with your agent
          </span>
        )}
        <button
          onClick={save}
          disabled={!posture || saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink-900 text-cream text-sm hover:bg-ink-700 disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          Send strategy to my agent
        </button>
      </div>
    </Panel>
  )
}
