# GlobalReach CRM — Roadmap & Fix List
_Last updated: 2026-06-06. Working deployment: https://globalreach-kph0.onrender.com_

---

## 🔴 YOU MUST DO THESE — Requires your credentials or manual action

These can't be done by Claude. They need your accounts, API keys, or physical action.

### 1. SMTP Email (required for campaign sending to actually work)
The campaign scheduler (`server/lib/campaign-scheduler.ts`) runs every 60s but silently skips
sending if SMTP isn't configured. Go to **Settings → Email Configuration** and fill in:
- SMTP Host (e.g. `smtp.gmail.com` for Gmail, `smtp.sendgrid.net` for SendGrid)
- SMTP Port (587 for TLS, 465 for SSL)
- Username / Password (for Gmail: use an App Password, not your real password)
- From Name / From Email
- Click **Test Connection** to verify, then Save

Recommended free option: **SendGrid free tier** (100 emails/day) or **Gmail App Password**.

### 2. Verify Turso Persistence (10-minute test)
Data should now survive cold starts, but it's never been formally confirmed:
1. Load demo data (Settings → Demo Data → Load Demo Data)
2. Wait 20 minutes idle (Render spins down after ~15 min)  
3. Open https://globalreach-kph0.onrender.com — wait for cold start (~30s)
4. Check Leads — if "Jordan Mitchell" and the demo leads are still there, Turso is working ✅

If they're gone: the token may be wrong or expired. Go to app.turso.tech → globalreach database → Tokens → create a new one → paste into Render env vars as `DATABASE_AUTH_TOKEN`.

