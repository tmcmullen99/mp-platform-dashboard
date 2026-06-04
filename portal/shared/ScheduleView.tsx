// src/portal/shared/ScheduleView.tsx
//
// Shared schedule, reading the schedule_events table (event_type, audience,
// showing_note, starts_at/ends_at). Used by both portals:
//   • seller: read-only (agent creates/edits); shows per-showing notes the
//     agent posts back so the client knows how a tour went.
//   • buyer: same view plus an "add open house to my calendar" affordance.
//
// Calendar push is one-way .ics — each event and the whole list can be
// downloaded and opened in the client's calendar app. No OAuth.
import { useEffect, useState } from 'react'
import { Loader2, CalendarPlus, Download, MapPin, StickyNote } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { PageHeader, SectionLabel, Panel, Badge, EmptyState } from './ui'
import { fmtDate, fmtDateLong } from './format'
import { downloadIcs, IcsEvent, providerLabel } from './calendar'

export type ScheduleEventRow = {
  id: string
  event_type: string
  audience: string
  title: string | null
  location: string | null
  property_address: string | null
  starts_at: string | null
  ends_at: string | null
  all_day: boolean
  description: string | null
  showing_note: string | null
  showing_note_posted_at: string | null
  status: string | null
}

const EVENT_LABELS: Record<string, string> = {
  on_market: 'On market',
  open_house: 'Open house',
  private_showing: 'Private showing',
  offer_day: 'Offer day',
  tour: 'Tour',
  milestone: 'Milestone',
  other: 'Event',
}

function toIcs(ev: ScheduleEventRow): IcsEvent {
  return {
    uid: ev.id,
    title: ev.title || EVENT_LABELS[ev.event_type] || 'Event',
    description: ev.description,
    location: ev.location || ev.property_address,
    start: ev.starts_at || new Date().toISOString(),
    end: ev.ends_at,
    allDay: ev.all_day,
  }
}

export default function ScheduleView({
  audience,
  title,
  intro,
}: {
  audience: 'seller' | 'buyer'
  title: string
  intro: string
}) {
  const { clientProfile, calendarProvider } = useAuth()
  const [events, setEvents] = useState<ScheduleEventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientProfile) return
    let cancelled = false
    supabase
      .from('schedule_events')
      .select(
        'id, event_type, audience, title, location, property_address, starts_at, ends_at, all_day, description, showing_note, showing_note_posted_at, status',
      )
      .eq('client_id', clientProfile.id)
      .in('audience', [audience, 'both'])
      .order('starts_at', { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        if (cancelled) return
        setEvents((data as ScheduleEventRow[]) || [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [clientProfile, audience])

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-ink-500" />

  const now = new Date().toISOString()
  const upcoming = events.filter((e) => !e.starts_at || e.starts_at >= now)
  const past = events.filter((e) => e.starts_at && e.starts_at < now).reverse()

  return (
    <div>
      <PageHeader eyebrow="Schedule" title={title}>
        {intro}
      </PageHeader>

      {events.length > 0 && (
        <div className="mb-8">
          <button
            onClick={() =>
              downloadIcs(events.map(toIcs), 'mcmullen-schedule.ics')
            }
            className="inline-flex items-center gap-2 text-2xs uppercase tracking-widest text-ink-700 hover:text-ink-900 border border-ink-200 hover:border-ink-900 px-4 py-2 transition-colors bg-white"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
            Add all to {providerLabel(calendarProvider)}
          </button>
        </div>
      )}

      <section className="mb-12">
        <SectionLabel>Upcoming{upcoming.length > 0 ? ` · ${upcoming.length}` : ''}</SectionLabel>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title="Nothing scheduled yet"
            body={
              audience === 'seller'
                ? 'Your agent will add market day, open houses, private showings, and offer day here as they’re set.'
                : 'Open houses and tours for the homes you’re interested in will appear here.'
            }
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((ev) => (
              <EventCard key={ev.id} ev={ev} provider={calendarProvider} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <SectionLabel>Past · {past.length}</SectionLabel>
          <div className="space-y-3">
            {past.map((ev) => (
              <EventCard key={ev.id} ev={ev} provider={calendarProvider} past />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function EventCard({
  ev,
  provider,
  past,
}: {
  ev: ScheduleEventRow
  provider: ReturnType<typeof useAuth>['calendarProvider']
  past?: boolean
}) {
  const label = EVENT_LABELS[ev.event_type] || 'Event'
  const tone =
    ev.event_type === 'offer_day'
      ? 'dark'
      : ev.event_type === 'open_house'
      ? 'info'
      : ev.event_type === 'on_market'
      ? 'positive'
      : 'neutral'

  return (
    <Panel className={past ? 'opacity-80' : ''}>
      <div className="flex items-start gap-4">
        <div className="text-center shrink-0 w-14">
          <div className="text-2xs uppercase tracking-widest text-slate">
            {ev.starts_at
              ? new Date(ev.starts_at).toLocaleDateString('en-US', { month: 'short' })
              : '—'}
          </div>
          <div className="font-display text-3xl text-ink-900 leading-none">
            {ev.starts_at ? new Date(ev.starts_at).getDate() : '—'}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge tone={tone as 'dark' | 'info' | 'positive' | 'neutral'}>{label}</Badge>
            {ev.starts_at && (
              <span className="text-xs text-ink-500">
                {fmtDate(ev.starts_at)}
                {!ev.all_day &&
                  ` · ${new Date(ev.starts_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}`}
              </span>
            )}
          </div>
          <div className="text-sm text-ink-900">{ev.title || label}</div>
          {(ev.location || ev.property_address) && (
            <div className="text-xs text-ink-500 mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" strokeWidth={1.5} />
              {ev.location || ev.property_address}
            </div>
          )}
          {ev.description && (
            <p className="text-xs text-ink-600 mt-2 leading-relaxed">{ev.description}</p>
          )}

          {/* Showing note the agent posted back */}
          {ev.showing_note && (
            <div className="mt-3 border-l-2 border-ink-900 pl-3">
              <div className="text-2xs uppercase tracking-widest text-slate mb-1 flex items-center gap-1.5">
                <StickyNote className="w-3 h-3" strokeWidth={1.5} />
                How it went
                {ev.showing_note_posted_at && (
                  <span className="text-ink-400 normal-case tracking-normal">
                    · {fmtDateLong(ev.showing_note_posted_at)}
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-700 leading-relaxed whitespace-pre-wrap">
                {ev.showing_note}
              </p>
            </div>
          )}

          {!past && ev.starts_at && (
            <button
              onClick={() => downloadIcs([toIcs(ev)], `${(ev.title || label).slice(0, 30)}.ics`)}
              className="mt-3 inline-flex items-center gap-1.5 text-2xs uppercase tracking-widest text-slate hover:text-ink-900 transition-colors"
            >
              <CalendarPlus className="w-3 h-3" strokeWidth={1.5} />
              Add to {providerLabel(provider)}
            </button>
          )}
        </div>
      </div>
    </Panel>
  )
}
