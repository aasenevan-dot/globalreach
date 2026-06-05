import { useState, useCallback, useEffect } from "react";
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
import { AuthGate } from "@/components/AuthGate";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import Pipeline from "@/pages/Pipeline";
import Jobs from "@/pages/Jobs";
import Campaigns from "@/pages/Campaigns";
import Inbox from "@/pages/Inbox";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import FindLeads from "@/pages/FindLeads";
import Forms from "@/pages/Forms";
import Funnels from "@/pages/Funnels";
import Automations from "@/pages/Automations";
import CalendarPage from "@/pages/Calendar";
import Landing from "@/pages/Landing";
import BookMeeting from "@/pages/BookMeeting";
import NotFound from "@/pages/not-found";

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

  // Standalone pages render without the AppShell
  if (STANDALONE_ROUTES.includes(location)) {
    return (
      <Switch>
        <Route path="/landing" component={Landing} />
        <Route path="/book" component={BookMeeting} />
      </Switch>
    );
  }

  // All other pages render inside the CRM shell
  return (
    <AppShell onOpenSearch={openSearch}>
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
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
        <Route component={NotFound} />
      </Switch>
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
