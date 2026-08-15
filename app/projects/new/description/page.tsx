"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import MarkdownLite from "@/components/markdown-lite";
import { getApiKey } from "@/lib/session";
import { useNewProject } from "@/lib/new-project-context";
import { submitNewProject } from "@/lib/submit-new-project";
import { refineBrief, friendlyError } from "@/lib/api-client";

export default function DescriptionPage() {
  const router = useRouter();
  const {
    name, hosted,
    repoUrl, forgeProvider, forgeToken, githubUsername, issuePrefix,
    agentChoice, agentApiKey, agentBaseUrl, codeReviewEnabled,
    isByok, stack, architecture,
    brief, setBrief,
  } = useNewProject();

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  // Résultat IA — affiché en prévisualisation, pas encore accepté
  const [refinedPreview, setRefinedPreview] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const apiKey = getApiKey();
    if (!apiKey) { setError("Session absente"); return; }
    await submitNewProject({
      apiKey,
      draft: {
        name, hosted, repoUrl, forgeProvider, forgeToken, githubUsername, issuePrefix,
        agentChoice, agentApiKey, agentBaseUrl, codeReviewEnabled, isByok,
        stack: stack ?? null, architecture: architecture ?? null,
        brief,
      },
      router,
      onStart: () => setSubmitting(true),
      onError: (msg) => setError(msg),
      onFinally: () => setSubmitting(false),
    });
  }

  async function handleRefineBrief() {
    setRefineError(null);
    setRefinedPreview(null);
    const apiKey = getApiKey();
    if (!apiKey) { setRefineError("Session absente"); return; }
    setRefining(true);
    try {
      const { refined } = await refineBrief(apiKey, brief);
      setRefinedPreview(refined);
    } catch (err) {
      setRefineError(friendlyError(err));
    } finally {
      setRefining(false);
    }
  }

  function handleAcceptRefined() {
    if (refinedPreview) setBrief(refinedPreview);
    setRefinedPreview(null);
  }

  function handleDiscardRefined() { setRefinedPreview(null); }

  function handleBack() {
    if (isByok) router.push("/projects/new/agent");
    else router.push("/projects/new/repo");
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">Décris ton projet</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Explique en quelques lignes ce que tu veux construire. Alexis s&apos;en servira
        pour choisir la bonne stack, générer la documentation et créer les premiers tickets.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-3">
          <label htmlFor="project-brief" className="block text-sm font-medium text-foreground">
            Objectif du projet
          </label>

          <textarea
            id="project-brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={5}
            required
            placeholder={
              `Exemple :\n« Une application web de gestion de tâches pour les équipes de 5 à 20 personnes. ` +
              `Elle doit permettre de créer des projets, assigner des tickets, suivre l'avancement ` +
              `en Kanban et envoyer des notifications par email. »`
            }
            className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none"
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-foreground-subtle">
              Plus tu es précis, plus le backlog généré sera pertinent.
            </p>
            <button
              type="button"
              onClick={handleRefineBrief}
              disabled={!brief.trim() || refining || submitting}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand/40 bg-brand/5 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              <Wand2 className="h-3.5 w-3.5" />
              {refining ? "Amélioration…" : "Aide-moi à être plus clair"}
            </button>
          </div>

          {refineError && <p className="text-xs text-danger">{refineError}</p>}

          {/* Carte de prévisualisation du brief amélioré */}
          {refinedPreview && (
            <div className="rounded-xl border border-brand/30 bg-brand-light/60 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Wand2 className="h-3.5 w-3.5 text-brand" />
                  <span className="text-xs font-semibold text-brand">Brief amélioré par l&apos;IA</span>
                </div>
                <button
                  type="button"
                  onClick={handleDiscardRefined}
                  className="rounded p-0.5 text-foreground-subtle hover:text-foreground transition-colors"
                  aria-label="Ignorer la suggestion"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="rounded-lg border border-brand/20 bg-surface-raised px-4 py-3">
                <MarkdownLite text={refinedPreview} />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAcceptRefined}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  Utiliser ce brief
                </button>
                <button
                  type="button"
                  onClick={handleDiscardRefined}
                  className="inline-flex items-center rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground transition-colors"
                >
                  Ignorer
                </button>
                <p className="ml-auto text-xs text-foreground-subtle">
                  Tu peux modifier après avoir accepté.
                </p>
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="secondary" onClick={handleBack}>
            ← Précédent
          </Button>
          <Button type="submit" disabled={submitting || !brief.trim()}>
            {submitting ? "Création…" : "Créer le projet →"}
          </Button>
        </div>
      </form>
    </>
  );
}

