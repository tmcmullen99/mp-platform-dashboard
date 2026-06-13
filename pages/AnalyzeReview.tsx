// Sprint C — Agent review & publish surface (/analyze/:id).
//
// Where the agent corrects what only they'd know, then publishes to the buyer:
//   • Left column — the disclosure side. Editable cheat_sheet_html (the document
//     the buyer reads), plus the headline numbers the buyer's card shows:
//     condition score (0-100), repair budget low/high, the one-line verdict, and
//     an optional agent note. Saved straight to property_analyses (RLS lets the
//     tenant's agent update; the WITH CHECK is tenant-scoped).
//   • Right column — the CMA side. A live CMATemplate preview of the linked
//     buy-side CMA draft, with an editable comps table beneath it. Comp + subject
//     edits persist through the existing update_cma Edge Function (the same one
//     NewCMA uses), so the math (pricePerSqft / percentOverList) and audit log
//     stay consistent.
//   • Publish — flips disclosure_status → 'published' on the analysis and the
//     linked CMA status → 'published'. Re-opening for edits drops both back to
//     'draft'. The buyer card on /compare only reads published analyses.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Loader2, ChevronLeft, Save, CheckCircle2, AlertTriangle, RefreshCw,
  Plus, Trash2, Undo2, ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, SUPABASE_URL, CMASubject, CMAComp, CMAStatus } from '@/lib/supabase'
import CMATemplate from '@/components/CMATemplate'

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
  disclosure_analysis: { headline_caveats?: string[] } | null
  cheat_sheet_html: string | null
  condition_score: number | null
  repair_budget_low: number | null
  repair_budget_high: number | null
  condition_verdict: string | null
  agent_condition_note: string | null
  cma_id: string | null
  cma_status: AnalysisStatus
  cma_file_path: string | null
  cma_error: string | null
  created_at: string
  updated_at: string
}

type CMARowLite = {
  id: string
  slug: string | null
  status: CMAStatus
  subject_data: CMASubject | null
  comps_data: CMAComp[] | null
  agent_notes: string | null
}

const EMPTY_COMP: CMAComp = {
  address: '', city: '', listPrice: null, soldPrice: null, beds: null, bathsFull: null,
  bathsPartial: null, sqft: null, lotSqft: null, pricePerSqft: null, percentOverList: null,
  daysOnMarket: null, soldDate: '', soldDateIso: '', mls: '',
}

