"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createProject, getProjectContext, AlexisApiError } from "@/lib/api-client";
import { getApiKey } from "@/lib/session";
import { useOnboarding } from "@/lib/onboarding-context";
import { DEFAULT_STATES, DEFAULT_TRIGGER_STATES, DEFAULT_MODELS } from "@/lib/project-defaults";
import ProjectContextStep from "@/components/project-context-step";

export default function ProjectPage() {
  const router = useRouter();
  const { linearApiKey, linearTeamId } = useOnboarding();
  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [agentChoice, setAgentChoice] = useState("claude");
  const [agentApiKey, setAgentApiKey] = useState("");
  const [forgeProvider, setForgeProvider] = useState("github");
  const [forgeToken, setForgeToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // After successful creation, if context doesn't exist we show the context step
  const [contextProjectId, setContextProjectId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!linearApiKey || !linearTeamId) {
      router.push("/onboarding/team");
      return;
    }

    setSubmitting(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Session absente");

      const project = await createProject(apiKey, {
        name,
        repo_url: repoUrl,
        agent_choice: agentChoice,
        agent_api_key: agentApiKey || null,
        agent_base_url: null,
        linear_api_key: linearApiKey,
        linear_team_id: linearTeamId,
        forge_provider: forgeProvider,
        forge_token: forgeToken,
        states: DEFAULT_STATES,
        trigger_states: DEFAULT_TRIGGER_STATES,
        models: DEFAULT_MODELS,
      });

      // Check whether .alexis/project.md already exists
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

  // Show context step if project was created and context doesn't exist
  if (contextProjectId) {
    return <ProjectContextStep projectId={contextProjectId} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nouveau projet</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du projet</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="repo-url">URL du repo</Label>
              <Input id="repo-url" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} required />
            </div>
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
            <div>
              <Label htmlFor="agent-api-key">Clé API agent</Label>
              <Input
                id="agent-api-key"
                type="password"
                value={agentApiKey}
                onChange={(e) => setAgentApiKey(e.target.value)}
                required
                placeholder="sk-ant-… ou clé aider"
              />
            </div>
            <div>
              <Label htmlFor="forge-provider">Forge</Label>
              <select
                id="forge-provider"
                value={forgeProvider}
                onChange={(e) => setForgeProvider(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="github">github</option>
                <option value="gitlab">gitlab</option>
              </select>
            </div>
            <div>
              <Label htmlFor="forge-token">Token forge</Label>
              <Input
                id="forge-token"
                type="password"
                value={forgeToken}
                onChange={(e) => setForgeToken(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              Créer le projet
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
