import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Trash2, BookmarkOpen, Lock, Globe } from "lucide-react";

export interface FilterConfig {
  searchText?: string;
  industries?: string[];
  titleLevels?: string[];
  companySizes?: string[];
  countries?: string[];
  verifiedOnly?: boolean;
}

export interface SavedFilterType {
  id: number;
  name: string;
  description?: string;
  config: string; // JSON string
  operator: "AND" | "OR";
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SavedFilterMenuProps {
  currentFilters: FilterConfig;
  onLoadFilter: (config: FilterConfig, operator: "AND" | "OR") => void;
  disabled?: boolean;
}

export function SavedFilterMenu({
  currentFilters,
  onLoadFilter,
  disabled = false,
}: SavedFilterMenuProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterDescription, setFilterDescription] = useState("");
  const [filterOperator, setFilterOperator] = useState<"AND" | "OR">("AND");
  const [filterPublic, setFilterPublic] = useState(false);

  const { data: savedFilters } = useQuery<SavedFilterType[]>({
    queryKey: ["/api/filters"],
    queryFn: async () => {
      const r = await fetch("/api/filters");
      return r.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: filterName,
          description: filterDescription || null,
          config: JSON.stringify(currentFilters),
          operator: filterOperator,
          isPublic: filterPublic,
        }),
      });
      if (!r.ok) throw new Error("Failed to save filter");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/filters"] });
      toast({ title: "Filter saved successfully" });
      setShowSaveDialog(false);
      setFilterName("");
      setFilterDescription("");
    },
    onError: () => toast({ title: "Failed to save filter", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/filters/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete filter");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/filters"] });
      toast({ title: "Filter deleted" });
    },
    onError: () => toast({ title: "Failed to delete filter", variant: "destructive" }),
  });

  const handleLoadFilter = (filter: SavedFilterType) => {
    const config = JSON.parse(filter.config) as FilterConfig;
    onLoadFilter(config, filter.operator);
    toast({ title: `Loaded filter: ${filter.name}` });
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      toast({ title: "Filter name is required", variant: "destructive" });
      return;
    }
    saveMutation.mutate();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" disabled={disabled}>
            <BookmarkOpen className="h-3.5 w-3.5" />
            Filters
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => setShowSaveDialog(true)} className="gap-2">
            <Save className="h-3.5 w-3.5" />
            <span>Save current filter</span>
          </DropdownMenuItem>
          {savedFilters && savedFilters.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Saved Filters
              </div>
              {savedFilters.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded"
                >
                  <button
                    onClick={() => handleLoadFilter(f)}
                    className="flex-1 text-left hover:underline"
                  >
                    <div className="font-medium">{f.name}</div>
                    {f.description && (
                      <div className="text-xs text-muted-foreground">{f.description}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {f.operator} · {f.isPublic ? <Globe className="h-2.5 w-2.5 inline mr-1" /> : <Lock className="h-2.5 w-2.5 inline mr-1" />}
                      {f.isPublic ? "Shared" : "Private"}
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(f.id);
                    }}
                    className="h-7 w-7 p-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </>
          )}
          {!savedFilters || savedFilters.length === 0 ? (
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              No saved filters yet
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
            <DialogDescription>
              Save your current filter combination for quick access
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filter-name">Filter Name</Label>
              <Input
                id="filter-name"
                placeholder="e.g., Enterprise SaaS Decision Makers"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-description">Description (optional)</Label>
              <Input
                id="filter-description"
                placeholder="What is this filter for?"
                value={filterDescription}
                onChange={(e) => setFilterDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-operator">Filter Logic</Label>
              <Select value={filterOperator} onValueChange={(v: any) => setFilterOperator(v)}>
                <SelectTrigger id="filter-operator">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">
                    All conditions must match (AND)
                  </SelectItem>
                  <SelectItem value="OR">
                    Any condition can match (OR)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                AND = narrow results, OR = broader results
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={filterPublic}
                onChange={(e) => setFilterPublic(e.target.checked)}
                className="rounded"
              />
              <span>Share with team</span>
            </label>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveFilter}
                disabled={saveMutation.isPending || !filterName.trim()}
                className="flex-1"
              >
                Save Filter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
