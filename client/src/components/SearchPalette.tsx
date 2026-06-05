import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Lead } from "@shared/schema";
import {
  Search, Users, Send, LayoutDashboard, KanbanSquare, Inbox, BarChart3,
  Calendar, FileText, Layers, GitBranch, Settings, ArrowRight, CheckCircle2, Webhook,
} from "lucide-react";
import { scoreLead, scoreLabel } from "@/lib/scoring";

interface SearchResult {
  type: "lead" | "page";
  id?: number;
  label: string;
  subtitle?: string;
  href?: string;
  icon?: any;
  score?: number;
  scoreInfo?: { label: string; className: string };
}

const PAGES: SearchResult[] = [
  { type: "page", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { type: "page", label: "Lead Finder", subtitle: "Search 4.89M contacts", href: "/find", icon: Search },
  { type: "page", label: "Lead Database", href: "/leads", icon: Users },
  { type: "page", label: "Pipeline", subtitle: "Kanban board", href: "/pipeline", icon: KanbanSquare },
  { type: "page", label: "Campaigns", subtitle: "Outreach sequences", href: "/campaigns", icon: Send },
  { type: "page", label: "Unified Inbox", href: "/inbox", icon: Inbox },
  { type: "page", label: "Analytics", subtitle: "Reports & ROI", href: "/analytics", icon: BarChart3 },
  { type: "page", label: "Calendar", subtitle: "Meetings & booking", href: "/calendar", icon: Calendar },
  { type: "page", label: "Forms", subtitle: "Lead capture builder", href: "/forms", icon: FileText },
  { type: "page", label: "Funnels", subtitle: "Landing pages", href: "/funnels", icon: Layers },
  { type: "page", label: "Automations", subtitle: "Workflow builder", href: "/automations", icon: GitBranch },
  { type: "page", label: "Webhooks", subtitle: "Developer integrations", href: "/webhooks", icon: Webhook },
  { type: "page", label: "Settings", subtitle: "SMTP, AI, preferences", href: "/settings", icon: Settings },
];

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  const { data: leads = [] } = useQuery<Lead[]>({ queryKey: ["/api/leads"], enabled: open });

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const q = query.toLowerCase().trim();

  const results: SearchResult[] = [];

  // Filter pages
  const matchedPages = q
    ? PAGES.filter(p => p.label.toLowerCase().includes(q) || (p.subtitle || "").toLowerCase().includes(q))
    : PAGES;
  results.push(...matchedPages);

  // Filter leads
  if (q.length >= 2) {
    const matchedLeads = leads
      .filter(l =>
        l.fullName.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q)
      )
      .slice(0, 8)
      .map(l => {
        const score = scoreLead(l);
        const info = scoreLabel(score);
        return {
          type: "lead" as const,
          id: l.id,
          label: l.fullName,
          subtitle: `${l.company} · ${l.title}`,
          score,
          scoreInfo: info,
        };
      });
    results.push(...matchedLeads);
  }

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const handleSelect = useCallback((r: SearchResult) => {
    if (r.type === "page" && r.href) {
      navigate(r.href);
    } else if (r.type === "lead" && r.id) {
      navigate(`/leads`);
    }
    onClose();
  }, [navigate, onClose]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && results[selectedIdx]) { e.preventDefault(); handleSelect(results[selectedIdx]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  }, [results, selectedIdx, handleSelect, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto mt-[15vh] w-full max-w-lg px-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search leads, pages, or commands..."
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <kbd className="text-xs text-muted-foreground/50 border border-border rounded px-1.5 py-0.5 font-mono">ESC</kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-2">
            {results.length === 0 && q.length > 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                No results for "{query}"
              </div>
            )}

            {/* Page results */}
            {results.filter(r => r.type === "page").length > 0 && (
              <>
                {q && <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pages</div>}
                {results.map((r, i) => {
                  if (r.type !== "page") return null;
                  const Icon = r.icon || ArrowRight;
                  const isSelected = i === selectedIdx;
                  return (
                    <button
                      key={`page-${r.href}`}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"}`}
                      onClick={() => handleSelect(r)}
                      onMouseEnter={() => setSelectedIdx(i)}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{r.label}</div>
                        {r.subtitle && <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    </button>
                  );
                })}
              </>
            )}

            {/* Lead results */}
            {results.filter(r => r.type === "lead").length > 0 && (
              <>
                <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">Leads</div>
                {results.map((r, i) => {
                  if (r.type !== "lead") return null;
                  const isSelected = i === selectedIdx;
                  return (
                    <button
                      key={`lead-${r.id}`}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"}`}
                      onClick={() => handleSelect(r)}
                      onMouseEnter={() => setSelectedIdx(i)}
                    >
                      <div className="h-7 w-7 rounded-full bg-teal-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {r.label.split(" ").map(p => p[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          {r.label}
                          {r.scoreInfo && (
                            <span className={`text-xs font-semibold ${r.scoreInfo.className}`}>{r.scoreInfo.label}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                      </div>
                      {r.score !== undefined && (
                        <span className="text-xs text-muted-foreground/50 tabular-nums">{r.score}</span>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground/50">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1 py-0.5 font-mono text-[10px]">↑↓</kbd> Navigate</span>
              <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1 py-0.5 font-mono text-[10px]">↵</kbd> Open</span>
            </div>
            <span>{results.length} result{results.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
