// P8.2 + P9.1 — Client-facing portal. Only renders when useAuth().isClient is true.
// Routes: /portal (home), /portal/listing, /portal/cmas, /portal/cmas/:slug, /portal/war-room, /portal/documents
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
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  supabase,
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

export default function Portal() {
  return (
    <PortalLayout>
      <Routes>
        <Route index element={<PortalHome />} />
        <Route path="listing" element={<PortalListing />} />
        <Route path="cmas" element={<PortalCMAs />} />
        <Route path="cmas/:slug" element={<CMAViewer embedded />} />
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
  icon: typeof Home
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
// Portal Home
// ===========================================================================
function PortalHome() {
  const { clientProfile } = useAuth()
  const [deals, setDeals] = useState<Deal[]>([])
  const [warRooms, setWarRooms] = useState<WarRoom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientProfile) return
    let cancelled = false
    async function load() {
      const [{ data: dData }, { data: wrData }] = await Promise.all([
        supabase
          .from('deals')
          .select('*')
          .eq('client_id', clientProfile!.id)
          .order('created_at', { ascending: false }),
        supabase.from('war_rooms').select('*').eq('client_id', clientProfile!.id),
      ])
      if (cancelled) return
      setDeals((dData as Deal[]) || [])
      setWarRooms((wrData as WarRoom[]) || [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [clientProfile])

  if (!clientProfile) return <p className="text-ink-600">Loading…</p>

  const firstName = clientProfile.name.split(' ')[0]

  return (
    <div>
      <div className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Welcome</div>
      <h1 className="font-display text-4xl text-ink-900 leading-tight mb-3">
        Hi, {firstName}.
      </h1>
      <p className="text-ink-600 max-w-2xl mb-12 leading-relaxed">
        This is your private portal — your listing, our messages, and shared documents in one
        place. Use the war room for anything you want to discuss; emails to your agent get sent
        automatically.
      </p>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-ink-500" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/portal/listing"
            className="block border border-ink-200 hover:border-ink-400 p-6 transition-colors"
          >
            <Home className="w-5 h-5 text-ink-500 mb-3" strokeWidth={1.5} />
            <h2 className="font-display text-xl text-ink-900 mb-2">My listing</h2>
            <p className="text-sm text-ink-600 mb-3">
              {deals[0]?.title || 'Your active engagement'}
            </p>
            <div className="text-2xs uppercase tracking-widest text-ink-500">
              {SERVICE_PACKAGES.find((p) => p.value === deals[0]?.service_package)?.label ||
                'Service package'}
            </div>
          </Link>

          <Link
            to="/portal/war-room"
            className="block border border-ink-200 hover:border-ink-400 p-6 transition-colors"
          >
            <MessageSquare className="w-5 h-5 text-ink-500 mb-3" strokeWidth={1.5} />
            <h2 className="font-display text-xl text-ink-900 mb-2">War room</h2>
            <p className="text-sm text-ink-600 mb-3">
              {warRooms.length > 0 ? 'Open thread with your agent.' : 'No conversations yet.'}
            </p>
            <div className="text-2xs uppercase tracking-widest text-ink-500">
              {warRooms.length} {warRooms.length === 1 ? 'room' : 'rooms'}
            </div>
          </Link>
        </div>
      )}

      <ServicePackagesEducation />
    </div>
  )
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
              <Stat label="List price" value={deal.estimated_value ? `$${deal.estimated_value.toLocaleString()}` : '—'} />
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
                <h3 className="text-2xs uppercase tracking-widest text-ink-500 mb-3">Agent notes</h3>
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
