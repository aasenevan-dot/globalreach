import type { Express } from "express";
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { storage } from "./storage";
import { searchLeads, INDUSTRIES, TITLE_LEVELS, COMPANY_SIZES, COUNTRIES } from "./lib/finder";
import {
  insertLeadSchema, insertCampaignSchema, insertStepSchema,
  insertMessageSchema, insertSettingsSchema, insertJobSchema,
  insertFormSchema, insertFormSubmissionSchema, insertFunnelSchema, insertAutomationSchema,
  insertMeetingSchema, insertSavedFilterSchema, insertWebhookSchema,
} from "@shared/schema";
import { fireWebhookEvent } from "./lib/webhooks";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ---- Settings (mode) ----
  app.get("/api/settings", async (_req, res) => {
    res.json(await storage.getSettings());
  });
  app.patch("/api/settings", async (req, res) => {
    const parsed = insertSettingsSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.json(await storage.updateSettings(parsed.data));
  });

  // ---- Leads ----
  app.get("/api/leads", async (_req, res) => {
    res.json(await storage.getLeads());
  });
  // ---- Lead CSV Export (must be before /api/leads/:id to avoid route shadowing) ----
  app.get("/api/leads/export", async (_req, res) => {
    try {
      const allLeads = await storage.getLeads();
      const headers = [
        "id", "fullName", "title", "company", "email", "phone",
        "country", "city", "state", "metro", "timezone", "language",
        "industry", "companySize", "verified", "status",
        "referredBy", "dealValue", "tags",
      ];
      const escape = (v: unknown): string => {
        const s = v == null ? "" : String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };
      const rows = allLeads.map(l =>
        [
          l.id, l.fullName, l.title, l.company, l.email, l.phone ?? "",
          l.country, l.city ?? "", l.state ?? "", l.metro ?? "", l.timezone, l.language,
          l.industry, l.companySize, l.verified ? "1" : "0", l.status,
          l.referredBy ?? "", l.dealValue ?? "", l.tags,
        ].map(escape).join(",")
      );
      const csv = [headers.join(","), ...rows].join("\r\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="leads.csv"');
      res.send(csv);
    } catch (e: any) { res.status(500).json({ error: e.message || "Export failed" }); }
  });

  // ---- Lead Activity (must be before /api/leads/:id to avoid route shadowing) ----
  app.get("/api/leads/:id/activity", async (req, res) => {
    try {
      const activity = await storage.getLeadActivity(Number(req.params.id));
      res.json(activity);
    } catch (e: any) { res.status(500).json({ error: e.message || "Failed to fetch activity" }); }
  });

  app.get("/api/leads/:id", async (req, res) => {
    const lead = await storage.getLead(Number(req.params.id));
    if (!lead) return res.status(404).json({ error: "Not found" });
    res.json(lead);
  });
  app.post("/api/leads", async (req, res) => {
    try {
      const parsed = insertLeadSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      res.json(await storage.createLead(parsed.data));
    } catch (e: any) { res.status(500).json({ error: e.message || "Failed to create lead" }); }
  });
  // Bulk import: accepts { leads: InsertLead[] }, validates each, inserts valid rows.
  app.post("/api/leads/bulk", async (req, res) => {
    try {
      const rows = Array.isArray(req.body?.leads) ? req.body.leads : [];
      const valid: any[] = [];
      const errors: { row: number; message: string }[] = [];
      rows.forEach((r: unknown, i: number) => {
        const parsed = insertLeadSchema.safeParse(r);
        if (parsed.success) valid.push(parsed.data);
        else errors.push({ row: i, message: "Invalid row" });
      });
      const created = await storage.createLeads(valid);
      res.json({ created: created.length, skipped: errors.length, errors });
    } catch (e: any) { res.status(500).json({ error: e.message || "Bulk import failed" }); }
  });
  // Bulk status update: { ids: number[], status: string }
  app.post("/api/leads/bulk-status", async (req, res) => {
    try {
      const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter((n: number) => Number.isFinite(n)) : [];
      const status = typeof req.body?.status === "string" ? req.body.status : "";
      const ALLOWED = ["new", "contacted", "engaged", "meeting", "won", "lost"];
      if (!ALLOWED.includes(status)) return res.status(400).json({ error: "Invalid status" });
      const updated = await storage.updateLeadsStatus(ids, status);
      res.json({ updated });
    } catch (e: any) { res.status(500).json({ error: e.message || "Bulk status update failed" }); }
  });
  // Bulk delete: { ids: number[] }
  app.post("/api/leads/bulk-delete", async (req, res) => {
    try {
      const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter((n: number) => Number.isFinite(n)) : [];
      const deleted = await storage.deleteLeads(ids);
      res.json({ deleted });
    } catch (e: any) { res.status(500).json({ error: e.message || "Bulk delete failed" }); }
  });
  app.patch("/api/leads/:id", async (req, res) => {
    const parsed = insertLeadSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const updated = await storage.updateLead(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });
  app.delete("/api/leads/:id", async (req, res) => {
    const ok = await storage.deleteLead(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  // ---- Campaigns ----
  app.get("/api/campaigns", async (_req, res) => {
    res.json(await storage.getCampaigns());
  });
  app.get("/api/campaigns/:id", async (req, res) => {
    const c = await storage.getCampaign(Number(req.params.id));
    if (!c) return res.status(404).json({ error: "Not found" });
    const campaignSteps = await storage.getSteps(c.id);
    res.json({ ...c, steps: campaignSteps });
  });
  app.post("/api/campaigns", async (req, res) => {
    try {
      const parsed = insertCampaignSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      res.json(await storage.createCampaign(parsed.data));
    } catch (e: any) { res.status(500).json({ error: e.message || "Failed to create campaign" }); }
  });
  app.patch("/api/campaigns/:id", async (req, res) => {
    const parsed = insertCampaignSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const updated = await storage.updateCampaign(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });
  app.post("/api/campaigns/:id/duplicate", async (req, res) => {
    try {
      const copy = await storage.duplicateCampaign(Number(req.params.id));
      if (!copy) return res.status(404).json({ error: "Not found" });
      res.json(copy);
    } catch (e: any) { res.status(500).json({ error: e.message || "Failed to duplicate campaign" }); }
  });
  app.delete("/api/campaigns/:id", async (req, res) => {
    const ok = await storage.deleteCampaign(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  // ---- Bulk Operations ----
  // Bulk enroll leads in a campaign
  app.post("/api/campaigns/:id/bulk-enroll", async (req, res) => {
    try {
      const campaignId = Number(req.params.id);
      const leadIds = Array.isArray(req.body?.leadIds)
        ? req.body.leadIds.map(Number).filter((n: number) => Number.isFinite(n))
        : [];

      if (leadIds.length === 0) {
        return res.status(400).json({ error: "No leads specified" });
      }

      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const { bulkEnrollLeadsInCampaign } = await import("./lib/bulk-ops");

      const result = await bulkEnrollLeadsInCampaign(leadIds, campaignId);

      // Fire webhooks for each enrolled lead
      if (result.enrolled > 0) {
        for (const leadId of leadIds.slice(0, result.enrolled)) {
          fireWebhookEvent("campaign.lead_enrolled", {
            leadId,
            campaignId,
            timestamp: new Date().toISOString(),
          }).catch(() => {});
        }
      }

      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message || "Bulk enroll failed" }); }
  });

  // Bulk send one-off emails
  app.post("/api/leads/bulk-email", async (req, res) => {
    try {
      const leadIds = Array.isArray(req.body?.leadIds)
        ? req.body.leadIds.map(Number).filter((n: number) => Number.isFinite(n))
        : [];
      const subject = typeof req.body?.subject === "string" ? req.body.subject : "";
      const body = typeof req.body?.body === "string" ? req.body.body : "";

      if (leadIds.length === 0) {
        return res.status(400).json({ error: "No leads specified" });
      }

      if (!subject.trim() || !body.trim()) {
        return res.status(400).json({ error: "Subject or body is empty" });
      }

      const { bulkSendEmails } = await import("./lib/bulk-ops");

      const result = await bulkSendEmails(leadIds, subject, body);

      // Fire webhooks
      if (result.sent > 0) {
        fireWebhookEvent("bulk.emails_sent", {
          count: result.sent,
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }

      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message || "Bulk email failed" }); }
  });

  // Bulk tag operations
  app.post("/api/leads/bulk-tags", async (req, res) => {
    try {
      const leadIds = Array.isArray(req.body?.leadIds)
        ? req.body.leadIds.map(Number).filter((n: number) => Number.isFinite(n))
        : [];
      const tagsToAdd = Array.isArray(req.body?.tagsToAdd) ? req.body.tagsToAdd : [];
      const tagsToRemove = Array.isArray(req.body?.tagsToRemove) ? req.body.tagsToRemove : [];

      if (leadIds.length === 0) {
        return res.status(400).json({ error: "No leads specified" });
      }

      const { bulkUpdateTags } = await import("./lib/bulk-ops");

      const result = await bulkUpdateTags(leadIds, tagsToAdd, tagsToRemove);

      // Fire webhooks
      if (result.updated > 0) {
        fireWebhookEvent("bulk.tags_updated", {
          count: result.updated,
          tagsAdded: tagsToAdd,
          tagsRemoved: tagsToRemove,
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }

      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message || "Bulk tag update failed" }); }
  });

  // ---- Steps ----
  app.post("/api/steps", async (req, res) => {
    try {
      const parsed = insertStepSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      res.json(await storage.createStep(parsed.data));
    } catch (e: any) { res.status(500).json({ error: e.message || "Failed to create step" }); }
  });
  app.patch("/api/steps/:id", async (req, res) => {
    const parsed = insertStepSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const updated = await storage.updateStep(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });
  app.delete("/api/steps/:id", async (req, res) => {
    const ok = await storage.deleteStep(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  // ---- Messages (unified inbox) ----
  app.get("/api/messages", async (req, res) => {
    const leadId = req.query.leadId ? Number(req.query.leadId) : undefined;
    res.json(leadId ? await storage.getMessagesByLead(leadId) : await storage.getMessages());
  });
  app.post("/api/messages", async (req, res) => {
    try {
      const parsed = insertMessageSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      res.json(await storage.createMessage(parsed.data));
    } catch (e: any) { res.status(500).json({ error: e.message || "Failed to create message" }); }
  });

  // ---- Jobs (Consumer / B2C residential pipeline) ----
  app.get("/api/jobs", async (_req, res) => {
    res.json(await storage.getJobs());
  });
  app.get("/api/jobs/:id", async (req, res) => {
    const job = await storage.getJob(Number(req.params.id));
    if (!job) return res.status(404).json({ error: "Not found" });
    res.json(job);
  });
  app.post("/api/jobs", async (req, res) => {
    try {
      // createdAt is server-set so the client doesn't have to send it.
      const body = { createdAt: new Date().toISOString(), ...req.body };
      const parsed = insertJobSchema.safeParse(body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      res.json(await storage.createJob(parsed.data));
    } catch (e: any) { res.status(500).json({ error: e.message || "Failed to create job" }); }
  });
  app.patch("/api/jobs/:id", async (req, res) => {
    const parsed = insertJobSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const updated = await storage.updateJob(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });
  app.delete("/api/jobs/:id", async (req, res) => {
    const ok = await storage.deleteJob(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  // ---- Lead Finder ----
  app.get("/api/finder/meta", (_req, res) => {
    res.json({ industries: INDUSTRIES, titleLevels: Object.keys(TITLE_LEVELS), companySizes: COMPANY_SIZES, countries: COUNTRIES });
  });
  app.get("/api/finder", (req, res) => {
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || "25", 10)));
    res.json(searchLeads({
      q: req.query.q as string | undefined,
      industry: req.query.industry as string | undefined,
      industries: req.query.industries as string | undefined,
      titleLevel: req.query.titleLevel as string | undefined,
      titleLevels: req.query.titleLevels as string | undefined,
      companySize: req.query.companySize as string | undefined,
      companySizes: req.query.companySizes as string | undefined,
      country: req.query.country as string | undefined,
      countries: req.query.countries as string | undefined,
      operator: (req.query.operator as string) === "OR" ? "OR" : "AND",
      verifiedOnly: req.query.verifiedOnly === "true",
      page,
      limit,
    }));
  });

  // ---- Forms ----
  app.get("/api/forms", async (_req, res) => { res.json(await storage.getForms()); });
  app.get("/api/forms/:id", async (req, res) => {
    const f = await storage.getForm(Number(req.params.id));
    if (!f) return res.status(404).json({ error: "Not found" });
    const submissions = await storage.getFormSubmissions(f.id);
    res.json({ ...f, submissionCount: submissions.length, submissions });
  });
  app.post("/api/forms", async (req, res) => {
    try {
      const parsed = insertFormSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      res.json(await storage.createForm(parsed.data));
    } catch (e: any) { res.status(500).json({ error: e.message || "Failed to create form" }); }
  });
  app.patch("/api/forms/:id", async (req, res) => {
    const parsed = insertFormSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const updated = await storage.updateForm(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });
  app.delete("/api/forms/:id", async (req, res) => {
    const ok = await storage.deleteForm(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });
  app.post("/api/forms/:id/submit", async (req, res) => {
    try {
    const form = await storage.getForm(Number(req.params.id));
    if (!form) return res.status(404).json({ error: "Not found" });
    const data = req.body?.data || req.body;
    const sub = await storage.createFormSubmission({
      formId: form.id,
      data: JSON.stringify(data),
      createdAt: new Date().toISOString(),
    });
    // Try to create a lead from the submission data
    const fields = typeof data === "object" ? data as Record<string, string> : {};
    const emailKey = Object.keys(fields).find(k => k.toLowerCase().includes("email"));
    const nameKey = Object.keys(fields).find(k => k.toLowerCase().includes("name"));
    let leadId: number | undefined;
    if (emailKey && fields[emailKey]) {
      try {
        const lead = await storage.createLead({
          fullName: (nameKey && fields[nameKey]) || "Unknown",
          title: fields["Job Title"] || fields["title"] || "",
          company: fields["Company"] || fields["company"] || "",
          email: fields[emailKey],
          country: "United States",
          timezone: "America/New_York",
          language: "en",
          industry: fields["Industry"] || fields["industry"] || "Unknown",
          companySize: "11-50",
          status: "new",
          referredBy: `Form: ${form.name}`,
        });
        leadId = lead.id;
        await storage.updateForm(form.id, { fields: form.fields }); // touch to update
        // Fire active automations for form_submitted trigger
        const allAutomations = await storage.getAutomations();
        for (const auto of allAutomations) {
          if (!auto.active || auto.triggerType !== "form_submitted") continue;
          const config = JSON.parse(auto.triggerConfig || "{}");
          if (config.formId && config.formId !== form.id) continue;
          const actions = JSON.parse(auto.actions || "[]") as any[];
          for (const action of actions) {
            if (action.type === "update_status" && action.value) {
              await storage.updateLead(lead.id, { status: action.value });
            }
          }
          await storage.incrementAutomationRunCount(auto.id);
        }
      } catch (e) {
        console.error("Failed to create lead from form submission:", e instanceof Error ? e.message : String(e));
      }
    }
    res.json({ ok: true, submissionId: sub.id, leadId });
    } catch (e: any) { res.status(500).json({ error: e.message || "Form submission failed" }); }
  });

  // ---- Funnels ----
  app.get("/api/funnels", async (_req, res) => { res.json(await storage.getFunnels()); });
  app.get("/api/funnels/:id", async (req, res) => {
    const f = await storage.getFunnel(Number(req.params.id));
    if (!f) return res.status(404).json({ error: "Not found" });
    res.json(f);
  });
  app.post("/api/funnels", async (req, res) => {
    try {
      const parsed = insertFunnelSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      res.json(await storage.createFunnel(parsed.data));
    } catch (e: any) { res.status(500).json({ error: e.message || "Failed to create funnel" }); }
  });
  app.patch("/api/funnels/:id", async (req, res) => {
    const parsed = insertFunnelSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const updated = await storage.updateFunnel(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });
  app.delete("/api/funnels/:id", async (req, res) => {
    const ok = await storage.deleteFunnel(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  // Public funnel page — rendered server-side so it works as a standalone URL
  app.get("/f/:slug", async (req, res) => {
    const funnel = await storage.getFunnelBySlug(req.params.slug);
    if (!funnel || !funnel.published) return res.status(404).send("Page not found");
    // A/B test: randomly show variant B if it has content
    const hasVariantB = !!(funnel as any).variantB_headline;
    const showB = hasVariantB && Math.random() < 0.5;
    // Increment views for the correct variant
    if (showB) {
      await storage.updateFunnel(funnel.id, { variantB_views: ((funnel as any).variantB_views || 0) + 1 } as any);
    } else {
      await storage.updateFunnel(funnel.id, { views: (funnel.views || 0) + 1 });
    }
    const form = funnel.formId ? await storage.getForm(funnel.formId) : null;
    const fields: any[] = form ? JSON.parse(form.fields || "[]") : [];
    const formHtml = form ? `
      <form id="lead-form" onsubmit="submitForm(event)">
        ${fields.map((field: any) => `
          <div class="field">
            <label>${field.label}${field.required ? ' <span class="req">*</span>' : ''}</label>
            ${field.type === "textarea"
              ? `<textarea name="${field.label}" ${field.required ? "required" : ""} rows="4"></textarea>`
              : `<input type="${field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}" name="${field.label}" ${field.required ? "required" : ""} />`}
          </div>
        `).join("")}
        <button type="submit" class="cta-btn">${funnel.ctaText || "Get Started"}</button>
      </form>
      <div id="success" style="display:none">
        <div class="success-icon">✓</div>
        <h3>You're in!</h3>
        <p>We'll be in touch shortly.</p>
      </div>
      <script>
        async function submitForm(e) {
          e.preventDefault();
          const fd = new FormData(e.target);
          const data = {};
          fd.forEach((v,k) => data[k] = v);
          const r = await fetch('/api/forms/${form!.id}/submit', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ data })
          });
          if (r.ok) {
            e.target.style.display='none';
            document.getElementById('success').style.display='block';
            fetch('/api/funnels/${funnel.id}/convert', { method:'POST' }).catch(()=>{});
          }
        }
      </script>` : "<p style='opacity:.5'>No form attached to this funnel.</p>";

    // Select content based on A/B variant
    const displayHeadline = showB ? ((funnel as any).variantB_headline || funnel.headline) : funnel.headline;
    const displaySubheadline = showB ? ((funnel as any).variantB_subheadline || funnel.subheadline) : funnel.subheadline;
    const displayCta = showB ? ((funnel as any).variantB_ctaText || funnel.ctaText) : funnel.ctaText;
    const variantParam = showB ? "&variant=b" : "";

    const themes: Record<string, string> = {
      dark: "background:#0f0f12;color:#f5f5f5;",
      light: "background:#ffffff;color:#111;",
      gradient: "background:linear-gradient(135deg,#1a1040 0%,#0a1628 50%,#0d1f35 100%);color:#f5f5f5;",
    };
    const bgStyle = themes[funnel.theme] || themes.dark;

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${displayHeadline || funnel.name}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;${bgStyle}}
    .card{max-width:540px;width:100%;padding:48px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(12px)}
    h1{font-size:2rem;font-weight:800;line-height:1.2;margin-bottom:12px}
    h2{font-size:1.15rem;font-weight:400;opacity:.7;margin-bottom:8px}
    .body-text{font-size:.95rem;opacity:.65;margin-bottom:32px;line-height:1.6}
    .field{margin-bottom:18px}
    label{display:block;font-size:.85rem;font-weight:500;margin-bottom:6px;opacity:.8}
    .req{color:#f87171}
    input,textarea{width:100%;padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:inherit;font-size:.95rem;font-family:inherit;outline:none;transition:border-color .2s}
    input:focus,textarea:focus{border-color:rgba(20,184,166,.7)}
    .cta-btn{width:100%;padding:13px;border-radius:8px;border:none;background:linear-gradient(135deg,#ef4444,#14b8a6);color:#fff;font-size:1rem;font-weight:700;cursor:pointer;margin-top:8px;transition:opacity .2s}
    .cta-btn:hover{opacity:.9}
    #success{text-align:center;padding:24px 0}
    .success-icon{font-size:3rem;margin-bottom:12px;color:#34d399}
    #success h3{font-size:1.4rem;font-weight:700;margin-bottom:8px}
    #success p{opacity:.65}
  </style>
</head>
<body>
  <div class="card">
    <h1>${displayHeadline || funnel.name}</h1>
    ${displaySubheadline ? `<h2>${displaySubheadline}</h2>` : ""}
    ${funnel.bodyText ? `<p class="body-text">${funnel.bodyText}</p>` : ""}
    ${formHtml}
  </div>
</body>
</html>`);
  });

  // ---- Meetings ----
  app.get("/api/meetings", async (_req, res) => { res.json(await storage.getMeetings()); });
  app.post("/api/meetings", async (req, res) => {
    try {
      const parsed = insertMeetingSchema.safeParse({ ...req.body, createdAt: new Date().toISOString() });
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      res.json(await storage.createMeeting(parsed.data));
    } catch (e: any) { res.status(500).json({ error: e.message || "Failed to create meeting" }); }
  });
  app.patch("/api/meetings/:id", async (req, res) => {
    const u = await storage.updateMeeting(Number(req.params.id), req.body);
    if (!u) return res.status(404).json({ error: "Not found" });
    res.json(u);
  });
  app.delete("/api/meetings/:id", async (req, res) => {
    const ok = await storage.deleteMeeting(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  // ---- Calendar Settings ----
  app.get("/api/calendar-settings", async (_req, res) => { res.json(await storage.getCalendarSettings()); });
  app.patch("/api/calendar-settings", async (req, res) => { res.json(await storage.updateCalendarSettings(req.body)); });

  // ---- Public Booking ----
  app.get("/api/booking/slots", async (req, res) => {
    const cfg = await storage.getCalendarSettings();
    const booked = (await storage.getMeetings()).map(m => m.datetime);
    const dateStr = req.query.date as string;
    if (!dateStr) return res.json([]);
    const { getAvailableSlots } = await import("./lib/calendar");
    const slots = getAvailableSlots({ timezone: cfg.timezone, workdayStart: cfg.workdayStart, workdayEnd: cfg.workdayEnd, meetingDuration: cfg.meetingDuration, bufferMinutes: cfg.bufferMinutes, daysAhead: cfg.daysAhead }, booked);
    res.json(slots.filter((s: any) => s.date === dateStr));
  });
  app.post("/api/booking/confirm", async (req, res) => {
    try {
      const { datetime, name, email, company, notes } = req.body;
      if (!datetime || !name || !email) return res.status(400).json({ error: "Missing required fields" });
      const meeting = await storage.createMeeting({ leadName: name, leadEmail: email, leadCompany: company || "", title: "Discovery Call", datetime, duration: 30, status: "confirmed", notes: notes || "", createdAt: new Date().toISOString() });
      try {
        await storage.createLead({ fullName: name, title: "", company: company || "", email, country: "United States", timezone: "America/New_York", language: "en", industry: "Unknown", companySize: "11-50", status: "meeting", referredBy: "Booking Page" });
      } catch (e) {
        console.error("Failed to create lead from booking:", e instanceof Error ? e.message : String(e));
      }
      res.json({ ok: true, meeting });
    } catch (e: any) { res.status(500).json({ error: e.message || "Booking confirmation failed" }); }
  });

  // ---- SMTP Email Test ----
  app.post("/api/email/test", async (req, res) => {
    try {
      const { testConnection } = await import("./lib/email");
      res.json(await testConnection(req.body));
    } catch (e: any) { res.json({ ok: false, error: e.message }); }
  });

  // ---- Auth Gate ----
  app.get("/api/auth/status", async (_req, res) => {
    const cfg = await storage.getCalendarSettings();
    res.json({ protected: !!cfg.appPassword, authenticated: !(cfg.appPassword) });
  });
  app.post("/api/auth/login", async (req, res) => {
    const cfg = await storage.getCalendarSettings();
    if (!cfg.appPassword) return res.json({ ok: true });
    if (req.body?.password === cfg.appPassword) return res.json({ ok: true });
    res.status(401).json({ error: "Wrong password" });
  });

  // ---- Email Open Tracking Pixel ----
  app.get("/api/track/:messageId.png", async (req, res) => {
    const id = Number(req.params.messageId);
    if (id) {
      const msg = await storage.getMessages();
      const found = msg.find(m => m.id === id);
      if (found && found.status === "sent") {
        await storage.updateMessage(id, { status: "opened" });
      }
    }
    // Return a 1x1 transparent PNG
    const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4zjOYKFgAAAA1JREFUGFdj+P//PwMABv4C/RnN5RIAAAAASUVORK5CYII=", "base64");
    res.writeHead(200, { "Content-Type": "image/png", "Content-Length": pixel.length, "Cache-Control": "no-cache, no-store" });
    res.end(pixel);
  });

  // ---- Reminders ----
  app.get("/api/reminders", async (_req, res) => { res.json(await storage.getReminders()); });
  app.get("/api/reminders/lead/:leadId", async (req, res) => { res.json(await storage.getRemindersByLead(Number(req.params.leadId))); });
  app.post("/api/reminders", async (req, res) => {
    try {
      const { leadId, text, dueDate } = req.body;
      if (!leadId || !text || !dueDate) return res.status(400).json({ error: "Missing fields" });
      res.json(await storage.createReminder({ leadId, text, dueDate, done: false, createdAt: new Date().toISOString() }));
    } catch (e: any) { res.status(500).json({ error: e.message || "Failed to create reminder" }); }
  });
  app.patch("/api/reminders/:id", async (req, res) => {
    const u = await storage.updateReminder(Number(req.params.id), req.body);
    if (!u) return res.status(404).json({ error: "Not found" });
    res.json(u);
  });
  app.delete("/api/reminders/:id", async (req, res) => {
    res.json({ ok: await storage.deleteReminder(Number(req.params.id)) });
  });

  // ---- Contact Enrichment (from Finder DB) ----
  app.post("/api/leads/enrich", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email required" });
      const domain = email.split("@")[1] || "";
      const results = searchLeads({ q: domain, page: 1, limit: 5 });
      const match = results.results.find(r => r.email.toLowerCase() === email.toLowerCase()) || results.results[0];
      if (match) {
        res.json({ found: true, fullName: match.fullName, title: match.title, company: match.company, industry: match.industry, companySize: match.companySize, country: match.country, location: match.location, verified: match.verified });
      } else {
        res.json({ found: false });
      }
    } catch (e: any) { res.status(500).json({ error: e.message || "Enrichment failed" }); }
  });

  // ---- CSV Column Mapping ----
  app.post("/api/leads/import-mapped", async (req, res) => {
    try {
      const { rows, mapping } = req.body as { rows: Record<string, string>[]; mapping: Record<string, string> };
      if (!rows || !mapping) return res.status(400).json({ error: "Missing rows or mapping" });
      let created = 0, skipped = 0;
      for (const row of rows) {
        const lead: Record<string, any> = {
          fullName: row[mapping.fullName] || row[mapping.firstName] ? `${row[mapping.firstName] || ""} ${row[mapping.lastName] || ""}`.trim() : "Unknown",
          title: row[mapping.title] || "",
          company: row[mapping.company] || "",
          email: row[mapping.email] || "",
          phone: row[mapping.phone] || undefined,
          country: row[mapping.country] || "United States",
          city: row[mapping.city] || undefined,
          state: row[mapping.state] || undefined,
          timezone: "America/New_York",
          language: "en",
          industry: row[mapping.industry] || "Unknown",
          companySize: row[mapping.companySize] || "11-50",
          status: "new",
        };
        if (!lead.email) { skipped++; continue; }
        if (mapping.fullName && row[mapping.fullName]) lead.fullName = row[mapping.fullName];
        try {
          await storage.createLead(lead as any);
          created++;
        } catch (e) {
          console.error(`Failed to import lead ${lead.email}:`, e instanceof Error ? e.message : String(e));
          skipped++;
        }
      }
      res.json({ created, skipped, total: rows.length });
    } catch (e: any) { res.status(500).json({ error: e.message || "CSV import failed" }); }
  });

  // ---- Waitlist (Pro/Enterprise signups) ----
  app.post("/api/waitlist", async (req, res) => {
    try {
      const { email, plan } = req.body;
      if (!email) return res.status(400).json({ error: "Email required" });
      // Store as a lead with referral source = waitlist
      try {
        await storage.createLead({
          fullName: email.split("@")[0] || "Prospect",
          title: "",
          company: email.split("@")[1]?.split(".")[0] || "",
          email,
          country: "United States",
          timezone: "America/New_York",
          language: "en",
          industry: "Unknown",
          companySize: "11-50",
          status: "new",
          referredBy: `Waitlist: ${plan || "Pro"}`,
        } as any);
      } catch (e) {
        if (e instanceof Error && !e.message.includes("UNIQUE")) {
          console.error("Waitlist signup error:", e.message);
        }
      }
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message || "Waitlist signup failed" }); }
  });

  // ---- Lead Tags ----
  app.post("/api/leads/:id/tags", async (req, res) => {
    try {
      const lead = await storage.getLead(Number(req.params.id));
      if (!lead) return res.status(404).json({ error: "Not found" });
      const { add, remove } = req.body as { add?: string; remove?: string };
      const current = (lead.tags || "").split(",").filter(Boolean);
      if (add && !current.includes(add)) current.push(add.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""));
      if (remove) {
        const idx = current.indexOf(remove);
        if (idx >= 0) current.splice(idx, 1);
      }
      const updated = await storage.updateLead(lead.id, { tags: current.filter(Boolean).join(",") });
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: e.message || "Tag update failed" }); }
  });

  // ---- Campaign Stats ----
  app.get("/api/campaigns/:id/stats", async (req, res) => {
    const msgs = await storage.getMessagesByCampaign(Number(req.params.id));
    const out = msgs.filter(m => m.direction === "outbound");
    const sent = out.filter(m => m.status === "sent").length;
    const queued = out.filter(m => m.status === "scheduled").length;
    const failed = out.filter(m => m.status === "failed").length;
    const opened = out.filter(m => m.status === "opened").length;
    const replied = out.filter(m => m.status === "replied" || m.direction === "inbound").length + msgs.filter(m => m.direction === "inbound").length;
    const uniqueLeads = new Set(out.map(m => m.leadId)).size;
    res.json({ sent, queued, failed, opened, replied, uniqueLeads, total: out.length, openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0, replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0 });
  });

  // ---- AI Email Draft ----
  app.post("/api/ai/draft", async (req, res) => {
    const { leadId, campaignId } = req.body;
    const lead = await storage.getLead(Number(leadId));
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    const cfg = await storage.getCalendarSettings();
    if (!cfg.aiApiKey) return res.status(400).json({ error: "No Claude API key configured. Add it in Settings → AI." });
    const campaign = campaignId ? await storage.getCampaign(Number(campaignId)) : null;
    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey: cfg.aiApiKey });
      const firstName = lead.fullName.split(" ")[0];
      const context = [
        `Name: ${lead.fullName}`,
        `Title: ${lead.title || "unknown"}`,
        `Company: ${lead.company}`,
        `Industry: ${lead.industry}`,
        `Company size: ${lead.companySize}`,
        `Deal stage: ${lead.status}`,
        campaign ? `Campaign: ${campaign.name}` : "",
      ].filter(Boolean).join("\n");
      const msg = await client.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `Write a short, personalized cold sales email for the following prospect. Keep it under 120 words, conversational, no fluff. Start directly with "Hi ${firstName}," — no subject line, just the body. End with a clear single question or call to action.\n\nProspect context:\n${context}\n\nProduct context: GlobalReach is a B2B sales platform that automates outreach, manages pipelines, and finds leads across 200+ countries.\n\nWrite only the email body.`,
        }],
      });
      const draft = (msg.content[0] as any).text?.trim() || "";
      res.json({ draft });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---- Campaign Multi-Step Scheduler ----
  app.post("/api/campaigns/:id/schedule-all", async (req, res) => {
    try {
      const campaign = await storage.getCampaign(Number(req.params.id));
      if (!campaign) return res.status(404).json({ error: "Not found" });
      const campaignSteps = (await storage.getSteps(campaign.id)).sort((a, b) => a.stepOrder - b.stepOrder);
      if (campaignSteps.length === 0) return res.status(400).json({ error: "No steps configured" });

      const allLeads = await storage.getLeads();
      const eligible = allLeads.filter(l => !["won", "lost"].includes(l.status));
      if (eligible.length === 0) return res.json({ ok: true, scheduled: 0 });

      const now = Date.now();
      let totalScheduled = 0;

      for (const step of campaignSteps) {
        const sendAt = new Date(now + step.delayDays * 86400000);
        const timestamp = sendAt.toISOString();
        for (const lead of eligible) {
          const subject = applyTokensFn(step.subject || campaign.name, lead);
          const body = applyTokensFn(step.body, lead);
          await storage.createMessage({
            leadId: lead.id,
            campaignId: campaign.id,
            channel: step.channel,
            direction: "outbound",
            language: lead.language,
            subject,
            body,
            scheduledFor: timestamp,
            status: "scheduled",
            createdAt: new Date().toISOString(),
          });
          totalScheduled++;
        }
      }

      // Mark campaign active
      await storage.updateCampaign(campaign.id, { status: "active" });
      res.json({ ok: true, scheduled: totalScheduled, steps: campaignSteps.length, leads: eligible.length });
    } catch (e: any) { res.status(500).json({ error: e.message || "Campaign scheduling failed" }); }
  });

  // Shared token replacement (used by both run and schedule-all)
  function applyTokensFn(text: string, lead: any): string {
    const tokens: Record<string, string> = {
      firstName: (lead.fullName || "").split(" ")[0] || "",
      lastName: (lead.fullName || "").split(" ").slice(1).join(" ") || "",
      fullName: lead.fullName || "",
      company: lead.company || "",
      title: lead.title || "",
      industry: lead.industry || "",
      city: lead.city || "",
      country: lead.country || "",
      companySize: lead.companySize || "",
      state: lead.state || "",
      metro: lead.metro || "",
      timezone: lead.timezone || "",
    };
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => tokens[key] ?? `{{${key}}}`);
  }

  // ---- Campaign Execution ----
  app.post("/api/campaigns/:id/run", async (req, res) => {
    try {
    const campaign = await storage.getCampaign(Number(req.params.id));
    if (!campaign) return res.status(404).json({ error: "Not found" });

    const campaignSteps = await storage.getSteps(campaign.id);
    if (campaignSteps.length === 0) return res.status(400).json({ error: "No sequence steps configured. Add at least one step first." });

    const step1 = [...campaignSteps].sort((a, b) => a.stepOrder - b.stepOrder)[0];
    const allLeads = await storage.getLeads();
    const statusFilter: string = req.body?.statusFilter || "all";
    const eligible = allLeads.filter(l => {
      if (["won", "lost"].includes(l.status)) return false;
      if (statusFilter === "new") return l.status === "new";
      return true;
    });

    if (eligible.length === 0) return res.json({ ok: true, sent: 0, queued: 0, failed: 0, total: 0, note: "No eligible leads." });

    const cfg = await storage.getCalendarSettings();
    const smtpConfigured = !!(cfg.smtpHost && cfg.smtpUser && cfg.smtpPass);
    const timestamp = new Date().toISOString();

    let sent = 0, queued = 0, failed = 0;

    const applyTokens = applyTokensFn;

    if (smtpConfigured) {
      const { sendEmail, buildHtml } = await import("./lib/email");
      const emailCfg = { host: cfg.smtpHost, port: cfg.smtpPort, secure: cfg.smtpSecure, user: cfg.smtpUser, pass: cfg.smtpPass, fromName: cfg.smtpFromName, fromEmail: cfg.smtpFromEmail };
      for (const lead of eligible) {
        const firstName = lead.fullName.split(" ")[0];
        const subject = applyTokens(step1.subject || campaign.name, lead);
        const body = applyTokens(step1.body, lead);
        let html = buildHtml(subject, body, firstName);
        // Create message first to get ID for tracking pixel
        const msg = await storage.createMessage({ leadId: lead.id, campaignId: campaign.id, channel: "email", direction: "outbound", language: lead.language, subject, body, status: "scheduled", createdAt: timestamp });
        // Inject tracking pixel
        html = html.replace("</body>", `<img src="${process.env.BASE_URL || 'http://localhost:' + (process.env.PORT || '5000')}/api/track/${msg.id}.png" width="1" height="1" style="display:none" /></body>`);
        const result = await sendEmail(emailCfg, lead.email, subject, html);
        await storage.updateMessage(msg.id, { status: result.success ? "sent" : "failed" });
        if (result.success) { sent++; if (lead.status === "new") await storage.updateLead(lead.id, { status: "contacted" }); }
        else failed++;
      }
    } else {
      for (const lead of eligible) {
        const subject = applyTokens(step1.subject || campaign.name, lead);
        const body = applyTokens(step1.body, lead);
        await storage.createMessage({ leadId: lead.id, campaignId: campaign.id, channel: "email", direction: "outbound", language: lead.language, subject, body, status: "scheduled", createdAt: timestamp });
        queued++;
      }
    }

    res.json({ ok: true, sent, queued, failed, total: eligible.length, smtpConfigured });
    } catch (e: any) { res.status(500).json({ error: e.message || "Campaign execution failed" }); }
  });

  // ---- Seed demo data ----
  app.get("/api/seed", async (_req, res) => {
    try {
      const { runSeed } = await import("./seed");
      const result = await runSeed();
      res.json({ ok: true, ...result });
    } catch (e: any) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/seed", async (_req, res) => {
    try {
      const { db: dbConn } = await import("./storage");
      const sch = await import("@shared/schema");
      // Wipe existing data
      dbConn.delete(sch.messages).run();
      dbConn.delete(sch.steps).run();
      dbConn.delete(sch.campaigns).run();
      dbConn.delete(sch.leads).run();
      dbConn.delete(sch.jobs).run();
      // Run the full seed (creates leads, campaigns, steps, messages)
      const { runSeed } = await import("./seed");
      const result = await runSeed();
      res.json({ ok: true, ...result });
    } catch (e: any) { res.status(500).json({ error: String(e) }); }
  });

  app.post("/api/funnels/:id/convert", async (req, res) => {
    const f = await storage.getFunnel(Number(req.params.id));
    if (!f) return res.status(404).json({ error: "Not found" });
    const variant = req.body?.variant || req.query?.variant;
    if (variant === "b") {
      await storage.updateFunnel(f.id, { variantB_conversions: ((f as any).variantB_conversions || 0) + 1 } as any);
    } else {
      await storage.updateFunnel(f.id, { conversions: (f.conversions || 0) + 1 });
    }
    res.json({ ok: true });
  });

  // ---- Automations ----
  app.get("/api/automations", async (_req, res) => { res.json(await storage.getAutomations()); });
  app.get("/api/automations/:id", async (req, res) => {
    const a = await storage.getAutomation(Number(req.params.id));
    if (!a) return res.status(404).json({ error: "Not found" });
    res.json(a);
  });
  app.post("/api/automations", async (req, res) => {
    try {
      const parsed = insertAutomationSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      res.json(await storage.createAutomation(parsed.data));
    } catch (e: any) { res.status(500).json({ error: e.message || "Failed to create automation" }); }
  });
  app.patch("/api/automations/:id", async (req, res) => {
    const parsed = insertAutomationSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const updated = await storage.updateAutomation(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });
  app.delete("/api/automations/:id", async (req, res) => {
    const ok = await storage.deleteAutomation(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  // ---- Saved Filters (for Lead Finder) ----
  app.get("/api/filters", async (_req, res) => {
    res.json(await storage.getSavedFilters());
  });
  app.get("/api/filters/:id", async (req, res) => {
    const f = await storage.getSavedFilter(Number(req.params.id));
    if (!f) return res.status(404).json({ error: "Not found" });
    res.json(f);
  });
  app.post("/api/filters", async (req, res) => {
    try {
      const parsed = insertSavedFilterSchema.safeParse({
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      res.json(await storage.createSavedFilter(parsed.data));
    } catch (e: any) { res.status(500).json({ error: e.message || "Failed to create filter" }); }
  });
  app.patch("/api/filters/:id", async (req, res) => {
    const parsed = insertSavedFilterSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const updated = await storage.updateSavedFilter(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });
  app.delete("/api/filters/:id", async (req, res) => {
    const ok = await storage.deleteSavedFilter(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });

  // ---- Webhooks ----
  app.get("/api/webhooks", async (_req, res) => {
    res.json(await storage.getWebhooks());
  });
  app.get("/api/webhooks/:id", async (req, res) => {
    const w = await storage.getWebhook(Number(req.params.id));
    if (!w) return res.status(404).json({ error: "Not found" });
    const deliveries = await storage.getWebhookDeliveries(w.id);
    res.json({ ...w, deliveries });
  });
  app.post("/api/webhooks", async (req, res) => {
    try {
      const { generateWebhookSecret } = await import("./lib/webhooks");
      const parsed = insertWebhookSchema.safeParse({
        ...req.body,
        secret: generateWebhookSecret(),
        createdAt: new Date().toISOString(),
      });
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      res.json(await storage.createWebhook(parsed.data));
    } catch (e: any) { res.status(500).json({ error: e.message || "Failed to create webhook" }); }
  });
  app.patch("/api/webhooks/:id", async (req, res) => {
    const parsed = insertWebhookSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const updated = await storage.updateWebhook(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });
  app.delete("/api/webhooks/:id", async (req, res) => {
    const ok = await storage.deleteWebhook(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });
  // Get webhook delivery logs
  app.get("/api/webhooks/:id/deliveries", async (req, res) => {
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "50", 10)));
    const deliveries = await storage.getWebhookDeliveries(Number(req.params.id));
    res.json(deliveries.slice(-limit));
  });
  app.post("/api/webhooks/:id/test", async (req, res) => {
    const webhook = await storage.getWebhook(Number(req.params.id));
    if (!webhook) return res.status(404).json({ error: "Not found" });
    try {
      await fireWebhookEvent("test.webhook", {
        webhookId: webhook.id,
        testMessage: "This is a test event from GlobalReach",
        timestamp: new Date().toISOString(),
      });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Test delivery failed" });
    }
  });

  return httpServer;
}
