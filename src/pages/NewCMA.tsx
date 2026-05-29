// P9.1 — Agent-side CMA creation. PDF upload → Claude extraction (extract_cma_pdf
// Edge Function) → editable review form → save to cmas table linked to a client/deal.
// P9.4 — Adds listing_type selector (Regular 2.5% vs MMM Campbell double-end 3%).

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Upload,
  Loader2,
  Save,
  X,
  Plus,
  Trash2,
  FileText,
  ChevronLeft,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  supabase,
  SUPABASE_URL,
  Client,
  Deal,
  CMASubject,
  CMAComp,
} from '@/lib/supabase'

type ListingType = 'regular' | 'mmm'

const EMPTY_SUBJECT: CMASubject = {
  address: '',
  city: '',
  state: '',
  zip: '',
  listPrice: null,
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
}

const EMPTY_COMP: CMAComp = {
  address: '',
  city: '',
  listPrice: null,
  soldPrice: null,
  beds: null,
  bathsFull: null,
  bathsPartial: null,
  sqft: null,
  lotSqft: null,
  pricePerSqft: null,
  percentOverList: null,
  daysOnMarket: null,
  soldDate: '',
  soldDateIso: '',
  mls: '',
}

export default function NewCMA() {
  const { currentTenant, session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetClientId = searchParams.get('client') || ''

  const [clients, setClients] = useState<Client[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>(presetClientId)
  const [selectedDealId, setSelectedDealId] = useState<string>('')

  const [listingType, setListingType] = useState<ListingType>('regular')

  const [subject, setSubject] = useState<CMASubject>(EMPTY_SUBJECT)
  const [comps, setComps] = useState<CMAComp[]>([])
  const [agentNotes, setAgentNotes] = useState('')

  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [hasData, setHasData] = useState(false)

  // Load clients for this tenant
  useEffect(() => {
    if (!currentTenant) return
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', currentTenant!.id)
        .order('name')
      if (!cancelled) setClients((data as Client[]) || [])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [currentTenant])

  // Load deals when client picked
  useEffect(() => {
    if (!selectedClientId) {
      setDeals([])
      setSelectedDealId('')
      return
    }
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('deals')
        .select('*')
        .eq('client_id', selectedClientId)
        .order('created_at', { ascending: false })
      if (!cancelled) {
        const list = (data as Deal[]) || []
        setDeals(list)
        if (list.length > 0 && !selectedDealId) setSelectedDealId(list[0].id)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId])

  async function handleExtract(file: File) {
    setExtractError(null)
    setExtracting(true)
    try {
      const base64 = await fileToBase64(file)
      const accessToken = session?.access_token
      if (!accessToken) throw new Error('Not authenticated')

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/extract_cma_pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ pdf_base64: base64 }),
      })
      const json = await resp.json()
      if (!resp.ok || json.error) {
        throw new Error(json.error || `Extraction failed: ${resp.status}`)
      }

      const extracted = json.extracted || {}
      const newSubject = { ...EMPTY_SUBJECT, ...(extracted.subject || {}) }
      const newComps = ((extracted.comps || []) as CMAComp[]).map((c) => ({
        ...EMPTY_COMP,
        ...c,
      }))
      setSubject(newSubject)
      setComps(newComps)
      setHasData(true)
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : String(e))
    } finally {
      setExtracting(false)
    }
  }

  function handlePdfPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.type !== 'application/pdf') {
      setExtractError('That is not a PDF — please pick an MLS export PDF.')
      return
    }
    setPdfFile(f)
    handleExtract(f)
  }

  function startFromScratch() {
    setSubject({ ...EMPTY_SUBJECT })
    setComps([])
    setHasData(true)
  }

  async function handleSave() {
    if (!currentTenant) return
    if (!subject.address) {
      alert('Subject address is required.')
      return
    }
    setSaving(true)
    try {
      const baseSlug = (subject.address || 'cma')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60)
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`

      const payload = {
        tenant_id: currentTenant.id,
        client_id: selectedClientId || null,
        deal_id: selectedDealId || null,
        slug,
        name: `${subject.address} — CMA`,
        property_address: subject.address,
        list_price: subject.listPrice ? `$${subject.listPrice.toLocaleString()}` : null,
        subject_data: subject,
        comps_data: comps,
        listing_type: listingType,
        status: 'published' as const,
        agent_notes: agentNotes || null,
        published_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('cmas')
        .insert(payload)
        .select('slug')
        .single()
      if (error) throw error
      navigate(`/cmas/${data.slug}`)
    } catch (e) {
      alert('Save failed: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-12 max-w-5xl">
      <Link
        to="/clients"
        className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 mb-6"
      >
        <ChevronLeft className="w-3 h-3" />
        Back to clients
      </Link>

      <div className="border-b border-ink-200 pb-6 mb-8">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">Create CMA</div>
        <h1 className="font-display text-4xl text-ink-900 leading-tight">
          Comparative Market Analysis.
        </h1>
        <p className="text-ink-600 mt-3 max-w-2xl">
          Upload an MLS PDF and Claude will extract the subject property and comparables.
          You can edit anything before publishing. The CMA gets attached to a client and
          appears in their portal.
        </p>
      </div>

      {/* Listing type — drives the seller scenario commission rate */}
      <section className="mb-10">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
          Listing type
        </div>
        <div className="inline-flex border border-ink-200 bg-cream rounded-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setListingType('regular')}
            aria-pressed={listingType === 'regular'}
            className={
              'px-5 py-2.5 text-2xs uppercase tracking-widest transition-colors ' +
              (listingType === 'regular'
                ? 'bg-ink-900 text-cream'
                : 'bg-cream text-ink-700 hover:bg-ink-100')
            }
          >
            Regular listing · 2.5%
          </button>
          <button
            type="button"
            onClick={() => setListingType('mmm')}
            aria-pressed={listingType === 'mmm'}
            className={
              'px-5 py-2.5 text-2xs uppercase tracking-widest transition-colors border-l border-ink-200 ' +
              (listingType === 'mmm'
                ? 'bg-ink-900 text-cream'
                : 'bg-cream text-ink-700 hover:bg-ink-100')
            }
          >
            MMM · Campbell double-end · 3%
          </button>
        </div>
        <p className="text-2xs text-ink-500 mt-2 max-w-xl leading-relaxed">
          {listingType === 'regular'
            ? 'Standard McMullen listing: 2.5% all-in listing fee. The CMA seller scenario will model net proceeds at 2.5% vs traditional 5%.'
            : 'Make-Me-Move deal on the Campbell Market: 3% total fee (double-end, McMullen represents both sides). The CMA seller scenario will model net proceeds at 3% vs traditional 5%.'}
        </p>
      </section>

      {/* Step 1: link to client / deal */}
      <section className="mb-10">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Step 1 · Attach to</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Client">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
            >
              <option value="">— Unattached —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          {deals.length > 0 && (
            <Field label="Deal (optional)">
              <select
                value={selectedDealId}
                onChange={(e) => setSelectedDealId(e.target.value)}
                className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
              >
                <option value="">— None —</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title || d.deal_type}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </section>

      {/* Step 2: upload */}
      {!hasData && (
        <section className="mb-10">
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Step 2 · Source data</div>
          <div className="border-2 border-dashed border-ink-200 p-12 text-center bg-cream">
            {extracting ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-ink-600" />
                <p className="text-sm text-ink-600">
                  Claude is reading the PDF and extracting subject + comparables…
                </p>
                <p className="text-2xs text-ink-500">Usually takes 10–25 seconds.</p>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-ink-400 mx-auto mb-4" strokeWidth={1.5} />
                <h3 className="font-display text-xl text-ink-900 mb-2">Upload an MLS PDF</h3>
                <p className="text-sm text-ink-600 max-w-md mx-auto mb-6">
                  Drag in a CMA export from your MLS — Realist, MLSListings, BAREIS, etc.
                  Or start with a blank form.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700">
                    <FileText className="w-3.5 h-3.5" />
                    Choose PDF
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfPick}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={startFromScratch}
                    className="inline-flex items-center gap-2 px-4 py-2.5 border border-ink-200 text-2xs uppercase tracking-widest text-ink-700 hover:border-ink-400"
                  >
                    Start blank
                  </button>
                </div>
                {extractError && (
                  <p className="text-xs text-red-600 mt-6 max-w-md mx-auto">{extractError}</p>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* Step 3: review */}
      {hasData && (
        <>
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <div className="text-2xs uppercase tracking-widest text-ink-500">
                Step 3 · Review subject property
              </div>
              {pdfFile && (
                <button
                  onClick={() => handleExtract(pdfFile)}
                  disabled={extracting}
                  className="text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 disabled:opacity-50"
                >
                  Re-extract
                </button>
              )}
            </div>
            <SubjectForm subject={subject} setSubject={setSubject} />
          </section>

          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <div className="text-2xs uppercase tracking-widest text-ink-500">
                Step 4 · Comparables ({comps.length})
              </div>
              <button
                onClick={() => setComps([...comps, { ...EMPTY_COMP }])}
                className="text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add comp
              </button>
            </div>
            <div className="space-y-4">
              {comps.map((c, i) => (
                <CompForm
                  key={i}
                  comp={c}
                  index={i}
                  onChange={(updated) => {
                    const copy = [...comps]
                    copy[i] = updated
                    setComps(copy)
                  }}
                  onRemove={() => setComps(comps.filter((_, idx) => idx !== i))}
                />
              ))}
              {comps.length === 0 && (
                <p className="text-sm text-ink-500 italic">
                  No comparables yet. Add at least one to give the CMA market context.
                </p>
              )}
            </div>
          </section>

          <section className="mb-10">
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
              Step 5 · Agent notes (optional)
            </div>
            <textarea
              value={agentNotes}
              onChange={(e) => setAgentNotes(e.target.value)}
              rows={4}
              placeholder="Strategic context, pricing rationale, marketing approach… Shows at the bottom of the CMA."
              className="w-full border border-ink-200 px-3 py-2 text-sm bg-cream"
            />
          </section>

          {/* Save bar */}
          <div className="border-t border-ink-200 pt-6 flex items-center justify-between sticky bottom-0 bg-cream py-4">
            <div className="text-2xs uppercase tracking-widest text-ink-500">
              {selectedClientId
                ? `Will appear in ${clients.find((c) => c.id === selectedClientId)?.name || '…'}'s portal`
                : 'Not attached to a client'}
              {' · '}
              <span className="text-ink-700">
                {listingType === 'mmm' ? 'MMM 3%' : 'Regular 2.5%'}
              </span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !subject.address}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Publish CMA
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// Subject form
// ============================================================
function SubjectForm({
  subject,
  setSubject,
}: {
  subject: CMASubject
  setSubject: (s: CMASubject) => void
}) {
  const upd = <K extends keyof CMASubject>(key: K, value: CMASubject[K]) =>
    setSubject({ ...subject, [key]: value })

  return (
    <div className="border border-ink-200 p-6 bg-cream">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Address" colspan={3}>
          <input
            value={subject.address}
            onChange={(e) => upd('address', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
            placeholder="123 Main St"
          />
        </Field>
        <Field label="City">
          <input
            value={subject.city}
            onChange={(e) => upd('city', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="State">
          <input
            value={subject.state}
            onChange={(e) => upd('state', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="Zip">
          <input
            value={subject.zip}
            onChange={(e) => upd('zip', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="List price">
          <NumberInput value={subject.listPrice} onChange={(v) => upd('listPrice', v)} />
        </Field>
        <Field label="MLS#">
          <input
            value={subject.mls}
            onChange={(e) => upd('mls', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="Year built">
          <NumberInput value={subject.yearBuilt} onChange={(v) => upd('yearBuilt', v)} />
        </Field>
        <Field label="Beds">
          <NumberInput value={subject.beds} onChange={(v) => upd('beds', v)} />
        </Field>
        <Field label="Baths full">
          <NumberInput value={subject.bathsFull} onChange={(v) => upd('bathsFull', v)} />
        </Field>
        <Field label="Baths partial">
          <NumberInput value={subject.bathsPartial} onChange={(v) => upd('bathsPartial', v)} />
        </Field>
        <Field label="Sqft">
          <NumberInput value={subject.sqft} onChange={(v) => upd('sqft', v)} />
        </Field>
        <Field label="Lot sqft">
          <NumberInput value={subject.lotSqft} onChange={(v) => upd('lotSqft', v)} />
        </Field>
        <Field label="Property type">
          <input
            value={subject.propertyType}
            onChange={(e) => upd('propertyType', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="Days on market">
          <NumberInput value={subject.daysOnMarket} onChange={(v) => upd('daysOnMarket', v)} />
        </Field>
        <Field label="HOA monthly">
          <NumberInput value={subject.hoaMonthly} onChange={(v) => upd('hoaMonthly', v)} />
        </Field>
        <Field label="Remarks" colspan={3}>
          <textarea
            value={subject.remarks}
            onChange={(e) => upd('remarks', e.target.value)}
            rows={3}
            className="w-full border border-ink-200 px-3 py-2 text-sm bg-cream"
          />
        </Field>
      </div>
    </div>
  )
}

// ============================================================
// Comp form (per row)
// ============================================================
function CompForm({
  comp,
  index,
  onChange,
  onRemove,
}: {
  comp: CMAComp
  index: number
  onChange: (c: CMAComp) => void
  onRemove: () => void
}) {
  const upd = <K extends keyof CMAComp>(key: K, value: CMAComp[K]) =>
    onChange({ ...comp, [key]: value })

  return (
    <div className="border border-ink-200 p-5 bg-cream">
      <div className="flex items-center justify-between mb-3">
        <div className="text-2xs uppercase tracking-widest text-ink-500">Comp #{index + 1}</div>
        <button
          onClick={onRemove}
          className="text-2xs text-red-600 hover:text-red-700 flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          Remove
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="Address" colspan={4}>
          <input
            value={comp.address}
            onChange={(e) => upd('address', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="City">
          <input
            value={comp.city}
            onChange={(e) => upd('city', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="Sold price">
          <NumberInput value={comp.soldPrice} onChange={(v) => upd('soldPrice', v)} />
        </Field>
        <Field label="List price">
          <NumberInput value={comp.listPrice} onChange={(v) => upd('listPrice', v)} />
        </Field>
        <Field label="Sqft">
          <NumberInput value={comp.sqft} onChange={(v) => upd('sqft', v)} />
        </Field>
        <Field label="Beds">
          <NumberInput value={comp.beds} onChange={(v) => upd('beds', v)} />
        </Field>
        <Field label="Baths full">
          <NumberInput value={comp.bathsFull} onChange={(v) => upd('bathsFull', v)} />
        </Field>
        <Field label="Baths partial">
          <NumberInput value={comp.bathsPartial} onChange={(v) => upd('bathsPartial', v)} />
        </Field>
        <Field label="DOM">
          <NumberInput value={comp.daysOnMarket} onChange={(v) => upd('daysOnMarket', v)} />
        </Field>
        <Field label="Sold date">
          <input
            value={comp.soldDate}
            onChange={(e) => upd('soldDate', e.target.value)}
            placeholder="Jan 15, 2026"
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="MLS#">
          <input
            value={comp.mls}
            onChange={(e) => upd('mls', e.target.value)}
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="Photo URL (optional)" colspan={2}>
          <input
            value={comp.photoUrl || ''}
            onChange={(e) => upd('photoUrl', e.target.value || undefined)}
            placeholder="https://..."
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
        <Field label="Listing URL (optional)" colspan={2}>
          <input
            value={comp.listingUrl || ''}
            onChange={(e) => upd('listingUrl', e.target.value || undefined)}
            placeholder="https://www.zillow.com/..."
            className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
          />
        </Field>
      </div>
    </div>
  )
}

// ============================================================
// Small atoms
// ============================================================
function Field({
  label,
  children,
  colspan,
}: {
  label: string
  children: React.ReactNode
  colspan?: number
}) {
  // Tailwind needs full class names at build time — no template interpolation.
  const cls =
    colspan === 2
      ? 'md:col-span-2'
      : colspan === 3
      ? 'md:col-span-3'
      : colspan === 4
      ? 'md:col-span-4'
      : ''
  return (
    <div className={cls}>
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function NumberInput({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === '' ? null : Number(v))
      }}
      className="border border-ink-200 px-3 py-2 text-sm bg-cream w-full"
    />
  )
}

// ============================================================
// PDF → base64
// ============================================================
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // result is "data:application/pdf;base64,XXX..." — strip prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read PDF file'))
    reader.readAsDataURL(file)
  })
}
