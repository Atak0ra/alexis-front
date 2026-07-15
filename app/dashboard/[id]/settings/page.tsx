"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProject, updateProject, AlexisApiError, type ProjectOut } from "@/lib/api-client";
import { getApiKey } from "@/lib/session";

// ─── Secret field ─────────────────────────────────────────────────────────────
// Les secrets ne sont jamais renvoyés par l'API. On affiche un indicateur
// "Clé configurée" et un champ vide = "ne pas modifier".

function SecretField({
  id,
  label,
  placeholder,
  value,
  onChange,
  isConfigured,
}: {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  isConfigured: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label htmlFor={id}>{label}</Label>
        {isConfigured && (
          <span className="flex items-center gap-1 text-xs text-success font-medium">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Clé configurée
          </span>
        )}
      </div>
      <Input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isConfigured ? "•••••• — laisser vide pour ne pas modifier" : placeholder}
        autoComplete="new-password"
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectSettingsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();

  const [project, setProject] = useState<ProjectOut | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Champs classiques (préremplis)
  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [agentChoice, setAgentChoice] = useState("claude");
  const [forgeProvider, setForgeProvider] = useState("github");

  // Secrets (write-only — jamais préremplis)
  const [agentApiKey, setAgentApiKey] = useState("");
  const [linearApiKey, setLinearApiKey] = useState("");
  const [forgeToken, setForgeToken] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;
    getProject(apiKey, projectId)
      .then((p) => {
        setProject(p);
        setName(p.name);
        setRepoUrl(p.repo_url);
        setAgentChoice(p.agent_choice);
        setForgeProvider(p.forge_provider);
      })
      .catch((err) =>
        setLoadError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue")
      );
  }, [projectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);
    setSaving(true);

    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Session absente");

      // On n'envoie les secrets que s'ils ont été remplis
      const payload: Parameters<typeof updateProject>[2] = {
        name,
        repo_url: repoUrl,
        agent_choice: agentChoice,
        forge_provider: forgeProvider,
        ...(agentApiKey ? { agent_api_key: agentApiKey } : {}),
        ...(linearApiKey ? { linear_api_key: linearApiKey } : {}),
        ...(forgeToken ? { forge_token: forgeToken } : {}),
      };

      await updateProject(apiKey, projectId, payload);
      setSaveSuccess(true);
      // Réinitialiser les champs secrets après sauvegarde
      setAgentApiKey("");
      setLinearApiKey("");
      setForgeToken("");
    } catch (err) {
      setSaveError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <p className="text-base font-semibold text-foreground">{loadError}</p>
        <Link
          href={`/dashboard/${projectId}`}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-sunken transition-colors"
        >
          ← Retour au projet
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-foreground-muted">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          Projets
        </Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`} className="hover:text-foreground transition-colors">
          {project?.name ?? "…"}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Paramètres</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paramètres du projet</CardTitle>
        </CardHeader>
        <CardContent>
          {project === null ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-sunken" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ── Infos générales ── */}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Général
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nom du projet</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="repo-url">URL du repo</Label>
                    <Input
                      id="repo-url"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </section>

              {/* ── Agent ── */}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Agent
                </h3>
                <div className="space-y-4">
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
                  <SecretField
                    id="agent-api-key"
                    label="Clé API agent"
                    placeholder="sk-ant-… ou clé aider"
                    value={agentApiKey}
                    onChange={setAgentApiKey}
                    isConfigured={true}
                  />
                </div>
              </section>

              {/* ── Linear ── */}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Linear
                </h3>
                <div className="space-y-4">
                  <SecretField
                    id="linear-api-key"
                    label="Clé API Linear"
                    placeholder="lin_api_…"
                    value={linearApiKey}
                    onChange={setLinearApiKey}
                    isConfigured={true}
                  />
                </div>
              </section>

              {/* ── Forge ── */}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Forge
                </h3>
                <div className="space-y-4">
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
                  <SecretField
                    id="forge-token"
                    label="Token forge"
                    placeholder="ghp_… ou glpat-…"
                    value={forgeToken}
                    onChange={setForgeToken}
                    isConfigured={true}
                  />
                </div>
              </section>

              {/* ── Feedback ── */}
              {saveError && (
                <p className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
                  {saveError}
                </p>
              )}
              {saveSuccess && (
                <p className="rounded-lg border border-success-border bg-success-bg px-4 py-3 text-sm text-success font-medium">
                  ✓ Paramètres enregistrés
                </p>
              )}

              {/* ── Actions ── */}
              <div className="flex items-center justify-between pt-2">
                <Link
                  href={`/dashboard/${projectId}`}
                  className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                >
                  ← Retour au projet
                </Link>
                <Button type="submit" disabled={saving}>
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
