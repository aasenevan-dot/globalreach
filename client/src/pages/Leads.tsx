import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMode } from "@/lib/mode";
import type { Lead } from "@shared/schema";
import {
  COUNTRY_FLAG, flagForLang, langName, localTimeIn, tzAbbrev, STATUS_META,
} from "@/lib/i18n-data";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { ImportLeadsDialog } from "@/components/ImportLeadsDialog";
import { BulkActionBar } from "@/components/BulkActionBar";
import { scoreLead, scoreLabel } from "@/lib/scoring";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { TerritoryMap } from "@/components/TerritoryMap";
import { STATE_PATHS } from "@/lib/us-topo";
import { useToast } from "@/hooks/use-toast";
import { stateName, usLocationLabel } from "@/lib/geo-data";
import { Search, CheckCircle2, Clock, Download, X, MapPin, List, LayoutGrid, Map as MapIcon } from "lucide-react";

// Quote a CSV cell when it contains a comma, quote, or newline.
function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function Leads() {
  const { isInternational } = useMode();
  const { toast } = useToast();
  const { data: leads, isLoading, error } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("all");
  const [language, setLanguage] = useState("all");
  const [region, setRegion] = useState("all"); // US state code in Local mode
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"list" | "territory" | "map">("list");
  const [selectedState, setSelectedState] = useState<string | null>(null); // FIPS id of a clicked state on the map
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const ROWS_PER_PAGE = 50;
  const [visibleCount, setVisibleCount] = useState(ROWS_PER_PAGE);

  const all = leads ?? [];
  // Local mode only ever shows domestic contacts.
  const base = isInternational ? all : all.filter((l) => l.country === "United States");

  const countries = useMemo(() => [...new Set(base.map((l) => l.country))], [base]);
  const languages = useMemo(() => [...new Set(base.map((l) => l.language))], [base]);
  // Distinct US states present in the data, sorted by full name (Local mode territory filter).
  const regions = useMemo(
    () => [...new Set(base.map((l) => l.state).filter((s): s is string => !!s))]
      .sort((a, b) => stateName(a).localeCompare(stateName(b))),
    [base],
  );

  const filtered = useMemo(() => base.filter((l) => {
    const matchesQ =
      !q ||
      l.fullName.toLowerCase().includes(q.toLowerCase()) ||
      l.company.toLowerCase().includes(q.toLowerCase()) ||
      l.title.toLowerCase().includes(q.toLowerCase());
    const matchesCountry = country === "all" || l.country === country;
    const matchesLang = language === "all" || l.language === language;
    const matchesRegion = region === "all" || l.state === region;
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesQ && matchesCountry && matchesLang && matchesRegion && matchesStatus;
  }), [base, q, country, language, region, statusFilter]);

  // Open lead from search palette navigation
  useEffect(() => {
    const pendingId = sessionStorage.getItem("openLeadId");
    if (pendingId) {
      sessionStorage.removeItem("openLeadId");
      const id = Number(pendingId);
      if (id) setSelectedLead(id);
    }
  }, []);

  // Reset visible row count when filters change so the user starts from the top.
  useEffect(() => { setVisibleCount(ROWS_PER_PAGE); }, [filtered]);

  const displayedRows = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const loadMore = useCallback(() => setVisibleCount((c) => c + ROWS_PER_PAGE), []);

  // Territory grouping: bucket filtered leads by metro (Local) or country (Intl), sorted by size.
  const territories = useMemo(() => {
    const map = new Map<string, Lead[]>();
    for (const l of filtered) {
      const key = isInternational
        ? l.country
        : (l.metro ?? (l.state ? stateName(l.state) : "Unassigned"));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered, isInternational]);

  // Only keep selections that are still visible under the current filters.
  const visibleSelected = filtered.filter((l) => selectedIds.has(l.id));
  const allVisibleSelected = filtered.length > 0 && visibleSelected.length === filtered.length;
  const someVisibleSelected = visibleSelected.length > 0 && !allVisibleSelected;

  const setStatusMut = useMutation({
    mutationFn: async (status: string) =>
      apiRequest("POST", "/api/leads/bulk-status", { ids: [...selectedIds], status }),
    onSuccess: async (res: any, status) => {
      const data = await res.json().catch(() => ({ updated: selectedIds.size }));
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Status updated", description: `${data.updated} lead${data.updated === 1 ? "" : "s"} set to ${STATUS_META[status]?.label ?? status}.` });
      setSelectedIds(new Set());
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/leads/bulk-delete", { ids: [...selectedIds] }),
    onSuccess: async (res: any) => {
      const data = await res.json().catch(() => ({ deleted: selectedIds.size }));
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Leads deleted", description: `${data.deleted} lead${data.deleted === 1 ? "" : "s"} removed.` });
      setSelectedIds(new Set());
    },
  });

  const { data: campaigns } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/campaigns"],
  });

  const enrollCampaignMut = useMutation({
    mutationFn: async (campaignId: number) =>
      apiRequest("POST", `/api/campaigns/${campaignId}/bulk-enroll`, { ids: [...selectedIds] }),
    onSuccess: async (res: any) => {
      const data = await res.json().catch(() => ({ enrolled: selectedIds.size }));
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Enrolled in campaign", description: `${data.enrolled} lead${data.enrolled === 1 ? "" : "s"} enrolled.` });
      setSelectedIds(new Set());
    },
  });

  function toggleOne(id: number, on: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }
  function toggleAllVisible(on: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((l) => { if (on) next.add(l.id); else next.delete(l.id); });
      return next;
    });
  }

  // Export the currently filtered rows to a CSV download (no localStorage — uses a Blob URL).
  function exportCsv() {
    const rows = visibleSelected.length > 0 ? visibleSelected : filtered;
    const header = ["full_name", "title", "company", "email", "phone", "country", "city", "state", "metro", "industry", "company_size", "language", "timezone", "status", "verified"];
    const lines = [header.join(",")];
    rows.forEach((l) => {
      lines.push([
        l.fullName, l.title, l.company, l.email, l.phone ?? "", l.country, l.city ?? "", l.state ?? "", l.metro ?? "",
        l.industry, l.companySize, l.language, l.timezone, l.status, l.verified ? "yes" : "no",
      ].map(csvCell).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `globalreach-leads-${isInternational ? "global" : "local"}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Export ready", description: `${rows.length} lead${rows.length === 1 ? "" : "s"} downloaded as CSV.` });
  }

  if (error) return <div className="p-8 text-center text-red-500">Failed to load data. Please try again.</div>;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <SkeletonLoader count={6} variant="table-row" />
      </div>
    );
  }

  const colCount = isInternational ? 6 : 4; // checkbox + contact + company + status (+ market + time)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            {isInternational ? "Global Lead Database" : "Lead Database"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isInternational
              ? `${base.length} verified B2B contacts across ${countries.length} countries.`
              : `${base.length} verified B2B contacts in your home market.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1.5 hidden md:inline-flex">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Real-time email verification
          </Badge>
          <Button variant="outline" className="gap-1.5" onClick={exportCsv} disabled={filtered.length === 0} data-testid="button-export-csv">
            <Download className="h-4 w-4" /> Export
          </Button>
          <ImportLeadsDialog />
          <AddLeadDialog />
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="input-search-leads"
            placeholder="Search name, company, title…"
            aria-label="Search leads by name, company, or title"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {!isInternational && (
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-44" data-testid="select-region"><SelectValue placeholder="Territory" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All territories</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>{stateName(r)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isInternational && (
          <>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="w-44" data-testid="select-country"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries</SelectItem>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>{COUNTRY_FLAG[c] ?? "🌍"} {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-40" data-testid="select-language"><SelectValue placeholder="Language" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All languages</SelectItem>
                {languages.map((l) => (
                  <SelectItem key={l} value={l}>{flagForLang(l)} {langName(l)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        {/* Status filter — always visible */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36" data-testid="select-status"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>{(meta as any).label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* List vs Territory view toggle */}
        <div className="flex items-center rounded-md border border-border p-0.5" role="radiogroup" aria-label="View mode">
          <button
            type="button"
            role="radio"
            aria-checked={view === "list"}
            data-testid="button-view-list"
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover-elevate"}`}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={view === "territory"}
            data-testid="button-view-territory"
            onClick={() => setView("territory")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${view === "territory" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover-elevate"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Territory
          </button>
          {!isInternational && (
            <button
              type="button"
              role="radio"
              aria-checked={view === "map"}
              data-testid="button-view-map"
              onClick={() => setView("map")}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover-elevate"}`}
            >
              <MapIcon className="h-3.5 w-3.5" /> Map
            </button>
          )}
        </div>
      </Card>

      {/* Lead table (also the fallback if Map view is active but mode switched to International) */}
      {(view === "list" || (view === "map" && isInternational)) && (
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Leads database">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                    onCheckedChange={(v) => toggleAllVisible(!!v)}
                    aria-label="Select all"
                    data-testid="checkbox-select-all"
                  />
                </th>
                <th className="font-medium px-4 py-3">Contact</th>
                <th className="font-medium px-4 py-3">Company</th>
                {isInternational && <th className="font-medium px-4 py-3">Market</th>}
                {isInternational && <th className="font-medium px-4 py-3">Local time</th>}
                <th className="font-medium px-4 py-3">Status</th>
                <th className="font-medium px-4 py-3">Score</th>
                <th className="font-medium px-4 py-3 hidden lg:table-cell">Tags</th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.map((l) => {
                const t = isInternational ? localTimeIn(l.timezone) : null;
                const checked = selectedIds.has(l.id);
                return (
                  <tr
                    key={l.id}
                    className={`border-b border-border last:border-0 hover-elevate cursor-pointer ${checked ? "bg-primary/5" : ""}`}
                    onClick={() => setSelectedLead(l.id)}
                    data-testid={`row-lead-${l.id}`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleOne(l.id, !!v)}
                        aria-label={`Select ${l.fullName}`}
                        data-testid={`checkbox-lead-${l.id}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium flex items-center gap-2">
                        {l.fullName}
                        {l.verified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                      </div>
                      <div className="text-muted-foreground text-xs">{l.title}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{l.company}</div>
                      <div className="text-muted-foreground text-xs">{l.industry} · {l.companySize}</div>
                    </td>
                    {isInternational && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{COUNTRY_FLAG[l.country] ?? "🌍"}</span>
                          <span>{l.city}</span>
                        </div>
                        <div className="text-muted-foreground text-xs flex items-center gap-1">
                          {flagForLang(l.language)} {langName(l.language)}
                        </div>
                      </td>
                    )}
                    {isInternational && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {t!.time}
                          <span className="text-muted-foreground">{tzAbbrev(l.timezone)}</span>
                        </div>
                        <div className="text-xs mt-0.5">
                          {t!.inWindow
                            ? <span className="text-emerald-500">● Best time to reach</span>
                            : <span className="text-muted-foreground">○ Outside hours</span>}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_META[l.status]?.tone}`}>
                        {STATUS_META[l.status]?.label ?? l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const score = scoreLead(l);
                        const { label, className } = scoreLabel(score);
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-semibold ${className}`}>{label}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">{score}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {((l as any).tags || "").split(",").filter(Boolean).map((tag: string) => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">#{tag}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">No leads match your filters.</div>
        )}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
            <span>Showing {displayedRows.length} of {filtered.length} leads</span>
            {hasMore && (
              <Button variant="outline" size="sm" onClick={loadMore} data-testid="button-load-more">
                Load more
              </Button>
            )}
          </div>
        )}
      </Card>
      )}

      {/* Territory view — leads grouped by metro/region for local cluster targeting */}
      {view === "territory" && (
        <div className="space-y-4" data-testid="view-territory">
          {territories.map(([name, group]) => {
            const won = group.filter((l) => l.status === "won").length;
            const inPlay = group.filter((l) => ["contacted", "engaged", "meeting"].includes(l.status)).length;
            return (
              <Card key={name} className="overflow-hidden" data-testid={`territory-${name}`}>
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{name}</span>
                    <Badge variant="secondary" data-testid={`territory-count-${name}`}>{group.length}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{inPlay} in play</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{won} won</span>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {group.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      data-testid={`territory-lead-${l.id}`}
                      onClick={() => setSelectedLead(l.id)}
                      className="w-full text-left flex items-center justify-between gap-3 px-4 py-2.5 hover-elevate"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-sm flex items-center gap-1.5 truncate">
                          {l.company}
                          {l.verified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                        </div>
                        <div className="text-muted-foreground text-xs truncate">
                          {l.fullName} · {l.industry} · {l.companySize}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isInternational && <span className="text-xs text-muted-foreground">{l.city}</span>}
                        {!isInternational && l.city && <span className="text-xs text-muted-foreground hidden sm:inline">{usLocationLabel(l)}</span>}
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_META[l.status]?.tone}`}>
                          {STATUS_META[l.status]?.label ?? l.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}
          {territories.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground text-sm">No leads match your filters.</Card>
          )}
        </div>
      )}

      {/* Map view — interactive US territory map with metro clusters (Local mode only) */}
      {view === "map" && !isInternational && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]" data-testid="view-map">
          <Card className="p-4">
            <TerritoryMap
              leads={filtered}
              selectedState={selectedState}
              onSelectState={setSelectedState}
              onOpenLead={(id) => setSelectedLead(id)}
            />
          </Card>
          {/* Selected-state side panel */}
          {(() => {
            const sel = STATE_PATHS.find((s) => s.id === selectedState);
            const stateLeads = sel ? filtered.filter((l) => stateName(l.state) === sel.name) : [];
            return (
              <Card className="p-4 self-start" data-testid="panel-map-state">
                {!sel ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    <MapPin className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    Click a state to see its businesses, or hover a pin to preview a metro.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm" data-testid="text-panel-state-name">{sel.name}</span>
                        <Badge variant="secondary">{stateLeads.length}</Badge>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedState(null)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Clear state selection"
                        data-testid="button-clear-state"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {stateLeads.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No businesses in this state yet.</p>
                    ) : (
                      <div className="space-y-1 max-h-[460px] overflow-y-auto -mx-1">
                        {stateLeads.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => setSelectedLead(l.id)}
                            className="w-full text-left rounded-md px-3 py-2 hover-elevate"
                            data-testid={`panel-state-lead-${l.id}`}
                          >
                            <div className="font-medium text-sm flex items-center gap-1.5 truncate">
                              {l.company}
                              {l.verified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                            </div>
                            <div className="text-muted-foreground text-xs truncate">
                              {usLocationLabel(l)} · {l.industry} · {STATUS_META[l.status]?.label ?? l.status}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </Card>
            );
          })()}
        </div>
      )}

      <LeadDetailSheet leadId={selectedLead} onClose={() => setSelectedLead(null)} onOpenLead={(id) => setSelectedLead(id)} />

      <BulkActionBar
        selectedCount={visibleSelected.length}
        onStatusChange={(status) => setStatusMut.mutate(status)}
        onDelete={() => deleteMut.mutate()}
        onEnrollCampaign={() => {
          const first = campaigns?.[0];
          if (first) enrollCampaignMut.mutate(first.id);
        }}
        isPending={setStatusMut.isPending || deleteMut.isPending || enrollCampaignMut.isPending}
      />
    </div>
  );
}
