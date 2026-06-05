import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import { supabase, type ContactList, type LifecycleStage, LIFECYCLE_STAGES } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Upload, CheckCircle2, AlertTriangle, Loader2, FileText } from 'lucide-react'

// Target fields that we know how to map CSV columns into
type ContactField =
  | 'email'
  | 'first_name'
  | 'last_name'
  | 'phone'
  | 'notes'
  | 'lifecycle_stage'
  | 'ignore'

const FIELD_LABELS: Record<ContactField, string> = {
  email: 'Email',
  first_name: 'First Name',
  last_name: 'Last Name',
  phone: 'Phone',
  notes: 'Notes',
  lifecycle_stage: 'Lifecycle Stage',
  ignore: '(skip this column)',
}

// Auto-detect a CSV header to a contact field (case-insensitive substring match)
function autoDetectField(header: string): ContactField {
  const h = header.toLowerCase().trim()
  if (/^e[\W_-]*mail/.test(h)) return 'email'
  if (/first[\W_-]*name|^first$|fname/.test(h)) return 'first_name'
  if (/last[\W_-]*name|^last$|lname|surname/.test(h)) return 'last_name'
  if (/^name$|full[\W_-]*name/.test(h)) return 'first_name'  // User can split manually if needed
  if (/phone|mobile|cell|tel/.test(h)) return 'phone'
  if (/notes?|comments?|message|description/.test(h)) return 'notes'
  if (/lifecycle|stage|status/.test(h)) return 'lifecycle_stage'
  return 'ignore'
}

