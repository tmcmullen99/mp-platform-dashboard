import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  Plus,
  X,
  Calculator,
  MessageCircle,
  Clock,
  CircleDollarSign,
  Home,
  User,
  Calendar,
  Check,
  RefreshCw,
} from 'lucide-react'
import { supabase, Deal, Client, WarRoom, DealStage } from '@/lib/supabase'
import NetSheetModal, { NetSheet } from '@/components/NetSheetModal'
import DocumentManager from '@/components/DocumentManager'
import WarRoomThread from '@/components/WarRoomThread'
import { useAuth } from '@/contexts/AuthContext'

// ===========================================================================
// Local types for the deal's related rows
// ===========================================================================

type Offer = {
  id: string
  deal_id: string
  round_number: number
  direction: string
  amount: number
  terms: string | null
  status: string
  counterparty: string | null
  notes: string | null
  created_at: string
}

type Activity = {
  id: string
  activity_type: string
  subject: string | null
  body: string | null
  occurred_at: string | null
  created_at: string | null
}

type PropertyLite = { id: string; name: string | null; slug: string | null; price: number | null }

const STAGES: DealStage[] = ['exploring', 'active', 'offer', 'accepted', 'escrow', 'closed', 'lost']
const OFFER_STATUSES = ['submitted', 'countered', 'accepted', 'rejected', 'withdrawn', 'expired']

