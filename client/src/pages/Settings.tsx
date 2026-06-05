import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMode } from "@/lib/mode";
import type { Settings as AppSettings } from "@shared/schema";
import {
  LANGUAGES, COUNTRY_FLAG, flagForLang, langName, localTimeIn, tzAbbrev,
} from "@/lib/i18n-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Globe, Clock, Languages as LangIcon, Home, Sparkles, Mail, Database, CheckCircle2, AlertCircle, Bot, Lock } from "lucide-react";

const COUNTRY_TZ: Record<string, string[]> = {
  "United States": ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"],
  Germany: ["Europe/Berlin"],
  Spain: ["Europe/Madrid"],
  France: ["Europe/Paris"],
  Italy: ["Europe/Rome"],
  Brazil: ["America/Sao_Paulo"],
  Poland: ["Europe/Warsaw"],
  Japan: ["Asia/Tokyo"],
  China: ["Asia/Shanghai"],
  "United Arab Emirates": ["Asia/Dubai"],
  Ireland: ["Europe/Dublin"],
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface CalSet { smtpHost: string; smtpPort: number; smtpUser: string; smtpPass: string; smtpFromName: string; smtpFromEmail: string; smtpSecure: boolean; }

export default function Settings() {
  const { mode, setMode, isInternational } = useMode();
  const { data, isLoading } = useQuery<AppSettings>({ queryKey: ["/api/settings"] });
  const { toast } = useToast();

  const [homeCountry, setHomeCountry] = useState("United States");
  const [homeTimezone, setHomeTimezone] = useState("America/New_York");
  const [homeLanguage, setHomeLanguage] = useState("en");

  const [aiApiKey, setAiApiKey] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [smtp, setSmtp] = useState<CalSet>({ smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "", smtpFromName: "GlobalReach", smtpFromEmail: "", smtpSecure: false });
  const [smtpStatus, setSmtpStatus] = useState<"idle" | "ok" | "fail">("idle");

  const { data: calData } = useQuery<CalSet & { aiApiKey?: string }>({ queryKey: ["/api/calendar-settings"] });
  useEffect(() => {
    if (calData) {
      setSmtp(s => ({ ...s, ...calData }));
      if (calData.aiApiKey) setAiApiKey(calData.aiApiKey);
      if ((calData as any).appPassword) setAppPassword((calData as any).appPassword);
    }
  }, [calData]);

  const saveAi = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/calendar-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aiApiKey }) });
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/calendar-settings"] }); toast({ title: "AI settings saved" }); },
  });

  useEffect(() => {
    if (data) {
      setHomeCountry(data.homeCountry);
      setHomeTimezone(data.homeTimezone);
      setHomeLanguage(data.homeLanguage);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => apiRequest("PATCH", "/api/settings", { homeCountry, homeTimezone, homeLanguage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved", description: "Your home market preferences are updated." });
    },
  });

  const saveSmtp = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/calendar-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(smtp) });
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/calendar-settings"] }); toast({ title: "Email settings saved" }); },
  });

  const testSmtp = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/email/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host: smtp.smtpHost, port: smtp.smtpPort, secure: smtp.smtpSecure, user: smtp.smtpUser, pass: smtp.smtpPass, fromName: smtp.smtpFromName, fromEmail: smtp.smtpFromEmail }) });
      return r.json();
    },
    onSuccess: (d) => { setSmtpStatus(d.ok ? "ok" : "fail"); toast({ title: d.ok ? "Connection successful!" : "Connection failed: " + d.error, variant: d.ok ? "default" : "destructive" }); },
  });

  const savePassword = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/calendar-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appPassword }) });
      if (!r.ok) throw new Error("Failed to save password");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-settings"] });
      toast({ title: appPassword ? "Password set — login required on next visit" : "Password removed — app is open" });
    },
    onError: () => toast({ title: "Failed to save password", variant: "destructive" }),
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/seed", { method: "POST" });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({ title: "Demo data loaded!", description: "Leads, campaigns, and jobs have been populated." });
    },
    onError: () => toast({ title: "Seed failed", variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;

  const tzOptions = COUNTRY_TZ[homeCountry] ?? [homeTimezone];
  const homeClock = localTimeIn(homeTimezone);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your workspace and home market.</p>
      </div>

      {/* Mode selector */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold">Workspace mode</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            data-testid="mode-card-local"
            onClick={() => setMode("local")}
            className={`text-left rounded-lg border p-4 transition-colors ${mode === "local" ? "border-primary bg-primary/5" : "border-border hover-elevate"}`}
          >
            <div className="flex items-center gap-2 font-medium"><Home className="h-4 w-4" /> Local</div>
            <p className="text-xs text-muted-foreground mt-1">Streamlined domestic selling. Email, calls and SMS in your home market.</p>
          </button>
          <button
            type="button"
            data-testid="mode-card-intl"
            onClick={() => setMode("international")}
            className={`text-left rounded-lg border p-4 transition-colors ${mode === "international" ? "border-primary bg-primary/5" : "border-border hover-elevate"}`}
          >
            <div className="flex items-center gap-2 font-medium"><Globe className="h-4 w-4" /> International <span className="text-xs text-muted-foreground">(Advanced)</span></div>
            <p className="text-xs text-muted-foreground mt-1">Multi-language, time-zone-aware outreach across LinkedIn, WhatsApp & more.</p>
          </button>
        </div>
      </Card>

      {/* Home market */}
      <Card className="p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold">Home market</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Country</Label>
            <Select
              value={homeCountry}
              onValueChange={(v) => {
                setHomeCountry(v);
                const tz = (COUNTRY_TZ[v] ?? [])[0];
                if (tz) setHomeTimezone(tz);
              }}
            >
              <SelectTrigger data-testid="select-home-country"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(COUNTRY_TZ).map((c) => (
                  <SelectItem key={c} value={c}>{COUNTRY_FLAG[c] ?? "🌍"} {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Time zone</Label>
            <Select value={homeTimezone} onValueChange={setHomeTimezone}>
              <SelectTrigger data-testid="select-home-tz"><SelectValue /></SelectTrigger>
              <SelectContent>
                {tzOptions.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz.split("/").pop()?.replace("_", " ")} ({tzAbbrev(tz)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><LangIcon className="h-3.5 w-3.5" /> Default language</Label>
            <Select value={homeLanguage} onValueChange={setHomeLanguage}>
              <SelectTrigger data-testid="select-home-lang"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(LANGUAGES).map((l) => (
                  <SelectItem key={l} value={l}>{flagForLang(l)} {langName(l)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Current local time</Label>
            <div className="h-9 flex items-center rounded-md border border-border px-3 font-mono text-sm">
              {homeClock.time} {tzAbbrev(homeTimezone)}
            </div>
          </div>
        </div>

        <Button data-testid="button-save-settings" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </Card>

      {/* Email / SMTP */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold">Email Sending (SMTP)</h2>
        </div>
        <p className="text-xs text-muted-foreground">Connect your SMTP server to send real campaign emails. Works with Gmail, Outlook, SendGrid, Mailgun, etc.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>SMTP Host</Label>
            <Input placeholder="smtp.gmail.com" value={smtp.smtpHost} onChange={e => setSmtp(s => ({ ...s, smtpHost: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Port</Label>
            <Input type="number" placeholder="587" min="1" max="65535" value={smtp.smtpPort} onChange={e => {
              const port = Number(e.target.value);
              if (!isNaN(port) && port >= 1 && port <= 65535) setSmtp(s => ({ ...s, smtpPort: port }));
            }} />
          </div>
          <div className="space-y-1.5">
            <Label>Username / Email</Label>
            <Input placeholder="you@gmail.com" value={smtp.smtpUser} onChange={e => setSmtp(s => ({ ...s, smtpUser: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Password / App Password</Label>
            <Input type="password" placeholder="••••••••••••" value={smtp.smtpPass} onChange={e => setSmtp(s => ({ ...s, smtpPass: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>From Name</Label>
            <Input placeholder="GlobalReach" value={smtp.smtpFromName} onChange={e => setSmtp(s => ({ ...s, smtpFromName: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>From Email</Label>
            <Input
              placeholder="sales@yourcompany.com"
              value={smtp.smtpFromEmail}
              onChange={e => setSmtp(s => ({ ...s, smtpFromEmail: e.target.value }))}
              className={smtp.smtpFromEmail && !isValidEmail(smtp.smtpFromEmail) ? "border-red-500" : ""}
            />
            {smtp.smtpFromEmail && !isValidEmail(smtp.smtpFromEmail) && (
              <p className="text-xs text-red-500">Invalid email format</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={() => testSmtp.mutate()} variant="outline" disabled={testSmtp.isPending} className="gap-2">
            {testSmtp.isPending ? "Testing…" : "Test Connection"}
          </Button>
          {smtpStatus === "ok" && <span className="flex items-center gap-1 text-emerald-500 text-sm"><CheckCircle2 className="h-4 w-4" /> Connected</span>}
          {smtpStatus === "fail" && <span className="flex items-center gap-1 text-red-500 text-sm"><AlertCircle className="h-4 w-4" /> Failed</span>}
          <Button onClick={() => saveSmtp.mutate()} disabled={saveSmtp.isPending} className="ml-auto">
            {saveSmtp.isPending ? "Saving…" : "Save Email Settings"}
          </Button>
        </div>
      </Card>

      {/* Claude AI */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold">AI Email Drafts (Claude)</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Add your Claude API key to enable AI-generated email drafts in the Unified Inbox.
          Get one free at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">console.anthropic.com</a>.
        </p>
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder="sk-ant-api03-..."
            value={aiApiKey}
            onChange={e => setAiApiKey(e.target.value)}
            className="font-mono text-sm"
          />
          <Button onClick={() => saveAi.mutate()} disabled={saveAi.isPending}>
            {saveAi.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
        {aiApiKey && (
          <div className="flex items-center gap-2 text-xs text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" /> API key configured — AI drafts enabled in Inbox
          </div>
        )}
      </Card>

      {/* Auth / Password Gate */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold">Password Protection</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Set a password to require login before accessing GlobalReach. Leave empty to disable the gate.
        </p>
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder="Leave empty to disable"
            value={appPassword}
            onChange={e => setAppPassword(e.target.value)}
            minLength={appPassword ? 6 : 0}
          />
          <Button onClick={() => savePassword.mutate()} disabled={savePassword.isPending}>
            {savePassword.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
        {appPassword && appPassword.length < 6 && (
          <div className="flex items-center gap-2 text-xs text-amber-500">
            <AlertCircle className="h-3.5 w-3.5" /> Password should be at least 6 characters
          </div>
        )}
        {appPassword && (
          <div className="flex items-center gap-2 text-xs text-emerald-500">
            <Lock className="h-3.5 w-3.5" /> Password gate active
          </div>
        )}
      </Card>

      {/* Demo Data */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Database className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Demo Data</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Load realistic sample leads, campaigns, and jobs to explore the app.</p>
            </div>
          </div>
          <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} variant="outline" className="gap-2 text-amber-500 border-amber-500/30 hover:bg-amber-500/10">
            <Database className="h-4 w-4" />
            {seedMutation.isPending ? "Loading…" : "Load Demo Data"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
