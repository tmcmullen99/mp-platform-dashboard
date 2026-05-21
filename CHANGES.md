# P9.1 — CMA Builder

## What this adds
- Agent dashboard: New CMA flow at `/cmas/new` (PDF upload → Claude extracts subject + comps → editable form → save)
- CMA viewer at `/cmas/:slug` (agent) and `/portal/cmas/:slug` (client portal)
- CMAs tab on each client's detail page in the agent dashboard
- CMAs tab in the client portal
- Sidebar nav item for quick CMA creation
- Visual CMA template (subject hero, market context stats, comp grid, agent notes)

## Files to drag in (10 total)

### Modified (5)
- `src/App.tsx` — added /cmas routes
- `src/components/Sidebar.tsx` — added New CMA nav item + version bump to v0.8 P9.1
- `src/pages/Clients.tsx` — added CMAs tab on client detail
- `src/pages/Portal.tsx` — added /portal/cmas list + viewer routes
- `src/lib/supabase.ts` — added CMASubject, CMAComp types; extended CMA type

### New (3 frontend + 2 backend source-of-truth)
- `src/components/CMATemplate.tsx` — visual template
- `src/components/CMAViewer.tsx` — fetches CMA by slug, renders template
- `src/pages/NewCMA.tsx` — agent create flow
- `supabase/migrations/20260520_p9_1_cmas_structured_data.sql` — already applied via MCP
- `supabase/functions/extract_cma_pdf/index.ts` — already deployed via MCP

## Already done server-side
- Migration applied: `subject_data`, `comps_data`, `status`, `agent_notes`, `created_by` columns + indexes + updated_at trigger on `cmas` table
- Edge Function deployed: `extract_cma_pdf` v2 (model `claude-sonnet-4-6`, verify_jwt=true)

## To verify after deploy
1. Sidebar shows new "New CMA" item between Clients and Prospecting
2. Version stamp at bottom of sidebar reads "Platform v0.8 · P9.1"
3. Visit /cmas/new → upload an MLS PDF → extraction completes in ~10-25s
4. Save → redirects to /cmas/:slug showing rendered CMA
5. Visit /clients/:id → CMAs tab shows the new CMA
6. Sign in as the client → /portal/cmas → CMA appears → click → CMAViewer renders
