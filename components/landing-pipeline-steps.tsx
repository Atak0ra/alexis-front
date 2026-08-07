"use client";

/**
 * LandingPipelineRail — timeline verticale reprenant les 7 colonnes réelles
 * du Kanban produit (components/ticket-kanban.tsx COLUMNS), utilisée sur la
 * landing publique pour montrer le trajet d'un ticket plutôt que de le
 * décrire dans une grille générique.
 *
 * Desktop (lg+) : rail sticky à gauche, nœud actif suivi par scroll-spy
 * (IntersectionObserver, cf. Task 2). Mobile : rail devient un stepper
 * horizontal statique au-dessus de chaque bloc, pas de sticky.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface PipelineStage {
  key: string;
  label: string;
  body: string;
  gate: boolean;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    key: "backlog",
    label: "Backlog",
    body: "Le ticket est décrit, prêt à être pris en charge. Branché sur ton dépôt GitHub/GitLab existant — ou un dépôt hébergé si tu n'en as pas encore.",
    gate: false,
  },
  {
    key: "todo",
    label: "Todo",
    body: "Le ticket est repris et passe en file d'exécution.",
    gate: false,
  },
  {
    key: "spec",
    label: "Spec",
    body: "Alexis rédige une spécification fonctionnelle détaillée pour ce ticket.",
    gate: true,
  },
  {
    key: "plan",
    label: "Plan",
    body: "Alexis découpe le travail en étapes techniques concrètes.",
    gate: true,
  },
  {
    key: "dev",
    label: "Dev",
    body: "Alexis écrit le code, exécute les tests, itère jusqu'à ce que tout passe. Coût affiché en fin de run — ex. 0,42 € ce ticket.",
    gate: true,
  },
  {
    key: "to_merge",
    label: "To Merge",
    body: "Rebase et merge sur ta branche de base, historique linéaire, sans commit de merge parasite.",
    gate: true,
  },
  {
    key: "done",
    label: "Done",
    body: "Livré. Coût total et durée du ticket restent consultables depuis le tableau de bord.",
    gate: false,
  },
];

const GATE_LABEL = "Vous validez avant la suite";

export default function LandingPipelineRail({
  stages = PIPELINE_STAGES,
}: {
  stages?: PipelineStage[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = blockRefs.current.findIndex((el) => el === entry.target);
          if (idx !== -1) setActiveIndex(idx);
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );

    blockRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [stages]);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">
      {/* Rail — desktop only */}
      <ol className="hidden lg:sticky lg:top-24 lg:block lg:h-fit">
        {stages.map((stage, i) => (
          <li key={stage.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                data-testid={`rail-node-${stage.key}`}
                aria-hidden="true"
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full border-2",
                  i === activeIndex
                    ? "border-brand bg-brand"
                    : i < activeIndex
                    ? "border-success bg-success"
                    : "border-border bg-surface"
                )}
              />
              {i < stages.length - 1 && <span className="w-px flex-1 bg-border" />}
            </div>
            <span
              className={cn(
                "pb-8 text-sm font-medium",
                i === activeIndex ? "text-foreground" : "text-foreground-muted"
              )}
            >
              {stage.label}
            </span>
          </li>
        ))}
      </ol>

      {/* Content blocks */}
      <div className="flex flex-col gap-16">
        {stages.map((stage, i) => (
          <div
            key={stage.key}
            data-testid={`stage-block-${stage.key}`}
            ref={(el) => {
              blockRefs.current[i] = el;
            }}
          >
            {/* Stepper — mobile only */}
            <div className="mb-3 flex flex-wrap gap-x-1.5 gap-y-1 lg:hidden" aria-hidden="true">
              {stages.map((s, j) => (
                <span
                  key={s.key}
                  className={cn(
                    "text-xs font-semibold",
                    j === i ? "text-brand" : "text-foreground-subtle"
                  )}
                >
                  {s.label}
                  {j < stages.length - 1 && <span className="text-foreground-subtle"> · </span>}
                </span>
              ))}
            </div>

            <h3 className="text-lg font-bold text-foreground">{stage.label}</h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-muted">
              {stage.body}
            </p>
            {stage.gate && (
              <span className="mt-3 inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted">
                {GATE_LABEL}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
