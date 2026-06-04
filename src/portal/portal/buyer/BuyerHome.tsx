// src/portal/buyer/BuyerHome.tsx
//
// Buyer home — heavily buyer-focused: upcoming tours/open houses and the top
// of the interested-properties list. Data paths: schedule_events (buyer),
// client_external_listings, unchanged.
import { useEffect, useState } from 'react'
import { Loader2, Heart, Calendar, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, ExternalListing } from '@/lib/supabase'
import { PageHeader, SectionLabel, ImageCard, Badge, StatTile, EmptyState } from '@/portal/shared/ui'
import { usd, fmtDate } from '@/portal/shared/format'

type EventLite = {
  id: string
  event_type: string
  title: string | null
  property_address: string | null
  starts_at: string | null
}

export default function BuyerHome() {
  const { clientProfile, currentBranding } = useAuth()
  const [listings, setListings] = useState<ExternalListing[]>([])
  const [events, setEvents] = useState<EventLite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientProfile) return
    let cancelled = false
    const cid = clientProfile.id
    ;(async () => {
      const now = new Date().toISOString()
      const [lResp, eResp] = await Promise.all([
        supabase
          .from('client_external_listings')
          .select('*')
          .eq('client_id', cid)
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('schedule_events')
          .select('id, event_type, title, property_address, starts_at')
          .eq('client_id', cid)
          .in('audience', ['buyer', 'both'])
          .gte('starts_at', now)
          .order('starts_at', { ascending: true })
          .limit(4),
      ])
      if (cancelled) return
      setListings((lResp.data as ExternalListing[]) || [])
      setEvents((eResp.data as EventLite[]) || [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [clientProfile])

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-ink-500" />

  const firstName = (clientProfile?.name || 'there').split(' ')[0]
  const agentName = currentBranding?.agent_name || 'your agent'
  const top = listings.slice(0, 4)

  return (
    <div>
      <PageHeader eyebrow={`Welcome, ${firstName}`} title="Let's find your home.">
        Your tours, the homes you're tracking, and what's next — all in one place. You're working
        with <span className="text-ink-900">{agentName}</span>.
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
        <StatTile
          to="/portal/interested"
          icon={Heart}
          label="Interested properties"
          primary={listings.length === 0 ? 'None yet' : `${listings.length} tracked`}
          secondary={listings.length === 0 ? 'Paste any Zillow link to start.' : 'Rank & compare'}
        />
        <StatTile
          to="/portal/schedule"
          icon={Calendar}
          label="Upcoming"
          primary={events.length === 0 ? 'Nothing scheduled' : `${events.length} coming up`}
          secondary={events.length === 0 ? 'Tours will appear here.' : 'View your schedule'}
        />
      </div>

      {events.length > 0 && (
        <section className="mb-12">
          <SectionLabel>Next up</SectionLabel>
          <div className="space-y-3">
            {events.map((ev) => (
              <Link
                key={ev.id}
                to="/portal/schedule"
                className="flex items-center gap-4 bg-white border border-ink-200 hover:border-ink-400 p-4 transition-colors"
              >
                <div className="text-center w-12 shrink-0">
                  <div className="text-2xs uppercase tracking-widest text-slate">
                    {ev.starts_at
                      ? new Date(ev.starts_at).toLocaleDateString('en-US', { month: 'short' })
                      : '—'}
                  </div>
                  <div className="font-display text-2xl text-ink-900 leading-none">
                    {ev.starts_at ? new Date(ev.starts_at).getDate() : '—'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink-900 truncate">
                    {ev.title || ev.property_address || 'Tour'}
                  </div>
                  <div className="text-xs text-ink-500">{ev.starts_at ? fmtDate(ev.starts_at) : ''}</div>
                </div>
                <Badge tone={ev.event_type === 'open_house' ? 'info' : 'neutral'}>
                  {ev.event_type.replace('_', ' ')}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionLabel>Your shortlist</SectionLabel>
        {top.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No properties yet"
            body="Found something on Zillow you like? Paste the link in Interested Properties and we'll pull in the details automatically."
            action={
              <Link
                to="/portal/interested"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink-900 text-cream text-sm hover:bg-ink-700 transition-colors"
              >
                <Heart className="w-3.5 h-3.5" />
                Add a property
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {top.map((l) => (
              <ImageCard
                key={l.id}
                to={`/portal/property/${l.id}`}
                image={l.photo_url}
                imageAlt={l.address || ''}
                badge={l.is_favorite ? <Badge tone="dark">Favorite</Badge> : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-display text-lg text-ink-900 leading-tight truncate">
                      {l.address || 'Property'}
                    </div>
                    <div className="text-sm text-ink-600 mt-1">
                      {usd(l.price)}
                      {l.bedrooms ? ` · ${l.bedrooms} bd` : ''}
                      {l.bathrooms ? ` · ${l.bathrooms} ba` : ''}
                    </div>
                  </div>
                  <ArrowUpRight
                    className="w-4 h-4 text-ink-400 group-hover:text-ink-900 shrink-0 mt-1"
                    strokeWidth={1.5}
                  />
                </div>
              </ImageCard>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
