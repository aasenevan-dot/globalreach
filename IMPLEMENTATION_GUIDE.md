# GlobalReach CRM - UX Improvements Feature Implementation Guide

This document describes the UX improvements feature implementation with empty states, loading skeletons, quick-start onboarding, bulk operations, and advanced filtering.

## Overview

The implementation focuses on four key UX improvements:
1. **Empty States** - Better visual feedback when sections have no data
2. **Skeleton Loaders** - Loading placeholders for slow data-loading pages
3. **Quick-Start Onboarding** - Guided modal for first-time users
4. **Bulk Operations** - Batch actions on leads and campaigns
5. **Advanced Filtering** - Filter UI with AND/OR logic

## Files Added/Modified

### Frontend Components

#### 1. **EmptyState.tsx** - Reusable empty state component
Location: `/client/src/components/EmptyState.tsx`

Displays when sections have no data with optional CTA buttons.

```tsx
<EmptyState
  icon={<Users className="h-8 w-8" />}
  title="No leads yet"
  description="Start by importing leads or searching our verified database"
  action={{ label: "Find Leads", onClick: () => navigate("/find") }}
/>
```

#### 2. **SkeletonCard.tsx** - Reusable skeleton loaders
Location: `/client/src/components/SkeletonCard.tsx`

Three skeleton components:
- `SkeletonCard` - Generic card placeholder
- `SkeletonTableRow` - Table row placeholder
- `SkeletonListItem` - List item placeholder

#### 3. **QuickStartModal.tsx** - Onboarding modal
Location: `/client/src/components/QuickStartModal.tsx`

Auto-shows on first visit (checks `localStorage`). Features:
- 3-step guided walkthrough
- Different flows for B2B vs B2C modes
- Dismiss button to hide permanently
- Keyboard shortcut hints

**Integration in App.tsx:**
```tsx
import { QuickStartModal } from "@/components/QuickStartModal";

// Inside <AppShell> component
<QuickStartModal />
```

#### 4. **FilterPanel.tsx** - Advanced filtering UI
Location: `/client/src/components/FilterPanel.tsx`

Provides:
- Industry filter (multi-select)
- Title level / Seniority filter
- Company size filter
- Country filter
- AND/OR logic toggle
- Clear all button

**Integration in FindLeads.tsx:**
```tsx
const [filters, setFilters] = useState<FilterState>({
  industries: [],
  titleLevels: [],
  companySizes: [],
  countries: [],
  logic: "and",
});

<FilterPanel
  filters={filters}
  onFiltersChange={setFilters}
  industries={meta?.industries ?? []}
  titleLevels={meta?.titleLevels ?? []}
  companySizes={meta?.companySizes ?? []}
  countries={meta?.countries ?? []}
/>
```

#### 5. **BulkActionBar.tsx** - Sticky bottom action bar
Location: `/client/src/components/BulkActionBar.tsx`

Shows when items are selected. Provides:
- Selected count badge
- Change status dropdown
- Enroll in campaign action
- Send message action
- Add tags action
- Delete with confirmation dialog

### Backend Routes & Services

#### 1. **webhook-schema.ts** - Webhook type definitions
Location: `/shared/webhook-schema.ts`

Defines:
- WEBHOOK_EVENTS enum (lead.created, lead.updated, etc.)
- Registration schema
- Payload schema
- HMAC-SHA256 signature helpers

#### 2. **server/lib/webhooks.ts** - Webhook manager
Location: `/server/lib/webhooks.ts`

WebhookManager class provides:
- `registerWebhook(url, events, secret)` - Register new webhook
- `getWebhooks()` - List active webhooks
- `getWebhooksByEvent(event)` - Filter by event type
- `fireEvent(event, data)` - Trigger event to all subscribed webhooks
- `deactivateWebhook(id)` - Disable webhook

**Usage:**
```typescript
import { webhookManager } from "./lib/webhooks";

// Fire event when lead status changes
await webhookManager.fireEvent("lead.status_changed", {
  leadId: 123,
  oldStatus: "new",
  newStatus: "contacted"
});
```

#### 3. **routes-bulk-ops.ts** - Bulk operation endpoints
Location: `/server/routes-bulk-ops.ts`

Provides these endpoints:

**POST /api/leads/bulk-enroll-campaign**
```json
{
  "leadIds": [1, 2, 3],
  "campaignId": 5
}
```
Response: `{ enrolled: 3, campaignId: 5, campaignName: "..." }`

**POST /api/leads/bulk-email**
```json
{
  "leadIds": [1, 2, 3],
  "subject": "Check this out",
  "body": "...",
  "channel": "email"
}
```
Response: `{ sent: 3, channel: "email", messageIds: [...] }`

**POST /api/webhooks/register**
```json
{
  "url": "https://example.com/webhooks",
  "events": ["lead.created", "campaign.started"],
  "secret": "your-secret-key"
}
```

**GET /api/webhooks**
Returns all active webhooks.

**DELETE /api/webhooks/:id**
Deactivates a webhook.

### Database Migrations

**File:** `/server/db-migration-webhooks.sql`

Creates two tables:
- `webhooks` - Registered webhook endpoints with event subscriptions
- `webhook_deliveries` - Log of all webhook delivery attempts

## Integration Steps

### Step 1: Add QuickStartModal to App
```tsx
// client/src/App.tsx
import { QuickStartModal } from "@/components/QuickStartModal";

function AppRouter() {
  return (
    <AppShell onOpenSearch={openSearch}>
      <QuickStartModal />
      {/* ... rest of routes ... */}
    </AppShell>
  );
}
```

