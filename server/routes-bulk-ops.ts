import type { Express } from "express";
import { storage } from "./storage";
import { webhookManager } from "./lib/webhooks";
import { z } from "zod";

const bulkEnrollCampaignSchema = z.object({
  leadIds: z.array(z.number()),
  campaignId: z.number(),
});

const bulkEmailSchema = z.object({
  leadIds: z.array(z.number()),
  subject: z.string(),
  body: z.string(),
  channel: z.enum(["email", "linkedin", "sms", "whatsapp"]).default("email"),
});

/**
 * Register bulk operations routes.
 * These endpoints handle batch actions on multiple leads/campaigns.
 */
export function registerBulkRoutes(app: Express) {
  // ---- Bulk Campaign Enrollment ----
  // POST /api/leads/bulk-enroll-campaign
  // Enroll multiple leads in a campaign
  app.post("/api/leads/bulk-enroll-campaign", async (req, res) => {
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
    const leads = await Promise.all(
      leadIds.map((id) => storage.getLead(id))
    );
    const validLeads = leads.filter((l) => l !== null);

    if (validLeads.length !== leadIds.length) {
      return res
        .status(400)
        .json({ error: `${leadIds.length - validLeads.length} leads not found` });
    }

    // Fire webhook event for each enrollment
    const enrollments = validLeads.map((lead) => ({
      leadId: lead!.id,
      campaignId,
    }));

    for (const enrollment of enrollments) {
      await webhookManager.fireEvent("campaign.started", {
        leadId: enrollment.leadId,
        campaignId: enrollment.campaignId,
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
  // POST /api/leads/bulk-email
  // Send emails/messages to multiple leads
  app.post("/api/leads/bulk-email", async (req, res) => {
    const parsed = bulkEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { leadIds, subject, body, channel } = parsed.data;

    // Verify all leads exist
    const leads = await Promise.all(
      leadIds.map((id) => storage.getLead(id))
    );
    const validLeads = leads.filter((l) => l !== null);

    if (validLeads.length === 0) {
      return res.status(400).json({ error: "No valid leads provided" });
    }

    // Create message records for each lead
    const messages = await Promise.all(
      validLeads.map((lead) =>
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
      messageIds: messages.map((m) => m.id),
    });
  });

  // ---- Bulk Status Update ----
  // Already exists in routes.ts but documented here for completeness
  // POST /api/leads/bulk-status
  // Updates status for multiple leads

  // ---- Bulk Delete ----
  // Already exists in routes.ts but documented here for completeness
  // POST /api/leads/bulk-delete
  // Deletes multiple leads

  // ---- Webhook Management ----
  // POST /api/webhooks/register
  app.post("/api/webhooks/register", async (req, res) => {
    const { url, events, secret } = req.body;

    if (!url || !Array.isArray(events) || !secret) {
      return res
        .status(400)
        .json({ error: "Missing url, events, or secret" });
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

  // GET /api/webhooks
  app.get("/api/webhooks", async (_req, res) => {
    const webhooks = webhookManager.getWebhooks();
    res.json(
      webhooks.map((w) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        active: w.active,
        createdAt: w.createdAt,
      }))
    );
  });

  // DELETE /api/webhooks/:id
  app.delete("/api/webhooks/:id", async (req, res) => {
    const id = Number(req.params.id);
    const ok = webhookManager.deactivateWebhook(id);
    if (!ok) {
      return res.status(404).json({ error: "Webhook not found" });
    }
    res.json({ ok: true });
  });
}
