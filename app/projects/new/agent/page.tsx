"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject, getProjectContext, AlexisApiError } from "@/lib/api-client";
import { getApiKey } from "@/lib/session";
import { useNewProject } from "@/lib/new-project-context";
import { DEFAULT_STATES, DEFAULT_TRIGGER_STATES, DEFAULT_MODELS } from "@/lib/project-defaults";
import ProjectContextStep from "@/components/project-context-step";
import FieldHint from "@/components/field-hint";

export default function AgentPage() {
  const router = useRouter();
  const {
    name, hosted, repoUrl, forgeProvider, forgeToken, githubUsername, issuePrefix,
    agentChoice, setAgentChoice,
    agentApiKey, setAgentApiKey,
    agentBaseUrl, setAgentBaseUrl,
  } = useNewProject();

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [contextProjectId, setContextProjectId] = useState<string | null>(null);

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
        models: DEFAULT_MODELS,
      });

      const { exists } = await getProjectContext(apiKey, project.id);
      if (exists) {
        router.push("/dashboard");
      } else {
        setContextProjectId(project.id);
      }
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  }

  if (contextProjectId) {
    return <ProjectContextStep projectId={contextProjectId} />;
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
        </div>

        {/* API key */}
        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="agent-api-key">Clé API agent</Label>
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
            required
            placeholder={agentChoice === "claude" ? "sk-ant-…" : "sk-… (OpenAI / OpenRouter / Groq)"}
          />
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
                description="Laissez vide pour OpenAI. Pour OpenRouter : https://openrouter.ai/api/v1 — Pour Groq : https://api.groq.com/openai/v1. Aider utilisera cette URL à la place de l'endpoint OpenAI par défaut."
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
