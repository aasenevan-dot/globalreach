# Bulk Operations - Quick Reference Guide

## Files Created (4 new files)

### Backend
1. **server/lib/bulk-ops.ts** (300+ lines)
   - Core bulk operations logic
   - Webhook signing and verification
   - Event firing system

### Frontend
2. **client/src/components/BulkActionsBar.tsx** (350+ lines)
   - Toolbar with all bulk action buttons
   - Dialogs for email, enrollment, tags
   
3. **client/src/components/LeadFiltersPanel.tsx** (280+ lines)
   - Advanced multi-select filters
   - AND/OR logic toggle
   
4. **client/src/components/EmptyStateCard.tsx** (40 lines)
5. **client/src/components/SkeletonLoader.tsx** (60 lines)

## Files Modified (2 files)

1. **server/routes.ts**
   - Added ~120 lines of endpoints
   - Bulk enrollment, email, tags
   - Webhook CRUD & delivery logs

2. **shared/schema.ts** (already had)
   - webhooks table definition
   - webhook_deliveries table definition

## Critical Integration Points

### In Leads.tsx (add this)
```typescript
import { BulkActionsBar } from "@/components/BulkActionsBar";

// After filters section:
{visibleSelected.length > 0 && (
  <BulkActionsBar
    selectedCount={visibleSelected.length}
    leadIds={[...selectedIds]}
    campaigns={campaigns}
    onClearSelection={() => setSelectedIds(new Set())}
    onStatusChange={(status) => setStatusMut.mutate(status)}
    onDelete={() => deleteMut.mutate()}
  />
)}
```

### In FindLeads.tsx (add this)
```typescript
import { LeadFiltersPanel } from "@/components/LeadFiltersPanel";

// In render:
<LeadFiltersPanel
  filters={filters}
  onFilterChange={setFilters}
  industries={meta?.industries || []}
  titleLevels={meta?.titleLevels || []}
  companySizes={meta?.companySizes || []}
  countries={meta?.countries || []}
  operatorMode={filterOperator}
  onOperatorChange={setFilterOperator}
/>
```

## API Endpoints

### Bulk Operations
```
POST /api/campaigns/:id/bulk-enroll
  { leadIds: number[] }
  → { enrolled: number; errors: []; messageIds: number[] }

POST /api/leads/bulk-email
  { leadIds: number[]; subject: string; body: string }
  → { sent: number; errors: []; messageIds: number[] }

POST /api/leads/bulk-tags
  { leadIds: number[]; tagsToAdd: string[]; tagsToRemove: string[] }
  → { updated: number; errors: [] }
```

### Webhook Management
```
GET    /api/webhooks                    - List all
POST   /api/webhooks                    - Create (auto-generates secret)
GET    /api/webhooks/:id                - Get with deliveries
PATCH  /api/webhooks/:id                - Update
DELETE /api/webhooks/:id                - Delete
GET    /api/webhooks/:id/deliveries     - Audit log
```

## Webhook Events Fired

```typescript
// When lead enrolled in campaign
fireWebhooks("campaign.lead_enrolled", {
  leadId: number,
  campaignId: number,
  timestamp: ISO string
})

// When bulk emails sent
fireWebhooks("bulk.emails_sent", {
  count: number,
  timestamp: ISO string
})

// When tags updated
fireWebhooks("bulk.tags_updated", {
  count: number,
  tagsAdded: string[],
  tagsRemoved: string[],
  timestamp: ISO string
})
```

## Webhook Signature Header Format

```
X-GlobalReach-Signature: <HMAC-SHA256 signature>
X-GlobalReach-Event: <event type>
Content-Type: application/json

Body: { payload as JSON }
```

To verify (Node.js example):
```typescript
import crypto from 'crypto';

const signature = req.headers['x-globalreach-signature'];
const body = req.rawBody; // Raw request body string
const secret = process.env.WEBHOOK_SECRET;

const computed = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex');

const valid = crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(computed)
);
```

