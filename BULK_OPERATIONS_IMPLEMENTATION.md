# GlobalReach CRM - Bulk Operations Feature Implementation

## Overview
This document outlines the complete implementation of the bulk operations feature for GlobalReach CRM, including bulk campaign enrollment, bulk email send, bulk tag operations, webhook infrastructure, and advanced filtering capabilities.

## Architecture Summary

### Backend Stack
- **Framework**: Express.js (Node.js)
- **Database**: SQLite with Drizzle ORM
- **Validation**: Zod
- **Authentication**: Webhook HMAC-SHA256 signatures

### Frontend Stack
- **Framework**: React 18
- **State Management**: TanStack React Query
- **UI Components**: Radix UI + Tailwind CSS
- **Form Handling**: React Hook Form

---

## Database Schema Changes

### New Tables Added
1. **webhooks** - Stores webhook configurations and metadata
2. **webhook_deliveries** - Audit log for webhook delivery attempts
3. **saved_filters** - Reusable filter presets for lead finder

### Schema Files
- **Location**: `/shared/schema.ts`
- **Additions**:
  ```typescript
  // Webhooks table (lines 304-316)
  export const webhooks = sqliteTable("webhooks", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    url: text("url").notNull(),
    eventTypes: text("event_types").notNull().default("[]"),
    secret: text("secret").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    lastTriggeredAt: text("last_triggered_at"),
    failureCount: integer("failure_count").notNull().default(0),
  });

  // Webhook deliveries table (lines 324-335)
  export const webhookDeliveries = sqliteTable("webhook_deliveries", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    webhookId: integer("webhook_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: text("payload").notNull(),
    statusCode: integer("status_code"),
    responseBody: text("response_body"),
    error: text("error"),
    deliveredAt: text("delivered_at").notNull(),
    retryCount: integer("retry_count").notNull().default(0),
  });
  ```

---

## Backend Implementation

### 1. Bulk Operations Library
**File**: `/server/lib/bulk-ops.ts`

#### Key Functions

**bulkEnrollLeadsInCampaign(leadIds, campaignId)**
- Enrolls multiple leads in a campaign
- Creates initial message records at the first campaign step
- Returns enrollment count and detailed error tracking
```typescript
export async function bulkEnrollLeadsInCampaign(
  leadIds: number[],
  campaignId: number
): Promise<{
  enrolled: number;
  errors: { leadId: number; message: string }[];
  messageIds: number[];
}>
```

**bulkSendEmails(leadIds, subject, body)**
- Sends one-off emails to multiple leads (not campaign-bound)
- Creates message records with "sent" status
- Returns send count and error details
```typescript
export async function bulkSendEmails(
  leadIds: number[],
  emailSubject: string,
  emailBody: string
): Promise<{
  sent: number;
  errors: { leadId: number; message: string }[];
  messageIds: number[];
}>
```

**bulkUpdateTags(leadIds, tagsToAdd, tagsToRemove)**
- Adds/removes tags from multiple leads
- Parses comma-separated tags and deduplicates
- Updates each lead's tags field independently
```typescript
export async function bulkUpdateTags(
  leadIds: number[],
  tagsToAdd: string[],
  tagsToRemove: string[]
): Promise<{
  updated: number;
  errors: { leadId: number; message: string }[];
}>
```

**Webhook Functions**

```typescript
// Generate random webhook secret
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate HMAC-SHA256 signature
export function generateWebhookSignature(
  payload: string,
  secret: string
): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Fire webhooks asynchronously
export async function fireWebhooks(
  eventType: string,
  payload: Record<string, any>
): Promise<void>
```

### 2. Storage Layer Extensions
**File**: `/server/storage.ts`

#### Webhook Methods Added
```typescript
interface IStorage {
  // Webhook CRUD
  getWebhooks(): Promise<Webhook[]>;
  getWebhook(id: number): Promise<Webhook | undefined>;
  createWebhook(w: InsertWebhook): Promise<Webhook>;
  updateWebhook(id: number, patch: Partial<InsertWebhook>): Promise<Webhook | undefined>;
  deleteWebhook(id: number): Promise<boolean>;
  
  // Webhook tracking
  updateWebhookFailureCount(id: number, count: number): Promise<void>;
  updateWebhookLastTriggered(id: number): Promise<void>;
  
  // Delivery audit logs
  getWebhookDeliveries(webhookId: number): Promise<WebhookDelivery[]>;
  createWebhookDelivery(d: InsertWebhookDelivery): Promise<WebhookDelivery>;
  getRecentWebhookDeliveries(limit: number): Promise<WebhookDelivery[]>;
}
```

