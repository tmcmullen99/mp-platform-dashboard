// Sprint C — Agent "Analyze a property" workspace (/analyze).
//
// One screen to turn raw seller paperwork into buyer-facing intelligence:
//   1. Pick a client, then one of their saved listings (client_external_listings)
//      — or analyze a bare address with no listing bound.
//   2. Two drop zones: the combined disclosure PDF and the MLS CMA PDF.
//   3. Each upload goes to the private `disclosures` bucket under the
//      tenant-id folder (storage RLS keys on foldername[1] = tenant_id), the
//      file path is written onto a property_analyses row, then the matching
//      Edge Function is invoked (analyze_disclosure / analyze_cma). Both write
//      drafts asynchronously and email the agent.
//   4. The row's disclosure_status / cma_status are polled so the card shows
//      live progress (pending → analyzing → draft → published / failed).
//
// The heavy lifting lives in the backend; this surface is the intake + status
// board. Review/approve happens on /analyze/:id.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Upload, Loader2, FileText, FileBarChart2, CheckCircle2, AlertTriangle,
  ChevronRight, Home as HomeIcon, Plus, RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, SUPABASE_URL, Client, ExternalListing } from '@/lib/supabase'

// Mirror of the property_analyses columns this surface reads. Kept local
// (not in supabase.ts) so Sprint C ships self-contained; promote later if
// another module needs it.
type AnalysisStatus = 'pending' | 'analyzing' | 'draft' | 'published' | 'failed' | 'none'

type PropertyAnalysis = {
  id: string
  tenant_id: string
  client_external_listing_id: string | null
  address: string | null
  disclosure_status: AnalysisStatus
  disclosure_file_path: string | null
  disclosure_pages: number | null
  disclosure_error: string | null
  condition_score: number | null
  repair_budget_low: number | null
  repair_budget_high: number | null
  condition_verdict: string | null
  cma_id: string | null
  cma_status: AnalysisStatus
  cma_file_path: string | null
  cma_error: string | null
  created_at: string
  updated_at: string
}

const ANALYZING = new Set<AnalysisStatus>(['analyzing'])

