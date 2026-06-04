import { useEffect, useMemo, useState, FormEvent } from 'react'
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import {
  Users,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Home,
  Clock,
  FileText,
  MessageSquare,
  Activity as ActivityIcon,
  X,
  Tag as TagIcon,
  Phone,
  Mail,
  ArrowUpRight,
  DollarSign,
  Info,
  Send,
  Check,
  FileBarChart2,
  ExternalLink,
  Heart,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import WarRoomThread from '@/components/WarRoomThread'
import DocumentManager from '@/components/DocumentManager'
import { ListingEditApprovals } from '@/components/ListingEditor'
import SavedPropertiesTab from '@/components/SavedPropertiesTab'
import {
  supabase,
  Client,
  ClientStage,
  ClientType,
  Deal,
  DealStage,
  ServicePackage,
  WarRoom,
  Activity as ActivityRow,
  DocumentRecord,
  Contact,
  CMA,
  EDGE_FUNCTIONS_BASE_URL,
  SERVICE_PACKAGES,
  CLIENT_STAGES,
  CLIENT_TYPES,
} from '@/lib/supabase'

export default function Clients() {
  return (
    <Routes>
      <Route index element={<ClientsList />} />
      <Route path=":clientId" element={<ClientDetail />} />
      <Route path=":clientId/:tab" element={<ClientDetail />} />
    </Routes>
  )
}

// ===========================================================================
// CLIENTS LIST — /clients
// ===========================================================================

function ClientsList() {
  const { currentTenant } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [dealsByClient, setDealsByClient] = useState<Map<string, Deal[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  async function refresh() {
    if (!currentTenant) return
    setLoading(true)
    const [{ data: cData }, { data: dData }] = await Promise.all([
      supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false }),
      supabase.from('deals').select('*').eq('tenant_id', currentTenant.id),
    ])
    const map = new Map<string, Deal[]>()
    for (const d of (dData || []) as Deal[]) {
      const arr = map.get(d.client_id) || []
      arr.push(d)
      map.set(d.client_id, arr)
    }
    setClients((cData as Client[]) || [])
    setDealsByClient(map)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant?.id])

  return (
    <div className="p-12 max-w-6xl">
      <div className="flex items-start justify-between mb-12">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">P8.1 · Client Portal</div>
          <h1 className="font-display text-4xl text-ink-900 leading-tight">Clients</h1>
          <p className="text-ink-600 mt-2 max-w-xl">
            Active engagements. Each client has one or more deals, a war room, a timeline, and documents.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-sm hover:bg-ink-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New client
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-ink-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading clients…
        </div>
      ) : clients.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clients.map((c) => (
            <ClientCard key={c.id} client={c} deals={dealsByClient.get(c.id) || []} />
          ))}
        </div>
      )}

      {createOpen && (
        <CreateClientModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border border-ink-200 p-12 text-center">
      <Users className="w-10 h-10 text-ink-300 mx-auto mb-4" strokeWidth={1.5} />
      <h2 className="font-display text-xl text-ink-900 mb-2">No clients yet</h2>
      <p className="text-ink-600 text-sm max-w-md mx-auto mb-6">
        Promote a contact from your CRM into a full client engagement, or create one from scratch.
      </p>
      <button
        onClick={onCreate}
        className="px-4 py-2 bg-ink-900 text-cream text-sm hover:bg-ink-800 transition-colors"
      >
        Create your first client
      </button>
    </div>
  )
}

