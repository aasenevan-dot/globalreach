import { useQuery } from "@tanstack/react-query";
import { useMode } from "@/lib/mode";
import { useAudience } from "@/lib/audience";
import { Link, useLocation } from "wouter";
import type { Lead, Campaign, Message, Job, Reminder } from "@shared/schema";
import { EmptyState } from "@/components/EmptyState";
import { localTimeIn, tzAbbrev, COUNTRY_FLAG, flagForLang, langName, STATUS_META, JOB_STAGES, JOB_STAGE_META, formatUSD } from "@/lib/i18n-data";
import { scoreLead, scoreLabel } from "@/lib/scoring";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard } from "@/components/SkeletonCard";
import {
  Users, Globe, Languages, Clock, Send, TrendingUp, MailCheck, Reply,
  HardHat, Home, Wallet, CheckCircle2, ShieldCheck, MapPin,
  Calendar, FileText, GitBranch, ArrowRight, Target, Bell,
} from "lucide-react";

function Stat({ icon: Icon, label, value, hint }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="text-2xl font-display font-bold tracking-tight" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </Card>
  );
}

export default function Dashboard() {
  const { isInternational } = useMode();
  const { isConsumer } = useAudience();
  const { data: leads, isLoading: l1 } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: campaigns, isLoading: l2 } = useQuery<Campaign[]>({ queryKey: ["/api/campaigns"] });
  const { data: messages } = useQuery<Message[]>({ queryKey: ["/api/messages"] });
  const { data: jobs, isLoading: l3 } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });
  const { data: allReminders } = useQuery<Reminder[]>({ queryKey: ["/api/reminders"] });

  if (isConsumer) {
    if (l3) {
      return (
        <div className="space-y-6">
          <div>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      );
    }
    return <ConsumerDashboard jobs={jobs ?? []} />;
  }

  if (l1 || l2) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const [, navigate] = useLocation();
  const allLeads = leads ?? [];
  const domestic = allLeads.filter((l) => l.country === "United States");
  const shown = isInternational ? allLeads : domestic;
  const activeCampaigns = (campaigns ?? []).filter((c) => c.status === "active");
  const replies = (messages ?? []).filter((m) => m.status === "replied").length;

  if (shown.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            {isInternational ? "Global Pipeline" : "Pipeline Overview"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isInternational
              ? "Your worldwide B2B engagement across markets, languages and channels."
              : "Your domestic B2B pipeline at a glance."}
          </p>
        </div>
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="No leads yet"
          description="Add your first lead or load demo data to get started"
          action={{ label: "Find Leads", onClick: () => navigate("/find") }}
        />
      </div>
    );
  }

  const countries = new Set(shown.map((l) => l.country)).size;
  const languages = new Set(shown.map((l) => l.language)).size;
  const verifiedCount = shown.filter((l) => l.verified).length;
  const verified = Math.round((verifiedCount / Math.max(shown.length, 1)) * 100);

  // Revenue metrics
  const wonLeads = shown.filter(l => l.status === "won");
  const totalRevenue = wonLeads.reduce((s, l) => s + (l.dealValue ?? 0), 0);
  const openPipeline = shown.filter(l => !["won","lost"].includes(l.status)).reduce((s, l) => s + (l.dealValue ?? 0), 0);
  const formatMoney = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;

  // pipeline by status
  const byStatus = Object.keys(STATUS_META).map((s) => ({
    s, count: shown.filter((l) => l.status === s).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">
          {isInternational ? "Global Pipeline" : "Pipeline Overview"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isInternational
            ? "Your worldwide B2B engagement across markets, languages and channels."
            : "Your domestic B2B pipeline at a glance."}
        </p>
      </div>

      {/* Stats — adapt by mode */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="Total Leads" value={shown.length} hint={`${verifiedCount} of ${shown.length} verified`} />
        {isInternational ? (
          <>
            <Stat icon={Globe} label="Markets" value={countries} hint="countries in play" />
            <Stat icon={Languages} label="Languages" value={languages} hint="auto-localized outreach" />
          </>
        ) : (
          <>
            <Stat icon={Send} label="Active Campaigns" value={activeCampaigns.length} hint="running now" />
            <Stat icon={MailCheck} label="Verified Contacts" value={`${verifiedCount}/${shown.length}`} hint={`${verified}% email-validated`} />
          </>
        )}
        <Stat icon={Reply} label="Replies" value={replies} hint="across all channels" />
      </div>

      {/* Revenue highlight */}
      {(totalRevenue > 0 || openPipeline > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-2 text-emerald-500 text-sm mb-1">
              <CheckCircle2 className="h-4 w-4" /> Won Revenue
            </div>
            <div className="text-2xl font-display font-bold tracking-tight text-emerald-500">{formatMoney(totalRevenue)}</div>
            <div className="text-xs text-muted-foreground mt-1">{wonLeads.length} closed deal{wonLeads.length !== 1 ? "s" : ""}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" /> Open Pipeline
            </div>
            <div className="text-2xl font-display font-bold tracking-tight">{formatMoney(openPipeline)}</div>
            <div className="text-xs text-muted-foreground mt-1">{shown.length - wonLeads.length - shown.filter(l=>l.status==="lost").length} active deal{shown.length - wonLeads.length - shown.filter(l=>l.status==="lost").length !== 1 ? "s" : ""}</div>
          </Card>
          <Card className="p-4 hidden md:block">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Target className="h-4 w-4" /> Win Rate
            </div>
            <div className="text-2xl font-display font-bold tracking-tight">
              {wonLeads.length + shown.filter(l=>l.status==="lost").length > 0
                ? Math.round((wonLeads.length / (wonLeads.length + shown.filter(l=>l.status==="lost").length)) * 100)
                : 0}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">of closed deals</div>
          </Card>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pipeline funnel */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold">Pipeline by Stage</h2>
          </div>
          <div className="space-y-3">
            {byStatus.map(({ s, count }) => {
              const max = Math.max(...byStatus.map((b) => b.count), 1);
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-muted-foreground">{STATUS_META[s].label}</span>
                  <div className="flex-1 h-6 rounded-md bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary/80 rounded-md transition-all"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-sm font-medium text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* International: live world clock. Local: top campaigns */}
        {isInternational ? (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="font-display font-semibold">Best Time to Reach</h2>
            </div>
            <div className="space-y-2.5 max-h-72 overflow-auto">
              {[...new Map(shown.filter(l => l.country !== "United States").map((l) => [l.timezone, l])).values()]
                .slice(0, 8)
                .map((l) => {
                  const t = localTimeIn(l.timezone);
                  return (
                    <div key={l.timezone} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span>{COUNTRY_FLAG[l.country] ?? "🌍"}</span>
                        <span className="text-muted-foreground">{l.city}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs">{t.time} {tzAbbrev(l.timezone)}</span>
                        <span
                          className={`h-2 w-2 rounded-full ${t.inWindow ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                          title={t.inWindow ? "In business hours" : "Outside business hours"}
                        />
                      </span>
                    </div>
                  );
                })}
            </div>
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1.5 align-middle" />
              Green = prospect is in business hours now (8am–6pm local).
            </p>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Send className="h-4 w-4 text-primary" />
              <h2 className="font-display font-semibold">Campaigns</h2>
            </div>
            <div className="space-y-3">
              {(campaigns ?? []).filter(c => JSON.parse(c.targetCountries).includes("United States") || JSON.parse(c.targetCountries).length === 0).slice(0, 5).map((c) => (
                <div key={c.id} className="text-sm">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-muted-foreground text-xs capitalize">{c.status}</div>
                </div>
              ))}
              {(campaigns ?? []).filter(c => JSON.parse(c.targetCountries).includes("United States")).length === 0 && (
                <p className="text-sm text-muted-foreground">No domestic campaigns yet.</p>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Quick actions + Lead score distribution */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick actions */}
        <Card className="p-5">
          <h2 className="font-display font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Find Leads", href: "/find", icon: Target, desc: "Search 4.89M contacts" },
              { label: "New Campaign", href: "/campaigns", icon: Send, desc: "Start outreach" },
              { label: "View Calendar", href: "/calendar", icon: Calendar, desc: "Meetings & booking" },
              { label: "Build Form", href: "/forms", icon: FileText, desc: "Capture leads" },
            ].map(a => (
              <Link key={a.href} href={a.href}>
                <a className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-colors group">
                  <a.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{a.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.desc}</div>
                  </div>
                </a>
              </Link>
            ))}
          </div>
        </Card>

        {/* Lead score distribution */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold">Lead Score Distribution</h2>
          </div>
          {(() => {
            const buckets = { Cold: 0, Warm: 0, Hot: 0, Qualified: 0 };
            const colors = { Cold: "bg-blue-400", Warm: "bg-amber-400", Hot: "bg-orange-500", Qualified: "bg-emerald-500" };
            shown.forEach(l => { const sl = scoreLabel(scoreLead(l)); (buckets as any)[sl.label]++; });
            const total = Math.max(shown.length, 1);
            return (
              <div className="space-y-2.5">
                {(Object.entries(buckets) as [string, number][]).map(([label, count]) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-16 text-sm text-muted-foreground">{label}</span>
                    <div className="flex-1 h-5 rounded-md bg-muted overflow-hidden">
                      <div className={`h-full ${(colors as any)[label]} rounded-md transition-all`} style={{ width: `${(count / total) * 100}%` }} />
                    </div>
                    <span className="w-8 text-sm font-medium text-right tabular-nums">{count}</span>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                  {shown.filter(l => scoreLead(l) >= 56).length} leads are Hot or Qualified — prioritize these in your outreach.
                </div>
              </div>
            );
          })()}
        </Card>

        {/* Reminders */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h2 className="font-display font-semibold">Follow-up Reminders</h2>
            </div>
          </div>
          {(() => {
            const today = new Date().toISOString().split("T")[0];
            const pending = (allReminders ?? []).filter(r => !r.done).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
            const overdue = pending.filter(r => r.dueDate < today);
            const upcoming = pending.filter(r => r.dueDate >= today).slice(0, 5);
            if (pending.length === 0) return (
              <p className="text-sm text-muted-foreground">No reminders. Add follow-ups from the lead detail sheet.</p>
            );
            return (
              <div className="space-y-2">
                {overdue.length > 0 && (
                  <div className="text-xs font-semibold text-red-400 mb-1">Overdue ({overdue.length})</div>
                )}
                {[...overdue, ...upcoming].map(r => {
                  const lead = shown.find(l => l.id === r.leadId);
                  const isOverdue = r.dueDate < today;
                  return (
                    <div key={r.id} className={`flex items-center gap-3 text-sm py-1.5 px-2 rounded-md ${isOverdue ? "bg-red-500/10 border border-red-500/20" : "bg-muted/30"}`}>
                      <span className={`text-xs font-mono tabular-nums ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>{r.dueDate}</span>
                      <span className="flex-1 truncate">{r.text}</span>
                      {lead && <span className="text-xs text-muted-foreground truncate max-w-32">{lead.fullName}</span>}
                    </div>
                  );
                })}
                {pending.length > overdue.length + 5 && (
                  <p className="text-xs text-muted-foreground">{pending.length - overdue.length - 5} more upcoming</p>
                )}
              </div>
            );
          })()}
        </Card>
      </div>

      {/* International-only: language coverage */}
      {isInternational && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Languages className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold">Language Coverage</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...new Set(shown.map((l) => l.language))].map((lang) => {
              const count = shown.filter((l) => l.language === lang).length;
              return (
                <div key={lang} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm">
                  <span>{flagForLang(lang)}</span>
                  <span>{langName(lang)}</span>
                  <span className="text-muted-foreground text-xs">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Consumer dashboard — a simple, one-screen overview of homeowner jobs. Built
// for the "older generation simple enough" use case: big numbers, one stage
// chart, and a recent-jobs list that links straight into the board.
// ---------------------------------------------------------------------------
function ConsumerDashboard({ jobs }: { jobs: Job[] }) {
  const completed = jobs.filter((j) => j.stage === "completed");
  const open = jobs.filter((j) => j.stage !== "completed" && j.stage !== "lost");
  const completedRevenue = completed.reduce((s, j) => s + (j.value ?? 0), 0);
  const openValue = open.reduce((s, j) => s + (j.value ?? 0), 0);
  const claims = jobs.filter((j) => j.insuranceClaim && j.stage !== "lost" && j.stage !== "completed").length;

  const byStage = JOB_STAGES.map((s) => ({ s, count: jobs.filter((j) => j.stage === s).length }));
  const maxStage = Math.max(...byStage.map((b) => b.count), 1);

  // Most recent jobs first (by createdAt ISO string).
  const recent = [...jobs].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Consumer Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your direct-to-homeowner jobs at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={HardHat} label="Open Jobs" value={open.length} hint={`${formatUSD(openValue)} in pipeline`} />
        <Stat icon={Wallet} label="Completed Revenue" value={formatUSD(completedRevenue)} hint={`${completed.length} jobs done`} />
        <Stat icon={ShieldCheck} label="Active Claims" value={claims} hint="insurance jobs open" />
        <Stat icon={Home} label="Total Jobs" value={jobs.length} hint="all time" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display font-semibold">Jobs by Stage</h2>
          </div>
          {jobs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No jobs yet. Add your first homeowner job from the Jobs page.
            </div>
          ) : (
            <div className="space-y-3">
              {byStage.map(({ s, count }) => (
                <div key={s} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-muted-foreground truncate">{JOB_STAGE_META[s].label}</span>
                  <div className="flex-1 h-6 rounded-md bg-muted overflow-hidden">
                    <div className={`h-full rounded-md transition-all ${JOB_STAGE_META[s].accent}`} style={{ width: `${(count / maxStage) * 100}%` }} />
                  </div>
                  <span className="w-6 text-sm font-medium text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <HardHat className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display font-semibold">Recent Jobs</h2>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs yet.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((j) => (
                <Link key={j.id} href="/jobs">
                  <a className="block rounded-md -mx-1 px-1 py-1 hover-elevate" data-testid={`recent-job-${j.id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{j.homeowner}</span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{j.value != null ? formatUSD(j.value) : "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${JOB_STAGE_META[j.stage]?.accent}`} />
                      <span className="truncate">{JOB_STAGE_META[j.stage]?.label} · {j.roofType}</span>
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
