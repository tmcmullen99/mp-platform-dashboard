// EPIC C.2.0 — Outreach (audience wave campaigns).
//
// Route: /outreach
//
// Create a campaign over a saved audience, then send it in waves. Each wave
// pulls the next eligible owners (the resolve_audience_recipients picker handles
// suppression, dedup, and cooldown server-side), emails each one a personalized
// claim link, and records to the campaign_recipients ledger. Re-run waves until
// the pool is exhausted.
//
// This is the engine that runs the top of the funnel: Markets (acquire) →
// Audiences (segment) → Outreach (reach, with the claim link as the call to
// action) → claims come back as confirmed, engaged owners.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Megaphone,
  Plus,
  Loader2,
  X as XIcon,
  Send,
  CheckCircle2,
  AlertTriangle,
  Users,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type Audience = {
  id: string
  name: string
  market_id: string | null
  last_resolved_count: number | null
}

type Campaign = {
  id: string
  name: string
  subject: string
  status: string
  audience_id: string | null
  wave_size: number
  cooldown_days: number
  recipient_count: number
  sent_count: number
  failed_count: number
  opened_count: number
  clicked_count: number
  last_wave_at: string | null
  created_at: string
}

const DEFAULT_BODY = `<p>Hi {{first_name}},</p>
<p>I keep a close eye on what's happening with homes near {{property_address}}, and I have it on file as yours.</p>
<p>If that's right, you can confirm in one click and I'll keep you posted on nearby sales and what your home might be worth — no obligation:</p>
<p><a href="{{claim_url}}">Confirm my property →</a></p>
<p>Best,<br>Your agent</p>`

function statusBadge(s: string): string {
  switch (s) {
    case 'sent':
      return 'bg-emerald-50 text-emerald-700'
    case 'sending':
      return 'bg-sky-50 text-sky-700'
    case 'failed':
      return 'bg-red-50 text-red-700'
    case 'queued':
      return 'bg-amber-50 text-amber-700'
    default:
      return 'bg-ink-100 text-ink-500'
  }
}

