-- Migration: Add Webhooks support to GlobalReach CRM
-- This migration adds tables to store and track webhooks

-- Webhooks table: Store registered webhook endpoints
CREATE TABLE IF NOT EXISTS webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  event_types TEXT NOT NULL DEFAULT '[]', -- JSON array of event types to subscribe to
  secret TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_triggered TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Webhook delivery logs: Track all webhook delivery attempts
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

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivered_at ON webhook_deliveries(delivered_at);
