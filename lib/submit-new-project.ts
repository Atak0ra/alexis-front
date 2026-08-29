/**
 * Helper partagé pour la création d'un projet depuis le wizard d'onboarding.
 *
 * Centralise :
 * - la construction du payload (champs BYOK envoyés uniquement si isByok)
 * - les modèles par défaut (vide en non-BYOK → le back applique ses propres
 *   défauts, cohérent avec le forçage Groq/aider côté serveur)
 * - la redirection post-création :
 *     • repo avec code (exists=true)  → /projects/new/context (étape 5/5)
 *     • repo vide    (exists=false)   → /projects/new/context?new=true (étape 5/6)
 *       puis context → /projects/new/backlog (étape 6/6)
 *     • hasOwnCode=true (ZIP)         → /projects/new/context?new=true directement
 *       (skip_scaffold : /scaffold attendrait indéfiniment un job jamais enqueué)
 *
 * Utilisé par description/page.tsx (déclenché après la saisie du brief).
 */
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { createProject, getProjectContext, importProjectZip, friendlyError } from "@/lib/api-client";
import { DEFAULT_STATES, DEFAULT_TRIGGER_STATES, getDefaultModels } from "@/lib/project-defaults";

export interface NewProjectDraftForSubmit {
  name: string;
  hosted: boolean;
  repoUrl: string;
  forgeProvider: string;
  forgeToken: string;
  githubUsername: string;
  issuePrefix: string;
  agentChoice: string;
  agentApiKey: string;
  agentBaseUrl: string;
  codeReviewEnabled: boolean;
  isByok: boolean;
  /** Option avancée — null = l'agent décide automatiquement (cas 3). */
  stack: "nextjs" | "fastapi" | "django" | null;
  architecture: "monolith" | "front_back" | "front_back_bff" | null;
  /** Brief métier saisi à l'étape «Décris ton projet». Optionnel. */
  brief: string;
  /** Le client a déjà du code à importer en ZIP (décidé à l'étape repo). */
  hasOwnCode: boolean;
  /** Archive fournie à l'étape description quand hasOwnCode=true. */
  zipFile: File | null;
}

export interface SubmitNewProjectOptions {
  apiKey: string;
  draft: NewProjectDraftForSubmit;
  router: AppRouterInstance;
  /** Appelé avant l'envoi (ex: setSubmitting(true)) */
  onStart?: () => void;
  /** Appelé en cas d'erreur avec le message */
  onError?: (msg: string) => void;
  /** Appelé dans le bloc finally (ex: setSubmitting(false)) */
  onFinally?: () => void;
}

/**
 * Crée le projet puis redirige vers l'étape scaffold (hébergé) ou contexte (existant).
 *
 * Règle de routage :
 * - hosted=true, hasOwnCode=true  → import ZIP (arrière-plan) → context?new=true → backlog
 * - hosted=true, hasOwnCode=false → scaffold → context?new=true → backlog (wizard 6 étapes)
 * - exists=false (repo vide)      → context?new=true → backlog
 * - exists=true  (repo avec code) → context (wizard 5 étapes, pas de backlog)
 *
 * Règle BYOK :
 * - isByok=true  → envoie agent_choice, agent_api_key, agent_base_url, models
 * - isByok=false → envoie models:{} pour que le back applique ses propres
 *                  défauts (et son forçage éventuel d'agent/Groq).
 */
export async function submitNewProject({
  apiKey,
  draft,
  router,
  onStart,
  onError,
  onFinally,
}: SubmitNewProjectOptions): Promise<void> {
  onStart?.();
  try {
    const project = await createProject(apiKey, {
      name: draft.name,
      repo_url: draft.hosted ? null : draft.repoUrl,
      agent_choice: draft.agentChoice,
      // Champs BYOK : envoyés uniquement si le plan l'autorise.
      // Pour les plans gérés, le backend force le provider par défaut de la
      // plateforme — envoyer une clé ou des modèles serait rejeté (403).
      agent_api_key: draft.isByok ? (draft.agentApiKey || null) : null,
      agent_base_url: draft.isByok ? (draft.agentBaseUrl.trim() || null) : null,
      forge_provider: draft.hosted ? "github" : draft.forgeProvider,
      forge_token: draft.hosted ? null : draft.forgeToken,
      hosted: draft.hosted,
      github_username: draft.hosted ? (draft.githubUsername || null) : null,
      issue_prefix: draft.issuePrefix.trim() || null,
      states: DEFAULT_STATES,
      trigger_states: DEFAULT_TRIGGER_STATES,
      // En non-BYOK : {} → le back applique _default_models(agent_choice) et
      // son éventuel forçage Groq. En BYOK : modèles cohérents avec l'agent.
      models: draft.isByok ? getDefaultModels(draft.agentChoice) : {},
      code_review_enabled: draft.codeReviewEnabled,
      // Option avancée : transmis seulement pour les projets hébergés.
      // null = l'agent choisira automatiquement la stack la plus adaptée (cas 3).
      stack: draft.hosted ? (draft.stack ?? null) : undefined,
      architecture: draft.hosted ? (draft.architecture ?? null) : undefined,
      // Brief métier : toujours envoyé (vide = falsy → le back ignore).
      brief: draft.brief.trim() || null,
      // Scaffold et choix de stack inutiles si le client importe son propre code —
      // seraient de toute façon écrasés par l'import. Ignoré si hosted=false.
      skip_scaffold: draft.hosted ? draft.hasOwnCode : undefined,
    });

    if (draft.hosted && draft.hasOwnCode) {
      // Code déjà existant → import ZIP à la place du scaffolding. L'import
      // tourne en arrière-plan (best-effort) ; on ne passe pas par /scaffold
      // qui attendrait indéfiniment un scaffold_project_job jamais enqueué.
      if (draft.zipFile) {
        try {
          await importProjectZip(apiKey, project.id, draft.zipFile);
        } catch (err) {
          onError?.(friendlyError(err));
          return;
        }
      }
      router.push(`/projects/new/context?projectId=${project.id}&new=true`);
      return;
    }

    if (draft.hosted) {
      // Projet hébergé neuf → toujours passer par l'étape scaffolding.
      // scaffold_project_job (ou decide_stack_job) tourne en background ;
      // /scaffold affiche la progression et redirige vers contexte quand c'est done.
      router.push(`/projects/new/scaffold?projectId=${project.id}&new=true`);
      return;
    }

    // Projet existant avec code → contexte seul, pas de backlog ni scaffolding.
    const { exists } = await getProjectContext(apiKey, project.id);
    if (exists) {
      router.push(`/projects/new/context?projectId=${project.id}`);
    } else {
      router.push(`/projects/new/context?projectId=${project.id}&new=true`);
    }
  } catch (err) {
    onError?.(friendlyError(err));
  } finally {
    onFinally?.();
  }
}
