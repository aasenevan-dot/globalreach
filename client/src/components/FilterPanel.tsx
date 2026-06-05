import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Users, Globe, Filter, X,
} from "lucide-react";

export interface FilterState {
  industries: string[];
  titleLevels: string[];
  companySizes: string[];
  countries: string[];
  logic: "and" | "or";
}

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  industries: string[];
  titleLevels: string[];
  companySizes: string[];
  countries: string[];
}

const TITLE_LEVEL_LABELS: Record<string, string> = {
  "c-suite": "C-Suite",
  "vp": "VP Level",
  "director": "Director",
  "manager": "Manager",
  "individual": "Individual Contributor",
};

export function FilterPanel({
  filters,
  onFiltersChange,
  industries,
  titleLevels,
  companySizes,
  countries,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);

  const toggleFilter = (type: keyof Omit<FilterState, "logic">, value: string) => {
    const items = filters[type];
    const updated = items.includes(value)
      ? items.filter((v) => v !== value)
      : [...items, value];
    onFiltersChange({ ...filters, [type]: updated });
  };

  const clearAll = () => {
    onFiltersChange({
      industries: [],
      titleLevels: [],
      companySizes: [],
      countries: [],
      logic: "and",
    });
  };

  const hasFilters =
    filters.industries.length > 0 ||
    filters.titleLevels.length > 0 ||
    filters.companySizes.length > 0 ||
    filters.countries.length > 0;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant={hasFilters ? "default" : "outline"} size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {hasFilters && <Badge variant="secondary" className="ml-1">{Object.values(filters).flat().length}</Badge>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            {/* Industry */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4" />
                Industry
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {industries.map((industry) => (
                  <label key={industry} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.industries.includes(industry)}
                      onCheckedChange={() => toggleFilter("industries", industry)}
                    />
                    <span className="text-sm">{industry}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Title Level */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Users className="h-4 w-4" />
                Seniority
              </label>
              <div className="space-y-2">
                {titleLevels.map((level) => (
                  <label key={level} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.titleLevels.includes(level)}
                      onCheckedChange={() => toggleFilter("titleLevels", level)}
                    />
                    <span className="text-sm">{TITLE_LEVEL_LABELS[level] || level}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Company Size */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4" />
                Company Size
              </label>
              <div className="space-y-2">
                {companySizes.map((size) => (
                  <label key={size} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.companySizes.includes(size)}
                      onCheckedChange={() => toggleFilter("companySizes", size)}
                    />
                    <span className="text-sm">{size} employees</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4" />
                Country
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {countries.map((country) => (
                  <label key={country} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.countries.includes(country)}
                      onCheckedChange={() => toggleFilter("countries", country)}
                    />
                    <span className="text-sm">{country}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Logic toggle */}
            <div className="pt-2 border-t">
              <label className="text-sm font-medium block mb-2">Match:</label>
              <div className="flex gap-2">
                <Button
                  variant={filters.logic === "and" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => onFiltersChange({ ...filters, logic: "and" })}
                >
                  All (AND)
                </Button>
                <Button
                  variant={filters.logic === "or" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => onFiltersChange({ ...filters, logic: "or" })}
                >
                  Any (OR)
                </Button>
              </div>
            </div>

            {/* Actions */}
            {hasFilters && (
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={clearAll}
                >
                  <X className="h-4 w-4 mr-1" /> Clear all filters
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
