"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProjectContext,
  getProjectContextStatus,
  AlexisApiError,
  type ContextGenerationStatus,
} from "@/lib/api-client";
import { getApiKey } from "@/lib/session";

interface Props {
  projectId: string;
}

type Phase = "form" | "polling" | "done" | "failed";

export default function ProjectContextStep({ projectId }: Props) {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startPolling() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      try {
        const apiKey = getApiKey();
        if (!apiKey) return;
        const { status } = await getProjectContextStatus(apiKey, projectId);
        if (status === "done") {
          clearInterval(intervalRef.current!);
          setPhase("done");
        } else if (status === "failed") {
          clearInterval(intervalRef.current!);
          setPhase("failed");
          setError(
            "La génération du fichier de contexte a échoué. Vous pouvez réessayer ou passer cette étape."
          );
        }
        // "in_progress" or null → keep polling
      } catch {
        // network error — keep polling silently
      }
    }, 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Session absente");
      await createProjectContext(apiKey, projectId, brief);
      setPhase("polling");
      startPolling();
    } catch (err) {
      setError(
        err instanceof AlexisApiError ? err.detail : "Erreur inattendue lors de la soumission."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetry() {
    setPhase("form");
    setError(null);
  }

  function handleSkip() {
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-brand">
          Étape 3 sur 3
        </p>

        <h1 className="text-2xl font-bold text-foreground">
          Contexte du projet
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Alexis lit le fichier{" "}
          <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-foreground">
            .alexis/project.md
          </code>{" "}
          à chaque run pour comprendre votre stack, votre architecture et vos
          contraintes. Ce fichier n&apos;existe pas encore dans votre repo — décrivez
          votre projet en quelques phrases et Alexis le génère et le commite
          directement sur votre branche par défaut.
        </p>

        {/* ── FORM phase ── */}
        {(phase === "form" || phase === "failed") && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="brief"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Décris ton projet en quelques phrases
              </label>
              <p className="mb-2 text-xs text-foreground-subtle">
                Stack technique, objectif principal, contraintes particulières —
                texte libre, pas de format imposé.
              </p>
              <textarea
                id="brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={6}
                required
                placeholder={
                  "Ex : API Python/FastAPI + frontend Next.js. Base PostgreSQL. " +
                  "Déployé sur Railway. Les tests doivent passer avant chaque PR. " +
                  "Pas de dépendances propriétaires."
                }
                className="w-full resize-y rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
              />
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-danger-border bg-danger-bg px-4 py-3">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-danger"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={submitting || !brief.trim()}
                className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Envoi…
                  </span>
                ) : phase === "failed" ? (
                  "Réessayer"
                ) : (
                  "Générer"
                )}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="text-sm text-foreground-muted hover:text-foreground transition-colors"
              >
                Passer cette étape →
              </button>
            </div>
          </form>
        )}

        {/* ── POLLING phase ── */}
        {phase === "polling" && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-raised px-5 py-4">
              <svg
                className="h-5 w-5 shrink-0 animate-spin text-brand"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Génération en cours…
                </p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  Alexis rédige et commite{" "}
                  <code className="font-mono">.alexis/project.md</code> sur votre
                  branche par défaut.
                </p>
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={handleSkip}
                className="text-sm text-foreground-muted hover:text-foreground transition-colors"
              >
                Passer cette étape →
              </button>
            </div>
          </div>
        )}

        {/* ── DONE phase ── */}
        {phase === "done" && (
          <div className="mt-8 space-y-6">
            <div className="flex items-start gap-4 rounded-xl border border-success-border bg-success-bg px-5 py-4">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Fichier de contexte généré avec succès
                </p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  <code className="font-mono">.alexis/project.md</code> a été
                  committé sur votre branche par défaut. Alexis l&apos;utilisera dès
                  le prochain run.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors"
              >
                Aller au tableau de bord
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="text-sm text-foreground-muted hover:text-foreground transition-colors"
              >
                Passer cette étape →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
