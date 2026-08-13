"use client";

import { useEffect, useState } from "react";
import { listStacks, type StackCatalogItem } from "@/lib/api-client";
import { Info, Zap, Server, Layers, type LucideIcon } from "lucide-react";
import { ARCHITECTURE_OPTIONS, type ArchitectureId, type StackId } from "@/lib/context-advanced-options";

interface Props {
  onStackChange: (stack: StackId | null, architecture: ArchitectureId | null) => void;
}

const STACK_ICONS: Record<StackId, LucideIcon> = {
  nextjs: Zap,
  fastapi: Server,
  django: Layers,
};

const STACK_FALLBACK: StackCatalogItem[] = [
  {
    id: "nextjs", label: "Next.js", language: "TypeScript", framework: "Next.js 15",
    description: "Tu veux un site ou une app avec une interface visible : tableau de bord, page d'accueil, espace client. Next.js gère le front et le back ensemble, dans un seul projet.",
    default_architecture: "monolith", quality_gate: true,
    recommended_for: [
      "Une app web avec des pages et une interface (SaaS, tableau de bord, e-commerce)",
      "Un site vitrine ou une landing page avec un peu de logique",
      "Un outil interne où l'interface compte autant que la logique",
    ],
  },
  {
    id: "fastapi", label: "FastAPI", language: "Python", framework: "FastAPI",
    description: "Tu veux exposer une API consommée par une app mobile, un autre service, ou un frontend séparé. FastAPI est Python pur, rapide à écrire, idéal si tu fais aussi de l'IA ou de la data.",
    default_architecture: "front_back", quality_gate: true,
    recommended_for: [
      "Un back-end API consommé par une app mobile ou un frontend React/Vue",
      "Un service d'IA, de traitement de données ou d'automatisation",
      "Un microservice ou une intégration entre plusieurs outils",
    ],
  },
  {
    id: "django", label: "Django", language: "Python", framework: "Django 5",
    description: "Tu veux une app Python complète avec une base de données, un espace admin, et des formulaires. Django inclut tout d'office — tu n'assembles rien, tu construis directement.",
    default_architecture: "monolith", quality_gate: true,
    recommended_for: [
      "Une app métier avec beaucoup de modèles, de formulaires et de règles",
      "Un back-office ou un outil d'administration avec interface intégrée",
      "Un CMS, un ERP léger ou tout projet où Django Admin est un gain de temps",
    ],
  },
];
export default function StackAdvancedOptions({ onStackChange }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [stacks, setStacks] = useState<StackCatalogItem[]>([]);
  const [selectedStack, setSelectedStack] = useState<StackId | null>(null);
  const [selectedArch, setSelectedArch] = useState<ArchitectureId | null>(null);
  const [loading, setLoading] = useState(false);
  const [openTooltip, setOpenTooltip] = useState<StackId | null>(null);

  useEffect(() => {
    setLoading(true);
    listStacks().then(setStacks).catch(() => setStacks(STACK_FALLBACK)).finally(() => setLoading(false));
  }, []);

  function handleToggle(checked: boolean) {
    setEnabled(checked);
    if (!checked) { setSelectedStack(null); setSelectedArch(null); setOpenTooltip(null); onStackChange(null, null); }
  }

  function handleSelectStack(stackId: StackId) {
    const newStack = selectedStack === stackId ? null : stackId;
    const info = stacks.find((s) => s.id === stackId);
    const defaultArch = (info?.default_architecture ?? "monolith") as ArchitectureId;
    const newArch = newStack ? (selectedArch ?? defaultArch) : null;
    setSelectedStack(newStack); setSelectedArch(newArch); setOpenTooltip(null);
    onStackChange(newStack, newArch);
  }

  function handleSelectArch(arch: ArchitectureId) {
    setSelectedArch(arch); onStackChange(selectedStack, arch);
  }

  function toggleTooltip(e: React.MouseEvent, stackId: StackId) {
    e.stopPropagation();
    setOpenTooltip(openTooltip === stackId ? null : stackId);
  }

  const selectedStackInfo = stacks.find((s) => s.id === selectedStack);
  const selectedArchInfo = ARCHITECTURE_OPTIONS.find((a) => a.value === selectedArch);

  return (
    <div>
      <label className="flex items-center gap-2.5 text-sm font-medium text-foreground cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={(e) => handleToggle(e.target.checked)} className="h-4 w-4 rounded border-border accent-brand" />
        <span>Option avancée</span>
        <span className="text-xs font-normal text-foreground-subtle">— choisir ma stack (sinon Alexis décide)</span>
      </label>

      {enabled && (
        <div className="mt-4 space-y-5 rounded-xl border border-border bg-surface-raised p-5">
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
                  const tooltipOpen = openTooltip === stack.id;
                  const Icon = STACK_ICONS[stack.id as StackId];
                  return (
                    <div key={stack.id} className="relative">
                      <button type="button" onClick={() => handleSelectStack(stack.id as StackId)}
                        className={`relative w-full flex flex-col gap-2 rounded-xl border p-4 pb-8 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${isSelected ? "border-brand bg-brand-light shadow-sm" : "border-border bg-surface hover:border-brand/50 hover:bg-brand-light/30"}`}
                      >
                        {stack.quality_gate && (
                          <span className="absolute right-3 top-3 text-xs font-medium text-success">✓ gate</span>
                        )}
                        <div className="flex items-center gap-2 pr-10">
                          {Icon && <Icon className="h-5 w-5 shrink-0 text-brand" />}
                          <span className="text-sm font-semibold text-foreground">{stack.label}</span>
                        </div>
                        <p className="text-xs text-foreground-muted leading-relaxed">{stack.description}</p>
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded-md bg-surface px-2 py-0.5 text-xs text-foreground-subtle border border-border">{stack.language}</span>
                          <span className="rounded-md bg-surface px-2 py-0.5 text-xs text-foreground-subtle border border-border">{stack.framework}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute right-3 bottom-3">
                            <svg className="h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </div>
                        )}
                      </button>

                      {/* Bouton "Idéal pour…" — en bas à gauche de la carte */}
                      <button type="button"
                        aria-label={`Cas d'usage pour ${stack.label}`}
                        onClick={(e) => toggleTooltip(e, stack.id as StackId)}
                        className={`absolute left-3 bottom-3 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand ${tooltipOpen ? "bg-brand text-white" : "text-foreground-subtle hover:text-brand hover:bg-brand-light"}`}
                      >
                        <Info className="h-3 w-3" />
                        <span>Idéal pour…</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Panneau "Idéal pour…" — affiché sous toute la grille, dans le flux normal.
                Pas de position:absolute, pas de débordement, pas de déplacement de layout. */}
            {openTooltip && (() => {
              const info = stacks.find((s) => s.id === openTooltip);
              if (!info) return null;
              return (
                <div className="mt-3 rounded-xl border border-brand/30 bg-surface p-4 animate-in fade-in duration-150">
                  <p className="mb-2.5 text-xs font-semibold text-foreground">
                    Idéal pour {info.label} :
                  </p>
                  <ul className="space-y-2">
                    {info.recommended_for.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground-muted">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>

          {selectedStack && (
            <div>
              <p className="mb-3 text-sm font-semibold text-foreground">Architecture</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {ARCHITECTURE_OPTIONS.map((arch) => {
                  const isSelected = selectedArch === arch.value;
                  return (
                    <button key={arch.value} type="button" onClick={() => handleSelectArch(arch.value)}
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
