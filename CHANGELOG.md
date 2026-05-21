# Changelog

All notable changes to the McMullen Platform. Sprints are tagged P{phase}.{sub}.

## P8.3 — Documents, Listing Edits, CMA Multi-tenant (2026-05-20)

- **listing_edits table** — client-proposed changes to listing copy/photos/price, agent approval workflow with `status ∈ (pending, approved, rejected, cancelled)`.
- **CMA multi-tenant** — added `tenant_id`, `client_id`, `deal_id` to legacy `cmas` table. Tenant-scoped RLS with legacy-Webflow-CMA fallback (rows with NULL tenant_id remain visible to all authenticated for backward compat).
- **client-documents storage bucket** — private, path convention `<client_id>/<random>_<filename>`. Storage RLS allows agent (tenant match) or owning client (auth_user_id match). 5-minute signed URLs for download.
- **Notification bell** — Realtime-subscribed dropdown in the dashboard top bar; uses `postgres_changes` on `public.notifications` filtered by `recipient_id`.
- **DocumentManager component** — upload/list/download per-client. ListingEditor component — client edit form with agent-approval workflow.

## P8.2 — Client Login + Realtime War Rooms (2026-05-20)

- **Client portal authentication** — `current_user_client_id()` helper resolves the auth user to their `clients` row.
- **Auto-link trigger** — on `INSERT` or `UPDATE` to `auth.users`, fires `auto_link_client_to_auth()` which matches `lower(email)` to an unclaimed `clients.email` and sets `auth_user_id`. Safe: fires only when `auth_user_id IS NULL`.
- **RLS for clients** — every client-portal table got a policy that ORs in `client_id = current_user_client_id()`.
- **Realtime on `war_room_messages`** — added to `supabase_realtime` publication.
- **`invite_client` Edge Function** — generates Supabase magic link + sends branded Resend email.
- **`notify_war_room_message` Edge Function** — fires after `war_room_messages` INSERT; emails opposite side (agent ↔ client).
- **`WarRoomThread` component** — shared agent + client view with Realtime subscription.
- **AuthGate in App.tsx** — routes signed-in users to dashboard or portal based on `isAgent` (tenant_users) vs `isClient` (clients.auth_user_id) detection.

## P8.1 — Client Portal Foundation (2026-05-20)

- **Multi-tenant-ified 8 legacy tables**: `clients`, `deals`, `war_rooms`, `war_room_messages`, `activities`, `documents`, `notifications`, `saved_listings`.
- Replaced global `clients.email` UNIQUE with tenant-scoped: `(tenant_id, lower(email))`.
- Added `clients.contact_id` FK to link client portal records to the CRM contacts model.
- New `deals.service_package` enum: `make_me_move | coming_soon | active_listing | pre_market | buyer_representation | tbd`.
- New `deals.coming_soon_listing_id` FK to link deals to a public listing page.
- Dropped legacy `*_authenticated_all` policies; replaced with `tenant_access` (admin OR tenant member).

## P3.1 — Email Campaigns + Resend (2026-05-20)

- **`campaigns` table** — name, subject, from/reply-to, HTML+plain bodies, list reference, status, counts (sent/opened/clicked/bounced/failed/unsubscribed), scheduling.
- **`campaign_recipients` table** — one row per recipient with `tracking_token UNIQUE`, send/open/click timestamps, Resend message ID.
- **`send_campaign` Edge Function** — bulk send via Resend API with chunked batching, per-recipient status tracking, 200-recipient cap enforced.
- **Campaigns UI page** — list + create + send with tenant-scoped contact list pickers.

## P2.2 — Contact Ingestion (2026-05-20)

- **`tenant_ingest_keys` table** — per-tenant API tokens for the public ingest endpoint. Rotatable, revocable, with default_list_id, default_tag, default_source_kind.
- **`ingest_contact` Edge Function** (`verify_jwt=false`, PUBLIC) — accepts public POSTs with token, dedupes on `(tenant_id, lower(email))`, adds to default list, increments `use_count`.
- Bootstrapped McMullen ingest key: `sEeAYucGGAUrHO0LIcfQSj1iBGx79tP8` defaulting to "Website Inquiries" list.

## P2 — CRM Contacts Foundation (2026-05-20)

- Seven new tenant-scoped tables:
  - `contacts` — primary record with email/phone/lifecycle stage/subscription status
  - `contact_lists` — named segments
  - `contact_list_memberships` — M:N with soft-delete via `removed_at`
  - `contact_tags` + `contact_tag_assignments`
  - `contact_sources` — provenance log (`inbound_form | csv_import | prospecting | referral | manual | api | legacy_lead`)
  - `contact_events` — event stream (P3 stub for activity timeline)
- CRM dashboard page with list/filter/search and per-contact detail.
- CSV import page with column mapping and dedupe preview.

## P1 — Platform Foundation (2026-05-20)

- **Multi-tenant primitives**: `tenants`, `tenant_branding`, `user_profiles`, `tenant_users` (M:N with `owner | admin | editor | viewer` roles).
- **Audit log** — append-only, every meaningful action: `tenant_id`, `user_id`, `actor_kind ∈ (user, ai, system)`, `action`, `entity_kind`, `entity_id`, `metadata`.
- **RLS helpers**:
  - `is_brokerage_admin()` → boolean
  - `current_user_tenant_ids()` → SETOF uuid (must be used with `IN (SELECT ...)` pattern)
- **AI chat Edge Function** (`chat`) — claude-sonnet-4-6 model, 9 tools wired up against tenant-scoped data.
- **Dashboard scaffold** — React 18 + TypeScript + Vite + Tailwind. Pages: Today, Login, Placeholder. Components: Layout, Sidebar, TopBar, ChatPanel.
- McMullen Properties tenant created: `e0c8abe7-cc29-45c0-99c1-7c20b920262a`.

---

## Pre-platform legacy (Webflow era, March–May 2026)

Migrations 20260509–20260517 cover the pre-multi-tenant database used by the Webflow-era McMullen Properties site:

- `properties`, `neighborhoods`, `property_types`, `statuses` — public-readable listing catalog
- `cmas` — self-contained HTML CMA pages
- `coming_soon_listings` — pre-market property pages
- `blog_posts` — 686 posts migrated from Webflow CMS
- `testimonials` — client reviews
- `leads` — inbound form submissions (legacy table, slated for retirement once `contacts` ingestion is fully cut over)
- `email_blasts`, `email_events`, `pageviews` — pre-P3 tracking infrastructure
- `admin_assets` — server-side store for the v0.3 single-file admin dashboard (4 chunks of inline HTML+JS)

These remain in the database for backward compatibility but are not actively developed. New work goes through the platform schema (P1 onward).

---

## Coming next (proposed sprints)

- **P3.2** — Resend webhook signature verification (svix), drip sequences, scheduled sends, WYSIWYG editor
- **P3.3** — Per-tenant sending domain DNS automation
- **P4** — Site editor (Webflow replacement: tenant-customizable marketing site)
- **P5** — Listings management (replaces `coming_soon_listings` + `properties` with unified listing model)
- **P6** — Prospecting (DealMachine replacement: permit data, lead enrichment)
- **P8.4** — Photo upload + reordering for listings, CMA viewer page, e-sign integration (DocuSign/Dropbox Sign), read receipts in war room messages, message attachments
- **P9** — Content studio (blog editor, social composer)
- **P10** — Analytics dashboard (replaces Google Analytics + Mailchimp reports)
