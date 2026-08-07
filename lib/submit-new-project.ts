/**
 * Helper partagé pour la création d'un projet depuis le wizard d'onboarding.
 *
 * Centralise :
 * - la construction du payload (champs BYOK envoyés uniquement si isByok)
 * - les modèles par défaut (vide en non-BYOK → le back applique ses propres
 *   défauts, cohérent avec le forçage Groq/aider côté serveur)
 * - la redirection post-création :
 *     • repo avec code (exists=true)  → /projects/new/context (étape 4/4)
 *     • repo vide    (exists=false)   → /projects/new/context?new=true (étape 4/5)
 *       puis context → /projects/new/backlog (étape 5/5)
 *
 * Utilisé par repo/page.tsx (plan géré) et agent/page.tsx (plan BYOK).
 */
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { createProject, getProjectContext, friendlyError } from "@/lib/api-client";
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
 * Crée le projet puis redirige vers l'étape Contexte.
 *
 * Règle de routage :
 * - exists=false (repo vide) → context?new=true → backlog (wizard 5 étapes)
 * - exists=true  (repo avec code) → context (wizard 4 étapes, pas de backlog)
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
    });

    const { exists } = await getProjectContext(apiKey, project.id);
    if (exists) {
      // Repo avec code existant → étape Contexte seule (4 étapes au total).
      // Le backlog n'est pas proposé : le code est déjà là.
      router.push(`/projects/new/context?projectId=${project.id}`);
    } else {
      // Repo vide → étape Contexte (description obligatoire + cahier des charges
      // optionnel), puis étape Backlog (5 étapes au total).
      router.push(`/projects/new/context?projectId=${project.id}&new=true`);
    }
  } catch (err) {
    onError?.(friendlyError(err));
  } finally {
    onFinally?.();
  }
}
