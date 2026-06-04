// EPIC F.1 — Brokerage operator page (admin only).
//
// Route: /brokerage
//
// The first piece of the operator cockpit: a roster of every tenant on the
// platform and a form to onboard a new agent. Onboarding provisions a tenant +
// branding + a non-admin agent account scoped to it, and sends a magic-link
// invite. The new agent only ever sees their own tenant (F.0 scoping).

import { useCallback, useEffect, useState } from 'react'
import { Building2, UserPlus, Loader2, CheckCircle2, ShieldAlert, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type TenantRow = {
  tenant_id: string
  display_name: string
  slug: string
  contacts: number
  clients: number
  open_deals: number
  open_pipeline: number
  closed_deals: number
  closed_commission: number
  hot_leads: number
  last_activity: string | null
}

type RosterRow = {
  agent_user_id: string
  name: string
  email: string | null
  role: string | null
  ytd_company_dollar_cents: number
  is_capped: boolean
  cap_company_dollar_cents: number
  deals_count: number
  agent_earnings_ytd_cents: number
  company_earnings_ytd_cents: number
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, notation: 'compact' }).format(n || 0)

type OnboardResult = { ok: true; slug: string; email_sent: boolean } | { error: string } | null

export default function Brokerage() {
  const { profile, actAsTenant, currentTenant } = useAuth()
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)

  const [roster, setRoster] = useState<RosterRow[]>([])
  const [rosterLoading, setRosterLoading] = useState(true)

  const [agentName, setAgentName] = useState('')
  const [agentEmail, setAgentEmail] = useState('')
  const [brokerageName, setBrokerageName] = useState('')
  const [dreLicense, setDreLicense] = useState('')
  const [agentPhone, setAgentPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<OnboardResult>(null)

  const loadTenants = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.rpc('tenant_rollup')
    setTenants((data as TenantRow[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTenants()
  }, [loadTenants])

  const loadRoster = useCallback(async () => {
    if (!currentTenant) {
      setRoster([])
      setRosterLoading(false)
      return
    }
    setRosterLoading(true)
    const { data } = await supabase.rpc('commission_roster', { p_tenant_id: currentTenant.id })
    setRoster((data as RosterRow[]) || [])
    setRosterLoading(false)
  }, [currentTenant])

  useEffect(() => {
    loadRoster()
  }, [loadRoster])

  if (!profile?.is_brokerage_admin) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-16 text-center">
        <ShieldAlert className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.25} />
        <h1 className="font-display text-2xl text-ink-900">Not authorized</h1>
        <p className="text-ink-600 mt-2">This area is for brokerage administrators.</p>
      </div>
    )
  }

  async function onboard() {
    if (submitting) return
    setResult(null)
    if (!agentName.trim() || !agentEmail.trim() || !brokerageName.trim()) {
      setResult({ error: 'Agent name, email, and brokerage name are required.' })
      return
    }
    setSubmitting(true)
    const { data, error } = await supabase.functions.invoke('onboard_agent', {
      body: {
        agent_name: agentName.trim(),
        agent_email: agentEmail.trim(),
        brokerage_name: brokerageName.trim(),
        dre_license: dreLicense.trim() || null,
        agent_phone: agentPhone.trim() || null,
      },
    })
    setSubmitting(false)
    if (error) {
      const msg = (error as any)?.context?.error || error.message || 'Onboarding failed.'
      setResult({ error: String(msg) })
      return
    }
    if (data?.error) {
      setResult({ error: String(data.error) })
      return
    }
    setResult({ ok: true, slug: data.slug, email_sent: !!data.email_sent })
    setAgentName(''); setAgentEmail(''); setBrokerageName(''); setDreLicense(''); setAgentPhone('')
    loadTenants()
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-8">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">Operator</div>
        <h1 className="font-display text-3xl text-ink-900">Brokerage</h1>
        <p className="text-ink-600 mt-2 max-w-2xl leading-relaxed">
          Every tenant on the platform, and the form to bring a new agent on. Each
          agent gets a private workspace scoped to their own tenant.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Onboard form */}
        <div className="lg:col-span-2">
          <div className="border border-ink-200 bg-cream p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-4 h-4 text-ink-700" strokeWidth={1.5} />
              <h2 className="font-display text-lg text-ink-900">Onboard an agent</h2>
            </div>
            <div className="space-y-3">
              <Field label="Agent name" value={agentName} onChange={setAgentName} placeholder="Jane Doe" />
              <Field label="Agent email" value={agentEmail} onChange={setAgentEmail} placeholder="jane@example.com" type="email" />
              <Field label="Brokerage / workspace name" value={brokerageName} onChange={setBrokerageName} placeholder="Doe Realty" />
              <Field label="DRE license (optional)" value={dreLicense} onChange={setDreLicense} placeholder="02xxxxxx" />
              <Field label="Phone (optional)" value={agentPhone} onChange={setAgentPhone} placeholder="(415) 555-0100" />
            </div>
            <button
              onClick={onboard}
              disabled={submitting}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              {submitting ? 'Provisioning…' : 'Provision + invite'}
            </button>

            {result && 'error' in result && (
              <div className="mt-4 text-sm text-red-700 border border-red-200 bg-red-50 px-3 py-2">{result.error}</div>
            )}
            {result && 'ok' in result && (
              <div className="mt-4 text-sm text-emerald-800 border border-emerald-200 bg-emerald-50 px-3 py-3">
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Workspace created
                </div>
                <div className="text-2xs uppercase tracking-widest text-emerald-700 mt-1">
                  /{result.slug} · invite {result.email_sent ? 'emailed' : 'not sent (check Resend)'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tenant roster */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-ink-700" strokeWidth={1.5} />
            <h2 className="font-display text-lg text-ink-900">Tenants</h2>
            <span className="text-2xs uppercase tracking-widest text-ink-400">{tenants.length}</span>
          </div>
          {loading ? (
            <div className="py-12 text-center text-2xs uppercase tracking-widest text-ink-500">Loading…</div>
          ) : (
            <div className="border border-ink-200 divide-y divide-ink-100">
              {tenants.map((t) => (
                <div key={t.tenant_id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-ink-900 truncate">{t.display_name}</div>
                      <div className="text-2xs uppercase tracking-widest text-ink-400 mt-0.5">/{t.slug}</div>
                    </div>
                    <button
                      onClick={() => actAsTenant(t.tenant_id)}
                      className="shrink-0 px-3 py-1.5 border border-ink-300 text-2xs uppercase tracking-widest text-ink-700 hover:border-ink-900 hover:text-ink-900"
                    >
                      Act as
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-2xs uppercase tracking-widest text-ink-500">
                    <span>{t.contacts} contacts</span>
                    <span>{t.clients} clients</span>
                    {t.hot_leads > 0 && <span className="text-ink-900">{t.hot_leads} hot</span>}
                    {t.open_deals > 0 && <span>{money(t.open_pipeline)} pipeline</span>}
                    {t.closed_deals > 0 && <span className="text-emerald-700">{money(t.closed_commission)} closed</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Commission standing — current acting tenant */}
      <div className="mt-12">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-4 h-4 text-ink-700" strokeWidth={1.5} />
          <h2 className="font-display text-lg text-ink-900">Commission standing</h2>
          {currentTenant && (
            <span className="text-2xs uppercase tracking-widest text-ink-400">{currentTenant.display_name}</span>
          )}
        </div>
        {rosterLoading ? (
          <div className="py-12 text-center text-2xs uppercase tracking-widest text-ink-500">Loading…</div>
        ) : roster.length === 0 ? (
          <div className="border border-ink-200 px-4 py-8 text-center text-sm text-ink-500">
            No salespeople in this workspace yet.
          </div>
        ) : (
          <div className="border border-ink-200 divide-y divide-ink-100">
            {roster.map((r) => {
              const pct = Math.min(
                100,
                Math.round((r.ytd_company_dollar_cents / (r.cap_company_dollar_cents || 1)) * 100),
              )
              return (
                <div key={r.agent_user_id} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center text-ink-900">
                        <span className="truncate">{r.name}</span>
                        {r.is_capped && (
                          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 text-2xs uppercase tracking-widest bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> capped
                          </span>
                        )}
                      </div>
                      <div className="text-2xs uppercase tracking-widest text-ink-400 mt-0.5">
                        {r.role || 'member'}
                        {r.deals_count > 0 ? ` · ${r.deals_count} closed` : ''}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-2xs uppercase tracking-widest text-ink-500 tabular-nums">
                      {money(r.ytd_company_dollar_cents / 100)} / {money(r.cap_company_dollar_cents / 100)} to cap
                    </div>
                  </div>
                  <div className="h-1.5 bg-ink-100 overflow-hidden mt-2">
                    <div
                      className={`h-full ${r.is_capped ? 'bg-emerald-500' : 'bg-ink-900'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {(r.agent_earnings_ytd_cents > 0 || r.company_earnings_ytd_cents > 0) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-2xs uppercase tracking-widest text-ink-500">
                      <span>{money(r.agent_earnings_ytd_cents / 100)} to agent ytd</span>
                      <span className="text-emerald-700">{money(r.company_earnings_ytd_cents / 100)} to MP ytd</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <label className="block">
      <span className="text-2xs uppercase tracking-widest text-ink-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 border border-ink-200 bg-white text-sm focus:outline-none focus:border-ink-900"
      />
    </label>
  )
}
