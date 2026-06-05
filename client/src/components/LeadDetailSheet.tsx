import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMode } from "@/lib/mode";
import type { Lead, Message } from "@shared/schema";
import {
  COUNTRY_FLAG, flagForLang, langName, localTimeIn, tzAbbrev, CHANNELS, STATUS_META,
} from "@/lib/i18n-data";
import { findSimilarNearby, formatMiles, usLocationLabel } from "@/lib/geo-data";
import { formatUSDFull } from "@/lib/i18n-data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { EditLeadDialog } from "@/components/EditLeadDialog";
import { WinCelebrationDialog } from "@/components/WinCelebrationDialog";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Phone, Building2, MapPin, Clock, Globe, CheckCircle2, Briefcase,
  Users as UsersIcon, MessageSquare, Pencil, Trash2, Navigation, Target, ArrowRight,
  Handshake, DollarSign, Tag, Plus, X, Bell,
} from "lucide-react";
import { scoreLead, scoreLabel } from "@/lib/scoring";

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail, call: Phone, sms: Phone, whatsapp: MessageSquare, linkedin: MessageSquare,
};

const STATUS_FLOW = ["new", "contacted", "engaged", "meeting", "won", "lost"];

function Field({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm break-words">{value}</div>
      </div>
    </div>
  );
}

