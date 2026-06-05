import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { Switch, Route, Router, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ModeProvider } from "@/lib/mode";
import { AudienceProvider } from "@/lib/audience";
import { ThemeProvider } from "@/lib/theme";
import { AppShell } from "@/components/AppShell";
import { SearchPalette } from "@/components/SearchPalette";
import { QuickStartModal } from "@/components/QuickStartModal";
import { AuthGate } from "@/components/AuthGate";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-load all page components for code splitting.
// This breaks the single 824KB chunk into per-route chunks loaded on demand.
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Leads = lazy(() => import("@/pages/Leads"));
const Pipeline = lazy(() => import("@/pages/Pipeline"));
const Jobs = lazy(() => import("@/pages/Jobs"));
const Campaigns = lazy(() => import("@/pages/Campaigns"));
const Inbox = lazy(() => import("@/pages/Inbox"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Settings = lazy(() => import("@/pages/Settings"));
const FindLeads = lazy(() => import("@/pages/FindLeads"));
const Forms = lazy(() => import("@/pages/Forms"));
const Funnels = lazy(() => import("@/pages/Funnels"));
const Automations = lazy(() => import("@/pages/Automations"));
const CalendarPage = lazy(() => import("@/pages/Calendar"));
const Landing = lazy(() => import("@/pages/Landing"));
const BookMeeting = lazy(() => import("@/pages/BookMeeting"));
const Webhooks = lazy(() => import("@/pages/Webhooks"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Standalone pages that don't use the CRM shell
const STANDALONE_ROUTES = ["/landing", "/book"];

function AppRouter() {
  const [location] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lightweight loading skeleton shown while a lazy chunk loads.
  const pageFallback = (
    <div className="space-y-6 p-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    </div>
  );

  // Standalone pages render without the AppShell
  if (STANDALONE_ROUTES.includes(location)) {
    return (
      <Suspense fallback={pageFallback}>
        <Switch>
          <Route path="/landing" component={Landing} />
          <Route path="/book" component={BookMeeting} />
        </Switch>
      </Suspense>
    );
  }

  // All other pages render inside the CRM shell
  return (
    <AppShell onOpenSearch={openSearch}>
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <QuickStartModal />
      <Suspense fallback={pageFallback}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/find" component={FindLeads} />
          <Route path="/leads" component={Leads} />
          <Route path="/pipeline" component={Pipeline} />
          <Route path="/jobs" component={Jobs} />
          <Route path="/campaigns" component={Campaigns} />
          <Route path="/inbox" component={Inbox} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/forms" component={Forms} />
          <Route path="/funnels" component={Funnels} />
          <Route path="/automations" component={Automations} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/settings" component={Settings} />
          <Route path="/webhooks" component={Webhooks} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <ModeProvider>
            <AudienceProvider>
              <Toaster />
              <Router hook={useHashLocation}>
                <AuthGate>
                  <AppRouter />
                </AuthGate>
              </Router>
            </AudienceProvider>
          </ModeProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
