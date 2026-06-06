import type { Express } from 'express';
import { storage } from '../storage';
import { sendEmail, buildHtml } from './email';
import type { Lead } from '@shared/schema';

// ---------------------------------------------------------------------------
// Token substitution — mirrors applyTokensFn in routes.ts
// Supports: {{firstName}}, {{lastName}}, {{fullName}}, {{company}},
//           {{title}}, {{industry}}, {{city}}, {{country}}, {{companySize}},
//           {{state}}, {{metro}}, {{timezone}}
// ---------------------------------------------------------------------------
function substituteTokens(text: string, lead: Lead): string {
  const tokens: Record<string, string> = {
    firstName:   (lead.fullName || '').split(' ')[0] || '',
    lastName:    (lead.fullName || '').split(' ').slice(1).join(' ') || '',
    fullName:    lead.fullName   || '',
    company:     lead.company    || '',
    title:       lead.title      || '',
    industry:    lead.industry   || '',
    city:        lead.city       || '',
    country:     lead.country    || '',
    companySize: lead.companySize || '',
    state:       lead.state      || '',
    metro:       lead.metro      || '',
    timezone:    lead.timezone   || '',
  };
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => tokens[key] ?? `{{${key}}}`);
}

// ---------------------------------------------------------------------------
// processQueue — called every 60 s by startScheduler and exported for manual
// trigger via POST /api/campaigns/process-queue (wire in routes.ts if needed)
// ---------------------------------------------------------------------------
export async function processQueue(): Promise<void> {
  try {
    // Load SMTP config; bail silently if not configured
    const cfg = await storage.getCalendarSettings();
    const smtpConfigured = !!(cfg.smtpHost && cfg.smtpUser && cfg.smtpPass);

    const emailCfg = {
      host:      cfg.smtpHost,
      port:      cfg.smtpPort,
      secure:    cfg.smtpSecure,
      user:      cfg.smtpUser,
      pass:      cfg.smtpPass,
      fromName:  cfg.smtpFromName,
      fromEmail: cfg.smtpFromEmail,
    };

    // Only process campaigns in 'active' status
    const allCampaigns = await storage.getCampaigns();
    const activeCampaigns = allCampaigns.filter(c => c.status === 'active');

    if (activeCampaigns.length === 0) return;

    const now = Date.now();

    for (const campaign of activeCampaigns) {
      try {
        // Steps sorted ascending by stepOrder
        const allSteps = await storage.getSteps(campaign.id);
        const sortedSteps = [...allSteps].sort((a, b) => a.stepOrder - b.stepOrder);
        if (sortedSteps.length === 0) continue;

        // Messages already created for this campaign ("enrolled leads")
        const campaignMessages = await storage.getMessagesByCampaign(campaign.id);

        // Group scheduled messages by leadId so we know which step each lead
        // is waiting on and when the message was first created (enrollment time)
        const scheduledByLead = new Map<number, typeof campaignMessages>();
        for (const msg of campaignMessages) {
          if (!scheduledByLead.has(msg.leadId)) scheduledByLead.set(msg.leadId, []);
          scheduledByLead.get(msg.leadId)!.push(msg);
        }

        for (const [leadId, leadMessages] of scheduledByLead.entries()) {
          try {
            const lead = await storage.getLead(leadId);
            if (!lead) continue;

            // Determine how many steps have already been sent/delivered/opened/replied
            const completedCount = leadMessages.filter(m =>
              ['sent', 'delivered', 'opened', 'replied'].includes(m.status)
            ).length;

            // Next step to process
            const nextStep = sortedSteps[completedCount];
            if (!nextStep) continue; // all steps completed for this lead

            // Find the pending (scheduled) message for this step
            // Match by step's channel; fall back to any scheduled message
            const pendingMsg = leadMessages.find(m => m.status === 'scheduled' && m.channel === nextStep.channel)
              ?? leadMessages.find(m => m.status === 'scheduled');
            if (!pendingMsg) continue;

            // Delay check: message must be at least delayDays old relative to the
            // previous step's send time, or enrollment time for step 1.
            // Use the pending message's createdAt as the scheduling anchor.
            const anchorMs = new Date(pendingMsg.createdAt).getTime();
            const requiredMs = anchorMs + nextStep.delayDays * 86_400_000;
            if (now < requiredMs) continue; // not yet due

            // Only send email channel — other channels are logged but not delivered
            if (nextStep.channel !== 'email') {
              await storage.updateMessage(pendingMsg.id, { status: 'sent' });
              continue;
            }

            // Apply token substitution to subject and body
            const rawSubject = nextStep.subject || campaign.name;
            const rawBody    = nextStep.body;
            const subject    = substituteTokens(rawSubject, lead);
            const body       = substituteTokens(rawBody,    lead);
            const firstName  = (lead.fullName || '').split(' ')[0] || 'there';
            const html       = buildHtml(subject, body, firstName);

            if (smtpConfigured) {
              const result = await sendEmail(emailCfg, lead.email, subject, html);
              await storage.updateMessage(pendingMsg.id, {
                status:       result.success ? 'sent' : 'failed',
                scheduledFor: new Date().toISOString(),
              });
              // Advance lead status from 'new' to 'contacted' on first successful send
              if (result.success && lead.status === 'new') {
                await storage.updateLead(leadId, { status: 'contacted' });
              }
            } else {
              // SMTP not configured — keep as scheduled, do not mark failed
              // (scheduler will retry next tick once SMTP is configured)
            }
          } catch (leadErr: any) {
            console.error(`[campaign-scheduler] lead ${leadId} in campaign ${campaign.id}:`, leadErr?.message ?? leadErr);
          }
        }
      } catch (campaignErr: any) {
        console.error(`[campaign-scheduler] campaign ${campaign.id}:`, campaignErr?.message ?? campaignErr);
      }
    }
  } catch (err: any) {
    console.error('[campaign-scheduler] processQueue error:', err?.message ?? err);
  }
}

// ---------------------------------------------------------------------------
// startScheduler — call once from server/index.ts after registerRoutes()
// The app parameter is accepted for future use (e.g. attaching a manual
// trigger route) and follows the same convention as bulk-ops.ts consumers.
// ---------------------------------------------------------------------------
export function startScheduler(_app: Express): void {
  setInterval(processQueue, 60_000);
  console.log('[campaign-scheduler] started — polling every 60 s');
}
