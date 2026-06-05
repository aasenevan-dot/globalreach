import { z } from "zod";

// Webhook events that can be triggered
export const WEBHOOK_EVENTS = [
  "lead.created",
  "lead.updated",
  "lead.status_changed",
  "campaign.started",
  "campaign.completed",
  "message.sent",
  "message.received",
] as const;

export const webhookEventSchema = z.enum(WEBHOOK_EVENTS);
export type WebhookEvent = z.infer<typeof webhookEventSchema>;

// Webhook registration
export const registerWebhookSchema = z.object({
  url: z.string().url("Invalid webhook URL"),
  events: z.array(webhookEventSchema).min(1),
  secret: z.string().min(32, "Secret must be at least 32 characters"),
  active: z.boolean().default(true),
});

export type RegisterWebhookInput = z.infer<typeof registerWebhookSchema>;

// Webhook payload
export const webhookPayloadSchema = z.object({
  event: webhookEventSchema,
  timestamp: z.string(),
  data: z.record(z.unknown()),
});

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

// HMAC signature verification
export function createSignature(payload: string, secret: string): string {
  const crypto = require("crypto");
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createSignature(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
