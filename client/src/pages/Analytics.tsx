import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMode } from "@/lib/mode";
import { useAudience } from "@/lib/audience";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { exportAsPNG, exportAsPDF } from "@/lib/export-analytics";
import type { Lead, Campaign, Message, Job, Form, Funnel, Automation } from "@shared/schema";
import {
  COUNTRY_FLAG, flagForLang, langName, CHANNELS, STATUS_META, localTimeIn, formatUSD,
  JOB_STAGES, JOB_STAGE_META,
} from "@/lib/i18n-data";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard } from "@/components/SkeletonCard";
import {
  TrendingUp, Globe, Languages, Send, Reply, Target, Mail, Phone,
  Smartphone, MessageCircle, Linkedin, Clock, Handshake, DollarSign, Trophy,
  HardHat, Home, CheckCircle2, Wallet, FileText, Layers, GitBranch, MousePointerClick,
  Download, FileImage, Loader2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Cell, PieChart, Pie, ResponsiveContainer, Tooltip, Legend } from "recharts";

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail, call: Phone, sms: Smartphone, whatsapp: MessageCircle, linkedin: Linkedin,
};

// The five funnel stages in order (Lost is tracked separately).
const FUNNEL = ["new", "contacted", "engaged", "meeting", "won"];

