import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Today from '@/pages/Today'
import CRM from '@/pages/CRM'
import CSVImport from '@/pages/CSVImport'
import Clients from '@/pages/Clients'
import Campaigns from '@/pages/Campaigns'
import Placeholder from '@/pages/Placeholder'
import Portal from '@/pages/Portal'
import NewCMA from '@/pages/NewCMA'
import CommissionSettings from '@/pages/CommissionSettings'
import CMAViewer from '@/components/CMAViewer'
import Analyze from '@/pages/Analyze'
import AnalyzeReview from '@/pages/AnalyzeReview'
import Signup from '@/pages/Signup'
import OnboardingWizard from '@/pages/OnboardingWizard'
import Brokerage from '@/pages/Brokerage'
// Public website surface (no auth) — served before the AuthGate.
import McMullenHome from '@/pages/public/McMullenHome'
import TenantHome from '@/pages/public/TenantHome'
import PortfolioIndex from '@/pages/public/PortfolioIndex'
import PropertyDetail from '@/pages/public/PropertyDetail'
import CorePage from '@/pages/public/CorePage'
import BlogIndex from '@/pages/public/BlogIndex'
import BlogPost from '@/pages/public/BlogPost'
import PublicMakeMeMove from '@/pages/public/PublicMakeMeMove'
import PublicMakeMeMoveDetail from '@/pages/public/PublicMakeMeMoveDetail'
import MakeMeMove from '@/pages/MakeMeMove'
import SiteEditor from '@/pages/SiteEditor'
import ListingsAdmin from '@/pages/ListingsAdmin'
import BlogAdmin from '@/pages/BlogAdmin'
import Inquiries from '@/pages/Inquiries'
import CreditApplications from '@/pages/CreditApplications'
import Welcome from '@/pages/public/Welcome'
import Compare from '@/pages/public/Compare'
import JoinTeaser from '@/pages/public/JoinTeaser'
import ToolsHub from '@/pages/public/ToolsHub'
import NetSheetTool from '@/pages/public/NetSheetTool'
import CMATool from '@/pages/public/CMATool'
import CompsRequestTool from '@/pages/public/CompsRequestTool'
import ReviewRequestTool from '@/pages/public/ReviewRequestTool'
import OffMarketTool from '@/pages/public/OffMarketTool'
import LuxuryListings from '@/pages/public/LuxuryListings'
import ServiceLuxury from '@/pages/public/ServiceLuxury'
import ServiceDisclosure from '@/pages/public/ServiceDisclosure'
import Service1031 from '@/pages/public/Service1031'
import ServiceCommercial from '@/pages/public/ServiceCommercial'
import ServiceImprovement from '@/pages/public/ServiceImprovement'
import ServiceFlips from '@/pages/public/ServiceFlips'
import Sitemap from '@/pages/public/Sitemap'
import MarketTest from '@/pages/public/MarketTest'
import MarketPage from '@/pages/public/MarketPage'
import CMAReview from '@/pages/public/CMAReview'
import CMAShowcaseViewer from '@/pages/public/CMAShowcaseViewer'
import DisclosureReview from '@/pages/public/DisclosureReview'
import AccountDashboard from '@/pages/account/AccountDashboard'
import CreditApplication from '@/pages/account/CreditApplication'
import {
  Search,
  Send,
  Home,
  PenLine,
  Globe,
  BarChart3,
  Settings,
} from 'lucide-react'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ---- Public website (no auth) ---- */}
          {/* Root: public McMullen homepage for guests; authenticated
              users are bounced into their app by RootResolver. */}
          <Route path="/" element={<RootResolver />} />
          <Route path="/home" element={<McMullenHome />} />
          <Route path="/listings" element={<PortfolioIndex />} />
          <Route path="/listings/:slug" element={<PropertyDetail />} />
          <Route path="/meet-tim" element={<CorePage slug="about" />} />
          {/* Legacy /about path redirects to the renamed Meet Tim page. */}
          <Route path="/about" element={<Navigate to="/meet-tim" replace />} />
          <Route path="/buy" element={<CorePage slug="buy" />} />
          <Route path="/sell" element={<CorePage slug="sell" />} />
          <Route path="/services" element={<CorePage slug="services" />} />
          <Route path="/services/luxury-listing" element={<ServiceLuxury />} />
          <Route path="/services/disclosure-review" element={<ServiceDisclosure />} />
          <Route path="/services/1031-exchange" element={<Service1031 />} />
          <Route path="/services/commercial" element={<ServiceCommercial />} />
          <Route path="/services/home-improvement" element={<ServiceImprovement />} />
          <Route path="/services/flips" element={<ServiceFlips />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/t/:tenantSlug" element={<TenantHome />} />
          <Route path="/t/:tenantSlug/listings/:slug" element={<PropertyDetail />} />
          {/* Public Make-Me-Move marketplace (anon via mmm_public_read RLS) */}
          <Route path="/m/:tenantSlug" element={<PublicMakeMeMove />} />
          <Route path="/m/:tenantSlug/:listingId" element={<PublicMakeMeMoveDetail />} />
          {/* Self-signup: post-confirmation provisioning + member dashboard */}
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/account" element={<AccountDashboard />} />
          <Route path="/account/apply" element={<CreditApplication />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/join" element={<JoinTeaser />} />
          {/* Buyer Analysis showcase: gallery, gated disclosure viewer (before
              the CMA :slug so "disclosure" isn't captured as a slug), CMA viewer. */}
          <Route path="/cma-review" element={<CMAReview />} />
          <Route path="/cma-review/disclosure/:slug" element={<DisclosureReview />} />
          <Route path="/cma-review/:slug" element={<CMAShowcaseViewer />} />
          <Route path="/tools" element={<ToolsHub />} />
          <Route path="/tools/net-sheet" element={<NetSheetTool />} />
          <Route path="/tools/cma" element={<CMATool />} />
          <Route path="/tools/comps" element={<CompsRequestTool />} />
          <Route path="/tools/review" element={<ReviewRequestTool />} />
          <Route path="/tools/off-market" element={<OffMarketTool />} />
          <Route path="/luxury-listings" element={<LuxuryListings />} />
          <Route path="/sitemap" element={<Sitemap />} />
          <Route path="/market-test" element={<MarketTest />} />
          <Route path="/market-insight/:market" element={<MarketPage />} />

          {/* ---- App (auth) ---- */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<AuthGate />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

/* Root path: the public McMullen homepage for EVERYONE, always — including
   signed-in agents and clients. There is deliberately zero overlap between the
   public marketing site (apex "/") and the authenticated app. Agents reach
   their workspace at the explicit "/app" path; clients at "/portal". This keeps
   the marketing domain purely public and prevents an agent's session from ever
   turning the homepage into the dashboard. */
function RootResolver() {
  return <McMullenHome />
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

  // First-run onboarding gate. A brand-new agent has a tenant but no
  // tenant_branding.onboarded_at stamp yet. We route them into the full-screen
  // wizard exactly once; it stamps onboarded_at on finish/skip and hard-navigates
  // to "/", which re-reads branding and releases the gate. The wizard lives
  // OUTSIDE <Layout> so there's no dashboard chrome during setup.
  // Guard: only gate once branding has actually loaded (currentBranding !== null)
  // to avoid a flash-redirect on the first render before the fetch resolves.
  const needsOnboarding =
    isAgent && !!currentTenant && currentBranding !== null && !currentBranding.onboarded_at

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
        {/* Agent workspace home lives at the explicit /app path (the public
            marketing homepage owns apex "/"). /today is a friendly alias. */}
        <Route path="/app" element={<Today />} />
        <Route path="/today" element={<Today />} />
        <Route path="/" element={<Today />} />
        <Route path="/crm/import" element={<CSVImport />} />
        <Route path="/crm/*" element={<CRM />} />
        <Route path="/inquiries" element={<Inquiries />} />
        <Route path="/credit-applications" element={<CreditApplications />} />
        <Route path="/clients/*" element={<Clients />} />
        <Route path="/cmas/new" element={<NewCMA />} />
        {/* P9.4 Sprint I — edit existing CMA. Reuses NewCMA in edit mode
            via the :slug URL param. Declared BEFORE /cmas/:slug so a future
            reader sees the more-specific route first (react-router v6 still
            picks best-match regardless of declaration order). */}
        <Route path="/cmas/:slug/edit" element={<NewCMA />} />
        <Route path="/cmas/:slug" element={<CMAViewer />} />
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/analyze/:id" element={<AnalyzeReview />} />
        <Route path="/make-me-move" element={<MakeMeMove />} />
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
        <Route
          path="/listings"
          element={
            <Placeholder
              title="Listings"
              description="MLS sync via RESO Web API once broker-licensed. Zillow Premier Agent lead routing. Per-listing landing pages with built-in lead capture. Status workflow: Coming Soon → Active → Pending → Sold."
              Icon={Home}
              phase="P7"
              replaces="Showcase IDX / iHomeFinder"
            />
          }
        />
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
        <Route path="/site" element={<SiteEditor />} />
        <Route path="/site/listings" element={<ListingsAdmin />} />
        <Route path="/site/blog" element={<BlogAdmin />} />
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
        <Route path="/settings/commission" element={<CommissionSettings />} />
        <Route path="/brokerage" element={<Brokerage />} />
        <Route
          path="/settings"
          element={
            <Placeholder
              title="Settings & Integrations"
              description="Branding (logo, colors, typography, hero copy, social links, service areas, DRE), team management with per-tenant roles, third-party connections (Resend, ATTOM Data, Zillow Premier Agent, Instagram Business, LinkedIn, MLS), billing, and the audit log."
              Icon={Settings}
              phase="P1.5"
              replaces="—"
            />
          }
        />
      </Route>
      {/* Full-screen onboarding wizard (re-runnable after first pass) — outside
          Layout so there's no dashboard chrome. */}
      <Route path="/onboarding" element={<OnboardingWizard />} />
      <Route path="/portal/*" element={<Portal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
