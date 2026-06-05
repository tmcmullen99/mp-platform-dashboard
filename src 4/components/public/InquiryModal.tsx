// P9.13.3 — Listing inquiry modal (public lead capture).
//
// Rendered on the public listing detail page. Collects name/email/phone/message
// and POSTs to the submit_listing_inquiry Edge Function (verify_jwt=false),
// which creates a CRM contact in the listing's tenant, tags it "Website
// Inquiry", and notifies the agent by in-app notification + email.
//
// No auth required — the deal_id is the context, and the function verifies the
// listing is publicly visible before accepting the inquiry.

import { useEffect, useState } from 'react'
import { X as XIcon, Loader2, Check, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function InquiryModal({
  dealId,
  listingName,
  agentName,
  onClose,
}: {
  dealId: string
  listingName: string
  agentName: string | null
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState(`I'm interested in ${listingName}. Please get in touch.`)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, submitting])

  async function handleSubmit() {
    setError(null)
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!email.trim() && !phone.trim()) {
      setError('Please enter an email or phone number.')
      return
    }
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    setSubmitting(true)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        'submit_listing_inquiry',
        {
          body: {
            deal_id: dealId,
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            message: message.trim(),
          },
        },
      )
      if (fnErr) throw fnErr
      if (data && (data as { ok?: boolean }).ok === false) {
        throw new Error((data as { error?: string }).error || 'Something went wrong.')
      }
      setDone(true)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not send your inquiry. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="bg-cream w-full max-w-md border border-ink-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="px-8 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6" strokeWidth={2} />
            </div>
            <h2 className="font-display text-2xl text-ink-900 mb-2">Inquiry sent</h2>
            <p className="text-ink-600 leading-relaxed mb-6">
              Thanks{name.trim() ? `, ${name.trim().split(/\s+/)[0]}` : ''}.{' '}
              {agentName || 'The agent'} will be in touch soon.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-8 py-6 border-b border-ink-200 flex items-start justify-between gap-4">
              <div>
                <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1 inline-flex items-center gap-1.5">
                  <Mail className="w-3 h-3" strokeWidth={1.5} />
                  Inquiry
                </div>
                <h2 className="font-display text-2xl text-ink-900 leading-tight">
                  Request more info
                </h2>
                <p className="text-sm text-ink-600 mt-1.5 leading-relaxed">
                  About {listingName}.
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={submitting}
                className="text-ink-500 hover:text-ink-900 shrink-0 disabled:opacity-50"
                aria-label="Close"
              >
                <XIcon className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Form */}
            <div className="px-8 py-6 space-y-4">
              <Field label="Name" required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(415) 555-0142"
                  className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900"
                />
              </Field>
              <Field label="Message">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-ink-200 text-sm bg-white focus:outline-none focus:border-ink-900 leading-relaxed"
                />
              </Field>
              <p className="text-2xs uppercase tracking-widest text-ink-400">
                Provide an email or phone so we can reach you.
              </p>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-ink-200 flex items-center justify-between gap-3">
              {error ? (
                <div className="text-sm text-red-700 flex-1 min-w-0">{error}</div>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="px-3 py-2 text-2xs uppercase tracking-widest text-ink-600 hover:text-ink-900 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    'Send inquiry'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-2xs uppercase tracking-widest text-ink-500 mb-1.5">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}
