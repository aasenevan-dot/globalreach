import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});
export const insertUserSchema = createInsertSchema(users).pick({ username: true, password: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ---------------------------------------------------------------------------
// App settings — persists the active mode (Local vs International/Advanced)
// ---------------------------------------------------------------------------
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mode: text("mode").notNull().default("local"), // local | international
  homeCountry: text("home_country").notNull().default("United States"),
  homeTimezone: text("home_timezone").notNull().default("America/New_York"),
  homeLanguage: text("home_language").notNull().default("en"),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// ---------------------------------------------------------------------------
// Leads — the localized B2B contact database
// ---------------------------------------------------------------------------
export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  country: text("country").notNull(),
  city: text("city"),
  state: text("state"), // US state code e.g. "IN" (domestic territory)
  metro: text("metro"), // metro label e.g. "Indianapolis, IN"
  lat: real("lat"), // latitude in decimal degrees
  lng: real("lng"), // longitude in decimal degrees
  timezone: text("timezone").notNull(), // IANA tz e.g. "Europe/Berlin"
  language: text("language").notNull(), // ISO 639-1 e.g. "de"
  industry: text("industry").notNull(),
  companySize: text("company_size").notNull(), // e.g. "51-200"
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("new"), // new | contacted | engaged | meeting | won | lost
  // ---- Referral attribution (B2C/referral ROI) ----
  // Who sent this deal our way: an insurance agent, partner office, past
  // customer, or a marketing channel. Free text so sources outside the lead
  // DB (e.g. a State Farm agent) can still be credited.
  referredBy: text("referred_by"),
  // Closed-won deal value in whole US dollars. Drives referral-source ROI.
  dealValue: integer("deal_value"),
  tags: text("tags").notNull().default(""), // comma-separated tags e.g. "enterprise,hot-intro,follow-up"
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// ---------------------------------------------------------------------------
// Campaigns — multi-channel, multi-language outreach sequences
// ---------------------------------------------------------------------------
export const campaigns = sqliteTable("campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"), // draft | active | paused | completed
  // JSON arrays/objects stored as text (SQLite has no array type)
  channels: text("channels").notNull().default("[]"), // ["email","linkedin","whatsapp","sms","call"]
  languages: text("languages").notNull().default("[]"), // ["en","de","es"]
  targetCountries: text("target_countries").notNull().default("[]"),
  sendWindowStart: integer("send_window_start").notNull().default(9), // local hour 0-23
  sendWindowEnd: integer("send_window_end").notNull().default(17), // local hour 0-23
  respectTimezone: integer("respect_timezone", { mode: "boolean" }).notNull().default(true),
  autoTranslate: integer("auto_translate", { mode: "boolean" }).notNull().default(true),
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

// ---------------------------------------------------------------------------
// Sequence steps — ordered touches within a campaign
// ---------------------------------------------------------------------------
export const steps = sqliteTable("steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  campaignId: integer("campaign_id").notNull(),
  stepOrder: integer("step_order").notNull(),
  channel: text("channel").notNull(), // email | linkedin | whatsapp | sms | call
  delayDays: integer("delay_days").notNull().default(0),
  subject: text("subject"), // base (source language) subject
  body: text("body").notNull(), // base (source language) body
  // localized variants: { "de": {subject, body}, "es": {...} }
  translations: text("translations").notNull().default("{}"),
});

export const insertStepSchema = createInsertSchema(steps).omit({ id: true });
export type InsertStep = z.infer<typeof insertStepSchema>;
export type Step = typeof steps.$inferSelect;

// ---------------------------------------------------------------------------
// Messages — the unified cross-channel inbox / conversation log
// ---------------------------------------------------------------------------
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").notNull(),
  campaignId: integer("campaign_id"),
  channel: text("channel").notNull(),
  direction: text("direction").notNull(), // outbound | inbound
  language: text("language").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  // when respecting timezone, the UTC instant we actually send/sent
  scheduledFor: text("scheduled_for"), // ISO string in UTC
  localSendTime: text("local_send_time"), // human readable local time label
  status: text("status").notNull().default("scheduled"), // scheduled | sent | delivered | opened | replied | failed
  createdAt: text("created_at").notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// ---------------------------------------------------------------------------
// Jobs — direct-to-consumer (B2C) homeowner work, with a roofing-style pipeline.
// Powers the "Consumer" view: residential jobs sourced via referrals (insurance
// agents, past customers, neighbors) move stage-by-stage from first inspection
// through completed work. Job value feeds the same referral-source ROI analytics
// as B2B deals, so a marketer can see which sources actually drive revenue.
// ---------------------------------------------------------------------------
export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Homeowner / point of contact
  homeowner: text("homeowner").notNull(),
  phone: text("phone"),
  email: text("email"),
  // Property location (free text street + city/state, optional metro for grouping)
  address: text("address"),
  city: text("city"),
  state: text("state"), // US state code, e.g. "IN"
  // Work scope — roof type / service category. Free text so any roofing material
  // or service fits: "Asphalt shingle", "Metal", "Flat / TPO", "Tile", "Repair", etc.
  roofType: text("roof_type").notNull().default("Asphalt shingle"),
  // Whether this is an insurance-claim job (storm/hail damage) vs. retail/out-of-pocket.
  insuranceClaim: integer("insurance_claim", { mode: "boolean" }).notNull().default(false),
  // Attribution — who sent this homeowner our way (insurance agent, past customer,
  // Google, door-knock, etc.). Mirrors leads.referredBy so ROI rolls up together.
  referredBy: text("referred_by"),
  // Job value in whole US dollars (estimate while open, final contract once won).
  value: integer("value"),
  // Pipeline stage for residential roofing work.
  stage: text("stage").notNull().default("inspection"),
  // inspection | estimate | claim | approved | scheduled | completed | lost
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const insertJobSchema = createInsertSchema(jobs).omit({ id: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

// ---------------------------------------------------------------------------
// Forms — drag-and-drop form builder; submissions feed into the lead pipeline.
// ---------------------------------------------------------------------------
export const forms = sqliteTable("forms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  fields: text("fields").notNull().default("[]"), // JSON: FormField[]
  createdAt: text("created_at").notNull(),
});
export const insertFormSchema = createInsertSchema(forms).omit({ id: true });
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof forms.$inferSelect;

export const formSubmissions = sqliteTable("form_submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  formId: integer("form_id").notNull(),
  data: text("data").notNull(), // JSON: { fieldLabel: value }
  createdAt: text("created_at").notNull(),
  convertedLeadId: integer("converted_lead_id"),
});
export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).omit({ id: true });
export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;
export type FormSubmission = typeof formSubmissions.$inferSelect;

