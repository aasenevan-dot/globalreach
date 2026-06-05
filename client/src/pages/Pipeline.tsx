import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMode } from "@/lib/mode";
import type { Lead } from "@shared/schema";
import { COUNTRY_FLAG, flagForLang, STATUS_META } from "@/lib/i18n-data";
import { scoreLead, scoreLabel } from "@/lib/scoring";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard } from "@/components/SkeletonCard";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { WinCelebrationDialog } from "@/components/WinCelebrationDialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, GripVertical } from "lucide-react";

// Pipeline stages in funnel order. "lost" is shown as a separate lane at the end.
const STAGES = ["new", "contacted", "engaged", "meeting", "won", "lost"];

// Accent bar color per stage (Tailwind bg classes, mirrors STATUS_META tones).
const STAGE_ACCENT: Record<string, string> = {
  new: "bg-slate-400",
  contacted: "bg-blue-500",
  engaged: "bg-teal-500",
  meeting: "bg-amber-500",
  won: "bg-emerald-500",
  lost: "bg-rose-500",
};

export default function Pipeline() {
  const { isInternational } = useMode();
  const { toast } = useToast();
  const { data: leads, isLoading, error } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  // Optimistic stage overrides while a PATCH is in flight, keyed by lead id.
  const [pending, setPending] = useState<Record<number, string>>({});
  // Snapshot of a just-won US lead to trigger the lookalike celebration dialog.
  const [wonLead, setWonLead] = useState<Lead | null>(null);

  const all = leads ?? [];
  const base = isInternational ? all : all.filter((l) => l.country === "United States");

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/leads/${id}`, { status }),
    onSuccess: (_res, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead moved", description: `Stage set to ${STATUS_META[status]?.label ?? status}.` });
    },
    onSettled: (_res, _err, { id }) => {
      setPending((p) => { const n = { ...p }; delete n[id]; return n; });
    },
  });

  // Group leads by their (optionally optimistic) stage.
  const columns = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    STAGES.forEach((s) => (map[s] = []));
    base.forEach((l) => {
      const stage = pending[l.id] ?? l.status;
      (map[stage] ?? (map[stage] = [])).push(l);
    });
    return map;
  }, [base, pending]);

  function onDrop(stage: string) {
    if (dragId == null) return;
    const lead = base.find((l) => l.id === dragId);
    setOverStage(null);
    const current = pending[dragId] ?? lead?.status;
    setDragId(null);
    if (!lead || current === stage) return;
    setPending((p) => ({ ...p, [dragId]: stage }));
    move.mutate({ id: dragId, status: stage });
    // Win-triggered lookalikes: only on a fresh transition into Won for a US lead.
    if (stage === "won" && current !== "won" && lead.country === "United States") {
      setWonLead({ ...lead, status: "won" });
    }
  }

  if (error) return <div className="p-8 text-center text-red-500">Failed to load data. Please try again.</div>;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STAGES.map((s) => <SkeletonCard key={s} />)}
        </div>
      </div>
    );
  }

  const won = columns.won.length;
  const lost = columns.lost.length;
  const active = base.length - won - lost;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isInternational
              ? "Drag prospects across stages. Your global book of business at a glance."
              : "Drag prospects across stages to keep your home-market deals moving."}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="font-display font-bold text-lg">{active}</div>
            <div className="text-muted-foreground text-xs">In play</div>
          </div>
          <div className="text-center">
            <div className="font-display font-bold text-lg text-emerald-600 dark:text-emerald-400">{won}</div>
            <div className="text-muted-foreground text-xs">Won</div>
          </div>
          <div className="text-center">
            <div className="font-display font-bold text-lg">
              {won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0}%
            </div>
            <div className="text-muted-foreground text-xs">Win rate</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAGES.map((stage) => {
          const items = columns[stage] ?? [];
          const isOver = overStage === stage;
          return (
            <div
              key={stage}
              role="list"
              aria-label={`${STATUS_META[stage]?.label ?? stage} stage — ${items.length} leads`}
              aria-dropeffect={overStage === stage ? "move" : "none"}
              className={`rounded-lg border transition-colors ${isOver ? "border-primary bg-primary/5" : "border-border bg-muted/20"}`}
              onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
              onDragLeave={(e) => { if (e.currentTarget === e.target) setOverStage(null); }}
              onDrop={() => onDrop(stage)}
              data-testid={`column-${stage}`}
            >
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${STAGE_ACCENT[stage]}`} />
                  <span className="text-sm font-medium">{STATUS_META[stage]?.label ?? stage}</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums" data-testid={`count-${stage}`}>{items.length}</span>
              </div>

              <div className="p-2 space-y-2 min-h-32">
                {items.map((l) => (
                  <Card
                    key={l.id}
                    role="listitem"
                    aria-roledescription="Draggable lead card"
                    aria-grabbed={dragId === l.id}
                    aria-label={`${l.fullName} at ${l.company}`}
                    draggable
                    onDragStart={() => setDragId(l.id)}
                    onDragEnd={() => { setDragId(null); setOverStage(null); }}
                    onClick={() => setSelectedLead(l.id)}
                    className={`group p-2.5 cursor-grab active:cursor-grabbing hover-elevate ${dragId === l.id ? "opacity-50" : ""}`}
                    data-testid={`pipeline-card-${l.id}`}
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm flex items-center gap-1 truncate">
                          <span className="truncate">{l.fullName}</span>
                          {l.verified && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{l.company}</div>
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                          {isInternational ? (
                            <span>{COUNTRY_FLAG[l.country] ?? "🌍"} {flagForLang(l.language)}</span>
                          ) : (
                            <span className="truncate">{l.title}</span>
                          )}
                        </div>
                        {(() => {
                          const score = scoreLead(l);
                          const { label, className } = scoreLabel(score);
                          return (
                            <div className="flex items-center justify-between mt-1.5">
                              <span className={`text-xs font-semibold ${className}`}>{label}</span>
                              <span className="text-xs text-muted-foreground/60 tabular-nums">{score}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </Card>
                ))}
                {items.length === 0 && (
                  <div className="text-xs text-muted-foreground/60 text-center py-6">Drop here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <LeadDetailSheet leadId={selectedLead} onClose={() => setSelectedLead(null)} onOpenLead={(id) => setSelectedLead(id)} />

      <WinCelebrationDialog
        wonLead={wonLead}
        allLeads={all}
        open={wonLead != null}
        onClose={() => setWonLead(null)}
        onOpenLead={(id) => { setWonLead(null); setSelectedLead(id); }}
      />
    </div>
  );
}
