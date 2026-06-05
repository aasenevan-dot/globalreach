import { storage, db } from "./storage";
import { leads, campaigns, steps, messages, jobs } from "@shared/schema";

const now = () => new Date().toISOString();

export const seedLeads = [
  // ---- Domestic (US) leads — the default Local experience ----
  // Midwest / home-territory cluster (Logistics)
  { fullName: "Jordan Mitchell", title: "VP of Sales", company: "Brightline Logistics", email: "j.mitchell@brightline.com", phone: "+1 312 555 0142", country: "United States", city: "Chicago", state: "IL", metro: "Chicago, IL", lat: 41.8781, lng: -87.6298, timezone: "America/Chicago", language: "en", industry: "Logistics", companySize: "201-500", verified: true, status: "engaged" },
  { fullName: "Ray Hoffman", title: "Operations Director", company: "Crossroads Freight", email: "rhoffman@crossroadsfreight.com", phone: "+1 317 555 0164", country: "United States", city: "Indianapolis", state: "IN", metro: "Indianapolis, IN", lat: 39.7684, lng: -86.1581, timezone: "America/Indiana/Indianapolis", language: "en", industry: "Logistics", companySize: "51-200", verified: true, status: "new", referredBy: "Cardinal Insurance Group" },
  { fullName: "Megan Stout", title: "Head of Logistics", company: "Hoosier Distribution Co", email: "mstout@hoosierdist.com", phone: "+1 317 555 0181", country: "United States", city: "Indianapolis", state: "IN", metro: "Indianapolis, IN", lat: 39.7684, lng: -86.1581, timezone: "America/Indiana/Indianapolis", language: "en", industry: "Logistics", companySize: "201-500", verified: false, status: "won", referredBy: "Cardinal Insurance Group", dealValue: 48000 },
  { fullName: "Brian Cole", title: "VP Supply Chain", company: "Cardinal Carriers", email: "bcole@cardinalcarriers.com", phone: "+1 614 555 0155", country: "United States", city: "Columbus", state: "OH", metro: "Columbus, OH", lat: 39.9612, lng: -82.9988, timezone: "America/New_York", language: "en", industry: "Logistics", companySize: "201-500", verified: true, status: "contacted" },
  // Healthcare cluster (Northeast)
  { fullName: "Ashley Carter", title: "Head of Procurement", company: "Summit Medical Group", email: "acarter@summitmed.com", phone: "+1 617 555 0199", country: "United States", city: "Boston", state: "MA", metro: "Boston, MA", lat: 42.3601, lng: -71.0589, timezone: "America/New_York", language: "en", industry: "Healthcare", companySize: "501-1000", verified: true, status: "contacted", referredBy: "Beacon Partner Network" },
  { fullName: "Nathan Pierce", title: "Director of Supply", company: "Bay State Health Partners", email: "npierce@baystatehp.com", phone: "+1 617 555 0207", country: "United States", city: "Boston", state: "MA", metro: "Boston, MA", lat: 42.3601, lng: -71.0589, timezone: "America/New_York", language: "en", industry: "Healthcare", companySize: "1001-5000", verified: false, status: "new" },
  { fullName: "Olivia Bennett", title: "Procurement Lead", company: "Empire Care Network", email: "obennett@empirecare.com", phone: "+1 212 555 0233", country: "United States", city: "New York", state: "NY", metro: "New York, NY", lat: 40.7128, lng: -74.006, timezone: "America/New_York", language: "en", industry: "Healthcare", companySize: "501-1000", verified: true, status: "won", referredBy: "Beacon Partner Network", dealValue: 72000 },
  // Manufacturing / Texas cluster
  { fullName: "Marcus Reed", title: "Director of Operations", company: "Cobalt Manufacturing", email: "mreed@cobaltmfg.com", phone: "+1 214 555 0177", country: "United States", city: "Dallas", state: "TX", metro: "Dallas, TX", lat: 32.7767, lng: -96.797, timezone: "America/Chicago", language: "en", industry: "Manufacturing", companySize: "1001-5000", verified: true, status: "new" },
  { fullName: "Sandra Webb", title: "Plant Manager", company: "Lone Star Fabrication", email: "swebb@lonestarfab.com", phone: "+1 512 555 0190", country: "United States", city: "Austin", state: "TX", metro: "Austin, TX", lat: 30.2672, lng: -97.7431, timezone: "America/Chicago", language: "en", industry: "Manufacturing", companySize: "501-1000", verified: true, status: "contacted", referredBy: "Referral — Existing Customer" },
  // Software / West Coast cluster
  { fullName: "Priya Nair", title: "CTO", company: "Northstar SaaS", email: "priya@northstarsaas.io", phone: "+1 415 555 0110", country: "United States", city: "San Francisco", state: "CA", metro: "San Francisco, CA", lat: 37.7749, lng: -122.4194, timezone: "America/Los_Angeles", language: "en", industry: "Software", companySize: "51-200", verified: true, status: "meeting", referredBy: "Beacon Partner Network" },
  { fullName: "Daniel Hsu", title: "VP Engineering", company: "Cascade Cloud", email: "dhsu@cascadecloud.io", phone: "+1 206 555 0121", country: "United States", city: "Seattle", state: "WA", metro: "Seattle, WA", lat: 47.6062, lng: -122.3321, timezone: "America/Los_Angeles", language: "en", industry: "Software", companySize: "51-200", verified: false, status: "new" },
  { fullName: "Tyler Brooks", title: "Purchasing Manager", company: "Evergreen Foods", email: "tbrooks@evergreenfoods.com", phone: "+1 503 555 0133", country: "United States", city: "Portland", state: "OR", metro: "Portland, OR", lat: 45.5152, lng: -122.6784, timezone: "America/Los_Angeles", language: "en", industry: "Food & Beverage", companySize: "201-500", verified: false, status: "new" },
  // Finance
  { fullName: "Danielle Foster", title: "VP Marketing", company: "Apex Financial", email: "dfoster@apexfin.com", phone: "+1 646 555 0188", country: "United States", city: "New York", state: "NY", metro: "New York, NY", lat: 40.7128, lng: -74.006, timezone: "America/New_York", language: "en", industry: "Finance", companySize: "1001-5000", verified: true, status: "won", referredBy: "Referral — Existing Customer", dealValue: 125000 },
  { fullName: "Greg Sullivan", title: "Head of Treasury", company: "Meridian Capital", email: "gsullivan@meridiancap.com", phone: "+1 312 555 0244", country: "United States", city: "Chicago", state: "IL", metro: "Chicago, IL", lat: 41.8781, lng: -87.6298, timezone: "America/Chicago", language: "en", industry: "Finance", companySize: "501-1000", verified: true, status: "new" },

  // ---- International leads — unlocked in International mode ----
  { fullName: "Lukas Schneider", title: "Geschäftsführer", company: "Rheinwerk GmbH", email: "l.schneider@rheinwerk.de", phone: "+49 30 5550 142", country: "Germany", city: "Berlin", timezone: "Europe/Berlin", language: "de", industry: "Manufacturing", companySize: "201-500", verified: true, status: "engaged" },
  { fullName: "Sofía Ramírez", title: "Directora de Compras", company: "Grupo Andalux", email: "sramirez@andalux.es", phone: "+34 91 555 0142", country: "Spain", city: "Madrid", timezone: "Europe/Madrid", language: "es", industry: "Retail", companySize: "501-1000", verified: true, status: "contacted" },
  { fullName: "Hiroshi Tanaka", title: "事業部長", company: "Sakura Robotics", email: "h.tanaka@sakura-robotics.jp", phone: "+81 3 5550 0142", country: "Japan", city: "Tokyo", timezone: "Asia/Tokyo", language: "ja", industry: "Robotics", companySize: "1001-5000", verified: true, status: "new" },
  { fullName: "Camille Dubois", title: "Responsable Achats", company: "Lumière Tech", email: "c.dubois@lumieretech.fr", phone: "+33 1 5550 0142", country: "France", city: "Paris", timezone: "Europe/Paris", language: "fr", industry: "Software", companySize: "51-200", verified: true, status: "meeting" },
  { fullName: "Mateus Oliveira", title: "Diretor de TI", company: "Atlântico Digital", email: "m.oliveira@atlantico.com.br", phone: "+55 11 5550 0142", country: "Brazil", city: "São Paulo", timezone: "America/Sao_Paulo", language: "pt", industry: "Technology", companySize: "201-500", verified: false, status: "new" },
  { fullName: "Anna Kowalski", title: "Dyrektor Operacyjny", company: "Wisła Systems", email: "a.kowalski@wislasystems.pl", phone: "+48 22 555 0142", country: "Poland", city: "Warsaw", timezone: "Europe/Warsaw", language: "pl", industry: "Logistics", companySize: "201-500", verified: true, status: "engaged" },
  { fullName: "Wei Chen", title: "采购总监", company: "Hongtu Industries", email: "wei.chen@hongtu.cn", phone: "+86 21 5550 0142", country: "China", city: "Shanghai", timezone: "Asia/Shanghai", language: "zh", industry: "Manufacturing", companySize: "5001+", verified: true, status: "contacted" },
  { fullName: "Isabella Rossi", title: "Direttore Vendite", company: "Veneto Group", email: "i.rossi@venetogroup.it", phone: "+39 02 5550 0142", country: "Italy", city: "Milan", timezone: "Europe/Rome", language: "it", industry: "Fashion", companySize: "501-1000", verified: true, status: "new" },
  { fullName: "Liam O'Connor", title: "Procurement Lead", company: "Shannon Pharma", email: "l.oconnor@shannonpharma.ie", phone: "+353 1 555 0142", country: "Ireland", city: "Dublin", timezone: "Europe/Dublin", language: "en", industry: "Pharmaceutical", companySize: "1001-5000", verified: true, status: "meeting" },
  { fullName: "Aisha Al-Farsi", title: "Head of Procurement", company: "Gulf Horizon", email: "a.alfarsi@gulfhorizon.ae", phone: "+971 4 555 0142", country: "United Arab Emirates", city: "Dubai", timezone: "Asia/Dubai", language: "ar", industry: "Construction", companySize: "1001-5000", verified: false, status: "new" },
];