// ---------------------------------------------------------------------------
// Funnels — landing-page builder; embed a form, publish to /f/:slug
// ---------------------------------------------------------------------------
export const funnels = sqliteTable("funnels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  headline: text("headline").notNull().default(""),
  subheadline: text("subheadline").notNull().default(""),
  bodyText: text("body_text").notNull().default(""),
  ctaText: text("cta_text").notNull().default("Get Started"),
  formId: integer("form_id"),
  theme: text("theme").notNull().default("dark"), // dark | light | gradient
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  slug: text("slug").notNull().default(""),
  createdAt: text("created_at").notNull(),
  views: integer("views").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  // A/B testing
  variantB_headline: text("variant_b_headline").notNull().default(""),
  variantB_subheadline: text("variant_b_subheadline").notNull().default(""),
  variantB_ctaText: text("variant_b_cta_text").notNull().default(""),
  variantB_views: integer("variant_b_views").notNull().default(0),
  variantB_conversions: integer("variant_b_conversions").notNull().default(0),
});
export const insertFunnelSchema = createInsertSchema(funnels).omit({ id: true });
export type InsertFunnel = z.infer<typeof insertFunnelSchema>;
export type Funnel = typeof funnels.$inferSelect;

// ---------------------------------------------------------------------------
// Automations — trigger → conditions → actions workflow engine
// ---------------------------------------------------------------------------
export const automations = sqliteTable("automations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  triggerType: text("trigger_type").notNull(), // lead_created | status_changed | form_submitted | campaign_replied
  triggerConfig: text("trigger_config").notNull().default("{}"), // JSON
  conditions: text("conditions").notNull().default("[]"), // JSON: Condition[]
  actions: text("actions").notNull().default("[]"), // JSON: Action[]
  active: integer("active", { mode: "boolean" }).notNull().default(false),
  runCount: integer("run_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
export const insertAutomationSchema = createInsertSchema(automations).omit({ id: true });
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type Automation = typeof automations.$inferSelect;

// ---------------------------------------------------------------------------
// Meetings — calendar bookings linked to leads
// ---------------------------------------------------------------------------
export const meetings = sqliteTable("meetings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id"),
  leadName: text("lead_name").notNull(),
  leadEmail: text("lead_email").notNull(),
  leadCompany: text("lead_company").notNull().default(""),
  title: text("title").notNull().default("Sales Meeting"),
  datetime: text("datetime").notNull(),
  duration: integer("duration").notNull().default(30),
  status: text("status").notNull().default("confirmed"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});
export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true });
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

// ---------------------------------------------------------------------------
// Calendar / SMTP settings
// ---------------------------------------------------------------------------
export const calendarSettings = sqliteTable("calendar_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workdayStart: integer("workday_start").notNull().default(9),
  workdayEnd: integer("workday_end").notNull().default(17),
  meetingDuration: integer("meeting_duration").notNull().default(30),
  bufferMinutes: integer("buffer_minutes").notNull().default(15),
  daysAhead: integer("days_ahead").notNull().default(14),
  timezone: text("timezone").notNull().default("America/New_York"),
  smtpHost: text("smtp_host").notNull().default(""),
  smtpPort: integer("smtp_port").notNull().default(587),
  smtpUser: text("smtp_user").notNull().default(""),
  smtpPass: text("smtp_pass").notNull().default(""),
  smtpFromName: text("smtp_from_name").notNull().default("GlobalReach"),
  smtpFromEmail: text("smtp_from_email").notNull().default(""),
  smtpSecure: integer("smtp_secure", { mode: "boolean" }).notNull().default(false),
  aiApiKey: text("ai_api_key").notNull().default(""),
  appPassword: text("app_password").notNull().default(""), // simple auth gate
});
export const insertCalendarSettingsSchema = createInsertSchema(calendarSettings).omit({ id: true });
export type InsertCalendarSettings = z.infer<typeof insertCalendarSettingsSchema>;
export type CalendarSettings = typeof calendarSettings.$inferSelect;

// ---------------------------------------------------------------------------
// Reminders — follow-up tasks attached to leads
// ---------------------------------------------------------------------------
export const reminders = sqliteTable("reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").notNull(),
  text: text("text").notNull(),
  dueDate: text("due_date").notNull(), // YYYY-MM-DD
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});
export const insertReminderSchema = createInsertSchema(reminders).omit({ id: true });
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;
