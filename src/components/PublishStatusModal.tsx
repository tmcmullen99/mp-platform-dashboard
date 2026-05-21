// P9.12.3 — Publish status modal.
//
// Lets agent or client move a listing through its lifecycle:
//   draft → soft_launch → active → pending → sold
//                                       ↓
//                                  expired / withdrawn
//
// Each transition writes two rows:
//   1) UPDATE deals SET listing_status = X
//   2) INSERT INTO listing_status_history (from, to, note, by)
//
// Then fires a cross-side notification so the bell badges the change.
// The history feeds the expired-listing engagement loop in P9.16+.

import { useEffect, useState } from 'react'
import { Loader2, X as XIcon, Send, Check, Sparkles } from 'lucide-react'
import { supabase, Deal } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// ============================================================================
// Statuses
// ============================================================================

export type ListingStatus =
  | 'draft'
  | 'soft_launch'
  | 'active'
  | 'pending'
  | 'sold'
  | 'expired'
  | 'withdrawn'

export type StatusHistoryEntry = {
  id: string
  tenant_id: string
  deal_id: string
  from_status: ListingStatus | null
  to_status: ListingStatus
  note: string | null
  changed_by_user_id: string | null
  changed_by_type: 'agent' | 'client'
  happened_at: string
}

export const LISTING_STATUSES: Array<{
  value: ListingStatus
  label: string
  tagline: string
  badge: string
}> = [
  {
    value: 'draft',
    label: 'Draft',
    tagline: 'Building behind the scenes. Nothing public yet.',
    badge: 'bg-ink-100 text-ink-700',
  },
  {
    value: 'soft_launch',
    label: 'Soft Launch',
    tagline: 'Visible to the warm buyer pool. No MLS days-on-market clock.',
    badge: 'bg-sky-50 text-sky-700',
  },
  {
    value: 'active',
    label: 'Active',
    tagline: 'Live on MLS, syndicated everywhere. The clock is running.',
    badge: 'bg-emerald-50 text-emerald-700',
  },
  {
    value: 'pending',
    label: 'Pending',
    tagline: 'Under contract. Escrow in progress.',
    badge: 'bg-amber-50 text-amber-700',
  },
  {
    value: 'sold',
    label: 'Sold',
    tagline: 'Closed and archived. Congratulations.',
    badge: 'bg-ink-900 text-cream',
  },
  {
    value: 'expired',
    label: 'Expired',
    tagline: 'Listing period ended without a sale. Re-engagement begins.',
    badge: 'bg-red-50 text-red-700',
  },
  {
    value: 'withdrawn',
    label: 'Withdrawn',
    tagline: 'Pulled by seller before a sale. Can re-launch any time.',
    badge: 'bg-ink-100 text-ink-500',
  },
]

export function statusLabel(s: ListingStatus | string | null): string {
  if (!s) return 'Draft'
  return LISTING_STATUSES.find((x) => x.value === s)?.label || s
}

export function statusBadgeClasses(s: ListingStatus | string | null): string {
  if (!s) return 'bg-ink-100 text-ink-700'
  return LISTING_STATUSES.find((x) => x.value === s)?.badge || 'bg-ink-100 text-ink-700'
}

// ============================================================================
// Modal
// ============================================================================

