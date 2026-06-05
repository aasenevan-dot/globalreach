import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { SavedFilterMenu, type FilterConfig } from "@/components/SavedFilterMenu";
import { MultiSelectFilter, SelectedBadges } from "@/components/AdvancedFilterPanel";
import {
  Search, Download, UserPlus, CheckCircle2, XCircle, ChevronLeft,
  ChevronRight, Filter, Zap, ShieldCheck, Globe, Building2, Users,
} from "lucide-react";

interface FinderLead {
  id: string;
  fullName: string;
  title: string;
  company: string;
  location: string;
  country: string;
  industry: string;
  companySize: string;
  email: string;
  verified: boolean;
}

interface FinderMeta {
  industries: string[];
  titleLevels: string[];
  companySizes: string[];
  countries: string[];
}

interface FinderResponse {
  results: FinderLead[];
  total: number;
  page: number;
  pages: number;
}

const TITLE_LEVEL_LABELS: Record<string, string> = {
  "c-suite": "C-Suite",
  "vp": "VP Level",
  "director": "Director",
  "manager": "Manager",
  "individual": "Individual Contributor",
};

function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

const COLORS = [
  "bg-teal-600","bg-blue-600","bg-emerald-600","bg-rose-600","bg-amber-600",
  "bg-cyan-600","bg-indigo-600","bg-pink-600","bg-teal-600","bg-orange-600",
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

function formatTotal(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default function FindLeads() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [titleLevels, setTitleLevels] = useState<string[]>([]);
  const [companySizes, setCompanySizes] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [filterOperator, setFilterOperator] = useState<"AND" | "OR">("AND");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Legacy single-select state (kept for backward compatibility if needed)
  const [industry, setIndustry] = useState("all");
  const [titleLevel, setTitleLevel] = useState("all");
  const [companySize, setCompanySize] = useState("all");
  const [country, setCountry] = useState("all");

  const { data: meta } = useQuery<FinderMeta>({ queryKey: ["/api/finder/meta"] });

  const params = new URLSearchParams({
    ...(debouncedQ && { q: debouncedQ }),
    // Support multi-select filters via comma-separated values
    ...(industries.length > 0 && { industries: industries.join(",") }),
    ...(titleLevels.length > 0 && { titleLevels: titleLevels.join(",") }),
    ...(companySizes.length > 0 && { companySizes: companySizes.join(",") }),
    ...(countries.length > 0 && { countries: countries.join(",") }),
    ...(filterOperator !== "AND" && { operator: filterOperator }),
    ...(verifiedOnly && { verifiedOnly: "true" }),
    page: String(page),
    limit: "25",
  });

  const { data, isLoading } = useQuery<FinderResponse>({
    queryKey: ["/api/finder", params.toString()],
    queryFn: async () => {
      const r = await fetch(`/api/finder?${params}`);
      return r.json();
    },
  });

  const debounce = useCallback((val: string) => {
    setQ(val);
    clearTimeout((window as any).__finderDebounce);
    (window as any).__finderDebounce = setTimeout(() => {
      setDebouncedQ(val);
      setPage(1);
      setSelected(new Set());
    }, 400);
  }, []);

  const addToLeadsMutation = useMutation({
    mutationFn: async (leads: FinderLead[]) => {
      const payload = leads.map(l => ({
        fullName: l.fullName,
        title: l.title,
        company: l.company,
        email: l.email,
        country: l.country,
        city: l.location.split(",")[0]?.trim() || "",
        state: l.location.split(",")[1]?.trim() || undefined,
        timezone: l.country === "United States" ? "America/New_York" : "UTC",
        language: "en",
        industry: l.industry,
        companySize: l.companySize,
        verified: l.verified,
        status: "new",
      }));
      const r = await fetch("/api/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: payload }),
      });
      return r.json();
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["/api/leads"] });
      setSelected(new Set());
      toast({ title: `${result.created} lead${result.created !== 1 ? "s" : ""} added to your pipeline` });
    },
    onError: () => toast({ title: "Failed to add leads", variant: "destructive" }),
  });

  const handleAddSelected = () => {
    if (!data) return;
    const leads = data.results.filter(l => selected.has(l.id));
    addToLeadsMutation.mutate(leads);
  };

  const handleAddAll = () => {
    if (!data) return;
    addToLeadsMutation.mutate(data.results);
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = data.results.filter(l => selected.size === 0 || selected.has(l.id));
    const header = "Name,Title,Company,Location,Industry,Company Size,Email,Verified";
    const csv = [header, ...rows.map(l =>
      [l.fullName, l.title, l.company, l.location, l.industry, l.companySize, l.email, l.verified ? "Yes" : "No"].join(",")
    )].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "leads-export.csv"; a.click();
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!data) return;
    if (selected.size === data.results.length) setSelected(new Set());
    else setSelected(new Set(data.results.map(l => l.id)));
  };

  const resetFilters = () => {
    setQ("");
    setDebouncedQ("");
    setIndustries([]);
    setTitleLevels([]);
    setCompanySizes([]);
    setCountries([]);
    setVerifiedOnly(false);
    setFilterOperator("AND");
    setPage(1);
    setSelected(new Set());
  };

  const getCurrentFilterConfig = (): FilterConfig => ({
    searchText: debouncedQ,
    industries: industries.length > 0 ? industries : undefined,
    titleLevels: titleLevels.length > 0 ? titleLevels : undefined,
    companySizes: companySizes.length > 0 ? companySizes : undefined,
    countries: countries.length > 0 ? countries : undefined,
    verifiedOnly: verifiedOnly || undefined,
  });

  const handleLoadSavedFilter = (config: FilterConfig, operator: "AND" | "OR") => {
    setQ(config.searchText || "");
    setDebouncedQ(config.searchText || "");
    setIndustries(config.industries || []);
    setTitleLevels(config.titleLevels || []);
    setCompanySizes(config.companySizes || []);
    setCountries(config.countries || []);
    setVerifiedOnly(config.verifiedOnly || false);
    setFilterOperator(operator);
    setPage(1);
    setSelected(new Set());
  };

  const handleRemoveFilter = (key: string, value: string) => {
    switch (key) {
      case "industries":
        setIndustries((p) => p.filter((v) => v !== value));
        break;
      case "titleLevels":
        setTitleLevels((p) => p.filter((v) => v !== value));
        break;
      case "companySizes":
        setCompanySizes((p) => p.filter((v) => v !== value));
        break;
      case "countries":
        setCountries((p) => p.filter((v) => v !== value));
        break;
    }
    setPage(1);
  };

  const hasFilters =
    debouncedQ ||
    industries.length > 0 ||
    titleLevels.length > 0 ||
    companySizes.length > 0 ||
    countries.length > 0 ||
    verifiedOnly;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-display font-bold tracking-tight">Lead Finder</h1>
            <Badge variant="secondary" className="text-xs gap-1">
              <Zap className="h-3 w-3 text-amber-500" /> AI-Powered
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Search {formatTotal(4_892_341)} verified B2B contacts across 200+ countries
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button onClick={handleAddSelected} disabled={addToLeadsMutation.isPending} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add {selected.size} to Pipeline
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, title, company, keyword..."
            value={q}
            onChange={e => debounce(e.target.value)}
            className="pl-9 text-base h-11"
          />
        </div>

        {/* Advanced Multi-Select Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {meta && (
            <>
              <MultiSelectFilter
                label="Industries"
                icon={<Building2 className="h-3.5 w-3.5" />}
                options={meta.industries}
                selected={industries}
                onSelect={(selected) => {
                  setIndustries(selected);
                  setPage(1);
                }}
              />
              <MultiSelectFilter
                label="Seniority"
                icon={<Users className="h-3.5 w-3.5" />}
                options={Object.keys(TITLE_LEVEL_LABELS).map(
                  (k) => TITLE_LEVEL_LABELS[k] || k
                )}
                selected={titleLevels.map((t) => TITLE_LEVEL_LABELS[t] || t)}
                onSelect={(selected) => {
                  const keys = selected.map(
                    (s) =>
                      Object.keys(TITLE_LEVEL_LABELS).find(
                        (k) => TITLE_LEVEL_LABELS[k] === s
                      ) || s
                  );
                  setTitleLevels(keys as string[]);
                  setPage(1);
                }}
              />
              <MultiSelectFilter
                label="Company Size"
                icon={<Building2 className="h-3.5 w-3.5" />}
                options={meta.companySizes.map((s) => `${s} employees`)}
                selected={companySizes}
                onSelect={(selected) => {
                  setCompanySizes(selected);
                  setPage(1);
                }}
              />
              <MultiSelectFilter
                label="Countries"
                icon={<Globe className="h-3.5 w-3.5" />}
                options={meta.countries}
                selected={countries}
                onSelect={(selected) => {
                  setCountries(selected);
                  setPage(1);
                }}
              />
            </>
          )}

          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox
              checked={verifiedOnly}
              onCheckedChange={(v) => {
                setVerifiedOnly(!!v);
                setPage(1);
              }}
            />
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Verified only
          </label>

          <SavedFilterMenu
            currentFilters={getCurrentFilterConfig()}
            onLoadFilter={handleLoadSavedFilter}
            disabled={!hasFilters}
          />

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 gap-1 text-muted-foreground"
            >
              <XCircle className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>

        {/* Selected Filter Badges */}
        {(industries.length > 0 ||
          titleLevels.length > 0 ||
          companySizes.length > 0 ||
          countries.length > 0) && (
          <SelectedBadges
            selections={{
              industries,
              titleLevels: titleLevels.map((t) => TITLE_LEVEL_LABELS[t] || t),
              companySizes,
              countries,
            }}
            onRemove={(key, value) => {
              if (key === "titleLevels") {
                const titleKey = Object.keys(TITLE_LEVEL_LABELS).find(
                  (k) => TITLE_LEVEL_LABELS[k] === value
                );
                if (titleKey) handleRemoveFilter("titleLevels", titleKey);
              } else {
                handleRemoveFilter(key, value);
              }
            }}
            onClearAll={resetFilters}
          />
        )}

        {/* Filter Logic Indicator */}
        {(industries.length > 1 ||
          titleLevels.length > 1 ||
          companySizes.length > 1 ||
          countries.length > 1) && (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-muted rounded text-xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              Using <span className="font-medium text-foreground">{filterOperator}</span> logic
              (all selected options within each filter category match)
            </span>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Results header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={!!data && selected.size === data.results.length && data.results.length > 0}
              onCheckedChange={toggleAll}
            />
            {isLoading ? (
              <span className="text-sm text-muted-foreground">Searching…</span>
            ) : data ? (
              <span className="text-sm font-medium">
                <span className="text-primary font-bold">{formatTotal(data.total)}</span>
                <span className="text-muted-foreground"> contacts found</span>
                {selected.size > 0 && <span className="text-muted-foreground"> · {selected.size} selected</span>}
              </span>
            ) : null}
          </div>
          {data && data.results.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleAddAll} className="h-8 text-xs gap-1">
              <UserPlus className="h-3 w-3" /> Add page to pipeline
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                <th className="w-8 pl-4 py-2 text-left"></th>
                <th className="py-2 pr-4 text-left">Name / Title</th>
                <th className="py-2 pr-4 text-left">Company</th>
                <th className="py-2 pr-4 text-left">Location</th>
                <th className="py-2 pr-4 text-left">Industry</th>
                <th className="py-2 pr-4 text-left">Email</th>
                <th className="py-2 pr-4 text-left">Size</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="pl-4 py-3"><div className="h-4 w-4 bg-muted rounded animate-pulse" /></td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
                        <div className="space-y-1.5">
                          <div className="h-3 w-28 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    </td>
                    {[1,2,3,4,5].map(j => (
                      <td key={j} className="py-3 pr-4"><div className="h-3 w-24 bg-muted rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.results.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <Filter className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p>No contacts match your filters.</p>
                    <button onClick={resetFilters} className="mt-2 text-primary text-sm hover:underline">Clear filters</button>
                  </td>
                </tr>
              ) : (
                data?.results.map(lead => (
                  <tr
                    key={lead.id}
                    className={`border-b border-border/50 transition-colors cursor-pointer ${selected.has(lead.id) ? "bg-primary/5" : "hover:bg-muted/40"}`}
                    onClick={() => toggleSelect(lead.id)}
                  >
                    <td className="pl-4 py-3" onClick={e => { e.stopPropagation(); toggleSelect(lead.id); }}>
                      <Checkbox checked={selected.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full ${avatarColor(lead.fullName)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                          {initials(lead.fullName)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{lead.fullName}</span>
                            {lead.verified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                          </div>
                          <div className="text-muted-foreground text-xs">{lead.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-medium">{lead.company}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{lead.location}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary" className="text-xs">{lead.industry}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs font-mono">
                      {lead.email.replace(/^(.{2}).*@/, "$1***@")}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{lead.companySize}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Page {data.page} of {data.pages.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {[...Array(Math.min(5, data.pages))].map((_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p > data.pages) return null;
                return (
                  <Button key={p} variant={p === page ? "default" : "ghost"} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(p)}>
                    {p}
                  </Button>
                );
              })}
              {data.pages > 5 && page + 2 < data.pages && (
                <span className="text-muted-foreground text-xs px-1">…</span>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
