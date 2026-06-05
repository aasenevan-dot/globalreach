# server/index.ts - Required Modifications

This document shows what needs to be added to `server/index.ts` to support webhooks and bulk operations.

## Step 1: Add Imports at Top

```typescript
import "dotenv/config";
import express, { Response, NextFunction } from 'express';
import type { Request } from 'express';
import { registerRoutes } from "./routes";
import { registerBulkRoutes } from "./routes-bulk-ops";  // ADD THIS
import { webhookManager } from "./lib/webhooks";        // ADD THIS
import { serveStatic } from "./static";
import { createServer } from "node:http";

// ... rest of imports
```

## Step 2: Initialize Webhook Manager

After creating the Express app and before middleware setup:

```typescript
const app = express();
const httpServer = createServer(app);

// Initialize webhook manager with database
// (WebhookManager can optionally load webhooks from DB on init)
const webhooks = webhookManager;  // Optional - just for reference

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
    webhooks?: typeof webhookManager;  // ADD THIS
  }
}
```

## Step 3: Make WebhookManager Available in Requests

Add this middleware after your JSON parsing middleware:

```typescript
app.use(express.urlencoded({ extended: false }));

// Make webhookManager available in route handlers
app.use((req, res, next) => {
  (req as any).webhooks = webhookManager;
  next();
});

export function log(message: string, source = "express") {
  // ... existing log function
}
```

## Step 4: Register Both Route Sets

Find where you call `registerRoutes()` and add the bulk routes call. Typically near the end of the file:

```typescript
// Register API routes
await registerRoutes(httpServer, app);

// Register bulk operations & webhook routes
registerBulkRoutes(app);  // ADD THIS

// Serve static files
serveStatic(app);
```

## Complete Example (Minimal Changes)

Here's the minimal diff:

```typescript
import "dotenv/config";
import express, { Response, NextFunction } from 'express';
import type { Request } from 'express';
import { registerRoutes } from "./routes";
import { registerBulkRoutes } from "./routes-bulk-ops";  // NEW
import { webhookManager } from "./lib/webhooks";        // NEW
import { serveStatic } from "./static";
import { createServer } from "node:http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
    webhooks?: typeof webhookManager;  // NEW
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Make webhookManager available in requests
app.use((req, res, next) => {
  (req as any).webhooks = webhookManager;
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// ... rest of middleware ...

// At the end of the file, before calling registerRoutes():

const PORT = process.env.PORT || 5000;

async function main() {
  await registerRoutes(httpServer, app);
  registerBulkRoutes(app);  // NEW - register bulk operations routes
  serveStatic(app);

  httpServer.listen(PORT, () => {
    log(`Listening on http://localhost:${PORT}`);
  });
}

main();
```

## Alternative: If routes-bulk-ops.ts isn't used

If you prefer to append bulk routes directly to `routes.ts`, then you don't need to import `registerBulkRoutes`. Just:

1. Copy the endpoint code from `routes-bulk-ops.ts` into the end of `registerRoutes()` function in `routes.ts`
2. Import `webhookManager` at the top of `routes.ts`
3. Only add the webhook manager middleware to `index.ts`:

```typescript
import { webhookManager } from "./lib/webhooks";  // Still need this

// Still need this middleware
app.use((req, res, next) => {
  (req as any).webhooks = webhookManager;
  next();
});
```

## Database Migration

Before running the server, apply the webhook migration:

```bash
# Option 1: Run migration SQL file
sqlite3 data.db < server/db-migration-webhooks.sql

# Option 2: In server/storage.ts constructor, add:
try {
  const migrationSQL = fs.readFileSync(
    path.join(__dirname, "db-migration-webhooks.sql"),
    "utf-8"
  );
  sqlite.exec(migrationSQL);
  console.log("[DB] Webhooks migration applied");
} catch (err) {
  console.warn("[DB] Webhooks migration skipped (already applied):", err.message);
}
```

## Verify Setup

After making changes, verify:

1. **Imports work**: `npm run check` (TypeScript compiler)
2. **Server starts**: `npm run dev`
3. **Routes registered**: Check console for route logs
4. **Database ready**: `sqlite3 data.db ".tables"` shows webhooks table

## Testing Endpoints

Once server is running, test with:

```bash
# Register a webhook
curl -X POST http://localhost:5000/api/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://localhost:3000/webhook",
    "events": ["lead.created"],
    "secret": "your-secret-key-12345678901234567890123456789"
  }'

# List webhooks
curl http://localhost:5000/api/webhooks

# Enroll leads in campaign
curl -X POST http://localhost:5000/api/leads/bulk-enroll-campaign \
  -H "Content-Type: application/json" \
  -d '{
    "leadIds": [1, 2, 3],
    "campaignId": 5
  }'

# Send bulk emails
curl -X POST http://localhost:5000/api/leads/bulk-email \
  -H "Content-Type: application/json" \
  -d '{
    "leadIds": [1, 2, 3],
    "subject": "Check this out",
    "body": "Here is the message...",
    "channel": "email"
  }'
```

## Troubleshooting

### "webhookManager is not defined"
- Make sure `lib/webhooks.ts` is created
- Check import path is correct
- Run `npm install` to ensure dependencies

### "registerBulkRoutes is not a function"
- Make sure `routes-bulk-ops.ts` is created
- Check export statement: `export function registerBulkRoutes(app: Express)`

### TypeScript errors about `req.webhooks`
- The `declare module` section is optional
- Or cast: `(req as any).webhooks` in route handlers

### Database migration fails
- Make sure SQLite file exists: `ls -la data.db`
- Check file permissions: `chmod 644 data.db`
- Try running migration manually: `sqlite3 data.db < server/db-migration-webhooks.sql`

## No Changes Needed To

- `routes.ts` - Existing routes unchanged (unless adding routes-bulk-ops content there)
- `storage.ts` - Works as-is
- `static.ts` - No changes needed
- Database schema (except new migration for webhooks table)