const money = (n: number | null) =>
  n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function Analyze() {
  const { currentTenant, session } = useAuth()
  const tenantId = currentTenant?.id || null

  const [clients, setClients] = useState<Client[]>([])
  const [listings, setListings] = useState<ExternalListing[]>([])
  const [analyses, setAnalyses] = useState<PropertyAnalysis[]>([])

  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedListingId, setSelectedListingId] = useState('')
  const [manualAddress, setManualAddress] = useState('')

  const [busy, setBusy] = useState<null | 'disclosure' | 'cma'>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingAnalyses, setLoadingAnalyses] = useState(true)

  // Load clients for the tenant.
  useEffect(() => {
    if (!tenantId) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('clients').select('*').eq('tenant_id', tenantId).order('name')
      if (!cancelled) setClients((data as Client[]) || [])
    })()
    return () => { cancelled = true }
  }, [tenantId])

  // Load the picked client's buyer-interest listings.
  useEffect(() => {
    if (!selectedClientId) { setListings([]); setSelectedListingId(''); return }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('client_external_listings')
        .select('*')
        .eq('client_id', selectedClientId)
        .order('created_at', { ascending: false })
      if (!cancelled) setListings((data as ExternalListing[]) || [])
    })()
    return () => { cancelled = true }
  }, [selectedClientId])

  // Load existing analyses for the tenant (status board).
  const loadAnalyses = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase
      .from('property_analyses')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    setAnalyses((data as PropertyAnalysis[]) || [])
    setLoadingAnalyses(false)
  }, [tenantId])

  useEffect(() => { loadAnalyses() }, [loadAnalyses])

  // Poll while anything is mid-analysis. Cheap: one indexed select every 4s,
  // only while at least one row is in the 'analyzing' state.
  const anyAnalyzing = useMemo(
    () => analyses.some((a) => ANALYZING.has(a.disclosure_status) || ANALYZING.has(a.cma_status)),
    [analyses],
  )
  useEffect(() => {
    if (!anyAnalyzing) return
    const t = setInterval(loadAnalyses, 4000)
    return () => clearInterval(t)
  }, [anyAnalyzing, loadAnalyses])

  const selectedListing = listings.find((l) => l.id === selectedListingId) || null

  // The address bound to a new analysis: listing address wins, else manual.
  const effectiveAddress = selectedListing
    ? [selectedListing.address, selectedListing.city, selectedListing.state].filter(Boolean).join(', ')
    : manualAddress.trim()

  // Find an existing analysis to reuse: same listing if one is picked, else a
  // manual-address match. Reusing keeps disclosure + CMA on a single row.
  function findExisting(): PropertyAnalysis | null {
    if (selectedListingId) {
      return analyses.find((a) => a.client_external_listing_id === selectedListingId) || null
    }
    if (effectiveAddress) {
      const norm = effectiveAddress.toLowerCase().replace(/\s+/g, ' ').trim()
      return analyses.find(
        (a) => !a.client_external_listing_id && (a.address || '').toLowerCase().replace(/\s+/g, ' ').trim() === norm,
      ) || null
    }
    return null
  }

  // Create (or fetch) the analysis row this upload belongs to.
  async function ensureAnalysisRow(): Promise<PropertyAnalysis> {
    const existing = findExisting()
    if (existing) return existing
    const { data, error: insErr } = await supabase
      .from('property_analyses')
      .insert({
        tenant_id: tenantId,
        client_external_listing_id: selectedListingId || null,
        address: effectiveAddress || null,
        created_by: session?.user?.id || null,
      })
      .select('*')
      .single()
    if (insErr || !data) throw new Error(insErr?.message || 'Could not create analysis row')
    const row = data as PropertyAnalysis
    setAnalyses((rows) => [row, ...rows])
    return row
  }

  // Shared upload handler for both drop zones.
  async function handleUpload(kind: 'disclosure' | 'cma', file: File) {
    setError(null)
    if (!tenantId) { setError('No active tenant.'); return }
    if (file.type !== 'application/pdf') { setError('Please choose a PDF.'); return }
    if (!selectedListingId && !effectiveAddress) {
      setError('Pick a listing or type an address first.')
      return
    }
    setBusy(kind)
    try {
      const row = await ensureAnalysisRow()
      const path = `${tenantId}/${row.id}/${kind}.pdf`

      // Upload to the private disclosures bucket (RLS: foldername[1] = tenant).
      const { error: upErr } = await supabase.storage
        .from('disclosures')
        .upload(path, file, { upsert: true, contentType: 'application/pdf' })
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

      // Write the file path + reset status to pending so the poller picks it up.
      const patch = kind === 'disclosure'
        ? { disclosure_file_path: path, disclosure_status: 'pending' as AnalysisStatus, disclosure_error: null }
        : { cma_file_path: path, cma_status: 'pending' as AnalysisStatus, cma_error: null }
      const { error: updErr } = await supabase.from('property_analyses').update(patch).eq('id', row.id)
      if (updErr) throw new Error(`Could not save file path: ${updErr.message}`)

      // Optimistic local status bump → 'analyzing' (the function sets it too).
      setAnalyses((rows) => rows.map((r) => r.id === row.id
        ? { ...r, ...patch, [kind === 'disclosure' ? 'disclosure_status' : 'cma_status']: 'analyzing' as AnalysisStatus }
        : r))

      // Invoke the analysis Edge Function (verify_jwt=false, but we still send
      // the bearer for consistency). Fire-and-forget: the function writes the
      // draft + emails; we poll the row for the result.
      const fn = kind === 'disclosure' ? 'analyze_disclosure' : 'analyze_cma'
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ analysis_id: row.id }),
      })
      // The function returns 200 even on handled failures (it records the error
      // on the row). Surface a transport-level failure only.
      if (!resp.ok && resp.status >= 500) {
        const t = await resp.text().catch(() => '')
        throw new Error(`Analysis service error ${resp.status}: ${t.slice(0, 200)}`)
      }
      await loadAnalyses()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const listingLabel = (l: ExternalListing) =>
    [l.address, l.city].filter(Boolean).join(', ') || l.source_url

  return (
    <div className="p-12 max-w-6xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-400 mb-2">Sprint C</div>
          <h1 className="font-display text-3xl text-ink-900">Analyze a property</h1>
          <p className="text-ink-500 mt-2 max-w-2xl text-sm leading-relaxed">
            Drop a seller's disclosure package and an MLS CMA. Claude reads both, drafts a plain-English
            Cheat Sheet with a condition score and a Bay-Area repair budget, and extracts the comps — all
            for your review before anything reaches a buyer.
          </p>
        </div>
        <button
          onClick={loadAnalyses}
          className="text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 flex items-center gap-1.5 px-3 py-2 border border-ink-200"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Intake card */}
      <div className="border border-ink-200 bg-white p-7 mb-12">
        <div className="grid md:grid-cols-2 gap-6 mb-7">
          <Field label="Client">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full border border-ink-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-ink-900"
            >
              <option value="">Select a client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <Field label="Listing">
            {selectedClientId ? (
              listings.length > 0 ? (
                <select
                  value={selectedListingId}
                  onChange={(e) => { setSelectedListingId(e.target.value); if (e.target.value) setManualAddress('') }}
                  className="w-full border border-ink-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-ink-900"
                >
                  <option value="">Address only (no saved listing)…</option>
                  {listings.map((l) => <option key={l.id} value={l.id}>{listingLabel(l)}</option>)}
                </select>
              ) : (
                <p className="text-sm text-ink-400 py-2.5">
                  No saved listings for this client. Type an address below, or add listings on their
                  Saved Properties tab.
                </p>
              )
            ) : (
              <p className="text-sm text-ink-400 py-2.5">Pick a client first.</p>
            )}
          </Field>
        </div>

        {!selectedListingId && (
          <Field label="Property address" className="mb-7">
            <input
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="542 Joost Ave, San Francisco, CA"
              className="w-full border border-ink-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-ink-900"
            />
          </Field>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          <DropZone
            kind="disclosure"
            Icon={FileText}
            title="Disclosure package"
            blurb="Combined seller disclosures as one text PDF (Disclosures.io export works best)."
            busy={busy === 'disclosure'}
            disabled={busy !== null}
            onFile={(f) => handleUpload('disclosure', f)}
          />
          <DropZone
            kind="cma"
            Icon={FileBarChart2}
            title="MLS CMA"
            blurb="The agent CMA PDF with the subject + comparable sales."
            busy={busy === 'cma'}
            disabled={busy !== null}
            onFile={(f) => handleUpload('cma', f)}
          />
        </div>
      </div>

      {/* Status board */}
      <h2 className="font-display text-xl text-ink-900 mb-4">Analyses</h2>
      {loadingAnalyses ? (
        <div className="flex items-center gap-2 text-ink-500 text-sm py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : analyses.length === 0 ? (
        <div className="border border-dashed border-ink-200 bg-white p-10 text-center text-ink-400 text-sm">
          <HomeIcon className="w-6 h-6 mx-auto mb-3 text-ink-300" />
          No analyses yet. Pick a client and drop a disclosure or CMA above to start.
        </div>
      ) : (
        <div className="space-y-2">
          {analyses.map((a) => (
            <Link
              key={a.id}
              to={`/analyze/${a.id}`}
              className="flex items-center gap-4 border border-ink-200 bg-white px-5 py-4 hover:border-ink-400 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink-900 truncate">{a.address || 'Untitled property'}</div>
                <div className="flex items-center gap-3 mt-1.5 text-2xs uppercase tracking-widest">
                  <StatusPill label="Disclosure" status={a.disclosure_status} />
                  <StatusPill label="CMA" status={a.cma_status} />
                  {a.condition_score != null && (
                    <span className="text-ink-400">Score {a.condition_score}/100</span>
                  )}
                  {(a.repair_budget_low != null || a.repair_budget_high != null) && (
                    <span className="text-ink-400">
                      Repairs {money(a.repair_budget_low)}–{money(a.repair_budget_high)}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-ink-600 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/* -------------------------------- pieces -------------------------------- */

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">{label}</label>
      {children}
    </div>
  )
}

function DropZone({
  kind, Icon, title, blurb, busy, disabled, onFile,
}: {
  kind: 'disclosure' | 'cma'
  Icon: React.ComponentType<{ className?: string }>
  title: string
  blurb: string
  busy: boolean
  disabled: boolean
  onFile: (f: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  function pick(files: FileList | null) {
    const f = files?.[0]
    if (f) onFile(f)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); if (!disabled) pick(e.dataTransfer.files) }}
      onClick={() => { if (!disabled) inputRef.current?.click() }}
      className={`relative border-2 border-dashed p-7 text-center cursor-pointer transition-colors ${
        drag ? 'border-blue-600 bg-blue-50/40' : 'border-ink-200 hover:border-ink-400 bg-cream'
      } ${disabled && !busy ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />
      {busy ? (
        <Loader2 className="w-6 h-6 mx-auto mb-3 text-blue-700 animate-spin" />
      ) : (
        <Icon className="w-6 h-6 mx-auto mb-3 text-ink-400" />
      )}
      <div className="font-medium text-ink-900">{title}</div>
      <p className="text-xs text-ink-500 mt-1.5 leading-relaxed max-w-xs mx-auto">{blurb}</p>
      <div className="inline-flex items-center gap-1.5 mt-4 text-2xs uppercase tracking-widest text-ink-600">
        {busy ? 'Uploading…' : <><Upload className="w-3 h-3" /> Drop PDF or click</>}
      </div>
    </div>
  )
}

function StatusPill({ label, status }: { label: string; status: AnalysisStatus }) {
  const map: Record<AnalysisStatus, { text: string; cls: string; Icon?: React.ComponentType<{ className?: string }> }> = {
    none: { text: '—', cls: 'text-ink-300' },
    pending: { text: 'Queued', cls: 'text-ink-500', Icon: Plus },
    analyzing: { text: 'Analyzing', cls: 'text-blue-700', Icon: Loader2 },
    draft: { text: 'Draft', cls: 'text-amber-700', Icon: FileText },
    published: { text: 'Published', cls: 'text-emerald-700', Icon: CheckCircle2 },
    failed: { text: 'Failed', cls: 'text-red-700', Icon: AlertTriangle },
  }
  const s = map[status] || map.none
  const Ic = s.Icon
  return (
    <span className={`inline-flex items-center gap-1 ${s.cls}`}>
      <span className="text-ink-400">{label}:</span>
      {Ic && <Ic className={`w-3 h-3 ${status === 'analyzing' ? 'animate-spin' : ''}`} />}
      {s.text}
    </span>
  )
}
