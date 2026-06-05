import crypto from 'node:crypto';
import type { InsertMessage } from '@shared/schema';
import { storage } from '../storage';

/**
 * Bulk campaign enrollment: enroll multiple leads in a campaign
 * Creates initial message records for each lead at the first step
 */
export async function bulkEnrollLeadsInCampaign(
  leadIds: number[],
  campaignId: number
): Promise<{
  enrolled: number;
  errors: { leadId: number; message: string }[];
  messageIds: number[];
}> {
  if (leadIds.length === 0) {
    return { enrolled: 0, errors: [], messageIds: [] };
  }

  const campaign = await storage.getCampaign(campaignId);
  if (!campaign) {
    return {
      enrolled: 0,
      errors: leadIds.map((id) => ({ leadId: id, message: "Campaign not found" })),
      messageIds: [],
    };
  }

  const steps = await storage.getSteps(campaignId);
  const firstStep = steps.find((s) => s.stepOrder === 1);
  if (!firstStep) {
    return {
      enrolled: 0,
      errors: leadIds.map((id) => ({ leadId: id, message: "Campaign has no steps" })),
      messageIds: [],
    };
  }

  const errors: { leadId: number; message: string }[] = [];
  const messageIds: number[] = [];
  let enrolled = 0;

  // Fetch all leads to validate and get their details
  const leads = await Promise.all(
    leadIds.map(async (id) => {
      try {
        return await storage.getLead(id);
      } catch {
        return null;
      }
    })
  );

  for (let i = 0; i < leadIds.length; i++) {
    const leadId = leadIds[i];
    const lead = leads[i];

    if (!lead) {
      errors.push({ leadId, message: "Lead not found" });
      continue;
    }

    try {
      const channels = JSON.parse(campaign.channels || "[]") as string[];
      const primaryChannel = channels[0] || "email";

      const message = await storage.createMessage({
        leadId,
        campaignId,
        channel: primaryChannel,
        direction: "outbound",
        language: lead.language,
        subject: firstStep.subject || undefined,
        body: firstStep.body,
        status: "scheduled",
        createdAt: new Date().toISOString(),
      });

      messageIds.push(message.id);
      enrolled++;
    } catch (err: any) {
      errors.push({
        leadId,
        message: err?.message || "Failed to create message",
      });
    }
  }

  return { enrolled, errors, messageIds };
}

/**
 * Bulk email send: send one-off emails to multiple leads
 * Does not create campaign messages, just sends direct outreach
 */
export async function bulkSendEmails(
  leadIds: number[],
  emailSubject: string,
  emailBody: string
): Promise<{
  sent: number;
  errors: { leadId: number; message: string }[];
  messageIds: number[];
}> {
  if (leadIds.length === 0) {
    return { sent: 0, errors: [], messageIds: [] };
  }

  if (!emailSubject.trim() || !emailBody.trim()) {
    return {
      sent: 0,
      errors: leadIds.map((id) => ({ leadId: id, message: "Subject or body is empty" })),
      messageIds: [],
    };
  }

  const errors: { leadId: number; message: string }[] = [];
  const messageIds: number[] = [];
  let sent = 0;

  for (const leadId of leadIds) {
    try {
      const lead = await storage.getLead(leadId);
      if (!lead) {
        errors.push({ leadId, message: "Lead not found" });
        continue;
      }

      const message = await storage.createMessage({
        leadId,
        channel: "email",
        direction: "outbound",
        language: lead.language,
        subject: emailSubject,
        body: emailBody,
        status: "sent", // In production, would be queued and sent async
        createdAt: new Date().toISOString(),
      });

      messageIds.push(message.id);
      sent++;
    } catch (err: any) {
      errors.push({
        leadId,
        message: err?.message || "Failed to send email",
      });
    }
  }

  return { sent, errors, messageIds };
}

/**
 * Bulk tag operations: add or remove tags from multiple leads
 */
export async function bulkUpdateTags(
  leadIds: number[],
  tagsToAdd: string[],
  tagsToRemove: string[]
): Promise<{
  updated: number;
  errors: { leadId: number; message: string }[];
}> {
  if (leadIds.length === 0) {
    return { updated: 0, errors: [] };
  }

  const errors: { leadId: number; message: string }[] = [];
  let updated = 0;

  for (const leadId of leadIds) {
    try {
      const lead = await storage.getLead(leadId);
      if (!lead) {
        errors.push({ leadId, message: "Lead not found" });
        continue;
      }

      const currentTags = lead.tags
        ? lead.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      // Add tags
      for (const tag of tagsToAdd) {
        if (!currentTags.includes(tag)) {
          currentTags.push(tag);
        }
      }

      // Remove tags
      const newTags = currentTags.filter((t) => !tagsToRemove.includes(t));

      await storage.updateLead(leadId, { tags: newTags.join(",") });
      updated++;
    } catch (err: any) {
      errors.push({
        leadId,
        message: err?.message || "Failed to update tags",
      });
    }
  }

  return { updated, errors };
}

// Webhook functions are in server/lib/webhooks.ts — do not duplicate here.
