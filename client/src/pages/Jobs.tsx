import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Job } from "@shared/schema";
import { JOB_STAGES, JOB_STAGE_META, formatUSD } from "@/lib/i18n-data";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AddJobDialog } from "@/components/AddJobDialog";
import { JobDetailSheet } from "@/components/JobDetailSheet";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, ShieldCheck, MapPin, HardHat } from "lucide-react";

export default function Jobs() {
  const { toast } = useToast();
  const { data: jobs, isLoading } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<number, string>>({});

  const all = jobs ?? [];

  // Distinct referral sources across jobs — powers source autocomplete.
  const knownSources = useMemo(
    () => Array.from(new Set(all.map((j) => j.referredBy).filter((s): s is string => !!s))).sort(),
    [all],
  );

  const move = useMutation({
    mutationFn: async ({ id, stage }: { id: number; stage: string }) =>
      apiRequest("PATCH", `/api/jobs/${id}`, { stage }),
    onSuccess: (_res, { stage }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job moved", description: `Stage set to ${JOB_STAGE_META[stage]?.label ?? stage}.` });
    },
    onSettled: (_res, _err, { id }) => {
      setPending((p) => { const n = { ...p }; delete n[id]; return n; });
    },
  });

  const columns = useMemo(() => {
    const map: Record<string, Job[]> = {};
    JOB_STAGES.forEach((s) => (map[s] = []));
    all.forEach((j) => {
      const stage = pending[j.id] ?? j.stage;
      (map[stage] ?? (map[stage] = [])).push(j);
    });
    return map;
  }, [all, pending]);

  function onDrop(stage: string) {
    if (dragId == null) return;
    const job = all.find((j) => j.id === dragId);
    setOverStage(null);
    const current = pending[dragId] ?? job?.stage;
    setDragId(null);
    if (!job || current === stage) return;
    setPending((p) => ({ ...p, [dragId]: stage }));
    move.mutate({ id: dragId, stage });
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {JOB_STAGES.slice(0, 4).map((s) => <Skeleton key={s} className="h-80" />)}
      </div>
    );
  }

  const completed = columns.completed ?? [];
  const lost = columns.lost ?? [];
  const inPlay = all.length - completed.length - lost.length;
  const completedValue = completed.reduce((sum, j) => sum + (j.value ?? 0), 0);
  const pipelineValue = all
    .filter((j) => j.stage !== "lost" && j.stage !== "completed")
    .reduce((sum, j) => sum + (j.value ?? 0), 0);
  const decided = completed.length + lost.length;
  const closeRate = decided > 0 ? Math.round((completed.length / decided) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track direct-to-homeowner work from first inspection to completed job. Drag cards across stages.
          </p>
        </div>
        <AddJobDialog knownSources={knownSources} />
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Jobs in play</div>
          <div className="text-2xl font-display font-bold mt-0.5" data-testid="stat-jobs-in-play">{inPlay}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Open pipeline value</div>
          <div className="text-2xl font-display font-bold mt-0.5" data-testid="stat-pipeline-value">{formatUSD(pipelineValue)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Completed revenue</div>
          <div className="text-2xl font-display font-bold mt-0.5 text-emerald-600 dark:text-emerald-400" data-testid="stat-completed-value">{formatUSD(completedValue)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Close rate</div>
          <div className="text-2xl font-display font-bold mt-0.5" data-testid="stat-close-rate">{closeRate}%</div>
        </Card>
      </div>

      {/* Board */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {JOB_STAGES.map((stage) => {
          const items = columns[stage] ?? [];
          const isOver = overStage === stage;
          const meta = JOB_STAGE_META[stage];
          const laneValue = items.reduce((sum, j) => sum + (j.value ?? 0), 0);
          return (
            <div
              key={stage}
              className={`rounded-lg border transition-colors ${isOver ? "border-primary bg-primary/5" : "border-border bg-muted/20"}`}
              onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
              onDragLeave={(e) => { if (e.currentTarget === e.target) setOverStage(null); }}
              onDrop={() => onDrop(stage)}
              data-testid={`job-column-${stage}`}
            >
              <div className="px-3 py-2.5 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${meta.accent}`} />
                    <span className="text-sm font-medium truncate">{meta.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0" data-testid={`job-count-${stage}`}>{items.length}</span>
                </div>
                {laneValue > 0 && (
                  <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">{formatUSD(laneValue)}</div>
                )}
              </div>

              <div className="p-2 space-y-2 min-h-32">
                {items.map((j) => (
                  <Card
                    key={j.id}
                    draggable
                    onDragStart={() => setDragId(j.id)}
                    onDragEnd={() => { setDragId(null); setOverStage(null); }}
                    onClick={() => setSelectedJob(j.id)}
                    className={`group p-2.5 cursor-grab active:cursor-grabbing hover-elevate ${dragId === j.id ? "opacity-50" : ""}`}
                    data-testid={`job-card-${j.id}`}
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm flex items-center gap-1">
                          <span className="truncate">{j.homeowner}</span>
                          {j.insuranceClaim && <ShieldCheck className="h-3 w-3 text-teal-500 shrink-0" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{j.roofType}</div>
                        {j.city && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{[j.city, j.state].filter(Boolean).join(", ")}</span>
                          </div>
                        )}
                        {j.value != null && (
                          <div className="text-xs font-medium mt-1 tabular-nums">{formatUSD(j.value)}</div>
                        )}
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

      {all.length === 0 && (
        <Card className="p-10 text-center">
          <HardHat className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="mt-3 font-medium">No jobs yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first homeowner job to start tracking the residential pipeline.</p>
        </Card>
      )}

      <JobDetailSheet jobId={selectedJob} knownSources={knownSources} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
