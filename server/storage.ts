import {
  users, settings, leads, campaigns, steps, messages, jobs,
  forms, formSubmissions, funnels, automations, meetings, calendarSettings, reminders,
  webhooks, webhookDeliveries, savedFilters,
} from '@shared/schema';
import type {
  User, InsertUser,
  Settings, InsertSettings,
  Lead, InsertLead,
  Campaign, InsertCampaign,
  Step, InsertStep,
  Message, InsertMessage,
  Job, InsertJob,
  Form, InsertForm,
  FormSubmission, InsertFormSubmission,
  Funnel, InsertFunnel,
  Automation, InsertAutomation,
  Meeting, InsertMeeting,
  CalendarSettings, InsertCalendarSettings,
  Reminder, InsertReminder,
  Webhook, InsertWebhook,
  WebhookDelivery, InsertWebhookDelivery,
  SavedFilter, InsertSavedFilter,
} from '@shared/schema';
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, inArray } from "drizzle-orm";
import path from "node:path";

// Use persistent disk path on Render, local /tmp for Docker free tier, or local path
const DB_DIR = process.env.RENDER
  ? "/tmp"
  : path.resolve(__dirname, "..");
const DB_PATH = path.join(DB_DIR, "data.db");
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

// Idempotent forward-migration: ensure referral-attribution columns exist on
// databases created before they were added to the schema.
try {
  const cols = sqlite.prepare("PRAGMA table_info(leads)").all().map((c: any) => c.name);
  if (cols.length) {
    if (!cols.includes("referred_by")) sqlite.exec("ALTER TABLE leads ADD COLUMN referred_by text");
    if (!cols.includes("deal_value")) sqlite.exec("ALTER TABLE leads ADD COLUMN deal_value integer");
    if (!cols.includes("tags")) sqlite.exec("ALTER TABLE leads ADD COLUMN tags text NOT NULL DEFAULT ''");
  }
} catch { /* table may not exist yet on first boot */ }

// Forward-migrate calendar_settings
try {
  const calCols = sqlite.prepare("PRAGMA table_info(calendar_settings)").all().map((c: any) => c.name);
  if (calCols.length) {
    if (!calCols.includes("ai_api_key")) sqlite.exec("ALTER TABLE calendar_settings ADD COLUMN ai_api_key text NOT NULL DEFAULT ''");
    if (!calCols.includes("app_password")) sqlite.exec("ALTER TABLE calendar_settings ADD COLUMN app_password text NOT NULL DEFAULT ''");
  }
} catch { /* ignore */ }

// Forward-migrate funnels for A/B testing
try {
  const fCols = sqlite.prepare("PRAGMA table_info(funnels)").all().map((c: any) => c.name);
  if (fCols.length && !fCols.includes("variant_b_headline")) {
    sqlite.exec("ALTER TABLE funnels ADD COLUMN variant_b_headline text NOT NULL DEFAULT ''");
    sqlite.exec("ALTER TABLE funnels ADD COLUMN variant_b_subheadline text NOT NULL DEFAULT ''");
    sqlite.exec("ALTER TABLE funnels ADD COLUMN variant_b_cta_text text NOT NULL DEFAULT ''");
    sqlite.exec("ALTER TABLE funnels ADD COLUMN variant_b_views integer NOT NULL DEFAULT 0");
    sqlite.exec("ALTER TABLE funnels ADD COLUMN variant_b_conversions integer NOT NULL DEFAULT 0");
  }
} catch { /* ignore */ }

