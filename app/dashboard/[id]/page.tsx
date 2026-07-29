"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getApiKey } from "@/lib/session";
import {
  getProject,
  getProjectStats,
  listIssues,
  listTickets,
  createIssue,
  updateIssue,
  getProjectContext,
  deleteProject,
  AlexisApiError,
  type ProjectOut,
  type ProjectStats,
  type Issue,
  type TicketOut,
} from "@/lib/api-client";
import ProjectContextStep from "@/components/project-context-step";
import ProjectContextCard from "@/components/project-context-card";
import TicketKanban, { type TicketSummary } from "@/components/ticket-kanban";
import { Plus, X } from "lucide-react";

// ─── KPI strip ────────────────────────────────────────────────────────────────

function KpiStrip({ stats }: { stats: ProjectStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="rounded-xl border border-success-border bg-success-bg p-4 text-center">
        <p className="text-3xl font-bold text-success">{stats.resolved}</p>
        <p className="mt-1 text-xs font-medium text-success/70">Résolus</p>
      </div>
      <div className="rounded-xl border border-warning-border bg-warning-bg p-4 text-center">
        <p className="text-3xl font-bold text-warning">{stats.in_progress}</p>
        <p className="mt-1 text-xs font-medium text-warning/70">En cours</p>
      </div>
      <div className="rounded-xl border border-danger-border bg-danger-bg p-4 text-center">
        <p className="text-3xl font-bold text-danger">{stats.failed}</p>
        <p className="mt-1 text-xs font-medium text-danger/70">Échecs</p>
      </div>
      <div className="rounded-xl border border-border bg-surface-raised p-4 text-center">
        <p className="font-mono text-3xl font-bold text-foreground">
          {(stats.total_cost_display ?? 0).toFixed(2)} {stats.display_currency ?? "EUR"}
        </p>
        <p className="mt-1 text-xs font-medium text-foreground-muted">Coût cumulé</p>
      </div>
    </div>
  );
}

// ─── Modal nouveau ticket ─────────────────────────────────────────────────────

