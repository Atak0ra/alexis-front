"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProjectContext,
  getProjectContextStatus,
  getProjectContextDraft,
  getProjectContextContent,
  commitProjectContext,
  enqueueRepoSummary,
  getRepoSummaryStatus,
  AlexisApiError,
  type RepoSummaryResult,
  type ContextGenerationPhase,
} from "@/lib/api-client";
import { getApiKey } from "@/lib/session";
import ContextAdvancedOptions from "@/components/context-advanced-options";
import AgentTemplateHint from "@/components/agent-template-hint";

interface Props {
  projectId: string;
  /** Appelé quand le commit est terminé (done). Défaut : push("/dashboard") */
  onDone?: () => void;
  /** Appelé quand l'utilisateur clique "Passer cette étape". Défaut : push("/dashboard") */
  onSkip?: () => void;
  /** Intervalle de polling en ms. Défaut : 2000. Passer 0 dans les tests. */
  _pollIntervalMs?: number;
  /** Rendu compact (pas de plein-écran ni "Étape 4 sur 4") pour un usage
   * intégré dans une autre page (settings, modal projet) plutôt que
   * l'assistant de création autonome. */
  embedded?: boolean;
}

type Phase = "detecting" | "form" | "polling" | "review" | "committing" | "done" | "failed";

const GENERATION_PHASE_STEPS: { key: ContextGenerationPhase; label: string }[] = [
  { key: "cloning", label: "Clonage du dépôt" },
  { key: "running_agent", label: "Exécution de l'agent" },
  { key: "reading_result", label: "Lecture du résultat" },
];

const COMMIT_PHASE_STEPS: { key: ContextGenerationPhase; label: string }[] = [
  { key: "writing_file", label: "Écriture du fichier" },
  { key: "committing", label: "Commit & push" },
];

