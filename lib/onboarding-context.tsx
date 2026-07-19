"use client";

import { createContext, useContext, type ReactNode } from "react";

// Contexte minimal pour l'onboarding (plus de champs Linear)
interface OnboardingState {
  // Extensible si besoin de partager de l'état entre les étapes
}

const OnboardingContext = createContext<OnboardingState | null>({});

export function OnboardingProvider({ children }: { children: ReactNode }) {
  return (
    <OnboardingContext.Provider value={{}}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingState {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
