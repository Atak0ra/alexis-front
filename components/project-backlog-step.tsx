"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createBacklog,
  getBacklogStatus,
  getBacklogDraft,
  commitBacklog,
  AlexisApiError,
  type BacklogTicketDraft,
} from "@/lib/api-client";
import { getApiKey } from "@/lib/session";

interface Props {
  projectId: string;
  /** Appelé quand le commit est terminé. Défaut : push("/dashboard") */
  onDone?: () => void;
  /** Appelé quand l'utilisateur clique "Passer cette étape". Défaut : push("/dashboard") */
  onSkip?: () => void;
  /** Intervalle de polling en ms. Défaut : 2000. Passer 0 dans les tests. */
  _pollIntervalMs?: number;
}

type Phase = "form" | "polling" | "review" | "done" | "failed";

export default function ProjectBacklogStep({
  projectId,
  onDone,
  onSkip,
  _pollIntervalMs = 2000,
}: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("form");
  const [tickets, setTickets] = useState<BacklogTicketDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Chrono pendant le polling
  useEffect(() => {
    if (phase !== "polling") return;
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Cleanup polling on unmount
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
        const { status, error: statusError } = await getBacklogStatus(apiKey, projectId);
        if (status === "draft_ready") {
          clearInterval(intervalRef.current!);
          try {
            const { tickets: draft } = await getBacklogDraft(apiKey, projectId);
            setTickets(draft);
            setPhase("review");
          } catch {
            setPhase("failed");
            setError("Impossible de récupérer le backlog généré.");
          }
        } else if (status === "failed") {
          clearInterval(intervalRef.current!);
          setPhase("failed");
          setError(statusError ?? "La génération du backlog a échoué. Vous pouvez réessayer ou passer cette étape.");
        }
      } catch {
        // network error — keep polling silently
      }
    }, _pollIntervalMs);
  }

  async function handleGenerate() {
    setError(null);
    setSubmitting(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Session absente");
      setElapsedSec(0);
      // Le brief est vide : le job s'appuie sur context_content + references
      // déjà fournis à l'étape Contexte.
      await createBacklog(apiKey, projectId, "");
      setPhase("polling");
      startPolling();
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : (err instanceof Error ? err.message : "Erreur inattendue."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCommit() {
    setError(null);
    setSubmitting(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Session absente");
      await commitBacklog(apiKey, projectId, tickets);
      setPhase("done");
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue lors de la validation.");
    } finally {
      setSubmitting(false);
    }
  }

  function updateTicket(idx: number, field: keyof BacklogTicketDraft, value: string | string[]) {
    setTickets((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  }

  function removeTicket(idx: number) {
    setTickets((prev) => prev.filter((_, i) => i !== idx));
  }

  function addTicket() {
    setTickets((prev) => [...prev, { title: "", description: "", labels: [] }]);
  }

  function handleSkip() {
    if (onSkip) onSkip();
    else router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-2xl">
        <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-brand">
          Étape 5 sur 5
        </p>

        {/* ── FORM ── */}
        {(phase === "form" || phase === "failed") && (
          <>
            <h1 className="text-2xl font-bold text-foreground">Backlog de départ</h1>
            <p className="mt-2 text-sm text-foreground-muted">
              Alexis va générer un backlog de tickets fins et actionnables à partir du contexte
              et du cahier des charges fournis à l&apos;étape précédente.
              Tu pourras relire et modifier chaque ticket avant de valider.
            </p>

            {error && <ErrorBanner message={error} />}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={submitting}
                className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                {submitting ? <Spinner label="Envoi…" /> : phase === "failed" ? "Réessayer" : "Générer le backlog"}
              </button>
              <button type="button" onClick={handleSkip} className="text-sm text-foreground-muted hover:text-foreground transition-colors">
                Passer cette étape →
              </button>
            </div>
          </>
        )}

        {/* ── POLLING ── */}
        {phase === "polling" && (
          <div className="mt-8 space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Génération du backlog…</h1>
            <div className="flex items-start gap-4 rounded-xl border border-border bg-surface-raised px-5 py-4">
              <svg className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Alexis analyse le contexte et génère des tickets fins…
                </p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  Tu pourras relire et modifier chaque ticket avant de valider. ({elapsedSec}s)
                </p>
              </div>
            </div>
            <div className="text-right">
              <button type="button" onClick={handleSkip} className="text-sm text-foreground-muted hover:text-foreground transition-colors">
                Passer cette étape →
              </button>
            </div>
          </div>
        )}

        {/* ── REVIEW ── */}
        {phase === "review" && (
          <div className="mt-8 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Relire et valider le backlog</h1>
              <p className="mt-2 text-sm text-foreground-muted">
                {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} générés. Modifie, supprime ou ajoute des tickets avant de valider.
              </p>
            </div>

            <div className="space-y-3">
              {tickets.map((ticket, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-surface-raised p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      {/* Titre */}
                      <input
                        type="text"
                        value={ticket.title}
                        onChange={(e) => updateTicket(idx, "title", e.target.value)}
                        placeholder="Titre du ticket"
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      />
                      {/* Description */}
                      <textarea
                        value={ticket.description}
                        onChange={(e) => updateTicket(idx, "description", e.target.value)}
                        rows={4}
                        placeholder="Description…"
                        className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      />
                      {/* Labels */}
                      {ticket.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {ticket.labels.map((label) => (
                            <span key={label} className="rounded-full border border-border bg-surface-sunken px-2 py-0.5 text-xs text-foreground-subtle">
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTicket(idx)}
                      className="shrink-0 text-foreground-subtle hover:text-danger transition-colors"
                      title="Supprimer ce ticket"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Ajouter un ticket */}
            <button
              type="button"
              onClick={addTicket}
              className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-foreground-subtle hover:border-brand/50 hover:text-foreground transition-colors w-full justify-center"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Ajouter un ticket
            </button>

            {error && <ErrorBanner message={error} />}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={submitting || tickets.filter((t) => t.title.trim()).length === 0}
                  className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  {submitting ? <Spinner label="Création…" /> : `Créer ${tickets.filter((t) => t.title.trim()).length} ticket${tickets.filter((t) => t.title.trim()).length !== 1 ? "s" : ""}`}
                </button>
                <button
                  type="button"
                  onClick={() => { setPhase("form"); setTickets([]); setError(null); }}
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

        {/* ── DONE ── */}
        {phase === "done" && (
          <div className="mt-8 space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Backlog créé ✓</h1>
            <div className="flex items-start gap-4 rounded-xl border border-success-border bg-success-bg px-5 py-4">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-sm font-medium text-foreground">Tickets créés dans le backlog</p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  Alexis peut maintenant travailler sur ces tickets. Rendez-vous dans le tableau de bord.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { if (onDone) onDone(); else router.push("/dashboard"); }}
              className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors"
            >
              {onDone ? "Fermer" : "Aller au tableau de bord"}
            </button>
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
