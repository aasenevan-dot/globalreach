// Reference data + helpers powering the international features.

export const LANGUAGES: Record<string, { name: string; flag: string; native: string }> = {
  en: { name: "English", flag: "🇬🇧", native: "English" },
  de: { name: "German", flag: "🇩🇪", native: "Deutsch" },
  es: { name: "Spanish", flag: "🇪🇸", native: "Español" },
  fr: { name: "French", flag: "🇫🇷", native: "Français" },
  it: { name: "Italian", flag: "🇮🇹", native: "Italiano" },
  pt: { name: "Portuguese", flag: "🇧🇷", native: "Português" },
  pl: { name: "Polish", flag: "🇵🇱", native: "Polski" },
  ja: { name: "Japanese", flag: "🇯🇵", native: "日本語" },
  zh: { name: "Chinese", flag: "🇨🇳", native: "中文" },
  ar: { name: "Arabic", flag: "🇦🇪", native: "العربية" },
};

export const COUNTRY_FLAG: Record<string, string> = {
  "United States": "🇺🇸", Germany: "🇩🇪", Spain: "🇪🇸", France: "🇫🇷",
  Italy: "🇮🇹", Brazil: "🇧🇷", Poland: "🇵🇱", Japan: "🇯🇵",
  China: "🇨🇳", "United Arab Emirates": "🇦🇪", Ireland: "🇮🇪",
};

export const CHANNELS: Record<string, { label: string; icon: string }> = {
  email: { label: "Email", icon: "mail" },
  linkedin: { label: "LinkedIn", icon: "linkedin" },
  whatsapp: { label: "WhatsApp", icon: "message-circle" },
  sms: { label: "SMS", icon: "smartphone" },
  call: { label: "Call", icon: "phone" },
};

// Channels available per mode. Local keeps it simple.
export const LOCAL_CHANNELS = ["email", "call", "sms"];
export const INTL_CHANNELS = ["email", "linkedin", "whatsapp", "sms", "call"];

export function flagForLang(lang: string) {
  return LANGUAGES[lang]?.flag ?? "🏳️";
}

export function langName(lang: string) {
  return LANGUAGES[lang]?.name ?? lang.toUpperCase();
}

// Current local time in a given IANA timezone.
export function localTimeIn(tz: string): { time: string; hour: number; inWindow: boolean } {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true,
    });
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "numeric", hour12: false,
    }).formatToParts(new Date());
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    return { time: fmt.format(new Date()), hour, inWindow: hour >= 8 && hour < 18 };
  } catch {
    return { time: "—", hour: 0, inWindow: false };
  }
}

// Short timezone label, e.g. "CEST", "JST".
export function tzAbbrev(tz: string): string {
  try {
    const s = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, timeZoneName: "short", hour: "numeric",
    }).formatToParts(new Date());
    return s.find((p) => p.type === "timeZoneName")?.value ?? tz;
  } catch {
    return tz;
  }
}

// Compact US-dollar formatting for deal values and referral revenue.
export function formatUSD(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "—";
  if (Math.abs(amount) >= 1000) {
    const k = amount / 1000;
    const rounded = k >= 100 ? Math.round(k) : Math.round(k * 10) / 10;
    return `$${rounded}k`;
  }
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

// Full-precision dollars, e.g. $48,000 — for single-record displays.
export function formatUSDFull(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "—";
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

// ---- Consumer (B2C) roofing job pipeline ----
// Roof / service types offered. Free text in the DB, but these power the picker.
export const ROOF_TYPES = [
  "Asphalt shingle",
  "Metal",
  "Tile",
  "Flat / TPO",
  "Cedar shake",
  "Slate",
  "Repair",
  "Gutters",
];

// Residential job pipeline stages, in funnel order. "lost" shown as a trailing lane.
export const JOB_STAGES = [
  "inspection",
  "estimate",
  "claim",
  "approved",
  "scheduled",
  "completed",
  "lost",
];

export const JOB_STAGE_META: Record<string, { label: string; tone: string; accent: string }> = {
  inspection: { label: "Inspection", tone: "bg-slate-500/10 text-slate-600 dark:text-slate-300", accent: "bg-slate-400" },
  estimate: { label: "Estimate", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-300", accent: "bg-blue-500" },
  claim: { label: "Insurance claim", tone: "bg-teal-500/10 text-teal-600 dark:text-teal-300", accent: "bg-teal-500" },
  approved: { label: "Approved", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-300", accent: "bg-amber-500" },
  scheduled: { label: "Scheduled", tone: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300", accent: "bg-cyan-500" },
  completed: { label: "Completed", tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300", accent: "bg-emerald-500" },
  lost: { label: "Lost", tone: "bg-rose-500/10 text-rose-600 dark:text-rose-300", accent: "bg-rose-500" },
};

export const STATUS_META: Record<string, { label: string; tone: string }> = {
  new: { label: "New", tone: "bg-slate-500/10 text-slate-600 dark:text-slate-300" },
  contacted: { label: "Contacted", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-300" },
  engaged: { label: "Engaged", tone: "bg-teal-500/10 text-teal-600 dark:text-teal-300" },
  meeting: { label: "Meeting", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-300" },
  won: { label: "Won", tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
  lost: { label: "Lost", tone: "bg-rose-500/10 text-rose-600 dark:text-rose-300" },
};