export default function PublishStatusModal({
  deal,
  mode,
  currentStatus,
  onClose,
  onChanged,
}: {
  deal: Deal
  mode: 'agent' | 'client'
  currentStatus: ListingStatus
  onClose: () => void
  onChanged: (next: ListingStatus) => void
}) {
  const { user } = useAuth()
  const [selected, setSelected] = useState<ListingStatus>(currentStatus)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  async function handleApply() {
    if (!user) {
      setError('Not signed in.')
      return
    }
    if (selected === currentStatus) {
      onClose()
      return
    }
    setSaving(true)
    setError(null)
    try {
      // 1) Update the deal's denormalized status
      const { error: updErr } = await supabase
        .from('deals')
        .update({ listing_status: selected })
        .eq('id', deal.id)
      if (updErr) throw updErr

      // 2) Record the transition in history
      const { error: histErr } = await supabase.from('listing_status_history').insert({
        tenant_id: deal.tenant_id,
        deal_id: deal.id,
        from_status: currentStatus,
        to_status: selected,
        note: note.trim() || null,
        changed_by_user_id: user.id,
        changed_by_type: mode,
      })
      if (histErr) {
        // Status updated but history failed — log and continue. Not fatal.
        console.warn('listing_status_history insert failed:', histErr.message)
      }

      // 3) Cross-side notification
      try {
        const newLabel = statusLabel(selected)
        if (mode === 'agent') {
          // Notify the client
          await supabase.from('notifications').insert({
            tenant_id: deal.tenant_id,
            recipient_type: 'client',
            recipient_id: deal.client_id,
            notification_type: 'listing_status_changed',
            title: `Listing status: ${newLabel}`,
            body: note.trim() || `Your agent moved this listing to ${newLabel}.`,
            link_url: '/portal/listing',
          })
        } else {
          // Client → notify all tenant admins
          const { data: adminIds } = await supabase.rpc('get_tenant_admin_user_ids', {
            p_tenant_id: deal.tenant_id,
          })
          const ids = (adminIds || []) as string[]
          if (ids.length > 0) {
            await supabase.from('notifications').insert(
              ids.map((adminId) => ({
                tenant_id: deal.tenant_id,
                recipient_type: 'agent' as const,
                recipient_id: adminId,
                notification_type: 'listing_status_changed',
                title: `Listing status: ${newLabel}`,
                body: note.trim() || `Client moved this listing to ${newLabel}.`,
                link_url: `/clients/${deal.client_id}/listing`,
              })),
            )
          }
        }
      } catch {
        // Non-fatal — primary update already succeeded
      }

      onChanged(selected)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  // Compute the "next likely" status to give a subtle visual nudge
  const nextLikely = SUGGESTED_NEXT[currentStatus]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-cream w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-ink-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 py-5 border-b border-ink-200 flex items-start justify-between gap-4">
          <div>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1 inline-flex items-center gap-1.5">
              <Send className="w-3 h-3" strokeWidth={1.5} />
              Listing status · {deal.title || 'Listing'}
            </div>
            <h2 className="font-display text-2xl text-ink-900 leading-tight">
              {mode === 'client' ? 'Move your listing forward.' : 'Update listing status.'}
            </h2>
            <p className="text-sm text-ink-600 mt-2 leading-relaxed">
              Each step is reversible. Status changes are logged, both sides get notified.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-ink-500 hover:text-ink-900 shrink-0 disabled:opacity-50"
            aria-label="Close"
          >
            <XIcon className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Status list */}
        <div className="px-7 py-5 space-y-2">
          {LISTING_STATUSES.map((s) => {
            const isCurrent = s.value === currentStatus
            const isSelected = s.value === selected
            const isNextLikely = s.value === nextLikely && !isCurrent
            return (
              <button
                key={s.value}
                onClick={() => setSelected(s.value)}
                disabled={saving}
                className={`w-full text-left border p-4 transition-colors ${
                  isSelected
                    ? 'border-ink-900 bg-white ring-2 ring-ink-900/10'
                    : 'border-ink-200 bg-cream hover:border-ink-400'
                } disabled:opacity-50`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0">
                    {isSelected ? (
                      <div className="w-4 h-4 rounded-full bg-ink-900 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-cream" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-ink-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`text-2xs uppercase tracking-widest px-2 py-0.5 ${s.badge}`}
                      >
                        {s.label}
                      </span>
                      {isCurrent && (
                        <span className="text-2xs uppercase tracking-widest text-ink-500">
                          · current
                        </span>
                      )}
                      {isNextLikely && (
                        <span className="text-2xs uppercase tracking-widest text-emerald-700 inline-flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" strokeWidth={2} />
                          Suggested next
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-700 leading-relaxed">{s.tagline}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Note */}
        <div className="px-7 pb-5">
          <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={
              mode === 'client'
                ? 'Tell your agent why you’re changing the status.'
                : 'Note for the client and the history log.'
            }
            className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900 leading-relaxed"
          />
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-ink-200 flex items-center justify-between gap-3 flex-wrap">
          {error ? (
            <div className="text-sm text-red-700 flex-1 min-w-0">{error}</div>
          ) : (
            <div className="text-2xs uppercase tracking-widest text-ink-400">
              {selected === currentStatus
                ? 'Pick a different status to apply a change.'
                : `Moving from ${statusLabel(currentStatus)} → ${statusLabel(selected)}`}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-3 py-2 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={saving || selected === currentStatus}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Applying…
                </>
              ) : (
                'Apply change'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Suggested-next mapping (used to highlight the most likely forward step)
// ============================================================================

const SUGGESTED_NEXT: Record<ListingStatus, ListingStatus | null> = {
  draft: 'soft_launch',
  soft_launch: 'active',
  active: 'pending',
  pending: 'sold',
  sold: null,
  expired: 'soft_launch', // re-launch path
  withdrawn: 'draft',
}

// ============================================================================
// History timeline — exported so the chassis card can render it inline
// ============================================================================

export function StatusHistoryTimeline({
  entries,
}: {
  entries: StatusHistoryEntry[]
}) {
  if (entries.length === 0) {
    return (
      <p className="text-2xs uppercase tracking-widest text-ink-400">
        No status changes yet.
      </p>
    )
  }
  return (
    <ol className="space-y-2.5">
      {entries.map((e) => (
        <li
          key={e.id}
          className="flex items-baseline gap-3 text-xs flex-wrap"
        >
          <span
            className={`text-2xs uppercase tracking-widest px-2 py-0.5 ${statusBadgeClasses(
              e.to_status,
            )}`}
          >
            {statusLabel(e.to_status)}
          </span>
          <span className="text-ink-500 font-mono tabular-nums">
            {formatRelative(e.happened_at)}
          </span>
          <span className="text-ink-400 uppercase tracking-widest text-2xs">
            · by {e.changed_by_type}
          </span>
          {e.from_status && (
            <span className="text-ink-400 text-2xs uppercase tracking-widest">
              · from {statusLabel(e.from_status)}
            </span>
          )}
          {e.note && (
            <span className="text-ink-600 italic ml-1 w-full pl-2 border-l-2 border-ink-100 mt-0.5">
              {e.note}
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  if (isNaN(then)) return iso
  const diffMs = Date.now() - then
  if (diffMs < 60_000) return 'just now'
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`
  const days = Math.floor(diffMs / 86_400_000)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
