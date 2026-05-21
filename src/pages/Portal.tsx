// P8.2 + P9.1 + P9.2 + P9.4 + P9.7 — Client-facing portal. Only renders when useAuth().isClient is true.
// Routes: /portal (home), /portal/listing, /portal/cmas, /portal/cmas/:slug,
// /portal/saved, /portal/war-room, /portal/documents
import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, Link } from 'react-router-dom'
import {
  Home,
  MessageSquare,
  FileText,
  LayoutDashboard,
  LogOut,
  Loader2,
  DollarSign,
  Calendar,
  FileBarChart2,
  Heart,
  ArrowUpRight,
  MapPin,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  supabase,
  EDGE_FUNCTIONS_BASE_URL,
  Deal,
  WarRoom,
  CMA,
  SERVICE_PACKAGES,
} from '@/lib/supabase'
import WarRoomThread from '@/components/WarRoomThread'
import DocumentManager from '@/components/DocumentManager'
import ListingEditor from '@/components/ListingEditor'
import NotificationBell from '@/components/NotificationBell'
import CMAViewer from '@/components/CMAViewer'
import SavedPropertiesTab from '@/components/SavedPropertiesTab'

type ComingSoonListing = {
  id: string
  slug: string
  name: string
  subtitle: string | null
  neighborhood: string | null
  property_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  area_sqft: number | null
  price_estimate: string | null
  expected_list_date: string | null
  description_html: string | null
  hero_image_url: string | null
  gallery_urls: unknown
}

// Local subset type for the portal home — full tour_requests row not needed here
type PortalTourRequest = {
  id: string
  external_listing_id: string | null
  property_address: string | null
  property_photo_url: string | null
  preferred_date: string | null
  preferred_time: string | null
  alternate_date: string | null
  alternate_time: string | null
  status: 'requested' | 'confirmed' | 'rescheduled' | 'toured' | 'cancelled'
  created_at: string
}

