"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
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
  uploadIssueAsset,
  AlexisApiError,
  friendlyError,
  type ProjectOut,
  type ProjectStats,
  type Issue,
  type TicketOut,
} from "@/lib/api-client";
import TicketKanban, { type TicketSummary } from "@/components/ticket-kanban";
import AssetUploadGrid from "@/components/asset-upload-grid";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useNotificationsContext } from "@/lib/notifications-context";
import { Plus } from "lucide-react";

// ─── KPI strip ────────────────────────────────────────────────────────────────

function KpiStrip({ stats }: { stats: ProjectStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="rounded-xl border border-success-border bg-success-bg p-4 text-center">
        <p className="text-3xl font-bold text-success" aria-label={`${stats.resolved} résolus`}>{stats.resolved}</p>
        <p className="mt-1 text-xs font-medium text-success/70" aria-hidden="true">Résolus</p>
      </div>
      <div className="rounded-xl border border-warning-border bg-warning-bg p-4 text-center">
        <p className="text-3xl font-bold text-warning" aria-label={`${stats.in_progress} en cours`}>{stats.in_progress}</p>
        <p className="mt-1 text-xs font-medium text-warning/70" aria-hidden="true">En cours</p>
      </div>
      <div className="rounded-xl border border-danger-border bg-danger-bg p-4 text-center">
        <p className="text-3xl font-bold text-danger" aria-label={`${stats.failed} échecs`}>{stats.failed}</p>
        <p className="mt-1 text-xs font-medium text-danger/70" aria-hidden="true">Échecs</p>
      </div>
      <div className="rounded-xl border border-border bg-surface-raised p-4 text-center">
        <p className="font-mono text-3xl font-bold text-foreground">
          ${(stats.total_cost_usd ?? 0).toFixed(4)}
        </p>
        <p className="mt-1 text-xs font-medium text-foreground-muted">Coût cumulé</p>
      </div>
    </div>
  );
}

// ─── Modal nouveau ticket ─────────────────────────────────────────────────────

