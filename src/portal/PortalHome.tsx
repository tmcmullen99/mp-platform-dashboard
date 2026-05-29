// src/pages/portal/PortalHome.tsx
//
// Refreshed portal dashboard. Consumes PortalContext (the layout has already
// fetched client_portal_overview, no need to duplicate). Renders the welcome
// block + four stat cards + recent tour requests.

import { useNavigate } from 'react-router-dom'
import { Calendar, MessageSquare, BarChart3, Heart, ArrowRight } from 'lucide-react'
import { usePortal } from '@/components/PortalLayout'

export default function PortalHome() {
  const navigate = useNavigate()
  const { overview, loading, error } = usePortal()

  if (loading && !overview) {
    return <div className="text-ink-500 text-sm">Loading your portal…</div>
  }
  if (error || !overview) {
    return <div className="text-red-600 text-sm">Could not load: {error || 'unknown'}</div>
  }

  const firstName = overview.client.name.split(' ')[0]
  const agentLabel = overview.agent?.name ?? 'your agent'

  return (
    <div>
      {/* Welcome */}
      <div className="mb-10">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Welcome</div>
        <h1 className="font-['Playfair_Display',Georgia,serif] text-5xl text-[#1a1f2e] leading-tight">
          Hi, {firstName}.
        </h1>
        <p className="mt-4 text-[#353535] text-base">
          You're working with{' '}
          <span className="font-medium text-[#1a1f2e]">{agentLabel}</span>. Here's where everything
          stands.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <StatCard
          icon={Calendar}
          label="Tour requests"
          headline={
            overview.counts.tour_requests.confirmed > 0
              ? `${overview.counts.tour_requests.confirmed} confirmed`
              : overview.counts.tour_requests.pending > 0
              ? `${overview.counts.tour_requests.pending} pending`
              : 'None scheduled'
          }
          subline="View full schedule"
          onClick={() => navigate('/portal/schedule')}
        />
        <StatCard
          icon={MessageSquare}
          label="Messages"
          headline={overview.counts.war_rooms > 0 ? 'All caught up' : 'No rooms yet'}
          subline={`${overview.counts.war_rooms} room${
            overview.counts.war_rooms === 1 ? '' : 's'
          } open`}
          onClick={() => navigate('/portal/war-room')}
        />
        <StatCard
          icon={BarChart3}
          label="Market analyses"
          headline={
            overview.counts.cmas > 0
              ? `${overview.counts.cmas} CMA${overview.counts.cmas === 1 ? '' : 's'} ready`
              : 'None yet'
          }
          subline={overview.recent.cmas[0]?.property_address || ''}
          onClick={() => navigate('/portal/cmas')}
        />
        <StatCard
          icon={Heart}
          label="Saved properties"
          headline={`${overview.counts.saved_properties} saved`}
          subline={`${overview.counts.favorites} favorites`}
          onClick={() => navigate('/portal/saved')}
        />
      </div>

      {/* Recent tour requests */}
      {overview.recent.tour_requests.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xs uppercase tracking-widest text-ink-500">
              Your tour requests
            </h2>
            <button
              onClick={() => navigate('/portal/schedule')}
              className="text-xs text-[#1a1f2e] hover:underline flex items-center gap-1"
            >
              See all <ArrowRight size={12} />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {overview.recent.tour_requests.slice(0, 3).map((t: any) => (
              <TourRow key={t.id} tour={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  headline,
  subline,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  headline: string
  subline?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-white border border-[#e8e3d8] rounded-2xl p-6 hover:border-[#91a1ba] transition-colors"
    >
      <Icon size={22} className="text-[#91a1ba] group-hover:text-[#1a1f2e] mb-6" />
      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">{label}</div>
      <div className="font-['Playfair_Display',Georgia,serif] text-2xl text-[#1a1f2e] mb-1">
        {headline}
      </div>
      {subline && <div className="text-sm text-ink-500">{subline}</div>}
    </button>
  )
}

function TourRow({ tour }: { tour: any }) {
  const dateLabel = tour.scheduled_at
    ? new Date(tour.scheduled_at).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : tour.preferred_date
    ? `${tour.preferred_date}${tour.preferred_time ? ' · ' + tour.preferred_time : ''}`
    : 'TBD'

  const statusClasses =
    tour.status === 'confirmed'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : tour.status === 'cancelled'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-cream text-[#1a1f2e] border-[#e8e3d8]'

  return (
    <div className="bg-white border border-[#e8e3d8] rounded-xl p-4 flex items-center gap-4">
      {tour.property_photo_url ? (
        <img
          src={tour.property_photo_url}
          alt=""
          className="w-16 h-16 rounded-lg object-cover bg-cream"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-cream" />
      )}
      <div className="flex-1">
        <div className="font-medium text-[#1a1f2e]">{tour.property_address}</div>
        <div className="text-sm text-ink-500 mt-1 flex items-center gap-2">
          <Calendar size={14} />
          {dateLabel}
        </div>
      </div>
      <div
        className={`text-2xs tracking-widest uppercase px-2 py-1 rounded border ${statusClasses}`}
      >
        {(tour.status || '').toUpperCase()}
      </div>
    </div>
  )
}
