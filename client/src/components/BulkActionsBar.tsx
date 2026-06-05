import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Campaign } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { STATUS_META } from "@/lib/i18n-data";
import {
  Tag,
  ChevronDown,
  Trash2,
  X,
  Mail,
  Users,
  Label as LabelIcon,
} from "lucide-react";

const STATUS_KEYS = ["new", "contacted", "engaged", "meeting", "won", "lost"];

interface BulkActionsBarProps {
  selectedCount: number;
  leadIds: number[];
  campaigns: Campaign[];
  onClearSelection: () => void;
  onStatusChange?: (status: string) => void;
  onDelete?: () => void;
}

export function BulkActionsBar({
  selectedCount,
  leadIds,
  campaigns,
  onClearSelection,
  onStatusChange,
  onDelete,
}: BulkActionsBarProps) {
  const { toast } = useToast();
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [showEnrollCampaign, setShowEnrollCampaign] = useState(false);
  const [showBulkTags, setShowBulkTags] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [tagsToAdd, setTagsToAdd] = useState("");
  const [tagsToRemove, setTagsToRemove] = useState("");

  const bulkEmailMut = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/leads/bulk-email", {
        leadIds,
        subject: emailSubject,
        body: emailBody,
      }),
    onSuccess: async (res: any) => {
      const data = await res.json().catch(() => ({}));
      toast({
        title: "Emails sent",
        description: `Successfully sent to ${data.sent || 0} lead${data.sent === 1 ? "" : "s"}.`,
      });
      setShowBulkEmail(false);
      setEmailSubject("");
      setEmailBody("");
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to send emails",
        variant: "destructive",
      });
    },
  });

  const enrollCampaignMut = useMutation({
    mutationFn: async () =>
      apiRequest("POST", `/api/campaigns/${selectedCampaign}/bulk-enroll`, {
        leadIds,
      }),
    onSuccess: async (res: any) => {
      const data = await res.json().catch(() => ({}));
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Campaign enrollment",
        description: `Enrolled ${data.enrolled || 0} lead${data.enrolled === 1 ? "" : "s"}.`,
      });
      setShowEnrollCampaign(false);
      setSelectedCampaign(null);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to enroll leads",
        variant: "destructive",
      });
    },
  });

  const bulkTagsMut = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/leads/bulk-tags", {
        leadIds,
        tagsToAdd: tagsToAdd
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        tagsToRemove: tagsToRemove
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    onSuccess: async (res: any) => {
      const data = await res.json().catch(() => ({}));
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Tags updated",
        description: `Updated tags on ${data.updated || 0} lead${data.updated === 1 ? "" : "s"}.`,
      });
      setShowBulkTags(false);
      setTagsToAdd("");
      setTagsToRemove("");
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to update tags",
        variant: "destructive",
      });
    },
  });

  if (selectedCount === 0) return null;

  return (
    <>
      <Card
        className="p-3 flex flex-wrap items-center gap-3 border-primary/40 bg-primary/5"
        data-testid="bar-bulk-actions"
      >
        <span className="text-sm font-medium" data-testid="text-selected-count">
          {selectedCount} selected
        </span>
        <div className="flex-1" />

        {/* Set Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Set status <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Move to stage</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUS_KEYS.map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => onStatusChange?.(s)}
                data-testid={`menuitem-status-${s}`}
              >
                <span
                  className={`mr-2 h-2 w-2 rounded-full inline-block ${
                    STATUS_META[s]?.tone.split(" ")[0]
                  }`}
                />
                {STATUS_META[s]?.label ?? s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bulk Email */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowBulkEmail(true)}
          data-testid="button-bulk-email"
        >
          <Mail className="h-3.5 w-3.5" /> Email
        </Button>

        {/* Enroll in Campaign */}
        {campaigns.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowEnrollCampaign(true)}
            data-testid="button-enroll-campaign"
          >
            <Users className="h-3.5 w-3.5" /> Enroll
          </Button>
        )}

        {/* Bulk Tag Operations */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowBulkTags(true)}
          data-testid="button-bulk-tags"
        >
          <LabelIcon className="h-3.5 w-3.5" /> Tags
        </Button>

        {/* Delete */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-rose-600 dark:text-rose-400"
          onClick={() => setConfirmDelete(true)}
          data-testid="button-bulk-delete"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>

        {/* Clear Selection */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={onClearSelection}
          data-testid="button-clear-selection"
        >
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      </Card>

      {/* Bulk Email Dialog */}
      <Dialog open={showBulkEmail} onOpenChange={setShowBulkEmail}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send email to {selectedCount} leads</DialogTitle>
            <DialogDescription>
              One-off email to all selected leads. This does not create campaign messages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Subject</label>
              <Input
                placeholder="Email subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Message</label>
              <textarea
                placeholder="Email body"
                className="w-full h-32 rounded-md border border-border px-3 py-2 text-sm font-mono"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkEmail(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => bulkEmailMut.mutate()}
              disabled={!emailSubject.trim() || !emailBody.trim() || bulkEmailMut.isPending}
            >
              {bulkEmailMut.isPending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll in Campaign Dialog */}
      <Dialog open={showEnrollCampaign} onOpenChange={setShowEnrollCampaign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll in campaign</DialogTitle>
            <DialogDescription>
              Add {selectedCount} selected lead{selectedCount === 1 ? "" : "s"} to a campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className={`p-3 border rounded-md cursor-pointer transition-colors ${
                  selectedCampaign === c.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedCampaign(c.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedCampaign === c.id}
                    onCheckedChange={(v) => setSelectedCampaign(v ? c.id : null)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status: <Badge variant="secondary">{c.status}</Badge>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnrollCampaign(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => enrollCampaignMut.mutate()}
              disabled={!selectedCampaign || enrollCampaignMut.isPending}
            >
              {enrollCampaignMut.isPending ? "Enrolling..." : "Enroll"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Tags Dialog */}
      <Dialog open={showBulkTags} onOpenChange={setShowBulkTags}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage tags</DialogTitle>
            <DialogDescription>
              Add or remove tags from {selectedCount} selected lead{selectedCount === 1 ? "" : "s"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tags to add</label>
              <Input
                placeholder="Comma-separated tags (e.g., hot-lead, vip, follow-up)"
                value={tagsToAdd}
                onChange={(e) => setTagsToAdd(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Press Enter or separate tags with commas
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tags to remove</label>
              <Input
                placeholder="Comma-separated tags"
                value={tagsToRemove}
                onChange={(e) => setTagsToRemove(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkTags(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => bulkTagsMut.mutate()}
              disabled={
                (!tagsToAdd.trim() && !tagsToRemove.trim()) || bulkTagsMut.isPending
              }
            >
              {bulkTagsMut.isPending ? "Updating..." : "Update Tags"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} leads?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All selected leads will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete?.()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
