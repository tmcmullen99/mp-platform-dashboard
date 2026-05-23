import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Radio,
  Megaphone,
  TrendingUp,
  TrendingDown,
  Power,
  Eye,
  Loader2,
  AlertTriangle,
  Mail,
  ArrowUpRight,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// ===========================================================================
// Types — shape of tenant_audience_summary jsonb + the tables we read
// ===========================================================================

type AudienceSummary = {
  audience: { subscribed: number; total_contacts: number; growth_30d: number; unsub_30d: number }
  cold_drip: {
    active: number
    graduated: number
    exited: number
    total_enrolled: number
    graduated_30d: number
    sends_30d: number
  }
  engagement: { engaged_30d: number; events_30d: number }
  marketplace: {
    make_me_move_active: number
    buyer_feed_active: number
    referrals_total: number
    referrals_converted: number
    credits_outstanding_cents: number
  }
  readiness: {
    markets_total: number
    cold_markets_enabled: number
    has_cold_identity: boolean
    has_primary_identity: boolean
  }
}

type MarketRow = { id: string; name: string }
type SendRow = {
  id: string | null
  email: string | null
  step_number: number | null
  status: string | null
  sent_at: string | null
}

export default function ColdDrip() {
  const { currentTenant } = useAuth()
  const [summary, setSummary] = useState<AudienceSummary | null>(null)
  const [markets, setMarkets] = useState<MarketRow[]>([])
  const [enabled, setEnabled] = useState<Map<string, boolean>>(new Map())
  const [sends, setSends] = useState<SendRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingMarketId, setTogglingMarketId] = useState<string | null>(null)

  const [previewLoading, setPreviewLoading] = useState(false)
  const [preview, setPreview] = useState<{ count: number | null; raw: unknown } | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  async function refresh() {
    if (!currentTenant) return
    setLoading(true)
    setError(null)
    try {
      const [sumResp, marketsResp, settingsResp, sendsResp] = await Promise.all([
        supabase.rpc('tenant_audience_summary', { p_tenant_id: currentTenant.id }),
        supabase
          .from('markets')
          .select('id, name')
          .eq('tenant_id', currentTenant.id)
          .order('name', { ascending: true }),
        supabase
          .from('cold_drip_settings')
          .select('market_id, enabled')
          .eq('tenant_id', currentTenant.id),
        supabase
          .from('cold_drip_sends')
          .select('id, email, step_number, status, sent_at')
          .eq('tenant_id', currentTenant.id)
          .order('sent_at', { ascending: false, nullsFirst: false })
          .limit(12),
      ])
      if (sumResp.error) throw sumResp.error
      setSummary((sumResp.data as AudienceSummary) ?? null)
      setMarkets((marketsResp.data as MarketRow[]) || [])
      const map = new Map<string, boolean>()
      ;((settingsResp.data as { market_id: string; enabled: boolean }[]) || []).forEach((s) =>
        map.set(s.market_id, !!s.enabled),
      )
      setEnabled(map)
      setSends((sendsResp.data as SendRow[]) || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant])

  async function toggleMarket(marketId: string, next: boolean) {
    if (!currentTenant || togglingMarketId) return
    setTogglingMarketId(marketId)
    setError(null)
    // Optimistic flip
    setEnabled((prev) => new Map(prev).set(marketId, next))
    const { error: rpcErr } = await supabase.rpc('set_cold_drip', {
      p_tenant_id: currentTenant.id,
      p_market_id: marketId,
      p_enabled: next,
    })
    if (rpcErr) {
      setEnabled((prev) => new Map(prev).set(marketId, !next)) // revert
      setError(rpcErr.message)
    } else {
      await refresh()
    }
    setTogglingMarketId(null)
  }

  async function previewRecipients() {
    setPreviewLoading(true)
    setPreviewError(null)
    setPreview(null)
    try {
      // functions.invoke attaches the agent's session JWT automatically.
      const { data, error: fnErr } = await supabase.functions.invoke('cold_drip_run', {
        body: { dry_run: true },
      })
      if (fnErr) throw fnErr
      if (data && (data as { error?: string }).error) {
        throw new Error((data as { error: string }).error)
      }
      const d = (data || {}) as Record<string, unknown>
      const count =
        typeof d.recipients === 'number'
          ? (d.recipients as number)
          : Array.isArray(d.recipients)
            ? (d.recipients as unknown[]).length
            : typeof d.count === 'number'
              ? (d.count as number)
              : typeof d.would_send === 'number'
                ? (d.would_send as number)
                : typeof d.total === 'number'
                  ? (d.total as number)
                  : null
      setPreview({ count, raw: data })
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : String(e))
    } finally {
      setPreviewLoading(false)
    }
  }

  if (!currentTenant) {
    return <div className="p-12 text-ink-500 text-sm">Loading tenant context…</div>
  }

  const subscribed = summary?.audience.subscribed ?? 0
  const totalContacts = summary?.audience.total_contacts ?? 0
  const growth30 = summary?.audience.growth_30d ?? 0
  const cold = summary?.cold_drip
  const hasColdIdentity = summary?.readiness.has_cold_identity ?? false
  const coldMarketsEnabled = summary?.readiness.cold_markets_enabled ?? 0

  return (
    <div className="p-12 max-w-6xl">
      {/* Hero — the megaphone number */}
      <div className="mb-12">
        <div className="flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-500 mb-3">
          <Radio className="w-3.5 h-3.5" strokeWidth={1.5} />
          Cold Drip · {currentTenant.display_name}
        </div>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
              Total reachable audience
            </div>
            <div className="font-display text-6xl text-ink-900 leading-none tabular-nums">
              {subscribed.toLocaleString()}
            </div>
          </div>
          <GrowthPill value={growth30} suffix="· 30d" />
        </div>
        <p className="mt-5 text-ink-600 text-lg font-light leading-relaxed max-w-2xl">
          The engine that turns prospected names into a warming audience. Every contact you
          subscribe today compounds into the most powerful tool in real estate — a large owned
          audience with a megaphone.{' '}
          <span className="text-ink-900">
            {totalContacts.toLocaleString()} contacts on file
          </span>
          .
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-8 border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Readiness — no cold sending identity */}
      {!loading && !hasColdIdentity && (
        <div className="mb-8 border border-ink-200 bg-cream px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-ink-700 shrink-0 mt-0.5" strokeWidth={1.75} />
          <div>
            <div className="text-sm text-ink-900">No cold sending identity is configured.</div>
            <div className="text-sm text-ink-500 mt-0.5 leading-relaxed">
              Sequences won't send until a warmed cold-sending domain is verified. You can still
              enable markets below — they'll begin sending once the identity is live.{' '}
              <Link
                to="/settings"
                className="text-ink-900 underline underline-offset-2 hover:no-underline"
              >
                Set one up in Settings
              </Link>
              .
            </div>
          </div>
        </div>
      )}

      {/* Funnel strip */}
      <section className="mb-12">
        <SectionLabel>Sequence funnel</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat icon={Radio} label="Enrolled · active" value={cold?.active ?? 0} />
          <Stat icon={UserCheck} label="Graduated" value={cold?.graduated ?? 0} />
          <Stat icon={Power} label="Exited" value={cold?.exited ?? 0} />
        </div>
        <div className="mt-3 text-2xs uppercase tracking-widest text-ink-400">
          {(cold?.total_enrolled ?? 0).toLocaleString()} total enrolled ·{' '}
          {(cold?.sends_30d ?? 0).toLocaleString()} sends in last 30 days ·{' '}
          {(cold?.graduated_30d ?? 0).toLocaleString()} graduated this month
        </div>
      </section>

      {/* Per-market sequences */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Per-market sequences</SectionLabel>
          <Link
            to="/markets"
            className="text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 inline-flex items-center gap-1 shrink-0"
          >
            Manage markets <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <Card>
            <div className="flex items-center gap-2 text-sm text-ink-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading markets…
            </div>
          </Card>
        ) : markets.length === 0 ? (
          <Card>
            <div className="text-sm text-ink-500">
              No markets yet. A cold drip runs per market —{' '}
              <Link to="/markets" className="text-ink-900 underline underline-offset-2 hover:no-underline">
                create your first market
              </Link>{' '}
              to begin warming an audience there.
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {markets.map((m) => {
              const isOn = enabled.get(m.id) ?? false
              const busy = togglingMarketId === m.id
              return (
                <div key={m.id} className="bg-white border border-ink-100 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-display text-xl text-ink-900 truncate">{m.name}</div>
                      <div
                        className={`text-2xs uppercase tracking-widest mt-1 ${
                          isOn ? 'text-emerald-700' : 'text-ink-400'
                        }`}
                      >
                        {isOn ? 'Cold drip running' : 'Disabled'}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleMarket(m.id, !isOn)}
                      disabled={busy}
                      className={`inline-flex items-center gap-2 px-3 py-2 text-2xs uppercase tracking-widest transition-colors shrink-0 disabled:opacity-50 ${
                        isOn
                          ? 'bg-ink-900 text-cream hover:bg-ink-700'
                          : 'border border-ink-200 text-ink-700 hover:border-ink-900 hover:text-ink-900'
                      }`}
                    >
                      {busy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Power className="w-3.5 h-3.5" strokeWidth={2} />
                      )}
                      {isOn ? 'Turn off' : 'Turn on'}
                    </button>
                  </div>
                  {isOn && !hasColdIdentity && (
                    <div className="mt-4 pt-4 border-t border-ink-100 text-2xs uppercase tracking-widest text-ink-400">
                      Enabled, but waiting on a cold sending identity before it can send.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Dry run */}
      <section className="mb-12">
        <SectionLabel>Test run</SectionLabel>
        <Card>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="text-sm text-ink-900">Preview today's recipients</div>
              <div className="text-sm text-ink-500 mt-0.5 leading-relaxed">
                Dry run of the send engine — resolves who would receive a step today without
                sending anything.
              </div>
            </div>
            <button
              onClick={previewRecipients}
              disabled={previewLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50 shrink-0"
            >
              {previewLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
              )}
              {previewLoading ? 'Resolving…' : 'Preview recipients'}
            </button>
          </div>

          {previewError && (
            <div className="mt-4 pt-4 border-t border-ink-100 text-sm text-red-700">
              {previewError}
            </div>
          )}
          {preview && (
            <div className="mt-4 pt-4 border-t border-ink-100">
              {preview.count !== null ? (
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl text-ink-900 tabular-nums">
                    {preview.count.toLocaleString()}
                  </span>
                  <span className="text-2xs uppercase tracking-widest text-ink-500">
                    {preview.count === 1 ? 'recipient would send today' : 'recipients would send today'}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-ink-500">Dry run complete — engine response below.</div>
              )}
              <pre className="mt-3 bg-ink-900 text-cream/90 text-xs p-4 overflow-x-auto leading-relaxed">
                {JSON.stringify(preview.raw, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      </section>

      {/* Sends ledger */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Recent sends</SectionLabel>
          <div className="text-2xs uppercase tracking-widest text-ink-400 shrink-0">
            {coldMarketsEnabled} {coldMarketsEnabled === 1 ? 'market' : 'markets'} enabled
          </div>
        </div>
        <Card>
          {sends.length === 0 ? (
            <div className="text-sm text-ink-500">
              No sends yet. Once a market is enabled and a sending identity is live, the daily run
              will populate this ledger.
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {sends.map((s, i) => (
                <li
                  key={s.id || `${s.email}-${i}`}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-3.5 h-3.5 text-ink-300 shrink-0" strokeWidth={1.5} />
                    <span className="text-ink-900 truncate">{s.email || '—'}</span>
                    {s.step_number != null && (
                      <span className="text-2xs uppercase tracking-widest text-ink-400 shrink-0">
                        step {s.step_number}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <SendStatusBadge status={s.status} />
                    <span className="text-2xs uppercase tracking-widest text-ink-400 tabular-nums">
                      {s.sent_at ? formatWhen(s.sent_at) : '—'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  )
}

// ===========================================================================
// UI primitives
// ===========================================================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="text-2xs uppercase tracking-widest text-ink-500">{children}</div>
      <div className="flex-1 h-px bg-ink-100" />
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-ink-100 p-7">{children}</div>
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="bg-white border border-ink-100 p-6">
      <div className="flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-500 mb-3">
        <Icon className="w-3.5 h-3.5 text-ink-400" strokeWidth={1.5} />
        {label}
      </div>
      <div className="font-display text-4xl text-ink-900 tabular-nums leading-none">
        {value.toLocaleString()}
      </div>
    </div>
  )
}

function GrowthPill({ value, suffix }: { value: number; suffix?: string }) {
  const up = value >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-2xs uppercase tracking-widest mb-1 ${
        up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      {up ? '+' : ''}
      {value.toLocaleString()} {suffix}
    </div>
  )
}

function SendStatusBadge({ status }: { status: string | null }) {
  const s = (status || 'pending').toLowerCase()
  const colors: Record<string, string> = {
    sent: 'bg-emerald-50 text-emerald-700',
    delivered: 'bg-emerald-50 text-emerald-700',
    queued: 'bg-ink-100 text-ink-700',
    pending: 'bg-ink-100 text-ink-700',
    skipped: 'bg-ink-100 text-ink-400',
    failed: 'bg-red-50 text-red-700',
    bounced: 'bg-red-50 text-red-700',
  }
  return (
    <span className={`text-2xs uppercase tracking-widest px-1.5 py-0.5 ${colors[s] || colors.pending}`}>
      {s}
    </span>
  )
}

// ===========================================================================
// Helpers
// ===========================================================================

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  const days = Math.floor(diff / 86_400_000)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