// Idempotent creation of the jobs table (B2C / Consumer view). Created here so
// the table always exists on boot regardless of when the DB file was created.
try {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id integer PRIMARY KEY AUTOINCREMENT,
      homeowner text NOT NULL,
      phone text,
      email text,
      address text,
      city text,
      state text,
      roof_type text NOT NULL DEFAULT 'Asphalt shingle',
      insurance_claim integer NOT NULL DEFAULT 0,
      referred_by text,
      value integer,
      stage text NOT NULL DEFAULT 'inspection',
      notes text,
      created_at text NOT NULL
    )
  `);
} catch { /* ignore */ }

try {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS forms (
      id integer PRIMARY KEY AUTOINCREMENT,
      name text NOT NULL,
      fields text NOT NULL DEFAULT '[]',
      created_at text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS form_submissions (
      id integer PRIMARY KEY AUTOINCREMENT,
      form_id integer NOT NULL,
      data text NOT NULL,
      created_at text NOT NULL,
      converted_lead_id integer
    );
    CREATE TABLE IF NOT EXISTS funnels (
      id integer PRIMARY KEY AUTOINCREMENT,
      name text NOT NULL,
      headline text NOT NULL DEFAULT '',
      subheadline text NOT NULL DEFAULT '',
      body_text text NOT NULL DEFAULT '',
      cta_text text NOT NULL DEFAULT 'Get Started',
      form_id integer,
      theme text NOT NULL DEFAULT 'dark',
      published integer NOT NULL DEFAULT 0,
      slug text NOT NULL DEFAULT '',
      created_at text NOT NULL,
      views integer NOT NULL DEFAULT 0,
      conversions integer NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS automations (
      id integer PRIMARY KEY AUTOINCREMENT,
      name text NOT NULL,
      trigger_type text NOT NULL,
      trigger_config text NOT NULL DEFAULT '{}',
      conditions text NOT NULL DEFAULT '[]',
      actions text NOT NULL DEFAULT '[]',
      active integer NOT NULL DEFAULT 0,
      run_count integer NOT NULL DEFAULT 0,
      created_at text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meetings (
      id integer PRIMARY KEY AUTOINCREMENT,
      lead_id integer,
      lead_name text NOT NULL,
      lead_email text NOT NULL,
      lead_company text NOT NULL DEFAULT '',
      title text NOT NULL DEFAULT 'Sales Meeting',
      datetime text NOT NULL,
      duration integer NOT NULL DEFAULT 30,
      status text NOT NULL DEFAULT 'confirmed',
      notes text,
      created_at text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reminders (
      id integer PRIMARY KEY AUTOINCREMENT,
      lead_id integer NOT NULL,
      text text NOT NULL,
      due_date text NOT NULL,
      done integer NOT NULL DEFAULT 0,
      created_at text NOT NULL
    );
    CREATE TABLE IF NOT EXISTS calendar_settings (
      id integer PRIMARY KEY AUTOINCREMENT,
      workday_start integer NOT NULL DEFAULT 9,
      workday_end integer NOT NULL DEFAULT 17,
      meeting_duration integer NOT NULL DEFAULT 30,
      buffer_minutes integer NOT NULL DEFAULT 15,
      days_ahead integer NOT NULL DEFAULT 14,
      timezone text NOT NULL DEFAULT 'America/New_York',
      smtp_host text NOT NULL DEFAULT '',
      smtp_port integer NOT NULL DEFAULT 587,
      smtp_user text NOT NULL DEFAULT '',
      smtp_pass text NOT NULL DEFAULT '',
      smtp_from_name text NOT NULL DEFAULT 'GlobalReach',
      smtp_from_email text NOT NULL DEFAULT '',
      smtp_secure integer NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS webhooks (
      id integer PRIMARY KEY AUTOINCREMENT,
      url text NOT NULL,
      event_types text NOT NULL DEFAULT '[]',
      secret text NOT NULL,
      active integer NOT NULL DEFAULT 1,
      created_at text NOT NULL,
      last_triggered_at text,
      failure_count integer NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id integer PRIMARY KEY AUTOINCREMENT,
      webhook_id integer NOT NULL,
      event_type text NOT NULL,
      payload text NOT NULL,
      status_code integer,
      response_body text,
      error text,
      delivered_at text NOT NULL,
      retry_count integer NOT NULL DEFAULT 0
    );
  `);
} catch { /* ignore */ }