Methods already implemented in DatabaseStorage class (lines 455-498).

### 3. API Routes
**File**: `/server/routes.ts`

#### Bulk Operations Endpoints

**POST /api/campaigns/:id/bulk-enroll**
- Request: `{ leadIds: number[] }`
- Response: `{ enrolled: number; errors: []; messageIds: number[] }`
- Enroll selected leads in a campaign

**POST /api/leads/bulk-email**
- Request: `{ leadIds: number[]; subject: string; body: string }`
- Response: `{ sent: number; errors: []; messageIds: number[] }`
- Send one-off email to multiple leads

**POST /api/leads/bulk-tags**
- Request: `{ leadIds: number[]; tagsToAdd: string[]; tagsToRemove: string[] }`
- Response: `{ updated: number; errors: [] }`
- Add/remove tags from multiple leads

#### Webhook Management Endpoints

**GET /api/webhooks**
- List all webhooks

**GET /api/webhooks/:id**
- Fetch webhook details with recent deliveries

**POST /api/webhooks**
- Create new webhook
- Auto-generates secret with HMAC-SHA256

**PATCH /api/webhooks/:id**
- Update webhook configuration

**DELETE /api/webhooks/:id**
- Deactivate webhook

**GET /api/webhooks/:id/deliveries**
- List webhook delivery attempts (audit log)

#### Webhook Events Fired
- `campaign.lead_enrolled` - When lead enrolled in campaign
- `bulk.emails_sent` - When bulk email sent
- `bulk.tags_updated` - When bulk tags updated
- More events can be added following the same pattern

---

## Frontend Implementation

### 1. Bulk Actions Bar Component
**File**: `/client/src/components/BulkActionsBar.tsx`

#### Props
```typescript
interface BulkActionsBarProps {
  selectedCount: number;
  leadIds: number[];
  campaigns: Campaign[];
  onClearSelection: () => void;
  onStatusChange?: (status: string) => void;
  onDelete?: () => void;
}
```

#### Features
- **Set Status**: Move bulk-selected leads through pipeline
- **Bulk Email**: Send one-off emails with subject/body
- **Enroll in Campaign**: Select campaign from dropdown
- **Bulk Tags**: Add/remove comma-separated tags
- **Delete**: Bulk delete with confirmation
- **Clear Selection**: Quick deselect all

#### Usage in Leads.tsx
```typescript
import { BulkActionsBar } from "@/components/BulkActionsBar";

<BulkActionsBar
  selectedCount={visibleSelected.length}
  leadIds={[...selectedIds]}
  campaigns={campaigns}
  onClearSelection={() => setSelectedIds(new Set())}
  onStatusChange={(status) => setStatusMut.mutate(status)}
  onDelete={() => deleteMut.mutate()}
/>
```

### 2. Lead Filters Panel Component
**File**: `/client/src/components/LeadFiltersPanel.tsx`

#### Features
- **Search Box**: Full-text search on name, company, email
- **Multi-Select Filters**:
  - Industries (dropdown)
  - Seniority Levels (C-Suite, VP, Director, Manager)
  - Company Sizes (11-50, 51-200, 201-1000, etc.)
  - Countries (searchable list)
- **Verified Only**: Boolean checkbox
- **Filter Logic**: AND/OR toggle
- **Active Filter Display**: Visual badges with quick remove

#### Props
```typescript
interface LeadFiltersPanelProps {
  filters: FilterConfig;
  onFilterChange: (filters: FilterConfig) => void;
  industries?: string[];
  titleLevels?: string[];
  companySizes?: string[];
  countries?: string[];
  operatorMode?: "AND" | "OR";
  onOperatorChange?: (op: "AND" | "OR") => void;
}
```

