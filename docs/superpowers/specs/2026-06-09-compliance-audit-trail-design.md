# Compliance Audit Trail — Design Spec

_Date: 2026-06-09 · Status: approved for planning · Module 1 of the "Veeva-inspired" series_

## Background & motivation

GlobalReach is a horizontal SMB sales CRM. Veeva Systems wins life sciences by being
**compliance-grade**: validated systems with a complete, tamper-evident record of every
data change (21 CFR Part 11). This module brings that single most-credible
"enterprise / regulated-ready" capability to GlobalReach: a **compliance audit trail** —
an immutable, field-level history of every change to every core record, surfaced in a
dedicated **Audit** tab.

This is **pure observability**. It records what happened; it never gates, blocks, or
requires approval for any action. (Approvals were explicitly ruled out.)

### What already exists (and what we are NOT touching)

- `activity_log` table — a **lead-scoped, human-readable business feed** ("Status changed
  → won"), written manually per-route via `storage.logActivity(...)`. It has no
  before/after values and does not cover non-lead entities. **We leave it exactly as-is.**
  It serves a different purpose (timeline of business events) than the audit trail
  (forensic record of data mutations).
- `DatabaseStorage` (`server/storage.ts`) exposes clean `create*/update*/delete*` methods
  for every entity. This is the single choke point we use to capture mutations.

## Goals

1. Every create / update / delete of a core entity is recorded automatically, with a
   field-level before→after diff. No mutation path can silently bypass it.
2. The record is **tamper-evident**: a hash chain lets an auditor verify nothing was
   silently edited or deleted after the fact.
3. A first-class **Audit** tab: filter, inspect field-level changes, export to CSV, and
   see an integrity-verified badge.
4. Zero approval/sign-off behavior. Read-only.

## Non-goals (v1)

- No approval/review/locking workflows of any kind.
- No embedded history tab inside every detail sheet yet (the Audit tab deep-links to a
  single record's history; embedded timelines are a fast-follow).
- No per-user RBAC. GlobalReach is effectively single-operator today; we capture the best
  available actor identity and source, designed to extend cleanly when RBAC lands.
- No editing or deleting of audit rows from the UI (append-only by design).

## Architecture

### Capture mechanism — storage-layer interception (chosen)

Considered three options:

| Approach | Coverage | Verdict |
|---|---|---|
| **Storage-layer helper (chosen)** | Complete — UI, campaign scheduler, automations, webhooks, bulk ops, imports all pass through `DatabaseStorage` | ✅ |
| Express route logging | Misses scheduler/automation/bulk writes that don't go through routes | ✗ blind spots |
| SQLite triggers | Tamper-proof but no actor/source context at the DB layer; JSON diffing in SQL; fights the Turso embedded-replica setup | ✗ |

A single helper is invoked inside each storage mutation:

```
recordAudit(entity, entityId, action, before, after)
```

- On **create**: `before = null`, `after = newRow` → diff lists every non-null field as added.
- On **update**: read the prior row first, `before = priorRow`, `after = updatedRow` →
  diff lists only changed fields.
- On **delete**: `before = priorRow`, `after = null`.

The diff is computed by a pure function `computeDiff(before, after)` returning
`[{ field, before, after }]`, skipping unchanged fields and noisy columns
(e.g. `updatedAt`).

### Actor / source context — `AsyncLocalStorage`

To avoid threading actor params through ~30 storage methods, a Node `AsyncLocalStorage`
holds a per-request audit context `{ actor, actorType, source }`:

- Express middleware sets it for each HTTP request (`actorType: "user"`, source like
  `"ui"` or the route path).
- The campaign scheduler / automation runners set it to
  `{ actorType: "automation", source: "scheduler" }`.
- Imports set `actorType: "import"`; webhook-driven writes set `actorType: "api"`.
- Default outside any context: `{ actorType: "system" }`.

`recordAudit` reads the current context; storage method signatures are unchanged.

### Tamper-evidence — hash chain

Each row stores:

- `prevHash` — the `hash` of the previous audit row (empty string for the first row).
- `hash = sha256(prevHash + canonicalJSON(rowWithoutHash))`.

`GET /api/audit/verify` recomputes the chain from the first row and reports the first
broken link (silently edited/deleted row) or "intact". A canonical JSON serializer
(sorted keys) keeps hashes stable.

## Data model

New table `audit_log`:

| column | type | notes |
|---|---|---|
| `id` | integer PK autoincrement | also chain order |
| `entity` | text | e.g. `"lead"`, `"campaign"`, `"step"` |
| `entityId` | integer | id within that entity (null for settings singleton → use 0) |
| `action` | text | `create` \| `update` \| `delete` |
| `changes` | text (JSON) | `[{ field, before, after }]` |
| `actor` | text | best-available identity label (e.g. `"operator"`) |
| `actorType` | text | `user` \| `system` \| `automation` \| `api` \| `import` |
| `source` | text | e.g. `"ui"`, `"scheduler"`, `"import"`, route path |
| `summary` | text | human line, e.g. `"Lead #42 status engaged → won"` |
| `createdAt` | text (ISO) | server timestamp |
| `prevHash` | text | chain link |
| `hash` | text | this row's hash |

Append-only: no update/delete methods are exposed for this table.

### Entity coverage (v1)

leads, campaigns, steps, messages, jobs, forms, formSubmissions, funnels, automations,
meetings, settings. (Webhook delivery logs, reminders, saved filters, calendar settings
are low-value/noisy and excluded from v1; easy to add later.)

An entity registry maps each storage method group to its `entity` name and id accessor,
keeping `recordAudit` calls uniform.

## API

- `GET /api/audit` — filters: `entity`, `entityId`, `action`, `actorType`, `from`, `to`,
  `q` (free-text over summary/changes), plus `page` / `limit`. Returns
  `{ data, page, limit, total, totalPages }` (matches the existing opt-in pagination
  convention).
- `GET /api/audit/record/:entity/:id` — full timeline for one record (newest first).
- `GET /api/audit/export.csv` — same filters, streamed CSV for auditor export.
- `GET /api/audit/verify` — `{ intact: boolean, brokenAtId?: number, checked: number }`.

All read-only. No POST/PUT/DELETE endpoints for audit data.

## UI — the Audit tab

A new top-level nav item **Audit** (teal/red palette, **no blue**), page `/#/audit`:

- **Filter bar:** entity dropdown, action dropdown, actor-type dropdown, date range,
  free-text search.
- **Integrity badge:** calls `/api/audit/verify` — green "Integrity verified" or red
  "Tampering detected at #N".
- **Table:** timestamp · entity (#id) · action chip · actor/source · summary. Row expands
  to a field-level diff table (`field`, `before` → `after`, before in muted red, after in
  teal).
- **Export CSV** button (respects active filters).
- **Deep link:** `/#/audit?entity=lead&entityId=42` filters to one record's history. The
  Lead detail sheet gets a small "View full history" link that opens this. (Embedded
  in-sheet timeline = fast-follow, out of v1 scope.)

## Error handling

- Audit writes never block the primary operation: `recordAudit` runs inside the same
  logical flow but a failure is caught and logged (the user's create/update/delete still
  succeeds). A failed audit write is itself logged to stderr. (Rationale: a CRM that
  refuses to save because the audit logger hiccupped is worse than a single missing audit
  row; the verify endpoint will still surface gaps.)
- `verify` is read-only and side-effect free.

## Testing

- **Unit:** `computeDiff` (added/changed/removed/unchanged, noisy-field skipping);
  `hash`/`canonicalJSON` stability; chain `verify` detects an edited row and a deleted row.
- **Integration:** updating a lead writes exactly one `audit_log` row with correct
  before/after for the changed field and `actorType: "user"`; the campaign scheduler
  writing a message logs `actorType: "automation"`.
- **API:** `GET /api/audit` filters and paginates; `export.csv` returns well-formed CSV;
  `verify` returns `intact: true` on a clean chain.

## Rollout

1. Schema + migration for `audit_log`.
2. `computeDiff`, canonical JSON, hashing utilities (pure, unit-tested).
3. `AsyncLocalStorage` context + Express middleware + scheduler/import wiring.
4. `recordAudit` helper + entity registry; integrate into each `DatabaseStorage` mutation.
5. Audit API routes.
6. Audit tab UI + nav entry + Lead-detail deep link.
7. Tests throughout.

Each step is independently verifiable; the trail starts capturing as soon as step 4 lands,
before any UI exists.
