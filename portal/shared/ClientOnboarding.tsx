// src/portal/shared/ClientOnboarding.tsx
//
// Phase 1 — client-side onboarding gate. Runs once per member, on the same
// signal the first-login tour uses (isClient && memberOnboardedAt === null),
// BEFORE the tour. Collects the one new thing the rebuild needs: the client's
// preferred calendar, so portal schedule events can be pushed to it via .ics.
//
// It does NOT call markOnboarded() — that's the tour's job, so the sequence is:
//   onboarding gate (calendar) -> dismiss -> first-login tour -> markOnboarded.
// We persist calendar choice to clients.calendar_provider and set a local
// "seen" flag so the gate doesn't reappear within the session if the tour is
// still pending.
import { useEffect, useState } from 'react'
import { CalendarCheck, ArrowRight, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, CalendarProvider } from '@/lib/supabase'
import { CALENDAR_PROVIDERS } from './calendar'
import { PrimaryButton, GhostButton } from './ui'

const SEEN_KEY = 'mp_calendar_onboarding_seen'

// P9.6 — onSettled fires once this gate is out of the way (either it decided
// not to show, or the client dismissed/saved). PortalShell uses it to hold the
// first-login tour back so the two dialogs never stack.
export default function ClientOnboarding({ onSettled }: { onSettled?: () => void }) {
  const { isClient, clientProfile, memberOnboardedAt } = useAuth()
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState<CalendarProvider | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Only for brand-new client members who haven't already picked a calendar.
    const alreadySeen = sessionStorage.getItem(SEEN_KEY) === '1'
    if (
      isClient &&
      memberOnboardedAt === null &&
      clientProfile &&
      !clientProfile.calendar_provider &&
      !alreadySeen
    ) {
      // Small delay so it doesn't collide with first paint
      const t = setTimeout(() => setOpen(true), 400)
      return () => clearTimeout(t)
    }
    // Gate not needed for this member — release the tour immediately.
    onSettled?.()
  }, [isClient, memberOnboardedAt, clientProfile, onSettled])

  function dismiss() {
    sessionStorage.setItem(SEEN_KEY, '1')
    setOpen(false)
    onSettled?.()
  }

  async function save() {
    if (!clientProfile) return
    setSaving(true)
    try {
      await supabase
        .from('clients')
        .update({
          calendar_provider: choice,
          calendar_prefs: { push_enabled: true, set_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientProfile.id)
    } finally {
      setSaving(false)
      dismiss()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-cream w-full max-w-md shadow-2xl border border-ink-200">
        <div className="flex items-start justify-between p-6 pb-0">
          <CalendarCheck className="w-7 h-7 text-ink-900" strokeWidth={1.5} />
          <button onClick={dismiss} className="text-ink-400 hover:text-ink-900" aria-label="Skip">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 pt-4">
          <div className="text-2xs uppercase tracking-widest text-slate mb-2">One quick thing</div>
          <h2 className="font-display text-2xl text-ink-900 leading-tight mb-2">
            Never miss a showing.
          </h2>
          <p className="text-sm text-ink-600 leading-relaxed mb-5">
            Pick your calendar and we'll let you add every open house, private showing, and key
            date straight to it with one tap. Which do you use?
          </p>

          <div className="space-y-2 mb-6">
            {CALENDAR_PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => setChoice(p.value)}
                className={`w-full text-left px-4 py-3 border text-sm transition-colors ${
                  choice === p.value
                    ? 'border-ink-900 bg-white text-ink-900'
                    : 'border-ink-200 bg-white/60 text-ink-600 hover:border-ink-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <GhostButton onClick={dismiss}>Skip for now</GhostButton>
            <PrimaryButton onClick={save} disabled={!choice || saving}>
              {saving ? 'Saving…' : 'Continue'}
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  )
}
