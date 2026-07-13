"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface OnboardingState {
  linearApiKey: string | null;
  linearTeamId: string | null;
  setLinearApiKey: (key: string) => void;
  setLinearTeamId: (id: string) => void;
}

const OnboardingContext = createContext<OnboardingState | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [linearApiKey, setLinearApiKey] = useState<string | null>(null);
  const [linearTeamId, setLinearTeamId] = useState<string | null>(null);

  return (
    <OnboardingContext.Provider value={{ linearApiKey, linearTeamId, setLinearApiKey, setLinearTeamId }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingState {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
