"use client";

/**
 * ProjectContextCard — affiche le contenu de .alexis/project.md sur la page projet.
 *
 * - Carte repliable (expand/collapse)
 * - Rendu Markdown léger (sans dépendance externe) : titres, listes, code inline, gras
 * - Bouton « Modifier » qui ouvre la ProjectContextStep en modal
 * - Chargement paresseux : fetch au premier dépliage
 */

import { useEffect, useRef, useState } from "react";
import { getApiKey } from "@/lib/session";
import { getProjectContextContent } from "@/lib/api-client";
import ProjectContextStep from "@/components/project-context-step";
import MarkdownLite from "@/components/markdown-lite";

interface Props {
  projectId: string;
  /** Appelé quand l'utilisateur valide une modification (pour rafraîchir l'état parent) */
  onContextUpdated?: () => void;
  /** Intervalle de polling en ms pour ProjectContextStep (0 = immédiat, utile pour les tests) */
  _pollIntervalMs?: number;
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ProjectContextCard({ projectId, onContextUpdated, _pollIntervalMs }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchedRef = useRef(false);

  // Fetch au premier dépliage
  useEffect(() => {
    if (!expanded || fetchedRef.current) return;
    fetchedRef.current = true;
    fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function fetchContent() {
    const apiKey = getApiKey();
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getProjectContextContent(apiKey, projectId);
      if (res.status === "ready" && res.content) {
        setContent(res.content);
        setLoading(false);
      } else {
        // loading → poll
        startPolling();
      }
    } catch {
      setError("Impossible de charger le contexte.");
      setLoading(false);
    }
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const apiKey = getApiKey();
      if (!apiKey) return;
      try {
        const res = await getProjectContextContent(apiKey, projectId);
        if (res.status === "ready" && res.content) {
          clearInterval(pollRef.current!);
          setContent(res.content);
          setLoading(false);
        }
      } catch {
        clearInterval(pollRef.current!);
        setError("Impossible de charger le contexte.");
        setLoading(false);
      }
    }, 2000);
  }

  function handleEditDone() {
    setShowEditModal(false);
    // Invalider le cache et recharger
    fetchedRef.current = false;
    setContent(null);
    setLoading(false);
    setError(null);
    if (expanded) {
      fetchedRef.current = true;
      fetchContent();
    }
    onContextUpdated?.();
  }

  return (
    <>
      {/* ── Carte ── */}
      <div className="rounded-xl border border-border bg-surface-raised shadow-card">
        {/* Header cliquable */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Icône fichier */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10">
              <svg className="h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Contexte du projet</p>
              <p className="text-xs text-foreground-muted font-mono">.alexis/project.md</p>
            </div>
            {/* Badge committé */}
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-medium text-success border border-success-border">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Committé
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Bouton Modifier */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground-muted hover:bg-surface-sunken hover:text-foreground transition-colors"
            >
              Modifier
            </button>
            {/* Chevron */}
            <svg
              className={`h-4 w-4 text-foreground-muted transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Contenu déplié */}
        {expanded && (
          <div className="border-t border-border px-5 pb-5 pt-4">
            {loading && (
              <div className="flex items-center gap-3 py-4 text-sm text-foreground-muted">
                <svg className="h-4 w-4 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Chargement du contexte…
              </div>
            )}
            {error && (
              <p className="py-4 text-sm text-danger">{error}</p>
            )}
            {content && !loading && (
              <div className="prose-sm max-w-none">
                <MarkdownLite text={content} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Modifier ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface shadow-xl overflow-y-auto max-h-[90vh] p-6 sm:p-8">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-foreground-muted hover:bg-surface-sunken hover:text-foreground transition-colors"
              aria-label="Fermer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <ProjectContextStep
              projectId={projectId}
              embedded
              onDone={handleEditDone}
              onSkip={() => setShowEditModal(false)}
              _pollIntervalMs={_pollIntervalMs}
            />
          </div>
        </div>
      )}
    </>
  );
}
