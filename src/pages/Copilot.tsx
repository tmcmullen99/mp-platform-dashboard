// EPIC H.1 — Copilot.  Route: /copilot
// Full-page chat against the `chat` Edge Function (v10): streams text deltas and
// shows tool-run indicators live. The copilot can read markets, the hot-lead
// board, deals, tasks, the funnel, CRM + campaigns — and take actions (create
// tasks/contacts, send campaigns).

import { useEffect, useRef, useState } from 'react'
import { Sparkles, ArrowUp, Loader2, Wrench } from 'lucide-react'
import { EDGE_FUNCTIONS_BASE_URL } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

type ToolRun = { id: string; name: string; ok?: boolean; summary?: string }
type Msg = { role: 'user' | 'assistant'; text: string; tools: ToolRun[] }

const SUGGESTIONS = [
  'Who should I call today?',
  "How's business?",
  "What's in my pipeline?",
  'Summarize my biggest market',
]

export default function Copilot() {
  const { session, currentTenant } = useAuth()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  async function send(text: string) {
    const content = text.trim()
    if (!content || streaming || !session?.access_token || !currentTenant) return
    setInput('')

    const history = msgs.map((m) => ({ role: m.role, content: m.text }))
    const next: Msg[] = [...msgs, { role: 'user', text: content, tools: [] }, { role: 'assistant', text: '', tools: [] }]
    setMsgs(next)
    setStreaming(true)

    try {
      const res = await fetch(`${EDGE_FUNCTIONS_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content }],
          tenant_id: currentTenant.id,
        }),
      })
      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => '')
        throw new Error(t || `Request failed (${res.status})`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const patchLast = (fn: (m: Msg) => Msg) =>
        setMsgs((prev) => prev.map((m, i) => (i === prev.length - 1 ? fn(m) : m)))

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''
        for (const part of parts) {
          const line = part.split('\n').find((l) => l.startsWith('data: '))
          if (!line) continue
          let evt: any
          try { evt = JSON.parse(line.slice(6)) } catch { continue }

          if (evt.type === 'text') {
            patchLast((m) => ({ ...m, text: m.text + evt.delta }))
          } else if (evt.type === 'tool_run_start') {
            patchLast((m) => ({ ...m, tools: [...m.tools, { id: evt.id, name: evt.name }] }))
          } else if (evt.type === 'tool_run_end') {
            patchLast((m) => ({
              ...m,
              tools: m.tools.map((t) => (t.id === evt.id ? { ...t, ok: evt.ok, summary: evt.summary } : t)),
            }))
          } else if (evt.type === 'error') {
            patchLast((m) => ({ ...m, text: m.text + `\n\n⚠️ ${evt.message}` }))
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setMsgs((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, text: m.text || `⚠️ ${msg}` } : m)))
    } finally {
      setStreaming(false)
    }
  }

  const empty = msgs.length === 0

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-1 shrink-0">
        <Sparkles className="w-4 h-4 text-ink-900" strokeWidth={2} />
        <div className="text-2xs uppercase tracking-widest text-ink-500">Copilot</div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto -mx-2 px-2">
        {empty ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <h1 className="font-display text-3xl text-ink-900 mb-2">How can I help?</h1>
            <p className="text-ink-500 max-w-md mb-8">
              Ask about your leads, pipeline, markets, or campaigns — or tell me to draft a note, add a follow-up, or send a wave.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="text-left px-4 py-3 border border-ink-200 text-sm text-ink-700 hover:border-ink-900 hover:text-ink-900 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
                {m.role === 'user' ? (
                  <div className="bg-ink-900 text-cream px-4 py-2.5 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap">
                    {m.text}
                  </div>
                ) : (
                  <div className="max-w-[90%]">
                    {m.tools.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {m.tools.map((t) => (
                          <span key={t.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 border text-2xs uppercase tracking-widest ${
                              t.ok === false ? 'border-red-200 text-red-600' : 'border-ink-200 text-ink-500'
                            }`}>
                            {t.ok === undefined ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wrench className="w-3 h-3" />}
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-ink-800 text-sm leading-relaxed whitespace-pre-wrap">
                      {m.text}
                      {streaming && i === msgs.length - 1 && m.text === '' && (
                        <span className="inline-flex items-center gap-1 text-ink-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> thinking…</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 pt-3">
        <div className="flex items-end gap-2 border border-ink-300 bg-cream focus-within:border-ink-900 px-3 py-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
            }}
            rows={1}
            placeholder="Ask your copilot…"
            className="flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-400 resize-none focus:outline-none max-h-32 py-1"
          />
          <button onClick={() => send(input)} disabled={streaming || !input.trim()}
            className="shrink-0 w-8 h-8 flex items-center justify-center bg-ink-900 text-cream disabled:opacity-30 hover:bg-ink-700">
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
          </button>
        </div>
        <div className="text-2xs text-ink-400 mt-1.5 text-center">Copilot can read your workspace and take actions. Verify anything important.</div>
      </div>
    </div>
  )
}
