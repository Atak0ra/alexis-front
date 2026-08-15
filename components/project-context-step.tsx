"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProjectContext,
  getProjectContextStatus,
  getProjectContextDraft,
  getProjectContextContent,
  commitProjectContext,
  AlexisApiError,
  type ContextGenerationPhase,
} from "@/lib/api-client";
import { getApiKey } from "@/lib/session";

interface Props {
  projectId: string;
  onDone?: () => void;
  onSkip?: () => void;
  _pollIntervalMs?: number;
  embedded?: boolean;
  stepLabel?: string;
}

// Phase "form" supprimée — l'objectif fait foi.
type Phase = "detecting" | "polling" | "review" | "done" | "failed";

const GENERATION_PHASE_STEPS: { key: ContextGenerationPhase; label: string }[] = [
  { key: "cloning", label: "Clonage du dépôt" },
  { key: "running_agent", label: "Exécution de l'agent" },
  { key: "reading_result", label: "Lecture du résultat" },
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
            <span className={isDone ? "text-success" : isCurrent ? "text-brand" : "text-foreground-subtle"}>
              {isDone ? "✓" : isCurrent ? "●" : "○"}
            </span>
            <span className={isCurrent ? "font-medium text-foreground" : isDone ? "text-foreground-muted" : "text-foreground-subtle"}>
              {step.label}{isCurrent && ` (${elapsedSec}s)`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function ProjectContextStep({
  projectId,
  onDone,
  onSkip,
  _pollIntervalMs = 2000,
  embedded = false,
  stepLabel = "5 sur 6",
}: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("detecting");
  const [draftContent, setDraftContent] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [currentGenPhase, setCurrentGenPhase] = useState<ContextGenerationPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startGeneration() {
    const apiKey = getApiKey();
    if (!apiKey) return;
    try {
      // brief vide → le backend réutilise project.context_content (l'objectif saisi)
      await createProjectContext(apiKey, projectId, "");
      setPhase("polling");
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Impossible de lancer la génération.");
      setPhase("failed");
    }
  }

  // ── Phase detecting : vérifier contexte existant ou lancer génération ──
  useEffect(() => {
    if (phase !== "detecting") return;
    const apiKey = getApiKey();
    if (!apiKey) { startGeneration(); return; }
    (async () => {
      try {
        const content = await getProjectContextContent(apiKey, projectId);
        if (content.status === "ready" && content.content) {
          setDraftContent(content.content); setEditedContent(content.content); setPhase("review"); return;
        }
        const status = await getProjectContextStatus(apiKey, projectId);
        if (status.status === "draft_ready") {
          const draft = await getProjectContextDraft(apiKey, projectId);
          if (draft.content) { setDraftContent(draft.content); setEditedContent(draft.content); setPhase("review"); return; }
        }
        if (status.status === "in_progress") { setPhase("polling"); return; }
        await startGeneration();
      } catch { await startGeneration(); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Chrono pendant le polling ──
  useEffect(() => {
    if (phase !== "polling") return;
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // ── Polling statut génération ──
  useEffect(() => {
    if (phase !== "polling" || _pollIntervalMs === 0) return;
    const apiKey = getApiKey();
    if (!apiKey) return;
    pollRef.current = setInterval(async () => {
      try {
        const s = await getProjectContextStatus(apiKey, projectId);
        setCurrentGenPhase((s.phase as ContextGenerationPhase) ?? null);
        if (s.status === "draft_ready") {
          clearInterval(pollRef.current!);
          const draft = await getProjectContextDraft(apiKey, projectId);
          setDraftContent(draft.content ?? ""); setEditedContent(draft.content ?? "");
          setPhase("review");
        } else if (s.status === "failed") {
          clearInterval(pollRef.current!);
          setError(s.error ?? "La génération a échoué.");
          setPhase("failed");
        }
      } catch { /* réseau → continuer */ }
    }, _pollIntervalMs);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [phase, projectId, _pollIntervalMs]);

  async function handleCommit() {
    const apiKey = getApiKey();
    if (!apiKey) return;
    setSubmitting(true);
    try {
      await commitProjectContext(apiKey, projectId, editedContent);
      setPhase("done");
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur lors de l'enregistrement.");
    } finally { setSubmitting(false); }
  }

  async function handleRegenerate() {
    setError(null); setElapsedSec(0); setCurrentGenPhase(null);
    await startGeneration();
  }

  function handleSkip() {
    if (onSkip) onSkip(); else router.push("/dashboard");
  }

  const wrapper = embedded ? "w-full" : "flex min-h-screen flex-col items-center justify-start bg-surface px-4 pt-12 pb-24 sm:px-6";

  return (
    <div className={wrapper}>
      <div className="w-full max-w-2xl space-y-6">
        {!embedded && (
          <span className="text-xs text-foreground-subtle font-medium uppercase tracking-widest">Étape {stepLabel}</span>
        )}

        {/* ── DETECTING ── */}
        {phase === "detecting" && (
          <div className="flex items-center gap-3 text-sm text-foreground-muted">
            <Spinner label="Analyse du projet en cours…" />
          </div>
        )}

        {/* ── POLLING ── */}
        {phase === "polling" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Génération du contexte…</h1>
              <p className="mt-1 text-sm text-foreground-muted">
                Alexis analyse ton projet et génère le fichier de contexte.
                {elapsedSec > 20 && <> Cela peut prendre une minute.</>}
              </p>
            </div>
            <PhaseChecklist steps={GENERATION_PHASE_STEPS} currentPhase={currentGenPhase} elapsedSec={elapsedSec} />
          </div>
        )}

        {/* ── REVIEW ── */}
        {phase === "review" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Contexte du projet</h1>
              <p className="mt-1 text-sm text-foreground-muted">
                Alexis a généré ce fichier à partir de ton objectif et du code. Tu peux le modifier avant de valider.
              </p>
            </div>
            {error && <ErrorBanner message={error} />}
            <textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} rows={20}
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 font-mono text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-y" />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={handleCommit} disabled={submitting || !editedContent.trim()}
                className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 transition-colors">
                {submitting ? <Spinner label="Enregistrement…" /> : "Valider →"}
              </button>
              <button type="button" onClick={handleRegenerate} disabled={submitting}
                className="rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50 transition-colors">
                Régénérer
              </button>
              <button type="button" onClick={handleSkip} className="text-sm text-foreground-muted hover:text-foreground transition-colors">
                Passer cette étape →
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {phase === "done" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Contexte enregistré ✓</h1>
            <div className="flex items-start gap-4 rounded-xl border border-success-border bg-success-bg px-5 py-4">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-sm font-medium text-foreground">Fichier de contexte enregistré avec succès</p>
                <p className="mt-0.5 text-xs text-foreground-muted">Alexis l&apos;utilisera dès le prochain run.</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => { if (onDone) onDone(); else router.push("/dashboard"); }}
                className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors">
                {onDone ? "Continuer →" : "Aller au tableau de bord"}
              </button>
              <button type="button" onClick={handleSkip} className="text-sm text-foreground-muted hover:text-foreground transition-colors">
                Passer cette étape →
              </button>
            </div>
          </div>
        )}

        {/* ── FAILED ── */}
        {phase === "failed" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Génération échouée</h1>
            {error && <ErrorBanner message={error} />}
            <div className="flex gap-3">
              <button type="button" onClick={handleRegenerate}
                className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors">
                Réessayer →
              </button>
              <button type="button" onClick={handleSkip}
                className="rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground hover:bg-surface-raised transition-colors">
                Passer cette étape →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