function PhaseChecklist({
  steps,
  currentPhase,
  elapsedSec,
}: {
  steps: { key: ContextGenerationPhase; label: string }[];
  currentPhase: ContextGenerationPhase | null;
  elapsedSec: number;
}) {
  const currentIdx = steps.findIndex((s) => s.key === currentPhase);
  return (
    <ul className="space-y-1.5">
      {steps.map((step, idx) => {
        const isDone = currentIdx >= 0 && idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <li key={step.key} className="flex items-center gap-2 text-sm">
            <span
              className={
                isDone ? "text-success" : isCurrent ? "text-brand" : "text-foreground-subtle"
              }
            >
              {isDone ? "✓" : isCurrent ? "●" : "○"}
            </span>
            <span
              className={
                isCurrent
                  ? "font-medium text-foreground"
                  : isDone
                  ? "text-foreground-muted"
                  : "text-foreground-subtle"
              }
            >
              {step.label}
              {isCurrent && ` (${elapsedSec}s)`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function ProjectContextStep({ projectId, onDone, onSkip, _pollIntervalMs = 2000, embedded = false }: Props) {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [advancedBrief, setAdvancedBrief] = useState("");
  const [phase, setPhase] = useState<Phase>("detecting");
  const [repoSummary, setRepoSummary] = useState<RepoSummaryResult | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [genPhase, setGenPhase] = useState<ContextGenerationPhase | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Chrono de la phase en cours (remis à zéro à chaque changement de phase) ──
  useEffect(() => {
    if (phase !== "polling" && phase !== "committing") return;
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // ── Reprendre un job en cours, ou détecter le repo si rien à reprendre ─────
  // Résiste à un refresh en plein milieu : sans ça, rafraîchir pendant
  // "detecting"/"polling" perdait tout l'état local et renvoyait l'utilisateur
  // au formulaire vide, donnant l'impression que ça boucle indéfiniment.
  useEffect(() => {
    let cancelled = false;

    async function detectRepo(apiKey: string) {
      try {
        const { job_id } = await enqueueRepoSummary(apiKey, projectId);

        let attempts = 0;
        const maxAttempts = 30;
        await new Promise<void>((resolve) => {
          async function tick() {
            if (cancelled) { resolve(); return; }
            attempts++;
            try {
              const res = await getRepoSummaryStatus(apiKey, projectId, job_id);
              if (res.status === "done") {
                if (!cancelled && res.result) setRepoSummary(res.result);
                resolve(); return;
              } else if (res.status === "failed" || attempts >= maxAttempts) {
                resolve(); return;
              }
            } catch {
              if (attempts >= maxAttempts) { resolve(); return; }
            }
            setTimeout(tick, 2000);
          }
          tick();
        });

        if (!cancelled) setPhase("form");
      } catch {
        if (!cancelled) setPhase("form");
      }
    }

    // ── Charger le contenu déjà committé pour édition (bouton "Modifier" alors
    // qu'un .alexis/project.md existe déjà) — lecture synchrone depuis la DB
    // (Project.context_content, migration 0023) : réponse instantanée, plus de
    // polling ni de boucle de retry.
    async function loadExistingContent(apiKey: string) {
      try {
        const { status: contentStatus, content } = await getProjectContextContent(apiKey, projectId);
        if (!cancelled) {
          if (contentStatus === "ready" && content) {
            setDraftContent(content);
            setPhase("review");
          } else {
            await detectRepo(apiKey);
          }
        }
      } catch {
        // 404 = pas de contexte en DB → formulaire de génération
        if (!cancelled) await detectRepo(apiKey);
      }
    }

    async function resumeOrDetect() {
      const apiKey = getApiKey();
      if (!apiKey) { setPhase("form"); return; }

      try {
        const { status, error: statusError, phase: statusPhase } = await getProjectContextStatus(apiKey, projectId);
        if (cancelled) return;

        if (status === "done") {
          await loadExistingContent(apiKey);
          return;
        }

        if (status === "in_progress") {
          setGenPhase(statusPhase ?? null);
          if (statusPhase === "writing_file" || statusPhase === "committing") {
            setPhase("committing");
            startCommitPolling();
          } else {
            setPhase("polling");
            startPolling();
          }
          return;
        }

        if (status === "draft_ready") {
          try {
            const { content } = await getProjectContextDraft(apiKey, projectId);
            if (cancelled) return;
            setDraftContent(content);
            setPhase("review");
          } catch {
            if (!cancelled) await detectRepo(apiKey);
          }
          return;
        }

        if (status === "failed") {
          setError(
            statusError
              ? `La génération précédente a échoué : ${statusError}`
              : "La génération précédente a échoué. Vous pouvez réessayer ou passer cette étape."
          );
          setPhase("failed");
          return;
        }
      } catch {
        // Pas de statut lisible — on repart sur la détection normale ci-dessous.
      }

      if (!cancelled) await detectRepo(apiKey);
    }

    resumeOrDetect();
    return () => { cancelled = true; };
  }, [projectId]);

  // ── Clean up polling on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Poll statut génération (in_progress → draft_ready | failed) ───────────
  function startPolling() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      try {
        const apiKey = getApiKey();
        if (!apiKey) return;
        const { status, error: statusError, phase: statusPhase } = await getProjectContextStatus(apiKey, projectId);
        if (statusPhase) {
          setGenPhase((prev) => {
            if (statusPhase !== prev) setElapsedSec(0);
            return statusPhase;
          });
        }
        if (status === "draft_ready") {
          clearInterval(intervalRef.current!);
          // Récupérer le draft pour prévisualisation
          try {
            const { content } = await getProjectContextDraft(apiKey, projectId);
            setDraftContent(content);
            setPhase("review");
          } catch {
            setPhase("failed");
            setError("Impossible de récupérer le draft généré.");
          }
        } else if (status === "failed") {
          clearInterval(intervalRef.current!);
          setPhase("failed");
          setError(
            statusError
              ? `La génération du fichier de contexte a échoué : ${statusError}`
              : "La génération du fichier de contexte a échoué. Vous pouvez réessayer ou passer cette étape."
          );
        }
      } catch {
        // network error — keep polling silently
      }
    }, _pollIntervalMs);
  }

  // ── Poll statut commit (in_progress → done | failed) ─────────────────────
  function startCommitPolling() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      try {
        const apiKey = getApiKey();
        if (!apiKey) return;
        const { status, error: statusError, phase: statusPhase } = await getProjectContextStatus(apiKey, projectId);
        if (statusPhase) {
          setGenPhase((prev) => {
            if (statusPhase !== prev) setElapsedSec(0);
            return statusPhase;
          });
        }
        if (status === "done") {
          clearInterval(intervalRef.current!);
          setPhase("done");
        } else if (status === "failed") {
          clearInterval(intervalRef.current!);
          setPhase("review"); // retour review pour réessayer
          setError(
            statusError
              ? `Le commit a échoué : ${statusError}`
              : "Le commit a échoué. Vérifiez vos droits sur le repo et réessayez."
          );
        }
      } catch {
        // network error — keep polling silently
      }
    }, _pollIntervalMs);
  }

  // ── Soumettre le brief → lancer la génération ─────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Session absente");
      setGenPhase(null);
      setElapsedSec(0);
      const finalBrief = advancedBrief
        ? [advancedBrief, brief.trim()].filter(Boolean).join("\n\n")
        : brief;
      await createProjectContext(apiKey, projectId, finalBrief);
      setPhase("polling");
      startPolling();
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue lors de la soumission.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Valider le draft et committer ─────────────────────────────────────────
  async function handleCommit() {
    setError(null);
    setSubmitting(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Session absente");
      setGenPhase(null);
      setElapsedSec(0);
      await commitProjectContext(apiKey, projectId, draftContent);
      setPhase("committing");
      startCommitPolling();
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue lors du commit.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Régénérer (retour au formulaire) ──────────────────────────────────────
  function handleRegenerate() {
    setDraftContent("");
    setError(null);
    setPhase("form");
  }

  function handleSkip() {
    if (onSkip) onSkip();
    else router.push("/dashboard");
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const hasCode = repoSummary?.has_code ?? false;
  const langBadges = repoSummary?.languages ?? [];
  const formTitle = hasCode ? "Contexte du projet" : "Décris ton nouveau projet";
  const textareaLabel = hasCode ? "Contexte supplémentaire (optionnel)" : "Décris ton projet en quelques phrases";
  const submitLabel = hasCode ? "Générer depuis le code" : "Générer";

  const formSubtitle = hasCode ? (
    <>
      Alexis a détecté{" "}
      <strong>{repoSummary!.file_count} fichier{repoSummary!.file_count !== 1 ? "s" : ""}</strong>
      {langBadges.length > 0 && <> ({langBadges.join(", ")})</>}{" "}
      dans votre repo. Il va lire votre code et générer{" "}
      <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-foreground">.alexis/project.md</code>{" "}
      automatiquement. Ajoutez un contexte supplémentaire si besoin.
    </>
  ) : (
    <>
      Votre repo est vide ou tout nouveau. Décrivez votre projet en quelques phrases (stack
      souhaitée, objectif, contraintes) et Alexis génère{" "}
      <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-foreground">.alexis/project.md</code>.
    </>
  );

  return (
    <div
      className={
        embedded
          ? "w-full"
          : "flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12"
      }
    >
      <div className="w-full max-w-lg">
        {!embedded && (
          <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-brand">
            Étape 4 sur 4
          </p>
        )}

        {/* ── DETECTING ── */}
        {phase === "detecting" && (
          <div className="mt-8 flex items-center gap-3 text-sm text-foreground-muted">
            <svg className="h-4 w-4 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyse du repo en cours…
          </div>
        )}

        {/* ── FORM ── */}
        {(phase === "form" || phase === "failed") && (
          <>
            <h1 className="text-2xl font-bold text-foreground">{formTitle}</h1>
            <p className="mt-2 text-sm text-foreground-muted">{formSubtitle}</p>

            {hasCode && langBadges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {langBadges.map((lang: string) => (
                  <span key={lang} className="rounded-full border border-border bg-surface-raised px-2.5 py-0.5 text-xs font-medium text-foreground-muted">
                    {lang}
                  </span>
                ))}
              </div>
            )}

            <AgentTemplateHint />

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <ContextAdvancedOptions onChange={setAdvancedBrief} />

              <div>
                <label htmlFor="brief" className="mb-1.5 block text-sm font-medium text-foreground">
                  {textareaLabel}
                </label>
                {!hasCode && (
                  <p className="mb-2 text-xs text-foreground-subtle">
                    Stack technique, objectif principal, contraintes particulières. Texte libre.
                  </p>
                )}
                <textarea
                  id="brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  rows={6}
                  required={!hasCode}
                  placeholder={
                    hasCode
                      ? "Ex : Ne pas modifier les migrations existantes. Tests obligatoires avant chaque PR."
                      : "Ex : API Python/FastAPI + frontend Next.js. Base PostgreSQL. Déployé sur Railway."
                  }
                  className="w-full resize-y rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
                />
              </div>

              {error && <ErrorBanner message={error} />}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={submitting || (!hasCode && !brief.trim())}
                  className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  {submitting ? <Spinner label="Envoi…" /> : phase === "failed" ? "Réessayer" : submitLabel}
                </button>
                <button type="button" onClick={handleSkip} className="text-sm text-foreground-muted hover:text-foreground transition-colors">
                  Passer cette étape →
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── POLLING (génération en cours) ── */}
        {phase === "polling" && (
          <div className="mt-8 space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Génération en cours…</h1>
            <div className="flex items-start gap-4 rounded-xl border border-border bg-surface-raised px-5 py-4">
              <svg className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {hasCode ? "Alexis lit votre code et rédige le contexte…" : "Alexis rédige le contexte…"}
                </p>
                <p className="mt-0.5 mb-3 text-xs text-foreground-muted">
                  Vous pourrez relire et modifier avant de valider. Ça peut prendre une à deux minutes.
                </p>
                <PhaseChecklist steps={GENERATION_PHASE_STEPS} currentPhase={genPhase} elapsedSec={elapsedSec} />
              </div>
            </div>
            <div className="text-right">
              <button type="button" onClick={handleSkip} className="text-sm text-foreground-muted hover:text-foreground transition-colors">
                Passer cette étape →
              </button>
            </div>
          </div>
        )}

        {/* ── REVIEW (prévisualisation + édition) ── */}
        {phase === "review" && (
          <div className="mt-8 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Relire et valider</h1>
              <p className="mt-2 text-sm text-foreground-muted">
                Alexis a généré le fichier{" "}
                <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-foreground">.alexis/project.md</code>.
                Relisez, modifiez si besoin, puis cliquez <strong>Valider et committer</strong>.
                Le fichier sera committé sur votre branche par défaut.
              </p>
            </div>

            <div>
              <label htmlFor="draft" className="mb-1.5 block text-sm font-medium text-foreground">
                Contenu de <code className="font-mono text-xs">.alexis/project.md</code>
              </label>
              <textarea
                id="draft"
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                rows={20}
                className="w-full resize-y rounded-xl border border-border bg-surface-raised px-4 py-3 font-mono text-xs text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
              />
            </div>

            {error && <ErrorBanner message={error} />}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={submitting || !draftContent.trim()}
                  className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  {submitting ? <Spinner label="Envoi…" /> : "Valider et committer"}
                </button>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={submitting}
                  className="rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50 transition-colors"
                >
                  Régénérer
                </button>
              </div>
              <button type="button" onClick={handleSkip} className="text-sm text-foreground-muted hover:text-foreground transition-colors">
                Passer cette étape →
              </button>
            </div>
          </div>
        )}

        {/* ── COMMITTING ── */}
        {phase === "committing" && (
          <div className="mt-8 space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Commit en cours…</h1>
            <div className="flex items-start gap-4 rounded-xl border border-border bg-surface-raised px-5 py-4">
              <svg className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Commit et push en cours…</p>
                <p className="mt-0.5 mb-3 text-xs text-foreground-muted">
                  <code className="font-mono">.alexis/project.md</code> sera committé sur votre branche par défaut.
                </p>
                <PhaseChecklist steps={COMMIT_PHASE_STEPS} currentPhase={genPhase} elapsedSec={elapsedSec} />
              </div>
            </div>
            <div className="text-right">
              <button type="button" onClick={handleSkip} className="text-sm text-foreground-muted hover:text-foreground transition-colors">
                Passer cette étape →
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {phase === "done" && (
          <div className="mt-8 space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Contexte committé ✓</h1>
            <div className="flex items-start gap-4 rounded-xl border border-success-border bg-success-bg px-5 py-4">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-sm font-medium text-foreground">Fichier de contexte committé avec succès</p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  <code className="font-mono">.alexis/project.md</code> a été committé sur votre branche par défaut.
                  Alexis l&apos;utilisera dès le prochain run.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => { if (onDone) onDone(); else router.push("/dashboard"); }}
                className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors"
              >
                {onDone ? "Fermer" : "Aller au tableau de bord"}
              </button>
              <button type="button" onClick={handleSkip} className="text-sm text-foreground-muted hover:text-foreground transition-colors">
                Passer cette étape →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sous-composants ────────────────────────────────────────────────────────────

function Spinner({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2">
      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {label}
    </span>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-danger-border bg-danger-bg px-4 py-3">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="text-sm text-danger">{typeof message === "string" ? message : "Erreur inattendue."}</p>
    </div>
  );
}