export const db = drizzle(sqlite);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<InsertSettings>): Promise<Settings>;

  getLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  createLeads(rows: InsertLead[]): Promise<Lead[]>;
  updateLead(id: number, patch: Partial<InsertLead>): Promise<Lead | undefined>;
  updateLeadsStatus(ids: number[], status: string): Promise<number>;
  deleteLead(id: number): Promise<boolean>;
  deleteLeads(ids: number[]): Promise<number>;

  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(c: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, patch: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  duplicateCampaign(id: number): Promise<Campaign | undefined>;
  deleteCampaign(id: number): Promise<boolean>;

  getSteps(campaignId: number): Promise<Step[]>;
  getStep(id: number): Promise<Step | undefined>;
  createStep(s: InsertStep): Promise<Step>;
  updateStep(id: number, patch: Partial<InsertStep>): Promise<Step | undefined>;
  deleteStep(id: number): Promise<boolean>;

  getMessages(): Promise<Message[]>;
  getMessagesByLead(leadId: number): Promise<Message[]>;
  createMessage(m: InsertMessage): Promise<Message>;
  updateMessage(id: number, patch: Partial<InsertMessage>): Promise<Message | undefined>;

  getJobs(): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  createJob(j: InsertJob): Promise<Job>;
  updateJob(id: number, patch: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: number): Promise<boolean>;

  getForms(): Promise<Form[]>;
  getForm(id: number): Promise<Form | undefined>;
  createForm(f: InsertForm): Promise<Form>;
  updateForm(id: number, patch: Partial<InsertForm>): Promise<Form | undefined>;
  deleteForm(id: number): Promise<boolean>;
  getFormSubmissions(formId: number): Promise<FormSubmission[]>;
  createFormSubmission(s: InsertFormSubmission): Promise<FormSubmission>;

  getFunnels(): Promise<Funnel[]>;
  getFunnel(id: number): Promise<Funnel | undefined>;
  getFunnelBySlug(slug: string): Promise<Funnel | undefined>;
  createFunnel(f: InsertFunnel): Promise<Funnel>;
  updateFunnel(id: number, patch: Partial<InsertFunnel>): Promise<Funnel | undefined>;
  deleteFunnel(id: number): Promise<boolean>;

  getAutomations(): Promise<Automation[]>;
  getAutomation(id: number): Promise<Automation | undefined>;
  createAutomation(a: InsertAutomation): Promise<Automation>;
  updateAutomation(id: number, patch: Partial<InsertAutomation>): Promise<Automation | undefined>;
  deleteAutomation(id: number): Promise<boolean>;
  incrementAutomationRunCount(id: number): Promise<void>;

  getMeetings(): Promise<Meeting[]>;
  getMeeting(id: number): Promise<Meeting | undefined>;
  createMeeting(m: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, patch: Partial<InsertMeeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: number): Promise<boolean>;

  getCalendarSettings(): Promise<CalendarSettings>;
  updateCalendarSettings(patch: Partial<InsertCalendarSettings>): Promise<CalendarSettings>;
  getMessagesByCampaign(campaignId: number): Promise<Message[]>;

  getReminders(): Promise<Reminder[]>;
  getRemindersByLead(leadId: number): Promise<Reminder[]>;
  createReminder(r: InsertReminder): Promise<Reminder>;
  updateReminder(id: number, patch: Partial<InsertReminder>): Promise<Reminder | undefined>;
  deleteReminder(id: number): Promise<boolean>;

  getWebhooks(): Promise<Webhook[]>;
  getWebhook(id: number): Promise<Webhook | undefined>;
  createWebhook(w: InsertWebhook): Promise<Webhook>;
  updateWebhook(id: number, patch: Partial<InsertWebhook>): Promise<Webhook | undefined>;
  deleteWebhook(id: number): Promise<boolean>;
  updateWebhookFailureCount(id: number, count: number): Promise<void>;
  updateWebhookLastTriggered(id: number): Promise<void>;

  getWebhookDeliveries(webhookId: number): Promise<WebhookDelivery[]>;
  createWebhookDelivery(d: InsertWebhookDelivery): Promise<WebhookDelivery>;
  getRecentWebhookDeliveries(limit: number): Promise<WebhookDelivery[]>;

  getSavedFilters(): Promise<SavedFilter[]>;
  getSavedFilter(id: number): Promise<SavedFilter | undefined>;
  createSavedFilter(f: InsertSavedFilter): Promise<SavedFilter>;
  updateSavedFilter(id: number, patch: Partial<InsertSavedFilter>): Promise<SavedFilter | undefined>;
  deleteSavedFilter(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number) {
    return db.select().from(users).where(eq(users.id, id)).get();
  }
  async getUserByUsername(username: string) {
    return db.select().from(users).where(eq(users.username, username)).get();
  }
  async createUser(insertUser: InsertUser) {
    return db.insert(users).values(insertUser).returning().get();
  }

  async getSettings() {
    let row = db.select().from(settings).where(eq(settings.id, 1)).get();
    if (!row) {
      row = db.insert(settings).values({ id: 1 } as any).returning().get();
    }
    return row;
  }
  async updateSettings(patch: Partial<InsertSettings>) {
    await this.getSettings();
    return db.update(settings).set(patch).where(eq(settings.id, 1)).returning().get();
  }

  async getLeads() {
    return db.select().from(leads).all();
  }
  async getLead(id: number) {
    return db.select().from(leads).where(eq(leads.id, id)).get();
  }
  async createLead(lead: InsertLead) {
    return db.insert(leads).values(lead).returning().get();
  }
  async createLeads(rows: InsertLead[]) {
    if (rows.length === 0) return [];
    return db.transaction((tx) => {
      const out: Lead[] = [];
      for (const r of rows) {
        out.push(tx.insert(leads).values(r).returning().get() as Lead);
      }
      return out;
    });
  }
  async updateLead(id: number, patch: Partial<InsertLead>) {
    return db.update(leads).set(patch).where(eq(leads.id, id)).returning().get();
  }
  async updateLeadsStatus(ids: number[], status: string) {
    if (ids.length === 0) return 0;
    return db.update(leads).set({ status }).where(inArray(leads.id, ids)).run().changes;
  }
  async deleteLead(id: number) {
    db.delete(messages).where(eq(messages.leadId, id)).run();
    return db.delete(leads).where(eq(leads.id, id)).run().changes > 0;
  }
  async deleteLeads(ids: number[]) {
    if (ids.length === 0) return 0;
    db.delete(messages).where(inArray(messages.leadId, ids)).run();
    return db.delete(leads).where(inArray(leads.id, ids)).run().changes;
  }

  async getCampaigns() {
    return db.select().from(campaigns).all();
  }
  async getCampaign(id: number) {
    return db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  }
  async createCampaign(c: InsertCampaign) {
    return db.insert(campaigns).values(c).returning().get();
  }
  async updateCampaign(id: number, patch: Partial<InsertCampaign>) {
    return db.update(campaigns).set(patch).where(eq(campaigns.id, id)).returning().get();
  }
  async duplicateCampaign(id: number) {
    const src = db.select().from(campaigns).where(eq(campaigns.id, id)).get();
    if (!src) return undefined;
    const { id: _omit, ...rest } = src as any;
    const copy = db.insert(campaigns).values({
      ...rest,
      name: `${src.name} (Copy)`,
      status: "draft",
    }).returning().get();
    const srcSteps = db.select().from(steps).where(eq(steps.campaignId, id)).all();
    for (const s of srcSteps) {
      const { id: _sid, campaignId: _cid, ...stepRest } = s as any;
      db.insert(steps).values({ ...stepRest, campaignId: copy.id }).run();
    }
    return copy;
  }
  async deleteCampaign(id: number) {
    db.delete(steps).where(eq(steps.campaignId, id)).run();
    return db.delete(campaigns).where(eq(campaigns.id, id)).run().changes > 0;
  }

  async getSteps(campaignId: number) {
    return db.select().from(steps).where(eq(steps.campaignId, campaignId)).all();
  }
  async getStep(id: number) {
    return db.select().from(steps).where(eq(steps.id, id)).get();
  }
  async createStep(s: InsertStep) {
    return db.insert(steps).values(s).returning().get();
  }
  async updateStep(id: number, patch: Partial<InsertStep>) {
    return db.update(steps).set(patch).where(eq(steps.id, id)).returning().get();
  }
  async deleteStep(id: number) {
    return db.delete(steps).where(eq(steps.id, id)).run().changes > 0;
  }

  async getMessages() {
    return db.select().from(messages).all();
  }
  async getMessagesByLead(leadId: number) {
    return db.select().from(messages).where(eq(messages.leadId, leadId)).all();
  }
  async createMessage(m: InsertMessage) {
    return db.insert(messages).values(m).returning().get();
  }
  async updateMessage(id: number, patch: Partial<InsertMessage>) {
    return db.update(messages).set(patch).where(eq(messages.id, id)).returning().get();
  }

  async getJobs() {
    return db.select().from(jobs).all();
  }
  async getJob(id: number) {
    return db.select().from(jobs).where(eq(jobs.id, id)).get();
  }
  async createJob(j: InsertJob) {
    return db.insert(jobs).values(j).returning().get();
  }
  async updateJob(id: number, patch: Partial<InsertJob>) {
    return db.update(jobs).set(patch).where(eq(jobs.id, id)).returning().get();
  }
  async deleteJob(id: number) {
    return db.delete(jobs).where(eq(jobs.id, id)).run().changes > 0;
  }

  async getForms() { return db.select().from(forms).all(); }
  async getForm(id: number) { return db.select().from(forms).where(eq(forms.id, id)).get(); }
  async createForm(f: InsertForm) { return db.insert(forms).values(f).returning().get(); }
  async updateForm(id: number, patch: Partial<InsertForm>) {
    return db.update(forms).set(patch).where(eq(forms.id, id)).returning().get();
  }
  async deleteForm(id: number) {
    db.delete(formSubmissions).where(eq(formSubmissions.formId, id)).run();
    return db.delete(forms).where(eq(forms.id, id)).run().changes > 0;
  }
  async getFormSubmissions(formId: number) {
    return db.select().from(formSubmissions).where(eq(formSubmissions.formId, formId)).all();
  }
  async createFormSubmission(s: InsertFormSubmission) {
    return db.insert(formSubmissions).values(s).returning().get();
  }

  async getFunnels() { return db.select().from(funnels).all(); }
  async getFunnel(id: number) { return db.select().from(funnels).where(eq(funnels.id, id)).get(); }
  async getFunnelBySlug(slug: string) { return db.select().from(funnels).where(eq(funnels.slug, slug)).get(); }
  async createFunnel(f: InsertFunnel) { return db.insert(funnels).values(f).returning().get(); }
  async updateFunnel(id: number, patch: Partial<InsertFunnel>) {
    return db.update(funnels).set(patch).where(eq(funnels.id, id)).returning().get();
  }
  async deleteFunnel(id: number) { return db.delete(funnels).where(eq(funnels.id, id)).run().changes > 0; }

  async getAutomations() { return db.select().from(automations).all(); }
  async getAutomation(id: number) { return db.select().from(automations).where(eq(automations.id, id)).get(); }
  async createAutomation(a: InsertAutomation) { return db.insert(automations).values(a).returning().get(); }
  async updateAutomation(id: number, patch: Partial<InsertAutomation>) {
    return db.update(automations).set(patch).where(eq(automations.id, id)).returning().get();
  }
  async deleteAutomation(id: number) { return db.delete(automations).where(eq(automations.id, id)).run().changes > 0; }
  async incrementAutomationRunCount(id: number) {
    sqlite.prepare("UPDATE automations SET run_count = run_count + 1 WHERE id = ?").run(id);
  }

  async getMeetings() { return db.select().from(meetings).all(); }
  async getMeeting(id: number) { return db.select().from(meetings).where(eq(meetings.id, id)).get(); }
  async createMeeting(m: InsertMeeting) { return db.insert(meetings).values(m).returning().get(); }
  async updateMeeting(id: number, patch: Partial<InsertMeeting>) { return db.update(meetings).set(patch).where(eq(meetings.id, id)).returning().get(); }
  async deleteMeeting(id: number) { return db.delete(meetings).where(eq(meetings.id, id)).run().changes > 0; }

  async getCalendarSettings() {
    let row = db.select().from(calendarSettings).where(eq(calendarSettings.id, 1)).get();
    if (!row) row = db.insert(calendarSettings).values({ id: 1 } as any).returning().get();
    return row;
  }
  async updateCalendarSettings(patch: Partial<InsertCalendarSettings>) {
    await this.getCalendarSettings();
    return db.update(calendarSettings).set(patch).where(eq(calendarSettings.id, 1)).returning().get();
  }
  async getMessagesByCampaign(campaignId: number) {
    return db.select().from(messages).where(eq(messages.campaignId, campaignId)).all();
  }

  async getReminders() { return db.select().from(reminders).all(); }
  async getRemindersByLead(leadId: number) { return db.select().from(reminders).where(eq(reminders.leadId, leadId)).all(); }
  async createReminder(r: InsertReminder) { return db.insert(reminders).values(r).returning().get(); }
  async updateReminder(id: number, patch: Partial<InsertReminder>) { return db.update(reminders).set(patch).where(eq(reminders.id, id)).returning().get(); }
  async deleteReminder(id: number) { return db.delete(reminders).where(eq(reminders.id, id)).run().changes > 0; }

  async getSavedFilters() { return db.select().from(savedFilters).all(); }
  async getSavedFilter(id: number) { return db.select().from(savedFilters).where(eq(savedFilters.id, id)).get(); }
  async createSavedFilter(f: InsertSavedFilter) { return db.insert(savedFilters).values(f).returning().get(); }
  async updateSavedFilter(id: number, patch: Partial<InsertSavedFilter>) { return db.update(savedFilters).set({ ...patch, updatedAt: new Date().toISOString() }).where(eq(savedFilters.id, id)).returning().get(); }
  async deleteSavedFilter(id: number) { return db.delete(savedFilters).where(eq(savedFilters.id, id)).run().changes > 0; }

  async getWebhooks() { return db.select().from(webhooks).all(); }
  async getWebhook(id: number) { return db.select().from(webhooks).where(eq(webhooks.id, id)).get(); }
  async createWebhook(w: InsertWebhook) { return db.insert(webhooks).values(w).returning().get(); }
  async updateWebhook(id: number, patch: Partial<InsertWebhook>) {
    return db.update(webhooks).set(patch).where(eq(webhooks.id, id)).returning().get();
  }
  async deleteWebhook(id: number) {
    db.delete(webhookDeliveries).where(eq(webhookDeliveries.webhookId, id)).run();
    return db.delete(webhooks).where(eq(webhooks.id, id)).run().changes > 0;
  }
  async updateWebhookFailureCount(id: number, count: number) {
    db.update(webhooks).set({ failureCount: count }).where(eq(webhooks.id, id)).run();
  }
  async updateWebhookLastTriggered(id: number) {
    const now = new Date().toISOString();
    db.update(webhooks).set({ lastTriggeredAt: now }).where(eq(webhooks.id, id)).run();
  }

  async getWebhookDeliveries(webhookId: number) {
    return db.select().from(webhookDeliveries).where(eq(webhookDeliveries.webhookId, webhookId)).all();
  }
  async createWebhookDelivery(d: InsertWebhookDelivery) {
    return db.insert(webhookDeliveries).values(d).returning().get();
  }
  async getRecentWebhookDeliveries(limit: number) {
    return db.select().from(webhookDeliveries).orderBy((col) => col.deliveredAt).all().slice(-limit);
  }
}

export const storage = new DatabaseStorage();
