import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMode } from "@/lib/mode";
import type { Campaign, Step } from "@shared/schema";
import { EmptyState } from "@/components/EmptyState";
import {
  flagForLang, langName, COUNTRY_FLAG, CHANNELS, LOCAL_CHANNELS, INTL_CHANNELS,
} from "@/lib/i18n-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard } from "@/components/SkeletonCard";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { NewCampaignDialog } from "@/components/NewCampaignDialog";
import { StepEditor } from "@/components/StepEditor";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Phone, Smartphone, MessageCircle, Linkedin, Globe, Clock, Languages,
  ChevronRight, ArrowLeft, Wand2, Play, Pause, Pencil, Trash2, Check, X, Copy, Send,
  AlertCircle, CheckCircle2, Users, BarChart3,
} from "lucide-react";

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail, call: Phone, sms: Smartphone, whatsapp: MessageCircle, linkedin: Linkedin,
};

interface StepStat {
  stepId: number;
  stepOrder: number;
  channel: string;
  subject: string | null;
  delayDays: number;
  leads: number;
  sent: number;
  opened: number;
  replied: number;
  openRate: number;
  replyRate: number;
}

// Per-step campaign performance (F3): where leads sit in the sequence and how
// each step converts. The leads bars are scaled to the busiest step so the
// drop-off down the sequence reads at a glance.
function StepPerformance({ steps, unattributed }: { steps: StepStat[]; unattributed: number }) {
  const maxLeads = Math.max(...steps.map((s) => s.leads), 1);
  return (
    <Card className="p-5" data-testid="card-step-performance">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h2 className="font-display font-semibold">Per-Step Performance</h2>
      </div>
      <div className="space-y-4">
        {steps.map((s) => {
          const Icon = CHANNEL_ICONS[s.channel] ?? Mail;
          return (
            <div key={s.stepId} data-testid={`step-stat-${s.stepOrder}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{s.stepOrder}</span>
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium capitalize">{CHANNELS[s.channel]?.label ?? s.channel}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {s.delayDays === 0 ? "Immediately" : `Day ${s.delayDays}`}
                    {s.subject ? ` · ${s.subject}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs tabular-nums">
                  <span className="text-muted-foreground"><span className="font-semibold text-foreground">{s.leads}</span> leads</span>
                  <span className="text-teal-600 dark:text-teal-400"><span className="font-semibold">{s.openRate}%</span> open</span>
                  <span className="text-emerald-600 dark:text-emerald-400"><span className="font-semibold">{s.replyRate}%</span> reply</span>
                </div>
              </div>
              <div className="h-4 rounded-md bg-muted overflow-hidden" title={`${s.leads} leads · ${s.sent} sent · ${s.opened} opened · ${s.replied} replied`}>
                <div className="h-full bg-primary/80 rounded-md transition-all" style={{ width: `${(s.leads / maxLeads) * 100}%` }} />
              </div>
            </div>
          );
        })}
        {steps.length === 0 && (
          <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
            No sequence steps yet. Add steps and enroll leads to see per-step performance.
          </div>
        )}
      </div>
      {unattributed > 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          {unattributed} earlier message{unattributed === 1 ? "" : "s"} aren't attributed to a step (sent before step tracking) and are excluded here.
        </p>
      )}
    </Card>
  );
}

function ChannelPills({ channels }: { channels: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {channels.map((c) => {
        const Icon = CHANNEL_ICONS[c] ?? Mail;
        return (
          <span key={c} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs">
            <Icon className="h-3 w-3" /> {CHANNELS[c]?.label ?? c}
          </span>
        );
      })}
    </div>
  );
}

