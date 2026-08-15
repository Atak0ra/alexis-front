"use client";

import { cn } from "@/lib/utils";

interface Step {
  label: string;
  description: string;
}

// Projet existant avec code
const STEPS_EXISTING_MANAGED: Step[] = [
  { label: "Origine", description: "Dépôt existant ou hébergé" },
  { label: "Dépôt", description: "Forge & token d'accès" },
  { label: "Décris ton projet", description: "Brief métier" },
  { label: "Contexte", description: "Description du projet" },
];

const STEPS_EXISTING_BYOK: Step[] = [
  { label: "Origine", description: "Dépôt existant ou hébergé" },
  { label: "Dépôt", description: "Forge & token d'accès" },
  { label: "Agent", description: "Modèle IA" },
  { label: "Décris ton projet", description: "Brief métier" },
  { label: "Contexte", description: "Description du projet" },
];

// Projet hébergé neuf (scaffold + backlog)
const STEPS_NEW_MANAGED: Step[] = [
  { label: "Origine", description: "Dépôt existant ou hébergé" },
  { label: "Dépôt", description: "Forge & token d'accès" },
  { label: "Décris ton projet", description: "Brief métier" },
  { label: "Initialisation", description: "Scaffolding & qualité" },
  { label: "Contexte", description: "Documentation auto" },
  { label: "Backlog", description: "Tickets de départ" },
];

const STEPS_NEW_BYOK: Step[] = [
  { label: "Origine", description: "Dépôt existant ou hébergé" },
  { label: "Dépôt", description: "Forge & token d'accès" },
  { label: "Agent", description: "Modèle IA" },
  { label: "Décris ton projet", description: "Brief métier" },
  { label: "Initialisation", description: "Scaffolding & qualité" },
  { label: "Contexte", description: "Documentation auto" },
  { label: "Backlog", description: "Tickets de départ" },
];

interface NewProjectStepperProps {
  current: number;
  isByok?: boolean;
  isNewHosted?: boolean;
  orientation?: "vertical" | "horizontal";
}

export default function NewProjectStepper({
  current,
  isByok = false,
  isNewHosted = false,
  orientation = "horizontal",
}: NewProjectStepperProps) {
  const STEPS = isNewHosted
    ? isByok ? STEPS_NEW_BYOK : STEPS_NEW_MANAGED
    : isByok ? STEPS_EXISTING_BYOK : STEPS_EXISTING_MANAGED;

  if (orientation === "vertical") {
    return (
      <nav aria-label="Étapes de création du projet">
        <ol className="flex flex-col gap-0">
          {STEPS.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < current;
            const isActive = stepNum === current;
            return (
              <li key={step.label} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                      isCompleted ? "bg-brand text-white"
                        : isActive ? "border-2 border-brand bg-brand-light text-brand"
                        : "border-2 border-border bg-surface text-foreground-subtle"
                    )}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {isCompleted ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : stepNum}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={cn("mt-1 w-0.5 flex-1 min-h-[2rem] transition-colors", isCompleted ? "bg-brand" : "bg-border")} />
                  )}
                </div>
                <div className={cn("pb-8", idx === STEPS.length - 1 && "pb-0")}>
                  <p className={cn("text-sm font-semibold leading-8", isActive ? "text-brand" : isCompleted ? "text-foreground" : "text-foreground-subtle")}>
                    {step.label}
                  </p>
                  <p className="text-xs text-foreground-subtle leading-none -mt-1">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label="Étapes de création du projet">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < current;
          const isActive = stepNum === current;
          return (
            <li key={step.label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    isCompleted ? "bg-brand text-white"
                      : isActive ? "border-2 border-brand bg-brand-light text-brand"
                      : "border-2 border-border bg-surface text-foreground-subtle"
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : stepNum}
                </div>
                <span className={cn("mt-1 text-xs font-medium", isActive ? "text-brand" : isCompleted ? "text-foreground-muted" : "text-foreground-subtle")}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn("mx-1 mb-4 h-0.5 w-5 shrink-0 transition-colors sm:w-8", isCompleted ? "bg-brand" : "bg-border")} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

