import crypto from 'crypto';
import { storage } from '../storage';
import type { Webhook } from '@shared/schema';

// Generate a cryptographically secure webhook secret
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create HMAC-SHA256 signature for webhook payload
export function createSignature(secret: string, payload: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Verify webhook signature from incoming request
export function verifySignature(secret: string, payload: string, signature: string): boolean {
  const expectedSignature = createSignature(secret, payload);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Event payload structure
export interface WebhookPayload {
  id: string;
  timestamp: string;
  eventType: string;
  data: Record<string, any>;
}

// Fire webhook event to all registered webhooks
export async function fireWebhookEvent(
  eventType: string,
  data: Record<string, any>
): Promise<void> {
  const allWebhooks = await storage.getWebhooks();
  const activeWebhooks = allWebhooks.filter(
    w => w.active && JSON.parse(w.eventTypes || '[]').includes(eventType)
  );

  for (const webhook of activeWebhooks) {
    deliverWebhook(webhook, eventType, data).catch(err => {
      console.error(`Failed to deliver webhook ${webhook.id}:`, err);
    });
  }
}

// Deliver webhook with retry logic
async function deliverWebhook(
  webhook: Webhook,
  eventType: string,
  data: Record<string, any>
): Promise<void> {
  const payload: WebhookPayload = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventType,
    data,
  };

  const payloadString = JSON.stringify(payload);
  const signature = createSignature(webhook.secret, payloadString);

  const MAX_ATTEMPTS = 3;
  let attempt = 0;
  let statusCode: number | undefined;
  let responseBody: string | undefined;
  let error: string | undefined;

  while (attempt < MAX_ATTEMPTS) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-ID': String(webhook.id),
          'X-Webhook-Timestamp': payload.timestamp,
          'X-Webhook-Retry': String(attempt),
        },
        body: payloadString,
        signal: AbortSignal.timeout(15000),
      });

      statusCode = response.status;
      responseBody = await response.text();

      if (response.ok) {
        error = undefined;
        await storage.updateWebhookFailureCount(webhook.id, 0);
        break; // success — exit loop
      }
      error = `HTTP ${statusCode}: ${responseBody}`;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      statusCode = undefined;
      responseBody = undefined;
    }
    attempt++;
  }

  if (error) {
    const newFailureCount = (webhook.failureCount || 0) + 1;
    await storage.updateWebhookFailureCount(webhook.id, newFailureCount);
    if (newFailureCount >= 10) {
      await storage.updateWebhook(webhook.id, { active: false });
      console.warn(`Webhook ${webhook.id} disabled after ${newFailureCount} failures`);
    }
  }

  // Log delivery attempt
  await storage.createWebhookDelivery({
    webhookId: webhook.id,
    eventType,
    payload: payloadString,
    statusCode,
    responseBody,
    error,
    deliveredAt: new Date().toISOString(),
    retryCount: attempt,
  });

  // Update last triggered timestamp on success
  if (!error) {
    await storage.updateWebhookLastTriggered(webhook.id);
  }
}