export const seedCampaigns = [
  {
    name: "US Mid-Market Outbound Q3",
    status: "active",
    channels: JSON.stringify(["email", "call", "sms"]),
    languages: JSON.stringify(["en"]),
    targetCountries: JSON.stringify(["United States"]),
    sendWindowStart: 9, sendWindowEnd: 17, respectTimezone: true, autoTranslate: false,
  },
  {
    name: "EMEA Expansion — Multi-Language",
    status: "active",
    channels: JSON.stringify(["email", "linkedin", "whatsapp"]),
    languages: JSON.stringify(["en", "de", "es", "fr", "it"]),
    targetCountries: JSON.stringify(["Germany", "Spain", "France", "Italy", "Poland"]),
    sendWindowStart: 8, sendWindowEnd: 18, respectTimezone: true, autoTranslate: true,
  },
  {
    name: "APAC New Logos",
    status: "draft",
    channels: JSON.stringify(["email", "linkedin"]),
    languages: JSON.stringify(["en", "ja", "zh"]),
    targetCountries: JSON.stringify(["Japan", "China"]),
    sendWindowStart: 9, sendWindowEnd: 17, respectTimezone: true, autoTranslate: true,
  },
];

// Residential roofing jobs (Consumer / B2C view). Greensburg, Indiana territory.
// Referral sources mirror leads.referredBy so source ROI rolls up together.
export const seedJobs = [
  // ---- Completed (revenue on the board) ----
  { homeowner: "Doug & Karen Mills", phone: "+1 812 555 0142", email: "dmills@example.com", address: "412 N Franklin St", city: "Greensburg", state: "IN", roofType: "Asphalt shingle", insuranceClaim: true, referredBy: "State Farm — Greensburg (Tom Reilly)", value: 14200, stage: "completed", notes: "Hail damage, full replacement. Adjuster approved supplement for ridge vent." },
  { homeowner: "Marcus Webb", phone: "+1 812 555 0188", email: "mwebb@example.com", address: "88 W Central Ave", city: "Greensburg", state: "IN", roofType: "Metal", insuranceClaim: false, referredBy: "Referral — Past Customer", value: 21800, stage: "completed", notes: "Standing-seam metal upgrade, retail / out-of-pocket." },
  { homeowner: "Linda Hoffman", phone: "+1 812 555 0205", email: "lhoffman@example.com", address: "1240 E Main St", city: "Greensburg", state: "IN", roofType: "Asphalt shingle", insuranceClaim: true, referredBy: "Allstate — Batesville (Janet Cole)", value: 11900, stage: "completed", notes: "Wind damage claim, approved and installed." },
  { homeowner: "Steve Tucker", phone: "+1 812 555 0231", address: "305 Vine St", city: "Greensburg", state: "IN", roofType: "Gutters", insuranceClaim: false, referredBy: "Google", value: 3400, stage: "completed", notes: "Full gutter + guard install." },

  // ---- Scheduled (won, awaiting install) ----
  { homeowner: "The Reardon Family", phone: "+1 812 555 0117", email: "reardon@example.com", address: "77 Smith Rd", city: "Greensburg", state: "IN", roofType: "Asphalt shingle", insuranceClaim: true, referredBy: "State Farm — Greensburg (Tom Reilly)", value: 13600, stage: "scheduled", notes: "Crew scheduled next Tuesday, materials delivered." },
  { homeowner: "Patricia Nolan", phone: "+1 812 555 0150", address: "920 N Michigan Ave", city: "Greensburg", state: "IN", roofType: "Tile", insuranceClaim: false, referredBy: "Referral — Past Customer", value: 28500, stage: "scheduled", notes: "Concrete tile, premium retail job." },

  // ---- Approved (claim/estimate accepted) ----
  { homeowner: "Greg & Sue Adkins", phone: "+1 812 555 0163", email: "gadkins@example.com", address: "56 County Rd 200 W", city: "Greensburg", state: "IN", roofType: "Asphalt shingle", insuranceClaim: true, referredBy: "Allstate — Batesville (Janet Cole)", value: 12750, stage: "approved", notes: "Claim approved, signing contract this week." },
  { homeowner: "Brian Schaefer", phone: "+1 812 555 0179", address: "33 Westridge Dr", city: "Greensburg", state: "IN", roofType: "Flat / TPO", insuranceClaim: false, referredBy: "Door-knock — Westridge", value: 9200, stage: "approved", notes: "Garage flat roof, estimate accepted." },

  // ---- Claim (insurance pending) ----
  { homeowner: "Donna Pruitt", phone: "+1 812 555 0194", email: "dpruitt@example.com", address: "145 Park St", city: "Greensburg", state: "IN", roofType: "Asphalt shingle", insuranceClaim: true, referredBy: "State Farm — Greensburg (Tom Reilly)", value: 13100, stage: "claim", notes: "Adjuster meeting set, waiting on scope." },
  { homeowner: "The Yoder Family", phone: "+1 812 555 0210", address: "610 S Ireland St", city: "Greensburg", state: "IN", roofType: "Asphalt shingle", insuranceClaim: true, referredBy: "Liberty Mutual — Columbus (Rick Dane)", value: 15400, stage: "claim", notes: "Storm damage, claim filed last week." },

  // ---- Estimate (quote out) ----
  { homeowner: "Curtis Lane", phone: "+1 812 555 0226", email: "clane@example.com", address: "219 Maple Ln", city: "Greensburg", state: "IN", roofType: "Metal", insuranceClaim: false, referredBy: "Google", value: 19500, stage: "estimate", notes: "Quote sent, deciding between metal and shingle." },
  { homeowner: "Rachel Combs", phone: "+1 812 555 0240", address: "802 N East St", city: "Greensburg", state: "IN", roofType: "Cedar shake", insuranceClaim: false, referredBy: "Referral — Past Customer", value: 24800, stage: "estimate", notes: "Historic home, cedar shake restoration estimate." },

  // ---- Inspection (top of funnel) ----
  { homeowner: "Tony Reyes", phone: "+1 812 555 0255", address: "410 Anderson St", city: "Greensburg", state: "IN", roofType: "Asphalt shingle", insuranceClaim: true, referredBy: "Door-knock — Anderson St", value: 12000, stage: "inspection", notes: "Free inspection scheduled, visible hail bruising." },
  { homeowner: "Megan Frost", phone: "+1 812 555 0268", email: "mfrost@example.com", address: "77 Birch Ct", city: "Greensburg", state: "IN", roofType: "Repair", insuranceClaim: false, referredBy: "Google", value: 1800, stage: "inspection", notes: "Leak around chimney flashing, repair eval." },
  { homeowner: "Walt Henderson", phone: "+1 812 555 0271", address: "1502 W Base Rd", city: "Greensburg", state: "IN", roofType: "Asphalt shingle", insuranceClaim: true, referredBy: "Liberty Mutual — Columbus (Rick Dane)", value: 13900, stage: "inspection", notes: "Neighbor of the Yoders, same storm cell." },

  // ---- Lost (for funnel realism) ----
  { homeowner: "Phil Carmody", phone: "+1 812 555 0283", address: "64 Oakdale Dr", city: "Greensburg", state: "IN", roofType: "Asphalt shingle", insuranceClaim: false, referredBy: "Google", value: 10500, stage: "lost", notes: "Went with a cheaper competitor." },
];

