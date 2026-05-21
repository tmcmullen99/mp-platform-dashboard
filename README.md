# McMullen Platform

AI-driven multi-tenant brokerage OS. The dashboard is a thin presentation layer over Supabase + Cloudflare; the moat is the AI control layer that lets agents operate their entire business through natural-language commands and a unified data model.

Built to replace ~$535/mo/agent of legacy SaaS: Follow Up Boss + SEMrush + Mailchimp + GA + Webflow + Calendly + DealMachine.

**Live dashboard:** https://mp-platform-dashboard.pages.dev

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Routing | React Router 6 |
| Auth + DB + Storage + Realtime | Supabase |
| Server-side compute | Supabase Edge Functions (Deno) |
| Hosting | Cloudflare Pages (auto-deploy on push to `main`) |
| Email | Resend (transactional + campaigns) |

---

## Repository structure

```
mp-platform-dashboard/
├── src/                      # React app source
│   ├── App.tsx               # Top-level routing + AuthGate (agent vs client routing)
│   ├── main.tsx              # Vite entrypoint
│   ├── index.css             # Tailwind base + global tokens
│   ├── contexts/
│   │   └── AuthContext.tsx   # Supabase session, profile, tenant, client-detection
│   ├── components/
│   │   ├── Layout.tsx        # Agent dashboard shell
│   │   ├── Sidebar.tsx       # Agent nav (Today/CRM/Clients/Campaigns/…)
│   │   ├── TopBar.tsx        # Tenant switcher + bell + user menu
│   │   ├── ChatPanel.tsx     # Embedded AI chat
│   │   ├── WarRoomThread.tsx # Realtime messaging — shared agent + client view
│   │   ├── DocumentManager.tsx # Upload/list/download with signed URLs
│   │   ├── ListingEditor.tsx # Client edit form + agent approval workflow
│   │   └── NotificationBell.tsx # Realtime notifications dropdown
│   ├── pages/
│   │   ├── Today.tsx         # Agent home
│   │   ├── CRM.tsx           # Contacts, lists, tags
│   │   ├── CSVImport.tsx     # Bulk contact ingest
│   │   ├── Campaigns.tsx     # Email campaigns
│   │   ├── Clients.tsx       # Client cards + per-client detail (5 tabs)
│   │   ├── Portal.tsx        # Client-facing portal (separate UX)
│   │   ├── Login.tsx
│   │   └── Placeholder.tsx   # "Coming in PX" stub
│   └── lib/
│       └── supabase.ts       # Supabase client + types + enums
├── public/
│   └── _redirects            # SPA fallback for Cloudflare Pages
├── supabase/
│   ├── migrations/           # All DDL, applied via Supabase CLI or MCP
│   └── functions/
│       ├── chat/                       # P1.5 AI control layer
│       ├── send_campaign/              # P3.1 email blast worker
│       ├── ingest_contact/             # P2.2 public form ingest
│       ├── invite_client/              # P8.2 portal invitations
│       └── notify_war_room_message/    # P8.2 cross-side messaging notifications
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
├── .env.example              # Required env vars (don't commit .env)
└── CHANGELOG.md              # Sprint log: P1 → P8.3
```

---

## Environment

Copy `.env.example` to `.env` for local dev. Required:

```bash
VITE_SUPABASE_URL=https://kumfuludrhoqirxvaqja.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_jUwV52QfqixUh_6VSfEbtg_gWZh-1XF
```

The publishable key is safe to commit (it respects RLS). Service-role secrets live only on Supabase Edge Functions — never in the frontend.

### Edge Function secrets (Supabase dashboard)

- `SUPABASE_URL` — auto-set by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — auto-set by Supabase
- `RESEND_API_KEY` — set via Supabase secrets for `send_campaign`, `invite_client`, `notify_war_room_message`
- `ANTHROPIC_API_KEY` — set for `chat`
- `PORTAL_URL` (optional) — defaults to `https://mp-platform-dashboard.pages.dev/portal`
- `APP_URL` (optional) — defaults to `https://mp-platform-dashboard.pages.dev`

---

## Local development

```bash
npm install
npm run dev       # Vite dev server on http://localhost:5173
npm run build     # Production build → dist/
```

---

## Deploy pipeline

**Frontend (Cloudflare Pages)** — push to `main`. Cloudflare auto-detects the Vite config, runs `npm run build`, and publishes `dist/`. Build settings if Cloudflare doesn't auto-detect:
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: `/`

**Supabase migrations and Edge Functions** — currently deployed via the Supabase MCP from this Claude conversation. The code lives in `supabase/` for visibility and future CLI-based deploys, but applying a migration or pushing a function happens through the MCP, not through `git push`. Future option: wire `supabase db push` and `supabase functions deploy` into a GitHub Action.

---

## Multi-tenant architecture (TL;DR)

Every business-data table is scoped by `tenant_id`. RLS enforces it. Two helper functions resolve identity:

```sql
public.current_user_tenant_ids() -- SETOF uuid — tenants this auth user belongs to
public.current_user_client_id()  -- uuid — client row this auth user "is" (if any)
```

Every tenant-scoped table has the same policy shape:

```sql
USING (
  public.is_brokerage_admin()
  OR tenant_id IN (SELECT public.current_user_tenant_ids())
  -- and for client-portal tables also:
  OR client_id = public.current_user_client_id()
)
```

The `auto_link_client_to_auth` trigger on `auth.users` ties new signups to their pre-created `clients` row by case-insensitive email match (only when the client's `auth_user_id` is still NULL — no hijack risk).

---

## Sprint phases shipped

See [CHANGELOG.md](./CHANGELOG.md) for the full log. Summary:

- **P1** — Platform foundation (multi-tenant primitives, AI chat, audit log)
- **P2** — CRM contacts + lists + tags + sources
- **P2.2** — Public form ingest endpoint + CSV import
- **P3.1** — Email campaigns + Resend integration
- **P8.1** — Client portal foundation (multi-tenant-ify 8 legacy tables, service packages, war room shells)
- **P8.2** — Client login + Realtime war room messaging + cross-side email notifications
- **P8.3** — Documents storage + client listing editor with agent approval + CMA multi-tenant + notification bell

Future sprints proposed in CHANGELOG: P4 site editor, P5 listings, P6 prospecting, P9 content studio, P10 analytics.
