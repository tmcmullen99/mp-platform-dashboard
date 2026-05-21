import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, AuditLogEntry } from '@/lib/supabase'
import { Activity, Briefcase, User, MapPin, Users, Folder, Send, BarChart3 } from 'lucide-react'

export default function Today() {
  const { currentTenant, currentBranding, profile } = useAuth()
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [contactCount, setContactCount] = useState<number | null>(null)
  const [listCount, setListCount] = useState<number | null>(null)
  const [campaignCount, setCampaignCount] = useState<number | null>(null)
  const [sentCount, setSentCount] = useState<number | null>(null)

  useEffect(() => {
    if (!currentTenant) return
    setLoadingEntries(true)
    supabase
      .from('audit_log')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .order('happened_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setAuditEntries((data as AuditLogEntry[]) || [])
        setLoadingEntries(false)
      })

    supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', currentTenant.id)
      .then(({ count }) => setContactCount(count ?? 0))

    supabase
      .from('contact_lists')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', currentTenant.id)
      .then(({ count }) => setListCount(count ?? 0))

    supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', currentTenant.id)
      .then(({ count }) => setCampaignCount(count ?? 0))

    supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', currentTenant.id)
      .eq('status', 'sent')
      .then(({ count }) => setSentCount(count ?? 0))
  }, [currentTenant])

  if (!currentTenant || !currentBranding || !profile) {
    return <div className="p-12 text-ink-500 text-sm">Loading tenant context…</div>
  }

  return (
    <div className="p-12 max-w-6xl">
      {/* Hero */}
      <div className="mb-16">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
        <h1 className="font-display text-5xl text-ink-900 leading-[1.1]">
          {greeting()}, {profile.first_name || 'there'}.
        </h1>
        <p className="mt-5 text-ink-600 text-lg font-light leading-relaxed max-w-2xl">
          The foundation is live. This is the operating console for{' '}
          <span className="text-ink-900">{currentTenant.display_name}</span>. Eight more surfaces
          ship in subsequent phases — chat is wired next.
        </p>
      </div>

      {/* Cards row */}
      <section className="mb-16">
        <SectionLabel>Tenant Context</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <div className="flex items-start gap-5">
              <Briefcase className="w-5 h-5 text-ink-400 mt-1 shrink-0" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <div className="font-display text-2xl text-ink-900 mb-1">
                  {currentTenant.display_name}
                </div>
                <div className="text-sm text-ink-500 mb-7">
                  {currentBranding.brokerage_affiliation} ·{' '}
                  <span className="capitalize">{currentTenant.tier.replace('_', ' ')}</span>
                </div>
                <dl className="space-y-3.5 text-sm">
                  <Row label="Slug" value={currentTenant.slug} mono />
                  <Row label="Domain" value={currentTenant.custom_domain || '—'} />
                  <Row label="Status" value={currentTenant.status} />
                  <Row label="DRE" value={currentBranding.dre_license || '—'} mono />
                </dl>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-5">
              <User className="w-5 h-5 text-ink-400 mt-1 shrink-0" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <div className="font-display text-2xl text-ink-900 mb-1">
                  {currentBranding.agent_name || profile.email}
                </div>
                <div className="text-sm text-ink-500 mb-7">
                  {profile.is_brokerage_admin ? 'Brokerage Admin' : currentBranding.agent_title}
                </div>
                <dl className="space-y-3.5 text-sm">
                  <Row label="Email" value={profile.email} />
                  <Row
                    label="Role"
                    value={profile.is_brokerage_admin ? 'brokerage_admin' : 'owner'}
                    mono
                  />
                  <Row label="User ID" value={profile.id.slice(0, 8) + '…'} mono />
                </dl>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Service areas */}
      {currentBranding.service_areas.length > 0 && (
        <section className="mb-16">
          <SectionLabel>Service Areas</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {currentBranding.service_areas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1.5 border border-ink-200 px-3 py-1.5 text-sm text-ink-700 bg-white"
              >
                <MapPin className="w-3 h-3 text-ink-400" strokeWidth={2} />
                {area}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* CRM snapshot */}
      <section className="mb-16">
        <SectionLabel>CRM Snapshot</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <div className="flex items-start gap-5">
              <Users className="w-5 h-5 text-ink-400 mt-1 shrink-0" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <div className="font-display text-4xl text-ink-900 mb-1 tabular-nums">
                  {contactCount === null ? '—' : contactCount.toLocaleString()}
                </div>
                <div className="text-2xs uppercase tracking-widest text-ink-500">Contacts</div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-start gap-5">
              <Folder className="w-5 h-5 text-ink-400 mt-1 shrink-0" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <div className="font-display text-4xl text-ink-900 mb-1 tabular-nums">
                  {listCount === null ? '—' : listCount.toLocaleString()}
                </div>
                <div className="text-2xs uppercase tracking-widest text-ink-500">Lists</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Campaigns snapshot */}
      <section className="mb-16">
        <SectionLabel>Campaigns Snapshot</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <div className="flex items-start gap-5">
              <Send className="w-5 h-5 text-ink-400 mt-1 shrink-0" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <div className="font-display text-4xl text-ink-900 mb-1 tabular-nums">
                  {campaignCount === null ? '—' : campaignCount.toLocaleString()}
                </div>
                <div className="text-2xs uppercase tracking-widest text-ink-500">Total Campaigns</div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-start gap-5">
              <BarChart3 className="w-5 h-5 text-ink-400 mt-1 shrink-0" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <div className="font-display text-4xl text-ink-900 mb-1 tabular-nums">
                  {sentCount === null ? '—' : sentCount.toLocaleString()}
                </div>
                <div className="text-2xs uppercase tracking-widest text-ink-500">Sent</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Audit log */}
      <section>
        <SectionLabel>Recent Platform Activity</SectionLabel>
        <Card>
          {loadingEntries ? (
            <div className="text-sm text-ink-500 py-4">Loading…</div>
          ) : auditEntries.length === 0 ? (
            <div className="text-sm text-ink-500 py-4">No activity yet.</div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {auditEntries.map((entry) => (
                <li key={entry.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                  <Activity className="w-4 h-4 text-ink-300 mt-1 shrink-0" strokeWidth={2} />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-ink-900">{entry.action}</div>
                    <div className="text-xs text-ink-500 mt-1">
                      {entry.actor_kind} · {entry.entity_kind || 'system'}
                      {typeof entry.metadata?.reason === 'string'
                        ? ` · ${entry.metadata.reason}`
                        : ''}
                    </div>
                  </div>
                  <div className="text-xs text-ink-400 font-mono whitespace-nowrap">
                    {new Date(entry.happened_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="text-2xs uppercase tracking-widest text-ink-500">{children}</div>
      <div className="flex-1 h-px bg-ink-100" />
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-ink-100 p-8">{children}</div>
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <dt className="text-2xs uppercase tracking-widest text-ink-500 shrink-0">{label}</dt>
      <dd
        className={`text-ink-900 truncate ${
          mono ? 'font-mono text-xs' : 'text-sm'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
