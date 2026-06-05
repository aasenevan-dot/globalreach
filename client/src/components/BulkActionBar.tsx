import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  MoreVertical, Trash2, Tag, MessageSquare, Send, CheckCircle2,
} from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  onStatusChange?: (status: string) => void;
  onDelete?: () => void;
  onTag?: () => void;
  onEnrollCampaign?: () => void;
  onSendMessage?: () => void;
  isPending?: boolean;
}

export function BulkActionBar({
  selectedCount,
  onStatusChange,
  onDelete,
  onTag,
  onEnrollCampaign,
  onSendMessage,
  isPending = false,
}: BulkActionBarProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 flex items-center justify-between shadow-lg">
        <Badge variant="secondary" className="text-sm">
          {selectedCount} selected
        </Badge>

        <div className="flex items-center gap-2">
          {onStatusChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isPending}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Change Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {["new", "contacted", "engaged", "meeting", "won", "lost"].map(
                  (status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => onStatusChange(status)}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={isPending}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onEnrollCampaign && (
                <DropdownMenuItem onClick={onEnrollCampaign}>
                  <Send className="h-4 w-4 mr-2" />
                  Enroll in Campaign
                </DropdownMenuItem>
              )}
              {onSendMessage && (
                <DropdownMenuItem onClick={onSendMessage}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </DropdownMenuItem>
              )}
              {onTag && (
                <DropdownMenuItem onClick={onTag}>
                  <Tag className="h-4 w-4 mr-2" />
                  Add Tags
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} leads?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All selected leads and their
              associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.();
                setConfirmDelete(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