export default function Portal() {
  return (
    <PortalLayout>
      <Routes>
        <Route index element={<PortalHome />} />
        <Route path="listing" element={<PortalListing />} />
        <Route path="cmas" element={<PortalCMAs />} />
        <Route path="cmas/:slug" element={<CMAViewer embedded />} />
        <Route path="saved" element={<PortalSaved />} />
        <Route path="schedule" element={<PortalSchedule />} />
        <Route path="war-room" element={<PortalWarRoom />} />
        <Route path="documents" element={<PortalDocuments />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </PortalLayout>
  )
}

function PortalLayout({ children }: { children: React.ReactNode }) {
  const { clientProfile, currentBranding, signOut } = useAuth()
  const brokerage = currentBranding?.brokerage_affiliation || 'McMullen Properties'

  return (
    <div className="min-h-screen bg-cream">
      {/* Top bar */}
      <header className="border-b border-ink-200 bg-cream">
        <div className="max-w-5xl mx-auto px-8 py-5 flex items-center justify-between">
          <Link to="/portal" className="block">
            <div className="font-display text-xl text-ink-900 leading-tight">{brokerage}</div>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mt-1">Client portal</div>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <NotificationBell />
            <span className="text-ink-600 hidden sm:inline">{clientProfile?.name}</span>
            <button
              onClick={signOut}
              className="text-ink-500 hover:text-ink-900 flex items-center gap-1.5"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-2xs uppercase tracking-widest">Sign out</span>
            </button>
          </div>
        </div>
        {/* Nav */}
        <nav className="max-w-5xl mx-auto px-8 flex gap-1">
          <PortalNavLink to="/portal" exact icon={LayoutDashboard} label="Home" />
          <PortalNavLink to="/portal/listing" icon={Home} label="My listing" />
          <PortalNavLink to="/portal/cmas" icon={FileBarChart2} label="CMAs" />
          <PortalNavLink to="/portal/saved" icon={Heart} label="Saved" />
          <PortalNavLink to="/portal/schedule" icon={Calendar} label="Schedule" />
          <PortalNavLink to="/portal/war-room" icon={MessageSquare} label="War room" />
          <PortalNavLink to="/portal/documents" icon={FileText} label="Documents" />
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12">{children}</main>
    </div>
  )
}

function PortalNavLink({
  to,
  exact,
  icon: Icon,
  label,
}: {
  to: string
  exact?: boolean
  icon: LucideIcon
  label: string
}) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px transition-colors ${
          isActive
            ? 'border-ink-900 text-ink-900'
            : 'border-transparent text-ink-500 hover:text-ink-900'
        }`
      }
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
      {label}
    </NavLink>
  )
}

// ===========================================================================
// Portal Home — P9.7 rebuild
// ===========================================================================
function PortalHome() {
  const { clientProfile, currentBranding } = useAuth()
  const [deals, setDeals] = useState<Deal[]>([])
  const [warRooms, setWarRooms] = useState<WarRoom[]>([])
  const [tourRequests, setTourRequests] = useState<PortalTourRequest[]>([])
  const [recentCMAs, setRecentCMAs] = useState<CMA[]>([])
  const [savedCount, setSavedCount] = useState<number>(0)
  const [favoritesCount, setFavoritesCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientProfile) return
    let cancelled = false
    const cid = clientProfile.id
    setLoading(true)

    Promise.all([
      supabase
        .from('deals')
        .select('*')
        .eq('client_id', cid)
        .order('created_at', { ascending: false }),
      supabase
        .from('war_rooms')
        .select('*')
        .eq('client_id', cid)
        .order('last_message_at', { ascending: false, nullsFirst: false }),
      supabase
        .from('tour_requests')
        .select(
          'id, external_listing_id, property_address, property_photo_url, preferred_date, preferred_time, alternate_date, alternate_time, status, created_at',
        )
        .eq('client_id', cid)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('cmas')
        .select('*')
        .eq('client_id', cid)
        .eq('status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(3),
      supabase
        .from('client_external_listings')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', cid),
      supabase
        .from('client_external_listings')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', cid)
        .eq('is_favorite', true),
    ]).then(([dResp, wResp, tResp, cResp, sResp, fResp]) => {
      if (cancelled) return
      setDeals((dResp.data || []) as Deal[])
      setWarRooms((wResp.data || []) as WarRoom[])
      setTourRequests((tResp.data || []) as PortalTourRequest[])
      setRecentCMAs((cResp.data || []) as CMA[])
      setSavedCount(sResp.count ?? 0)
      setFavoritesCount(fResp.count ?? 0)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [clientProfile])

  if (!clientProfile) return <p className="text-ink-600">Loading…</p>

  const firstName = clientProfile.name.split(' ')[0]
  const agentName = currentBranding?.agent_name || 'your agent'
  const totalUnread = warRooms.reduce((sum, wr) => sum + (wr.unread_client || 0), 0)
  const pendingTourCount = tourRequests.filter(
    (t) => t.status === 'requested' || t.status === 'rescheduled',
  ).length
  const confirmedTourCount = tourRequests.filter((t) => t.status === 'confirmed').length
  const sellDeal = deals.find((d) => d.deal_type === 'sell')

  return (
    <div>
      {/* Hero */}
      <div className="mb-12">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Welcome</div>
        <h1 className="font-display text-4xl text-ink-900 leading-tight mb-3">
          Hi, {firstName}.
        </h1>
        <p className="text-ink-600 max-w-2xl leading-relaxed">
          {loading ? (
            'Loading your portal…'
          ) : (
            <>
              You’re working with <span className="text-ink-900">{agentName}</span>. Here’s
              where everything stands.
            </>
          )}
        </p>
      </div>

      {/* Status grid: 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
        <StatusCard
          to="/portal/schedule"
          icon={Calendar}
          label="Tour requests"
          primary={
            tourRequests.length === 0
              ? 'None yet'
              : pendingTourCount > 0
              ? `${pendingTourCount} pending`
              : confirmedTourCount > 0
              ? `${confirmedTourCount} confirmed`
              : `${tourRequests.length} recent`
          }
          secondary={
            tourRequests.length === 0
              ? 'Find a Zillow listing you like and request a tour.'
              : confirmedTourCount > 0 && pendingTourCount > 0
              ? `${confirmedTourCount} confirmed · view schedule`
              : pendingTourCount > 0
              ? 'Your agent will respond soon.'
              : 'View full schedule'
          }
        />

        <StatusCard
          to="/portal/war-room"
          icon={MessageSquare}
          label="Messages"
          primary={
            totalUnread > 0
              ? `${totalUnread} new from agent`
              : warRooms.length === 0
              ? 'No conversations yet'
              : 'All caught up'
          }
          secondary={
            warRooms.length === 0
              ? 'Your agent will open one shortly.'
              : totalUnread > 0
              ? 'Open thread'
              : `${warRooms.length} ${warRooms.length === 1 ? 'room' : 'rooms'} open`
          }
          badge={totalUnread > 0 ? totalUnread : undefined}
        />

        <StatusCard
          to="/portal/cmas"
          icon={FileBarChart2}
          label="Market analyses"
          primary={
            recentCMAs.length === 0
              ? 'None yet'
              : `${recentCMAs.length} ${recentCMAs.length === 1 ? 'CMA' : 'CMAs'} ready`
          }
          secondary={
            recentCMAs.length === 0
              ? 'Pricing analyses will appear here.'
              : recentCMAs[0]?.property_address || recentCMAs[0]?.name || 'Open list'
          }
        />

        <StatusCard
          to="/portal/saved"
          icon={Heart}
          label="Saved properties"
          primary={
            savedCount === 0
              ? 'None yet'
              : `${savedCount} saved`
          }
          secondary={
            savedCount === 0
              ? 'Paste any Zillow link to start.'
              : favoritesCount > 0
              ? `${favoritesCount} favorite${favoritesCount === 1 ? '' : 's'}`
              : 'See full list'
          }
        />
      </div>

      {/* Tour request detail strip — only if any */}
      {!loading && tourRequests.length > 0 && (
        <section className="mb-12">
          <PortalSectionLabel>Your tour requests</PortalSectionLabel>
          <ul className="border border-ink-200 divide-y divide-ink-100 bg-white">
            {tourRequests.map((t) => (
              <li key={t.id} className="flex items-start gap-4 p-5">
                {t.property_photo_url ? (
                  <img
                    src={t.property_photo_url}
                    alt=""
                    className="w-16 h-16 object-cover border border-ink-200 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 bg-ink-100 border border-ink-200 shrink-0 flex items-center justify-center">
                    <Home className="w-5 h-5 text-ink-400" strokeWidth={1.5} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink-900 truncate">
                    {t.property_address || 'Property'}
                  </div>
                  <div className="text-xs text-ink-500 mt-1 flex items-center gap-2 flex-wrap">
                    {t.preferred_date && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" strokeWidth={1.5} />
                        {formatPortalDate(t.preferred_date)}
                        {t.preferred_time ? ` · ${t.preferred_time}` : ''}
                      </span>
                    )}
                    {t.preferred_date && <span className="text-ink-300">·</span>}
                    <span>requested {portalTimeAgo(t.created_at)}</span>
                  </div>
                </div>
                <TourStatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* My listing card — only if has a sell deal */}
      {sellDeal && (
        <Link
          to="/portal/listing"
          className="block border border-ink-200 hover:border-ink-400 p-6 transition-colors mb-12"
        >
          <Home className="w-5 h-5 text-ink-500 mb-3" strokeWidth={1.5} />
          <h2 className="font-display text-xl text-ink-900 mb-2">My listing</h2>
          <p className="text-sm text-ink-600 mb-3">
            {sellDeal.title || 'Your active engagement'}
          </p>
          <div className="text-2xs uppercase tracking-widest text-ink-500 flex items-center gap-3">
            <span>
              {SERVICE_PACKAGES.find((p) => p.value === sellDeal.service_package)?.label ||
                'Service package'}
            </span>
            {sellDeal.estimated_value && (
              <>
                <span className="text-ink-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {sellDeal.estimated_value.toLocaleString()}
                </span>
              </>
            )}
          </div>
        </Link>
      )}

      <ServicePackagesEducation />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Portal Home helper components
// ---------------------------------------------------------------------------

function PortalSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="text-2xs uppercase tracking-widest text-ink-500">{children}</div>
      <div className="flex-1 h-px bg-ink-200" />
    </div>
  )
}

function StatusCard({
  to,
  icon: Icon,
  label,
  primary,
  secondary,
  badge,
}: {
  to: string
  icon: LucideIcon
  label: string
  primary: string
  secondary: string
  badge?: number
}) {
  return (
    <Link
      to={to}
      className="block border border-ink-200 hover:border-ink-400 p-6 transition-colors group bg-white"
    >
      <div className="flex items-start justify-between mb-4">
        <Icon
          className="w-5 h-5 text-ink-500 group-hover:text-ink-900 transition-colors"
          strokeWidth={1.5}
        />
        {badge != null && badge > 0 && (
          <span className="text-2xs font-mono bg-ink-900 text-cream px-1.5 py-0.5 tabular-nums">
            {badge}
          </span>
        )}
      </div>
      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">{label}</div>
      <div className="font-display text-xl text-ink-900 mb-1.5 leading-tight">{primary}</div>
      <div className="text-xs text-ink-500 truncate">{secondary}</div>
    </Link>
  )
}

function TourStatusBadge({ status }: { status: PortalTourRequest['status'] }) {
  const styles: Record<PortalTourRequest['status'], string> = {
    requested: 'bg-amber-50 text-amber-700',
    confirmed: 'bg-emerald-50 text-emerald-700',
    rescheduled: 'bg-blue-50 text-blue-700',
    toured: 'bg-ink-100 text-ink-700',
    cancelled: 'bg-red-50 text-red-700',
  }
  return (
    <span
      className={`text-2xs uppercase tracking-widest px-2 py-1 shrink-0 ${styles[status]}`}
    >
      {status}
    </span>
  )
}

function formatPortalDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function portalTimeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (isNaN(then)) return iso
  const diff = Date.now() - then
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  const days = Math.floor(diff / 86_400_000)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ServicePackagesEducation() {
  // Education section — comparison of the three main packages
  const featured = SERVICE_PACKAGES.filter((p) =>
    ['make_me_move', 'coming_soon', 'active_listing'].includes(p.value),
  )

  return (
    <section className="mt-20 pt-12 border-t border-ink-200">
      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
        Understand your options
      </div>
      <h2 className="font-display text-2xl text-ink-900 mb-2">
        Three ways we can take your home to market.
      </h2>
      <p className="text-ink-600 mb-8 max-w-2xl">
        Each package balances marketing investment against speed and certainty differently. Talk
        through any of these with your agent in the war room.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {featured.map((pkg) => (
          <div key={pkg.value} className="border border-ink-200 p-5">
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">
              {pkg.label}
            </div>
            <p className="text-sm text-ink-700 leading-relaxed">{pkg.blurb}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ===========================================================================
// Portal Listing
// ===========================================================================
function PortalListing() {
  const { clientProfile } = useAuth()
  const [deals, setDeals] = useState<Deal[]>([])
  const [listings, setListings] = useState<Map<string, ComingSoonListing>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientProfile) return
    let cancelled = false
    async function load() {
      const { data: dData } = await supabase
        .from('deals')
        .select('*')
        .eq('client_id', clientProfile!.id)
      const dealsList = (dData as Deal[]) || []
      const listingIds = dealsList.map((d) => d.coming_soon_listing_id).filter(Boolean) as string[]
      const map = new Map<string, ComingSoonListing>()
      if (listingIds.length > 0) {
        const { data: lData } = await supabase
          .from('coming_soon_listings')
          .select('*')
          .in('id', listingIds)
        for (const l of (lData as ComingSoonListing[]) || []) {
          map.set(l.id, l)
        }
      }
      if (cancelled) return
      setDeals(dealsList)
      setListings(map)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [clientProfile])

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-ink-500" />
  if (deals.length === 0) {
    return <p className="text-ink-600">No active engagement yet.</p>
  }

  return (
    <div className="space-y-12">
      {deals.map((deal) => {
        const listing = deal.coming_soon_listing_id
          ? listings.get(deal.coming_soon_listing_id)
          : null
        const pkg = SERVICE_PACKAGES.find((p) => p.value === deal.service_package)
        return (
          <article key={deal.id}>
            <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">
              {deal.deal_type === 'sell' ? 'Selling' : deal.deal_type}
            </div>
            <h1 className="font-display text-3xl text-ink-900 leading-tight">{deal.title}</h1>
            {listing?.subtitle && (
              <p className="text-ink-600 mt-2">{listing.subtitle}</p>
            )}

            <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 mt-8 pb-8 border-b border-ink-200">
              <Stat
                label="List price"
                value={
                  deal.estimated_value ? `$${deal.estimated_value.toLocaleString()}` : '—'
                }
              />
              <Stat label="Package" value={pkg?.label || '—'} />
              <Stat label="Stage" value={deal.stage} />
              <Stat
                label="Going live"
                value={
                  listing?.expected_list_date
                    ? new Date(listing.expected_list_date).toLocaleDateString()
                    : 'TBD'
                }
              />
            </dl>

            {pkg && (
              <section className="mt-8">
                <h3 className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
                  What "{pkg.label}" means for you
                </h3>
                <p className="text-sm text-ink-700 leading-relaxed max-w-3xl">{pkg.blurb}</p>
              </section>
            )}

            {deal.notes && (
              <section className="mt-8">
                <h3 className="text-2xs uppercase tracking-widest text-ink-500 mb-3">
                  Agent notes
                </h3>
                <p className="text-sm text-ink-700 whitespace-pre-wrap leading-relaxed max-w-3xl">
                  {deal.notes}
                </p>
              </section>
            )}

            <ListingEditor deal={deal} />
          </article>
        )
      })}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-widest text-ink-500 mb-1">{label}</dt>
      <dd className="text-sm text-ink-900">{value}</dd>
    </div>
  )
}

// ===========================================================================
// Portal War Room
// ===========================================================================
function PortalWarRoom() {
  const { clientProfile } = useAuth()
  const [warRooms, setWarRooms] = useState<WarRoom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientProfile) return
    const cid = clientProfile.id
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('war_rooms')
        .select('*')
        .eq('client_id', cid)
      if (cancelled) return
      setWarRooms((data as WarRoom[]) || [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [clientProfile])

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-ink-500" />
  if (warRooms.length === 0) {
    return <p className="text-ink-600">No war rooms yet. Your agent will open one shortly.</p>
  }

  return (
    <div>
      <div className="mb-8">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">War room</div>
        <h1 className="font-display text-3xl text-ink-900 leading-tight">
          Talk to your agent.
        </h1>
        <p className="text-ink-600 mt-2 max-w-2xl">
          Messages here are private between you and your agent. Both of you get email notifications
          on new messages.
        </p>
      </div>
      <div className="space-y-8">
        {warRooms.map((wr) => (
          <WarRoomThread key={wr.id} warRoom={wr} viewerType="client" />
        ))}
      </div>
    </div>
  )
}

// ===========================================================================
// Portal Documents
// ===========================================================================
function PortalDocuments() {
  const { clientProfile } = useAuth()
  if (!clientProfile) return null

  return (
    <div>
      <div className="mb-8">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">Documents</div>
        <h1 className="font-display text-3xl text-ink-900 leading-tight mb-3">
          Shared documents.
        </h1>
        <p className="text-ink-600 max-w-2xl mb-2">
          Listing agreements, disclosures, CMAs, inspection results — everything you and your agent
          have shared. Upload anything you want your agent to have a copy of.
        </p>
      </div>
      <DocumentManager
        tenantId={clientProfile.tenant_id}
        clientId={clientProfile.id}
        uploaderType="client"
      />
    </div>
  )
}

// ===========================================================================
// Portal CMAs — list view (P9.1)
// ===========================================================================
function PortalCMAs() {
  const { clientProfile } = useAuth()
  const [cmas, setCmas] = useState<CMA[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientProfile) return
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('cmas')
        .select('*')
        .eq('client_id', clientProfile!.id)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
      if (cancelled) return
      setCmas((data as CMA[]) || [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [clientProfile])

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-ink-500" />

  return (
    <div>
      <div className="mb-8">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">CMAs</div>
        <h1 className="font-display text-3xl text-ink-900 leading-tight mb-3">
          Comparative market analyses.
        </h1>
        <p className="text-ink-600 max-w-2xl">
          Side-by-side pricing analyses your agent has put together — recent sales, market context,
          and pricing rationale. Click any CMA to view the full breakdown.
        </p>
      </div>

      {cmas.length === 0 ? (
        <div className="border border-ink-200 p-12 text-center bg-cream">
          <FileBarChart2 className="w-8 h-8 text-ink-300 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-ink-600">
            No CMAs yet. Your agent will share market analyses here when ready.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cmas.map((cma) => (
            <Link
              key={cma.id}
              to={`/portal/cmas/${cma.slug}`}
              className="block border border-ink-200 hover:border-ink-400 p-5 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
                    CMA
                    {cma.published_at && (
                      <span className="ml-3">
                        {new Date(cma.published_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-xl text-ink-900 leading-tight">
                    {cma.property_address || cma.name}
                  </h2>
                  {cma.list_price && (
                    <div className="text-sm text-ink-600 mt-1">{cma.list_price}</div>
                  )}
                </div>
                <FileBarChart2 className="w-5 h-5 text-ink-400 mt-1" strokeWidth={1.5} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// Portal Saved Properties — P9.2
// ===========================================================================
function PortalSaved() {
  const { clientProfile } = useAuth()
  if (!clientProfile) return <Loader2 className="w-5 h-5 animate-spin text-ink-500" />

  return (
    <div>
      <div className="mb-8">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">Saved properties</div>
        <h1 className="font-display text-3xl text-ink-900 leading-tight mb-3">
          Properties you're tracking.
        </h1>
        <p className="text-ink-600 max-w-2xl">
          Paste Zillow, Redfin, or Realtor.com links here. Each becomes a card you can sort by
          price, $/sqft, HOA, outdoor space, or parking. Favorite the ones you like — your agent
          sees the same list and can react in the war room.
        </p>
      </div>
      <SavedPropertiesTab
        clientId={clientProfile.id}
        tenantId={clientProfile.tenant_id}
        viewerType="client"
      />
    </div>
  )
}

// ===========================================================================
// Portal Schedule — P9.5 (upcoming + past tour requests)
// ===========================================================================

type ProposedAlternate = {
  date: string
  time: string | null
}

type ScheduleTourRow = {
  id: string
  tenant_id: string
  external_listing_id: string | null
  war_room_id: string | null
  property_address: string | null
  property_photo_url: string | null
  property_price: number | null
  property_url: string | null
  preferred_date: string | null
  preferred_time: string | null
  alternate_date: string | null
  alternate_time: string | null
  scheduled_at: string | null
  notes: string | null
  agent_response: string | null
  proposed_alternates: ProposedAlternate[] | null
  status: 'requested' | 'confirmed' | 'rescheduled' | 'toured' | 'cancelled'
  created_at: string
}

function PortalSchedule() {
  const { clientProfile, session } = useAuth()
  const [tours, setTours] = useState<ScheduleTourRow[]>([])
  const [loading, setLoading] = useState(true)

  async function loadTours(cid: string) {
    const { data } = await supabase
      .from('tour_requests')
      .select(
        'id, tenant_id, external_listing_id, war_room_id, property_address, property_photo_url, property_price, property_url, preferred_date, preferred_time, alternate_date, alternate_time, scheduled_at, notes, agent_response, proposed_alternates, status, created_at',
      )
      .eq('client_id', cid)
      .order('preferred_date', { ascending: true, nullsFirst: false })
    setTours((data as ScheduleTourRow[]) || [])
  }

  useEffect(() => {
    if (!clientProfile) return
    let cancelled = false
    const cid = clientProfile.id
    setLoading(true)
    loadTours(cid).then(() => {
      if (cancelled) return
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [clientProfile])

  if (!clientProfile) return <Loader2 className="w-5 h-5 animate-spin text-ink-500" />

  const today = new Date().toISOString().slice(0, 10)
  const isPast = (t: ScheduleTourRow) =>
    t.status === 'toured' ||
    t.status === 'cancelled' ||
    (t.preferred_date != null && t.preferred_date < today)

  const upcoming = tours
    .filter((t) => !isPast(t))
    .sort((a, b) => (a.preferred_date || '').localeCompare(b.preferred_date || ''))
  const past = tours
    .filter(isPast)
    .sort((a, b) => (b.preferred_date || '').localeCompare(a.preferred_date || ''))

  return (
    <div>
      <div className="mb-10">
        <div className="text-2xs uppercase tracking-widest text-ink-500 mb-2">Schedule</div>
        <h1 className="font-display text-3xl text-ink-900 leading-tight mb-3">
          Your tour schedule.
        </h1>
        <p className="text-ink-600 max-w-2xl">
          Every tour you’ve requested, confirmed, or completed. Tour requests need at least 24 hours
          notice — your agent confirms the time or proposes an alternate based on listing-agent
          access.
        </p>
      </div>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-ink-500" />
      ) : (
        <>
          {/* Upcoming */}
          <section className="mb-12">
            <PortalSectionLabel>
              Upcoming{upcoming.length > 0 ? ` · ${upcoming.length}` : ''}
            </PortalSectionLabel>
            {upcoming.length === 0 ? (
              <div className="border border-ink-200 p-8 text-center bg-cream">
                <Calendar
                  className="w-8 h-8 text-ink-300 mx-auto mb-3"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-ink-600 mb-4 max-w-md mx-auto">
                  No upcoming tours yet. Saved a property you’d like to see? Request a tour from
                  the Saved tab.
                </p>
                <Link
                  to="/portal/saved"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream text-2xs uppercase tracking-widest hover:bg-ink-700"
                >
                  <Heart className="w-3.5 h-3.5" />
                  Go to saved properties
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((t) => (
                  <ScheduleTourCard
                    key={t.id}
                    tour={t}
                    mode="upcoming"
                    accessToken={session?.access_token || ''}
                    onAccepted={() => {
                      if (clientProfile) loadTours(clientProfile.id)
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Past */}
          {past.length > 0 && (
            <section className="mb-12">
              <PortalSectionLabel>Past · {past.length}</PortalSectionLabel>
              <div className="space-y-3">
                {past.map((t) => (
                  <ScheduleTourCard
                    key={t.id}
                    tour={t}
                    mode="past"
                    accessToken={session?.access_token || ''}
                    onAccepted={() => {}}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function ScheduleTourCard({
  tour,
  mode,
  accessToken,
  onAccepted,
}: {
  tour: ScheduleTourRow
  mode: 'upcoming' | 'past'
  accessToken: string
  onAccepted: () => void
}) {
  const isPast = mode === 'past'
  const proposedAlternates: ProposedAlternate[] = Array.isArray(tour.proposed_alternates)
    ? tour.proposed_alternates
    : []
  const showProposed =
    !isPast && tour.status === 'rescheduled' && proposedAlternates.length > 0
  const showAlternate =
    !isPast &&
    tour.alternate_date &&
    tour.status !== 'confirmed' &&
    tour.status !== 'toured' &&
    !showProposed
  // If agent set a different scheduled_at than the preferred slot, surface it
  const scheduledOverridesPreferred =
    tour.scheduled_at &&
    tour.preferred_date &&
    new Date(tour.scheduled_at).toISOString().slice(0, 10) !== tour.preferred_date

  const [acceptingIdx, setAcceptingIdx] = useState<number | null>(null)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  async function handleAcceptAlternate(idx: number, slot: ProposedAlternate) {
    if (!accessToken) {
      setAcceptError('Not signed in.')
      return
    }
    setAcceptError(null)
    setAcceptingIdx(idx)
    try {
      const scheduledAt = combinePortalDateTimeToISO(slot.date, slot.time)
      // 1. Update tour_requests
      const { error: updateError } = await supabase
        .from('tour_requests')
        .update({
          status: 'confirmed',
          scheduled_at: scheduledAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tour.id)
      if (updateError) throw updateError

      // 2. Post war room system message
      if (tour.war_room_id) {
        const label = formatPortalDate(slot.date) + (slot.time ? ` at ${slot.time}` : '')
        const { data: msg, error: msgErr } = await supabase
          .from('war_room_messages')
          .insert({
            tenant_id: tour.tenant_id,
            war_room_id: tour.war_room_id,
            sender_type: 'system',
            body: `Tour confirmed for ${tour.property_address || 'the property'} on ${label}.`,
            metadata: {
              type: 'tour_status_change',
              tour_request_id: tour.id,
              new_status: 'confirmed',
              accepted_alternate: slot,
            },
          })
          .select('id')
          .single()
        if (!msgErr && msg) {
          // Notify the agent via existing edge function
          fetch(`${EDGE_FUNCTIONS_BASE_URL}/notify_war_room_message`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message_id: msg.id }),
          }).catch(() => {})
        }
      }

      // P9.8: bell notification for the agent(s) of this tenant
      try {
        const { data: adminIds } = await supabase.rpc('get_tenant_admin_user_ids', {
          p_tenant_id: tour.tenant_id,
        })
        const ids = (adminIds || []) as string[]
        if (ids.length > 0) {
          const slotLabel =
            formatPortalDate(slot.date) + (slot.time ? ` at ${slot.time}` : '')
          await supabase.from('notifications').insert(
            ids.map((adminId) => ({
              tenant_id: tour.tenant_id,
              recipient_type: 'agent' as const,
              recipient_id: adminId,
              notification_type: 'tour_confirmed_by_client',
              title: `Tour confirmed: ${tour.property_address || 'property'}`,
              body: `Client accepted ${slotLabel} for the tour.`,
              link_url: '/schedule',
            })),
          )
        }
      } catch {
        // Non-fatal — email path already fired above
      }

      onAccepted()
    } catch (e) {
      setAcceptError(e instanceof Error ? e.message : String(e))
    } finally {
      setAcceptingIdx(null)
    }
  }

  return (
    <article
      className={`border border-ink-200 bg-white p-5 ${
        isPast ? 'opacity-80' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        {tour.property_photo_url ? (
          <img
            src={tour.property_photo_url}
            alt=""
            className="w-20 h-20 object-cover border border-ink-200 shrink-0"
          />
        ) : (
          <div className="w-20 h-20 bg-ink-100 border border-ink-200 shrink-0 flex items-center justify-center">
            <Home className="w-6 h-6 text-ink-400" strokeWidth={1.5} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              {tour.property_url ? (
                <a
                  href={tour.property_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-ink-900 hover:underline flex items-start gap-1"
                >
                  <MapPin className="w-3.5 h-3.5 mt-1 text-ink-400 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{tour.property_address || 'Property'}</span>
                </a>
              ) : (
                <div className="font-medium text-ink-900 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 mt-1 text-ink-400 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{tour.property_address || 'Property'}</span>
                </div>
              )}
              {tour.property_price && (
                <div className="text-xs text-ink-500 mt-0.5 ml-[1.125rem]">
                  ${tour.property_price.toLocaleString()}
                </div>
              )}
            </div>
            <TourStatusBadge status={tour.status} />
          </div>

          {/* Date / time grid */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3 text-xs">
            <ScheduleField
              label={isPast ? 'Tour date' : 'Preferred'}
              value={
                tour.preferred_date
                  ? `${formatPortalDate(tour.preferred_date)}${
                      tour.preferred_time ? ` · ${tour.preferred_time}` : ''
                    }`
                  : 'TBD'
              }
            />

            {showAlternate && tour.alternate_date && (
              <ScheduleField
                label="Your alternate"
                value={`${formatPortalDate(tour.alternate_date)}${
                  tour.alternate_time ? ` · ${tour.alternate_time}` : ''
                }`}
              />
            )}

            {scheduledOverridesPreferred && tour.scheduled_at && (
              <ScheduleField
                label={tour.status === 'confirmed' ? 'Confirmed for' : 'Rescheduled to'}
                value={new Date(tour.scheduled_at).toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                emphasized
              />
            )}

            <ScheduleField
              label="Requested"
              value={portalTimeAgo(tour.created_at)}
            />
          </dl>

          {/* Notes */}
          {tour.notes && (
            <div className="mt-3 border-l-2 border-ink-200 pl-3 text-xs text-ink-700 leading-relaxed">
              <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
                Your note
              </div>
              <p className="whitespace-pre-wrap">{tour.notes}</p>
            </div>
          )}

          {tour.agent_response && (
            <div className="mt-3 border-l-2 border-ink-900 pl-3 text-xs text-ink-700 leading-relaxed">
              <div className="text-2xs uppercase tracking-widest text-ink-500 mb-1">
                From your agent
              </div>
              <p className="whitespace-pre-wrap">{tour.agent_response}</p>
            </div>
          )}

          {/* P9.6 — Agent-proposed alternate times. Click to accept. */}
          {showProposed && (
            <div className="mt-4 border border-ink-900 bg-ink-50/50 p-4">
              <div className="text-2xs uppercase tracking-widest text-ink-900 mb-2 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" strokeWidth={2} />
                Pick a tour time
              </div>
              <p className="text-xs text-ink-600 mb-3 leading-relaxed">
                Your agent couldn’t confirm your preferred time. Tap one of these instead — the
                tour locks in and you’ll get a confirmation email.
              </p>
              <div className="space-y-2">
                {proposedAlternates.map((slot, idx) => (
                  <button
                    key={`${slot.date}-${slot.time}-${idx}`}
                    onClick={() => handleAcceptAlternate(idx, slot)}
                    disabled={acceptingIdx !== null}
                    className="w-full text-left flex items-center justify-between gap-3 border border-ink-200 bg-white hover:border-ink-900 hover:bg-cream px-3 py-2.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-ink-900">
                      {formatPortalDate(slot.date)}
                      {slot.time ? ` · ${slot.time}` : ''}
                    </span>
                    {acceptingIdx === idx ? (
                      <Loader2
                        className="w-3.5 h-3.5 animate-spin text-ink-500"
                        strokeWidth={2}
                      />
                    ) : (
                      <span className="text-2xs uppercase tracking-widest text-ink-500">
                        Pick
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {acceptError && (
                <p className="text-xs text-red-700 bg-red-50 px-3 py-2 mt-3">{acceptError}</p>
              )}
              <p className="text-2xs text-ink-500 mt-3">
                None of these work?{' '}
                <Link
                  to="/portal/war-room"
                  className="text-ink-700 hover:text-ink-900 underline"
                >
                  Message your agent
                </Link>
                .
              </p>
            </div>
          )}

          {/* Footer link */}
          <div className="mt-4 flex items-center gap-3 text-2xs uppercase tracking-widest">
            <Link
              to="/portal/war-room"
              className="text-ink-600 hover:text-ink-900 inline-flex items-center gap-1"
            >
              Discuss in war room
              <ArrowUpRight className="w-3 h-3" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

function ScheduleField({
  label,
  value,
  emphasized,
}: {
  label: string
  value: string
  emphasized?: boolean
}) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-widest text-ink-500 mb-0.5">{label}</dt>
      <dd className={emphasized ? 'text-ink-900 font-medium' : 'text-ink-700'}>{value}</dd>
    </div>
  )
}

function combinePortalDateTimeToISO(date: string, time: string | null): string | null {
  if (!date) return null
  const baseTime = time && /^\d{1,2}:\d{2}/.test(time)
    ? time.slice(0, 5).padStart(5, '0')
    : '09:00'
  const iso = new Date(`${date}T${baseTime}`)
  return isNaN(iso.getTime()) ? null : iso.toISOString()
}