function ClientCard({ client, deals }: { client: Client; deals: Deal[] }) {
  const primaryDeal = deals[0]
  const pkg = primaryDeal?.service_package
  const pkgLabel = pkg ? SERVICE_PACKAGES.find((p) => p.value === pkg)?.label : null

  return (
    <Link
      to={`/clients/${client.id}`}
      className="block border border-ink-200 hover:border-ink-400 transition-colors group"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display text-xl text-ink-900 leading-tight">{client.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <StageBadge stage={client.stage} />
              {client.client_type && (
                <span className="text-2xs uppercase tracking-widest text-ink-500">
                  {client.client_type}
                </span>
              )}
            </div>
          </div>
          <ArrowUpRight
            className="w-4 h-4 text-ink-400 group-hover:text-ink-900 transition-colors"
            strokeWidth={1.5}
          />
        </div>

        {primaryDeal && (
          <div className="border-t border-ink-100 pt-4 space-y-1.5">
            <div className="text-sm text-ink-900 font-medium">{primaryDeal.title}</div>
            <div className="flex items-center gap-4 text-2xs text-ink-500">
              {pkgLabel && <span className="uppercase tracking-widest">{pkgLabel}</span>}
              {primaryDeal.estimated_value && (
                <span className="font-mono">${primaryDeal.estimated_value.toLocaleString()}</span>
              )}
            </div>
          </div>
        )}

        {deals.length > 1 && (
          <div className="text-2xs text-ink-500 mt-3 pt-3 border-t border-ink-100">
            + {deals.length - 1} more {deals.length - 1 === 1 ? 'deal' : 'deals'}
          </div>
        )}

        {client.notes && (
          <p className="text-xs text-ink-600 mt-4 line-clamp-2">{client.notes}</p>
        )}
      </div>
    </Link>
  )
}

function StageBadge({ stage }: { stage: ClientStage | null }) {
  if (!stage) return null
  const colors: Record<ClientStage, string> = {
    lead: 'bg-ink-100 text-ink-700',
    qualified: 'bg-blue-50 text-blue-700',
    active: 'bg-emerald-50 text-emerald-700',
    on_hold: 'bg-amber-50 text-amber-700',
    closed: 'bg-ink-100 text-ink-500',
    lost: 'bg-red-50 text-red-700',
  }
  return (
    <span className={`text-2xs uppercase tracking-widest px-2 py-0.5 ${colors[stage]}`}>
      {stage.replace('_', ' ')}
    </span>
  )
}

function CreateClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { currentTenant, user } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [clientType, setClientType] = useState<ClientType>('seller')
  const [stage, setStage] = useState<ClientStage>('active')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [contactResults, setContactResults] = useState<Contact[]>([])
  const [linkedContact, setLinkedContact] = useState<Contact | null>(null)

  // search contacts to optionally promote
  useEffect(() => {
    if (!currentTenant || !contactSearch.trim() || linkedContact) {
      setContactResults([])
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .or(
          `first_name.ilike.%${contactSearch}%,last_name.ilike.%${contactSearch}%,email.ilike.%${contactSearch}%`,
        )
        .limit(5)
      setContactResults((data as Contact[]) || [])
    }, 250)
    return () => clearTimeout(timer)
  }, [contactSearch, currentTenant, linkedContact])

  function selectContact(c: Contact) {
    setLinkedContact(c)
    setName([c.first_name, c.last_name].filter(Boolean).join(' '))
    setEmail(c.email || '')
    setPhone(c.phone || '')
    setContactSearch('')
    setContactResults([])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!currentTenant || !name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('clients').insert({
      tenant_id: currentTenant.id,
      contact_id: linkedContact?.id || null,
      agent_id: user?.id || null,
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      client_type: clientType,
      stage,
      notes: notes.trim() || null,
    })
    setSaving(false)
    if (!error) onCreated()
    else alert('Could not create client: ' + error.message)
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center p-12 overflow-y-auto">
      <div className="bg-cream w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-ink-200">
          <h2 className="font-display text-xl text-ink-900">New client</h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {!linkedContact && (
            <div>
              <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">
                Link to existing contact (optional)
              </label>
              <input
                type="text"
                placeholder="Search by name or email…"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full px-3 py-2 border border-ink-200 text-sm focus:outline-none focus:border-ink-900"
              />
              {contactResults.length > 0 && (
                <div className="border border-ink-200 border-t-0 max-h-32 overflow-y-auto">
                  {contactResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectContact(c)}
                      className="w-full px-3 py-2 text-left hover:bg-ink-50 text-sm border-b border-ink-100 last:border-b-0"
                    >
                      <div className="text-ink-900">
                        {c.first_name} {c.last_name}
                      </div>
                      {c.email && <div className="text-xs text-ink-500">{c.email}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {linkedContact && (
            <div className="bg-ink-50 px-3 py-2 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-ink-500 uppercase tracking-widest text-2xs">Linked: </span>
                <span className="text-ink-900">
                  {linkedContact.first_name} {linkedContact.last_name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLinkedContact(null)}
                className="text-ink-500 hover:text-ink-900 text-xs"
              >
                Unlink
              </button>
            </div>
          )}

          <Field label="Full name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-ink-200 text-sm focus:outline-none focus:border-ink-900"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-ink-200 text-sm focus:outline-none focus:border-ink-900"
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-ink-200 text-sm focus:outline-none focus:border-ink-900"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select
                value={clientType}
                onChange={(e) => setClientType(e.target.value as ClientType)}
                className="w-full px-3 py-2 border border-ink-200 text-sm bg-cream focus:outline-none focus:border-ink-900"
              >
                {CLIENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Stage">
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as ClientStage)}
                className="w-full px-3 py-2 border border-ink-200 text-sm bg-cream focus:outline-none focus:border-ink-900"
              >
                {CLIENT_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-ink-200 text-sm focus:outline-none focus:border-ink-900"
            />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-ink-600 hover:text-ink-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2 bg-ink-900 text-cream text-sm hover:bg-ink-800 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              Create client
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

// ===========================================================================
// CLIENT DETAIL — /clients/:clientId/[tab]
// ===========================================================================

type Tab = 'overview' | 'listing' | 'cmas' | 'saved' | 'timeline' | 'documents' | 'war_room'
const TABS: { key: Tab; label: string; Icon: typeof Home }[] = [
  { key: 'overview', label: 'Overview', Icon: ActivityIcon },
  { key: 'listing', label: 'Listing & Service', Icon: Home },
  { key: 'cmas', label: 'CMAs', Icon: FileBarChart2 },
  { key: 'saved', label: 'Saved properties', Icon: Heart },
  { key: 'timeline', label: 'Timeline', Icon: Clock },
  { key: 'documents', label: 'Documents', Icon: FileText },
  { key: 'war_room', label: 'War Room', Icon: MessageSquare },
]

function ClientDetail() {
  const { clientId, tab } = useParams<{ clientId: string; tab?: Tab }>()
  const navigate = useNavigate()
  const { currentTenant } = useAuth()
  const [client, setClient] = useState<Client | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [warRooms, setWarRooms] = useState<WarRoom[]>([])
  const [loading, setLoading] = useState(true)

  const activeTab: Tab = (tab as Tab) || 'overview'

  async function refresh() {
    if (!currentTenant || !clientId) return
    setLoading(true)
    const [
      { data: cData },
      { data: dData },
      { data: aData },
      { data: docData },
      { data: wrData },
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase
        .from('deals')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('activities')
        .select('*')
        .eq('client_id', clientId)
        .order('occurred_at', { ascending: false })
        .limit(50),
      supabase
        .from('documents')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
      supabase.from('war_rooms').select('*').eq('client_id', clientId),
    ])
    setClient((cData as Client) || null)
    setDeals((dData as Deal[]) || [])
    setActivities((aData as ActivityRow[]) || [])
    setDocuments((docData as DocumentRecord[]) || [])
    setWarRooms((wrData as WarRoom[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, currentTenant?.id])

  if (loading) {
    return (
      <div className="p-12 flex items-center gap-2 text-ink-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading…
      </div>
    )
  }

  if (!client) {
    return (
      <div className="p-12 max-w-3xl">
        <p className="text-ink-600">Client not found.</p>
        <Link to="/clients" className="text-sm text-ink-900 underline mt-4 inline-block">
          ← Back to clients
        </Link>
      </div>
    )
  }

  const primaryDeal = deals[0]

  return (
    <div className="p-12 max-w-6xl">
      {/* Breadcrumb */}
      <Link
        to="/clients"
        className="inline-flex items-center gap-1 text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 mb-6"
      >
        <ChevronLeft className="w-3 h-3" />
        All clients
      </Link>

      {/* Header */}
      <div className="border-b border-ink-200 pb-8 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-4xl text-ink-900 leading-tight">{client.name}</h1>
            <div className="flex items-center gap-3 mt-3">
              <StageBadge stage={client.stage} />
              {client.client_type && (
                <span className="text-2xs uppercase tracking-widest text-ink-500">
                  {client.client_type}
                </span>
              )}
            </div>
            <div className="flex items-center gap-6 mt-4 text-sm text-ink-600">
              {client.email && (
                <span className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  {client.email}
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />
                  {client.phone}
                </span>
              )}
              {client.contact_id && (
                <Link
                  to={`/crm/contacts/${client.contact_id}`}
                  className="flex items-center gap-1 text-ink-500 hover:text-ink-900"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  Linked contact
                </Link>
              )}
            </div>
          </div>
          <InviteToPortalButton client={client} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-ink-200 mb-8 flex">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => navigate(`/clients/${clientId}/${t.key === 'overview' ? '' : t.key}`)}
            className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? 'border-ink-900 text-ink-900'
                : 'border-transparent text-ink-500 hover:text-ink-900'
            }`}
          >
            <t.Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab client={client} deals={deals} activities={activities} documents={documents} warRooms={warRooms} />
      )}
      {activeTab === 'listing' && <ListingTab deals={deals} onChanged={refresh} />}
      {activeTab === 'cmas' && <CMATab clientId={clientId!} clientName={client.name} />}
      {activeTab === 'saved' && client.tenant_id && (
        <SavedPropertiesTab
          clientId={clientId!}
          tenantId={client.tenant_id}
          viewerType="agent"
        />
      )}
      {activeTab === 'timeline' && <TimelineTab activities={activities} />}
      {activeTab === 'documents' && <DocumentsTab client={client} />}
      {activeTab === 'war_room' && <WarRoomTab warRooms={warRooms} />}
    </div>
  )
}

// --- Overview ---
function OverviewTab({
  client,
  deals,
  activities,
  documents,
  warRooms,
}: {
  client: Client
  deals: Deal[]
  activities: ActivityRow[]
  documents: DocumentRecord[]
  warRooms: WarRoom[]
}) {
  const recent = activities.slice(0, 5)
  return (
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-2 space-y-8">
        {client.notes && (
          <section>
            <h2 className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Notes</h2>
            <p className="text-sm text-ink-700 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
          </section>
        )}

        <section>
          <h2 className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Deals</h2>
          {deals.length === 0 ? (
            <p className="text-sm text-ink-500">No deals yet.</p>
          ) : (
            <div className="space-y-3">
              {deals.map((d) => (
                <DealRow key={d.id} deal={d} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xs uppercase tracking-widest text-ink-500">Recent activity</h2>
            <Link
              to={`/clients/${client.id}/timeline`}
              className="text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900"
            >
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-ink-500">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((a) => (
                <ActivityItem key={a.id} activity={a} />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <StatBlock label="Deals" value={deals.length.toString()} />
        <StatBlock label="Activities" value={activities.length.toString()} />
        <StatBlock label="Documents" value={documents.length.toString()} />
        <StatBlock label="War rooms" value={warRooms.length.toString()} />
      </div>
    </div>
  )
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink-200 p-5">
      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">{label}</div>
      <div className="font-display text-3xl text-ink-900">{value}</div>
    </div>
  )
}

function DealRow({ deal }: { deal: Deal }) {
  const pkg = SERVICE_PACKAGES.find((p) => p.value === deal.service_package)
  return (
    <div className="border border-ink-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-ink-900 font-medium">{deal.title || 'Untitled deal'}</div>
          <div className="flex items-center gap-3 mt-1.5 text-2xs text-ink-500">
            <span className="uppercase tracking-widest">{deal.deal_type}</span>
            {pkg && <span className="uppercase tracking-widest">· {pkg.label}</span>}
            <span className="uppercase tracking-widest">· {deal.stage}</span>
          </div>
        </div>
        {deal.estimated_value && (
          <div className="font-mono text-sm text-ink-900">
            ${deal.estimated_value.toLocaleString()}
          </div>
        )}
      </div>
      {deal.notes && <p className="text-xs text-ink-600 mt-2">{deal.notes}</p>}
    </div>
  )
}

function ActivityItem({ activity }: { activity: ActivityRow }) {
  const when = new Date(activity.occurred_at)
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="text-2xs uppercase tracking-widest text-ink-500 w-20 shrink-0 pt-0.5">
        {activity.activity_type}
      </div>
      <div className="flex-1">
        <div className="text-ink-900">{activity.subject || '—'}</div>
        {activity.body && <div className="text-xs text-ink-600 mt-0.5">{activity.body}</div>}
      </div>
      <div className="text-2xs text-ink-500 shrink-0">
        {when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
    </div>
  )
}

// --- Listing & Service ---
function ListingTab({ deals, onChanged }: { deals: Deal[]; onChanged: () => void }) {
  if (deals.length === 0) {
    return <p className="text-sm text-ink-500">No deals yet — create one to choose a service package.</p>
  }

  return (
    <div className="space-y-12">
      {deals.map((d) => (
        <div key={d.id}>
          <DealServicePicker deal={d} onChanged={onChanged} />
          <ListingEditApprovals deal={d} />
        </div>
      ))}
    </div>
  )
}

function DealServicePicker({ deal, onChanged }: { deal: Deal; onChanged: () => void }) {
  const [saving, setSaving] = useState<ServicePackage | null>(null)

  async function setPackage(pkg: ServicePackage) {
    setSaving(pkg)
    const { error } = await supabase.from('deals').update({ service_package: pkg }).eq('id', deal.id)
    setSaving(null)
    if (error) alert('Could not update: ' + error.message)
    else onChanged()
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl text-ink-900">{deal.title}</h2>
          <div className="flex items-center gap-3 mt-2 text-2xs uppercase tracking-widest text-ink-500">
            <span>{deal.deal_type}</span>
            <span>· {deal.stage}</span>
            {deal.estimated_value && (
              <span className="font-mono">· ${deal.estimated_value.toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>

      <h3 className="text-2xs uppercase tracking-widest text-ink-500 mb-4">Service package</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SERVICE_PACKAGES.filter((p) =>
          deal.deal_type === 'sell'
            ? p.value !== 'buyer_representation'
            : p.value === 'buyer_representation' || p.value === 'tbd',
        ).map((pkg) => {
          const active = deal.service_package === pkg.value
          return (
            <button
              key={pkg.value}
              onClick={() => setPackage(pkg.value)}
              disabled={saving !== null}
              className={`text-left border p-5 transition-colors disabled:opacity-50 ${
                active
                  ? 'border-ink-900 bg-ink-50'
                  : 'border-ink-200 hover:border-ink-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm text-ink-900">{pkg.label}</span>
                {active && (
                  <span className="text-2xs uppercase tracking-widest text-ink-900">Active</span>
                )}
                {saving === pkg.value && (
                  <Loader2 className="w-3 h-3 animate-spin text-ink-500" />
                )}
              </div>
              <p className="text-xs text-ink-600 leading-relaxed">{pkg.blurb}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// --- Timeline ---
function TimelineTab({ activities }: { activities: ActivityRow[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-ink-500">No timeline events yet.</p>
  }

  // group by day
  const groups = useMemo(() => {
    const map = new Map<string, ActivityRow[]>()
    for (const a of activities) {
      const key = new Date(a.occurred_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
      const arr = map.get(key) || []
      arr.push(a)
      map.set(key, arr)
    }
    return Array.from(map.entries())
  }, [activities])

  return (
    <div className="space-y-10">
      {groups.map(([day, items]) => (
        <div key={day}>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-4">{day}</div>
          <div className="space-y-4 border-l border-ink-200 pl-6 ml-1">
            {items.map((a) => (
              <div key={a.id} className="relative">
                <div className="absolute -left-[27px] top-1.5 w-2 h-2 bg-ink-900" />
                <div className="text-2xs uppercase tracking-widest text-ink-500 mb-0.5">
                  {a.activity_type}
                </div>
                <div className="text-sm text-ink-900 font-medium">{a.subject}</div>
                {a.body && <div className="text-sm text-ink-600 mt-1">{a.body}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Documents ---
function DocumentsTab({ client }: { client: Client }) {
  return (
    <DocumentManager
      tenantId={client.tenant_id}
      clientId={client.id}
      uploaderType="agent"
    />
  )
}

// --- War Room (real) ---
function WarRoomTab({ warRooms }: { warRooms: WarRoom[] }) {
  if (warRooms.length === 0) {
    return <p className="text-sm text-ink-500">No war rooms yet.</p>
  }
  return (
    <div className="space-y-8">
      {warRooms.map((wr) => (
        <WarRoomThread key={wr.id} warRoom={wr} viewerType="agent" />
      ))}
    </div>
  )
}

// --- Invite to portal ---
function InviteToPortalButton({ client }: { client: Client }) {
  const { session } = useAuth()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const alreadyLinked = !!client.auth_user_id

  async function handleInvite() {
    if (!session?.access_token || !client.email) return
    setSending(true)
    try {
      const resp = await fetch(`${EDGE_FUNCTIONS_BASE_URL}/invite_client`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ client_id: client.id }),
      })
      const json = await resp.json()
      if (!resp.ok) {
        alert('Invite failed: ' + (json.error || resp.statusText))
      } else {
        setSent(true)
      }
    } catch (e) {
      alert('Network error: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSending(false)
    }
  }

  if (alreadyLinked) {
    return (
      <div className="text-2xs uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-2 flex items-center gap-2">
        <Check className="w-3 h-3" />
        Portal access granted
      </div>
    )
  }

  if (!client.email) {
    return (
      <div className="text-2xs uppercase tracking-widest text-ink-500 bg-ink-50 px-3 py-2">
        Add an email to invite to portal
      </div>
    )
  }

  return (
    <button
      onClick={handleInvite}
      disabled={sending || sent}
      className="px-4 py-2 bg-ink-900 text-cream text-sm hover:bg-ink-800 disabled:opacity-50 transition-colors flex items-center gap-2"
    >
      {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : sent ? <Check className="w-3 h-3" /> : <Send className="w-3 h-3" />}
      {sent ? 'Invitation sent' : 'Invite to portal'}
    </button>
  )
}

// ===========================================================================
// CMA TAB — P9.1
// ===========================================================================
function CMATab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [cmas, setCmas] = useState<CMA[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('cmas')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      if (cancelled) return
      setCmas((data as CMA[]) || [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [clientId])

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-ink-500" />

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">CMAs</div>
          <p className="text-sm text-ink-600">
            {cmas.length} {cmas.length === 1 ? 'CMA' : 'CMAs'} for {clientName}.
          </p>
        </div>
        <Link
          to={`/cmas/new?client=${clientId}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700"
        >
          <Plus className="w-3.5 h-3.5" />
          New CMA
        </Link>
      </div>

      {cmas.length === 0 ? (
        <div className="border border-ink-200 p-12 text-center bg-cream">
          <FileBarChart2 className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-ink-600 mb-4">No CMAs yet for this client.</p>
          <Link
            to={`/cmas/new?client=${clientId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Create the first CMA
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {cmas.map((cma) => (
            <Link
              key={cma.id}
              to={`/cmas/${cma.slug}`}
              className="block border border-ink-200 hover:border-ink-400 p-5 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1 flex items-center gap-3">
                    CMA
                    {cma.status === 'draft' && (
                      <span className="text-amber-600 normal-case tracking-normal">· Draft</span>
                    )}
                    {cma.published_at && (
                      <span>
                        {new Date(cma.published_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-lg text-ink-900 leading-tight">
                    {cma.property_address || cma.name}
                  </h2>
                  <div className="text-sm text-ink-600 mt-1 flex items-center gap-4">
                    {cma.list_price && <span>{cma.list_price}</span>}
                    {Array.isArray(cma.comps_data) && cma.comps_data.length > 0 && (
                      <span>{cma.comps_data.length} comps</span>
                    )}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-ink-400" strokeWidth={1.5} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
