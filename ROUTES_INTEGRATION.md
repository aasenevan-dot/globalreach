# Routes Integration Guide

This document shows how to integrate the new bulk operations and webhook routes into your existing Express server.

## Current Setup

Your existing `server/routes.ts` handles:
- Leads (GET, POST, PATCH, DELETE, bulk-status, bulk-delete, bulk-import)
- Campaigns (GET, POST, PATCH, DELETE, duplicate)
- Steps, Messages, Jobs, Forms, Funnels, etc.

## Integration Pattern

### Option 1: Append to routes.ts (Simplest)

Add these routes to the end of your existing `registerRoutes()` function in `server/routes.ts`:

```typescript
// At the end of registerRoutes() function, before return statement

// ---- Bulk Campaign Enrollment ----
app.post("/api/leads/bulk-enroll-campaign", async (req, res) => {
  const bulkEnrollCampaignSchema = z.object({
    leadIds: z.array(z.number()),
    campaignId: z.number(),
  });

  const parsed = bulkEnrollCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { leadIds, campaignId } = parsed.data;

  // Verify campaign exists
  const campaign = await storage.getCampaign(campaignId);
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }

  // Verify all leads exist
  const leads = await Promise.all(leadIds.map(id => storage.getLead(id)));
  const validLeads = leads.filter(l => l !== null);

  if (validLeads.length !== leadIds.length) {
    return res.status(400).json({
      error: `${leadIds.length - validLeads.length} leads not found`,
    });
  }

  // Fire webhook event for each enrollment
  for (const lead of validLeads) {
    await webhookManager.fireEvent("campaign.started", {
      leadId: lead!.id,
      campaignId,
      campaignName: campaign.name,
    });
  }

  res.json({
    enrolled: validLeads.length,
    campaignId,
    campaignName: campaign.name,
  });
});

// ---- Bulk Email Send ----
app.post("/api/leads/bulk-email", async (req, res) => {
  const bulkEmailSchema = z.object({
    leadIds: z.array(z.number()),
    subject: z.string(),
    body: z.string(),
    channel: z.enum(["email", "linkedin", "sms", "whatsapp"]).default("email"),
  });

  const parsed = bulkEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { leadIds, subject, body, channel } = parsed.data;

  // Verify all leads exist
  const leads = await Promise.all(leadIds.map(id => storage.getLead(id)));
  const validLeads = leads.filter(l => l !== null);

  if (validLeads.length === 0) {
    return res.status(400).json({ error: "No valid leads provided" });
  }

  // Create message records
  const messages = await Promise.all(
    validLeads.map(lead =>
      storage.createMessage({
        leadId: lead!.id,
        channel,
        direction: "outbound",
        language: lead!.language || "en",
        subject: channel === "email" ? subject : undefined,
        body,
        status: "scheduled",
        createdAt: new Date().toISOString(),
      })
    )
  );

  // Fire webhook event
  await webhookManager.fireEvent("message.sent", {
    count: messages.length,
    channel,
    subject,
  });

  res.json({
    sent: messages.length,
    channel,
    messageIds: messages.map(m => m.id),
  });
});

// ---- Webhook Management ----
app.post("/api/webhooks/register", async (req, res) => {
  const { url, events, secret } = req.body;

  if (!url || !Array.isArray(events) || !secret) {
    return res.status(400).json({
      error: "Missing url, events, or secret",
    });
  }

  try {
    const webhook = await webhookManager.registerWebhook(url, events, secret);
    res.json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      active: webhook.active,
    });
  } catch (err) {
    res.status(400).json({ error: "Failed to register webhook" });
  }
});

app.get("/api/webhooks", async (_req, res) => {
  const webhooks = webhookManager.getWebhooks();
  res.json(
    webhooks.map(w => ({
      id: w.id,
      url: w.url,
      events: w.events,
      active: w.active,
      createdAt: w.createdAt,
    }))
  );
});

app.delete("/api/webhooks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const ok = webhookManager.deactivateWebhook(id);
  if (!ok) {
    return res.status(404).json({ error: "Webhook not found" });
  }
  res.json({ ok: true });
});
```

### Option 2: Separate Module (Recommended for scale)

Create `server/routes-bulk-ops.ts` (already provided) and import it:

```typescript
// In server/routes.ts, at the top
import { registerBulkRoutes } from "./routes-bulk-ops";

// In registerRoutes() function, at the end before the return statement
registerBulkRoutes(app);
```

## Updated server/index.ts

Make sure your index.ts imports the webhook manager:

```typescript
import { webhookManager } from "./lib/webhooks";

// Make it available to routes
app.use((req, res, next) => {
  (req as any).webhookManager = webhookManager;
  next();
});
```

## Database Setup

### Option 1: Run Migration SQL
```bash
sqlite3 data.db < server/db-migration-webhooks.sql
```

### Option 2: Programmatic Migration
Add to `server/storage.ts` constructor:

```typescript
try {
  const fs = require("fs");
  const migrationSQL = fs.readFileSync(
    path.join(__dirname, "db-migration-webhooks.sql"),
    "utf-8"
  );
  sqlite.exec(migrationSQL);
  console.log("Webhooks migration applied");
} catch (err) {
  console.error("Webhooks migration failed:", err);
}
```

### Option 3: Manual SQL
Run these queries in your database:

```sql
CREATE TABLE IF NOT EXISTS webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  event_types TEXT NOT NULL DEFAULT '[]',
  secret TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_triggered TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  delivered_at TEXT NOT NULL,
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
```

## Firing Webhook Events

To integrate webhooks throughout your app, fire events when important actions occur:

```typescript
// When a lead is created
app.post("/api/leads", async (req, res) => {
  const parsed = insertLeadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  
  const lead = await storage.createLead(parsed.data);
  
  // Fire webhook
  await webhookManager.fireEvent("lead.created", {
    id: lead.id,
    fullName: lead.fullName,
    email: lead.email,
    company: lead.company,
  });
  
  res.json(lead);
});

// When lead status changes
app.patch("/api/leads/:id", async (req, res) => {
  const oldLead = await storage.getLead(Number(req.params.id));
  const parsed = insertLeadSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  
  const updated = await storage.updateLead(Number(req.params.id), parsed.data);
  if (!updated) return res.status(404).json({ error: "Not found" });
  
  // Fire webhook if status changed
  if (oldLead && oldLead.status !== updated.status) {
    await webhookManager.fireEvent("lead.status_changed", {
      leadId: updated.id,
      oldStatus: oldLead.status,
      newStatus: updated.status,
    });
  }
  
  res.json(updated);
});
```

## Summary of Changes

1. **Add webhook-schema.ts** to `/shared/`
2. **Add webhooks.ts** to `/server/lib/`
3. **Add routes-bulk-ops.ts** OR append routes to existing routes.ts
4. **Run database migration** (webhook tables)
5. **Import and register** bulk routes in server/index.ts
6. **Fire events** in appropriate route handlers

Total new code: ~400 lines of backend + ~800 lines of frontend components = ~1200 lines
All backward compatible - existing routes unchanged.