export async function runSeed() {
  const createdLeads = [];
  for (const l of seedLeads) createdLeads.push(await storage.createLead(l as any));

  const createdCampaigns = [];
  for (const c of seedCampaigns) createdCampaigns.push(await storage.createCampaign(c as any));

  const createdJobs = [];
  for (const j of seedJobs) createdJobs.push(await storage.createJob({ createdAt: now(), ...j } as any));

  // Steps for US Mid-Market campaign (index 0) — with personalization tokens
  const us = createdCampaigns[0];
  await storage.createStep({ campaignId: us.id, stepOrder: 1, channel: "email", delayDays: 0, subject: "Quick idea for {{company}}", body: "Hi {{firstName}},\n\nI noticed {{company}} is growing in the {{industry}} space. We help {{companySize}}-employee teams like yours find and close more qualified deals.\n\nWorth a 15-minute call this week?\n\nBest,\nGlobalReach", translations: "{}" } as any);
  await storage.createStep({ campaignId: us.id, stepOrder: 2, channel: "email", delayDays: 3, subject: "Following up — {{company}}", body: "Hi {{firstName}},\n\nJust following up on my note. Happy to share how other {{industry}} teams in {{city}} are using GlobalReach to double their pipeline.\n\nWorth a quick chat?", translations: "{}" } as any);
  await storage.createStep({ campaignId: us.id, stepOrder: 3, channel: "call", delayDays: 7, subject: null, body: "Hi {{firstName}}, this is [Your Name] from GlobalReach. I sent you a couple of emails about helping {{company}} close more deals. Do you have 2 minutes?", translations: "{}" } as any);

  // Steps for EMEA campaign (index 1)
  const emea = createdCampaigns[1];
  if (emea) {
    await storage.createStep({ campaignId: emea.id, stepOrder: 1, channel: "email", delayDays: 0, subject: "Quick idea for {{company}}", body: "Hi {{firstName}}, I noticed {{company}} is scaling across {{country}}. We help teams like yours cut procurement cycle time by 30%. Worth a 15-min chat?", translations: JSON.stringify({ de: { subject: "Kurze Idee für {{company}}", body: "Hallo {{firstName}}, mir ist aufgefallen, dass {{company}} in {{country}} wächst. Wir helfen Teams wie Ihrem, die Beschaffungszeit um 30 % zu verkürzen. Lohnt sich ein 15-minütiges Gespräch?" }, es: { subject: "Una idea rápida para {{company}}", body: "Hola {{firstName}}, vi que {{company}} está creciendo en {{country}}. Ayudamos a equipos como el suyo a reducir el ciclo de compras en un 30%. ¿Vale una charla de 15 minutos?" }, fr: { subject: "Une idée rapide pour {{company}}", body: "Bonjour {{firstName}}, j'ai remarqué que {{company}} se développe en {{country}}. Nous aidons les équipes comme la vôtre à réduire le cycle d'achat de 30 %. Un échange de 15 minutes ?" }, it: { subject: "Un'idea veloce per {{company}}", body: "Ciao {{firstName}}, ho notato che {{company}} sta crescendo in {{country}}. Aiutiamo team come il vostro a ridurre del 30% i tempi di approvvigionamento. Vale una chiacchierata di 15 minuti?" } }) } as any);
    await storage.createStep({ campaignId: emea.id, stepOrder: 2, channel: "linkedin", delayDays: 3, subject: null, body: "Hi {{firstName}}, following up on my note — happy to share how peers in {{country}} approached this.", translations: JSON.stringify({ de: { body: "Hallo {{firstName}}, kurze Erinnerung an meine Nachricht — ich teile gerne, wie andere in {{country}} das angegangen sind." }, es: { body: "Hola {{firstName}}, siguiendo mi mensaje — encantado de compartir cómo lo abordaron otros en {{country}}." } }) } as any);
  }

  // Seed inbox messages
  const lukas = createdLeads.find((l: any) => l.fullName === "Lukas Schneider");
  if (lukas && emea) {
    await storage.createMessage({ leadId: lukas.id, campaignId: emea.id, channel: "email", direction: "outbound", language: "de", subject: "Kurze Idee für Rheinwerk GmbH", body: "Hallo Lukas, mir ist aufgefallen, dass Rheinwerk in Deutschland wächst...", scheduledFor: now(), localSendTime: "9:12 AM CEST", status: "opened", createdAt: now() } as any);
    await storage.createMessage({ leadId: lukas.id, campaignId: emea.id, channel: "email", direction: "inbound", language: "de", subject: "Re: Kurze Idee für Rheinwerk GmbH", body: "Hallo, klingt interessant. Können wir nächste Woche sprechen?", scheduledFor: null, localSendTime: null, status: "replied", createdAt: now() } as any);
  }
  const jordan = createdLeads.find((l: any) => l.fullName === "Jordan Mitchell");
  if (jordan) {
    await storage.createMessage({ leadId: jordan.id, channel: "email", direction: "outbound", language: "en", subject: "Quick idea for Brightline Logistics", body: "Hi Jordan, noticed Brightline is scaling...", scheduledFor: now(), localSendTime: "9:00 AM CDT", status: "replied", createdAt: now() } as any);
  }

  return { leads: createdLeads.length, campaigns: createdCampaigns.length, jobs: createdJobs.length };
}

async function main() {
  db.delete(messages).run();
  db.delete(steps).run();
  db.delete(campaigns).run();
  db.delete(leads).run();
  db.delete(jobs).run();
  const result = await runSeed();
  console.log(`Seeded ${result.leads} leads, ${result.campaigns} campaigns, ${result.jobs} jobs.`);
  process.exit(0);
}

// Only auto-run when executed directly as a CLI script, not when imported by the server
if (process.argv[1] && (process.argv[1].includes("seed") || process.argv[1].includes("tsx"))) {
  main();
}
