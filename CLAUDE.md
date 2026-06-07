# GlobalReach CRM — Claude Code Context

This file is read automatically by Claude Code on every session. It is the single source of truth for AI context on this project. Keep it updated after each sprint.

---

## What this is

Full B2B SaaS CRM — a SalesStack.com competitor. 16 pages, 80+ API routes, 13+ DB tables, ~20,000 source lines. The user is building this as a real SaaS product.

**Live URL:** https://globalreach-kph0.onrender.com  
**GitHub:** https://github.com/aasenevan-dot/globalreach (public, `master` branch)  
**Render dashboard:** https://dashboard.render.com/web/srv-d8h6f2eq1p3s73fpudh0

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Routing | wouter (hash-based: `/#/leads`, etc.) |
| State / data | TanStack React Query, `apiRequest()` from `@/lib/queryClient` |
| Styling | Tailwind CSS + shadcn/ui components |
| Charts | recharts |
| Backend | Express (Node) |
| ORM | Drizzle ORM |
| Database | libsql (Turso drop-in) — embedded replica, writes go to Turso primary |
| Validation | Zod (`insertXSchema.safeParse`) |
| Build | Vite for frontend, esbuild for server → `dist/index.cjs` |

**Brand:** Red (#ef4444) → Teal (#14b8a6) gradients. No blue anywhere.

---

## Local setup (Mac)

```bash
# Clone
git clone https://github.com/aasenevan-dot/globalreach.git
cd globalreach

# Install dependencies
npm install

# Set env vars (create a .env file or export in shell)
# DATABASE_URL=libsql://globalreach-evanaasen.aws-us-east-1.turso.io
# DATABASE_AUTH_TOKEN=<get from app.turso.tech → globalreach → Tokens>
# (Do NOT commit .env — it's gitignored)

# Dev server (frontend + backend together)
npm run dev
# → http://localhost:5000
```

**Git config** (repo-local, already set, no action needed):
```
user.name = Claude
user.email = claude@anthropic.com
```

---

## Project structure

```
client/src/
  pages/          — Dashboard, Leads, Pipeline, Campaigns, Inbox, Analytics,
                    Calendar, Forms, Funnels, Automations, Webhooks, Settings,
                    FindLeads, Jobs, Landing, BookMeeting
  components/     — AppShell, LeadDetailSheet, StepEditor, SearchPalette,
                    EnrollLeadsDialog, WinCelebrationDialog, ...
  lib/            — queryClient, scoring, i18n-data, geo-data, mode, audience, theme

server/
  routes.ts       — All 80+ API routes
  storage.ts      — IStorage interface + DatabaseStorage class (libsql/Drizzle)
  index.ts        — Express app setup, rate limiting, static serving
  seed.ts         — Demo data (24 leads + campaigns + jobs + activity log)
  lib/
    campaign-scheduler.ts  — 60s polling SMTP sender
    webhooks.ts            — HMAC-SHA256 signed delivery + exponential backoff
    bulk-ops.ts            — Bulk enroll, bulk status update

shared/
  schema.ts       — Drizzle table definitions + Zod insert schemas (single source of truth)
```

---

## Database tables (15)

`users`, `settings`, `leads`, `campaigns`, `steps`, `messages`, `jobs`,
`forms`, `form_submissions`, `funnels`, `automations`, `meetings`,
`calendar_settings`, `reminders`, `webhooks`, `webhook_deliveries`,
`saved_filters`, `activity_log`

**Forward-migration pattern** (zero-downtime): `storage.ts` runs `ALTER TABLE ... ADD COLUMN` on boot if the column doesn't exist. Always use this pattern — never delete/recreate tables.

---

## Key architectural patterns

- **Auth:** sessionStorage `authToken` + server-side password check. No JWT.
- **Automation triggers:** Non-blocking async IIFE after lead/status operations in routes.ts.
- **Cross-page state:** sessionStorage handoff (e.g. SearchPalette writes `openLeadId`, Leads reads+clears on mount).
- **React Query keys:** always match the API path exactly — `["/api/leads"]`, `["/api/leads", leadId]`, etc.
- **Lead status flow:** `new → contacted → engaged → meeting → won / lost`
- **Lead scoring:** `scoreLead(lead)` from `@/lib/scoring` returns 0–100. `scoreLabel(score)` returns `{ label: "Hot", className: "text-orange-500" }`.

---

## Sprint history — what's been built

### Sprints 1–3 (June 2026)
- B1: Automation triggers (`lead_created`, `status_changed`) fire in routes.ts async
- B2: Campaign "Enroll Leads" dialog (EnrollLeadsDialog component in Campaigns.tsx)
- B3: Settings "Clear All Data" wired to DELETE all leads/campaigns/jobs/automations
- B4: Webhook exponential backoff retry (3 attempts: 0s, 1s, 2s) in webhooks.ts
- B7: Inbox marks messages as "read" on thread open (persists across refresh)
- F5: Email template library in StepEditor (6 pre-written templates, Wand2 button)
- F6: CSV import dedup via `getLeadByEmail` (counts duplicates returned to UI)
- F7: Cmd+K search palette searches leads by name/company/email, sessionStorage handoff
- F9: Seed data logs activity entries for the 10 created leads
- F10: Sidebar notification badges: Inbox unread count, Calendar meetings-today count, Automations active count
- F11: Rate limiting (express-rate-limit: 300/min general API, 5/min seed/clear-all)

### Sprint 4 (June 2026, commit 82ea898)
- **F13:** Tags autocomplete — `<datalist id="lead-tag-suggestions">` in LeadDetailSheet, pulls existing tags from allLeads query
- **F4:** "Top leads to reach today" card on Dashboard — top 5 by score, excludes won/lost
- **B5:** Form submission sets `convertedLeadId` on form_submission row after auto-creating lead
- **F14:** `leads.createdAt` added to schema + ALTER migration + Analytics date range filter (7d/30d/90d/all)

### Sprint 5 (June 2026)
- **F8:** Mobile layout fixes — Pipeline kanban becomes horizontal-scrolling snap lanes on mobile (6-col grid at `lg`); Analytics chart cards get `min-w-0` so recharts `ResponsiveContainer` shrinks instead of overflowing; FindLeads filter row collapses behind a "Filters" toggle on mobile. Also made the AppShell header responsive (ModeToggle/AudienceToggle labels become icon-only below `sm`), which was the real cause of page-level horizontal scroll on every page.
- **F3:** Per-step campaign analytics — added `messages.stepId` (schema + idempotent `ALTER TABLE messages ADD COLUMN step_id`). Step attribution now set in `bulk-ops` enroll, `routes` `run` + `schedule-all`, and seed. New `GET /api/campaigns/:id/step-stats` returns per-step leads count + sent/open/reply rates; rendered as a "Per-Step Performance" card in CampaignDetail. Seed creates a realistic step funnel (8→5→2) for demo data.
- **F15:** Export analytics as PNG/PDF — added `html2canvas` + `jspdf` (lazy-imported in `client/src/lib/export-analytics.ts` so they don't bloat the Analytics chunk). "Export" dropdown on both B2B and Consumer analytics views captures the page (respecting dark mode, ignoring the button via `data-export-ignore`).
- **Build fix:** `script/build.ts` now polyfills `import.meta.url` (banner + define from native `__filename`) so the `import.meta.url`→`__dirname` derivation in `server/static.ts` and `server/storage.ts` works in both `tsx` (ESM dev) and the bundled CJS production build. Previously the CJS bundle had an empty `import.meta.url`, which would crash `fileURLToPath("")` on boot.

### Sprint 6 (June 2026)
- **F2:** Lead pagination — `GET /api/leads` is now OPT-IN paginated: no `page`/`limit` params → full array as before (all the other consumers depend on this); with them → `{ data, page, limit, total, totalPages }`. Paginated mode also does server-side filtering via `search`/`country`/`language`/`state`/`status`. New `storage.getLeadsPage()` (SQL `LIMIT`/`OFFSET` + `COUNT`) and `storage.getLeadFacets()` + `GET /api/leads/facets` (distinct values for the filter dropdowns without downloading every row). Leads page **list/table view** is server-paginated with Prev / numbered / Next controls (debounced search resets to page 1; selection persists across pages for bulk ops). Territory & Map views still load the full set on demand; CSV export pulls the full filtered set so it's not capped to one page.
- **F12:** Better API error messages — `server/lib/http-errors.ts` `zodError()`/`zodMessage()` turn `error.flatten()` into a human-readable `error` string plus structured `fieldErrors`/`formErrors`. All ~30 `parsed.error.flatten()` responses in `routes.ts` now use it; bulk-import per-row errors use `zodMessage()`. Client `throwIfResNotOk()` parses the JSON body and surfaces the server's `error`/`message` so toasts show what actually went wrong (wired `AddLeadDialog`/`EditLeadDialog` `onError`).

---

## What still needs to be done

See `ROADMAP.md` in this repo for the full list. Quick summary:

### 🔴 Requires your credentials (you must do these)
1. **Configure SMTP** in Settings → Email Configuration (Gmail App Password or SendGrid)
2. **Verify Turso persistence**: load demo data → wait 20 min → cold start → check leads still there
3. **Stripe billing**: create Stripe account, add products, put keys in Render env vars, then ask Claude to wire checkout
4. **Twilio SMS**: create account, buy number, put keys in Render env vars, then ask Claude to wire it
5. **Custom domain**: buy domain, add CNAME in Render

### 🟠 Code bugs (Claude can fix)
- **B6**: Pipeline drag-and-drop doesn't persist status (card snaps back on refresh)
- **B8**: Calendar booking page creates meeting but sends no confirmation email

### 🟡 Features to build (Claude can build)
- ~~**F2**: Lead pagination (`/api/leads?page=1&limit=50`)~~ ✅ done (Sprint 6)
- ~~**F3**: Per-step campaign analytics~~ ✅ done (Sprint 5)
- ~~**F8**: Mobile layout fixes~~ ✅ done (Sprint 5)
- ~~**F15**: Export analytics as PNG/PDF~~ ✅ done (Sprint 5)
- **IMAP reply detection** (needs your email credentials in Render env vars)

---

## Deployment notes

- Render free tier: spins down after 15 min idle, cold start ~30s. Starter $7/mo keeps it always-on.
- Build: `npm install && npm run build` → `node dist/index.cjs`
- Env vars in Render: `DATABASE_URL`, `DATABASE_AUTH_TOKEN` (Turso). Add Stripe/Twilio keys when ready.
- SQLite file: uses `/tmp` in Render (detected via `RENDER` env var). Turso replication keeps data durable.

---

## Workflow preferences

- **Autonomous sprints**: user wants multi-agent parallel sprints. Always use the Workflow tool for batches of 3+ changes. After each sprint, update this file and ROADMAP.md.
- **Commit style**: sprint-based commits with full summary message. Always push after committing.
- **After each session**: update the "Sprint history" section above and the ROADMAP.md done list.
- **No blue**: brand uses red-to-teal gradients only. Reject blue anywhere in UI.
