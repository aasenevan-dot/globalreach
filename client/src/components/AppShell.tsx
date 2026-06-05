import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useMode } from "@/lib/mode";
import { useAudience } from "@/lib/audience";
import { useTheme } from "@/lib/theme";
import { Logo } from "./Logo";
import { ModeToggle } from "./ModeToggle";
import { AudienceToggle } from "./AudienceToggle";
import { Button } from "@/components/ui/button";
import type { Message, Automation } from "@shared/schema";
import {
  LayoutDashboard, Users, Send, Inbox, Globe, Sparkles, BarChart3, Settings as SettingsIcon,
  Sun, Moon, KanbanSquare, Home, HardHat, Search, FileText, Layers, GitBranch, Calendar,
  Menu, X, Command,
} from "lucide-react";

// Business (B2B) navigation — the full sales OS.
const BUSINESS_NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/find", label: "Lead Finder", icon: Search },
  { href: "/leads", label: "Lead Database", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/campaigns", label: "Campaigns", icon: Send },
  { href: "/inbox", label: "Unified Inbox", icon: Inbox },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/forms", label: "Forms", icon: FileText },
  { href: "/funnels", label: "Funnels", icon: Layers },
  { href: "/automations", label: "Automations", icon: GitBranch },
];

// Consumer (B2C) navigation — direct-to-homeowner jobs, simple and focused.
const CONSUMER_NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: HardHat },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

// Keyboard shortcut listener for Cmd/Ctrl+K
export function useCommandKey(callback: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); callback(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [callback]);
}

export function AppShell({ children, onOpenSearch }: { children: React.ReactNode; onOpenSearch?: () => void }) {
  const [location] = useLocation();
  const { isInternational } = useMode();
  const { isConsumer } = useAudience();
  const { theme, toggleTheme } = useTheme();
  const NAV = isConsumer ? CONSUMER_NAV : BUSINESS_NAV;
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on navigation
  useEffect(() => { setMobileOpen(false); }, [location]);

  // Live badge counts
  const { data: messages } = useQuery<Message[]>({ queryKey: ["/api/messages"] });
  const { data: automations } = useQuery<Automation[]>({ queryKey: ["/api/automations"] });
  const inboxCount = (messages ?? []).filter(m => m.direction === "inbound" && m.status === "replied").length;
  const activeAutomations = (automations ?? []).filter((a: any) => a.active).length;
  const badgeCounts: Record<string, number> = {
    "/inbox": inboxCount,
    "/automations": activeAutomations,
  };

  function SidebarContent() {
    return (
      <>
        <div className="flex items-center justify-between gap-2 px-5 h-16 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2">
            <Logo className="h-7 w-7 text-primary" />
            <span className="font-display font-bold text-lg tracking-tight">GlobalReach</span>
          </div>
          <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = location === item.href;
            const Icon = item.icon;
            const badge = badgeCounts[item.href];
            return (
              <Link key={item.href} href={item.href}>
                <a
                  data-testid={`link-nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/80 hover-elevate"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {badge != null && badge > 0 && (
                    <span className="min-w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center px-1.5">
                      {badge}
                    </span>
                  )}
                </a>
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-2">
          <Link href="/settings">
            <a className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${location === "/settings" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/80 hover-elevate"}`}>
              <SettingsIcon className="h-4 w-4" /> Settings
            </a>
          </Link>
        </div>
        <div className="px-3 pb-4">
          {isConsumer ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold mb-1"><Home className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Consumer view</div>
              <p className="text-muted-foreground leading-relaxed">Track direct-to-homeowner jobs from first inspection to completed work.</p>
            </div>
          ) : (
            <div className={`rounded-lg border p-3 text-xs ${isInternational ? "border-primary/30 bg-primary/5" : "border-border bg-muted/40"}`}>
              <div className="flex items-center gap-1.5 font-semibold mb-1">
                {isInternational ? <><Globe className="h-3.5 w-3.5 text-primary" /> International mode</> : <><Sparkles className="h-3.5 w-3.5" /> Local mode</>}
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {isInternational ? "Multi-language, time-zone-aware outreach across every channel." : "Streamlined domestic selling. Switch to International to go global."}
              </p>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col bg-sidebar border-r border-sidebar-border shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between gap-4 h-16 px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button className="md:hidden p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:block text-sm text-muted-foreground">
              {isConsumer ? "Direct-to-homeowner jobs" : isInternational ? "Selling worldwide" : "Selling in your home market"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 hover:bg-muted border border-border rounded-lg px-3 py-1.5 transition-colors w-48"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">Search...</span>
                <kbd className="flex items-center gap-0.5 opacity-60 font-mono"><Command className="h-3 w-3" />K</kbd>
              </button>
            )}
            <AudienceToggle />
            {!isConsumer && <ModeToggle />}
            <Button variant="ghost" size="icon" data-testid="button-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" className="h-8 w-8">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center text-xs font-bold text-white shrink-0" title="User profile">
              GR
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