export default function CSVImport() {
  const { currentTenant } = useAuth()
  const navigate = useNavigate()
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, ContactField>>({})
  const [targetListId, setTargetListId] = useState<string>('')
  const [extraTag, setExtraTag] = useState<string>('')
  const [defaultStage, setDefaultStage] = useState<LifecycleStage>('new')
  const [lists, setLists] = useState<ContactList[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null)

  // Load lists for the target picker
  useEffect(() => {
    if (!currentTenant) return
    supabase
      .from('contact_lists')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .order('name')
      .then(({ data }) => setLists((data || []) as ContactList[]))
  }, [currentTenant?.id])

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
          const errs = results.errors.slice(0, 3).map(e => e.message).join('; ')
          setError(`CSV parse error: ${errs}`)
        }
        const fields = (results.meta.fields || []).filter(Boolean) as string[]
        setHeaders(fields)
        setRows(results.data as Record<string, string>[])
        const autoMap: Record<string, ContactField> = {}
        for (const h of fields) autoMap[h] = autoDetectField(h)
        setMapping(autoMap)
      },
      error: (err) => setError(`Could not parse file: ${err.message}`),
    })
  }

  const mappedPreview = useMemo(() => {
    if (rows.length === 0) return []
    return rows.slice(0, 5).map((row) => {
      const out: Partial<Record<ContactField, string>> = {}
      for (const [header, field] of Object.entries(mapping)) {
        if (field === 'ignore') continue
        const value = row[header]
        if (!value) continue
        out[field] = String(value).trim()
      }
      return out
    })
  }, [rows, mapping])

  const willImport = useMemo(() => {
    const mappedFields = Object.values(mapping)
    return mappedFields.includes('email') || mappedFields.includes('phone') ||
           mappedFields.includes('first_name') || mappedFields.includes('last_name')
  }, [mapping])

  async function runImport() {
    if (!currentTenant) return
    setError(null)
    setBusy(true)
    setResult({ created: 0, updated: 0, skipped: 0, errors: [] })

    const errors: string[] = []
    let created = 0
    let updated = 0
    let skipped = 0
    const tagApplied = extraTag.trim()
    let tagId: string | null = null

    // Ensure tag exists, if specified
    if (tagApplied) {
      const { data: existingTag } = await supabase
        .from('contact_tags')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .ilike('name', tagApplied)
        .maybeSingle()
      if (existingTag) {
        tagId = existingTag.id
      } else {
        const { data: newTag } = await supabase
          .from('contact_tags')
          .insert({ tenant_id: currentTenant.id, name: tagApplied })
          .select('id')
          .single()
        if (newTag) tagId = newTag.id
      }
    }

    // Process rows in batches to avoid huge single-shot inserts
    const BATCH_SIZE = 50
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      for (const row of batch) {
        const fields: Partial<Record<ContactField, string>> = {}
        for (const [header, field] of Object.entries(mapping)) {
          if (field === 'ignore') continue
          const v = row[header]
          if (v) fields[field] = String(v).trim()
        }

        const email = fields.email?.toLowerCase()
        const firstName = fields.first_name
        const lastName = fields.last_name
        const phone = fields.phone
        const notes = fields.notes
        const stageRaw = fields.lifecycle_stage?.toLowerCase()
        const stage = (LIFECYCLE_STAGES as string[]).includes(stageRaw || '')
          ? (stageRaw as LifecycleStage)
          : defaultStage

        if (!email && !phone && !firstName && !lastName) {
          skipped++
          continue
        }

        // Dedupe by email
        let contactId: string | null = null
        let action: 'created' | 'updated' = 'created'
        if (email) {
          const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .eq('tenant_id', currentTenant.id)
            .eq('email', email)
            .maybeSingle()
          if (existing) {
            contactId = existing.id
            action = 'updated'
            // Only fill blank fields, never overwrite existing values
            const { data: row2 } = await supabase
              .from('contacts')
              .select('first_name, last_name, phone, notes')
              .eq('id', existing.id)
              .maybeSingle()
            const patch: Record<string, string> = {}
            if (firstName && !row2?.first_name) patch.first_name = firstName
            if (lastName && !row2?.last_name) patch.last_name = lastName
            if (phone && !row2?.phone) patch.phone = phone
            if (notes && !row2?.notes) patch.notes = notes
            if (Object.keys(patch).length > 0) {
              await supabase.from('contacts').update(patch).eq('id', existing.id)
            }
          }
        }

        if (!contactId) {
          const { data: newContact, error: insertErr } = await supabase
            .from('contacts')
            .insert({
              tenant_id: currentTenant.id,
              email: email || null,
              first_name: firstName || null,
              last_name: lastName || null,
              phone: phone || null,
              notes: notes || null,
              lifecycle_stage: stage,
            })
            .select('id')
            .single()
          if (insertErr) {
            errors.push(`Row ${i + 1}: ${insertErr.message}`)
            skipped++
            continue
          }
          contactId = newContact.id
          created++
        } else {
          updated++
        }

        // Add to target list if specified
        if (targetListId && contactId) {
          const { data: existingMembership } = await supabase
            .from('contact_list_memberships')
            .select('id')
            .eq('list_id', targetListId)
            .eq('contact_id', contactId)
            .is('removed_at', null)
            .maybeSingle()
          if (!existingMembership) {
            await supabase.from('contact_list_memberships').insert({
              tenant_id: currentTenant.id,
              list_id: targetListId,
              contact_id: contactId,
            })
          }
        }

        // Apply extra tag
        if (tagId && contactId) {
          await supabase.from('contact_tag_assignments').upsert({
            contact_id: contactId,
            tag_id: tagId,
            tenant_id: currentTenant.id,
          }, { onConflict: 'contact_id,tag_id' })
        }

        // Source attribution
        await supabase.from('contact_sources').insert({
          tenant_id: currentTenant.id,
          contact_id: contactId,
          source_kind: 'csv_import',
          source_label: fileName || 'CSV import',
          metadata: { row_index: i, action },
        })
      }

      setResult({ created, updated, skipped, errors })
    }

    setBusy(false)
    setResult({ created, updated, skipped, errors })
  }

  return (
    <div className="px-8 py-10 max-w-5xl">
      <Link to="/crm" className="text-xs uppercase tracking-widest text-ink-500 hover:text-ink-900 flex items-center gap-1 mb-6">
        <ArrowLeft size={14} /> Back to CRM
      </Link>

      <h1 className="font-serif text-3xl text-ink-900 mb-2">Import Contacts from CSV</h1>
      <p className="text-sm text-ink-500 mb-8">
        Upload a CSV. The first row is treated as headers. Existing contacts (matched by email) get blank fields filled in but never overwritten.
      </p>

      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 mb-6 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      {/* File picker */}
      <section className="mb-8">
        <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">Step 1 — Pick a CSV file</label>
        <label className="border-2 border-dashed border-ink-300 px-6 py-8 flex flex-col items-center justify-center cursor-pointer hover:bg-ink-50 transition">
          <Upload size={28} className="text-ink-400 mb-2" />
          <span className="text-sm text-ink-700">{fileName || 'Click to select a .csv file'}</span>
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
        </label>
      </section>

      {/* Column mapping */}
      {headers.length > 0 && (
        <section className="mb-8">
          <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">
            Step 2 — Map columns ({rows.length} rows detected)
          </label>
          <div className="border border-ink-200">
            <table className="w-full text-sm">
              <thead className="bg-ink-50">
                <tr className="text-left text-2xs uppercase tracking-widest text-ink-500">
                  <th className="px-4 py-3 font-normal">CSV Column</th>
                  <th className="px-4 py-3 font-normal">Maps to</th>
                  <th className="px-4 py-3 font-normal">Sample data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {headers.map((h) => (
                  <tr key={h}>
                    <td className="px-4 py-3 font-mono text-xs">{h}</td>
                    <td className="px-4 py-3">
                      <select
                        value={mapping[h] || 'ignore'}
                        onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value as ContactField }))}
                        className="border border-ink-300 px-2 py-1 text-sm bg-white"
                      >
                        {(Object.keys(FIELD_LABELS) as ContactField[]).map((f) => (
                          <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500 truncate max-w-xs">
                      {rows.slice(0, 1).map((r) => r[h]).filter(Boolean).join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Options + preview */}
      {headers.length > 0 && (
        <section className="mb-8 space-y-4">
          <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">Step 3 — Import options</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink-500 block mb-1">Add to list (optional)</label>
              <select
                value={targetListId}
                onChange={(e) => setTargetListId(e.target.value)}
                className="w-full border border-ink-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">— none —</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-500 block mb-1">Apply tag (optional)</label>
              <input
                type="text"
                value={extraTag}
                onChange={(e) => setExtraTag(e.target.value)}
                placeholder="e.g. source:past-clients"
                className="w-full border border-ink-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-ink-500 block mb-1">Default lifecycle stage</label>
              <select
                value={defaultStage}
                onChange={(e) => setDefaultStage(e.target.value as LifecycleStage)}
                className="w-full border border-ink-300 px-3 py-2 text-sm bg-white"
              >
                {LIFECYCLE_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* Preview */}
      {mappedPreview.length > 0 && (
        <section className="mb-8">
          <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">
            Step 4 — Preview (first 5 rows after mapping)
          </label>
          <div className="border border-ink-200 bg-ink-50 p-4 font-mono text-xs">
            {mappedPreview.map((row, i) => (
              <div key={i} className="mb-2">
                {Object.entries(row).map(([k, v]) => (
                  <span key={k} className="mr-3"><span className="text-ink-500">{k}:</span> {v}</span>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Result */}
      {result && (
        <div className="border border-green-200 bg-green-50 px-4 py-4 mb-6 text-sm text-green-800">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium mb-1">Import complete</div>
              <div className="text-xs">
                {result.created} created · {result.updated} updated · {result.skipped} skipped
              </div>
              {result.errors.length > 0 && (
                <details className="text-xs mt-2">
                  <summary className="cursor-pointer text-red-700">{result.errors.length} errors</summary>
                  <pre className="mt-2 text-red-700 whitespace-pre-wrap">{result.errors.slice(0, 20).join('\n')}</pre>
                </details>
              )}
              <button
                onClick={() => navigate('/crm')}
                className="mt-3 text-xs uppercase tracking-widest text-ink-700 hover:text-ink-900 underline"
              >
                Back to CRM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action */}
      {headers.length > 0 && !result && (
        <div className="flex items-center gap-3 pt-4 border-t border-ink-200">
          <button
            onClick={runImport}
            disabled={busy || !willImport}
            className="bg-ink-900 text-cream px-5 py-2 text-xs uppercase tracking-widest hover:bg-ink-700 transition disabled:opacity-30"
          >
            {busy && <Loader2 size={14} className="inline animate-spin mr-2" />}
            <FileText size={14} className="inline mr-2" />
            Import {rows.length} rows
          </button>
          {!willImport && (
            <span className="text-xs text-ink-500">Map at least one column to email, phone, or name to continue</span>
          )}
        </div>
      )}
    </div>
  )
}
