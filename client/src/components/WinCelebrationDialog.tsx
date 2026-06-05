import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Lead, Campaign, Step } from "@shared/schema";
import { findSimilarNearby, formatMiles, usLocationLabel } from "@/lib/geo-data";
import { STATUS_META, LOCAL_CHANNELS } from "@/lib/i18n-data";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trophy, MapPin, CheckCircle2, Sparkles, Send, Target } from "lucide-react";

// The "lookalike" growth loop: closing a deal surfaces nearby twins to pursue next.
// Default radius is tight (local-first); only "new" prospects are enrollable.
const WIN_RADIUS = 50;

export function WinCelebrationDialog({
  wonLead,
  allLeads,
  open,
  onClose,
  onOpenLead,
}: {
  wonLead: Lead | null;
  allLeads: Lead[];
  open: boolean;
  onClose: () => void;
  onOpenLead?: (id: number) => void;
}) {
  const { toast } = useToast();
  const [campaignId, setCampaignId] = useState<string>("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    enabled: open,
  });

  // Nearby twins: same industry + similar size within the local radius.
  const nearby = useMemo(() => {
    if (!wonLead) return [];
    return findSimilarNearby(wonLead, allLeads, WIN_RADIUS);
  }, [wonLead, allLeads]);

  // Only "new" (un-worked) prospects can be enrolled into outreach.
  const enrollable = useMemo(() => nearby.filter((n) => n.lead.status === "new"), [nearby]);

  // Pre-select all enrollable prospects and default the campaign when the dialog opens.
  useEffect(() => {
    if (open) {
      setSelected(new Set(enrollable.map((n) => n.lead.id)));
    } else {
      setSelected(new Set());
      setCampaignId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, wonLead?.id]);

  useEffect(() => {
    if (open && campaigns && campaigns.length && !campaignId) {
      // Prefer an active campaign, else the first one.
      const active = campaigns.find((c) => c.status === "active");
      setCampaignId(String((active ?? campaigns[0]).id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaigns]);

  const enroll = useMutation({
    mutationFn: async () => {
      const ids = [...selected];
      if (!ids.length) return { enrolled: 0 };
      // Load the chosen campaign's first step for a realistic first-touch message.
      let firstStep: Step | undefined;
      let campaignName = "Outreach";
      if (campaignId) {
        const res = await apiRequest("GET", `/api/campaigns/${campaignId}`);
        const full = await res.json().catch(() => null);
        if (full) {
          campaignName = full.name ?? campaignName;
          const steps: Step[] = (full.steps ?? []).slice().sort((a: Step, b: Step) => a.stepOrder - b.stepOrder);
          firstStep = steps[0];
        }
      }
      const channel = firstStep?.channel ?? LOCAL_CHANNELS[0];
      const now = new Date();
      const nowIso = now.toISOString();

      for (const id of ids) {
        const prospect = allLeads.find((l) => l.id === id);
        const subject = firstStep?.subject ?? `Helping ${prospect?.company ?? "you"} like we did ${wonLead?.company}`;
        const body =
          firstStep?.body ??
          `Hi ${prospect?.fullName?.split(" ")[0] ?? "there"}, we just helped ${wonLead?.company} in ${wonLead?.metro ?? usLocationLabel(wonLead as Lead)} and thought a similar ${prospect?.industry ?? "business"} like yours might benefit too. Open to a quick chat?`;

        // 1) Create a scheduled outbound first-touch tied to the campaign.
        await apiRequest("POST", "/api/messages", {
          leadId: id,
          campaignId: campaignId ? Number(campaignId) : null,
          channel,
          direction: "outbound",
          language: prospect?.language ?? "en",
          subject,
          body,
          scheduledFor: nowIso,
          localSendTime: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "scheduled",
          createdAt: nowIso,
        });
        // 2) Advance the prospect into the pipeline.
        await apiRequest("PATCH", `/api/leads/${id}`, { status: "contacted" });
      }
      return { enrolled: ids.length, campaignName };
    },
    onSuccess: (r: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Lookalikes enrolled",
        description: `${r.enrolled} prospect${r.enrolled === 1 ? "" : "s"} dropped into ${r.campaignName}. First touch scheduled.`,
      });
      onClose();
    },
    onError: () => toast({ title: "Couldn't enroll prospects", variant: "destructive" }),
  });

  function toggle(id: number, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }

  if (!wonLead) return null;

  const selectedCount = selected.size;
  const hasCampaigns = !!(campaigns && campaigns.length);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg" data-testid="dialog-win-celebration">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="flex items-center gap-1.5">
                Deal won — {wonLead.company}
                <Sparkles className="h-4 w-4 text-amber-500" />
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                Strike while it's hot: here are similar local businesses to pursue next.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center gap-2 text-xs text-muted-foreground -mt-1">
          <Target className="h-3.5 w-3.5" />
          <span data-testid="text-win-match-criteria">
            {wonLead.industry} · {wonLead.companySize} employees · within {WIN_RADIUS} mi of {wonLead.metro ?? usLocationLabel(wonLead)}
          </span>
        </div>

        {enrollable.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground" data-testid="text-no-lookalikes">
            No fresh lookalikes within {WIN_RADIUS} mi right now.
            {nearby.length > 0 && " Similar businesses nearby are already in your pipeline."}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium" data-testid="text-lookalike-count">
                {enrollable.length} similar prospect{enrollable.length === 1 ? "" : "s"} found
              </span>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                data-testid="button-toggle-all-lookalikes"
                onClick={() =>
                  setSelected((prev) =>
                    prev.size === enrollable.length ? new Set() : new Set(enrollable.map((n) => n.lead.id)),
                  )
                }
              >
                {selected.size === enrollable.length ? "Deselect all" : "Select all"}
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto -mx-1 px-1">
              {enrollable.map(({ lead: n, miles }) => {
                const checked = selected.has(n.id);
                return (
                  <label
                    key={n.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${checked ? "border-primary/50 bg-primary/5" : "border-border hover-elevate"}`}
                    data-testid={`lookalike-card-${n.id}`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggle(n.id, !!v)}
                      className="mt-0.5"
                      data-testid={`lookalike-check-${n.id}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate flex items-center gap-1.5">
                        {n.company}
                        {n.verified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{n.fullName} · {n.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <MapPin className="h-3 w-3" /> {usLocationLabel(n)}
                        {miles != null && (
                          <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.5 font-medium" data-testid={`lookalike-distance-${n.id}`}>
                            {formatMiles(miles)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                      data-testid={`lookalike-view-${n.id}`}
                      onClick={(e) => { e.preventDefault(); onOpenLead?.(n.id); }}
                    >
                      View
                    </button>
                  </label>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">Drop selected into campaign</div>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger data-testid="select-win-campaign" disabled={!hasCampaigns}>
                  <SelectValue placeholder={hasCampaigns ? "Choose a campaign" : "No campaigns yet"} />
                </SelectTrigger>
                <SelectContent>
                  {(campaigns ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} data-testid={`option-campaign-${c.id}`}>
                      {c.name}
                      {c.status === "active" && <Badge variant="secondary" className="ml-2 text-[10px]">Active</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onClose} data-testid="button-win-dismiss">
            Maybe later
          </Button>
          {enrollable.length > 0 && (
            <Button
              className="gap-1.5"
              disabled={selectedCount === 0 || !campaignId || enroll.isPending}
              onClick={() => enroll.mutate()}
              data-testid="button-win-enroll"
            >
              <Send className="h-4 w-4" />
              {enroll.isPending
                ? "Enrolling…"
                : `Enroll ${selectedCount} prospect${selectedCount === 1 ? "" : "s"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
