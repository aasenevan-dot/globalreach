import { createContext, useContext, useState } from "react";

// Audience is a purely client-side toggle (NOT server-persisted): it switches
// the whole app between selling to Businesses (B2B leads/pipeline) and direct-to-
// Consumer work (B2C homeowner Jobs). Kept separate from "mode" (Local vs
// International), which lives in server settings.
export type Audience = "business" | "consumer";

interface AudienceContextValue {
  audience: Audience;
  setAudience: (a: Audience) => void;
  isConsumer: boolean;
}

const AudienceContext = createContext<AudienceContextValue | null>(null);

export function AudienceProvider({ children }: { children: React.ReactNode }) {
  const [audience, setAudience] = useState<Audience>("business");
  return (
    <AudienceContext.Provider
      value={{ audience, setAudience, isConsumer: audience === "consumer" }}
    >
      {children}
    </AudienceContext.Provider>
  );
}

export function useAudience() {
  const ctx = useContext(AudienceContext);
  if (!ctx) throw new Error("useAudience must be used within AudienceProvider");
  return ctx;
}
