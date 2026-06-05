import { useMode } from "@/lib/mode";
import { Globe, Home } from "lucide-react";

// Coinbase-style segmented toggle: Local vs International (Advanced).
export function ModeToggle() {
  const { mode, setMode } = useMode();

  return (
    <div
      className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5"
      data-testid="toggle-mode"
    >
      <button
        onClick={() => setMode("local")}
        data-testid="button-mode-local"
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          mode === "local"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover-elevate"
        }`}
      >
        <Home className="h-3.5 w-3.5" />
        Local
      </button>
      <button
        onClick={() => setMode("international")}
        data-testid="button-mode-international"
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          mode === "international"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover-elevate"
        }`}
      >
        <Globe className="h-3.5 w-3.5" />
        International
      </button>
    </div>
  );
}