function NewIssueModal({
  onClose,
  onSubmit,
  submitting,
}: {
  onClose: () => void;
  onSubmit: (title: string, description: string) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">Nouveau ticket</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground-muted hover:bg-surface-sunken hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">
              Titre <span className="text-danger">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Corriger le bug de pagination"
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Décrivez le problème ou la fonctionnalité…"
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-sunken transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!title.trim() || submitting}
            onClick={() => onSubmit(title.trim(), description.trim())}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Création…" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();

  const [project, setProject] = useState<ProjectOut | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [tickets, setTickets] = useState<TicketOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [contextExists, setContextExists] = useState<boolean | null>(null);
  const [showContextModal, setShowContextModal] = useState(false);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [creatingIssue, setCreatingIssue] = useState(false);

  const apiKey = getApiKey() ?? "";

  useEffect(() => {
    if (!apiKey) return;

    getProject(apiKey, projectId)
      .then(setProject)
      .catch((err) =>
        setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue")
      );

    getProjectContext(apiKey, projectId)
      .then(({ exists }) => setContextExists(exists))
      .catch(() => setContextExists(null));

    getProjectStats(apiKey, projectId)
      .then(setStats)
      .catch(() => setStats(null));

    listIssues(apiKey, projectId)
      .then(setIssues)
      .catch(() => setIssues([]));

    listTickets(apiKey, projectId)
      .then(setTickets)
      .catch(() => setTickets([]));
  }, [projectId, apiKey]);

  const ticketsByIdentifier: Record<string, TicketSummary> = {};
  for (const t of tickets) {
    ticketsByIdentifier[t.id] = {
      pr_url: t.pr_url, pr_title: t.pr_title,
      cost_display: t.cost_display, display_currency: t.display_currency,
    };
  }

  async function handleCreateIssue(title: string, description: string) {
    setCreatingIssue(true);
    try {
      // Backlog par design : c'est au user de faire passer le ticket en Todo
      // (triage manuel) via le Kanban pour déclencher le worker.
      const issue = await createIssue(apiKey, projectId, { title, description, state: "Backlog" });
      setIssues((prev) => (prev ? [...prev, issue] : [issue]));
      setShowNewIssue(false);
    } catch {
      // silently ignore — l'utilisateur peut réessayer
    } finally {
      setCreatingIssue(false);
    }
  }

  function handleMoveIssue(issueId: string, newState: string) {
    const previous = issues;
    setIssues((prev) => (prev ? prev.map((i) => (i.id === issueId ? { ...i, state: newState } : i)) : prev));
    updateIssue(apiKey, projectId, issueId, { state: newState }).catch(() => {
      setIssues(previous);
    });
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[calc(100vh-3.5rem)] flex-col bg-surface lg:min-h-screen">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-bg">
            <svg className="h-7 w-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-foreground">{error}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-sunken transition-colors"
          >
            ← Retour aux projets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-8">
      {/* Loading skeleton */}
      {project === null && (
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-sunken" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-sunken" />
            ))}
          </div>
        </div>
      )}

      {project !== null && (
        <>
          {/* ── Context card ── */}
          {contextExists === true && (
            <div className="mb-6">
              <ProjectContextCard
                projectId={projectId}
                onContextUpdated={() => setContextExists(true)}
              />
            </div>
          )}

          {/* ── Context banner ── */}
          {contextExists === false && !showContextModal && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-warning-border bg-warning-bg px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <svg className="h-4 w-4 shrink-0 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-warning">
                  Ce projet n&apos;a pas encore de fichier de contexte.{" "}
                  <span className="font-medium">Alexis travaillera mieux avec un <code className="font-mono">.alexis/project.md</code>.</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowContextModal(true)}
                className="shrink-0 rounded-lg bg-warning px-3 py-1.5 text-xs font-semibold text-white hover:bg-warning/90 transition-colors"
              >
                Générer maintenant
              </button>
            </div>
          )}

          {/* ── Context modal ── */}
          {showContextModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
              <div className="relative w-full max-w-lg rounded-2xl bg-surface shadow-xl overflow-y-auto max-h-[90vh] p-6 sm:p-8">
                <button
                  type="button"
                  onClick={() => setShowContextModal(false)}
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
                  onDone={() => {
                    setShowContextModal(false);
                    setContextExists(true);
                  }}
                  onSkip={() => setShowContextModal(false)}
                />
              </div>
            </div>
          )}

          {/* ── Project header ── */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                {project.is_active && (
                  <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-3 py-1 text-xs font-semibold text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    Actif
                  </span>
                )}
              </div>
              <p className="mt-1 font-mono text-sm text-foreground-muted">{project.repo_url}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                "flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium text-foreground-muted capitalize"
              )}>
                {project.forge_provider}
              </span>
              <span className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium text-foreground-muted">
                {project.agent_choice}
              </span>
              {project.is_active && (
                <button
                  onClick={async () => {
                    if (!confirm("Désactiver ce projet ? Le polling s'arrêtera.")) return;
                    setDeactivating(true);
                    try {
                      await deleteProject(apiKey, projectId);
                      router.push("/dashboard");
                    } catch {
                      setDeactivating(false);
                    }
                  }}
                  disabled={deactivating}
                  className="rounded-lg border border-danger-border bg-danger-bg px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50 transition-colors"
                >
                  {deactivating ? "Désactivation…" : "Désactiver"}
                </button>
              )}
            </div>
          </div>

          {/* ── KPI strip ── */}
          {stats && (
            <div className="mt-8">
              <KpiStrip stats={stats} />
            </div>
          )}

          {/* ── Liste des demandes ── */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-foreground">Tickets</h2>
              <div className="flex items-center gap-3">
                {issues === null && (
                  <div className="flex items-center gap-2 text-xs text-foreground-muted">
                    <div className="h-3 w-3 animate-spin rounded-full border border-border border-t-brand" />
                    Chargement…
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowNewIssue(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-hover"
                >
                  <Plus className="h-4 w-4" />
                  Demander une modification
                </button>
              </div>
            </div>

            {issues !== null && (
              <TicketKanban
                issues={issues}
                states={project.states}
                projectId={projectId}
                onMoveIssue={handleMoveIssue}
                ticketsByIdentifier={ticketsByIdentifier}
              />
            )}
          </div>
        </>
      )}

      {/* ── Modal nouveau ticket ── */}
      {showNewIssue && (
        <NewIssueModal
          onClose={() => setShowNewIssue(false)}
          onSubmit={handleCreateIssue}
          submitting={creatingIssue}
        />
      )}
    </div>
  );
}
