// EPIC C.0 — Audiences (outreach foundation).
//
// Route: /audiences
//
// Two surfaces:
//  • Audiences — build a segment over a market's owner graph (min ownership
//    confidence, require-email, lifecycle, current-only), live-preview the
//    eligible count + sample via the resolve_audience RPC, and save it. Saved
//    audiences are what the cadence/wave engine (C.2) will send through.
//  • Suppression list — the canonical do-not-send base. View it and add manual
//    do-not-contact entries. Resend bounce/complaint webhooks (D.0) and
//    ZeroBounce invalids (C.1) will write here automatically later.
//
// Eligibility = owner in market, passes confidence/lifecycle/email filters, and
// is NOT opted-out or on the suppression list. The resolver does the math under
// RLS; this page is the agent-facing control surface.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Target,
  Plus,
  Loader2,
  X as XIcon,
  Users,
  Mail,
  ShieldOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type Market = { id: string; name: string; kind: string }

type AudienceRules = {
  min_confidence?: 'unverified' | 'probable' | 'confirmed'
  require_email?: boolean
  current_only?: boolean
  lifecycle_stages?: string[]
}

type Audience = {
  id: string
  tenant_id: string
  market_id: string | null
  name: string
  description: string | null
  rules: AudienceRules
  last_resolved_count: number | null
  last_resolved_at: string | null
  created_at: string
}

type Suppression = {
  id: string
  email: string
  reason: string
  source: string | null
  note: string | null
  created_at: string
}

type Preview = {
  total_owners: number
  with_email: number
  suppressed: number
  eligible: number
  sample: { name: string; email: string | null; confidence: string }[]
}

const CONFIDENCE_OPTIONS: { value: NonNullable<AudienceRules['min_confidence']>; label: string }[] = [
  { value: 'unverified', label: 'Any (incl. unverified)' },
  { value: 'probable', label: 'Probable or better' },
  { value: 'confirmed', label: 'Confirmed only' },
]

const SUPPRESSION_REASONS: Record<string, string> = {
  unsubscribe: 'Unsubscribed',
  hard_bounce: 'Hard bounce',
  complaint: 'Spam complaint',
  invalid: 'Invalid email',
  manual_dnc: 'Do not contact',
  role_address: 'Role address',
}

function confidenceBadge(conf: string): string {
  return conf === 'confirmed'
    ? 'bg-emerald-50 text-emerald-700'
    : conf === 'probable'
      ? 'bg-sky-50 text-sky-700'
      : 'bg-ink-100 text-ink-500'
}

