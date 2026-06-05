import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Filter, X, ChevronDown } from "lucide-react";

export interface FilterConfig {
  searchText?: string;
  industries: string[];
  titleLevels: string[];
  companySizes: string[];
  countries: string[];
  verifiedOnly?: boolean;
}

interface LeadFiltersPanelProps {
  filters: FilterConfig;
  onFilterChange: (filters: FilterConfig) => void;
  industries?: string[];
  titleLevels?: string[];
  companySizes?: string[];
  countries?: string[];
  operatorMode?: "AND" | "OR";
  onOperatorChange?: (op: "AND" | "OR") => void;
}

export function LeadFiltersPanel({
  filters,
  onFilterChange,
  industries = [],
  titleLevels = [],
  companySizes = [],
  countries = [],
  operatorMode = "AND",
  onOperatorChange,
}: LeadFiltersPanelProps) {
  const activeFilterCount =
    (filters.searchText ? 1 : 0) +
    filters.industries.length +
    filters.titleLevels.length +
    filters.companySizes.length +
    filters.countries.length +
    (filters.verifiedOnly ? 1 : 0);

  const handleSearchChange = (value: string) => {
    onFilterChange({ ...filters, searchText: value });
  };

  const handleIndustryToggle = (industry: string) => {
    const next = filters.industries.includes(industry)
      ? filters.industries.filter((i) => i !== industry)
      : [...filters.industries, industry];
    onFilterChange({ ...filters, industries: next });
  };

  const handleTitleLevelToggle = (level: string) => {
    const next = filters.titleLevels.includes(level)
      ? filters.titleLevels.filter((l) => l !== level)
      : [...filters.titleLevels, level];
    onFilterChange({ ...filters, titleLevels: next });
  };

  const handleCompanySizeToggle = (size: string) => {
    const next = filters.companySizes.includes(size)
      ? filters.companySizes.filter((s) => s !== size)
      : [...filters.companySizes, size];
    onFilterChange({ ...filters, companySizes: next });
  };

  const handleCountryToggle = (country: string) => {
    const next = filters.countries.includes(country)
      ? filters.countries.filter((c) => c !== country)
      : [...filters.countries, country];
    onFilterChange({ ...filters, countries: next });
  };

  const clearAllFilters = () => {
    onFilterChange({
      searchText: "",
      industries: [],
      titleLevels: [],
      companySizes: [],
      countries: [],
      verifiedOnly: false,
    });
  };

  return (
    <Card className="p-4 space-y-4">
      {/* Search box */}
      <div>
        <label className="text-sm font-medium mb-2 block">Search</label>
        <div className="relative">
          <Input
            placeholder="Name, company, email..."
            value={filters.searchText || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-3"
          />
        </div>
      </div>

      {/* Filter grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Industries */}
        <div>
          <label className="text-sm font-medium mb-2 block">Industries</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                size="sm"
              >
                <span>
                  {filters.industries.length === 0
                    ? "Select industries"
                    : `${filters.industries.length} selected`}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Industries</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {industries.map((ind) => (
                <DropdownMenuCheckboxItem
                  key={ind}
                  checked={filters.industries.includes(ind)}
                  onCheckedChange={() => handleIndustryToggle(ind)}
                >
                  {ind}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title Levels */}
        <div>
          <label className="text-sm font-medium mb-2 block">Seniority</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                size="sm"
              >
                <span>
                  {filters.titleLevels.length === 0
                    ? "Select levels"
                    : `${filters.titleLevels.length} selected`}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Seniority Level</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {titleLevels.map((level) => (
                <DropdownMenuCheckboxItem
                  key={level}
                  checked={filters.titleLevels.includes(level)}
                  onCheckedChange={() => handleTitleLevelToggle(level)}
                >
                  {level === "c-suite"
                    ? "C-Suite"
                    : level === "vp"
                      ? "VP Level"
                      : level.charAt(0).toUpperCase() + level.slice(1)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Company Sizes */}
        <div>
          <label className="text-sm font-medium mb-2 block">Company Size</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                size="sm"
              >
                <span>
                  {filters.companySizes.length === 0
                    ? "Select sizes"
                    : `${filters.companySizes.length} selected`}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Company Size</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {companySizes.map((size) => (
                <DropdownMenuCheckboxItem
                  key={size}
                  checked={filters.companySizes.includes(size)}
                  onCheckedChange={() => handleCompanySizeToggle(size)}
                >
                  {size}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Countries */}
        <div>
          <label className="text-sm font-medium mb-2 block">Countries</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                size="sm"
              >
                <span>
                  {filters.countries.length === 0
                    ? "Select countries"
                    : `${filters.countries.length} selected`}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Countries</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {countries.map((country) => (
                <DropdownMenuCheckboxItem
                  key={country}
                  checked={filters.countries.includes(country)}
                  onCheckedChange={() => handleCountryToggle(country)}
                >
                  {country}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Verified Only checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={filters.verifiedOnly || false}
          onCheckedChange={(checked) =>
            onFilterChange({ ...filters, verifiedOnly: !!checked })
          }
          id="verified-only"
        />
        <label htmlFor="verified-only" className="text-sm font-medium cursor-pointer">
          Email verified only
        </label>
      </div>

      {/* AND/OR toggle */}
      {onOperatorChange && (
        <div>
          <label className="text-sm font-medium mb-2 block">Logic</label>
          <Select value={operatorMode} onValueChange={onOperatorChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">Match ALL filters (AND)</SelectItem>
              <SelectItem value="OR">Match ANY filter (OR)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1.5">
            {operatorMode === "AND"
              ? "Results must satisfy all selected filters"
              : "Results can satisfy any selected filter"}
          </p>
        </div>
      )}

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              {activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 px-2 text-xs text-muted-foreground"
            >
              <X className="h-3 w-3 mr-1" /> Clear all
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filters.searchText && (
              <Badge variant="secondary" className="gap-1">
                {filters.searchText}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleSearchChange("")}
                />
              </Badge>
            )}
            {filters.industries.map((ind) => (
              <Badge key={ind} variant="secondary" className="gap-1">
                {ind}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleIndustryToggle(ind)}
                />
              </Badge>
            ))}
            {filters.titleLevels.map((level) => (
              <Badge key={level} variant="secondary" className="gap-1">
                {level}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleTitleLevelToggle(level)}
                />
              </Badge>
            ))}
            {filters.companySizes.map((size) => (
              <Badge key={size} variant="secondary" className="gap-1">
                {size}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleCompanySizeToggle(size)}
                />
              </Badge>
            ))}
            {filters.countries.map((country) => (
              <Badge key={country} variant="secondary" className="gap-1">
                {country}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleCountryToggle(country)}
                />
              </Badge>
            ))}
            {filters.verifiedOnly && (
              <Badge variant="secondary" className="gap-1">
                Verified only
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() =>
                    onFilterChange({ ...filters, verifiedOnly: false })
                  }
                />
              </Badge>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
