import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Gift,
  TrendingUp,
  CircleDollarSign,
  Coins,
  UserCheck,
  Loader2,
  Inbox,
  type LucideIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// ===========================================================================
// Types
// ===========================================================================

type Referral = {
  id: string
  referrer_client_id: string | null
  referrer_contact_id: string | null
  referred_name: string
  referred_email: string | null
  referred_phone: string | null
  relationship: string | null
  note: string | null
  status: string
  converted_contact_id: string | null
  created_at: string
}

type Credit = {
  id: string
  contact_id: string
  amount_cents: number
  kind: string
  reason: string | null
  source_ref: string | null
  expires_at: string | null
  created_at: string
}

type CreditRule = { id: string; action: string; amount_cents: number; is_active: boolean }

const ACTION_LABELS: Record<string, string> = {
  make_me_move: 'Make-me-move listing',
  buyer_signup: 'Buyer feed signup',
  claim_unit: 'Claimed a unit',
  referral_referrer: 'Referral — referrer reward',
  referral_referred: 'Referral — new contact reward',
}

const money = (cents: number | null | undefined) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    Number(cents ?? 0) / 100,
  )

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Referrals() {
  const { currentTenant } = useAuth()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [credits, setCredits] = useState<Credit[]>([])
  const [rules, setRules] = useState<CreditRule[]>([])
  const [clientNames, setClientNames] = useState<Map<string, string>>(new Map())
  const [contactNames, setContactNames] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentTenant) return
    let cancelled = false
    setLoading(true)

    async function load() {
      const tid = currentTenant!.id
      const [refR, credR, ruleR, clientR, contactR] = await Promise.all([
        supabase.from('referrals').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
        supabase.from('account_credits').select('*').eq('tenant_id', tid).order('created_at', { ascending: false }),
        supabase.from('tenant_credit_rules').select('*').eq('tenant_id', tid).order('action', { ascending: true }),
        supabase.from('clients').select('id, name').eq('tenant_id', tid),
        supabase.from('contacts').select('id, first_name, last_name').eq('tenant_id', tid),
      ])
      if (cancelled) return

      setReferrals((refR.data as Referral[]) || [])
      setCredits((credR.data as Credit[]) || [])
      setRules((ruleR.data as CreditRule[]) || [])

      const cMap = new Map<string, string>()
      ;((clientR.data as { id: string; name: string }[]) || []).forEach((c) => cMap.set(c.id, c.name))
      setClientNames(cMap)

      const ctMap = new Map<string, string>()
      ;((contactR.data as { id: string; first_name: string | null; last_name: string | null }[]) || []).forEach(
        (c) => ctMap.set(c.id, [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed contact'),
      )
      setContactNames(ctMap)

      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [currentTenant])

  function referrerName(r: Referral): string {
    if (r.referrer_client_id && clientNames.has(r.referrer_client_id)) return clientNames.get(r.referrer_client_id)!
    if (r.referrer_contact_id && contactNames.has(r.referrer_contact_id)) return contactNames.get(r.referrer_contact_id)!
    return 'Unknown'
  }

  const total = referrals.length
  const converted = referrals.filter((r) => !!r.converted_contact_id).length
  const rate = total > 0 ? Math.round((converted / total) * 100) : 0
  const outstanding = credits.reduce((sum, c) => sum + (c.amount_cents || 0), 0)

  return (
    <div className="p-12 max-w-6xl">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-500 mb-3">
          <Gift className="w-3.5 h-3.5" strokeWidth={1.5} />
          Referrals
        </div>
        <h1 className="font-display text-5xl text-ink-900 leading-[1.1]">Referrals</h1>
        <p className="mt-4 text-ink-600 text-lg font-light max-w-2xl">
          The marketplace flywheel — clients and contacts sending business your way, and the credits that
          reward them.
        </p>
      </div>

      {/* Summary */}
      <section className="mb-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric icon={Gift} label="Total referrals" value={total.toLocaleString()} />
          <Metric icon={UserCheck} label="Converted" value={converted.toLocaleString()} />
          <Metric icon={TrendingUp} label="Conversion rate" value={total > 0 ? `${rate}%` : '—'} />
          <Metric icon={CircleDollarSign} label="Credits in accounts" value={money(outstanding)} />
        </div>
      </section>

      {/* How credits are earned */}
      <section className="mb-14">
        <SectionLabel>How credits are earned</SectionLabel>
        {loading ? (
          <LoadingRow />
        ) : rules.length === 0 ? (
          <Card>
            <div className="text-sm text-ink-500">No credit rules configured.</div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center justify-between gap-4 bg-white border border-ink-100 px-5 py-4 ${
                  rule.is_active ? '' : 'opacity-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Coins className="w-4 h-4 text-ink-400 shrink-0" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <div className="text-sm text-ink-900 truncate">
                      {ACTION_LABELS[rule.action] || rule.action.replace(/_/g, ' ')}
                    </div>
                    {!rule.is_active && (
                      <div className="text-2xs uppercase tracking-widest text-ink-400 mt-0.5">Inactive</div>
                    )}
                  </div>
                </div>
                <div className="font-display text-xl text-ink-900 tabular-nums shrink-0">
                  {money(rule.amount_cents)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Referrals list */}
      <section className="mb-14">
        <SectionLabel>Referral pipeline</SectionLabel>
        {loading ? (
          <LoadingRow />
        ) : referrals.length === 0 ? (
          <EmptyState message="No referrals yet. They'll appear here as clients and contacts send people your way." />
        ) : (
          <div className="space-y-2">
            {referrals.map((r) => (
              <div key={r.id} className="bg-white border border-ink-100 px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-ink-900">{r.referred_name}</div>
                    <div className="text-2xs uppercase tracking-widest text-ink-400 mt-1">
                      Referred by {referrerName(r)}
                      {r.relationship ? ` · ${r.relationship}` : ''}
                    </div>
                    {(r.referred_email || r.referred_phone) && (
                      <div className="text-sm text-ink-500 mt-1">
                        {[r.referred_email, r.referred_phone].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    {r.note && <div className="text-sm text-ink-500 mt-1 leading-relaxed">{r.note}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <ReferralStatusBadge status={r.status} converted={!!r.converted_contact_id} />
                    <div className="text-2xs uppercase tracking-widest text-ink-400 mt-2">{fmtDate(r.created_at)}</div>
                    {r.converted_contact_id && (
                      <Link
                        to={`/crm`}
                        className="text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 mt-1 inline-block"
                      >
                        View in CRM
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Credit ledger */}
      <section className="mb-4">
        <SectionLabel>Credit ledger</SectionLabel>
        {loading ? (
          <LoadingRow />
        ) : credits.length === 0 ? (
          <EmptyState message="No credits issued yet." />
        ) : (
          <Card>
            <ul className="divide-y divide-ink-100">
              {credits.map((c) => (
                <li key={c.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Coins className="w-3.5 h-3.5 text-ink-300 shrink-0" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <div className="text-sm text-ink-900 truncate">
                        {contactNames.get(c.contact_id) || 'Contact'}
                      </div>
                      <div className="text-2xs uppercase tracking-widest text-ink-400 mt-0.5">
                        {c.kind}
                        {c.reason ? ` · ${c.reason}` : ''}
                        {c.expires_at ? ` · expires ${fmtDate(c.expires_at)}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display text-lg text-ink-900 tabular-nums">{money(c.amount_cents)}</div>
                    <div className="text-2xs uppercase tracking-widest text-ink-400">{fmtDate(c.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  )
}

// ===========================================================================
// UI primitives
// ===========================================================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="text-2xs uppercase tracking-widest text-ink-500">{children}</div>
      <div className="flex-1 h-px bg-ink-100" />
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-ink-100 p-7">{children}</div>
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="bg-white border border-ink-100 p-6">
      <div className="flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-500 mb-3">
        <Icon className="w-3.5 h-3.5 text-ink-400" strokeWidth={1.5} />
        {label}
      </div>
      <div className="font-display text-4xl text-ink-900 tabular-nums leading-none">{value}</div>
    </div>
  )
}

function ReferralStatusBadge({ status, converted }: { status: string; converted: boolean }) {
  const s = (status || '').toLowerCase()
  const tone =
    converted || s === 'converted'
      ? 'bg-emerald-50 text-emerald-700'
      : s === 'declined' || s === 'expired' || s === 'lost'
        ? 'bg-red-50 text-red-700'
        : 'bg-ink-100 text-ink-700'
  return (
    <span className={`px-2 py-0.5 text-2xs uppercase tracking-widest ${tone}`}>
      {converted && s !== 'converted' ? 'converted' : status || 'pending'}
    </span>
  )
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-400 py-6">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-ink-200 py-14 flex flex-col items-center justify-center text-center">
      <Inbox className="w-7 h-7 text-ink-300 mb-3" strokeWidth={1.25} />
      <div className="text-sm text-ink-500 max-w-md">{message}</div>
    </div>
  )
}
