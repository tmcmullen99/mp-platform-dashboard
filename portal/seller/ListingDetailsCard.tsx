// P10 — Listing details + Schedule editor cards for the ListingBuilder chassis.
//
// These two cards add the missing edit affordances for the canonical listing
// data that lives on the `properties` table (joined off deal.property_id) and
// the `schedule_events` table. They slot into the existing ListingBuilder grid
// alongside Photos / Description / Tax / Floor plan / Net sheet / Service /
// Publish.
//
// Edit model (mirrors the existing DescriptionEditor convention):
//   • Agent (mode='agent') → writes straight to properties / schedule_events.
//   • Client (mode='client') → proposes into listing_edits (status='pending');
//     the agent approves in the existing ApprovalsSection, which now routes
//     `properties.*` field changes back to the properties row.
//
// The properties row is the single source of truth for specs + rich text. The
// older coming_soon_listings-backed Description card still exists in the
// chassis; this card is the canonical editor for the same prose, so agents
// should treat THIS as the place to edit description/amenities going forward.

import { useCallback, useEffect, useState, FormEvent } from 'react'
import {
  Loader2,
  Building2,
  CalendarDays,
  Edit3,
  Plus,
  Trash2,
  Check,
  X as XIcon,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { supabase, Deal } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// ---------------------------------------------------------------------------
// Shared card shell + state badge (kept visually identical to ListingBuilder's
// internal Card so the grid stays consistent; duplicated rather than exported
// to avoid widening ListingBuilder's public surface).
// ---------------------------------------------------------------------------
type CardState = 'not_started' | 'in_progress' | 'complete'

function Card({
  state,
  icon: Icon,
  title,
  summary,
  spanFull,
  children,
}: {
  state: CardState
  icon: typeof Building2
  title: string
  summary: string
  spanFull?: boolean
  children: React.ReactNode
}) {
  return (
    <article className={`border border-ink-200 bg-cream p-5 ${spanFull ? 'md:col-span-2' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <Icon className="w-4 h-4 text-ink-500 mt-1 shrink-0" strokeWidth={1.5} />
          <div className="min-w-0">
            <h3 className="font-display text-lg text-ink-900 leading-tight">{title}</h3>
          </div>
        </div>
        <StateBadge state={state} />
      </div>
      <p className="text-sm text-ink-600 leading-relaxed mb-3">{summary}</p>
      <div>{children}</div>
    </article>
  )
}

function StateBadge({ state }: { state: CardState }) {
  const map = {
    complete: ['text-emerald-700 bg-emerald-50', 'Complete'],
    in_progress: ['text-amber-700 bg-amber-50', 'In progress'],
    not_started: ['text-ink-500 bg-ink-50', 'Not started'],
  } as const
  const [cls, label] = map[state]
  return (
    <span
      className={`inline-flex items-center gap-1 text-2xs uppercase tracking-widest px-1.5 py-0.5 shrink-0 ${cls}`}
    >
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PropertyRow = {
  id: string
  name: string | null
  pin_code: string | null
  bedrooms: number | string | null
  bathrooms: number | string | null
  area_sqft: number | string | null
  built_year: number | null
  parking_description: string | null
  monthly_hoa_fee: string | null
  description_html: string | null
  amenities_html: string | null
}

type ScheduleEvent = {
  id: string
  deal_id: string | null
  tenant_id: string | null
  client_id: string | null
  event_type: string
  title: string | null
  starts_at: string | null
  ends_at: string | null
  all_day: boolean
  audience: string
  status: string
}

const EVENT_TYPES: { value: string; label: string }[] = [
  { value: 'on_market', label: 'Going Live (MLS)' },
  { value: 'open_house', label: 'Open House' },
  { value: 'broker_tour', label: 'Broker Tour' },
  { value: 'offer_day', label: 'Offers Due' },
  { value: 'private_showing', label: 'Private Showing' },
  { value: 'milestone', label: 'Milestone' },
]

function eventTypeLabel(v: string): string {
  return EVENT_TYPES.find((e) => e.value === v)?.label || v
}

// ===========================================================================
// LISTING DETAILS CARD — properties row editor
// ===========================================================================
export function ListingDetailsCard({
  deal,
  mode,
  onChanged,
}: {
  deal: Deal
  mode: 'agent' | 'client'
  onChanged?: () => void
}) {
  const [prop, setProp] = useState<PropertyRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [pendingNote, setPendingNote] = useState(false)

  const load = useCallback(async () => {
    if (!deal.property_id) {
      setProp(null)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('properties')
      .select(
        'id, name, pin_code, bedrooms, bathrooms, area_sqft, built_year, parking_description, monthly_hoa_fee, description_html, amenities_html',
      )
      .eq('id', deal.property_id)
      .maybeSingle()
    setProp((data as PropertyRow) || null)
    setLoading(false)
  }, [deal.property_id])

  useEffect(() => {
    load()
  }, [load])

  // Surface whether a client has an open proposed edit on this listing.
  useEffect(() => {
    let cancelled = false
    supabase
      .from('listing_edits')
      .select('id')
      .eq('deal_id', deal.id)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setPendingNote(!!data)
      })
    return () => {
      cancelled = true
    }
  }, [deal.id, editing])

  if (loading) {
    return (
      <Card state="not_started" icon={Building2} title="Listing details" summary="Loading…" spanFull>
        <Loader2 className="w-4 h-4 animate-spin text-ink-500" />
      </Card>
    )
  }

  if (!deal.property_id || !prop) {
    return (
      <Card
        state="not_started"
        icon={Building2}
        title="Listing details"
        summary="No property record is linked to this deal yet."
        spanFull
      >
        <span className="text-2xs uppercase tracking-widest text-ink-400">
          Link a property to enable editing
        </span>
      </Card>
    )
  }

  const specsComplete =
    prop.bedrooms != null && prop.bathrooms != null && prop.area_sqft != null && prop.built_year != null
  const proseComplete = !!(prop.description_html && prop.amenities_html)
  const state: CardState = specsComplete && proseComplete ? 'complete' : specsComplete || proseComplete ? 'in_progress' : 'not_started'

  const summary = [
    prop.name || 'Unnamed',
    prop.bedrooms != null && prop.bathrooms != null ? `${prop.bedrooms} bd / ${prop.bathrooms} ba` : null,
    prop.area_sqft != null ? `${Number(prop.area_sqft).toLocaleString()} sqft` : null,
    prop.built_year ? `built ${prop.built_year}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Card state={state} icon={Building2} title="Listing details" summary={summary} spanFull>
      {pendingNote && mode === 'client' && (
        <div className="border border-amber-200 bg-amber-50 p-3 flex items-start gap-2 text-xs text-amber-900 mb-3">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.5} />
          You have edits awaiting your agent's approval.
        </div>
      )}
      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-700 hover:text-ink-900"
        >
          <Edit3 className="w-3 h-3" />
          {mode === 'agent' ? 'Edit details' : 'Propose edits'}
        </button>
      ) : (
        <DetailsEditor
          deal={deal}
          mode={mode}
          prop={prop}
          onCancel={() => setEditing(false)}
          onDone={() => {
            setEditing(false)
            load()
            onChanged?.()
          }}
        />
      )}
    </Card>
  )
}