function NewIssueModal({
  open,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, files: File[]) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const titleId = useId();
  const descId = useId();
  const MAX_STAGED_FILES = 5;

  // Reset fields when modal opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setStagedFiles([]);
    }
  }, [open]);

  // Resolve staged-file preview URLs once per file-list change, not on every
  // render — AssetUploadGrid calls contentUrl() during render, so creating a
  // blob URL inline there would leak a new one on every keystroke.
  const stagedPreviewUrls = useMemo(() => {
    const urls: Record<string, string> = {};
    stagedFiles.forEach((file, i) => {
      urls[`staged-${i}`] = URL.createObjectURL(file);
    });
    return urls;
  }, [stagedFiles]);

  useEffect(() => {
    return () => {
      Object.values(stagedPreviewUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [stagedPreviewUrls]);

  return (
    <Modal open={open} onClose={onClose} title="Nouveau ticket" titleId="new-issue-title">
      <div className="space-y-4">
        <div>
          <label htmlFor={titleId} className="block text-sm font-medium text-foreground mb-1.5">
            Titre <span className="text-danger" aria-hidden="true">*</span>
            <span className="sr-only">(requis)</span>
          </label>
          <input
            id={titleId}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Corriger le bug de pagination"
            required
            aria-required="true"
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label htmlFor={descId} className="block text-sm font-medium text-foreground mb-1.5">
            Description
          </label>
          <textarea
            id={descId}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Décrivez le problème ou la fonctionnalité…"
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Maquette / visuel (optionnel)
          </label>
          <AssetUploadGrid
            assets={stagedFiles.map((f, i) => ({
              id: `staged-${i}`,
              filename: f.name,
              content_type: f.type,
              size_bytes: f.size,
              created_at: "",
            }))}
            onUpload={(file) =>
              setStagedFiles((prev) => (prev.length < MAX_STAGED_FILES ? [...prev, file] : prev))
            }
            contentUrl={(id) => stagedPreviewUrls[id] ?? ""}
            uploading={false}
          />
          <p className="mt-1.5 text-xs text-foreground-subtle">5 fichiers maximum</p>
        </div>
      </div>
      <ModalFooter className="flex justify-end gap-3">
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
          onClick={() => onSubmit(title.trim(), description.trim(), stagedFiles)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Création…" : "Créer"}
        </button>
      </ModalFooter>
    </Modal>
  );
}

// ─── Confirm deactivate modal ─────────────────────────────────────────────────

function ConfirmDeactivateModal({
  open,
  onClose,
  onConfirm,
  deactivating,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deactivating: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Désactiver ce projet ?" titleId="confirm-deactivate-title" maxWidth="max-w-sm">
      <p className="text-sm text-foreground-muted">
        Le polling s&apos;arrêtera. Vous pourrez réactiver le projet depuis les paramètres.
      </p>
      <ModalFooter className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-sunken transition-colors"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={deactivating}
          onClick={onConfirm}
          className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-50 transition-colors"
        >
          {deactivating ? "Désactivation…" : "Désactiver"}
        </button>
      </ModalFooter>
    </Modal>
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
  const [showConfirmDeactivate, setShowConfirmDeactivate] = useState(false);
  const [contextExists, setContextExists] = useState<boolean | null>(null);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [creatingIssue, setCreatingIssue] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const apiKey = getApiKey() ?? "";

  useEffect(() => {
    if (!apiKey) return;

    getProject(apiKey, projectId)
      .then(setProject)
      .catch((err) =>
        setError(friendlyError(err))
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

  // Applique en direct les transitions d'état poussées par le backend (SSE) sur
  // le Kanban — sans ça `issues` reste figé sur le snapshot du mount : une notif
  // "Spec" arrive dans la cloche mais la carte reste en "Todo" tant que la page
  // n'est pas rechargée manuellement.
  const { notifications } = useNotificationsContext();
  useEffect(() => {
    if (notifications.length === 0) return;
    setIssues((prev) => {
      if (!prev) return prev;
      let changed = false;
      const next = prev.map((issue) => {
        // `notifications` est trié du plus récent au plus ancien — le premier
        // match est donc le dernier état connu pour ce ticket.
        const latest = notifications.find((n) => n.project_id === projectId && n.issue_id === issue.id);
        if (latest && latest.state !== issue.state) {
          changed = true;
          return { ...issue, state: latest.state };
        }
        return issue;
      });
      return changed ? next : prev;
    });
  }, [notifications, projectId]);

  const ticketsByIdentifier: Record<string, TicketSummary> = {};
  for (const t of tickets) {
    ticketsByIdentifier[t.id] = {
      pr_url: t.pr_url, pr_title: t.pr_title,
      cost_usd: t.cost_usd,
    };
  }

  async function handleCreateIssue(title: string, description: string, files: File[]) {
    setCreatingIssue(true);
    setCreateError(null);
    try {
      const issue = await createIssue(apiKey, projectId, { title, description, state: "Backlog" });
      // Le ticket est créé côté backend à ce stade : on le rend visible et on
      // ferme la modale immédiatement, avant de tenter les uploads. Un échec
      // d'upload d'un fichier joint ne doit ni annuler la création ni bloquer
      // les fichiers suivants — sinon le ticket reste "orphelin" (créé côté
      // backend mais invisible) et un nouveau clic sur "Créer" en crée un doublon.
      setIssues((prev) => (prev ? [...prev, issue] : [issue]));
      setShowNewIssue(false);
      for (const file of files) {
        await uploadIssueAsset(apiKey, projectId, issue.id, file).catch(() => {
          // Échec d'upload individuel : ignoré, on continue avec les fichiers suivants.
        });
      }
    } catch (err) {
      setCreateError(err instanceof AlexisApiError ? err.detail : "Impossible de créer le ticket. Réessayez.");
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

  async function handleDeactivate() {
    setDeactivating(true);
    try {
      await deleteProject(apiKey, projectId);
      router.push("/dashboard");
    } catch {
      setDeactivating(false);
      setShowConfirmDeactivate(false);
    }
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[calc(100vh-3.5rem)] flex-col bg-surface lg:min-h-screen">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-bg">
            <svg className="h-7 w-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-sunken" />
            ))}
          </div>
        </div>
      )}

      {project !== null && (
        <>
          {/* ── Context banner (contexte pas encore généré — une fois généré, il
              se consulte uniquement via l'onglet "Contexte" du menu latéral) ── */}
          {contextExists === false && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-warning-border bg-warning-bg px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <svg className="h-4 w-4 shrink-0 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-warning">
                  Ce projet n&apos;a pas encore de fichier de contexte.{" "}
                  <span className="font-medium">Alexis travaillera mieux avec un <code className="font-mono">.alexis/project.md</code>.</span>
                </p>
              </div>
              <Link
                href={`/dashboard/${projectId}/context`}
                className="shrink-0 rounded-lg bg-warning px-3 py-1.5 text-xs font-semibold text-white hover:bg-warning/90 transition-colors"
              >
                Générer maintenant
              </Link>
            </div>
          )}

          {/* ── Project header ── */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                {project.is_active && (
                  <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-3 py-1 text-xs font-semibold text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
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
              {project.agent_choice && (
                <span className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium text-foreground-muted">
                  {project.agent_choice}
                </span>
              )}
              {project.is_active && (
                <button
                  type="button"
                  onClick={() => setShowConfirmDeactivate(true)}
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
                  <div className="flex items-center gap-2 text-xs text-foreground-muted" aria-live="polite" aria-label="Chargement des tickets">
                    <div className="h-3 w-3 animate-spin rounded-full border border-border border-t-brand" aria-hidden="true" />
                    Chargement…
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowNewIssue(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-hover"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Demander une modification
                </button>
              </div>
            </div>

            {/* Error from ticket creation — announced to screen readers */}
            {createError && (
              <p role="alert" className="mb-4 rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
                {createError}
              </p>
            )}

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
      <NewIssueModal
        open={showNewIssue}
        onClose={() => { setShowNewIssue(false); setCreateError(null); }}
        onSubmit={handleCreateIssue}
        submitting={creatingIssue}
      />

      {/* ── Confirm deactivate modal ── */}
      <ConfirmDeactivateModal
        open={showConfirmDeactivate}
        onClose={() => setShowConfirmDeactivate(false)}
        onConfirm={handleDeactivate}
        deactivating={deactivating}
      />
    </div>
  );
}
