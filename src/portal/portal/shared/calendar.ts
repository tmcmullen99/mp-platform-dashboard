// src/portal/shared/calendar.ts
//
// One-way calendar push (Phase 1). We do NOT use OAuth — instead every portal
// schedule event can be exported as a standards-compliant .ics file that the
// client opens once to add to whatever calendar app they actually use
// (Google, Apple, Outlook all consume .ics natively). The client's chosen
// provider is stored on clients.calendar_provider purely so we can tailor the
// download copy ("Add to Google Calendar" vs "Add to Apple Calendar"); the
// generated file is identical either way.
//
// Nothing here touches the network. It's deterministic string-building so it
// works in the browser with no service-role key and no Edge Function.

export type CalendarProvider = 'google' | 'apple' | 'outlook' | 'other' | null

export const CALENDAR_PROVIDERS: { value: Exclude<CalendarProvider, null>; label: string }[] = [
  { value: 'google', label: 'Google Calendar' },
  { value: 'apple', label: 'Apple Calendar' },
  { value: 'outlook', label: 'Outlook' },
  { value: 'other', label: 'Something else' },
]

export function providerLabel(p: CalendarProvider): string {
  return CALENDAR_PROVIDERS.find((x) => x.value === p)?.label ?? 'your calendar'
}

// A single calendar event, decoupled from any DB row shape so both the seller
// schedule (listing events) and buyer schedule (tours / open houses) can feed it.
export type IcsEvent = {
  uid: string // stable id — reuse the DB row id so re-downloads update, not duplicate
  title: string
  description?: string | null
  location?: string | null
  start: string // ISO 8601
  end?: string | null // ISO 8601; if omitted we default to start + 1h
  allDay?: boolean
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

// ICS wants UTC timestamps in the form 20260615T173000Z
function toIcsUtc(iso: string): string {
  const d = new Date(iso)
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

// All-day events use a DATE value (no time, no Z) per RFC 5545
function toIcsDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
}

// RFC 5545 text escaping: backslash, semicolon, comma, newline
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// Long lines must be folded at 75 octets; we fold conservatively at 73 chars
function foldLine(line: string): string {
  if (line.length <= 73) return line
  const chunks: string[] = []
  let rest = line
  chunks.push(rest.slice(0, 73))
  rest = rest.slice(73)
  while (rest.length > 0) {
    chunks.push(' ' + rest.slice(0, 72))
    rest = rest.slice(72)
  }
  return chunks.join('\r\n')
}

function buildVevent(ev: IcsEvent, stamp: string): string[] {
  const lines: string[] = ['BEGIN:VEVENT', `UID:${ev.uid}@mcmullen.properties`, `DTSTAMP:${stamp}`]

  if (ev.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(ev.start)}`)
    const endIso = ev.end || ev.start
    // DTEND for all-day is exclusive; add a day if same date
    const endDate = new Date(endIso)
    if (!ev.end) endDate.setUTCDate(endDate.getUTCDate() + 1)
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(endDate.toISOString())}`)
  } else {
    lines.push(`DTSTART:${toIcsUtc(ev.start)}`)
    const endIso =
      ev.end || new Date(new Date(ev.start).getTime() + 60 * 60 * 1000).toISOString()
    lines.push(`DTEND:${toIcsUtc(endIso)}`)
  }

  lines.push(`SUMMARY:${escapeText(ev.title)}`)
  if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`)
  if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`)
  lines.push('END:VEVENT')
  return lines
}

// Build a full VCALENDAR for one or many events. Returns the raw .ics text.
export function buildIcs(events: IcsEvent[]): string {
  const stamp = toIcsUtc(new Date().toISOString())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//McMullen Properties//Client Portal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  for (const ev of events) lines.push(...buildVevent(ev, stamp))
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n')
}

// Trigger a browser download of an .ics file for the given events.
export function downloadIcs(events: IcsEvent[], filename = 'mcmullen-schedule.ics'): void {
  const ics = buildIcs(events)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