function DetailsEditor({
  deal,
  mode,
  prop,
  onCancel,
  onDone,
}: {
  deal: Deal
  mode: 'agent' | 'client'
  prop: PropertyRow
  onCancel: () => void
  onDone: () => void
}) {
  const { user } = useAuth()
  const [name, setName] = useState(prop.name || '')
  const [pin, setPin] = useState(prop.pin_code || '')
  const [beds, setBeds] = useState<string>(prop.bedrooms != null ? String(prop.bedrooms) : '')
  const [baths, setBaths] = useState<string>(prop.bathrooms != null ? String(prop.bathrooms) : '')
  const [sqft, setSqft] = useState<string>(prop.area_sqft != null ? String(prop.area_sqft) : '')
  const [year, setYear] = useState<string>(prop.built_year != null ? String(prop.built_year) : '')
  const [parking, setParking] = useState(prop.parking_description || '')
  const [hoa, setHoa] = useState(prop.monthly_hoa_fee || '')
  const [description, setDescription] = useState(stripHtml(prop.description_html || ''))
  const [amenities, setAmenities] = useState(stripHtml(prop.amenities_html || ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setSaving(true)
    try {
      // Build the candidate change set (only fields that actually changed).
      const next: Record<string, unknown> = {}
      const setIf = (key: string, current: unknown, value: unknown) => {
        if (String(current ?? '') !== String(value ?? '')) next[key] = value
      }
      setIf('name', prop.name, name.trim() || null)
      setIf('pin_code', prop.pin_code, pin.trim() || null)
      setIf('bedrooms', prop.bedrooms, beds === '' ? null : Number(beds))
      setIf('bathrooms', prop.bathrooms, baths === '' ? null : Number(baths))
      setIf('area_sqft', prop.area_sqft, sqft === '' ? null : Number(sqft))
      setIf('built_year', prop.built_year, year === '' ? null : Number(year))
      setIf('parking_description', prop.parking_description, parking.trim() || null)
      setIf('monthly_hoa_fee', prop.monthly_hoa_fee, hoa.trim() || null)
      setIf('description_html', stripHtml(prop.description_html || ''), paragraphsToHtml(description.trim()))
      setIf('amenities_html', stripHtml(prop.amenities_html || ''), paragraphsToHtml(amenities.trim()))
      // The two HTML setIf comparisons compare stripped-vs-html, so re-check:
      // only keep them if the stripped text genuinely differs.
      if (stripHtml(prop.description_html || '') === description.trim()) delete next['description_html']
      if (stripHtml(prop.amenities_html || '') === amenities.trim()) delete next['amenities_html']

      if (Object.keys(next).length === 0) {
        onDone()
        return
      }

      if (mode === 'agent') {
        const { error: updErr } = await supabase
          .from('properties')
          .update({ ...next, updated_at: new Date().toISOString() })
          .eq('id', prop.id)
        if (updErr) throw updErr
      } else {
        // Client path — propose. Namespace keys so the approver routes them to
        // the properties table (vs. the legacy coming_soon_listings keys).
        const namespaced: Record<string, unknown> = {}
        for (const k of Object.keys(next)) namespaced[`properties.${k}`] = next[k]
        const { error: insErr } = await supabase.from('listing_edits').insert({
          tenant_id: deal.tenant_id,
          deal_id: deal.id,
          listing_id: prop.id,
          proposed_by_user_id: user.id,
          proposed_by_type: 'client',
          field_changes: namespaced,
          status: 'pending',
        })
        if (insErr) throw insErr
      }
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Listing name" colspan={4}>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="APN / PIN" colspan={2}>
          <input value={pin} onChange={(e) => setPin(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Monthly HOA ($)" colspan={2}>
          <input
            value={hoa}
            onChange={(e) => setHoa(e.target.value)}
            placeholder="2089.80"
            className={inputCls}
          />
        </Field>
        <Field label="Beds">
          <input value={beds} onChange={(e) => setBeds(e.target.value)} type="number" step="0.5" className={inputCls} />
        </Field>
        <Field label="Baths">
          <input value={baths} onChange={(e) => setBaths(e.target.value)} type="number" step="0.5" className={inputCls} />
        </Field>
        <Field label="Sqft">
          <input value={sqft} onChange={(e) => setSqft(e.target.value)} type="number" className={inputCls} />
        </Field>
        <Field label="Year built">
          <input value={year} onChange={(e) => setYear(e.target.value)} type="number" className={inputCls} />
        </Field>
        <Field label="Parking" colspan={4}>
          <input
            value={parking}
            onChange={(e) => setParking(e.target.value)}
            placeholder="1 parking space, deeded"
            className={inputCls}
          />
        </Field>
        <Field label="Description" colspan={4}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className={inputCls}
          />
        </Field>
        <Field label="Amenities" colspan={4}>
          <textarea
            value={amenities}
            onChange={(e) => setAmenities(e.target.value)}
            rows={3}
            className={inputCls}
          />
        </Field>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          {mode === 'agent' ? 'Save changes' : 'Submit for review'}
        </button>
      </div>
    </form>
  )
}

// ===========================================================================
// SCHEDULE EVENTS CARD — schedule_events editor with date pickers
// ===========================================================================
export function ScheduleEventsCard({
  deal,
  mode,
  onChanged,
}: {
  deal: Deal
  mode: 'agent' | 'client'
  onChanged?: () => void
}) {
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('schedule_events')
      .select('id, deal_id, tenant_id, client_id, event_type, title, starts_at, ends_at, all_day, audience, status')
      .eq('deal_id', deal.id)
      .order('starts_at', { ascending: true })
    setEvents((data as ScheduleEvent[]) || [])
    setLoading(false)
  }, [deal.id])

  useEffect(() => {
    load()
  }, [load])

  const onMarket = events.find((e) => e.event_type === 'on_market')
  const state: CardState = onMarket ? 'complete' : events.length > 0 ? 'in_progress' : 'not_started'
  const summary = loading
    ? 'Loading…'
    : events.length === 0
      ? 'No events yet — add the going-live date and open houses.'
      : `${events.length} event${events.length === 1 ? '' : 's'}${
          onMarket?.starts_at ? ` · live ${fmtDate(onMarket.starts_at)}` : ''
        }`

  const canEdit = mode === 'agent' // schedule is agent-owned

  return (
    <Card state={state} icon={CalendarDays} title="Schedule" summary={summary} spanFull>
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-700 hover:text-ink-900"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Collapse' : events.length === 0 ? 'Add events' : 'Manage schedule'}
      </button>

      {expanded && (
        <div className="mt-4 space-y-2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-ink-500" />
          ) : (
            <>
              {events.map((ev) =>
                editingId === ev.id ? (
                  <EventEditor
                    key={ev.id}
                    deal={deal}
                    event={ev}
                    onCancel={() => setEditingId(null)}
                    onDone={() => {
                      setEditingId(null)
                      load()
                      onChanged?.()
                    }}
                  />
                ) : (
                  <EventRow
                    key={ev.id}
                    event={ev}
                    canEdit={canEdit}
                    onEdit={() => setEditingId(ev.id)}
                    onDelete={async () => {
                      if (!confirm(`Remove "${ev.title || eventTypeLabel(ev.event_type)}"?`)) return
                      const { error } = await supabase.from('schedule_events').delete().eq('id', ev.id)
                      if (error) {
                        alert('Delete failed: ' + error.message)
                        return
                      }
                      load()
                      onChanged?.()
                    }}
                  />
                ),
              )}

              {canEdit &&
                (adding ? (
                  <EventEditor
                    deal={deal}
                    event={null}
                    onCancel={() => setAdding(false)}
                    onDone={() => {
                      setAdding(false)
                      load()
                      onChanged?.()
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setAdding(true)}
                    className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-700 hover:text-ink-900 pt-2"
                  >
                    <Plus className="w-3 h-3" />
                    Add event
                  </button>
                ))}

              {!canEdit && (
                <p className="text-2xs uppercase tracking-widest text-ink-400 pt-1">
                  Your agent manages the schedule
                </p>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  )
}

function EventRow({
  event,
  canEdit,
  onEdit,
  onDelete,
}: {
  event: ScheduleEvent
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 border border-ink-100 bg-white px-3 py-2">
      <div className="min-w-0">
        <div className="text-sm text-ink-900 truncate">
          {event.title || eventTypeLabel(event.event_type)}
        </div>
        <div className="text-2xs uppercase tracking-widest text-ink-500">
          {eventTypeLabel(event.event_type)}
          {event.starts_at ? ` · ${fmtDateTime(event.starts_at)}` : ''}
          {event.ends_at && !event.all_day ? `–${fmtTime(event.ends_at)}` : ''}
        </div>
      </div>
      {canEdit && (
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onEdit} title="Edit" className="text-ink-500 hover:text-ink-900">
            <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button onClick={onDelete} title="Remove" className="text-ink-500 hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  )
}

function EventEditor({
  deal,
  event,
  onCancel,
  onDone,
}: {
  deal: Deal
  event: ScheduleEvent | null
  onCancel: () => void
  onDone: () => void
}) {
  const [eventType, setEventType] = useState(event?.event_type || 'open_house')
  const [title, setTitle] = useState(event?.title || '')
  const [date, setDate] = useState(toDateInput(event?.starts_at))
  const [startTime, setStartTime] = useState(toTimeInput(event?.starts_at))
  const [endTime, setEndTime] = useState(toTimeInput(event?.ends_at))
  const [audience, setAudience] = useState(event?.audience || 'both')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!date) {
      setError('Pick a date.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const startsAt = combineDateTime(date, startTime || '09:00')
      const endsAt = endTime ? combineDateTime(date, endTime) : startsAt
      const payload = {
        deal_id: deal.id,
        tenant_id: deal.tenant_id,
        client_id: deal.client_id,
        event_type: eventType,
        title: title.trim() || eventTypeLabel(eventType),
        starts_at: startsAt,
        ends_at: endsAt,
        all_day: !startTime,
        audience,
        status: 'confirmed',
      }
      if (event) {
        const { error: e } = await supabase
          .from('schedule_events')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', event.id)
        if (e) throw e
      } else {
        const { error: e } = await supabase.from('schedule_events').insert(payload)
        if (e) throw e
      }
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-ink-300 bg-white p-3 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Field label="Type" colspan={2}>
          <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={inputCls}>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Audience" colspan={2}>
          <select value={audience} onChange={(e) => setAudience(e.target.value)} className={inputCls}>
            <option value="both">Both</option>
            <option value="seller">Seller only</option>
            <option value="buyer">Buyer only</option>
          </select>
        </Field>
        <Field label="Title" colspan={4}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={eventTypeLabel(eventType)}
            className={inputCls}
          />
        </Field>
        <Field label="Date" colspan={2}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Start time">
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
        </Field>
        <Field label="End time">
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
        </Field>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          {event ? 'Save' : 'Add'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small atoms + helpers
// ---------------------------------------------------------------------------
const inputCls = 'border border-ink-200 px-3 py-2 text-sm bg-cream w-full focus:outline-none focus:border-ink-900'

function Field({
  label,
  children,
  colspan,
}: {
  label: string
  children: React.ReactNode
  colspan?: number
}) {
  const cls =
    colspan === 2
      ? 'md:col-span-2'
      : colspan === 3
      ? 'md:col-span-3'
      : colspan === 4
      ? 'col-span-2 md:col-span-4'
      : ''
  return (
    <div className={cls}>
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/?[^>]+>/g, '')
    .trim()
}

function paragraphsToHtml(text: string): string {
  if (!text) return ''
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

// Date/time helpers. schedule_events stores timestamptz; the date pickers work
// in the browser's local zone, which is what an agent expects when they type
// "June 6, 1pm".
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toTimeInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function combineDateTime(date: string, time: string): string {
  // date='YYYY-MM-DD', time='HH:MM' in local zone → ISO string.
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh || 0, mm || 0).toISOString()
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
