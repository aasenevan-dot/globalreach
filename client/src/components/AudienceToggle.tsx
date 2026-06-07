import { useAudience } from "@/lib/audience";
import { Building2, Home } from "lucide-react";

// Segmented toggle: Business (B2B) vs Consumer (B2C / homeowner jobs).
// Mirrors the ModeToggle styling so the top bar reads consistently.
export function AudienceToggle() {
  const { audience, setAudience } = useAudience();

  return (
    <div
      className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5"
      role="radiogroup"
      aria-label="Audience type"
      data-testid="toggle-audience"
    >
      <button
        onClick={() => setAudience("business")}
        role="radio"
        aria-checked={audience === "business"}
        data-testid="button-audience-business"
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          audience === "business"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover-elevate"
        }`}
      >
        <Building2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Business</span>
      </button>
      <button
        onClick={() => setAudience("consumer")}
        role="radio"
        aria-checked={audience === "consumer"}
        data-testid="button-audience-consumer"
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          audience === "consumer"
            ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-600"
            : "text-muted-foreground hover-elevate"
        }`}
      >
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Consumer</span>
      </button>
    </div>
  );
}
