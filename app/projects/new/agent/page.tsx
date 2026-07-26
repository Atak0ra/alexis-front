"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject, getMe, getProjectContext, AlexisApiError } from "@/lib/api-client";
import { getApiKey } from "@/lib/session";
import { useNewProject } from "@/lib/new-project-context";
import { DEFAULT_STATES, DEFAULT_TRIGGER_STATES, getDefaultModels } from "@/lib/project-defaults";
import FieldHint from "@/components/field-hint";

export default function AgentPage() {
  const router = useRouter();
  const {
    name, hosted, repoUrl, forgeProvider, forgeToken, githubUsername, issuePrefix,
    agentChoice, setAgentChoice,
    agentApiKey, setAgentApiKey,
    agentBaseUrl, setAgentBaseUrl,
    codeReviewEnabled, setCodeReviewEnabled,
  } = useNewProject();

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [forcedAgentChoice, setForcedAgentChoice] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;
    getMe(apiKey)
      .then((me) => setForcedAgentChoice(me.forced_agent_choice))
      .catch(() => setForcedAgentChoice(null));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Session absente");

      const project = await createProject(apiKey, {
        name,
        repo_url: hosted ? null : repoUrl,
        agent_choice: agentChoice,
        agent_api_key: agentApiKey || null,
        agent_base_url: agentBaseUrl.trim() || null,
        forge_provider: hosted ? "github" : forgeProvider,
        forge_token: hosted ? null : forgeToken,
        hosted,
        github_username: hosted ? githubUsername : null,
        issue_prefix: issuePrefix.trim() || null,
        states: DEFAULT_STATES,
        trigger_states: DEFAULT_TRIGGER_STATES,
        models: getDefaultModels(agentChoice),
        code_review_enabled: codeReviewEnabled,
      });

      const { exists } = await getProjectContext(apiKey, project.id);
      if (exists) {
        router.push("/dashboard");
      } else {
        router.push(`/projects/new/context?projectId=${project.id}`);
      }
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">Agent IA</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Choisissez l&apos;agent qui traitera vos tickets et fournissez sa clé API.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {/* Agent choice */}
        <div>
          <Label htmlFor="agent-choice">Agent CLI</Label>
          <select
            id="agent-choice"
            value={agentChoice}
            onChange={(e) => setAgentChoice(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <option value="claude">claude</option>
            <option value="aider">aider</option>
          </select>
          {forcedAgentChoice && (
            <p className="mt-1 text-xs text-foreground-subtle">
              Sans clé API ci-dessous, ce projet utilisera <span className="font-mono">{forcedAgentChoice}</span> avec la
              clé fournie par Alexis. Renseignez votre propre clé pour choisir librement l&apos;agent et le fournisseur.
            </p>
          )}
        </div>

        {/* API key */}
        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="agent-api-key">
              Clé API agent{" "}
              <span className="text-foreground-subtle font-normal">(optionnel)</span>
            </Label>
            {agentChoice === "claude" ? (
              <FieldHint
                title="Clé API Anthropic (Claude)"
                description="Votre clé API Anthropic commençant par sk-ant-. Alexis l'injecte dans le conteneur Docker qui exécute Claude pour traiter vos tickets."
                href="https://console.anthropic.com/settings/keys"
                hrefLabel="Créer une clé Anthropic →"
              />
            ) : (
              <FieldHint
                title="Clé API pour Aider"
                description="Aider utilise le fournisseur de votre choix. OpenAI (sk-…), OpenRouter (clé gratuite disponible), ou Groq (free tier). Si vous utilisez OpenRouter ou Groq, renseignez aussi la Base URL ci-dessous."
                href="https://openrouter.ai/keys"
                hrefLabel="Clé gratuite OpenRouter →"
              />
            )}
          </div>
          <Input
            id="agent-api-key"
            type="password"
            value={agentApiKey}
            onChange={(e) => setAgentApiKey(e.target.value)}
            placeholder={agentChoice === "claude" ? "sk-ant-… (laisser vide si non fourni)" : "sk-… (OpenAI / OpenRouter / Groq)"}
          />
          <p className="mt-1 text-xs text-foreground-subtle">
            {forcedAgentChoice
              ? `Laissez vide pour utiliser la clé gérée par Alexis (${forcedAgentChoice}, sans frais). En saisir une active votre propre agent et fournisseur, sans restriction.`
              : agentChoice === "claude"
                ? "Sans clé, Alexis utilise sa propre clé Anthropic pour traiter vos tickets. La facturation de l'usage agent est alors gérée par Alexis, séparément de votre abonnement."
                : "Aider n'a pas de clé de secours côté Alexis : sans clé, le traitement des tickets échouera."}
          </p>
        </div>

        {/* Base URL — visible uniquement pour Aider */}
        {agentChoice === "aider" && (
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="agent-base-url">
                Base URL de l&apos;API{" "}
                <span className="text-foreground-subtle font-normal">(optionnel)</span>
              </Label>
              <FieldHint
                title="Base URL de l'API"
                description="Laissez vide pour OpenAI. Pour OpenRouter : https://openrouter.ai/api/v1. Pour Groq : https://api.groq.com/openai/v1. Aider utilisera cette URL à la place de l'endpoint OpenAI par défaut."
              />
            </div>
            <Input
              id="agent-base-url"
              type="url"
              value={agentBaseUrl}
              onChange={(e) => setAgentBaseUrl(e.target.value)}
              placeholder="https://openrouter.ai/api/v1"
            />
          </div>
        )}

        {/* Revue de code */}
        <div>
          <div className="flex items-center gap-2">
            <input
              id="code-review-enabled"
              type="checkbox"
              checked={codeReviewEnabled}
              onChange={(e) => setCodeReviewEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
            <Label htmlFor="code-review-enabled">Revue de code</Label>
            <FieldHint
              title="Revue de code"
              description="Coché : Alexis ouvre une Pull Request que vous validez avant qu'elle parte sur develop. Décoché : le code part directement sur develop, plus rapide mais sans étape de relecture."
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/projects/new/repo")}
          >
            ← Précédent
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Création…" : "Créer le projet →"}
          </Button>
        </div>
      </form>
    </>
  );
}