const money = (n: number | null | undefined) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    Number(n ?? 0),
  )

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtWhen(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function DealDetail() {
  const { dealId } = useParams<{ dealId: string }>()
  const { currentTenant, user } = useAuth()

  const [deal, setDeal] = useState<Deal | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [property, setProperty] = useState<PropertyLite | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [scenarios, setScenarios] = useState<NetSheet[]>([])
  const [warRoom, setWarRoom] = useState<WarRoom | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [savingStage, setSavingStage] = useState(false)
  const [netSheetOpen, setNetSheetOpen] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const [startingWarRoom, setStartingWarRoom] = useState(false)

  const refresh = useCallback(async () => {
    if (!dealId) return
    setLoading(true)
    const { data: dealData } = await supabase.from('deals').select('*').eq('id', dealId).maybeSingle()
    if (!dealData) {
      setNotFound(true)
      setLoading(false)
      return
    }
    const d = dealData as Deal
    setDeal(d)

    const [offersR, netR, warR, actR, clientR, propR] = await Promise.all([
      supabase.from('offers').select('*').eq('deal_id', dealId).order('round_number', { ascending: false }),
      supabase.from('net_sheets').select('*').eq('deal_id', dealId).order('created_at', { ascending: false }),
      supabase.from('war_rooms').select('*').eq('deal_id', dealId).maybeSingle(),
      supabase
        .from('activities')
        .select('*')
        .eq('deal_id', dealId)
        .order('occurred_at', { ascending: false, nullsFirst: false }),
      d.client_id
        ? supabase.from('clients').select('*').eq('id', d.client_id).maybeSingle()
        : Promise.resolve({ data: null }),
      d.property_id
        ? supabase.from('properties').select('id, name, slug, price').eq('id', d.property_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    setOffers((offersR.data as Offer[]) || [])
    setScenarios((netR.data as NetSheet[]) || [])
    setWarRoom((warR.data as WarRoom) ?? null)
    setActivities((actR.data as Activity[]) || [])
    setClient((clientR.data as Client) ?? null)
    setProperty((propR.data as PropertyLite) ?? null)
    setLoading(false)
  }, [dealId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function changeStage(stage: DealStage) {
    if (!deal || savingStage) return
    setSavingStage(true)
    setDeal({ ...deal, stage })
    await supabase.from('deals').update({ stage }).eq('id', deal.id)
    setSavingStage(false)
  }

  async function startWarRoom() {
    if (!deal || !deal.client_id || !currentTenant || startingWarRoom) return
    setStartingWarRoom(true)
    const { data } = await supabase
      .from('war_rooms')
      .insert({
        tenant_id: currentTenant.id,
        deal_id: deal.id,
        client_id: deal.client_id,
        name: deal.title || 'Deal war room',
      })
      .select()
      .maybeSingle()
    if (data) setWarRoom(data as WarRoom)
    setStartingWarRoom(false)
  }

  if (loading) {
    return (
      <div className="p-12 max-w-6xl">
        <div className="flex items-center gap-2 text-sm text-ink-400 py-12">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading deal…
        </div>
      </div>
    )
  }

  if (notFound || !deal) {
    return (
      <div className="p-12 max-w-6xl">
        <Link
          to="/pipeline"
          className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to pipeline
        </Link>
        <h1 className="font-display text-4xl text-ink-900">Deal not found</h1>
        <p className="mt-4 text-ink-600">This deal may have been removed, or the link is incorrect.</p>
      </div>
    )
  }

  const dealValue = deal.actual_value ?? deal.estimated_value
  const dealCommission = deal.actual_commission ?? deal.estimated_commission
  const latestNet = scenarios[0]

  return (
    <div className="p-12 max-w-6xl">
      {/* Back */}
      <Link
        to="/pipeline"
        className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to pipeline
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-500 mb-2">
            <StageBadge stage={deal.stage} />
            {deal.deal_type && <span>· {deal.deal_type}</span>}
          </div>
          <h1 className="font-display text-5xl text-ink-900 leading-[1.05]">{deal.title || 'Untitled deal'}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-2xs uppercase tracking-widest text-ink-400">Stage</label>
          <select
            value={deal.stage}
            disabled={savingStage}
            onChange={(e) => changeStage(e.target.value as DealStage)}
            className="text-2xs uppercase tracking-widest px-3 py-2 border border-ink-200 bg-white focus:outline-none focus:border-ink-900 disabled:opacity-50"
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key facts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
        <Fact icon={User} label="Client">
          {client ? (
            <Link to={`/clients/${client.id}`} className="text-ink-900 hover:underline">
              {client.name}
            </Link>
          ) : (
            <span className="text-ink-400">No client</span>
          )}
        </Fact>
        <Fact icon={Home} label="Property">
          {property ? (
            property.slug ? (
              <Link to={`/listings/${property.slug}`} className="text-ink-900 hover:underline">
                {property.name || 'View listing'}
              </Link>
            ) : (
              <span className="text-ink-900">{property.name || '—'}</span>
            )
          ) : (
            <span className="text-ink-400">—</span>
          )}
        </Fact>
        <Fact icon={CircleDollarSign} label="Value">
          <span className="text-ink-900">{dealValue != null ? money(dealValue) : '—'}</span>
        </Fact>
        <Fact icon={Calendar} label="Close date">
          <span className="text-ink-900">{fmtDate(deal.close_date)}</span>
        </Fact>
      </div>

      {/* Net sheets */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Net sheets</SectionLabel>
          <button
            onClick={() => setNetSheetOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 shrink-0"
          >
            <Calculator className="w-3.5 h-3.5" /> {latestNet ? 'Revise scenario' : 'New scenario'}
          </button>
        </div>
        {scenarios.length === 0 ? (
          <Card>
            <div className="text-sm text-ink-500">
              No net sheet yet. Build one to estimate the seller's proceeds at closing.
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {scenarios.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 bg-white border border-ink-100 px-6 py-4">
                <div className="min-w-0">
                  <div className="text-ink-900 text-sm">{s.name}</div>
                  <div className="text-2xs uppercase tracking-widest text-ink-400 mt-1">
                    Sale {money(s.sale_price)} · {fmtWhen(s.created_at)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-2xl text-ink-900 tabular-nums">{money(s.computed_net)}</div>
                  <div className="text-2xs uppercase tracking-widest text-ink-400">net to seller</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Offers */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Offers &amp; counters</SectionLabel>
          <button
            onClick={() => setOfferOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-ink-200 text-2xs uppercase tracking-widest text-ink-700 hover:border-ink-900 hover:text-ink-900 shrink-0"
          >
            {offerOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {offerOpen ? 'Cancel' : 'Log offer'}
          </button>
        </div>

        {offerOpen && (
          <OfferForm
            nextRound={(offers[0]?.round_number ?? 0) + 1}
            onCancel={() => setOfferOpen(false)}
            onSubmit={async (payload) => {
              if (!currentTenant) return
              await supabase.from('offers').insert({
                tenant_id: currentTenant.id,
                deal_id: deal.id,
                created_by_user_id: user?.id ?? null,
                metadata: {},
                ...payload,
              })
              setOfferOpen(false)
              refresh()
            }}
          />
        )}

        {offers.length === 0 ? (
          <Card>
            <div className="text-sm text-ink-500">No offers logged yet.</div>
          </Card>
        ) : (
          <div className="space-y-2">
            {offers.map((o) => (
              <div key={o.id} className="bg-white border border-ink-100 px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xs uppercase tracking-widest text-ink-400">Round {o.round_number}</span>
                    <span className="text-2xs uppercase tracking-widest text-ink-400">{o.direction}</span>
                    <OfferStatusBadge status={o.status} />
                  </div>
                  <div className="font-display text-2xl text-ink-900 tabular-nums shrink-0">{money(o.amount)}</div>
                </div>
                {(o.counterparty || o.terms || o.notes) && (
                  <div className="mt-2 text-sm text-ink-600 leading-relaxed">
                    {o.counterparty && <span className="text-ink-900">{o.counterparty}. </span>}
                    {o.terms}
                    {o.notes && <span className="text-ink-500"> — {o.notes}</span>}
                  </div>
                )}
                <div className="text-2xs uppercase tracking-widest text-ink-400 mt-2">{fmtWhen(o.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Documents */}
      <section className="mb-14">
        <SectionLabel>Documents</SectionLabel>
        {deal.client_id && currentTenant ? (
          <DocumentManager
            tenantId={currentTenant.id}
            clientId={deal.client_id}
            dealId={deal.id}
            uploaderType="agent"
          />
        ) : (
          <Card>
            <div className="text-sm text-ink-500">
              Attach a client to this deal to manage documents.
            </div>
          </Card>
        )}
      </section>

      {/* War room */}
      <section className="mb-14">
        <SectionLabel>War room</SectionLabel>
        {warRoom ? (
          <WarRoomThread warRoom={warRoom} viewerType="agent" />
        ) : (
          <Card>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4 text-ink-400" strokeWidth={1.5} />
                <div className="text-sm text-ink-600">
                  {deal.client_id
                    ? 'No war room for this deal yet — start one to message the client.'
                    : 'Attach a client to this deal to start a war room.'}
                </div>
              </div>
              {deal.client_id && (
                <button
                  onClick={startWarRoom}
                  disabled={startingWarRoom}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50 shrink-0"
                >
                  {startingWarRoom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                  Start war room
                </button>
              )}
            </div>
          </Card>
        )}
      </section>

      {/* Activity timeline */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Activity</SectionLabel>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 shrink-0"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        {activities.length === 0 ? (
          <Card>
            <div className="text-sm text-ink-500">No activity recorded on this deal yet.</div>
          </Card>
        ) : (
          <div className="space-y-2">
            {activities.map((a) => (
              <div key={a.id} className="flex items-start gap-4 bg-white border border-ink-100 px-6 py-4">
                <Clock className="w-4 h-4 text-ink-300 mt-0.5 shrink-0" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-2xs uppercase tracking-widest text-ink-400">{a.activity_type}</span>
                  </div>
                  {a.subject && <div className="text-sm text-ink-900 mt-1">{a.subject}</div>}
                  {a.body && <div className="text-sm text-ink-500 mt-1 leading-relaxed">{a.body}</div>}
                  <div className="text-2xs uppercase tracking-widest text-ink-400 mt-2">
                    {fmtWhen(a.occurred_at || a.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Net sheet modal */}
      {netSheetOpen && (
        <NetSheetModal
          deal={deal}
          mode="agent"
          scenarios={scenarios}
          onClose={() => setNetSheetOpen(false)}
          onSaved={() => {
            setNetSheetOpen(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}

// ===========================================================================
// UI primitives
// ===========================================================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-2xs uppercase tracking-widest text-ink-500">{children}</div>
      <div className="flex-1 h-px bg-ink-100" />
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-ink-100 p-7">{children}</div>
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-ink-100 p-5">
      <div className="flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-500 mb-2">
        <Icon className="w-3.5 h-3.5 text-ink-400" strokeWidth={1.5} />
        {label}
      </div>
      <div className="text-sm truncate">{children}</div>
    </div>
  )
}

function StageBadge({ stage }: { stage: string }) {
  const tone =
    stage === 'closed'
      ? 'bg-emerald-50 text-emerald-700'
      : stage === 'lost'
        ? 'bg-red-50 text-red-700'
        : 'bg-ink-100 text-ink-700'
  return <span className={`px-2 py-0.5 text-2xs uppercase tracking-widest ${tone}`}>{stage}</span>
}

function OfferStatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase()
  const tone =
    s === 'accepted'
      ? 'bg-emerald-50 text-emerald-700'
      : s === 'rejected' || s === 'withdrawn' || s === 'expired'
        ? 'bg-red-50 text-red-700'
        : 'bg-ink-100 text-ink-700'
  return <span className={`px-1.5 py-0.5 text-2xs uppercase tracking-widest ${tone}`}>{status}</span>
}

// ===========================================================================
// Log-offer form
// ===========================================================================

function OfferForm({
  nextRound,
  onSubmit,
  onCancel,
}: {
  nextRound: number
  onSubmit: (payload: {
    round_number: number
    direction: string
    amount: number
    status: string
    counterparty: string | null
    terms: string | null
    notes: string | null
  }) => Promise<void>
  onCancel: () => void
}) {
  const [direction, setDirection] = useState('incoming')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState('submitted')
  const [counterparty, setCounterparty] = useState('')
  const [terms, setTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const amt = parseFloat(amount.replace(/[^0-9.]/g, ''))
    if (!amt || amt <= 0) {
      setError('Enter an offer amount.')
      return
    }
    setSaving(true)
    setError(null)
    await onSubmit({
      round_number: nextRound,
      direction,
      amount: amt,
      status,
      counterparty: counterparty.trim() || null,
      terms: terms.trim() || null,
      notes: notes.trim() || null,
    })
    setSaving(false)
  }

  const inputCls =
    'w-full px-3 py-2 border border-ink-200 bg-white text-sm focus:outline-none focus:border-ink-900'
  const labelCls = 'block text-2xs uppercase tracking-widest text-ink-500 mb-1.5'

  return (
    <div className="bg-white border border-ink-100 p-7 mb-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className={labelCls}>Direction</label>
          <select value={direction} onChange={(e) => setDirection(e.target.value)} className={inputCls}>
            <option value="incoming">Incoming</option>
            <option value="outgoing">Outgoing</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Amount</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="$0"
            className={inputCls}
            inputMode="decimal"
          />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            {OFFER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-4">
        <label className={labelCls}>Counterparty</label>
        <input
          value={counterparty}
          onChange={(e) => setCounterparty(e.target.value)}
          placeholder="Buyer / agent name"
          className={inputCls}
        />
      </div>
      <div className="mb-4">
        <label className={labelCls}>Terms</label>
        <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={2} className={inputCls} />
      </div>
      <div className="mb-4">
        <label className={labelCls}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
      </div>
      {error && <div className="text-sm text-red-700 mb-3">{error}</div>}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2.5 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save offer
        </button>
      </div>
    </div>
  )
}
