"use client";

/**
 * LandingPipelineSteps — grille horizontale numérotée (1 à 4), utilisée sur la
 * landing publique pour montrer le trajet d'un ticket à travers Alexis.
 *
 * Langage solopreneur : zéro jargon technique, résultats concrets.
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
    label: "Votre idée",
    body: "Vous décrivez ce que vous voulez faire, en quelques lignes. Alexis structure le travail en tâches précises et vous les soumet pour validation.",
    gate: true,
  },
  {
    key: "realisation",
    label: "Alexis code",
    body: "Alexis écrit le code, branche sur votre dépôt. Il vérifie que tout fonctionne, corrige lui-même si quelque chose échoue, et recommence jusqu'à ce que ce soit bon.",
    gate: false,
  },
  {
    key: "verification",
    label: "Vérification automatique",
    body: "Alexis ne vous livre jamais quelque chose de cassé. Il lance les vérifications, exécute les tests, et refuse de continuer tant que tout ne passe pas.",
    gate: false,
  },
  {
    key: "livraison",
    label: "Livraison sur votre dépôt",
    body: "Votre fonctionnalité est prête sur votre propre compte GitHub ou GitLab. Pas une sandbox, pas un export — votre code, dans votre historique, que vous contrôlez.",
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

