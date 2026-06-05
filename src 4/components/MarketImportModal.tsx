import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import { X, Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Bulk unit import. Maps any CSV (DealMachine, county export, etc.) to the
// NormalizedRow shape the `ingest_market_rows` edge function expects, then sends
// it in batches (the function caps at 1000 rows/call). Props are unchanged so
// both call sites (Markets.tsx, MarketDetail.tsx) keep working.

type Field =
  | 'street_address'
  | 'unit_label'
  | 'city'
  | 'state'
  | 'postal_code'
  | 'neighborhood'
  | 'building_type'
  | 'year_built'
  | 'beds'
  | 'baths'
  | 'area_sqft'
  | 'apn'
  | 'owner_name'
  | 'owner_email'
  | 'owner_phone'
  | 'last_sale_price'
  | 'last_sale_date'
  | 'ignore'

const FIELDS: Field[] = [
  'street_address',
  'unit_label',
  'city',
  'state',
  'postal_code',
  'neighborhood',
  'building_type',
  'year_built',
  'beds',
  'baths',
  'area_sqft',
  'apn',
  'owner_name',
  'owner_email',
  'owner_phone',
  'last_sale_price',
  'last_sale_date',
  'ignore',
]

const FIELD_LABELS: Record<Field, string> = {
  street_address: 'Street address *',
  unit_label: 'Unit / apt',
  city: 'City',
  state: 'State',
  postal_code: 'Postal code',
  neighborhood: 'Neighborhood',
  building_type: 'Building type',
  year_built: 'Year built',
  beds: 'Beds',
  baths: 'Baths',
  area_sqft: 'Area (sqft)',
  apn: 'APN / parcel',
  owner_name: 'Owner name',
  owner_email: 'Owner email',
  owner_phone: 'Owner phone',
  last_sale_price: 'Last sale price',
  last_sale_date: 'Last sale date',
  ignore: '(skip this column)',
}

// Ordered, case-insensitive header → field detection (specific before generic).
function autoDetectField(header: string): Field {
  const h = header.toLowerCase().trim()
  if (/owner.*e[\W_]*mail/.test(h)) return 'owner_email'
  if (/owner.*phone|owner.*(mobile|cell)/.test(h)) return 'owner_phone'
  if (/owner.*name|^owner$|owner ?1|mailing name/.test(h)) return 'owner_name'
  if (/unit|apt|suite|^#/.test(h)) return 'unit_label'
  if (/street|property addr|site addr|^address|mailing addr/.test(h)) return 'street_address'
  if (/^city/.test(h)) return 'city'
  if (/^state|province/.test(h)) return 'state'
  if (/zip|postal/.test(h)) return 'postal_code'
  if (/neighborhood|subdivision/.test(h)) return 'neighborhood'
  if (/property type|building type|^type$|land use/.test(h)) return 'building_type'
  if (/year built|yr built|built/.test(h)) return 'year_built'
  if (/bedrooms?|^beds?$|\bbr\b/.test(h)) return 'beds'
  if (/bathrooms?|^baths?$|\bba\b/.test(h)) return 'baths'
  if (/sq\.? ?ft|square feet|living area|sqft|^area/.test(h)) return 'area_sqft'
  if (/apn|parcel|^pin$/.test(h)) return 'apn'
  if (/sale price|sold price|sale amount|last sale price/.test(h)) return 'last_sale_price'
  if (/sale date|sold date|recording date|last sale date/.test(h)) return 'last_sale_date'
  if (/e[\W_]*mail/.test(h)) return 'owner_email'
  if (/phone|mobile|cell|tel/.test(h)) return 'owner_phone'
  return 'ignore'
}

type Summary = {
  rows_in: number
  rows_skipped: number
  buildings_touched: number
  units_touched: number
  contacts_created: number
  ownerships_touched: number
  sales_added: number
  errors: string[]
}

const BATCH_SIZE = 500

export default function MarketImportModal({
  marketId,
  marketName,
  onClose,
  onComplete,
}: {
  marketId: string
  marketName: string
  onClose: () => void
  onComplete: () => void
}) {
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, Field>>({})
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<Summary | null>(null)

  function reset() {
    setHeaders([])
    setRows([])
    setMapping({})
    setFileName('')
    setError(null)
    setResult(null)
    setProgress(null)
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    setResult(null)
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parse error: ${results.errors.slice(0, 3).map((x) => x.message).join('; ')}`)
        }
        const fields = (results.meta.fields || []).filter(Boolean) as string[]
        setHeaders(fields)
        setRows(results.data as Record<string, string>[])
        const auto: Record<string, Field> = {}
        for (const h of fields) auto[h] = autoDetectField(h)
        setMapping(auto)
      },
      error: (err) => setError(`Could not parse file: ${err.message}`),
    })
  }

  // Build NormalizedRow objects from the mapping, keeping only rows with an address.
  const normalizedRows = useMemo(() => {
    if (rows.length === 0) return []
    const out: Record<string, string>[] = []
    for (const row of rows) {
      const r: Record<string, string> = {}
      for (const [header, field] of Object.entries(mapping)) {
        if (field === 'ignore') continue
        const v = row[header]
        if (v != null && String(v).trim() !== '') r[field] = String(v).trim()
      }
      if (r.street_address) out.push(r)
    }
    return out
  }, [rows, mapping])

  const hasAddress = Object.values(mapping).includes('street_address')
  const preview = normalizedRows.slice(0, 3)

  async function runImport() {
    if (busy || normalizedRows.length === 0) return
    setBusy(true)
    setError(null)
    setResult(null)
    const agg: Summary = {
      rows_in: 0,
      rows_skipped: 0,
      buildings_touched: 0,
      units_touched: 0,
      contacts_created: 0,
      ownerships_touched: 0,
      sales_added: 0,
      errors: [],
    }
    const total = Math.ceil(normalizedRows.length / BATCH_SIZE)
    try {
      for (let i = 0; i < normalizedRows.length; i += BATCH_SIZE) {
        setProgress({ done: Math.floor(i / BATCH_SIZE), total })
        const batch = normalizedRows.slice(i, i + BATCH_SIZE)
        // functions.invoke attaches the agent's session JWT (verify_jwt = true).
        const { data, error: fnErr } = await supabase.functions.invoke('ingest_market_rows', {
          body: { market_id: marketId, source: 'csv', rows: batch },
        })
        if (fnErr) throw new Error(fnErr.message || 'Import request failed')
        if (data && (data as { error?: string }).error) throw new Error((data as { error: string }).error)
        const s = (data as { summary?: Summary } | null)?.summary
        if (s) {
          agg.rows_in += s.rows_in || 0
          agg.rows_skipped += s.rows_skipped || 0
          agg.buildings_touched += s.buildings_touched || 0
          agg.units_touched += s.units_touched || 0
          agg.contacts_created += s.contacts_created || 0
          agg.ownerships_touched += s.ownerships_touched || 0
          agg.sales_added += s.sales_added || 0
          if (Array.isArray(s.errors)) agg.errors.push(...s.errors)
        }
      }
      setResult(agg)
      onComplete() // refresh the parent market/units behind the modal
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const inputCls = 'text-2xs uppercase tracking-widest px-2 py-1.5 border border-ink-200 bg-white focus:outline-none focus:border-ink-900'

  return (
    <div className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center p-4" onClick={busy ? undefined : onClose}>
      <div
        className="bg-white border border-ink-100 max-w-2xl w-full max-h-[85vh] overflow-y-auto p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-ink-400" strokeWidth={1.5} />
            <div>
              <div className="font-display text-2xl text-ink-900 leading-tight">Import units</div>
              <div className="text-2xs uppercase tracking-widest text-ink-500 mt-1">{marketName}</div>
            </div>
          </div>
          <button onClick={onClose} disabled={busy} className="text-ink-400 hover:text-ink-900 disabled:opacity-40 shrink-0" aria-label="Close">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {error && (
          <div className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
            <span>{error}</span>
          </div>
        )}

        {/* RESULT */}
        {result ? (
          <div>
            <div className="flex items-center gap-2 text-emerald-700 mb-4">
              <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
              <span className="text-sm">Import complete.</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              <ResultStat label="Units" value={result.units_touched} />
              <ResultStat label="Buildings" value={result.buildings_touched} />
              <ResultStat label="Owners created" value={result.contacts_created} />
              <ResultStat label="Ownership links" value={result.ownerships_touched} />
              <ResultStat label="Sales added" value={result.sales_added} />
              <ResultStat label="Rows skipped" value={result.rows_skipped} />
            </div>
            {result.errors.length > 0 && (
              <div className="mb-5">
                <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">
                  {result.errors.length} row {result.errors.length === 1 ? 'error' : 'errors'}
                </div>
                <div className="bg-ink-900 text-cream/90 text-xs p-4 max-h-40 overflow-y-auto leading-relaxed">
                  {result.errors.map((e, i) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-100">
              <button onClick={reset} className="px-4 py-2.5 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900">
                Import another file
              </button>
              <button onClick={onClose} className="px-4 py-2.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700">
                Done
              </button>
            </div>
          </div>
        ) : headers.length === 0 ? (
          /* STEP 1 — file */
          <div>
            <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-ink-200 py-12 cursor-pointer hover:border-ink-400 transition-colors">
              <FileText className="w-7 h-7 text-ink-300" strokeWidth={1.25} />
              <span className="text-sm text-ink-700">{fileName || 'Click to select a .csv file'}</span>
              <span className="text-2xs uppercase tracking-widest text-ink-400">DealMachine, county export, or any CSV</span>
              <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
            </label>
            <p className="text-2xs uppercase tracking-widest text-ink-400 mt-4 leading-relaxed">
              Street address is required. Owner name / email / phone, beds, baths, sqft, APN, and last sale are
              optional — map whatever your file has on the next step.
            </p>
          </div>
        ) : (
          /* STEP 2 + 3 — map + preview */
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-2xs uppercase tracking-widest text-ink-500">
                Map columns · {rows.length} rows · {normalizedRows.length} with an address
              </div>
              <button onClick={reset} disabled={busy} className="text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 disabled:opacity-40">
                Choose different file
              </button>
            </div>

            <div className="border border-ink-100 divide-y divide-ink-100 mb-5 max-h-64 overflow-y-auto">
              {headers.map((h) => (
                <div key={h} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-sm text-ink-700 truncate min-w-0">{h}</span>
                  <select
                    value={mapping[h] || 'ignore'}
                    onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value as Field }))}
                    className={`${inputCls} shrink-0`}
                  >
                    {FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {FIELD_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {preview.length > 0 && (
              <div className="mb-5">
                <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">Preview</div>
                <div className="space-y-1.5">
                  {preview.map((r, i) => (
                    <div key={i} className="text-sm text-ink-700 bg-cream border border-ink-100 px-3 py-2 truncate">
                      <span className="text-ink-900">{r.street_address}</span>
                      {r.unit_label ? ` #${r.unit_label}` : ''}
                      {r.owner_name ? ` · ${r.owner_name}` : ''}
                      {r.last_sale_price ? ` · sale ${r.last_sale_price}` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hasAddress && (
              <div className="text-2xs uppercase tracking-widest text-ink-400 mb-4">
                Map one column to “Street address” to enable import.
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-100">
              <button onClick={onClose} disabled={busy} className="px-4 py-2.5 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 disabled:opacity-40">
                Cancel
              </button>
              <button
                onClick={runImport}
                disabled={busy || !hasAddress || normalizedRows.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {busy
                  ? progress
                    ? `Importing batch ${progress.done + 1}/${progress.total}…`
                    : 'Importing…'
                  : `Import ${normalizedRows.length} ${normalizedRows.length === 1 ? 'unit' : 'units'}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ResultStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-cream border border-ink-100 px-4 py-3">
      <div className="font-display text-2xl text-ink-900 tabular-nums leading-none">{value.toLocaleString()}</div>
      <div className="text-2xs uppercase tracking-widest text-ink-400 mt-1.5">{label}</div>
    </div>
  )
}
