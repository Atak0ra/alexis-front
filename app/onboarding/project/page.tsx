"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createProject, AlexisApiError, type ProjectOut } from "@/lib/api-client";
import { getApiKey } from "@/lib/session";
import { useOnboarding } from "@/lib/onboarding-context";
import { DEFAULT_STATES, DEFAULT_TRIGGER_STATES, DEFAULT_MODELS } from "@/lib/project-defaults";

export default function ProjectPage() {
  const router = useRouter();
  const { linearApiKey, linearTeamId } = useOnboarding();
  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [agentChoice, setAgentChoice] = useState("claude");
  const [agentApiKey, setAgentApiKey] = useState("");
  const [agentBaseUrl, setAgentBaseUrl] = useState("");
  const [forgeProvider, setForgeProvider] = useState("github");
  const [forgeToken, setForgeToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<ProjectOut | null>(null);

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

      const result = await createProject(apiKey, {
        name,
        repo_url: repoUrl,
        agent_choice: agentChoice,
        agent_api_key: agentApiKey || null,
        agent_base_url: agentBaseUrl || null,
        linear_api_key: linearApiKey,
        linear_team_id: linearTeamId,
        forge_provider: forgeProvider,
        forge_token: forgeToken,
        states: DEFAULT_STATES,
        trigger_states: DEFAULT_TRIGGER_STATES,
        models: DEFAULT_MODELS,
      });
      setCreated(result);
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Projet créé</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              {created.name} ({created.id})
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
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
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="claude">claude</option>
                <option value="aider">aider</option>
              </select>
            </div>
            <div>
              <Label htmlFor="agent-api-key">Clé API agent (optionnel)</Label>
              <Input
                id="agent-api-key"
                type="password"
                value={agentApiKey}
                onChange={(e) => setAgentApiKey(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="agent-base-url">URL de base agent (optionnel)</Label>
              <Input id="agent-base-url" value={agentBaseUrl} onChange={(e) => setAgentBaseUrl(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="forge-provider">Forge</Label>
              <select
                id="forge-provider"
                value={forgeProvider}
                onChange={(e) => setForgeProvider(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              Créer le projet
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