export default function Outreach() {
  const { currentTenant, currentBranding, user } = useAuth()
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [{ data: aud }, { data: camp }] = await Promise.all([
      supabase.from('audiences').select('id, name, market_id, last_resolved_count').order('created_at', { ascending: false }),
      supabase
        .from('campaigns')
        .select('id, name, subject, status, audience_id, wave_size, cooldown_days, recipient_count, sent_count, failed_count, opened_count, clicked_count, last_wave_at, created_at')
        .not('audience_id', 'is', null)
        .order('created_at', { ascending: false }),
    ])
    setAudiences((aud as Audience[]) || [])
    setCampaigns((camp as Campaign[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const audienceName = (id: string | null) => audiences.find((a) => a.id === id)?.name || 'Audience'
  const audienceEligible = (id: string | null) =>
    audiences.find((a) => a.id === id)?.last_resolved_count ?? null

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">Outreach</div>
          <h1 className="font-display text-3xl text-ink-900">Wave campaigns</h1>
          <p className="text-ink-600 mt-2 max-w-2xl leading-relaxed">
            Send a saved audience a personalized claim link, in controlled waves.
            Suppression, dedup, and cooldown are enforced automatically — you just
            decide when to push the next wave.
          </p>
        </div>
        {audiences.length > 0 && (
          <button
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            New campaign
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-2xs uppercase tracking-widest text-ink-500">Loading…</div>
      ) : audiences.length === 0 ? (
        <div className="border border-dashed border-ink-200 py-16 text-center">
          <Megaphone className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.25} />
          <div className="text-sm text-ink-700 font-medium">No audiences yet</div>
          <p className="text-ink-500 text-sm mt-1">
            Build an audience first — campaigns send to a saved audience.
          </p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="border border-dashed border-ink-200 py-16 text-center">
          <Megaphone className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.25} />
          <div className="text-sm text-ink-700 font-medium">No campaigns yet</div>
          <p className="text-ink-500 text-sm mt-1 mb-4">
            Launch your first wave campaign to start reaching owners.
          </p>
          <button
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            New campaign
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              audienceName={audienceName(c.audience_id)}
              eligible={audienceEligible(c.audience_id)}
              onChanged={refresh}
            />
          ))}
        </div>
      )}

      {composing && currentTenant && (
        <CampaignComposer
          tenantId={currentTenant.id}
          userId={user?.id || null}
          audiences={audiences}
          fromName={currentBranding?.agent_name || currentTenant.display_name || 'McMullen Properties'}
          fromEmail={currentBranding?.agent_email || 'tim@mcmullen.properties'}
          onClose={() => setComposing(false)}
          onCreated={() => {
            setComposing(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function CampaignCard({
  campaign,
  audienceName,
  eligible,
  onChanged,
}: {
  campaign: Campaign
  audienceName: string
  eligible: number | null
  onChanged: () => void
}) {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const exhausted = campaign.status === 'sent'

  async function sendWave() {
    setSending(true)
    setResult(null)
    const { data, error } = await supabase.functions.invoke('send_campaign_wave', {
      body: { campaign_id: campaign.id },
    })
    setSending(false)
    if (error || !data?.ok) {
      setResult((data && (data.error as string)) || error?.message || 'Wave failed')
      return
    }
    if (data.exhausted) {
      setResult('Pool exhausted — campaign complete')
    } else {
      setResult(`Wave sent: ${data.wave_sent}${data.wave_failed ? ` · ${data.wave_failed} failed` : ''}`)
    }
    onChanged()
  }

  return (
    <div className="border border-ink-200 bg-cream p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-display text-xl text-ink-900">{campaign.name}</h3>
            <span className={`text-2xs uppercase tracking-widest px-2 py-0.5 ${statusBadge(campaign.status)}`}>
              {campaign.status}
            </span>
          </div>
          <div className="text-sm text-ink-600 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-ink-400" strokeWidth={1.5} />
            {audienceName}
            {eligible != null && (
              <span className="text-ink-400">· {eligible.toLocaleString()} eligible</span>
            )}
          </div>
          <div className="text-2xs uppercase tracking-widest text-ink-400 mt-1">
            “{campaign.subject}”
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-3xl text-ink-900 tabular-nums">
            {campaign.sent_count.toLocaleString()}
          </div>
          <div className="text-2xs uppercase tracking-widest text-ink-500">sent</div>
          {(campaign.opened_count > 0 || campaign.clicked_count > 0) && (
            <div className="text-2xs uppercase tracking-widest text-ink-500 mt-1">
              {campaign.opened_count} opened · {campaign.clicked_count} clicked
            </div>
          )}
          {campaign.failed_count > 0 && (
            <div className="text-2xs uppercase tracking-widest text-red-600 mt-0.5">
              {campaign.failed_count} failed
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-ink-100 flex-wrap gap-3">
        <div className="text-2xs uppercase tracking-widest text-ink-400">
          Wave size {campaign.wave_size} · cooldown {campaign.cooldown_days}d
          {campaign.last_wave_at && (
            <> · last wave {new Date(campaign.last_wave_at).toLocaleString()}</>
          )}
        </div>
        <div className="flex items-center gap-3">
          {result && (
            <span className="text-2xs uppercase tracking-widest text-ink-600 inline-flex items-center gap-1">
              {result.includes('failed') || result.includes('Failed') ? (
                <AlertTriangle className="w-3 h-3 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              )}
              {result}
            </span>
          )}
          <button
            onClick={sendWave}
            disabled={sending || exhausted}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" strokeWidth={2} />
            )}
            {exhausted ? 'Complete' : 'Send wave'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CampaignComposer({
  tenantId,
  userId,
  audiences,
  fromName,
  fromEmail,
  onClose,
  onCreated,
}: {
  tenantId: string
  userId: string | null
  audiences: Audience[]
  fromName: string
  fromEmail: string
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [audienceId, setAudienceId] = useState(audiences[0]?.id || '')
  const [subject, setSubject] = useState('A quick question about {{property_address}}')
  const [body, setBody] = useState(DEFAULT_BODY)
  const [waveSize, setWaveSize] = useState(50)
  const [cooldown, setCooldown] = useState(30)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasClaimLink = useMemo(() => /\{\{\s*claim_url\s*\}\}/.test(body), [body])

  async function save() {
    if (!name.trim()) return setError('Name the campaign.')
    if (!audienceId) return setError('Pick an audience.')
    if (!subject.trim()) return setError('Add a subject.')
    if (!body.trim()) return setError('Add a body.')
    setSaving(true)
    setError(null)
    const { error: insErr } = await supabase.from('campaigns').insert({
      tenant_id: tenantId,
      name: name.trim(),
      subject: subject.trim(),
      html_body: body,
      from_name: fromName,
      from_email: fromEmail,
      reply_to: fromEmail,
      audience_id: audienceId,
      wave_size: Math.max(1, Math.min(200, waveSize)),
      cooldown_days: Math.max(0, cooldown),
      status: 'draft',
      created_by: userId,
    })
    setSaving(false)
    if (insErr) return setError(insErr.message)
    onCreated()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-cream w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-ink-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-7 py-5 border-b border-ink-200 flex items-start justify-between gap-4">
          <div>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">New campaign</div>
            <h2 className="font-display text-2xl text-ink-900">Compose a wave</h2>
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

        <div className="px-7 py-6 space-y-4">
          <Field label="Campaign name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="East Side cold owners — wave 1"
              className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
            />
          </Field>
          <Field label="Audience">
            <select
              value={audienceId}
              onChange={(e) => setAudienceId(e.target.value)}
              className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
            >
              {audiences.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.last_resolved_count != null ? ` (${a.last_resolved_count} eligible)` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subject">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
            />
          </Field>
          <Field label="Body (HTML)">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={9}
              className="w-full px-3 py-2 border border-ink-200 text-sm font-mono bg-white focus:outline-none focus:border-ink-900 leading-relaxed"
            />
          </Field>
          <div className="text-2xs uppercase tracking-widest text-ink-400 leading-relaxed">
            Merge tags: {'{{first_name}}'} · {'{{property_address}}'} · {'{{claim_url}}'} · {'{{unsubscribe_url}}'}.
            An unsubscribe footer is added automatically.
          </div>
          {!hasClaimLink && (
            <div className="text-2xs uppercase tracking-widest text-amber-700 inline-flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              No {'{{claim_url}}'} in the body — owners won’t have a claim link
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Wave size">
              <input
                type="number"
                min={1}
                max={200}
                value={waveSize}
                onChange={(e) => setWaveSize(Number(e.target.value))}
                className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
              />
            </Field>
            <Field label="Cooldown (days)">
              <input
                type="number"
                min={0}
                value={cooldown}
                onChange={(e) => setCooldown(Number(e.target.value))}
                className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
              />
            </Field>
          </div>

          <div className="text-2xs uppercase tracking-widest text-ink-400">
            Sending as {fromName} &lt;{fromEmail}&gt;
          </div>
        </div>

        <div className="px-7 py-4 border-t border-ink-200 flex items-center justify-between gap-3">
          {error ? <div className="text-sm text-red-700 flex-1 min-w-0">{error}</div> : <span />}
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
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Save as draft
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