function EnrollLeadsDialog({ open, onClose, leads, isPending, onEnroll }: {
  open: boolean; onClose: () => void; leads: any[]; isPending: boolean; onEnroll: (ids: number[]) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const eligible = leads.filter(l => !["won","lost"].includes(l.status));
  const filtered = search ? eligible.filter(l => l.fullName?.toLowerCase().includes(search.toLowerCase()) || l.company?.toLowerCase().includes(search.toLowerCase())) : eligible;

  const toggle = (id: number) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll = () => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((l: any) => l.id)));

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Enroll leads in campaign</AlertDialogTitle>
          <AlertDialogDescription>Select leads to add to this campaign sequence.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3">
          <Input placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{selected.size} selected</span>
            <button onClick={toggleAll} className="hover:text-foreground underline">
              {selected.size === filtered.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
            {filtered.map((l: any) => (
              <div key={l.id} onClick={() => toggle(l.id)} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors ${selected.has(l.id) ? "bg-teal-500/15 border border-teal-500/30" : "hover:bg-muted/50 border border-transparent"}`}>
                <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.has(l.id) ? "bg-teal-500 border-teal-500" : "border-border"}`}>
                  {selected.has(l.id) && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{l.fullName}</div>
                  <div className="text-muted-foreground truncate text-xs">{l.company}</div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No eligible leads found.</p>}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); onEnroll([...selected]); }}
            disabled={selected.size === 0 || isPending}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isPending ? "Enrolling…" : `Enroll ${selected.size} lead${selected.size !== 1 ? "s" : ""}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CampaignDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const { isInternational } = useMode();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<Campaign & { steps: Step[] }>({ queryKey: ["/api/campaigns", id] });
  const { data: stats } = useQuery<{ sent: number; queued: number; failed: number; opened: number; replied: number; uniqueLeads: number; total: number; openRate: number; replyRate: number }>({
    queryKey: ["/api/campaigns", id, "stats"],
    queryFn: async () => { const r = await fetch(`/api/campaigns/${id}/stats`); return r.json(); },
  });
  const { data: stepStats } = useQuery<{ steps: StepStat[]; unattributed: number; totalLeads: number }>({
    queryKey: ["/api/campaigns", id, "step-stats"],
    queryFn: async () => { const r = await fetch(`/api/campaigns/${id}/step-stats`); return r.json(); },
  });
  const { data: allLeads = [] } = useQuery<any[]>({ queryKey: ["/api/leads"] });
  const [previewLang, setPreviewLang] = useState<string>("en");
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const rename = useMutation({
    mutationFn: async (name: string) => apiRequest("PATCH", `/api/campaigns/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", id] });
      toast({ title: "Campaign renamed" });
      setRenaming(false);
    },
  });

  const removeCampaign = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign deleted" });
      setConfirmDelete(false);
      onBack();
    },
  });

  const duplicate = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/campaigns/${id}/duplicate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign duplicated", description: "A draft copy with all steps was created." });
      onBack();
    },
  });

  const enroll = useMutation({
    mutationFn: async (leadIds: number[]) => {
      const r = await fetch(`/api/campaigns/${id}/bulk-enroll`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
      });
      return r.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", id, "stats"] });
      toast({ title: `Enrolled ${data.enrolled ?? 0} leads`, description: data.alreadyEnrolled ? `${data.alreadyEnrolled} already enrolled` : undefined });
      setEnrollOpen(false);
    },
    onError: () => toast({ title: "Enrollment failed", variant: "destructive" }),
  });

  if (isLoading || !data) return <Skeleton className="h-96" />;

  const languages: string[] = JSON.parse(data.languages || "[]");
  const channels: string[] = JSON.parse(data.channels || "[]");
  const countries: string[] = JSON.parse(data.targetCountries || "[]");
  const steps = (data.steps ?? []).sort((a, b) => a.stepOrder - b.stepOrder);
  const editableChannels = isInternational ? INTL_CHANNELS : LOCAL_CHANNELS;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="button-back">
        <ArrowLeft className="h-4 w-4" /> All campaigns
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {renaming ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="text-lg font-display font-bold h-10 w-72 max-w-full"
                data-testid="input-campaign-name"
                onKeyDown={(e) => { if (e.key === "Enter" && nameDraft.trim()) rename.mutate(nameDraft.trim()); if (e.key === "Escape") setRenaming(false); }}
              />
              <Button size="icon" className="h-9 w-9" disabled={!nameDraft.trim() || rename.isPending} onClick={() => rename.mutate(nameDraft.trim())} data-testid="button-save-name">
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setRenaming(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold tracking-tight">{data.name}</h1>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setNameDraft(data.name); setRenaming(true); }} data-testid="button-rename-campaign">
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={data.status === "active" ? "default" : "secondary"} className="capitalize">{data.status}</Badge>
            <ChannelPills channels={channels} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5 text-teal-600 dark:text-teal-400" onClick={() => setEnrollOpen(true)} data-testid="button-enroll-leads">
            <Users className="h-4 w-4" /> Enroll Leads
          </Button>
          <Button variant="outline" className="gap-1.5" disabled={duplicate.isPending} onClick={() => duplicate.mutate()} data-testid="button-duplicate-campaign-detail">
            <Copy className="h-4 w-4" /> {duplicate.isPending ? "Duplicating..." : "Duplicate"}
          </Button>
          <Button variant="outline" className="gap-1.5 text-rose-600 dark:text-rose-400" onClick={() => setConfirmDelete(true)} data-testid="button-delete-campaign-detail">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Settings row */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2"><Clock className="h-4 w-4" /> Send window</div>
          <div className="font-display font-semibold">{data.sendWindowStart}:00 – {data.sendWindowEnd}:00</div>
          <div className="text-xs text-muted-foreground mt-1">
            {data.respectTimezone ? "In each prospect's local time" : "In your time zone"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2"><Languages className="h-4 w-4" /> Languages</div>
          <div className="flex flex-wrap gap-1">
            {languages.map((l) => <span key={l} title={langName(l)}>{flagForLang(l)}</span>)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {data.autoTranslate ? "Auto-localized per prospect" : "Single language"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2"><Globe className="h-4 w-4" /> Markets</div>
          <div className="flex flex-wrap gap-1 text-sm">
            {countries.length ? countries.map((c) => <span key={c} title={c}>{COUNTRY_FLAG[c] ?? "🌍"}</span>) : <span className="text-muted-foreground">Domestic</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{countries.length || 1} {countries.length === 1 ? "country" : "countries"}</div>
        </Card>
      </div>

      {/* Stats bar */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Sent", value: stats.sent, color: "text-blue-400" },
            { label: "Queued", value: stats.queued, color: "text-amber-400" },
            { label: "Opened", value: stats.opened, sub: `${stats.openRate}%`, color: "text-teal-400" },
            { label: "Replied", value: stats.replied, sub: `${stats.replyRate}%`, color: "text-emerald-500" },
            { label: "Leads reached", value: stats.uniqueLeads, color: "text-foreground" },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
              <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              {sub && <div className={`text-xs font-medium ${color} mt-0.5`}>{sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Per-step performance (F3) */}
      {stepStats && stepStats.steps.length > 0 && (
        <StepPerformance steps={stepStats.steps} unattributed={stepStats.unattributed} />
      )}

      {/* Sequence */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold">Sequence</h2>
          {isInternational && languages.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Preview in:</span>
              {languages.map((l) => (
                <button
                  key={l}
                  onClick={() => setPreviewLang(l)}
                  data-testid={`button-lang-${l}`}
                  className={`rounded-md px-2 py-1 text-sm transition-colors ${previewLang === l ? "bg-primary text-primary-foreground" : "hover-elevate border border-border"}`}
                >
                  {flagForLang(l)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Non-English preview is read-only; the English/default view is the full editor. */}
        {isInternational && previewLang !== "en" ? (
          <div className="space-y-4">
            {steps.map((step, i) => {
              const Icon = CHANNEL_ICONS[step.channel] ?? Mail;
              const translations = JSON.parse(step.translations || "{}");
              const variant = translations[previewLang] ?? { subject: step.subject, body: step.body };
              return (
                <div key={step.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-4 w-4" /></div>
                    {i < steps.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium capitalize">{CHANNELS[step.channel]?.label ?? step.channel}</span>
                      <span className="text-muted-foreground text-xs">{step.delayDays === 0 ? "Immediately" : `Day ${step.delayDays}`}</span>
                    </div>
                    <Card className="mt-2 p-3 bg-muted/30">
                      {variant.subject && <div className="font-medium text-sm mb-1">{variant.subject}</div>}
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">{variant.body}</div>
                      {!translations[previewLang] && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <Wand2 className="h-3 w-3" /> Auto-translate will localize this step on send
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              );
            })}
            {steps.length === 0 && <p className="text-sm text-muted-foreground">No steps yet.</p>}
          </div>
        ) : (
          <StepEditor campaignId={id} steps={steps} channels={editableChannels} />
        )}
      </Card>

      <EnrollLeadsDialog
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        leads={allLeads}
        isPending={enroll.isPending}
        onEnroll={(ids) => enroll.mutate(ids)}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This campaign and all of its sequence steps will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-campaign">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-campaign"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={(e) => { e.preventDefault(); removeCampaign.mutate(); }}
              disabled={removeCampaign.isPending}
            >
              {removeCampaign.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RunCampaignDialog({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"all" | "new">("all");
  const [result, setResult] = useState<{ sent: number; queued: number; failed: number; total: number; smtpConfigured: boolean } | null>(null);

  const { data: leads = [] } = useQuery<any[]>({ queryKey: ["/api/leads"] });
  const eligible = leads.filter((l: any) => {
    if (["won","lost"].includes(l.status)) return false;
    if (statusFilter === "new") return l.status === "new";
    return true;
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/campaigns/${campaign.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusFilter }),
      });
      return r.json();
    },
    onSuccess: (data) => {
      if (data.error) { toast({ title: data.error, variant: "destructive" }); return; }
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: () => toast({ title: "Failed to run campaign", variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        {result ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold">Campaign Sent!</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              {result.smtpConfigured ? (
                <>
                  <div className="bg-emerald-500/10 rounded-lg p-3">
                    <div className="text-2xl font-bold text-emerald-500">{result.sent}</div>
                    <div className="text-xs text-muted-foreground mt-1">Sent</div>
                  </div>
                  {result.failed > 0 && (
                    <div className="bg-red-500/10 rounded-lg p-3">
                      <div className="text-2xl font-bold text-red-500">{result.failed}</div>
                      <div className="text-xs text-muted-foreground mt-1">Failed</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-amber-500/10 rounded-lg p-3 col-span-3">
                  <div className="text-2xl font-bold text-amber-500">{result.queued}</div>
                  <div className="text-xs text-muted-foreground mt-1">Queued in Inbox (configure SMTP to send)</div>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Messages are visible in Unified Inbox.</p>
            <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm">Done</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Send Campaign</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="font-medium text-sm mb-0.5">{campaign.name}</div>
                <div className="text-xs text-muted-foreground">Step 1 email will be sent immediately</div>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target leads</div>
                <div className="flex gap-2">
                  {(["all","new"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${statusFilter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {f === "all" ? "All active leads" : "New leads only"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{eligible.length}</span>
                  <span className="text-muted-foreground">leads will receive this email</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  If SMTP is not configured in Settings, messages are queued in the Unified Inbox instead of sent.
                  New leads will be moved to "Contacted" on success.
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors">Cancel</button>
                <button
                  onClick={() => runMutation.mutate()}
                  disabled={runMutation.isPending || eligible.length === 0}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                >
                  <Send className="h-4 w-4" />
                  {runMutation.isPending ? "Sending…" : eligible.length === 0 ? "No eligible leads" : `Send to ${eligible.length} leads`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Campaigns() {
  const { isInternational } = useMode();
  const { data: campaigns, isLoading, error } = useQuery<Campaign[]>({ queryKey: ["/api/campaigns"] });
  const [selected, setSelected] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [runTarget, setRunTarget] = useState<Campaign | null>(null);
  const { toast } = useToast();

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/campaigns/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign updated" });
    },
  });

  const removeCampaign = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign deleted" });
      setDeleteTarget(null);
    },
  });

  const duplicate = useMutation({
    mutationFn: async (id: number) => apiRequest("POST", `/api/campaigns/${id}/duplicate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign duplicated", description: "A draft copy with all steps was created." });
    },
  });

  if (selected) return <CampaignDetail id={selected} onBack={() => setSelected(null)} />;

  if (error) return <div className="p-8 text-center text-red-500">Failed to load data. Please try again.</div>;

  if (isLoading) return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-36 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );

  const all = campaigns ?? [];
  // In local mode, only show campaigns that aren't multi-country.
  const shown = isInternational
    ? all
    : all.filter((c) => {
        const countries = JSON.parse(c.targetCountries || "[]");
        return countries.length === 0 || (countries.length === 1 && countries[0] === "United States");
      });

  const availableChannels = isInternational ? INTL_CHANNELS : LOCAL_CHANNELS;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isInternational
              ? "Multi-channel, multi-language sequences that send in each prospect's local time."
              : "Multi-step outreach sequences for your home market."}
          </p>
        </div>
        <NewCampaignDialog />
      </div>

      {/* Channel availability banner */}
      <Card className={`p-4 flex items-center justify-between gap-4 ${isInternational ? "border-primary/30 bg-primary/5" : ""}`}>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Available channels:</span>
          <ChannelPills channels={availableChannels} />
        </div>
        {!isInternational && (
          <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" /> Switch to International to unlock LinkedIn, WhatsApp & translation
          </span>
        )}
      </Card>

      <div className="space-y-3">
        {shown.map((c) => {
          const channels = JSON.parse(c.channels || "[]");
          const languages = JSON.parse(c.languages || "[]");
          const countries = JSON.parse(c.targetCountries || "[]");
          return (
            <Card key={c.id} className="p-4 hover-elevate cursor-pointer" onClick={() => setSelected(c.id)} data-testid={`card-campaign-${c.id}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold truncate">{c.name}</span>
                    <Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize text-xs">{c.status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <ChannelPills channels={channels} />
                    {isInternational && languages.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Languages className="h-3 w-3" /> {languages.map((l: string) => flagForLang(l)).join(" ")}
                      </span>
                    )}
                    {isInternational && countries.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Globe className="h-3 w-3" /> {countries.length} markets
                      </span>
                    )}
                    {c.respectTimezone && isInternational && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <Clock className="h-3 w-3" /> Time-zone aware
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={(e) => { e.stopPropagation(); setRunTarget(c); }}
                    title="Send step 1 emails now"
                  >
                    <Send className="h-3.5 w-3.5" /> Send
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      fetch(`/api/campaigns/${c.id}/schedule-all`, { method: "POST", headers: { "Content-Type": "application/json" } })
                        .then(r => r.json())
                        .then(d => {
                          if (d.ok) {
                            queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
                            queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
                            toast({ title: `Scheduled ${d.scheduled} messages across ${d.steps} steps for ${d.leads} leads` });
                          } else {
                            toast({ title: d.error || "Failed", variant: "destructive" });
                          }
                        });
                    }}
                    title="Schedule all steps with delays"
                  >
                    <Clock className="h-3.5 w-3.5" /> Schedule
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); toggleStatus.mutate({ id: c.id, status: c.status === "active" ? "paused" : "active" }); }}
                    data-testid={`button-toggle-${c.id}`}
                  >
                    {c.status === "active" ? <><Pause className="h-3.5 w-3.5 mr-1" /> Pause</> : <><Play className="h-3.5 w-3.5 mr-1" /> Activate</>}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={duplicate.isPending}
                    onClick={(e) => { e.stopPropagation(); duplicate.mutate(c.id); }}
                    data-testid={`button-duplicate-campaign-${c.id}`}
                    title="Duplicate"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-rose-600 dark:text-rose-400"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                    data-testid={`button-delete-campaign-${c.id}`}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </Card>
          );
        })}
        {shown.length === 0 && (
          <EmptyState
            icon={<Send className="h-10 w-10" />}
            title="No campaigns"
            description="Create your first outreach campaign"
          />
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `"${deleteTarget.name}" and all of its sequence steps will be permanently removed.` : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-list">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-list"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={(e) => { e.preventDefault(); if (deleteTarget) removeCampaign.mutate(deleteTarget.id); }}
              disabled={removeCampaign.isPending}
            >
              {removeCampaign.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {runTarget && <RunCampaignDialog campaign={runTarget} onClose={() => setRunTarget(null)} />}
    </div>
  );
}
