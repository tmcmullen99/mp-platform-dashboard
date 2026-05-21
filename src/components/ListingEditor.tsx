// P8.3 — Client-facing listing editor with agent approval workflow.
// Client edits don't write directly to coming_soon_listings — they create a
// listing_edits row with status='pending'. Agent approves/rejects from the
// matching deal's view, which applies the change to the live listing.
import { useEffect, useState, FormEvent } from 'react'
import { Loader2, Edit3, Check, X, AlertCircle } from 'lucide-react'
import { supabase, Deal, ListingEdit } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type ComingSoonListing = {
  id: string
  slug: string
  name: string
  subtitle: string | null
  description_html: string | null
  features_html: string | null
}

export default function ListingEditor({ deal }: { deal: Deal }) {
  const { user } = useAuth()
  const [listing, setListing] = useState<ComingSoonListing | null>(null)
  const [pendingEdit, setPendingEdit] = useState<ListingEdit | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  // form state
  const [description, setDescription] = useState('')
  const [features, setFeatures] = useState('')
  const [showingTimes, setShowingTimes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function refresh() {
    if (!deal.coming_soon_listing_id) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [{ data: l }, { data: pending }] = await Promise.all([
      supabase
        .from('coming_soon_listings')
        .select('*')
        .eq('id', deal.coming_soon_listing_id)
        .single(),
      supabase
        .from('listing_edits')
        .select('*')
        .eq('deal_id', deal.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    setListing((l as ComingSoonListing) || null)
    setPendingEdit((pending as ListingEdit) || null)
    if (l) {
      setDescription(stripHtml((l as ComingSoonListing).description_html || ''))
      setFeatures(stripHtml((l as ComingSoonListing).features_html || ''))
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id, deal.coming_soon_listing_id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !deal.coming_soon_listing_id) return
    setSubmitting(true)
    try {
      // Diff: only include fields that changed
      const changes: Record<string, string> = {}
      const currentDesc = stripHtml(listing?.description_html || '')
      const currentFeat = stripHtml(listing?.features_html || '')
      if (description.trim() !== currentDesc) {
        changes['description_html'] = paragraphsToHtml(description.trim())
      }
      if (features.trim() !== currentFeat) {
        changes['features_html'] = paragraphsToHtml(features.trim())
      }
      if (showingTimes.trim()) {
        changes['_preferred_showing_times'] = showingTimes.trim()
      }

      if (Object.keys(changes).length === 0) {
        setEditing(false)
        setSubmitting(false)
        return
      }

      const { error } = await supabase.from('listing_edits').insert({
        tenant_id: deal.tenant_id,
        deal_id: deal.id,
        listing_id: deal.coming_soon_listing_id,
        proposed_by_user_id: user.id,
        proposed_by_type: 'client',
        field_changes: changes,
        status: 'pending',
      })
      if (error) {
        alert('Could not submit changes: ' + error.message)
        return
      }
      setEditing(false)
      refresh()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loader2 className="w-5 h-5 animate-spin text-ink-500" />
  }

  if (!listing) {
    return (
      <p className="text-sm text-ink-600">
        Your listing details aren't set up yet — check back after your agent posts the initial info.
      </p>
    )
  }

  return (
    <div className="border-t border-ink-200 pt-10 mt-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
            Tell us about your home
          </div>
          <h2 className="font-display text-2xl text-ink-900">Your input shapes the listing.</h2>
        </div>
        {!editing && !pendingEdit && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-3 py-2 bg-ink-900 text-cream text-sm hover:bg-ink-800 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </div>

      {pendingEdit && (
        <div className="border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 mb-6">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="text-sm text-amber-900 flex-1">
            <strong>Pending review.</strong> Your latest edits were submitted{' '}
            {new Date(pendingEdit.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}{' '}
            and are awaiting your agent's approval before going live. We'll notify you when reviewed.
          </div>
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          <div>
            <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">
              What makes your home special?
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="A few paragraphs about what you love about this home — the morning light in the kitchen, the rooftop deck at sunset, the way the neighbors all leave their porch lights on at Halloween…"
              className="w-full px-3 py-2 border border-ink-200 text-sm focus:outline-none focus:border-ink-900 leading-relaxed"
            />
          </div>
          <div>
            <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">
              Features and highlights
            </label>
            <textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              rows={4}
              placeholder="Updated kitchen 2023, in-unit laundry, garage parking, deeded storage, dog-friendly building…"
              className="w-full px-3 py-2 border border-ink-200 text-sm focus:outline-none focus:border-ink-900"
            />
          </div>
          <div>
            <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">
              Preferred showing times
            </label>
            <input
              type="text"
              value={showingTimes}
              onChange={(e) => setShowingTimes(e.target.value)}
              placeholder="Weekends 11am–4pm, weekday evenings after 6pm, no Mondays…"
              className="w-full px-3 py-2 border border-ink-200 text-sm focus:outline-none focus:border-ink-900"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                refresh()
              }}
              className="px-4 py-2 text-sm text-ink-600 hover:text-ink-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-ink-900 text-cream text-sm hover:bg-ink-800 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Submit for review
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6 max-w-3xl">
          <ReadOnlyField
            label="What makes your home special"
            value={stripHtml(listing.description_html || '')}
            empty="Not yet provided. Click Edit to add your perspective."
          />
          <ReadOnlyField
            label="Features and highlights"
            value={stripHtml(listing.features_html || '')}
            empty="Not yet provided."
          />
        </div>
      )}
    </div>
  )
}

function ReadOnlyField({ label, value, empty }: { label: string; value: string; empty: string }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">{label}</div>
      {value ? (
        <p className="text-sm text-ink-700 whitespace-pre-wrap leading-relaxed">{value}</p>
      ) : (
        <p className="text-sm text-ink-500 italic">{empty}</p>
      )}
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
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

// ============================================================================
// AGENT-SIDE — review and approve pending listing edits
// ============================================================================

export function ListingEditApprovals({ deal }: { deal: Deal }) {
  const { user } = useAuth()
  const [edits, setEdits] = useState<ListingEdit[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    const { data } = await supabase
      .from('listing_edits')
      .select('*')
      .eq('deal_id', deal.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setEdits((data as ListingEdit[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id])

  async function review(edit: ListingEdit, decision: 'approved' | 'rejected', note: string) {
    if (!user) return
    // Update the edit row first
    const { error: eErr } = await supabase
      .from('listing_edits')
      .update({
        status: decision,
        agent_response: note || null,
        reviewed_by_user_id: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', edit.id)
    if (eErr) {
      alert('Could not update edit: ' + eErr.message)
      return
    }

    // If approved, apply the changes to coming_soon_listings
    if (decision === 'approved' && edit.listing_id) {
      const changes = edit.field_changes as Record<string, string>
      const applicable: Record<string, string> = {}
      for (const k of Object.keys(changes)) {
        if (k.startsWith('_')) continue // internal-only fields
        applicable[k] = changes[k]
      }
      if (Object.keys(applicable).length > 0) {
        await supabase
          .from('coming_soon_listings')
          .update(applicable)
          .eq('id', edit.listing_id)
      }
    }

    // Notify the client
    const { data: dealRow } = await supabase
      .from('deals')
      .select('client_id, tenant_id')
      .eq('id', deal.id)
      .single()
    if (dealRow) {
      await supabase.from('notifications').insert({
        tenant_id: dealRow.tenant_id,
        recipient_type: 'client',
        recipient_id: dealRow.client_id,
        notification_type: `listing_edit_${decision}`,
        title:
          decision === 'approved'
            ? 'Your listing edits are live'
            : "Your edits weren't accepted",
        body: note || null,
        link_url: '/portal/listing',
      })
    }

    refresh()
  }

  const pending = edits.filter((e) => e.status === 'pending')
  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-ink-500" />
  if (pending.length === 0 && edits.length === 0) return null

  return (
    <section className="mt-12">
      <h3 className="text-2xs uppercase tracking-widest text-ink-500 mb-4">
        Client edits {pending.length > 0 && `(${pending.length} pending)`}
      </h3>
      <div className="space-y-3">
        {edits.map((edit) => (
          <EditRow key={edit.id} edit={edit} onReview={review} />
        ))}
      </div>
    </section>
  )
}

function EditRow({
  edit,
  onReview,
}: {
  edit: ListingEdit
  onReview: (e: ListingEdit, d: 'approved' | 'rejected', note: string) => void
}) {
  const [note, setNote] = useState('')
  const [expanded, setExpanded] = useState(edit.status === 'pending')
  const changes = edit.field_changes as Record<string, string>
  const fieldKeys = Object.keys(changes)

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
    cancelled: 'bg-ink-100 text-ink-500',
  }

  return (
    <div className="border border-ink-200 p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className={`text-2xs uppercase tracking-widest px-2 py-0.5 ${
              statusColors[edit.status]
            }`}
          >
            {edit.status}
          </span>
          <span className="text-sm text-ink-700">
            {edit.proposed_by_type} proposed {fieldKeys.length}{' '}
            {fieldKeys.length === 1 ? 'change' : 'changes'}
          </span>
        </div>
        <span className="text-2xs uppercase tracking-widest text-ink-500">
          {new Date(edit.created_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
      </button>
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-ink-100 pt-4">
          {fieldKeys.map((key) => (
            <div key={key}>
              <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
                {humanizeField(key)}
              </div>
              <div className="text-sm text-ink-700 bg-ink-50 p-3 whitespace-pre-wrap">
                {stripHtml(changes[key])}
              </div>
            </div>
          ))}
          {edit.status === 'pending' && (
            <div className="flex items-end gap-3 pt-3 border-t border-ink-100">
              <div className="flex-1">
                <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1">
                  Note to client (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Looks great — applied to the live listing."
                  className="w-full px-3 py-2 border border-ink-200 text-sm focus:outline-none focus:border-ink-900"
                />
              </div>
              <button
                onClick={() => onReview(edit, 'rejected', note)}
                className="px-3 py-2 text-sm text-ink-700 border border-ink-200 hover:bg-ink-50 transition-colors flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Reject
              </button>
              <button
                onClick={() => onReview(edit, 'approved', note)}
                className="px-3 py-2 bg-ink-900 text-cream text-sm hover:bg-ink-800 transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Approve & apply
              </button>
            </div>
          )}
          {edit.agent_response && edit.status !== 'pending' && (
            <div className="text-xs text-ink-600 italic pt-3 border-t border-ink-100">
              Agent note: {edit.agent_response}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function humanizeField(key: string): string {
  const map: Record<string, string> = {
    description_html: 'What makes the home special',
    features_html: 'Features & highlights',
    _preferred_showing_times: 'Preferred showing times',
  }
  return map[key] || key.replace(/_/g, ' ')
}
