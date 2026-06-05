import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Job } from "@shared/schema";
import { JOB_STAGES, JOB_STAGE_META, ROOF_TYPES, formatUSDFull } from "@/lib/i18n-data";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, Mail, ShieldCheck, Trash2 } from "lucide-react";

export function JobDetailSheet({
  jobId,
  knownSources = [],
  onClose,
}: {
  jobId: number | null;
  knownSources?: string[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { data: job } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
    enabled: jobId != null,
  });

  // Editable form mirrors the job; synced whenever the open job changes.
  const [referredBy, setReferredBy] = useState("");
  const [value, setValue] = useState("");
  const [roofType, setRoofType] = useState("Asphalt shingle");
  const [insuranceClaim, setInsuranceClaim] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (job) {
      setReferredBy(job.referredBy ?? "");
      setValue(job.value != null ? String(job.value) : "");
      setRoofType(job.roofType ?? "Asphalt shingle");
      setInsuranceClaim(!!job.insuranceClaim);
      setNotes(job.notes ?? "");
    }
  }, [job]);

  const patch = useMutation({
    mutationFn: async (body: Partial<Job>) => apiRequest("PATCH", `/api/jobs/${jobId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
    },
  });

  const del = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/jobs/${jobId}`),
    onSuccess: () => {
      // Drop the now-deleted job's detail query so the list invalidation
      // below doesn't try to refetch it (which would 404).
      queryClient.removeQueries({ queryKey: ["/api/jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"], exact: true });
      toast({ title: "Job removed" });
      onClose();
    },
  });

  function setStage(stage: string) {
    patch.mutate({ stage });
  }

  function saveDetails() {
    patch.mutate({
      referredBy: referredBy || null,
      value: value ? Math.round(Number(value)) : null,
      roofType,
      insuranceClaim,
      notes: notes || null,
    });
    toast({ title: "Job updated" });
  }

  const open = jobId != null;
  const meta = job ? JOB_STAGE_META[job.stage] : undefined;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto" data-testid="sheet-job-detail">
        {!job && <SheetTitle className="sr-only">Job details</SheetTitle>}
        {job && (
          <>
            <SheetHeader className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {meta && (
                  <Badge variant="secondary" className={meta.tone} data-testid="badge-job-stage">
                    {meta.label}
                  </Badge>
                )}
                {job.insuranceClaim && (
                  <Badge variant="secondary" className="bg-teal-500/10 text-teal-600 dark:text-teal-300 gap-1">
                    <ShieldCheck className="h-3 w-3" /> Insurance
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-xl" data-testid="text-job-homeowner">{job.homeowner}</SheetTitle>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Contact / property */}
              <div className="space-y-2 text-sm">
                {(job.address || job.city) && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{[job.address, [job.city, job.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</span>
                  </div>
                )}
                {job.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" /> <span>{job.phone}</span>
                  </div>
                )}
                {job.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" /> <span className="truncate">{job.email}</span>
                  </div>
                )}
              </div>

              {/* Stage picker */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Pipeline stage</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {JOB_STAGES.map((s) => {
                    const m = JOB_STAGE_META[s];
                    const active = job.stage === s;
                    return (
                      <button
                        key={s}
                        data-testid={`job-stage-btn-${s}`}
                        onClick={() => setStage(s)}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors border ${
                          active
                            ? "border-transparent " + m.tone
                            : "border-border text-muted-foreground hover-elevate"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${m.accent}`} />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable details */}
              <div className="space-y-4 border-t border-border pt-5" data-testid="section-job-details">
                <div className="space-y-1.5">
                  <Label>Roof / service type</Label>
                  <Select value={roofType} onValueChange={setRoofType}>
                    <SelectTrigger data-testid="select-detail-roof-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROOF_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="jd-value">Job value (USD)</Label>
                  <Input id="jd-value" data-testid="input-detail-value" type="number" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder="14500" />
                  {value && <p className="text-xs text-muted-foreground" data-testid="text-detail-value">{formatUSDFull(Number(value))}</p>}
                </div>

                <datalist id="job-detail-sources">
                  {knownSources.map((s) => <option key={s} value={s} />)}
                </datalist>
                <div className="space-y-1.5">
                  <Label htmlFor="jd-source">Referral source</Label>
                  <Input id="jd-source" data-testid="input-detail-source" list="job-detail-sources" value={referredBy} onChange={(e) => setReferredBy(e.target.value)} placeholder="State Farm — Greensburg (Tom Reilly)" />
                </div>

                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                  <div>
                    <div className="text-sm font-medium">Insurance claim</div>
                    <div className="text-xs text-muted-foreground">Storm/hail damage</div>
                  </div>
                  <Switch data-testid="switch-detail-insurance" checked={insuranceClaim} onCheckedChange={setInsuranceClaim} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="jd-notes">Notes</Label>
                  <Textarea id="jd-notes" data-testid="input-detail-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Inspected north slope — hail bruising on 60% of field shingles." />
                </div>

                <div className="flex items-center gap-2">
                  <Button data-testid="button-save-job-details" onClick={saveDetails} disabled={patch.isPending} className="flex-1">
                    {patch.isPending ? "Saving…" : "Save changes"}
                  </Button>
                  <Button variant="outline" size="icon" data-testid="button-delete-job" onClick={() => del.mutate()} disabled={del.isPending} aria-label="Delete job">
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