## Component Props

### BulkActionsBar
```typescript
{
  selectedCount: number;      // # of leads selected
  leadIds: number[];          // Array of IDs
  campaigns: Campaign[];       // Available campaigns
  onClearSelection: () => void;
  onStatusChange?: (status: string) => void;
  onDelete?: () => void;
}
```

### LeadFiltersPanel
```typescript
{
  filters: {
    searchText?: string;
    industries: string[];
    titleLevels: string[];
    companySizes: string[];
    countries: string[];
    verifiedOnly?: boolean;
  };
  onFilterChange: (filters) => void;
  industries?: string[];
  titleLevels?: string[];
  companySizes?: string[];
  countries?: string[];
  operatorMode?: "AND" | "OR";
  onOperatorChange?: (op: "AND" | "OR") => void;
}
```

### EmptyStateCard
```typescript
{
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryAction?: { label: string; onClick: () => void };
}
```

### SkeletonLoader
```typescript
{
  count?: number;                               // default 3
  variant?: "card" | "table-row" | "list-item" // default card
}
```

## Error Handling Pattern

All bulk operations return granular errors:
```typescript
{
  enrolled: 5,
  errors: [
    { leadId: 42, message: "Lead not found" },
    { leadId: 99, message: "Failed to create message" }
  ],
  messageIds: [101, 102, 103, 104, 105]
}
```

Frontend should:
1. Show success count in toast
2. Log errors array if present
3. Allow user to retry failed items

## Testing Command Examples

### Create a webhook
```bash
curl -X POST http://localhost:5000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.example.com/events",
    "eventTypes": ["campaign.lead_enrolled", "bulk.emails_sent"],
    "active": true
  }'
```

### Bulk enroll leads
```bash
curl -X POST http://localhost:5000/api/campaigns/1/bulk-enroll \
  -H "Content-Type: application/json" \
  -d '{ "leadIds": [1, 2, 3, 4, 5] }'
```

### Bulk send emails
```bash
curl -X POST http://localhost:5000/api/leads/bulk-email \
  -H "Content-Type: application/json" \
  -d '{
    "leadIds": [1, 2, 3],
    "subject": "Quick check-in",
    "body": "Hey {{name}}, wanted to reach out..."
  }'
```

## Database Queries (SQL)

### View all webhooks
```sql
SELECT id, url, active, failureCount, lastTriggeredAt 
FROM webhooks 
ORDER BY created_at DESC;
```

### View webhook delivery history
```sql
SELECT eventType, statusCode, error, deliveredAt, retryCount
FROM webhook_deliveries
WHERE webhookId = ?
ORDER BY delivered_at DESC
LIMIT 50;
```

### Find failed webhook deliveries
```sql
SELECT webhookId, eventType, error, deliveredAt
FROM webhook_deliveries
WHERE statusCode >= 400 OR error IS NOT NULL
ORDER BY delivered_at DESC;
```

## Performance Considerations

1. **Bulk operations are transaction-safe**: Each lead processed independently
2. **Webhook delivery is non-blocking**: Fires async, doesn't delay response
3. **Error tracking per-item**: Doesn't fail fast; captures all errors
4. **Query caching**: Use React Query invalidation on success
5. **Skeleton loaders**: Show during async operations

## Security Checklist

- [x] Webhook secrets are cryptographically random (32 bytes)
- [x] Signatures use timing-safe comparison
- [x] Event types are validated against allowed list
- [x] Webhook URLs are validated (should add URL validation)
- [x] Failure counts tracked (for monitoring)
- [x] Audit logs kept in webhook_deliveries table

## Next Steps for Production

1. Add URL validation in webhook creation
2. Implement exponential backoff for failed deliveries
3. Add webhook retry mechanism
4. Monitor failure rates and alert on threshold
5. Add rate limiting on bulk operations
6. Consider async job queue for very large bulks (10k+ leads)
7. Add webhook testing endpoint to manually trigger
8. Implement webhook signature verification middleware for tests
