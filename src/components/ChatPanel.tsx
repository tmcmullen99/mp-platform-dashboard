import { FormEvent, useEffect, useRef, useState } from 'react'
import {
  Send,
  Sparkles,
  X,
  Check,
  AlertCircle,
  Loader2,
  MessageSquare,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { EDGE_FUNCTIONS_BASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase'

type Role = 'user' | 'assistant'

type ToolRun = {
  id: string
  name: string
  status: 'running' | 'ok' | 'error'
  summary?: string
  error?: string
}

type Message = {
  id: string
  role: Role
  text: string
  toolRuns: ToolRun[]
  done: boolean
}

const PROMPT_SUGGESTIONS = [
  'Show me my contact lists',
  'What campaigns have I sent?',
  'Send a draft to my homeowners list',
  'Add a contact to my CRM',
]

export default function ChatPanel() {
  const { session, currentTenant } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (open && !streaming) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, streaming])

  const canChat = !!session && !!currentTenant

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim()
    if (!text || streaming || !canChat) return

    const userMsg: Message = {
      id: cryptoId(),
      role: 'user',
      text,
      toolRuns: [],
      done: true,
    }
    const assistantId = cryptoId()
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      text: '',
      toolRuns: [],
      done: false,
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')
    setStreaming(true)
    setError(null)

    // Build API payload — history + new user message, only role + text content
    const history = [...messages, userMsg]
      .filter((m) => m.text.trim())
      .map((m) => ({ role: m.role, content: m.text }))

    const ac = new AbortController()
    abortRef.current = ac

    try {
      const response = await fetch(`${EDGE_FUNCTIONS_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session!.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          messages: history,
          tenant_id: currentTenant!.id,
        }),
        signal: ac.signal,
      })

      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Server ${response.status}: ${errText.slice(0, 200)}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const events = buf.split('\n\n')
        buf = events.pop() || ''

        for (const evt of events) {
          const trimmed = evt.trim()
          if (!trimmed.startsWith('data: ')) continue
          const dataStr = trimmed.slice(6).trim()
          if (!dataStr) continue

          let data: any
          try {
            data = JSON.parse(dataStr)
          } catch {
            continue
          }

          if (data.type === 'text') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, text: m.text + (data.delta || '') } : m,
              ),
            )
          } else if (data.type === 'tool_run_start') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      toolRuns: [
                        ...m.toolRuns,
                        { id: data.id, name: data.name, status: 'running' },
                      ],
                    }
                  : m,
              ),
            )
          } else if (data.type === 'tool_run_end') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      toolRuns: m.toolRuns.map((t) =>
                        t.id === data.id
                          ? {
                              ...t,
                              status: data.ok ? 'ok' : 'error',
                              summary: data.summary,
                              error: data.error,
                            }
                          : t,
                      ),
                    }
                  : m,
              ),
            )
          } else if (data.type === 'error') {
            setError(data.message || 'Stream error')
          } else if (data.type === 'done') {
            // Final marker; will fall through to finally
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err?.message || String(err))
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, done: true } : m)),
      )
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    handleSend()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function clearConversation() {
    if (streaming) abortRef.current?.abort()
    setMessages([])
    setError(null)
  }

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-8 right-8 bg-ink-900 text-cream w-14 h-14 flex items-center justify-center shadow-2xl hover:bg-ink-800 transition-colors z-30 group"
          aria-label="Open assistant"
        >
          <Sparkles
            className="w-5 h-5 transition-transform group-hover:scale-110"
            strokeWidth={1.5}
          />
        </button>
      )}

      {/* Slide-in panel */}
      {open && (
        <aside className="fixed top-0 right-0 h-screen w-[420px] bg-white border-l border-ink-100 flex flex-col z-30 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-ink-100 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-ink-700" strokeWidth={1.5} />
              <span className="font-display text-lg text-ink-900">Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearConversation}
                  className="text-2xs uppercase tracking-widest text-ink-500 hover:text-ink-900 transition-colors px-2 py-1"
                  title="Clear conversation"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-ink-400 hover:text-ink-900 transition-colors p-1"
                aria-label="Close assistant"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.length === 0 ? (
              <EmptyState canChat={canChat} onPick={(p) => handleSend(p)} />
            ) : (
              messages.map((m) => <Bubble key={m.id} message={m} streaming={streaming} />)
            )}
            {error && (
              <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-xs uppercase tracking-widest mb-1">Error</div>
                    <div className="font-mono text-xs leading-relaxed">{error}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={onSubmit} className="p-4 border-t border-ink-100 shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                rows={1}
                disabled={!canChat || streaming}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  // auto-resize
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
                }}
                onKeyDown={onKeyDown}
                placeholder={canChat ? 'Ask anything…' : 'Sign in to chat'}
                className="flex-1 border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus:border-ink-900 transition-colors resize-none disabled:bg-ink-50/50 disabled:text-ink-400"
                style={{ maxHeight: 160 }}
              />
              <button
                type="submit"
                disabled={!canChat || streaming || !input.trim()}
                className="bg-ink-900 text-cream w-10 h-10 flex items-center justify-center hover:bg-ink-800 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                aria-label="Send"
              >
                {streaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                ) : (
                  <Send className="w-4 h-4" strokeWidth={1.75} />
                )}
              </button>
            </div>
            <div className="mt-2 text-2xs uppercase tracking-widest text-ink-400">
              Enter to send · Shift+Enter for newline
            </div>
          </form>
        </aside>
      )}
    </>
  )
}

function EmptyState({
  canChat,
  onPick,
}: {
  canChat: boolean
  onPick: (text: string) => void
}) {
  if (!canChat) {
    return (
      <div className="text-center py-12 text-ink-400">
        <MessageSquare className="w-10 h-10 mx-auto mb-4 text-ink-200" strokeWidth={1.25} />
        <div className="text-sm text-ink-700">Sign in to chat with your workspace.</div>
      </div>
    )
  }
  return (
    <div className="py-4">
      <div className="text-center mb-8">
        <Sparkles className="w-8 h-8 mx-auto mb-4 text-ink-300" strokeWidth={1.25} />
        <div className="font-display text-xl text-ink-900 mb-2">How can I help?</div>
        <div className="text-xs text-ink-500 leading-relaxed max-w-[260px] mx-auto">
          Ask about your workspace, contacts, listings, or anything on the public web.
        </div>
      </div>
      <div className="space-y-2">
        {PROMPT_SUGGESTIONS.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="w-full text-left px-4 py-3 border border-ink-100 hover:border-ink-300 hover:bg-ink-50/50 transition-colors text-sm text-ink-700"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

function Bubble({ message, streaming }: { message: Message; streaming: boolean }) {
  const isUser = message.role === 'user'
  const isLast = !message.done && streaming

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-ink-900 text-cream px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed">
          {message.text}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {message.toolRuns.length > 0 && (
        <div className="space-y-1">
          {message.toolRuns.map((t) => (
            <ToolRunIndicator key={t.id} run={t} />
          ))}
        </div>
      )}
      {message.text && (
        <div className="text-sm text-ink-900 leading-relaxed whitespace-pre-wrap">
          {message.text}
          {isLast && <span className="inline-block w-1.5 h-4 bg-ink-900 ml-0.5 align-text-bottom animate-pulse" />}
        </div>
      )}
      {!message.text && message.toolRuns.length === 0 && isLast && (
        <div className="flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-400">
          <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2} />
          Thinking…
        </div>
      )}
    </div>
  )
}

function ToolRunIndicator({ run }: { run: ToolRun }) {
  const label = formatToolName(run.name)
  return (
    <div className="flex items-center gap-2 text-2xs text-ink-500 font-mono">
      {run.status === 'running' && (
        <Loader2 className="w-3 h-3 animate-spin shrink-0" strokeWidth={2} />
      )}
      {run.status === 'ok' && <Check className="w-3 h-3 text-ink-900 shrink-0" strokeWidth={2} />}
      {run.status === 'error' && (
        <AlertCircle className="w-3 h-3 text-red-600 shrink-0" strokeWidth={2} />
      )}
      <span className="uppercase tracking-widest">{label}</span>
      {run.summary && (
        <span className="text-ink-400 lowercase tracking-normal">· {run.summary}</span>
      )}
      {run.error && <span className="text-red-600 lowercase tracking-normal">· {run.error}</span>}
    </div>
  )
}

function formatToolName(name: string): string {
  return name.replace(/_/g, ' ')
}

function cryptoId(): string {
  // Workers/browsers both have crypto.randomUUID
  try {
    return crypto.randomUUID()
  } catch {
    return Math.random().toString(36).slice(2)
  }
}
