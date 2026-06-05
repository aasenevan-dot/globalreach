import { createContext, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import type { Settings } from "@shared/schema";

export type AppMode = "local" | "international";

interface ModeContextValue {
  mode: AppMode;
  settings: Settings | undefined;
  isLoading: boolean;
  setMode: (mode: AppMode) => void;
  isInternational: boolean;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const { data: settings, isLoading } = useQuery<Settings>({ queryKey: ["/api/settings"] });

  const mutation = useMutation({
    mutationFn: async (mode: AppMode) => {
      return apiRequest("PATCH", "/api/settings", { mode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const mode: AppMode = (settings?.mode as AppMode) ?? "local";

  return (
    <ModeContext.Provider
      value={{
        mode,
        settings,
        isLoading,
        setMode: (m) => mutation.mutate(m),
        isInternational: mode === "international",
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}
