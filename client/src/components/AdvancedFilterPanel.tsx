import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Scroll, ChevronDown, Check } from "lucide-react";

interface MultiSelectFilterProps {
  label: string;
  icon: React.ReactNode;
  options: string[];
  selected: string[];
  onSelect: (selected: string[]) => void;
  searchable?: boolean;
}

export function MultiSelectFilter({
  label,
  icon,
  options,
  selected,
  onSelect,
  searchable = true,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (opt: string) => {
    const newSelected = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt];
    onSelect(newSelected);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 justify-between gap-1.5"
        >
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {icon}
            <span className="text-sm">{label}</span>
          </div>
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="border-b p-3 space-y-2">
          <div className="text-sm font-medium">{label}</div>
          {searchable && (
            <Input
              placeholder={`Search ${label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
          )}
        </div>
        <div className="max-h-64 overflow-y-auto p-2 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-xs text-muted-foreground p-2 text-center">
              No options found
            </div>
          ) : (
            filtered.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2.5 p-1.5 rounded hover:bg-accent cursor-pointer select-none"
              >
                <Checkbox
                  checked={selected.includes(opt)}
                  onCheckedChange={() => toggleOption(opt)}
                />
                <span className="flex-1 text-sm">{opt}</span>
                {selected.includes(opt) && (
                  <Check className="h-3.5 w-3.5 text-primary" />
                )}
              </label>
            ))
          )}
        </div>
        {selected.length > 0 && (
          <>
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs"
                onClick={() => {
                  onSelect([]);
                  setSearch("");
                }}
              >
                Clear selection
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface SelectedBadgesProps {
  selections: Record<string, string[]>;
  onRemove: (key: string, value: string) => void;
  onClearAll: () => void;
}

export function SelectedBadges({
  selections,
  onRemove,
  onClearAll,
}: SelectedBadgesProps) {
  const items = Object.entries(selections)
    .filter(([, values]) => values.length > 0)
    .flatMap(([key, values]) => values.map((value) => ({ key, value })));

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {items.map(({ key, value }) => (
        <Badge
          key={`${key}-${value}`}
          variant="secondary"
          className="gap-1.5 text-xs px-2 py-1"
        >
          {value}
          <button
            onClick={() => onRemove(key, value)}
            className="ml-1 hover:bg-muted rounded"
            aria-label={`Remove ${value}`}
          >
            ×
          </button>
        </Badge>
      ))}
      {items.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 px-2 text-xs text-muted-foreground"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