### 3. Custom Domain
Currently live at `globalreach-kph0.onrender.com` (Render's auto-generated URL).
To have `globalreach.com` or `app.globalreach.io`:
1. Buy a domain (Namecheap, Cloudflare, etc.)
2. In Render dashboard → your service → Settings → Custom Domain → Add
3. Add the CNAME record your registrar shows you

### 4. Stripe Billing Integration
The landing page shows pricing (Free / Pro $49 / Business $149) but clicking does nothing.
To wire up real payments:
1. Create a Stripe account at stripe.com
2. Add two products in Stripe dashboard: "Pro" ($49/mo) and "Business" ($149/mo)
3. Copy the **Price IDs** for each
4. Add to Render env vars:
   - `STRIPE_SECRET_KEY` = `sk_live_...`
   - `STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
   - `STRIPE_PRO_PRICE_ID` = `price_...`
   - `STRIPE_BUSINESS_PRICE_ID` = `price_...`
5. Tell Claude "add Stripe billing" — the backend + checkout UI can then be built

### 5. Twilio SMS Integration
The campaign step `channel: "sms"` exists and marks messages as "sent" but doesn't actually
send any SMS. To activate:
1. Create a Twilio account at twilio.com (trial gives ~$15 credit)
2. Buy a phone number
3. Add to Render env vars:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_FROM_NUMBER` (e.g. `+12125551234`)
4. Tell Claude "wire Twilio SMS" — the scheduler already has the hook, just needs the client

### 6. Upgrade Render Plan (optional but recommended)
Free tier limitations:
- **Spins down after 15 min idle** — first visitor after idle waits ~30s for cold start
- **No persistent disk** — Turso solves data durability but build artifacts reset
- Starter plan ($7/mo) keeps the server always-on

### 7. Reply Detection (IMAP)
Inbound replies show as "message.inbound" only if you manually create them via API.
Real reply detection needs IMAP access to your sending email:
- Add `IMAP_HOST`, `IMAP_USER`, `IMAP_PASS`, `IMAP_PORT` to Render env vars
- Tell Claude "add IMAP reply detection" — it will build a polling listener

---

## 🟠 BUGS TO FIX — Code issues (Claude can fix these)

### B1. Automations don't fire on most triggers
**Status:** Only `form_submitted` trigger works. `lead_created`, `status_changed`, and
`campaign_replied` triggers are defined in the UI builder but never evaluated in routes.ts.
**Fix:** Add trigger evaluation after `createLead`, `updateLead` (status change), and
`createMessage` (inbound) in routes.ts — same pattern as form_submitted.

### B2. Campaign enrollment is not discoverable
**Status:** The only way to enroll leads in a campaign is the bulk-actions bar (select leads →
"Enroll in Campaign"). There's no button in the campaign detail, lead detail, or anywhere obvious.
**Fix:** Add "Enroll Leads" button to campaign detail page + "Enroll in Campaign" tab in LeadDetailSheet.

### B3. "Clear All Data" button is a stub
**Status:** Settings → Demo Data → Clear All Data opens a confirm dialog but then shows an
informational toast saying it's "not implemented via UI." 
**Fix:** Wire it to POST `/api/leads/bulk-delete` with all lead IDs, plus similar for campaigns/jobs.

### B4. Webhook retry is fire-and-forget
**Status:** Webhooks fire once. On failure, `failureCount` increments and at 10 failures the
webhook auto-disables — but there's no retry with backoff.
**Fix:** Add exponential backoff retry (1s, 2s, 4s, 8s) inside `deliverWebhook()` in `server/lib/webhooks.ts`.

### B5. Form submissions don't auto-convert to leads
**Status:** When someone submits a public form, a `form_submission` row is created and
`automations` may fire. But `convertedLeadId` is never set and no lead is automatically created
from the submission data.
**Fix:** In the form submission route, if the form fields include email+name, auto-create a lead
and set `convertedLeadId`.

### B6. Pipeline drag-and-drop status update
**Status:** Dragging a card between columns on the Pipeline board does NOT persist the new
status — the card snaps back after page refresh. The UI optimistically moves cards but the
PATCH may be failing silently.
**Fix:** Verify the drag-end handler calls PATCH `/api/leads/:id` with the new status, and
add error handling that reverts the move on failure.

### B7. Inbox marks messages as read but doesn't persist
**Status:** Opening a message thread in the Inbox shows "opened" status visually but the API
call to update the message status may not be wired.
**Fix:** Audit the Inbox component for the missing `updateMessage` call on thread open.

### B8. Calendar booking link doesn't send confirmation
**Status:** `/book` page lets visitors book a meeting and creates a `meeting` row, but no
confirmation email is sent to the visitor or the host.
**Fix:** After `createMeeting` in routes.ts, call `sendEmail()` with a confirmation template.

---

## 🟡 FEATURES TO BUILD — No credentials needed (Claude can do these)

### F1. Automation triggers (B1 above + UI side)
Fire `lead_created` and `status_changed` triggers when those events happen in routes.ts.
The automation engine already has the action execution code — just needs trigger evaluation.

### F2. Lead pagination ✅ DONE (Sprint 6)
~~The `/api/leads` endpoint returns ALL leads. At 500+ leads, this causes slow loads and
memory pressure. Add `?page=1&limit=50` pagination on both the API and the Leads page table.~~
Shipped: opt-in `?page&limit` (returns full array when omitted, so existing consumers are
unaffected) with server-side `search`/`country`/`language`/`state`/`status` filtering +
`GET /api/leads/facets`; Leads list/table view is server-paginated with Prev/numbered/Next
controls. Also F12: `zodError()` helper surfaces Zod validation details in API responses + toasts.

### F3. Campaign analytics per step ✅ DONE (Sprint 5)
~~The campaign detail page shows overall sent/opened/replied counts. It should show
per-step performance: how many leads are on step 1 vs. step 2 vs. step 3, and
open/reply rate per step.~~ Shipped: `messages.stepId` + `GET /api/campaigns/:id/step-stats`
+ "Per-Step Performance" card.

### F4. Dashboard widgets: Top leads to contact today
Using lead score + last contacted date, show "Top 5 leads to reach today" on the dashboard —
highest score leads that haven't been contacted in the longest time.

### F5. Email template library
The step editor (`StepEditor.tsx`) has a plain textarea. Add a "Templates" dropdown with
5–10 pre-written email templates (intro, follow-up, breakup email, case study, etc.)
that users can insert and edit.

### F6. Lead deduplication on import
The CSV importer doesn't check for duplicates. Importing the same file twice creates duplicates.
Add email-based dedup: before inserting, check if a lead with the same email already exists.

### F7. Improved Cmd+K search palette
Currently the search palette shows page shortcuts but doesn't search leads/campaigns by name.
Add live fuzzy search across leads (by name/company/email) and campaigns (by name).

### F8. Better mobile layout ✅ DONE (Sprint 5)
~~Several pages are unusable on mobile:
- Pipeline (Kanban board overflows horizontally)
- Analytics (charts are too wide)
- FindLeads (filter panel pushes content off screen)~~
Shipped: Pipeline horizontal-scroll snap lanes; Analytics chart cards `min-w-0`;
FindLeads filter row collapses behind a "Filters" toggle. Also fixed the AppShell
header (icon-only toggles below `sm`) — the real cause of page-wide horizontal scroll.

### F9. Activity log in seed data
When demo data is loaded (POST /api/seed), no activity log entries are created.
Add `storage.logActivity()` calls in the seed runner so new users immediately see
activity on the dashboard.

### F10. Real-time notification badges
Add unread-count badges to sidebar nav items:
- Inbox: count of unread inbound messages
- Calendar: count of meetings today
- Pipeline: count of leads that changed status today

### F11. API rate limiting
No rate limiting on any endpoint. A script could hammer `/api/leads` or `/api/seed`
repeatedly. Add `express-rate-limit` middleware (100 req/min per IP is a safe default).

### F12. Better error messages from the API
Many endpoints return `{ error: "Failed to create lead" }` without detail. The Zod
validation errors (`error.flatten()`) could be surfaced more helpfully in toasts.

### F13. Lead tags autocomplete
The tags field on AddLeadDialog and EditLeadDialog is a free-text input.
Add an autocomplete dropdown that shows existing tags (from all leads) as suggestions.

### F14. Analytics date filter
The analytics page shows all-time data. Add a date range picker (Last 7 days / 30 days /
90 days / All time) and filter the charts accordingly.

### F15. Export analytics as PDF/PNG ✅ DONE (Sprint 5)
~~Add a "Export" button to the Analytics page that captures the charts and stat cards
as a PDF or PNG for sharing with stakeholders.~~ Shipped: html2canvas + jspdf
(lazy-loaded) behind an "Export" dropdown on both analytics views.

---

## 🟢 DONE — Shipped and verified

| Feature | Commit | Notes |
|---|---|---|
| Bind to 0.0.0.0 (site was unreachable) | 2a5e4a3 | Was broken since the beginning |
| Bootstrap DB tables on startup | 9148ee0 | 7 tables were never created in prod |
| Consumer toggle crash (React #300) | e1650fa | `useLocation` was below an early return |
| Turso durable storage | 508be10 | libsql embedded replica, verified working |
| Analytics recharts charts | e24ee0b | 4 chart types on Analytics page |
| Campaign email scheduler | e24ee0b | 60s polling, SMTP send, token substitution |
| Landing page (stats bar, features, pricing, footer) | e24ee0b | Full marketing page |
| Lead activity timeline (tabs in detail sheet) | e24ee0b | Overview/Activity/Notes tabs |
| CSV export on Leads page | e24ee0b | RFC-compliant CSV download |
| Demo Data button in Settings | e24ee0b | POST /api/seed one-click load |
| React Error Boundary | e24ee0b | Catches render crashes, shows recovery UI |
| Activity log table + storage methods | e24ee0b | `activity_log` table, logActivity/getActivity |
| Notes column on leads | a5b550f | Missing from schema — added with migration |
| Activity log hooked into routes | 0a2121b | lead.created, status.changed, message events |
| Dashboard recent activity feed | 0a2121b | Auto-refreshing last 10 events |
| getRecentActivity storage method | (next push) | Clean method, no dynamic import |
| F8 mobile layouts (Pipeline/Analytics/FindLeads + header) | (Sprint 5) | Scroll lanes, responsive charts, collapsible filters |
| F3 per-step campaign analytics | (Sprint 5) | `messages.stepId` + step-stats endpoint + card |
| F15 export analytics PNG/PDF | (Sprint 5) | html2canvas + jspdf, lazy-loaded |
| CJS `import.meta.url` polyfill in build | (Sprint 5) | Fixes dev/prod `__dirname` derivation |

---

## 🗓️ Suggested Priority Order

**This week (do in order):**
1. ✅ Verify Turso persistence (20-min cold start test) — YOU
2. Configure SMTP in Settings — YOU  
3. Ask Claude to fix B1 (automation triggers), B2 (enrollment UI), B3 (clear data)
4. Ask Claude to build F7 (Cmd+K lead search) and F4 (top leads widget)

**Next sprint:**
5. Set up Stripe — YOU (1 hour)
6. Ask Claude to build Stripe checkout flow
7. Ask Claude to build F2 (pagination), F6 (dedup on import), F11 (rate limiting)

**Later:**
8. Set up Twilio — YOU
9. Custom domain — YOU
10. Ask Claude to build F3 (per-step analytics), F10 (notification badges)
11. Ask Claude to build IMAP reply detection after you provide creds

---

_This file lives at `GlobalReach-source/ROADMAP.md`. Claude updates it after each sprint._
