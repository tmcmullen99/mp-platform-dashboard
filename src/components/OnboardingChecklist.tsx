// P-Onb.3 — OnboardingChecklist. The first-session runway on the agent home.
// After a new agent finishes the wizard (branding done), this surfaces the next
// concrete steps — import contacts, add a client, build a CMA — each linking to
// the surface that already exists. Self-contained: runs its own head-count queries
// so Today.tsx only needs a one-line render. Auto-hides once every step is done or
// the agent dismisses it (persisted per-tenant in localStorage, the same store
// AuthContext already uses), so an established agent like Tim never sees it.
// Append ?setup=1 to /  to force it visible (testing / re-open).

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, ArrowRight, X, Sparkles } from 'lucide-react'
import { supabase, TenantBranding } from '@/lib/supabase'

type Props = { tenantId: string; branding: TenantBranding | null }

type Item = { key: string; label: string; hint: string; to: string; done: boolean }

const dismissKey = (tid: string) => `mp_setup_dismissed_${tid}`

export default function OnboardingChecklist({ tenantId, branding }: Props) {
  const [params] = useSearchParams()
  const force = params.get('setup') === '1'
  const [counts, setCounts] = useState<{ contacts: number; clients: number; cmas: number } | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(localStorage.getItem(dismissKey(tenantId)) === '1')
  }, [tenantId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [c1, c2, c3] = await Promise.all([
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('cmas').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      ])
      if (cancelled) return
      setCounts({ contacts: c1.count || 0, clients: c2.count || 0, cmas: c3.count || 0 })
    })()
    return () => {
      cancelled = true
    }
  }, [tenantId])

  // Don't flash an empty/incorrect state before the counts resolve.
  if (!counts) return null

  const items: Item[] = [
    {
      key: 'brand',
      label: 'Set up your brand',
      hint: 'Name, colors, logo, and bio',
      to: '/settings',
      done: !!(branding?.agent_name && branding.agent_name.trim()),
    },
    {
      key: 'contacts',
      label: 'Import your contacts',
      hint: 'Bring your sphere into the CRM',
      to: '/crm/import',
      done: counts.contacts > 0,
    },
    {
      key: 'clients',
      label: 'Add your first client',
      hint: 'Open a war room and start a deal',
      to: '/clients',
      done: counts.clients > 0,
    },
    {
      key: 'cma',
      label: 'Build your first CMA',
      hint: 'Turn comps into a branded analysis',
      to: '/cmas/new',
      done: counts.cmas > 0,
    },
  ]

  const doneCount = items.filter((i) => i.done).length
  const allDone = doneCount === items.length

  // Hidden when fully set up or dismissed — unless force-shown via ?setup=1.
  if (!force && (allDone || dismissed)) return null

  const pct = Math.round((doneCount / items.length) * 100)

  function hide() {
    localStorage.setItem(dismissKey(tenantId), '1')
    setDismissed(true)
  }

  return (
    <div className="mb-10 border border-ink-100 bg-white overflow-hidden">
      {/* navy header strip */}
      <div className="bg-ink-900 px-6 py-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-cream/80 mt-0.5 shrink-0" strokeWidth={1.5} />
          <div>
            <h2 className="font-display text-xl text-cream leading-tight">
              {allDone ? 'Your workspace is set up.' : 'Finish setting up your workspace'}
            </h2>
            <p className="text-2xs uppercase tracking-widest text-cream/60 mt-1.5">
              {doneCount} of {items.length} done
            </p>
          </div>
        </div>
        <button
          onClick={hide}
          aria-label="Hide setup checklist"
          className="text-cream/50 hover:text-cream transition-colors shrink-0"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* progress bar */}
      <div className="h-1 bg-ink-100">
        <div className="h-full bg-ink-900 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      {/* steps */}
      <ul className="divide-y divide-ink-100">
        {items.map((item) => (
          <li key={item.key}>
            {item.done ? (
              <div className="flex items-center gap-4 px-6 py-4">
                <span className="w-6 h-6 shrink-0 bg-ink-900 text-cream flex items-center justify-center rounded-full">
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink-400 line-through truncate">{item.label}</div>
                </div>
                <span className="text-2xs uppercase tracking-widest text-ink-400 shrink-0">Done</span>
              </div>
            ) : (
              <Link to={item.to} className="flex items-center gap-4 px-6 py-4 group hover:bg-ink-50 transition-colors">
                <span className="w-6 h-6 shrink-0 border border-ink-300 rounded-full group-hover:border-ink-900 transition-colors" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink-900 font-medium truncate">{item.label}</div>
                  <div className="text-xs text-ink-500 mt-0.5 truncate">{item.hint}</div>
                </div>
                <ArrowRight
                  className="w-4 h-4 text-ink-300 group-hover:text-ink-900 group-hover:translate-x-0.5 transition-all shrink-0"
                  strokeWidth={1.5}
                />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
