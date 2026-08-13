"use client";

import { useEffect, useState } from "react";
import { listStacks, type StackCatalogItem } from "@/lib/api-client";
import { Zap, Server, Layers, type LucideIcon } from "lucide-react";
import { ARCHITECTURE_OPTIONS, type ArchitectureId, type StackId } from "@/lib/context-advanced-options";

interface Props {
  /** Appelé chaque fois que la sélection change — stack + architecture. */
  onStackChange: (stack: StackId | null, architecture: ArchitectureId | null) => void;
}

const STACK_ICONS: Record<StackId, LucideIcon> = {
  nextjs: Zap,
  fastapi: Server,
  django: Layers,
};

const STACK_FALLBACK: StackCatalogItem[] = [
  { id: "nextjs", label: "Next.js", language: "TypeScript", framework: "Next.js 15",
    description: "Application web fullstack TypeScript avec rendu hybride.",
    default_architecture: "monolith", recommended_for: ["SaaS", "dashboard", "application web"], quality_gate: true },
  { id: "fastapi", label: "FastAPI", language: "Python", framework: "FastAPI",
    description: "API REST Python haute performance, idéale pour un back-end découplé.",
    default_architecture: "front_back", recommended_for: ["API REST", "microservice", "IA/ML"], quality_gate: true },
  { id: "django", label: "Django", language: "Python", framework: "Django 5",
    description: "Framework Python batteries-included : ORM, admin, auth.",
    default_architecture: "monolith", recommended_for: ["CRUD", "back-office", "CMS"], quality_gate: true },
];

export default function StackAdvancedOptions({ onStackChange }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [stacks, setStacks] = useState<StackCatalogItem[]>([]);
  const [selectedStack, setSelectedStack] = useState<StackId | null>(null);
  const [selectedArch, setSelectedArch] = useState<ArchitectureId | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    listStacks()
      .then(setStacks)
      .catch(() => setStacks(STACK_FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  function handleToggle(checked: boolean) {
    setEnabled(checked);
    if (!checked) {
      setSelectedStack(null);
      setSelectedArch(null);
      onStackChange(null, null);
    }
  }

  function handleSelectStack(stackId: StackId) {
    const newStack = selectedStack === stackId ? null : stackId;
    const info = stacks.find((s) => s.id === stackId);
    const defaultArch = (info?.default_architecture ?? "monolith") as ArchitectureId;
    const newArch = newStack ? (selectedArch ?? defaultArch) : null;
    setSelectedStack(newStack);
    setSelectedArch(newArch);
    onStackChange(newStack, newArch);
  }

  function handleSelectArch(arch: ArchitectureId) {
    setSelectedArch(arch);
    onStackChange(selectedStack, arch);
  }

  const selectedStackInfo = stacks.find((s) => s.id === selectedStack);
  const selectedArchInfo = ARCHITECTURE_OPTIONS.find((a) => a.value === selectedArch);


  return (
    <div>
      {/* Toggle "Option avancée" */}
      <label className="flex items-center gap-2.5 text-sm font-medium text-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleToggle(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-brand"
        />
        <span>Option avancée</span>
        <span className="text-xs font-normal text-foreground-subtle">
          — choisir ma stack (sinon Alexis décide)
        </span>
      </label>

      {enabled && (
        <div className="mt-4 space-y-5 rounded-xl border border-border bg-surface-raised p-5">
          {/* Sélection de la stack */}
          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">Stack technique</p>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-foreground-muted">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-brand inline-block" />
                Chargement des stacks…
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {stacks.map((stack) => {
                  const isSelected = selectedStack === stack.id;
                  return (
                    <button key={stack.id} type="button"
                      onClick={() => handleSelectStack(stack.id as StackId)}
                      className={`relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${isSelected ? "border-brand bg-brand-light shadow-sm" : "border-border bg-surface hover:border-brand/50 hover:bg-brand-light/30"}`}
                    >
                      {stack.quality_gate && (
                        <span className="absolute right-3 top-3 text-xs font-medium text-success">✓ gate</span>
                      )}
                      <div className="flex items-center gap-2">
                        {(() => { const Icon = STACK_ICONS[stack.id as StackId]; return Icon ? <Icon className="h-5 w-5 shrink-0 text-brand" /> : null; })()}
                        <span className="text-sm font-semibold text-foreground">{stack.label}</span>
                      </div>
                      <p className="text-xs text-foreground-muted leading-relaxed">{stack.description}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="rounded-md bg-surface px-2 py-0.5 text-xs text-foreground-subtle border border-border">{stack.language}</span>
                        <span className="rounded-md bg-surface px-2 py-0.5 text-xs text-foreground-subtle border border-border">{stack.framework}</span>
                      </div>
                      <p className="text-xs text-foreground-subtle">Idéal pour : {stack.recommended_for.slice(0, 3).join(", ")}</p>
                      {isSelected && (
                        <div className="absolute right-3 bottom-3">
                          <svg className="h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sélection de l'architecture */}
          {selectedStack && (
            <div>
              <p className="mb-3 text-sm font-semibold text-foreground">Architecture</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {ARCHITECTURE_OPTIONS.map((arch) => {
                  const isSelected = selectedArch === arch.value;
                  return (
                    <button key={arch.value} type="button"
                      onClick={() => handleSelectArch(arch.value)}
                      className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${isSelected ? "border-brand bg-brand-light" : "border-border bg-surface hover:border-brand/50"}`}
                    >
                      <span className="text-sm font-medium text-foreground">{arch.label}</span>
                      <span className="text-xs text-foreground-muted leading-snug">{arch.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Résumé */}
          {selectedStack && selectedStackInfo && (
            <div className="rounded-lg border border-brand/20 bg-brand-light/40 px-4 py-2.5 text-xs text-foreground-muted">
              <span className="font-medium text-foreground">Sélection : </span>
              {selectedStackInfo.label}
              {selectedArchInfo && <> · {selectedArchInfo.label}</>}
              <span className="ml-2 text-success">✓ gate qualité activé</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