export default function AnalyzeReview() {
  const { id } = useParams<{ id: string }>()
  const { session, currentBranding } = useAuth()

  const [row, setRow] = useState<PropertyAnalysis | null>(null)
  const [cma, setCma] = useState<CMARowLite | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Editable disclosure-side state.
  const [cheatHtml, setCheatHtml] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [repairLow, setRepairLow] = useState<number | null>(null)
  const [repairHigh, setRepairHigh] = useState<number | null>(null)
  const [verdict, setVerdict] = useState('')
  const [agentNote, setAgentNote] = useState('')

  // Editable CMA-side state.
  const [comps, setComps] = useState<CMAComp[]>([])
  const [subject, setSubject] = useState<CMASubject | null>(null)

  const [savingDisclosure, setSavingDisclosure] = useState(false)
  const [savingCma, setSavingCma] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    const { data, error: e } = await supabase
      .from('property_analyses').select('*').eq('id', id).maybeSingle()
    if (e) { setError(e.message); setLoading(false); return }
    if (!data) { setError('Analysis not found.'); setLoading(false); return }
    const r = data as PropertyAnalysis
    setRow(r)
    setCheatHtml(r.cheat_sheet_html || '')
    setScore(r.condition_score)
    setRepairLow(r.repair_budget_low)
    setRepairHigh(r.repair_budget_high)
    setVerdict(r.condition_verdict || '')
    setAgentNote(r.agent_condition_note || '')

    if (r.cma_id) {
      const { data: c } = await supabase
        .from('cmas').select('id, slug, status, subject_data, comps_data, agent_notes').eq('id', r.cma_id).maybeSingle()
      if (c) {
        const cr = c as CMARowLite
        setCma(cr)
        setComps((cr.comps_data as CMAComp[]) || [])
        setSubject((cr.subject_data as CMASubject) || null)
      }
    } else {
      setCma(null)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  // Poll while either side is still analyzing (agent landed here from the email
  // before the function finished).
  const analyzing = !!row && (row.disclosure_status === 'analyzing' || row.cma_status === 'analyzing'
    || row.disclosure_status === 'pending' || row.cma_status === 'pending')
  useEffect(() => {
    if (!analyzing) return
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [analyzing, load])

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Save the disclosure-side edits directly to property_analyses. Editing after
  // publish drops the disclosure back to 'draft' (it's no longer the published
  // version until re-published).
  async function saveDisclosure() {
    if (!row) return
    setSavingDisclosure(true)
    setError(null)
    try {
      const nextStatus: AnalysisStatus = row.disclosure_status === 'published' ? 'draft' : row.disclosure_status
      const { error: e } = await supabase.from('property_analyses').update({
        cheat_sheet_html: cheatHtml,
        condition_score: score,
        repair_budget_low: repairLow,
        repair_budget_high: repairHigh,
        condition_verdict: verdict || null,
        agent_condition_note: agentNote || null,
        disclosure_status: nextStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', row.id)
      if (e) throw new Error(e.message)
      await load()
      flash('Disclosure saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSavingDisclosure(false)
    }
  }

  // Persist CMA comps/subject through update_cma (recomputes math + audit log).
  async function saveCma(nextStatus?: CMAStatus) {
    if (!cma) return
    setSavingCma(true)
    setError(null)
    try {
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')
      const body: Record<string, unknown> = { id: cma.id, comps_data: comps }
      if (subject) body.subject_data = subject
      if (nextStatus) body.status = nextStatus
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/update_cma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const json = await resp.json()
      if (!resp.ok || json.error) throw new Error(json.error || `Save failed: ${resp.status}`)
      await load()
      flash('Comps saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      throw e
    } finally {
      setSavingCma(false)
    }
  }

  // Publish: persist any pending edits, then flip both sides to published.
  async function publish() {
    if (!row) return
    setPublishing(true)
    setError(null)
    try {
      // Disclosure side → published (only if we have something to publish).
      if (row.disclosure_status === 'draft' || row.disclosure_status === 'published') {
        const { error: e } = await supabase.from('property_analyses').update({
          cheat_sheet_html: cheatHtml,
          condition_score: score,
          repair_budget_low: repairLow,
          repair_budget_high: repairHigh,
          condition_verdict: verdict || null,
          agent_condition_note: agentNote || null,
          disclosure_status: 'published',
          disclosure_reviewed_by: session?.user?.id || null,
          disclosure_reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', row.id)
        if (e) throw new Error(e.message)
      }
      // CMA side → published via update_cma (sets published_at server-side).
      if (cma && (cma.status === 'draft' || cma.status === 'published')) {
        await saveCma('published')
      }
      await load()
      flash('Published to the buyer card')
    } catch (e) {
      if (!(e instanceof Error) || !error) setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPublishing(false)
    }
  }

  // Comp row editing helpers.
  function patchComp(i: number, patch: Partial<CMAComp>) {
    setComps((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }
  function addComp() { setComps((cs) => [...cs, { ...EMPTY_COMP }]) }
  function removeComp(i: number) { setComps((cs) => cs.filter((_, idx) => idx !== i)) }

  const caveats = useMemo(() => row?.disclosure_analysis?.headline_caveats || [], [row])

  if (loading) {
    return (
      <div className="p-12 flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading analysis…
      </div>
    )
  }
  if (error && !row) {
    return (
      <div className="p-12 max-w-3xl">
        <p className="text-ink-600 mb-4">{error}</p>
        <Back />
      </div>
    )
  }
  if (!row) return null

  const published = row.disclosure_status === 'published' && (!cma || cma.status === 'published')

  return (
    <div className="p-5 sm:p-8 lg:p-12 max-w-6xl">
      {/* header */}
      <div className="flex items-start justify-between mb-8 gap-6">
        <div className="min-w-0">
          <Back />
          <h1 className="font-display text-3xl text-ink-900 mt-3 truncate">{row.address || 'Untitled property'}</h1>
          <div className="flex items-center gap-3 mt-2 text-2xs uppercase tracking-widest">
            <Pill label="Disclosure" status={row.disclosure_status} />
            <Pill label="CMA" status={row.cma_status} />
            {cma?.slug && (
              <Link to={`/cmas/${cma.slug}`} className="inline-flex items-center gap-1 text-ink-500 hover:text-ink-900">
                <ExternalLink className="w-3 h-3" /> View CMA
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={load} className="text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 flex items-center gap-1.5 px-3 py-2 border border-ink-200">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button
            onClick={publish}
            disabled={publishing || (row.disclosure_status !== 'draft' && row.disclosure_status !== 'published')}
            className="text-2xs uppercase tracking-widest text-white bg-blue-700 hover:bg-blue-800 flex items-center gap-1.5 px-4 py-2 disabled:opacity-40"
          >
            {publishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            {published ? 'Re-publish' : 'Publish to buyer'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {toast && (
        <div className="mb-6 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {toast}
        </div>
      )}

      {/* analyzing notice */}
      {analyzing && (
        <div className="mb-8 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 px-4 py-3">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Claude is still reading the documents — this view refreshes automatically.
        </div>
      )}
      {/* failure notices */}
      {row.disclosure_status === 'failed' && (
        <FailNotice kind="Disclosure" msg={row.disclosure_error} />
      )}
      {row.cma_status === 'failed' && (
        <FailNotice kind="CMA" msg={row.cma_error} />
      )}

      <div className="grid lg:grid-cols-2 gap-10">
        {/* ---------------- Disclosure side ---------------- */}
        <section>
          <h2 className="font-display text-xl text-ink-900 mb-1">Disclosure Cheat Sheet</h2>
          <p className="text-xs text-ink-500 mb-5">
            Correct anything only you'd know. These numbers drive the buyer's condition card.
          </p>

          {caveats.length > 0 && (
            <div className="mb-5 border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-2xs uppercase tracking-widest text-amber-700 mb-1.5">Read these first</div>
              <ul className="text-sm text-ink-800 space-y-1 list-disc pl-4">
                {caveats.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-5">
            <NumField label="Condition score" suffix="/100" value={score} onChange={setScore} min={0} max={100} />
            <NumField label="Repair budget low" value={repairLow} onChange={setRepairLow} prefix="$" />
            <NumField label="Repair budget high" value={repairHigh} onChange={setRepairHigh} prefix="$" />
          </div>

          <Labeled label="One-line verdict (shown on the buyer card)">
            <textarea
              value={verdict}
              onChange={(e) => setVerdict(e.target.value)}
              rows={2}
              className="w-full border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-ink-900"
            />
          </Labeled>

          <Labeled label="Agent note (optional — your private read for the buyer)">
            <textarea
              value={agentNote}
              onChange={(e) => setAgentNote(e.target.value)}
              rows={2}
              className="w-full border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:border-ink-900"
            />
          </Labeled>

          <Labeled label="Cheat Sheet (HTML — the document the buyer reads)">
            <textarea
              value={cheatHtml}
              onChange={(e) => setCheatHtml(e.target.value)}
              rows={16}
              className="w-full border border-ink-200 px-3 py-2 text-xs font-mono leading-relaxed focus:outline-none focus:border-ink-900"
              placeholder={row.disclosure_status === 'pending' || row.disclosure_status === 'analyzing'
                ? 'Waiting for Claude to draft the Cheat Sheet…'
                : 'No Cheat Sheet yet — drop a disclosure PDF on the Analyze page.'}
            />
          </Labeled>

          <div className="flex items-center gap-3">
            <button
              onClick={saveDisclosure}
              disabled={savingDisclosure}
              className="text-2xs uppercase tracking-widest text-ink-700 border border-ink-300 hover:border-ink-900 flex items-center gap-1.5 px-4 py-2 disabled:opacity-40"
            >
              {savingDisclosure ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save disclosure
            </button>
            {row.disclosure_status === 'published' && (
              <span className="text-2xs uppercase tracking-widest text-ink-400 flex items-center gap-1">
                <Undo2 className="w-3 h-3" /> Saving reverts to draft until re-published
              </span>
            )}
          </div>

          {/* Rendered preview of the cheat sheet */}
          {cheatHtml.trim() && (
            <div className="mt-7">
              <div className="text-2xs uppercase tracking-widest text-ink-400 mb-2">Preview</div>
              <div
                className="cheat-sheet-preview border border-ink-200 bg-white p-6 text-sm leading-relaxed max-h-[480px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: cheatHtml }}
              />
            </div>
          )}
        </section>

        {/* ---------------- CMA side ---------------- */}
        <section>
          <h2 className="font-display text-xl text-ink-900 mb-1">Comparables</h2>
          <p className="text-xs text-ink-500 mb-5">
            Extraction varies by MLS layout — verify each comp, fix anything off. $/sqft and over-ask
            recompute on save.
          </p>

          {!cma ? (
            <div className="border border-dashed border-ink-200 bg-white p-8 text-center text-ink-400 text-sm">
              {row.cma_status === 'pending' || row.cma_status === 'analyzing'
                ? 'Claude is extracting the comps…'
                : 'No CMA yet. Drop an MLS CMA PDF on the Analyze page to build one.'}
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {comps.map((c, i) => (
                  <div key={i} className="border border-ink-200 bg-white p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xs uppercase tracking-widest text-ink-400">Comp {i + 1}</span>
                      <button onClick={() => removeComp(i)} className="text-ink-300 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      value={c.address || ''}
                      onChange={(e) => patchComp(i, { address: e.target.value })}
                      placeholder="Address"
                      className="w-full border border-ink-200 px-2 py-1.5 text-sm mb-2 focus:outline-none focus:border-ink-900"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <CompNum label="List $" value={c.listPrice} onChange={(v) => patchComp(i, { listPrice: v })} />
                      <CompNum label="Sold $" value={c.soldPrice} onChange={(v) => patchComp(i, { soldPrice: v })} />
                      <CompNum label="Sqft" value={c.sqft} onChange={(v) => patchComp(i, { sqft: v })} />
                      <CompNum label="DOM" value={c.daysOnMarket} onChange={(v) => patchComp(i, { daysOnMarket: v })} />
                      <CompNum label="Beds" value={c.beds} onChange={(v) => patchComp(i, { beds: v })} />
                      <CompNum label="Baths" value={c.bathsFull} onChange={(v) => patchComp(i, { bathsFull: v })} />
                      <input
                        value={c.soldDate || ''}
                        onChange={(e) => patchComp(i, { soldDate: e.target.value })}
                        placeholder="Sold date"
                        className="border border-ink-200 px-2 py-1.5 text-sm col-span-2 focus:outline-none focus:border-ink-900"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mb-7">
                <button onClick={addComp} className="text-2xs uppercase tracking-widest text-ink-600 border border-ink-300 hover:border-ink-900 flex items-center gap-1.5 px-3 py-2">
                  <Plus className="w-3 h-3" /> Add comp
                </button>
                <button
                  onClick={() => saveCma().catch(() => {})}
                  disabled={savingCma}
                  className="text-2xs uppercase tracking-widest text-ink-700 border border-ink-300 hover:border-ink-900 flex items-center gap-1.5 px-4 py-2 disabled:opacity-40"
                >
                  {savingCma ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save comps
                </button>
              </div>

              {/* Live CMA preview */}
              {subject && (
                <div className="border border-ink-200 bg-white max-h-[640px] overflow-y-auto">
                  <CMATemplate
                    subject={subject}
                    comps={comps}
                    listingType="regular"
                    cmaType="buy"
                    commissionSettings={null}
                    agentName={currentBranding?.agent_name}
                    agentPhone={currentBranding?.agent_phone}
                    agentEmail={currentBranding?.agent_email}
                    brokerageName={currentBranding?.brokerage_affiliation}
                    agentNotes={cma.agent_notes}
                    preparedAt={row.created_at}
                  />
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

/* -------------------------------- pieces -------------------------------- */

function Back() {
  return (
    <Link to="/analyze" className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900">
      <ChevronLeft className="w-3 h-3" /> All analyses
    </Link>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">{label}</label>
      {children}
    </div>
  )
}

function NumField({
  label, value, onChange, prefix, suffix, min, max,
}: {
  label: string; value: number | null; onChange: (v: number | null) => void
  prefix?: string; suffix?: string; min?: number; max?: number
}) {
  return (
    <div>
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">{label}</label>
      <div className="flex items-center border border-ink-200 focus-within:border-ink-900">
        {prefix && <span className="pl-2 text-sm text-ink-400">{prefix}</span>}
        <input
          type="number"
          value={value ?? ''}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full px-2 py-2 text-sm focus:outline-none"
        />
        {suffix && <span className="pr-2 text-sm text-ink-400">{suffix}</span>}
      </div>
    </div>
  )
}

function CompNum({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-ink-400 mb-1">{label}</div>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="w-full border border-ink-200 px-2 py-1.5 text-sm focus:outline-none focus:border-ink-900"
      />
    </div>
  )
}

function Pill({ label, status }: { label: string; status: AnalysisStatus }) {
  const map: Record<AnalysisStatus, string> = {
    none: 'text-ink-300', pending: 'text-ink-500', analyzing: 'text-blue-700',
    draft: 'text-amber-700', published: 'text-emerald-700', failed: 'text-red-700',
  }
  const text: Record<AnalysisStatus, string> = {
    none: '—', pending: 'Queued', analyzing: 'Analyzing', draft: 'Draft', published: 'Published', failed: 'Failed',
  }
  return (
    <span className={`inline-flex items-center gap-1 ${map[status]}`}>
      <span className="text-ink-400">{label}:</span>{text[status]}
    </span>
  )
}

function FailNotice({ kind, msg }: { kind: string; msg: string | null }) {
  return (
    <div className="mb-6 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div><strong>{kind} analysis failed.</strong> {msg || 'Re-upload a text PDF from the Analyze page.'}</div>
    </div>
  )
}
