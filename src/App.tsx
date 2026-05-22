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
// P9.13.0-.2: public pages (no auth required)
import ListingsIndex from '@/pages/public/ListingsIndex'
import PublicListingDetail from '@/pages/public/PublicListingDetail'
import TenantHome from '@/pages/public/TenantHome'
import ClaimUnit from '@/pages/public/ClaimUnit'
import Unsubscribe from '@/pages/public/Unsubscribe'
import { Search, PenLine, Globe, BarChart3 } from 'lucide-react'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          {/* P9.13.0-.2: public-facing routes, no auth */}
          <Route path="/listings" element={<ListingsIndex />} />
          <Route path="/listings/:slug" element={<PublicListingDetail />} />
          <Route path="/t/:tenantSlug" element={<TenantHome />} />
          {/* B.2: public ownership-claim link */}
          <Route path="/claim/:token" element={<ClaimUnit />} />
          {/* C.2: public unsubscribe */}
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          {/* Everything else goes through the auth gate */}
          <Route path="*" element={<AuthGate />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

function AuthGate() {
  const { session, loading, isAgent, isClient } = useAuth()
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
        <Route
          path="/analytics"
          element={
            <Placeholder
              title="Analytics"
              description="Lead-source attribution, funnel metrics, ROI by campaign and content piece. Engagement-as-conversion-signal: click + return + content-depth + form-submit, not vanity opens. Closes the content → CRM → outreach loop."
              Icon={BarChart3}
              phase="P10"
              replaces="Google Analytics"
            />
          }
        />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/portal/*" element={<Portal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