export default function Audiences() {
  const { currentTenant } = useAuth()
  const [tab, setTab] = useState<'audiences' | 'suppression'>('audiences')
  const [markets, setMarkets] = useState<Market[]>([])
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [loading, setLoading] = useState(true)
  const [building, setBuilding] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [{ data: mk }, { data: aud }] = await Promise.all([
      supabase.from('markets').select('id, name, kind').order('created_at'),
      supabase.from('audiences').select('*').order('created_at', { ascending: false }),
    ])
    setMarkets((mk as Market[]) || [])
    setAudiences((aud as Audience[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">Outreach</div>
          <h1 className="font-display text-3xl text-ink-900">Audiences</h1>
          <p className="text-ink-600 mt-2 max-w-2xl leading-relaxed">
            Segment a market’s owners into a sendable list. Every audience
            subtracts the suppression base — opt-outs, bounces, and do-not-contact
            never make it into a send.
          </p>
        </div>
        {tab === 'audiences' && markets.length > 0 && (
          <button
            onClick={() => setBuilding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            New audience
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-ink-200 mt-6 mb-8">
        <TabButton active={tab === 'audiences'} onClick={() => setTab('audiences')}>
          Audiences
        </TabButton>
        <TabButton active={tab === 'suppression'} onClick={() => setTab('suppression')}>
          Suppression list
        </TabButton>
      </div>

      {tab === 'audiences' ? (
        <AudiencesTab
          loading={loading}
          markets={markets}
          audiences={audiences}
          onNew={() => setBuilding(true)}
        />
      ) : (
        <SuppressionTab tenantId={currentTenant?.id || null} />
      )}

      {building && currentTenant && (
        <AudienceBuilder
          tenantId={currentTenant.id}
          markets={markets}
          onClose={() => setBuilding(false)}
          onSaved={() => {
            setBuilding(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 -mb-px text-2xs uppercase tracking-widest border-b-2 transition-colors ${
        active
          ? 'border-ink-900 text-ink-900'
          : 'border-transparent text-ink-500 hover:text-ink-900'
      }`}
    >
      {children}
    </button>
  )
}

/* ---------------- Audiences tab ---------------- */

function AudiencesTab({
  loading,
  markets,
  audiences,
  onNew,
}: {
  loading: boolean
  markets: Market[]
  audiences: Audience[]
  onNew: () => void
}) {
  const marketName = (id: string | null) =>
    markets.find((m) => m.id === id)?.name || 'Unknown market'

  if (loading) {
    return (
      <div className="py-20 text-center text-2xs uppercase tracking-widest text-ink-500">
        Loading…
      </div>
    )
  }
  if (markets.length === 0) {
    return (
      <div className="border border-dashed border-ink-200 py-16 text-center">
        <Target className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.25} />
        <div className="text-sm text-ink-700 font-medium">No markets yet</div>
        <p className="text-ink-500 text-sm mt-1">
          Create a market and import owners first — audiences segment a market’s owner graph.
        </p>
      </div>
    )
  }
  if (audiences.length === 0) {
    return (
      <div className="border border-dashed border-ink-200 py-16 text-center">
        <Target className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.25} />
        <div className="text-sm text-ink-700 font-medium">No audiences yet</div>
        <p className="text-ink-500 text-sm mt-1 mb-4">
          Build your first segment to preview who’s reachable in a market.
        </p>
        <button
          onClick={onNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          New audience
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {audiences.map((a) => (
        <SavedAudienceCard key={a.id} audience={a} marketName={marketName(a.market_id)} />
      ))}
    </div>
  )
}

function SavedAudienceCard({
  audience,
  marketName,
}: {
  audience: Audience
  marketName: string
}) {
  const [count, setCount] = useState<number | null>(audience.last_resolved_count)
  const [resolving, setResolving] = useState(false)

  async function reResolve() {
    if (!audience.market_id) return
    setResolving(true)
    const { data } = await supabase.rpc('resolve_audience', {
      p_market_id: audience.market_id,
      p_rules: audience.rules,
    })
    const p = data as Preview | null
    if (p) {
      setCount(p.eligible)
      await supabase
        .from('audiences')
        .update({ last_resolved_count: p.eligible, last_resolved_at: new Date().toISOString() })
        .eq('id', audience.id)
    }
    setResolving(false)
  }

  const r = audience.rules || {}
  const ruleChips = [
    CONFIDENCE_OPTIONS.find((c) => c.value === (r.min_confidence || 'unverified'))?.label,
    r.require_email === false ? 'email optional' : 'has email',
    r.current_only === false ? 'all ownership' : 'current owners',
    r.lifecycle_stages && r.lifecycle_stages.length
      ? `stage: ${r.lifecycle_stages.join(', ')}`
      : null,
  ].filter(Boolean) as string[]

  return (
    <div className="border border-ink-200 bg-cream p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-display text-xl text-ink-900">{audience.name}</h3>
          <div className="text-sm text-ink-600 mt-0.5">{marketName}</div>
          {audience.description && (
            <p className="text-sm text-ink-500 mt-1">{audience.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-3xl text-ink-900 tabular-nums">
            {count != null ? count.toLocaleString() : '—'}
          </div>
          <div className="text-2xs uppercase tracking-widest text-ink-500">eligible</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-4">
        {ruleChips.map((c) => (
          <span
            key={c}
            className="text-2xs uppercase tracking-widest bg-ink-100 text-ink-600 px-2 py-0.5"
          >
            {c}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
        <span className="text-2xs uppercase tracking-widest text-ink-400">
          {audience.last_resolved_at
            ? `Resolved ${new Date(audience.last_resolved_at).toLocaleDateString()}`
            : 'Not yet resolved'}
        </span>
        <button
          onClick={reResolve}
          disabled={resolving}
          className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-700 hover:text-ink-900 disabled:opacity-50"
        >
          {resolving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          Re-resolve
        </button>
      </div>
    </div>
  )
}

/* ---------------- Audience builder ---------------- */

function AudienceBuilder({
  tenantId,
  markets,
  onClose,
  onSaved,
}: {
  tenantId: string
  markets: Market[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [marketId, setMarketId] = useState(markets[0]?.id || '')
  const [minConf, setMinConf] = useState<NonNullable<AudienceRules['min_confidence']>>('probable')
  const [requireEmail, setRequireEmail] = useState(true)
  const [currentOnly, setCurrentOnly] = useState(true)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rules: AudienceRules = useMemo(
    () => ({
      min_confidence: minConf,
      require_email: requireEmail,
      current_only: currentOnly,
    }),
    [minConf, requireEmail, currentOnly],
  )

  // re-previewing invalidates a stale preview when rules change
  useEffect(() => {
    setPreview(null)
  }, [marketId, minConf, requireEmail, currentOnly])

  async function runPreview() {
    if (!marketId) {
      setError('Pick a market first.')
      return
    }
    setError(null)
    setPreviewing(true)
    const { data, error: rpcErr } = await supabase.rpc('resolve_audience', {
      p_market_id: marketId,
      p_rules: rules,
    })
    if (rpcErr) setError(rpcErr.message)
    else setPreview(data as Preview)
    setPreviewing(false)
  }

  async function save() {
    if (!name.trim()) {
      setError('Name the audience.')
      return
    }
    if (!marketId) {
      setError('Pick a market.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: insErr } = await supabase.from('audiences').insert({
      tenant_id: tenantId,
      market_id: marketId,
      name: name.trim(),
      description: description.trim() || null,
      rules,
      last_resolved_count: preview?.eligible ?? null,
      last_resolved_at: preview ? new Date().toISOString() : null,
    })
    setSaving(false)
    if (insErr) {
      setError(insErr.message)
      return
    }
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-cream w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-ink-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-7 py-5 border-b border-ink-200 flex items-start justify-between gap-4">
          <div>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">New audience</div>
            <h2 className="font-display text-2xl text-ink-900">Build a segment</h2>
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

        <div className="px-7 py-6 grid md:grid-cols-2 gap-8">
          {/* Definition */}
          <div className="space-y-4">
            <Field label="Audience name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="East Side owners — cold"
                className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
              />
            </Field>
            <Field label="Market">
              <select
                value={marketId}
                onChange={(e) => setMarketId(e.target.value)}
                className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
              >
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Minimum ownership confidence">
              <select
                value={minConf}
                onChange={(e) =>
                  setMinConf(e.target.value as NonNullable<AudienceRules['min_confidence']>)
                }
                className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
              >
                {CONFIDENCE_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Toggle
              label="Require a valid email"
              checked={requireEmail}
              onChange={setRequireEmail}
            />
            <Toggle
              label="Current owners only"
              checked={currentOnly}
              onChange={setCurrentOnly}
            />
            <Field label="Description (optional)">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Probable owners we haven’t reached yet"
                className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
              />
            </Field>
          </div>

          {/* Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-2xs uppercase tracking-widest text-ink-500">Live preview</div>
              <button
                onClick={runPreview}
                disabled={previewing || !marketId}
                className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-700 hover:text-ink-900 disabled:opacity-50"
              >
                {previewing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Resolve
              </button>
            </div>

            {!preview ? (
              <div className="border border-dashed border-ink-200 py-12 text-center text-sm text-ink-500">
                Resolve to preview the eligible count.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <MiniStat label="Owners" value={preview.total_owners} />
                  <MiniStat label="With email" value={preview.with_email} />
                  <MiniStat label="Suppressed" value={preview.suppressed} muted />
                  <MiniStat label="Eligible" value={preview.eligible} accent />
                </div>
                {preview.eligible === 0 ? (
                  <div className="text-2xs uppercase tracking-widest text-ink-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    No one reachable under these rules
                  </div>
                ) : (
                  <div>
                    <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">
                      Sample
                    </div>
                    <ul className="space-y-1 max-h-48 overflow-y-auto">
                      {preview.sample.map((s, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-ink-800 truncate">{s.name || s.email}</span>
                          <span
                            className={`text-2xs uppercase tracking-widest px-1.5 py-0.5 shrink-0 ${confidenceBadge(
                              s.confidence,
                            )}`}
                          >
                            {s.confidence}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="px-7 py-4 border-t border-ink-200 flex items-center justify-between gap-3">
          {error ? (
            <div className="text-sm text-red-700 flex-1 min-w-0">{error}</div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-3 py-2 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save audience'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Suppression tab ---------------- */

function SuppressionTab({ tenantId }: { tenantId: string | null }) {
  const [rows, setRows] = useState<Suppression[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('email_suppressions')
      .select('id, email, reason, source, note, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    setRows((data as Suppression[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function add() {
    const e = email.trim().toLowerCase()
    if (!e || !e.includes('@')) {
      setError('Enter a valid email.')
      return
    }
    if (!tenantId) {
      setError('No active tenant.')
      return
    }
    setAdding(true)
    setError(null)
    const { error: insErr } = await supabase.from('email_suppressions').insert({
      tenant_id: tenantId,
      email: e,
      reason: 'manual_dnc',
      source: 'manual',
      note: note.trim() || null,
    })
    setAdding(false)
    if (insErr) {
      setError(insErr.code === '23505' ? 'That email is already suppressed.' : insErr.message)
      return
    }
    setEmail('')
    setNote('')
    load()
  }

  return (
    <div>
      {/* Manual add */}
      <div className="border border-ink-200 bg-cream p-5 mb-6">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3 inline-flex items-center gap-1.5">
          <ShieldOff className="w-3 h-3" />
          Add do-not-contact
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@example.com"
              className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Requested removal by phone"
              className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
            />
          </div>
          <button
            onClick={add}
            disabled={adding}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Suppress
          </button>
        </div>
        {error && <div className="text-sm text-red-700 mt-3">{error}</div>}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-5 h-5 text-ink-400 animate-spin mx-auto" />
        </div>
      ) : rows.length === 0 ? (
        <div className="border border-dashed border-ink-200 py-16 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-3" strokeWidth={1.25} />
          <div className="text-sm text-ink-700 font-medium">Suppression list is empty</div>
          <p className="text-ink-500 text-sm mt-1">
            Bounces, complaints, and unsubscribes will land here automatically once outreach is live.
          </p>
        </div>
      ) : (
        <div className="border border-ink-200">
          <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-ink-50 text-2xs uppercase tracking-widest text-ink-500 border-b border-ink-200">
            <div className="col-span-5">Email</div>
            <div className="col-span-3">Reason</div>
            <div className="col-span-2">Source</div>
            <div className="col-span-2 text-right">Added</div>
          </div>
          {rows.map((s) => (
            <div
              key={s.id}
              className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-ink-100 last:border-b-0 items-center"
            >
              <div className="col-span-5 text-sm text-ink-900 truncate flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-ink-400 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{s.email}</span>
              </div>
              <div className="col-span-3 text-2xs uppercase tracking-widest text-ink-600">
                {SUPPRESSION_REASONS[s.reason] || s.reason}
              </div>
              <div className="col-span-2 text-2xs uppercase tracking-widest text-ink-400">
                {s.source || '—'}
              </div>
              <div className="col-span-2 text-right text-xs text-ink-500">
                {new Date(s.created_at).toLocaleDateString()}
              </div>
              {s.note && (
                <div className="col-span-12 text-xs text-ink-500 pl-6 -mt-1">{s.note}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------- shared bits ---------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-1.5 text-left"
    >
      <span className="text-sm text-ink-700">{label}</span>
      <span
        className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${
          checked ? 'bg-ink-900' : 'bg-ink-200'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-cream rounded-full transition-all ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}

function MiniStat({
  label,
  value,
  accent,
  muted,
}: {
  label: string
  value: number
  accent?: boolean
  muted?: boolean
}) {
  return (
    <div
      className={`border px-3 py-2.5 ${
        accent ? 'border-ink-900 bg-ink-900 text-cream' : 'border-ink-200'
      }`}
    >
      <div
        className={`font-display text-2xl tabular-nums ${
          accent ? 'text-cream' : muted ? 'text-ink-400' : 'text-ink-900'
        }`}
      >
        {value.toLocaleString()}
      </div>
      <div
        className={`text-2xs uppercase tracking-widest mt-0.5 ${
          accent ? 'text-cream/70' : 'text-ink-500'
        }`}
      >
        {label}
      </div>
    </div>
  )
}
