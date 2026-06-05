// EPIC G.0 — Tasks.  Route: /tasks
// Agent follow-ups: open/overdue at a glance, quick-add, one-tap complete.

import { useCallback, useEffect, useState } from 'react'
import { CheckSquare, Square, Plus, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type Task = {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  contact_id: string | null
  client_id: string | null
  deal_id: string | null
  created_at: string
}

function isOverdue(due: string | null) {
  if (!due) return false
  return new Date(due) < new Date(new Date().toDateString())
}

const priorityDot: Record<string, string> = {
  high: 'bg-red-500',
  normal: 'bg-ink-300',
  low: 'bg-ink-200',
}

export default function Tasks() {
  const { currentTenant } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<'open' | 'done'>('open')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, contact_id, client_id, deal_id, created_at')
      .eq('status', filter)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    setTasks((data as Task[]) || [])
    setLoading(false)
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  async function toggle(t: Task) {
    setBusy(t.id)
    const done = t.status !== 'done'
    await supabase.from('tasks').update({ status: done ? 'done' : 'open', completed_at: done ? new Date().toISOString() : null }).eq('id', t.id)
    setBusy(null)
    load()
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">Follow-ups</div>
          <h1 className="font-display text-3xl text-ink-900">Tasks</h1>
        </div>
        <div className="flex items-center gap-1 border border-ink-200">
          {(['open', 'done'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-2xs uppercase tracking-widest ${filter === f ? 'bg-ink-900 text-cream' : 'text-ink-500 hover:text-ink-900'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {currentTenant && <QuickAdd tenantId={currentTenant.id} onAdded={load} />}

      {loading ? (
        <div className="py-16 text-center text-2xs uppercase tracking-widest text-ink-500">Loading…</div>
      ) : tasks.length === 0 ? (
        <div className="border border-dashed border-ink-200 py-12 text-center mt-4">
          <CheckSquare className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.25} />
          <div className="text-sm text-ink-700 font-medium">{filter === 'open' ? 'All clear' : 'Nothing completed yet'}</div>
        </div>
      ) : (
        <div className="border border-ink-200 divide-y divide-ink-100 mt-4">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => toggle(t)} disabled={busy === t.id} className="shrink-0 text-ink-400 hover:text-ink-900">
                {busy === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : t.status === 'done' ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
              </button>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot[t.priority] || 'bg-ink-300'}`} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm truncate ${t.status === 'done' ? 'text-ink-400 line-through' : 'text-ink-900'}`}>{t.title}</div>
              </div>
              {t.due_date && (
                <span className={`text-2xs uppercase tracking-widest shrink-0 ${isOverdue(t.due_date) && t.status !== 'done' ? 'text-red-600' : 'text-ink-400'}`}>
                  {new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function QuickAdd({ tenantId, onAdded }: { tenantId: string; onAdded: () => void }) {
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState('normal')
  const [saving, setSaving] = useState(false)

  async function add() {
    if (!title.trim()) return
    setSaving(true)
    await supabase.from('tasks').insert({ tenant_id: tenantId, title: title.trim(), due_date: due || null, priority })
    setSaving(false)
    setTitle(''); setDue('')
    onAdded()
  }

  return (
    <div className="flex items-center gap-2 border border-ink-200 bg-cream p-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }}
        placeholder="Add a follow-up…"
        className="flex-1 px-2 py-1.5 bg-transparent text-sm focus:outline-none" />
      <select value={priority} onChange={(e) => setPriority(e.target.value)}
        className="text-2xs uppercase tracking-widest px-2 py-1.5 border border-ink-200 bg-white focus:outline-none">
        <option value="low">low</option>
        <option value="normal">normal</option>
        <option value="high">high</option>
      </select>
      <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
        className="text-2xs px-2 py-1.5 border border-ink-200 bg-white focus:outline-none" />
      <button onClick={add} disabled={saving || !title.trim()}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}
