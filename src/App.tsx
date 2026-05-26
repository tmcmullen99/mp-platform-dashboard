import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Today from '@/pages/Today'
import Schedule from '@/pages/Schedule'
import Settings from '@/pages/Settings'
import CRM from '@/pages/CRM'
import CSVImport from '@/pages/CSVImport'
import Clients from '@/pages/Clients'
import Campaigns from '@/pages/Campaigns'
import Placeholder from '@/pages/Placeholder'
import Portal from '@/pages/Portal'
import NewCMA from '@/pages/NewCMA'
import CMAViewer from '@/components/CMAViewer'
import Markets from '@/pages/Markets'
import MarketDetail from '@/pages/MarketDetail'
import Audiences from '@/pages/Audiences'
import Outreach from '@/pages/Outreach'
import Board from '@/pages/Board'
import Brokerage from '@/pages/Brokerage'
import DealDetail from '@/pages/DealDetail'
import Referrals from '@/pages/Referrals'
import MakeMeMove from '@/pages/MakeMeMove'
import BuyerFeed from '@/pages/buyerfeed'
import Pipeline from '@/pages/Pipeline'
import Analytics from '@/pages/Analytics'
import Tasks from '@/pages/Tasks'
import Notifications from '@/pages/Notifications'
import Copilot from '@/pages/Copilot'
import ColdDrip from '@/pages/ColdDrip'
import OnboardingWizard from '@/pages/OnboardingWizard'
// P9.13.0-.2: public pages (no auth required)
import ListingsIndex from '@/pages/public/ListingsIndex'
import PublicListingDetail from '@/pages/public/PublicListingDetail'
import TenantHome from '@/pages/public/TenantHome'
import ClaimUnit from '@/pages/public/ClaimUnit'
import Unsubscribe from '@/pages/public/Unsubscribe'
import SharedDoc from '@/pages/public/SharedDoc'
import PublicMakeMeMove from '@/pages/public/PublicMakeMeMove'
import PublicMakeMeMoveDetail from '@/pages/public/PublicMakeMeMoveDetail'
import PublicMarket from '@/pages/public/PublicMarket'
import { Search, PenLine, Globe, BarChart3 } from 'lucide-react'

// Vanity market subdomains → market slug, so a branded host like
// campbell.mcmullen.properties serves its market page at the root.
const MARKET_HOSTS: Record<string, string> = {
  'campbell.mcmullen.properties': 'campbell',
}
const hostMarketSlug =
  typeof window !== 'undefined' ? MARKET_HOSTS[window.location.hostname] ?? null : null

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {hostMarketSlug && <Route path="/" element={<PublicMarket slugOverride={hostMarketSlug} />} />}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          {/* P9.13.0-.2: public-facing routes, no auth */}
          <Route path="/listings" element={<ListingsIndex />} />
          <Route path="/listings/:slug" element={<PublicListingDetail />} />
          <Route path="/t/:tenantSlug" element={<TenantHome />} />
          {/* P-Mkt.3: public buyer-facing Make-Me-Move browse + detail */}
          <Route path="/m/:tenantSlug" element={<PublicMakeMeMove />} />
          <Route path="/m/:tenantSlug/:listingId" element={<PublicMakeMeMoveDetail />} />
          <Route path="/market/:slug" element={<PublicMarket />} />
          {/* B.2: public ownership-claim link */}
          <Route path="/claim/:token" element={<ClaimUnit />} />
          {/* C.2: public unsubscribe */}
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          {/* Public read-only shared documents (CMAs, Net Sheets, …) */}
          <Route path="/share/:token" element={<SharedDoc />} />
          {/* Everything else goes through the auth gate */}
          <Route path="*" element={<AuthGate />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

function AuthGate() {
  const { session, loading, isAgent, isClient, currentTenant, currentBranding } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-2xs uppercase tracking-widest text-ink-500">Loading platform…</div>
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />

  // Client-only users — portal only
  if (isClient && !isAgent) {
    return (
      <Routes>
        <Route path="/portal/*" element={<Portal />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    )
  }

  // First-run gate: a freshly invited agent (tenant_branding.onboarded_at IS NULL)
  // is routed into the concierge wizard and can't reach the dashboard until they
  // finish or skip — both of which stamp onboarded_at, releasing the gate. Guarded
  // on a loaded branding row so a tenant without one is never trapped.
  const needsOnboarding =
    isAgent && !!currentTenant && !!currentBranding && !currentBranding.onboarded_at
  if (needsOnboarding) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingWizard />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    )
  }

  // Agent (possibly dual-role): full dashboard + portal preview
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Today />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/crm/import" element={<CSVImport />} />
        <Route path="/crm/*" element={<CRM />} />
        <Route path="/clients/*" element={<Clients />} />
        <Route path="/markets" element={<Markets />} />
        <Route path="/markets/:marketId" element={<MarketDetail />} />
        <Route path="/audiences" element={<Audiences />} />
        <Route path="/outreach" element={<Outreach />} />
        <Route path="/board" element={<Board />} />
        <Route path="/brokerage" element={<Brokerage />} />
        <Route path="/deals/:dealId" element={<DealDetail />} />
        <Route path="/referrals" element={<Referrals />} />
        <Route path="/make-me-move" element={<MakeMeMove />} />
        <Route path="/buyer-feed" element={<BuyerFeed />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/copilot" element={<Copilot />} />
        <Route path="/cold-drip" element={<ColdDrip />} />
        <Route path="/cmas/new" element={<NewCMA />} />
        <Route path="/cmas/:slug" element={<CMAViewer />} />
        <Route
          path="/prospecting"
          element={
            <Placeholder
              title="Prospecting"
              description="Owner search by geography, equity, ownership length, and demographic signal. Skip-trace enrichment, email scrubbing, list export — direct into your warming sequences. The top of the funnel."
              Icon={Search}
              phase="P6"
              replaces="DealMachine"
            />
          }
        />
        <Route path="/campaigns/*" element={<Campaigns />} />
        {/* /listings is now a PUBLIC route (handled above, outside AuthGate). */}
        <Route
          path="/content"
          element={
            <Placeholder
              title="Content Studio"
              description="Blog editor with SEO scoring, AIO (AI-search visibility) optimization, content calendar with warming-sequence awareness. AI drafts in the agent's voice. Every piece is composed with the question: which list segment is this for, and where in their warming sequence?"
              Icon={PenLine}
              phase="P9"
              replaces="SEMrush + ChatGPT"
            />
          }
        />
        <Route
          path="/site"
          element={
            <Placeholder
              title="Site Editor"
              description="Faceless component chassis: a generic 30-page real-estate site that every tenant gets, configured via tenant_branding plus a component-tree editor. Edit by click or by chat. Publishes to the public Cloudflare Pages site."
              Icon={Globe}
              phase="P4"
              replaces="Webflow / Squarespace"
            />
          }
        />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/onboarding" element={<OnboardingWizard />} />
      <Route path="/portal/*" element={<Portal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