// Export button (F15): captures the referenced analytics container as a shareable
// PNG or PDF via html2canvas. The button is marked data-export-ignore so it
// doesn't appear in the captured image.
function ExportMenu({ targetRef, filename }: { targetRef: React.RefObject<HTMLDivElement>; filename: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function run(format: "png" | "pdf") {
    const el = targetRef.current;
    if (!el) return;
    setBusy(true);
    try {
      if (format === "png") await exportAsPNG(el, filename);
      else await exportAsPDF(el, filename);
      toast({ title: `Exported as ${format.toUpperCase()}`, description: "Saved to your downloads." });
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message ?? "Something went wrong.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={busy} data-export-ignore data-testid="button-export-analytics">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? "Exporting…" : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-export-ignore>
        <DropdownMenuItem onClick={() => run("png")} className="gap-2">
          <FileImage className="h-4 w-4" /> Download PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("pdf")} className="gap-2">
          <FileText className="h-4 w-4" /> Download PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="text-2xl font-display font-bold mt-1">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
    </Card>
  );
}

export default function Analytics() {
  const { isInternational } = useMode();
  const { isConsumer } = useAudience();
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("all");
  const exportRef = useRef<HTMLDivElement>(null);
  const { data: leads, isLoading, error } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: campaigns } = useQuery<Campaign[]>({ queryKey: ["/api/campaigns"] });
  const { data: messages } = useQuery<Message[]>({ queryKey: ["/api/messages"] });
  const { data: jobs } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });
  const { data: forms } = useQuery<Form[]>({ queryKey: ["/api/forms"] });
  const { data: funnels } = useQuery<Funnel[]>({ queryKey: ["/api/funnels"] });
  const { data: automations } = useQuery<Automation[]>({ queryKey: ["/api/automations"] });

  if (error) return <div className="p-8 text-center text-red-500">Failed to load data. Please try again.</div>;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // ===== Consumer (B2C) analytics: homeowner jobs + referral-source ROI =====
  if (isConsumer) {
    return <ConsumerAnalytics jobs={jobs ?? []} />;
  }

  const allLeads = leads ?? [];
  // Compute cutoff date for the selected date range filter.
  const filterAfter = dateRange === "all" ? null : (() => {
    const d = new Date();
    d.setDate(d.getDate() - (dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90));
    return d.toISOString().slice(0, 10);
  })();
  const shownLeads = (isInternational ? allLeads : allLeads.filter((l) => l.country === "United States"))
    .filter((l) => !filterAfter || !(l as any).createdAt || (l as any).createdAt >= filterAfter);
  const shownIds = new Set(shownLeads.map((l) => l.id));
  const allMsgs = (messages ?? []).filter((m) => shownIds.has(m.leadId) && (!filterAfter || m.createdAt >= filterAfter));
  const shownCampaigns = campaigns ?? [];

  // ---- Headline metrics ----
  const sent = allMsgs.filter((m) => m.direction === "outbound").length;
  const replies = allMsgs.filter((m) => m.status === "replied" || m.direction === "inbound").length;
  const replyRate = sent ? Math.round((replies / sent) * 100) : 0;
  const won = shownLeads.filter((l) => l.status === "won").length;
  const winRate = shownLeads.length ? Math.round((won / shownLeads.length) * 100) : 0;
  const meetings = shownLeads.filter((l) => l.status === "meeting" || l.status === "won").length;

  // ---- Funnel conversion ----
  const stageCounts = FUNNEL.map((s) => ({
    s,
    // leads that reached *at least* this stage
    count: shownLeads.filter((l) => FUNNEL.indexOf(l.status) >= FUNNEL.indexOf(s)).length,
  }));
  const funnelTop = stageCounts[0]?.count || 1;

  // ---- Channel performance ----
  const channelKeys = [...new Set(allMsgs.map((m) => m.channel))];
  const channelStats = channelKeys.map((ch) => {
    const msgs = allMsgs.filter((m) => m.channel === ch);
    const out = msgs.filter((m) => m.direction === "outbound").length;
    const rep = msgs.filter((m) => m.status === "replied" || m.direction === "inbound").length;
    return { ch, out, rep, rate: out ? Math.round((rep / out) * 100) : 0, total: msgs.length };
  }).sort((a, b) => b.total - a.total);

  // ---- International breakdowns ----
  const byCountry = isInternational
    ? [...new Set(shownLeads.map((l) => l.country))].map((c) => ({
        c,
        leads: shownLeads.filter((l) => l.country === c).length,
        won: shownLeads.filter((l) => l.country === c && l.status === "won").length,
      })).sort((a, b) => b.leads - a.leads)
    : [];
  const byLanguage = isInternational
    ? [...new Set(shownLeads.map((l) => l.language))].map((lng) => ({
        lng,
        leads: shownLeads.filter((l) => l.language === lng).length,
      })).sort((a, b) => b.leads - a.leads)
    : [];
  const reachableNow = isInternational
    ? shownLeads.filter((l) => l.country !== "United States" && localTimeIn(l.timezone).inWindow).length
    : 0;

  // ---- Referral-source ROI rollup ----
  // Group every attributed lead by its source, then rank by revenue won.
  const referralSources = (() => {
    const map = new Map<string, { source: string; total: number; won: number; open: number; revenue: number }>();
    for (const l of shownLeads) {
      const src = (l.referredBy ?? "").trim();
      if (!src) continue;
      const row = map.get(src) ?? { source: src, total: 0, won: 0, open: 0, revenue: 0 };
      row.total += 1;
      if (l.status === "won") {
        row.won += 1;
        row.revenue += l.dealValue ?? 0;
      } else if (l.status !== "lost") {
        row.open += 1;
      }
      map.set(src, row);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.won - a.won || b.total - a.total);
  })();
  const referralRevenue = referralSources.reduce((s, r) => s + r.revenue, 0);
  const referralWon = referralSources.reduce((s, r) => s + r.won, 0);
  const attributedLeads = shownLeads.filter((l) => (l.referredBy ?? "").trim()).length;
  const referralShare = shownLeads.length ? Math.round((attributedLeads / shownLeads.length) * 100) : 0;
  const maxRevenue = Math.max(...referralSources.map((r) => r.revenue), 1);

  // ---- Chart data ----
  // 1. Pipeline Funnel: count leads per status (use FUNNEL order)
  const pipelineFunnelData = FUNNEL.map((s) => ({
    name: STATUS_META[s]?.label ?? s,
    value: shownLeads.filter((l) => l.status === s).length,
  }));

  // 2. Deal Value by Industry: sum dealValue grouped by industry, top 5
  const industryMap = new Map<string, number>();
  for (const l of shownLeads) {
    const ind = (l.industry ?? "Unknown").trim() || "Unknown";
    industryMap.set(ind, (industryMap.get(ind) ?? 0) + (l.dealValue ?? 0));
  }
  const dealByIndustryData = [...industryMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // 3. Channel Mix: count messages by channel
  const channelMixMap = new Map<string, number>();
  for (const m of allMsgs) {
    channelMixMap.set(m.channel, (channelMixMap.get(m.channel) ?? 0) + 1);
  }
  const channelMixData = [...channelMixMap.entries()]
    .map(([name, value]) => ({ name: CHANNELS[name]?.label ?? name, value }))
    .sort((a, b) => b.value - a.value);

  // 4. Lead Sources: count referredBy values, top 5
  const leadSourceMap = new Map<string, number>();
  for (const l of shownLeads) {
    const src = (l.referredBy ?? "").trim();
    if (!src) continue;
    leadSourceMap.set(src, (leadSourceMap.get(src) ?? 0) + 1);
  }
  const leadSourceData = [...leadSourceMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div ref={exportRef} className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            {isInternational ? "Global Analytics" : "Analytics"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isInternational
              ? "Performance across every market, language and channel."
              : "How your domestic outreach is performing."}
          </p>
        </div>
        <ExportMenu targetRef={exportRef} filename={isInternational ? "global-analytics" : "analytics"} />
      </div>

      {/* Date range filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Showing:</span>
        {(["7d", "30d", "90d", "all"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setDateRange(r)}
            className={"text-xs px-3 py-1.5 rounded-lg border transition-colors " + (dateRange === r ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50 text-muted-foreground")}
          >
            {r === "all" ? "All time" : r === "7d" ? "Last 7 days" : r === "30d" ? "Last 30 days" : "Last 90 days"}
          </button>
        ))}
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Send} label="Messages Sent" value={sent} hint="across all channels" />
        <Stat icon={Reply} label="Reply Rate" value={`${replyRate}%`} hint={`${replies} replies`} />
        <Stat icon={Target} label="Meetings Booked" value={meetings} hint="meeting + won stages" />
        {isInternational
          ? <Stat icon={Clock} label="Reachable Now" value={reachableNow} hint="in business hours" />
          : <Stat icon={TrendingUp} label="Win Rate" value={`${winRate}%`} hint={`${won} closed-won`} />}
      </div>

      {/* Referral Sources ROI — which relationships actually drive revenue */}
      <Card className="p-5" data-testid="card-referral-sources">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Handshake className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold">Referral Sources</h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1" data-testid="text-referral-revenue">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{formatUSD(referralRevenue)}</span> won via referrals
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{referralWon}</span> deals
            </span>
            <span className="hidden sm:inline">{referralShare}% of pipeline attributed</span>
          </div>
        </div>
        {referralSources.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg" data-testid="text-no-referrals">
            No referral sources yet. Open a lead and set “Referred by” to start tracking which relationships drive revenue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left font-medium py-2 pr-2">Source</th>
                  <th className="text-right font-medium py-2 px-2 whitespace-nowrap">Revenue won</th>
                  <th className="text-right font-medium py-2 px-2">Won</th>
                  <th className="text-right font-medium py-2 px-2 whitespace-nowrap">Open / Total</th>
                  <th className="text-left font-medium py-2 pl-2 w-1/3 hidden md:table-cell">Share of referral revenue</th>
                </tr>
              </thead>
              <tbody>
                {referralSources.map((r) => (
                  <tr key={r.source} className="border-b border-border last:border-0" data-testid={`row-referral-${r.source.replace(/\s+/g, "-")}`}>
                    <td className="py-2.5 pr-2 font-medium">{r.source}</td>
                    <td className="py-2.5 px-2 text-right font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {r.revenue > 0 ? formatUSD(r.revenue) : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{r.won}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground whitespace-nowrap">{r.open} / {r.total}</td>
                    <td className="py-2.5 pl-2 hidden md:table-cell">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary/80 rounded-full transition-all" style={{ width: `${(r.revenue / maxRevenue) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Funnel conversion */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold">Funnel Conversion</h2>
          </div>
          <div className="space-y-3">
            {stageCounts.map(({ s, count }, i) => {
              const pct = Math.round((count / funnelTop) * 100);
              const prev = i === 0 ? count : stageCounts[i - 1].count;
              const stepConv = prev ? Math.round((count / prev) * 100) : 0;
              return (
                <div key={s}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{STATUS_META[s]?.label}</span>
                    <span className="font-medium">
                      {count}
                      {i > 0 && <span className="text-muted-foreground font-normal ml-2 text-xs">{stepConv}% of prev</span>}
                    </span>
                  </div>
                  <div className="h-5 rounded-md bg-muted overflow-hidden">
                    <div className="h-full bg-primary/80 rounded-md transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Channel performance */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Send className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold">Channel Performance</h2>
          </div>
          {channelStats.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No channel activity yet.</div>
          ) : (
            <div className="space-y-3">
              {channelStats.map(({ ch, out, rep, rate }) => {
                const Icon = CHANNEL_ICONS[ch] ?? Mail;
                return (
                  <div key={ch} className="flex items-center gap-3">
                    <span className="flex items-center gap-2 w-28 text-sm">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {CHANNELS[ch]?.label ?? ch}
                    </span>
                    <div className="flex-1 h-5 rounded-md bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-500/70 rounded-md transition-all" style={{ width: `${rate}%` }} />
                    </div>
                    <span className="w-24 text-right text-xs text-muted-foreground">
                      {rep}/{out} · <span className="font-medium text-foreground">{rate}%</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* International-only: markets + languages */}
        {isInternational && (
          <>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-4 w-4 text-primary" />
                <h2 className="font-display font-semibold">Leads by Market</h2>
              </div>
              <div className="space-y-2.5">
                {byCountry.map(({ c, leads: n, won: w }) => {
                  const max = Math.max(...byCountry.map((b) => b.leads), 1);
                  return (
                    <div key={c} className="flex items-center gap-3">
                      <span className="w-40 text-sm flex items-center gap-2 truncate">
                        <span>{COUNTRY_FLAG[c] ?? "🌍"}</span>{c}
                      </span>
                      <div className="flex-1 h-5 rounded-md bg-muted overflow-hidden">
                        <div className="h-full bg-primary/80 rounded-md transition-all" style={{ width: `${(n / max) * 100}%` }} />
                      </div>
                      <span className="w-16 text-right text-xs text-muted-foreground">
                        {n}{w > 0 && <span className="text-emerald-500 ml-1">·{w}w</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Languages className="h-4 w-4 text-primary" />
                <h2 className="font-display font-semibold">Language Coverage</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {byLanguage.map(({ lng, leads: n }) => (
                  <div key={lng} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                    <span>{flagForLang(lng)}</span>
                    <span>{langName(lng)}</span>
                    <span className="text-muted-foreground text-xs">{n}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                {byLanguage.length} languages auto-localized on send. Every outbound message is translated to the prospect's native language.
              </p>
            </Card>
          </>
        )}

        {/* Local-only: campaign rollup */}
        {!isInternational && (
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Send className="h-4 w-4 text-primary" />
              <h2 className="font-display font-semibold">Campaign Activity</h2>
            </div>
            <div className="space-y-2">
              {shownCampaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b border-border last:border-0 py-2 text-sm">
                  <span className="font-medium">{c.name}</span>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${c.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-500"}`}>
                    {c.status}
                  </span>
                </div>
              ))}
              {shownCampaigns.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">No campaigns yet.</div>}
            </div>
          </Card>
        )}
      {/* Growth Tools Performance */}
      {((forms ?? []).length > 0 || (funnels ?? []).length > 0 || (automations ?? []).length > 0) && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold">Growth Tools Performance</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <FileText className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <div className="text-xl font-bold">{(forms ?? []).length}</div>
              <div className="text-xs text-muted-foreground">Forms</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <Layers className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <div className="text-xl font-bold">{(funnels ?? []).length}</div>
              <div className="text-xs text-muted-foreground">Funnels</div>
              {(funnels ?? []).some((f: any) => f.views > 0) && (
                <div className="text-xs text-emerald-500 mt-0.5">
                  {(funnels ?? []).reduce((s: number, f: any) => s + (f.views || 0), 0)} views · {(funnels ?? []).reduce((s: number, f: any) => s + (f.conversions || 0), 0)} conv.
                </div>
              )}
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <GitBranch className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <div className="text-xl font-bold">{(automations ?? []).filter((a: any) => a.active).length}</div>
              <div className="text-xs text-muted-foreground">Active Automations</div>
              <div className="text-xs text-muted-foreground/60 mt-0.5">
                {(automations ?? []).reduce((s: number, a: any) => s + (a.runCount || 0), 0)} total runs
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <MousePointerClick className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <div className="text-xl font-bold">
                {allMsgs.filter(m => m.status === "opened").length}
              </div>
              <div className="text-xs text-muted-foreground">Email Opens</div>
              {sent > 0 && (
                <div className="text-xs text-teal-400 mt-0.5">
                  {Math.round((allMsgs.filter(m => m.status === "opened").length / sent) * 100)}% open rate
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
      </div>

      {/* Visual Breakdown */}
      <div>
        <h2 className="text-lg font-display font-semibold mb-4">Visual Breakdown</h2>
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Chart 1: Pipeline Funnel */}
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <h3 className="font-display font-semibold text-sm">Pipeline Funnel</h3>
            </CardHeader>
            <CardContent>
              {pipelineFunnelData.every((d) => d.value === 0) ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">No pipeline data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={pipelineFunnelData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {pipelineFunnelData.map((_, i) => (
                        <Cell key={i} fill={i % 2 === 0 ? "#ef4444" : "#14b8a6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Chart 2: Deal Value by Industry */}
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <h3 className="font-display font-semibold text-sm">Deal Value by Industry</h3>
            </CardHeader>
            <CardContent>
              {dealByIndustryData.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">No deal value data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dealByIndustryData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Deal Value"]} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {dealByIndustryData.map((_, i) => (
                        <Cell key={i} fill={i % 2 === 0 ? "#14b8a6" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Chart 3: Channel Mix PieChart */}
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <h3 className="font-display font-semibold text-sm">Channel Mix</h3>
            </CardHeader>
            <CardContent>
              {channelMixData.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">No messages yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={channelMixData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false}>
                      {channelMixData.map((_, i) => (
                        <Cell key={i} fill={i % 2 === 0 ? "#ef4444" : "#14b8a6"} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Chart 4: Lead Sources */}
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <h3 className="font-display font-semibold text-sm">Lead Sources</h3>
            </CardHeader>
            <CardContent>
              {leadSourceData.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">No referral sources tracked yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={leadSourceData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {leadSourceData.map((_, i) => (
                        <Cell key={i} fill={i % 2 === 0 ? "#ef4444" : "#14b8a6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Consumer analytics — homeowner jobs: revenue, roofing funnel, referral ROI,
// and roof-type mix. Same source-attribution philosophy as the B2B view, so a
// marketer sees which referral relationships actually drive paid jobs.
// ---------------------------------------------------------------------------
function ConsumerAnalytics({ jobs }: { jobs: Job[] }) {
  const exportRef = useRef<HTMLDivElement>(null);
  const completed = jobs.filter((j) => j.stage === "completed");
  const lost = jobs.filter((j) => j.stage === "lost");
  const open = jobs.filter((j) => j.stage !== "completed" && j.stage !== "lost");
  const completedRevenue = completed.reduce((s, j) => s + (j.value ?? 0), 0);
  const openValue = open.reduce((s, j) => s + (j.value ?? 0), 0);
  const decided = completed.length + lost.length;
  const closeRate = decided > 0 ? Math.round((completed.length / decided) * 100) : 0;
  const avgJob = completed.length ? Math.round(completedRevenue / completed.length) : 0;

  const FUNNEL_STAGES = JOB_STAGES.filter((s) => s !== "lost");
  const stageCounts = FUNNEL_STAGES.map((s) => ({
    s,
    count: jobs.filter((j) => j.stage !== "lost" && FUNNEL_STAGES.indexOf(j.stage) >= FUNNEL_STAGES.indexOf(s)).length,
  }));
  const funnelTop = stageCounts[0]?.count || 1;

  const sources = (() => {
    const map = new Map<string, { source: string; total: number; completed: number; open: number; revenue: number }>();
    for (const j of jobs) {
      const src = (j.referredBy ?? "").trim();
      if (!src) continue;
      const row = map.get(src) ?? { source: src, total: 0, completed: 0, open: 0, revenue: 0 };
      row.total += 1;
      if (j.stage === "completed") { row.completed += 1; row.revenue += j.value ?? 0; }
      else if (j.stage !== "lost") row.open += 1;
      map.set(src, row);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.completed - a.completed || b.total - a.total);
  })();
  const sourceRevenue = sources.reduce((s, r) => s + r.revenue, 0);
  const sourceCompleted = sources.reduce((s, r) => s + r.completed, 0);
  const attributed = jobs.filter((j) => (j.referredBy ?? "").trim()).length;
  const attributedShare = jobs.length ? Math.round((attributed / jobs.length) * 100) : 0;
  const maxRevenue = Math.max(...sources.map((r) => r.revenue), 1);

  const roofTypes = (() => {
    const map = new Map<string, number>();
    for (const j of jobs) map.set(j.roofType, (map.get(j.roofType) ?? 0) + 1);
    return [...map.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  })();
  const maxRoof = Math.max(...roofTypes.map((r) => r.count), 1);

  return (
    <div ref={exportRef} className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Consumer Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            How your direct-to-homeowner jobs are performing — and which referral sources actually pay off.
          </p>
        </div>
        <ExportMenu targetRef={exportRef} filename="consumer-analytics" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Wallet} label="Completed Revenue" value={formatUSD(completedRevenue)} hint={`${completed.length} jobs done`} />
        <Stat icon={HardHat} label="Open Pipeline" value={formatUSD(openValue)} hint={`${open.length} in progress`} />
        <Stat icon={CheckCircle2} label="Close Rate" value={`${closeRate}%`} hint={`${completed.length}/${decided} decided`} />
        <Stat icon={Home} label="Avg Job Size" value={formatUSD(avgJob)} hint="completed jobs" />
      </div>

      <Card className="p-5" data-testid="card-job-referral-sources">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Handshake className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display font-semibold">Referral Sources</h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1" data-testid="text-job-referral-revenue">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{formatUSD(sourceRevenue)}</span> from referrals
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{sourceCompleted}</span> jobs
            </span>
            <span className="hidden sm:inline">{attributedShare}% of jobs attributed</span>
          </div>
        </div>
        {sources.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg" data-testid="text-no-job-referrals">
            No referral sources yet. Open a job and set its referral source to track which relationships drive paid work.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left font-medium py-2 pr-2">Source</th>
                  <th className="text-right font-medium py-2 px-2 whitespace-nowrap">Revenue</th>
                  <th className="text-right font-medium py-2 px-2">Done</th>
                  <th className="text-right font-medium py-2 px-2 whitespace-nowrap">Open / Total</th>
                  <th className="text-left font-medium py-2 pl-2 w-1/3 hidden md:table-cell">Share of referral revenue</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((r) => (
                  <tr key={r.source} className="border-b border-border last:border-0" data-testid={`row-job-referral-${r.source.replace(/\s+/g, "-")}`}>
                    <td className="py-2.5 pr-2 font-medium">{r.source}</td>
                    <td className="py-2.5 px-2 text-right font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {r.revenue > 0 ? formatUSD(r.revenue) : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{r.completed}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground whitespace-nowrap">{r.open} / {r.total}</td>
                    <td className="py-2.5 pl-2 hidden md:table-cell">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-emerald-500/80 rounded-full transition-all" style={{ width: `${(r.revenue / maxRevenue) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display font-semibold">Job Funnel</h2>
          </div>
          {jobs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No jobs yet.</div>
          ) : (
            <div className="space-y-3">
              {stageCounts.map(({ s, count }, i) => {
                const pct = Math.round((count / funnelTop) * 100);
                const prev = i === 0 ? count : stageCounts[i - 1].count;
                const stepConv = prev ? Math.round((count / prev) * 100) : 0;
                return (
                  <div key={s}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{JOB_STAGE_META[s]?.label}</span>
                      <span className="font-medium">
                        {count}
                        {i > 0 && <span className="text-muted-foreground font-normal ml-2 text-xs">{stepConv}% of prev</span>}
                      </span>
                    </div>
                    <div className="h-5 rounded-md bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-500/80 rounded-md transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <HardHat className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display font-semibold">Work Type Mix</h2>
          </div>
          {roofTypes.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No jobs yet.</div>
          ) : (
            <div className="space-y-2.5">
              {roofTypes.map(({ type, count }) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-32 text-sm truncate">{type}</span>
                  <div className="flex-1 h-5 rounded-md bg-muted overflow-hidden">
                    <div className="h-full bg-primary/80 rounded-md transition-all" style={{ width: `${(count / maxRoof) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
