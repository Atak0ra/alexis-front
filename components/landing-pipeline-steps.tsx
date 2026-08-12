"use client";

/**
 * LandingPipelineSteps — grille horizontale numérotée (1 à 4), utilisée sur la
 * landing publique pour montrer le trajet d'un ticket à travers Alexis.
 *
 * Volontairement distinct des colonnes internes du Kanban (Backlog/Todo/Spec/
 * Plan/Dev/To Merge/Done, cf. components/ticket-kanban.tsx) : ces labels sont
 * des repères opérationnels pour qui gère déjà des tickets dans l'app, pas de
 * la copie pour un visiteur non-technique découvrant le produit. Les 4 phases
 * ci-dessous regroupent les mêmes étapes réelles sous un vocabulaire public.
 */

import { cn } from "@/lib/utils";

export interface PipelineStage {
  key: string;
  label: string;
  body: string;
  gate: boolean;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    key: "idea",
    label: "Ton idée",
    body: "Vous décrivez ce qu'il faut faire, branché sur votre dépôt GitHub/GitLab existant ou un dépôt hébergé si vous n'en avez pas encore.",
    gate: false,
  },
  {
    key: "cadrage",
    label: "Cadrage",
    body: "Alexis prépare le travail : une spécification fonctionnelle, puis un plan technique détaillé.",
    gate: true,
  },
  {
    key: "realisation",
    label: "Réalisation",
    body: "Alexis écrit le code, exécute les tests, itère jusqu'à ce que tout passe. Coût affiché en fin de run (ex. 0,42 $ ce ticket).",
    gate: true,
  },
  {
    key: "livraison",
    label: "Livraison",
    body: "Mise en ligne propre, historique clair. Coût total et durée restent consultables depuis le tableau de bord.",
    gate: true,
  },
];

const GATE_LABEL = "Vous validez avant la suite";

export default function LandingPipelineSteps({
  stages = PIPELINE_STAGES,
}: {
  stages?: PipelineStage[];
}) {
  return (
    <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
      {stages.map((stage, i) => (
        <div key={stage.key} className="relative flex flex-col">
          {i < stages.length - 1 && (
            <div
              aria-hidden="true"
              className="absolute left-[calc(50%+1.25rem)] top-4 hidden h-px w-full bg-border lg:block"
            />
          )}
          <div
            aria-hidden="true"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
              "border-brand bg-brand-light text-xs font-bold text-brand"
            )}
          >
            {i + 1}
          </div>
          <h3 className="mt-4 text-base font-bold text-foreground">{stage.label}</h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{stage.body}</p>
          {stage.gate && (
            <span className="mt-3 inline-flex w-fit items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted">
              {GATE_LABEL}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
