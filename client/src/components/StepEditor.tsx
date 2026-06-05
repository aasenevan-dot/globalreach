import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Step } from "@shared/schema";
import { CHANNELS } from "@/lib/i18n-data";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Phone, Smartphone, MessageCircle, Linkedin, Pencil, Trash2,
  ArrowUp, ArrowDown, Plus,
} from "lucide-react";

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail, call: Phone, sms: Smartphone, whatsapp: MessageCircle, linkedin: Linkedin,
};

type Draft = { channel: string; delayDays: number; subject: string; body: string };

function StepFormDialog({
  open, onOpenChange, initial, channels, title, onSave, saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Draft;
  channels: string[];
  title: string;
  onSave: (d: Draft) => void;
  saving: boolean;
}) {
  const [d, setD] = useState<Draft>(initial);
  // Reset draft each time the dialog opens with a (possibly) different step.
  const [seed, setSeed] = useState(open);
  if (open !== seed) {
    setSeed(open);
    if (open) setD(initial);
  }
  const needsBody = d.channel !== "call";
  const valid = needsBody ? d.body.trim().length > 0 : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={d.channel} onValueChange={(v) => setD((s) => ({ ...s, channel: v }))}>
                <SelectTrigger data-testid="select-step-channel"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {channels.map((c) => (
                    <SelectItem key={c} value={c}>{CHANNELS[c]?.label ?? c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="step-delay">Delay (days)</Label>
              <Input
                id="step-delay"
                type="number"
                min={0}
                data-testid="input-step-delay"
                value={d.delayDays}
                onChange={(e) => setD((s) => ({ ...s, delayDays: Math.max(0, Number(e.target.value) || 0) }))}
              />
            </div>
          </div>
          {d.channel === "email" && (
            <div className="space-y-1.5">
              <Label htmlFor="step-subject">Subject</Label>
              <Input id="step-subject" data-testid="input-step-subject" value={d.subject} onChange={(e) => setD((s) => ({ ...s, subject: e.target.value }))} placeholder="Quick question about {{company}}" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="step-body">{d.channel === "call" ? "Call notes / script" : "Message"}</Label>
            <Textarea
              id="step-body"
              data-testid="input-step-body"
              rows={5}
              value={d.body}
              onChange={(e) => setD((s) => ({ ...s, body: e.target.value }))}
              placeholder={d.channel === "call" ? "Talking points for the call…" : "Hi {{firstName}}, …"}
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {["{{firstName}}","{{lastName}}","{{company}}","{{title}}","{{industry}}","{{city}}","{{country}}"].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setD(s => ({ ...s, body: (s.body || "") + t }))}
                  className="text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 border border-border font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button data-testid="button-save-step" disabled={!valid || saving} onClick={() => onSave(d)}>
            {saving ? "Saving…" : "Save step"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StepEditor({
  campaignId, steps, channels,
}: { campaignId: number; steps: Step[]; channels: string[] }) {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Step | null>(null);
  const [deleting, setDeleting] = useState<Step | null>(null);

  const ordered = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
  const channelChoices = channels.length ? channels : ["email", "call", "sms"];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId] });

  const createStep = useMutation({
    mutationFn: async (d: Draft) =>
      apiRequest("POST", "/api/steps", {
        campaignId,
        stepOrder: ordered.length,
        channel: d.channel,
        delayDays: d.delayDays,
        subject: d.channel === "email" ? (d.subject || null) : null,
        body: d.body || "(no content)",
        translations: "{}",
      }),
    onSuccess: () => { invalidate(); toast({ title: "Step added" }); setAdding(false); },
    onError: () => toast({ title: "Couldn't add step", variant: "destructive" }),
  });

  const patchStep = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Record<string, any> }) =>
      apiRequest("PATCH", `/api/steps/${id}`, patch),
    onSuccess: () => invalidate(),
    onError: () => toast({ title: "Couldn't update step", variant: "destructive" }),
  });

  const editStep = useMutation({
    mutationFn: async ({ id, d }: { id: number; d: Draft }) =>
      apiRequest("PATCH", `/api/steps/${id}`, {
        channel: d.channel,
        delayDays: d.delayDays,
        subject: d.channel === "email" ? (d.subject || null) : null,
        body: d.body || "(no content)",
      }),
    onSuccess: () => { invalidate(); toast({ title: "Step updated" }); setEditing(null); },
    onError: () => toast({ title: "Couldn't update step", variant: "destructive" }),
  });

  const removeStep = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/steps/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Step removed" }); setDeleting(null); },
    onError: () => toast({ title: "Couldn't remove step", variant: "destructive" }),
  });

  // Swap stepOrder with the neighbour in the given direction.
  const move = (index: number, dir: -1 | 1) => {
    const a = ordered[index];
    const b = ordered[index + dir];
    if (!a || !b) return;
    patchStep.mutate({ id: a.id, patch: { stepOrder: b.stepOrder } });
    patchStep.mutate({ id: b.id, patch: { stepOrder: a.stepOrder } });
  };

  return (
    <div className="space-y-4">
      {ordered.map((step, i) => {
        const Icon = CHANNEL_ICONS[step.channel] ?? Mail;
        return (
          <div key={step.id} className="flex gap-4" data-testid={`step-row-${step.id}`}>
            <div className="flex flex-col items-center">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-4 w-4" /></div>
              {i < ordered.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium capitalize">{CHANNELS[step.channel]?.label ?? step.channel}</span>
                  <span className="text-muted-foreground text-xs">
                    {step.delayDays === 0 ? "Immediately" : `Day ${step.delayDays}`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0 || patchStep.isPending} onClick={() => move(i, -1)} data-testid={`button-step-up-${step.id}`}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === ordered.length - 1 || patchStep.isPending} onClick={() => move(i, 1)} data-testid={`button-step-down-${step.id}`}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(step)} data-testid={`button-step-edit-${step.id}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 dark:text-rose-400" onClick={() => setDeleting(step)} data-testid={`button-step-delete-${step.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 p-3 bg-muted/30 rounded-md border border-border">
                {step.subject && <div className="font-medium text-sm mb-1">{step.subject}</div>}
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{step.body}</div>
              </div>
            </div>
          </div>
        );
      })}

      {ordered.length === 0 && (
        <p className="text-sm text-muted-foreground">No steps yet — add the first touch below.</p>
      )}

      <Button variant="outline" className="gap-1.5" onClick={() => setAdding(true)} data-testid="button-add-step">
        <Plus className="h-4 w-4" /> Add step
      </Button>

      {/* Add */}
      <StepFormDialog
        open={adding}
        onOpenChange={setAdding}
        title="Add a sequence step"
        channels={channelChoices}
        initial={{ channel: channelChoices[0], delayDays: ordered.length === 0 ? 0 : 2, subject: "", body: "" }}
        onSave={(d) => createStep.mutate(d)}
        saving={createStep.isPending}
      />

      {/* Edit */}
      {editing && (
        <StepFormDialog
          open={!!editing}
          onOpenChange={(o) => { if (!o) setEditing(null); }}
          title="Edit step"
          channels={channelChoices}
          initial={{ channel: editing.channel, delayDays: editing.delayDays, subject: editing.subject ?? "", body: editing.body }}
          onSave={(d) => editStep.mutate({ id: editing.id, d })}
          saving={editStep.isPending}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this step?</AlertDialogTitle>
            <AlertDialogDescription>This sequence step will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-step">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-step"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={(e) => { e.preventDefault(); if (deleting) removeStep.mutate(deleting.id); }}
              disabled={removeStep.isPending}
            >
              {removeStep.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