#### Usage Example
```typescript
const [filters, setFilters] = useState<FilterConfig>({
  searchText: "",
  industries: [],
  titleLevels: [],
  companySizes: [],
  countries: [],
  verifiedOnly: false,
});

<LeadFiltersPanel
  filters={filters}
  onFilterChange={setFilters}
  industries={meta?.industries || []}
  titleLevels={meta?.titleLevels || []}
  companySizes={meta?.companySizes || []}
  countries={meta?.countries || []}
  operatorMode="AND"
  onOperatorChange={setOperator}
/>
```

### 3. Empty State Component
**File**: `/client/src/components/EmptyStateCard.tsx`

#### Features
- Lucide icon support
- Customizable title/description
- Primary and secondary action buttons
- Centered, dashed-border card design

#### Props
```typescript
interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryAction?: { label: string; onClick: () => void };
  children?: React.ReactNode;
}
```

#### Usage Examples
```typescript
// Dashboard - no campaigns
<EmptyStateCard
  icon={Send}
  title="No campaigns yet"
  description="Create your first campaign to start engaging leads"
  actionLabel="New Campaign"
  onAction={() => setShowNewCampaign(true)}
/>

// Leads - no results
<EmptyStateCard
  icon={Users}
  title="No leads found"
  description="Import or add leads to get started"
  actionLabel="Import Leads"
  onAction={() => setShowImportDialog(true)}
  secondaryAction={{ label: "Add Lead", onClick: handleAddLead }}
/>
```

### 4. Skeleton Loader Component
**File**: `/client/src/components/SkeletonLoader.tsx`

#### Features
- Multiple variants: card, table-row, list-item
- Configurable count
- Realistic shimmer effect with Skeleton component

#### Usage
```typescript
import { SkeletonLoader } from "@/components/SkeletonLoader";

// Loading state
{isLoading && <SkeletonLoader variant="table-row" count={6} />}

// List loading
{isLoading && <SkeletonLoader variant="card" count={3} />}
```

---

## Integration with Existing Pages

### Leads.tsx Updates
The existing Leads page already includes bulk selection UI. Enhance with:

```typescript
// Add to imports
import { BulkActionsBar } from "@/components/BulkActionsBar";

// In render (after filters)
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

### FindLeads.tsx Enhancement
The FindLeads page should integrate LeadFiltersPanel:

```typescript
import { LeadFiltersPanel } from "@/components/LeadFiltersPanel";

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

### Dashboard.tsx Enhancement
Add empty states for better UX:

```typescript
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { SkeletonLoader } from "@/components/SkeletonLoader";

// If no campaigns
{campaigns.length === 0 && !isLoading && (
  <EmptyStateCard
    icon={Send}
    title="No campaigns"
    description="Create your first campaign to start reaching leads"
    actionLabel="New Campaign"
    onAction={() => setShowNewCampaign(true)}
  />
)}

// While loading
{isLoading && <SkeletonLoader variant="card" count={3} />}
```

---

## Data Flow Examples

### 1. Bulk Campaign Enrollment Flow
```
User selects leads → UI shows BulkActionsBar
  ↓
User clicks "Enroll" → Dialog shows available campaigns
  ↓
User selects campaign → POST /api/campaigns/:id/bulk-enroll
  ↓
Backend:
  - Validates campaign exists
  - Gets first step of campaign
  - Creates message records for each lead
  - Fires "campaign.lead_enrolled" webhook
  ↓
Frontend:
  - Toast success: "Enrolled N leads"
  - Clears selection
  - Invalidates query cache
```

### 2. Bulk Email Flow
```
User selects leads → BulkActionsBar "Email" button
  ↓
User enters subject + body → Dialog
  ↓
User clicks "Send" → POST /api/leads/bulk-email
  ↓
Backend:
  - Validates email content
  - Creates message records
  - Fires "bulk.emails_sent" webhook
  ↓
Frontend:
  - Toast: "Sent to N leads"
  - Closes dialog
```

### 3. Webhook Delivery Flow
```
Event fired (campaign.lead_enrolled, bulk.emails_sent, etc)
  ↓
fireWebhooks() function:
  - Finds all active webhooks for event type
  - Serializes payload to JSON
  - Generates HMAC-SHA256 signature
  - POST to webhook URL with headers:
    - X-GlobalReach-Signature: <signature>
    - X-GlobalReach-Event: <eventType>
  ↓
Webhook delivery logged to webhook_deliveries table
  - Success: statusCode, responseBody
  - Failure: error message, increments failureCount
```