### Step 2: Update Dashboard with Empty States
```tsx
// client/src/pages/Dashboard.tsx
import { EmptyState } from "@/components/EmptyState";
import { Users, Plus } from "lucide-react";

export default function Dashboard() {
  // ... existing code ...

  if (leads?.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="No leads in pipeline"
        description="Start building your pipeline by finding and importing leads"
        action={{ label: "Find Leads", onClick: () => navigate("/find") }}
        secondaryAction={{ label: "Import CSV", onClick: () => setShowImport(true) }}
      />
    );
  }

  // ... existing dashboard rendering ...
}
```

### Step 3: Update Leads page with Bulk Actions
```tsx
// client/src/pages/Leads.tsx
import { BulkActionBar } from "@/components/BulkActionBar";

export default function Leads() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/leads/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
    },
  });

  return (
    <>
      {/* ... existing leads table ... */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onDelete={() => deleteMutation.mutate()}
        onStatusChange={(status) => {
          // Call bulk-status endpoint
        }}
        onEnrollCampaign={() => {
          // Open campaign selection modal
        }}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
```

### Step 4: Update FindLeads with FilterPanel
```tsx
// client/src/pages/FindLeads.tsx
import { FilterPanel, FilterState } from "@/components/FilterPanel";

export default function FindLeads() {
  const [filters, setFilters] = useState<FilterState>({
    industries: [],
    titleLevels: [],
    companySizes: [],
    countries: [],
    logic: "and",
  });

  const params = new URLSearchParams({
    ...(debouncedQ && { q: debouncedQ }),
    ...(filters.industries.length > 0 && { industries: filters.industries.join(",") }),
    ...(filters.titleLevels.length > 0 && { titleLevels: filters.titleLevels.join(",") }),
    ...(filters.companySizes.length > 0 && { companySizes: filters.companySizes.join(",") }),
    ...(filters.countries.length > 0 && { countries: filters.countries.join(",") }),
    ...(filters.logic === "or" && { logic: "or" }),
    page: String(page),
  });

  return (
    <div className="space-y-6">
      {/* Existing search UI */}
      <FilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        industries={meta?.industries ?? []}
        titleLevels={meta?.titleLevels ?? []}
        companySizes={meta?.companySizes ?? []}
        countries={meta?.countries ?? []}
      />
      {/* ... rest of page ... */}
    </div>
  );
}
```

### Step 5: Register Bulk Routes in server/index.ts
```typescript
import { registerBulkRoutes } from "./routes-bulk-ops";

// After other route registrations
registerBulkRoutes(app);
```

### Step 6: Run Database Migration
```bash
# Apply webhooks migration
sqlite3 data.db < server/db-migration-webhooks.sql

# Or run migrations programmatically in storage.ts
const migrateWebhooks = () => {
  try {
    sqlite.exec(fs.readFileSync("server/db-migration-webhooks.sql", "utf-8"));
  } catch (err) {
    console.error("Webhook migration failed:", err);
  }
};
```

## Component Usage Examples

### Empty State
```tsx
<EmptyState
  icon={<Package className="h-8 w-8" />}
  title="No campaigns yet"
  description="Create your first campaign to start multi-channel outreach"
  action={{ label: "New Campaign", onClick: handleCreate }}
/>
```

### Skeleton Loaders
```tsx
{isLoading ? (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <SkeletonListItem key={i} />
    ))}
  </div>
) : (
  <YourContent />
)}
```

### Bulk Actions
```tsx
<BulkActionBar
  selectedCount={selectedIds.size}
  onStatusChange={(status) => updateStatus.mutate(status)}
  onDelete={() => deleteMutation.mutate()}
  onEnrollCampaign={() => openCampaignModal()}
  isPending={updateStatus.isPending || deleteMutation.isPending}
/>
```

### Filter Panel
```tsx
<FilterPanel
  filters={filters}
  onFiltersChange={setFilters}
  industries={["SaaS", "Finance", "Healthcare"]}
  titleLevels={["c-suite", "vp", "director"]}
  companySizes={["1-10", "11-50", "51-200"]}
  countries={["United States", "Canada"]}
/>
```

## Webhook Integration Example

### Register a webhook endpoint:
```bash
curl -X POST http://localhost:5000/api/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks",
    "events": ["lead.created", "lead.status_changed"],
    "secret": "your-secret-key-here"
  }'
```

### Verify webhook signature in your endpoint:
```typescript
import crypto from 'crypto';

app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  const expected = crypto
    .createHmac('sha256', 'your-secret-key')
    .update(payload)
    .digest('hex');
  
  if (signature === expected) {
    console.log('Webhook verified:', req.body.event);
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Invalid signature' });
  }
});
```

## Testing Checklist

- [ ] Empty states appear when no data exists
- [ ] Skeleton loaders show while data loads
- [ ] QuickStartModal appears on first visit, hides on dismiss
- [ ] BulkActionBar shows with correct action count
- [ ] Bulk delete confirms before deleting
- [ ] FilterPanel saves state across page navigation
- [ ] Webhooks fire on lead creation/update
- [ ] Webhook signatures verify correctly
- [ ] Bulk enroll endpoint works
- [ ] Bulk email endpoint creates messages

## Performance Considerations

1. **Webhook delivery** - Uses Promise.allSettled() to avoid blocking on failures
2. **Filter state** - Stored in component state, consider persisting to URL params
3. **Bulk operations** - Batch processing recommended for 1000+ items
4. **Skeleton loaders** - Use consistent heights to avoid layout shift

## Future Enhancements

1. Persist filter state to URL query parameters
2. Add webhook retry queue with exponential backoff
3. Webhook delivery analytics and dashboard
4. Bulk import progress tracking
5. Template library for bulk email campaigns
6. A/B testing for bulk campaigns
7. Scheduled bulk operations
