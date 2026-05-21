import { useEffect, useMemo, useState } from 'react'
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, type Campaign, type CampaignRecipient, type CampaignStatus, type ContactList } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Eye, MousePointerClick, Send, AlertTriangle, FileText, CheckCircle2, Loader2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Campaigns route — list / compose / detail
// ---------------------------------------------------------------------------

export default function Campaigns() {
  return (
    <Routes>
      <Route index element={<CampaignsList />} />
      <Route path="new" element={<CampaignCompose />} />
      <Route path=":campaignId" element={<CampaignDetail />} />
    </Routes>
  )
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

function CampaignsList() {
  const { currentTenant } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentTenant) return
    loadCampaigns()
  }, [currentTenant?.id])

  async function loadCampaigns() {
    setLoading(true)
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (!error && data) setCampaigns(data as Campaign[])
    setLoading(false)
  }

  return (
    <div className="px-8 py-10 max-w-7xl">
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-ink-900">Campaigns</h1>
          <p className="text-sm text-ink-500 mt-1">Email blasts to your contact lists. Drafts and history.</p>
        </div>
        <Link
          to="/campaigns/new"
          className="bg-ink-900 text-cream px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink-700 transition"
        >
          + New Campaign
        </Link>
      </div>

      {loading ? (
        <div className="text-xs uppercase tracking-widest text-ink-500">Loading campaigns…</div>
      ) : campaigns.length === 0 ? (
        <div className="border border-ink-200 px-8 py-16 text-center">
          <Send className="mx-auto mb-4 text-ink-300" size={32} />
          <div className="text-ink-700 mb-2">No campaigns yet.</div>
          <div className="text-xs text-ink-500 mb-6">Compose your first email blast to one of your contact lists.</div>
          <Link
            to="/campaigns/new"
            className="inline-block bg-ink-900 text-cream px-6 py-3 text-xs uppercase tracking-widest hover:bg-ink-700 transition"
          >
            Compose Campaign
          </Link>
        </div>
      ) : (
        <div className="border border-ink-200">
          <table className="w-full text-sm">
            <thead className="bg-ink-50">
              <tr className="text-left text-2xs uppercase tracking-widest text-ink-500">
                <th className="px-4 py-3 font-normal">Name</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal text-right">Recipients</th>
                <th className="px-4 py-3 font-normal text-right">Sent</th>
                <th className="px-4 py-3 font-normal text-right">Opens</th>
                <th className="px-4 py-3 font-normal text-right">Clicks</th>
                <th className="px-4 py-3 font-normal">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-ink-50 transition cursor-pointer">
                  <td className="px-4 py-4">
                    <Link to={`/campaigns/${c.id}`} className="block">
                      <div className="text-ink-900 font-medium">{c.name}</div>
                      <div className="text-xs text-ink-500 mt-0.5 truncate max-w-md">{c.subject}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-4"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-4 text-right tabular-nums">{c.recipient_count || '—'}</td>
                  <td className="px-4 py-4 text-right tabular-nums">{c.sent_count || '—'}</td>
                  <td className="px-4 py-4 text-right tabular-nums">{c.opened_count || '—'}</td>
                  <td className="px-4 py-4 text-right tabular-nums">{c.clicked_count || '—'}</td>
                  <td className="px-4 py-4 text-xs text-ink-500">{formatDate(c.sent_at || c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Compose / Send
// ---------------------------------------------------------------------------

const DEFAULT_HTML = `<div style="font-family: 'DM Sans', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1a1f2e; line-height: 1.6;">
  <h1 style="font-family: 'Playfair Display', Georgia, serif; font-weight: 400; font-size: 28px; margin: 0 0 16px;">Hi {{first_name}},</h1>

  <p>Write your message here.</p>

  <p>Best,<br>Tim</p>

  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999;">
    McMullen Properties — DRE #02016832
  </div>
</div>`

function CampaignCompose() {
  const { currentTenant, session } = useAuth()
  const navigate = useNavigate()
  const [lists, setLists] = useState<ContactList[]>([])
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [fromName, setFromName] = useState('Tim McMullen')
  const [fromEmail, setFromEmail] = useState('tim@mcmullen-properties.com')
  const [replyTo, setReplyTo] = useState('tim@mcmullen.properties')
  const [listId, setListId] = useState('')
  const [htmlBody, setHtmlBody] = useState(DEFAULT_HTML)
  const [plainBody, setPlainBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sendResult, setSendResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentTenant) return
    supabase
      .from('contact_lists')
      .select('*')
      .order('name')
      .then(({ data }) => setLists((data || []) as ContactList[]))
  }, [currentTenant?.id])

  const selectedList = useMemo(() => lists.find((l) => l.id === listId), [lists, listId])

  async function saveDraft(redirectAfter: boolean) {
    setError(null)
    if (!currentTenant) {
      setError('No tenant context.')
      return null
    }
    if (!name.trim() || !subject.trim()) {
      setError('Name and subject are required.')
      return null
    }
    if (!htmlBody.trim() && !plainBody.trim()) {
      setError('Provide HTML body or plain text body.')
      return null
    }
    setBusy(true)
    const { data, error: insertErr } = await supabase
      .from('campaigns')
      .insert({
        tenant_id: currentTenant.id,
        name: name.trim(),
        subject: subject.trim(),
        from_name: fromName.trim(),
        from_email: fromEmail.trim(),
        reply_to: replyTo.trim() || null,
        html_body: htmlBody,
        plain_body: plainBody,
        list_id: listId || null,
        status: 'draft',
      })
      .select('id')
      .single()
    setBusy(false)
    if (insertErr) {
      setError(insertErr.message)
      return null
    }
    if (redirectAfter) navigate(`/campaigns/${data.id}`)
    return data.id
  }

  async function sendNow() {
    setError(null)
    if (!listId) {
      setError('Pick a list to send to.')
      setConfirmOpen(false)
      return
    }
    const campaignId = await saveDraft(false)
    if (!campaignId) {
      setConfirmOpen(false)
      return
    }

    setBusy(true)
    const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || 'https://kumfuludrhoqirxvaqja.supabase.co'
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send_campaign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaign_id: campaignId }),
      })
      const result = await resp.json()
      setBusy(false)
      setConfirmOpen(false)
      if (!resp.ok) {
        setError(result.error || 'Send failed')
        return
      }
      setSendResult(result)
      // Navigate to detail after a brief pause so user sees the confirmation
      setTimeout(() => navigate(`/campaigns/${campaignId}`), 1500)
    } catch (e: any) {
      setBusy(false)
      setConfirmOpen(false)
      setError(e?.message || 'Network error')
    }
  }

  return (
    <div className="px-8 py-10 max-w-5xl">
      <Link to="/campaigns" className="text-xs uppercase tracking-widest text-ink-500 hover:text-ink-900 flex items-center gap-1 mb-6">
        <ArrowLeft size={14} /> Back to Campaigns
      </Link>

      <h1 className="font-serif text-3xl text-ink-900 mb-2">New Campaign</h1>
      <p className="text-sm text-ink-500 mb-8">Compose, save as draft, or send immediately. Recipients are filtered to subscribed contacts only.</p>

      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 mb-6 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      {sendResult && (
        <div className="border border-green-200 bg-green-50 px-4 py-3 mb-6 text-sm text-green-700 flex items-start gap-2">
          <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            Sent! {sendResult.sent_count} of {sendResult.recipient_count} delivered to Resend.
            {sendResult.failed_count > 0 ? ` ${sendResult.failed_count} failed.` : ''}
          </span>
        </div>
      )}

      <div className="space-y-6">
        <Field label="Internal name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Spring market update"
            className="w-full border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:border-ink-900"
          />
        </Field>

        <Field label="Send to list">
          <select
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            className="w-full border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:border-ink-900 bg-white"
          >
            <option value="">— pick a list —</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-6">
          <Field label="From name">
            <input
              type="text"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              className="w-full border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:border-ink-900"
            />
          </Field>
          <Field label="From email">
            <input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              className="w-full border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:border-ink-900"
            />
          </Field>
        </div>

        <Field label="Reply-to (optional)">
          <input
            type="email"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            placeholder={fromEmail}
            className="w-full border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:border-ink-900"
          />
        </Field>

        <Field label="Subject">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What recipients see in their inbox"
            className="w-full border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:border-ink-900"
          />
          <p className="text-xs text-ink-500 mt-1">Merge tags supported: <code className="font-mono">{'{{first_name}}'}</code>, <code className="font-mono">{'{{last_name}}'}</code>, <code className="font-mono">{'{{full_name}}'}</code>, <code className="font-mono">{'{{email}}'}</code></p>
        </Field>

        <Field label="HTML body">
          <textarea
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            rows={18}
            className="w-full border border-ink-300 px-3 py-2 text-xs font-mono focus:outline-none focus:border-ink-900"
          />
          <p className="text-xs text-ink-500 mt-1">A tracking pixel and unsubscribe link are automatically appended. Links are wrapped with click tracking. Include <code className="font-mono">{'{{unsubscribe_url}}'}</code> anywhere to use your own unsubscribe text instead.</p>
        </Field>

        <Field label="Plain text body (fallback)">
          <textarea
            value={plainBody}
            onChange={(e) => setPlainBody(e.target.value)}
            rows={6}
            placeholder="Optional. Shown when HTML can't render."
            className="w-full border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:border-ink-900"
          />
        </Field>

        <div className="flex items-center gap-3 pt-4 border-t border-ink-200">
          <button
            onClick={() => saveDraft(true)}
            disabled={busy}
            className="border border-ink-300 px-5 py-2 text-xs uppercase tracking-widest hover:bg-ink-50 transition disabled:opacity-50"
          >
            <FileText size={14} className="inline mr-2" />
            Save Draft
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={busy || !listId || !name.trim() || !subject.trim()}
            className="bg-ink-900 text-cream px-5 py-2 text-xs uppercase tracking-widest hover:bg-ink-700 transition disabled:opacity-30"
          >
            <Send size={14} className="inline mr-2" />
            Send Now
          </button>
          {busy && <Loader2 size={16} className="animate-spin text-ink-500" />}
        </div>
      </div>

      {confirmOpen && (
        <ConfirmSendModal
          listName={selectedList?.name || '(unknown list)'}
          subject={subject}
          fromHeader={`${fromName} <${fromEmail}>`}
          onConfirm={sendNow}
          onCancel={() => setConfirmOpen(false)}
          busy={busy}
        />
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-2">{label}</label>
      {children}
    </div>
  )
}

function ConfirmSendModal({
  listName, subject, fromHeader, onConfirm, onCancel, busy,
}: {
  listName: string
  subject: string
  fromHeader: string
  onConfirm: () => void
  onCancel: () => void
  busy: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-cream max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-serif text-2xl text-ink-900 mb-4">Send this campaign?</h2>
        <dl className="space-y-3 text-sm mb-6">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500 uppercase text-2xs tracking-widest">From</dt>
            <dd className="text-ink-900 text-right">{fromHeader}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500 uppercase text-2xs tracking-widest">To list</dt>
            <dd className="text-ink-900 text-right">{listName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-500 uppercase text-2xs tracking-widest">Subject</dt>
            <dd className="text-ink-900 text-right">{subject}</dd>
          </div>
        </dl>
        <p className="text-xs text-ink-500 mb-6">
          Only subscribed contacts in this list will receive the email. The 200-recipient cap applies. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="border border-ink-300 px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="bg-ink-900 text-cream px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink-700 transition disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="inline animate-spin mr-2" /> : null}
            Confirm Send
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail view
// ---------------------------------------------------------------------------

function CampaignDetail() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const { currentTenant } = useAuth()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [recipients, setRecipients] = useState<(CampaignRecipient & { contact_email?: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentTenant || !campaignId) return
    loadData()
  }, [currentTenant?.id, campaignId])

  async function loadData() {
    setLoading(true)
    const [{ data: c }, { data: rs }] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', campaignId).maybeSingle(),
      supabase.from('campaign_recipients').select('*').eq('campaign_id', campaignId).order('created_at').limit(500),
    ])
    setCampaign((c as Campaign) || null)
    setRecipients((rs as any[]) || [])
    setLoading(false)
  }

  if (loading) return <div className="px-8 py-10 text-xs uppercase tracking-widest text-ink-500">Loading campaign…</div>
  if (!campaign) return <div className="px-8 py-10">Campaign not found.</div>

  const openRate = campaign.sent_count > 0 ? (campaign.opened_count / campaign.sent_count) * 100 : 0
  const clickRate = campaign.sent_count > 0 ? (campaign.clicked_count / campaign.sent_count) * 100 : 0

  return (
    <div className="px-8 py-10 max-w-6xl">
      <Link to="/campaigns" className="text-xs uppercase tracking-widest text-ink-500 hover:text-ink-900 flex items-center gap-1 mb-6">
        <ArrowLeft size={14} /> Back to Campaigns
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-ink-900 mb-2">{campaign.name}</h1>
          <p className="text-sm text-ink-700 mb-1">{campaign.subject}</p>
          <p className="text-xs text-ink-500">From {campaign.from_name} &lt;{campaign.from_email}&gt;</p>
        </div>
        <StatusBadge status={campaign.status} />
      </div>

      <div className="grid grid-cols-5 gap-4 mb-10">
        <StatCard label="Recipients" value={campaign.recipient_count} />
        <StatCard label="Sent" value={campaign.sent_count} />
        <StatCard label="Opens" value={campaign.opened_count} subtitle={`${openRate.toFixed(1)}% rate`} icon={<Eye size={14} />} />
        <StatCard label="Clicks" value={campaign.clicked_count} subtitle={`${clickRate.toFixed(1)}% rate`} icon={<MousePointerClick size={14} />} />
        <StatCard label="Bounced / Unsub" value={campaign.bounced_count + campaign.unsubscribed_count} subtitle={`${campaign.bounced_count} bounced · ${campaign.unsubscribed_count} unsub`} />
      </div>

      <h2 className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Recipients ({recipients.length})</h2>
      <div className="border border-ink-200">
        <table className="w-full text-sm">
          <thead className="bg-ink-50">
            <tr className="text-left text-2xs uppercase tracking-widest text-ink-500">
              <th className="px-4 py-3 font-normal">Email</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Sent</th>
              <th className="px-4 py-3 font-normal">Opened</th>
              <th className="px-4 py-3 font-normal">Clicked</th>
              <th className="px-4 py-3 font-normal">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {recipients.map((r) => (
              <tr key={r.id} className="hover:bg-ink-50">
                <td className="px-4 py-3 text-ink-900">{r.email_at_send}</td>
                <td className="px-4 py-3"><RecipientStatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-xs text-ink-500">{r.sent_at ? formatDate(r.sent_at) : '—'}</td>
                <td className="px-4 py-3 text-xs">{r.opened_at ? <Eye size={14} className="text-green-700" /> : <span className="text-ink-300">—</span>}</td>
                <td className="px-4 py-3 text-xs">{r.clicked_at ? <MousePointerClick size={14} className="text-blue-700" /> : <span className="text-ink-300">—</span>}</td>
                <td className="px-4 py-3 text-xs text-ink-500 max-w-xs truncate">{r.error_message || (r.bounced_at ? 'bounced' : r.unsubscribed_at ? 'unsubscribed' : '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value, subtitle, icon }: { label: string; value: number; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <div className="border border-ink-200 px-4 py-4">
      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1 flex items-center gap-2">
        {icon}{label}
      </div>
      <div className="text-2xl font-serif text-ink-900 tabular-nums">{value}</div>
      {subtitle && <div className="text-xs text-ink-500 mt-1">{subtitle}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status badges
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: 'bg-ink-100 text-ink-700',
  queued: 'bg-blue-50 text-blue-700',
  sending: 'bg-blue-50 text-blue-700',
  sent: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  canceled: 'bg-ink-100 text-ink-500 line-through',
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={`inline-block px-2 py-1 text-2xs uppercase tracking-widest ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  )
}

const RECIPIENT_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-ink-100 text-ink-700',
  sent: 'bg-green-50 text-green-700',
  bounced: 'bg-red-50 text-red-700',
  failed: 'bg-red-50 text-red-700',
  skipped: 'bg-ink-100 text-ink-500',
  complained: 'bg-orange-50 text-orange-700',
}

function RecipientStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-2xs uppercase tracking-widest ${RECIPIENT_STATUS_STYLES[status] || 'bg-ink-100 text-ink-700'}`}>
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatDate(d: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
