"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateForge, AlexisApiError } from "@/lib/api-client";
import { getApiKey } from "@/lib/session";
import { useNewProject } from "@/lib/new-project-context";
import FieldHint from "@/components/field-hint";

export default function RepoPage() {
  const router = useRouter();
  const {
    name, setName,
    hosted,
    repoUrl, setRepoUrl,
    forgeProvider, setForgeProvider,
    forgeToken, setForgeToken,
    githubUsername, setGithubUsername,
  } = useNewProject();

  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [validatedAccount, setValidatedAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleForgeProviderChange(v: string) {
    setForgeProvider(v);
    setValidated(false);
    setValidatedAccount(null);
    setError(null);
  }

  function handleForgeTokenChange(v: string) {
    setForgeToken(v);
    setValidated(false);
    setValidatedAccount(null);
    setError(null);
  }

  async function handleTestConnection() {
    setError(null);
    setValidating(true);
    setValidated(false);
    setValidatedAccount(null);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Session absente");
      const result = await validateForge(apiKey, {
        forge_provider: forgeProvider,
        forge_token: forgeToken,
        repo_url: repoUrl || undefined,
      });
      setValidated(true);
      setValidatedAccount(result.account);
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur de connexion inattendue");
    } finally {
      setValidating(false);
    }
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    router.push("/projects/new/agent");
  }

  const canNext = hosted
    ? name.trim() !== "" && githubUsername.trim() !== ""
    : validated && name.trim() !== "" && repoUrl.trim() !== "";

  return (
    <>
      <Link
        href="/projects/new/choice"
        className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground transition-colors"
      >
        ← Modifier mon choix de dépôt
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-foreground">
        {hosted ? "Ton compte GitHub" : "Dépôt & Forge"}
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        {hosted
          ? "Alexis crée un dépôt privé et t'y ajoute en tant que collaborateur admin."
          : "Connectez votre dépôt Git et vérifiez l'accès de votre token."}
      </p>

      <form onSubmit={handleNext} className="mt-8 space-y-5">
        {/* Project name */}
        <div>
          <Label htmlFor="name">Nom du projet</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mon-projet"
            required
          />
        </div>

        {!hosted && (
          <>
            {/* Forge provider */}
            <div>
              <Label htmlFor="forge-provider">Forge</Label>
              <select
                id="forge-provider"
                value={forgeProvider}
                onChange={(e) => handleForgeProviderChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
              </select>
            </div>

            {/* Repo URL */}
            <div>
              <Label htmlFor="repo-url">URL du dépôt</Label>
              <Input
                id="repo-url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder={
                  forgeProvider === "github"
                    ? "https://github.com/owner/repo"
                    : "https://gitlab.com/group/project"
                }
                required
              />
            </div>

            {/* Forge token */}
            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="forge-token">
                  Token {forgeProvider === "github" ? "GitHub" : "GitLab"}
                </Label>
                {forgeProvider === "github" ? (
                  <FieldHint
                    title="Token d'accès GitHub"
                    description="Un Personal Access Token (classic) avec les scopes repo et read:user. Alexis l'utilise pour cloner le dépôt, créer des branches et ouvrir des Pull Requests."
                    href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=Alexis"
                    hrefLabel="Créer un token GitHub →"
                  />
                ) : (
                  <FieldHint
                    title="Token d'accès GitLab"
                    description="Un Personal Access Token avec les scopes api et read_user. Alexis l'utilise pour cloner le dépôt, créer des branches et ouvrir des Merge Requests."
                    href="https://gitlab.com/-/user_settings/personal_access_tokens/new?name=Alexis&scopes=api,read_user"
                    hrefLabel="Créer un token GitLab →"
                  />
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  id="forge-token"
                  type="password"
                  value={forgeToken}
                  onChange={(e) => handleForgeTokenChange(e.target.value)}
                  placeholder={forgeProvider === "github" ? "ghp_…" : "glpat_…"}
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!forgeToken.trim() || validating}
                  onClick={handleTestConnection}
                >
                  {validating ? "Test…" : "Tester"}
                </Button>
              </div>

              {validated && validatedAccount && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-success">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Connecté ✓ — compte&nbsp;: <span className="font-mono font-medium">{validatedAccount}</span>
                </p>
              )}
              {error && (
                <p className="mt-2 text-sm text-danger">{error}</p>
              )}
            </div>
          </>
        )}

        {hosted && (
          <div>
            <Label htmlFor="github-username">Pseudo GitHub</Label>
            <Input
              id="github-username"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="octocat"
              required
            />
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={!canNext}>
            Suivant →
          </Button>
        </div>
      </form>
    </>
  );
}
