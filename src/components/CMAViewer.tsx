// P9.A2 — CMA viewer with a single client-facing design.
//   • Agent dashboard  (/cmas/:slug, embedded=false): a compact management screen
//     that links out to the public client CMA (the /share/:token page) instead of
//     re-rendering the design. One client-facing template, no admin duplicate.
//   • Client portal    (/portal/cmas/:slug, embedded=true): renders the full CMATemplate.
//   • Public /share/:token is served by SharedDoc (also renders CMATemplate).

import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Loader2, ChevronLeft, Trash2, ExternalLink, Link2, Check } from 'lucide-react'
import { supabase, CMA, CMASubject, CMAComp } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getOrCreateShareLink } from '@/lib/shares'
import CMATemplate from '@/components/CMATemplate'

type Props = {
  // If true, render the full client-facing CMA without dashboard chrome (portal).
  embedded?: boolean
}

const fmtMoney = (n: number | null | undefined) =>
  n == null || isNaN(n) ? '—' : '$' + Math.round(n).toLocaleString()

export default function CMAViewer({ embedded = false }: Props) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { currentBranding, isAgent, user } = useAuth()
  const [cma, setCma] = useState<CMA | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!slug) return
      const { data, error: e } = await supabase
        .from('cmas')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()
      if (cancelled) return
      if (e) setError(e.message)
      setCma((data as CMA) || null)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="p-12 flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading CMA…
      </div>
    )
  }
  if (error || !cma) {
    return (
      <div className="p-12 max-w-3xl">
        <p className="text-ink-600 mb-4">{error || 'CMA not found.'}</p>
        <BackLink isAgent={isAgent} />
      </div>
    )
  }

  const subject = (cma.subject_data || {
    address: cma.property_address || cma.name || 'Subject property',
    city: '',
    state: '',
    zip: '',
    listPrice: cma.list_price ? Number(cma.list_price.replace(/[^\d]/g, '')) : null,
    mls: '',
    beds: null,
    bathsFull: null,
    bathsPartial: null,
    sqft: null,
    lotSqft: null,
    yearBuilt: null,
    propertyType: '',
    garage: '',
    parking: '',
    cooling: '',
    heating: '',
    hoaMonthly: null,
    listDate: '',
    daysOnMarket: null,
    remarks: '',
  }) as CMASubject
  const comps = (cma.comps_data || []) as CMAComp[]

  async function handleDelete() {
    if (!cma) return
    if (!confirm(`Delete this CMA?\n\nThis cannot be undone.`)) return
    const { error } = await supabase.from('cmas').delete().eq('id', cma.id)
    if (error) {
      alert('Delete failed: ' + error.message)
      return
    }
    navigate(isAgent ? '/clients' : '/portal')
  }

  // Resolve (and cache) the public client-facing share link for this CMA.
  async function resolveShare(): Promise<string> {
    if (shareUrl) return shareUrl
    if (!cma) throw new Error('CMA not loaded')
    const url = await getOrCreateShareLink({
      entityKind: 'cma',
      entityId: cma.id,
      tenantId: cma.tenant_id || '',
      clientId: cma.client_id,
      createdBy: user?.id ?? null,
    })
    setShareUrl(url)
    return url
  }

  // Open the client CMA. Pre-open the tab synchronously (so it survives popup
  // blockers), then point it at the resolved share link.
  async function handleOpenClient() {
    const w = window.open('about:blank', '_blank')
    setBusy(true)
    try {
      const url = await resolveShare()
      if (w) w.location.href = url
      else window.location.href = url
    } catch (e) {
      if (w) w.close()
      alert('Could not open the client CMA: ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy() {
    setBusy(true)
    try {
      const url = await resolveShare()
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      } catch {
        window.prompt('Public client CMA link (copy):', url)
      }
    } catch (e) {
      alert('Could not create share link: ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // ---------- CLIENT PORTAL: the single client-facing design ----------
  if (embedded) {
    return (
      <CMATemplate
        subject={subject}
        comps={comps}
        agentName={currentBranding?.agent_name}
        agentPhone={currentBranding?.agent_phone}
        agentEmail={currentBranding?.agent_email}
        brokerageName={currentBranding?.brokerage_affiliation}
        agentNotes={cma.agent_notes}
        preparedAt={cma.published_at || cma.created_at}
      />
    )
  }

  // ---------- AGENT DASHBOARD: management screen, links to the client CMA ----------
  const ppsf = subject.listPrice && subject.sqft ? Math.round(subject.listPrice / subject.sqft) : null
  const baths =
    subject.bathsFull == null && subject.bathsPartial == null
      ? '—'
      : subject.bathsPartial
        ? `${subject.bathsFull ?? 0}.${subject.bathsPartial}`
        : String(subject.bathsFull ?? 0)
  const preparedAt = cma.published_at || cma.created_at
  const status = (cma.status || 'draft') as string
  const locParts = [subject.city, subject.state, subject.zip].filter(Boolean)

  return (
    <div className="p-8 md:p-12 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <BackLink isAgent={isAgent} />
        {isAgent && (
          <button
            onClick={handleDelete}
            className="text-2xs uppercase tracking-widest text-red-600 hover:text-red-700 flex items-center gap-1.5 px-3 py-2 border border-red-200"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        )}
      </div>

      <div className="border border-ink-200 bg-cream rounded-xl p-8 md:p-10">
        <div className="flex items-center gap-3 text-2xs uppercase tracking-widest text-ink-500 mb-4">
          <span>Comparative Market Analysis</span>
          <span
            className={`px-2 py-0.5 rounded-full border ${
              status === 'published'
                ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                : 'border-ink-200 text-ink-500 bg-ink-50'
            }`}
          >
            {status}
          </span>
        </div>

        <h1 className="font-display text-3xl md:text-4xl text-ink-900 leading-tight">
          {subject.address || cma.name || 'Subject property'}
        </h1>
        {locParts.length > 0 && <p className="text-ink-600 mt-1">{locParts.join(', ')}</p>}

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 mt-8 pt-8 border-t border-ink-200">
          <Fact k="List price" v={fmtMoney(subject.listPrice)} />
          <Fact k="Beds / Baths" v={`${subject.beds ?? '—'} / ${baths}`} />
          <Fact k="Living area" v={subject.sqft ? subject.sqft.toLocaleString() + ' sqft' : '—'} />
          <Fact k="$ / sqft" v={ppsf ? '$' + ppsf.toLocaleString() : '—'} />
          <Fact k="Comparables" v={String(comps.length)} />
          {preparedAt && (
            <Fact
              k="Prepared"
              v={new Date(preparedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            />
          )}
        </dl>

        <div className="flex flex-wrap items-center gap-3 mt-9">
          <button
            onClick={handleOpenClient}
            disabled={busy}
            className="inline-flex items-center gap-2 text-sm bg-ink-900 text-cream px-5 py-3 rounded-lg hover:bg-ink-800 disabled:opacity-50"
          >
            <ExternalLink className="w-4 h-4" />
            Open client CMA
          </button>
          <button
            onClick={handleCopy}
            disabled={busy}
            className="inline-flex items-center gap-2 text-sm text-ink-700 px-5 py-3 rounded-lg border border-ink-200 hover:border-ink-400 disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4" />}
            {copied ? 'Link copied' : 'Copy share link'}
          </button>
        </div>

        <p className="text-xs text-ink-500 mt-4 leading-relaxed">
          This opens the exact read-only page your client sees — the same design used in their portal.
          Updates to the CMA data flow through automatically.
        </p>
      </div>
    </div>
  )
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-widest text-ink-500 mb-1.5">{k}</dt>
      <dd className="font-display text-lg text-ink-900 leading-none">{v}</dd>
    </div>
  )
}

function BackLink({ isAgent }: { isAgent: boolean }) {
  return (
    <Link
      to={isAgent ? '/clients' : '/portal'}
      className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900"
    >
      <ChevronLeft className="w-3 h-3" />
      Back
    </Link>
  )
}