---

## Security Considerations

### Webhook Signature Verification
Webhooks are signed with HMAC-SHA256. Recipients should:
1. Extract `X-GlobalReach-Signature` header
2. Retrieve webhook secret from GlobalReach dashboard
3. Compute: `crypto.createHmac('sha256', secret).update(body).digest('hex')`
4. Compare with timing-safe comparison to header value

### Error Handling
- Bulk operations include granular error tracking per lead
- Failed enrollments don't prevent successful ones
- Webhook failures are logged but non-blocking
- Duplicate tags are automatically deduplicated

---

## Testing Checklist

### Backend
- [ ] Test bulk enrollment with valid/invalid lead IDs
- [ ] Test bulk email with empty subject/body
- [ ] Test bulk tags with comma-separated inputs
- [ ] Test webhook creation with auto-generated secret
- [ ] Test webhook delivery logging
- [ ] Test error scenarios (campaign not found, lead not found, etc.)

### Frontend
- [ ] Test bulk select/deselect with checkbox UI
- [ ] Test all action buttons in BulkActionsBar
- [ ] Test filter panel with multiple selections
- [ ] Test AND/OR filter logic
- [ ] Test empty state cards on Dashboard/Leads/Campaigns
- [ ] Test skeleton loaders during data fetch

---

## File Manifest

### Backend Files
```
server/
  ├── lib/
  │   └── bulk-ops.ts              [NEW] Bulk operations & webhook logic
  ├── routes.ts                    [MODIFIED] +100 lines for bulk endpoints & webhooks
  └── storage.ts                   [MODIFIED] Already has webhook methods

shared/
  └── schema.ts                    [EXISTING] webhooks & webhook_deliveries tables
```

### Frontend Files
```
client/src/
  ├── components/
  │   ├── BulkActionsBar.tsx       [NEW] Bulk actions UI with dialogs
  │   ├── LeadFiltersPanel.tsx     [NEW] Advanced filter panel
  │   ├── EmptyStateCard.tsx       [NEW] Empty state template
  │   └── SkeletonLoader.tsx       [NEW] Loading skeleton variants
  ├── pages/
  │   ├── Leads.tsx                [INTEGRATE] Add BulkActionsBar
  │   ├── FindLeads.tsx            [INTEGRATE] Add LeadFiltersPanel
  │   ├── Dashboard.tsx            [INTEGRATE] Add EmptyStateCard & SkeletonLoader
  │   └── Campaigns.tsx            [INTEGRATE] Add EmptyStateCard & SkeletonLoader
  └── hooks/
      └── use-toast.ts             [EXISTING] Already used for notifications
```

---

## Configuration & Environment

No additional environment variables required. All configuration is stored in database:
- Webhook URLs and secrets in `webhooks` table
- Filter presets in `saved_filters` table
- Event delivery logs in `webhook_deliveries` table

---

## Future Enhancements

1. **Bulk Edit**: Update custom fields on multiple leads at once
2. **Batch Campaigns**: Pre-stage bulk leads for sequential campaign enrollment
3. **Webhook Retry Logic**: Implement exponential backoff for failed deliveries
4. **Event Filtering**: Let users select specific event types per webhook
5. **Webhook Testing**: Manual trigger to test webhook connectivity
6. **Activity Feed**: Show bulk operation history per lead/campaign
7. **Scheduled Bulk Operations**: Queue bulk actions for off-peak hours
8. **Export Bulk Results**: Download results of bulk operations as CSV

---

## Troubleshooting

### Bulk Operations Not Creating Messages
- Verify campaign has at least one step (required for enrollment)
- Check lead exists and is not deleted
- Review server logs for validation errors

### Webhooks Not Firing
- Ensure webhook is marked `active = true`
- Verify event type matches (campaign.lead_enrolled, bulk.emails_sent, etc.)
- Check webhook URL is accessible and returns 2xx
- Review webhook_deliveries table for error messages

### Filter Logic Issues
- Confirm AND/OR operator is set correctly
- Check filter values match database entries (case-sensitive)
- Test with verified-only toggle off first
