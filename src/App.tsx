import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Today from '@/pages/Today'
import Schedule from '@/pages/Schedule'
import CRM from '@/pages/CRM'
import CSVImport from '@/pages/CSVImport'
import Clients from '@/pages/Clients'
import Campaigns from '@/pages/Campaigns'
import Placeholder from '@/pages/Placeholder'
import Portal from '@/pages/Portal'
import NewCMA from '@/pages/NewCMA'
import CMAViewer from '@/components/CMAViewer'
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
          <Route path="/login" element={<Login />} />
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
      <Route path="/portal/*" element={<Portal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