export function LeadDetailSheet({ leadId, onClose, onOpenLead }: { leadId: number | null; onClose: () => void; onOpenLead?: (id: number) => void }) {
  const { isInternational } = useMode();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [radius, setRadius] = useState("250");
  // Win-triggered lookalikes: snapshot the lead that just closed so the
  // celebration dialog can suggest nearby twins to pursue next.
  const [wonLead, setWonLead] = useState<Lead | null>(null);
  // Referral attribution form state (controlled, synced from the lead).
  const [refSource, setRefSource] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [newTag, setNewTag] = useState("");
  const [reminderText, setReminderText] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const { data: lead } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    enabled: leadId != null,
  });
  const { data: allLeads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    enabled: leadId != null,
  });
  const { data: messages } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    enabled: leadId != null,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest("PATCH", `/api/leads/${leadId}`, { status });
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      // Fire the lookalike growth loop only on a fresh transition into "Won".
      if (status === "won" && lead && lead.status !== "won" && lead.country === "United States") {
        setWonLead({ ...lead, status: "won" });
      } else {
        toast({ title: "Status updated" });
      }
    },
  });

  const remove = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/leads/${leadId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Lead deleted" });
      setConfirmDelete(false);
      onClose();
    },
    onError: () => toast({ title: "Couldn't delete lead", variant: "destructive" }),
  });

  const advanceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/leads/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Added to outreach", description: "Lead moved to Contacted." });
    },
  });

  const thread = (messages ?? [])
    .filter((m) => m.leadId === leadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const t = lead && isInternational ? localTimeIn(lead.timezone) : null;

  // Geographic lookalikes: same industry + similar size, ranked by distance.
  const nearby = useMemo(() => {
    if (!lead || !allLeads || lead.country !== "United States") return [];
    return findSimilarNearby(lead, allLeads, Number(radius)).slice(0, 8);
  }, [lead, allLeads, radius]);

  // Sync attribution form whenever a different lead loads.
  useEffect(() => {
    setRefSource(lead?.referredBy ?? "");
    setDealValue(lead?.dealValue != null ? String(lead.dealValue) : "");
  }, [lead?.id, lead?.referredBy, lead?.dealValue]);

  // Distinct referral sources already in use — power the autocomplete list.
  const knownSources = useMemo(() => {
    const set = new Set<string>();
    for (const l of allLeads ?? []) {
      if (l.referredBy && l.referredBy.trim()) set.add(l.referredBy.trim());
    }
    return [...set].sort();
  }, [allLeads]);

  const saveAttribution = useMutation({
    mutationFn: async (patch: { referredBy?: string | null; dealValue?: number | null }) =>
      apiRequest("PATCH", `/api/leads/${leadId}`, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
    },
    onError: () => toast({ title: "Couldn't save attribution", variant: "destructive" }),
  });

  const commitSource = () => {
    const next = refSource.trim();
    if ((lead?.referredBy ?? "") === next) return;
    saveAttribution.mutate({ referredBy: next || null });
  };
  const commitDealValue = () => {
    const raw = dealValue.replace(/[^0-9]/g, "");
    const next = raw ? Number(raw) : null;
    if ((lead?.dealValue ?? null) === next) return;
    saveAttribution.mutate({ dealValue: next });
  };

  return (
    <Sheet open={leadId != null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto" data-testid="sheet-lead-detail">
        {lead ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {lead.fullName}
                {lead.verified && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              </SheetTitle>
              <div className="text-sm text-muted-foreground">{lead.title} · {lead.company}</div>
              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-edit-lead" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-rose-600 dark:text-rose-400" data-testid="button-delete-lead" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </SheetHeader>

            {/* Status */}
            <div className="mt-5">
              <div className="text-xs text-muted-foreground mb-2">Pipeline stage</div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FLOW.map((s) => (
                  <button
                    key={s}
                    type="button"
                    data-testid={`status-btn-${s}`}
                    onClick={() => updateStatus.mutate(s)}
                    disabled={updateStatus.isPending}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      lead.status === s
                        ? STATUS_META[s]?.tone + " ring-1 ring-current"
                        : "bg-muted text-muted-foreground hover-elevate"
                    }`}
                  >
                    {STATUS_META[s]?.label ?? s}
                  </button>
                ))}
              </div>
            </div>

            {/* Profile */}
            <div className="mt-6 space-y-4">
              <Field icon={Mail} label="Email" value={lead.email} />
              {lead.phone && <Field icon={Phone} label="Phone" value={lead.phone} />}
              {/* Lead Score */}
              {(() => {
                const score = scoreLead(lead);
                const sl = scoreLabel(score);
                return (
                  <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/40 border border-border">
                    <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Lead Score</div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold tabular-nums ${sl.className}`}>{score}</span>
                        <span className={`text-sm font-semibold ${sl.className}`}>{sl.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Tags */}
              <div className="flex items-start gap-3">
                <Tag className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(lead.tags || "").split(",").filter(Boolean).map((tag: string) => (
                      <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        #{tag}
                        <button
                          onClick={() => {
                            fetch(`/api/leads/${lead.id}/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ remove: tag }) })
                              .then(() => { queryClient.invalidateQueries({ queryKey: ["/api/leads"] }); queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] }); });
                          }}
                          className="hover:text-red-400 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newTag}
                        onChange={e => setNewTag(e.target.value.replace(/[^a-z0-9-]/g, ""))}
                        onKeyDown={e => {
                          if (e.key === "Enter" && newTag.trim()) {
                            fetch(`/api/leads/${lead.id}/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ add: newTag.trim() }) })
                              .then(() => { setNewTag(""); queryClient.invalidateQueries({ queryKey: ["/api/leads"] }); queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] }); });
                          }
                        }}
                        placeholder="add tag"
                        className="w-20 text-xs px-2 py-0.5 rounded-full border border-border bg-background focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Reminders */}
              <div className="flex items-start gap-3">
                <Bell className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">Follow-up Reminder</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={reminderText}
                      onChange={e => setReminderText(e.target.value)}
                      placeholder="Call to discuss proposal"
                      className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background focus:outline-none focus:border-primary/50"
                    />
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={e => setReminderDate(e.target.value)}
                      className="text-xs px-2 py-1 rounded border border-border bg-background focus:outline-none focus:border-primary/50 w-32"
                    />
                    <button
                      onClick={() => {
                        if (!reminderText.trim() || !reminderDate) return;
                        fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id, text: reminderText.trim(), dueDate: reminderDate }) })
                          .then(() => { setReminderText(""); setReminderDate(""); queryClient.invalidateQueries({ queryKey: ["/api/reminders"] }); toast({ title: "Reminder added" }); });
                      }}
                      className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
                      disabled={!reminderText.trim() || !reminderDate}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <Field icon={Building2} label="Company" value={`${lead.company} · ${lead.industry}`} />
              <Field icon={UsersIcon} label="Company size" value={`${lead.companySize} employees`} />
              <Field
                icon={MapPin}
                label="Location"
                value={<span className="flex items-center gap-1.5">{COUNTRY_FLAG[lead.country] ?? "🌍"} {lead.country === "United States" && lead.metro ? lead.metro : `${lead.city ? `${lead.city}, ` : ""}${lead.country}`}</span>}
              />
              {isInternational && (
                <>
                  <Field
                    icon={Globe}
                    label="Language"
                    value={<span className="flex items-center gap-1.5">{flagForLang(lead.language)} {langName(lead.language)}</span>}
                  />
                  {t && (
                    <Field
                      icon={Clock}
                      label="Local time"
                      value={
                        <span className="flex items-center gap-2 font-mono">
                          {t.time} {tzAbbrev(lead.timezone)}
                          <span className={`text-xs font-sans ${t.inWindow ? "text-emerald-500" : "text-muted-foreground"}`}>
                            {t.inWindow ? "● Best time to reach" : "○ Outside hours"}
                          </span>
                        </span>
                      }
                    />
                  )}
                </>
              )}
            </div>

            {/* Referral attribution — credit the source that sent this deal */}
            {lead.country === "United States" && (
              <div className="mt-6" data-testid="section-referral-attribution">
                <div className="flex items-center gap-2 mb-3">
                  <Handshake className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">Referral attribution</h3>
                </div>
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <div>
                    <Label htmlFor="input-referred-by" className="text-xs text-muted-foreground">
                      Referred by
                    </Label>
                    <Input
                      id="input-referred-by"
                      data-testid="input-referred-by"
                      list="referral-sources"
                      placeholder="e.g. Cardinal Insurance Group, past customer…"
                      className="mt-1 h-9"
                      value={refSource}
                      onChange={(e) => setRefSource(e.target.value)}
                      onBlur={commitSource}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    />
                    <datalist id="referral-sources">
                      {knownSources.map((s) => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  {lead.status === "won" && (
                    <div data-testid="field-deal-value">
                      <Label htmlFor="input-deal-value" className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Deal value (USD)
                      </Label>
                      <Input
                        id="input-deal-value"
                        data-testid="input-deal-value"
                        inputMode="numeric"
                        placeholder="e.g. 48000"
                        className="mt-1 h-9"
                        value={dealValue}
                        onChange={(e) => setDealValue(e.target.value)}
                        onBlur={commitDealValue}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                      {lead.dealValue != null && (
                        <p className="text-xs text-muted-foreground mt-1" data-testid="text-deal-value">
                          Closed-won at {formatUSDFull(lead.dealValue)}
                          {lead.referredBy ? ` · credited to ${lead.referredBy}` : ""}
                        </p>
                      )}
                    </div>
                  )}
                  {lead.status !== "won" && (
                    <p className="text-xs text-muted-foreground">
                      Deal value is recorded when this lead is marked Won. Referral source can be set at any stage.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Similar businesses nearby — the local growth loop */}
            {lead.country === "United States" && (
              <div className="mt-6" data-testid="section-similar-nearby">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium">Similar businesses nearby</h3>
                  </div>
                  <Select value={radius} onValueChange={setRadius}>
                    <SelectTrigger className="h-7 w-[120px] text-xs" data-testid="select-radius">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">Within 50 mi</SelectItem>
                      <SelectItem value="150">Within 150 mi</SelectItem>
                      <SelectItem value="250">Within 250 mi</SelectItem>
                      <SelectItem value="1000">Within 1,000 mi</SelectItem>
                      <SelectItem value="99999">Anywhere in US</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <Target className="h-3 w-3" /> {lead.industry} · {lead.companySize} employees
                </p>
                <div className="space-y-2">
                  {nearby.map(({ lead: n, miles }) => (
                    <div
                      key={n.id}
                      data-testid={`nearby-card-${n.id}`}
                      className="rounded-lg border border-border p-3 hover-elevate"
                    >
                      <button
                        type="button"
                        data-testid={`nearby-open-${n.id}`}
                        onClick={() => onOpenLead?.(n.id)}
                        className="text-left w-full"
                      >
                        <div className="text-sm font-medium truncate flex items-center gap-1.5">
                          {n.company}
                          {n.verified && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {n.fullName} · {n.title}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 flex-wrap">
                          <MapPin className="h-3 w-3" /> {usLocationLabel(n)}
                          {miles != null && (
                            <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.5 font-medium" data-testid={`nearby-distance-${n.id}`}>
                              {formatMiles(miles)}
                            </span>
                          )}
                          <span className={`rounded-full px-1.5 py-0.5 ${STATUS_META[n.status]?.tone ?? ""}`}>
                            {STATUS_META[n.status]?.label ?? n.status}
                          </span>
                        </div>
                      </button>
                      <div className="flex items-center gap-3 mt-2">
                        {n.status === "new" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-xs"
                            data-testid={`nearby-add-${n.id}`}
                            disabled={advanceStatus.isPending}
                            onClick={() => advanceStatus.mutate({ id: n.id, status: "contacted" })}
                          >
                            <ArrowRight className="h-3 w-3" /> Add to outreach
                          </Button>
                        )}
                        <button
                          type="button"
                          data-testid={`nearby-view-${n.id}`}
                          onClick={() => onOpenLead?.(n.id)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          View profile
                        </button>
                      </div>
                    </div>
                  ))}
                  {nearby.length === 0 && (
                    <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                      No similar businesses found in this radius. Try widening the search.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conversation history */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Conversation history</h3>
                <span className="text-xs text-muted-foreground">{thread.length}</span>
              </div>
              <div className="space-y-2">
                {thread.map((m) => {
                  const Icon = CHANNEL_ICONS[m.channel] ?? Mail;
                  const outbound = m.direction === "outbound";
                  return (
                    <div key={m.id} className={`rounded-lg border border-border p-3 text-sm ${outbound ? "bg-primary/5" : "bg-muted/40"}`}>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Icon className="h-3 w-3" />
                        {CHANNELS[m.channel]?.label ?? m.channel}
                        <span>· {outbound ? "Sent" : "Received"}</span>
                        {isInternational && <span>· {flagForLang(m.language)}</span>}
                        <span className="capitalize">· {m.status}</span>
                      </div>
                      {m.subject && <div className="font-medium mb-0.5">{m.subject}</div>}
                      <div className="text-muted-foreground whitespace-pre-wrap">{m.body}</div>
                    </div>
                  );
                })}
                {thread.length === 0 && (
                  <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                    No messages yet. Start a conversation from the Unified Inbox.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>Lead details</SheetTitle>
            </SheetHeader>
            <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
          </>
        )}
      </SheetContent>

      {lead && <EditLeadDialog lead={lead} open={editOpen} onOpenChange={setEditOpen} />}

      <WinCelebrationDialog
        wonLead={wonLead}
        allLeads={allLeads ?? []}
        open={wonLead != null}
        onClose={() => setWonLead(null)}
        onOpenLead={(id) => { setWonLead(null); onOpenLead?.(id); }}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              {lead ? `${lead.fullName} and their conversation history will be permanently removed.` : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-lead">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-lead"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={(e) => { e.preventDefault(); remove.mutate(); }}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
