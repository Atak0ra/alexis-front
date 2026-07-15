"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getApiKey } from "@/lib/session";
import {
  getProject,
  getProjectStats,
  getProjectTickets,
  deleteProject,
  AlexisApiError,
  type ProjectOut,
  type ProjectStats,
  type Ticket,
  type TicketStatus,
} from "@/lib/api-client";
import { AppHeader } from "@/components/app-header";

// ─── Settings icon ────────────────────────────────────────────────────────────
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TicketStatus }) {
  const map: Record<TicketStatus, { label: string; className: string }> = {
    resolved: {
      label: "Résolu",
      className: "bg-success-bg text-success border border-success-border",
    },
    in_progress: {
      label: "En cours",
      className: "bg-warning-bg text-warning border border-warning-border",
    },
    failed: {
      label: "Échec",
      className: "bg-danger-bg text-danger border border-danger-border",
    },
  };
  const { label, className } = map[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>
      {label}
    </span>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────

function TicketCard({ ticket }: { ticket: Ticket }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface-raised shadow-card transition-shadow hover:shadow-card-hover">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-4 p-5 text-left"
      >
        {/* Status indicator */}
        <div
          className={cn(
            "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full",
            ticket.status === "resolved" && "bg-success",
            ticket.status === "in_progress" && "bg-warning",
            ticket.status === "failed" && "bg-danger"
          )}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-foreground-muted">
              {ticket.id}
            </span>
            <StatusBadge status={ticket.status} />
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground leading-snug">
            {ticket.title}
          </p>
        </div>

        {/* Cost + chevron */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-mono text-sm font-semibold text-foreground">
            ${ticket.cost_usd.toFixed(2)}
          </span>
          <svg
            className={cn(
              "h-4 w-4 text-foreground-muted transition-transform",
              expanded && "rotate-180"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          {/* Description */}
          <div className="rounded-lg bg-surface-sunken p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-2">
              Description
            </p>
            <p className="text-sm text-foreground leading-relaxed">{ticket.description}</p>
          </div>

          {/* Meta row */}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-foreground-muted">
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Agent : <span className="font-medium text-foreground">{ticket.agent}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Mis à jour le {formatDate(ticket.updated_at)}
            </span>
          </div>

          {/* PR link (resolved) */}
          {ticket.status === "resolved" && ticket.pr_url && (
            <a
              href={ticket.pr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-2 rounded-lg border border-success-border bg-success-bg px-4 py-3 text-sm font-medium text-success hover:bg-green-100 transition-colors"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="min-w-0 truncate">{ticket.pr_title ?? ticket.pr_url}</span>
            </a>
          )}

          {/* Error message (failed) */}
          {ticket.status === "failed" && ticket.error_message && (
            <div className="mt-4 rounded-lg border border-danger-border bg-danger-bg p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-danger mb-2">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Rapport d&apos;échec
              </p>
              <p className="text-sm text-danger/90 leading-relaxed">{ticket.error_message}</p>
            </div>
          )}

          {/* In progress indicator */}
          {ticket.status === "in_progress" && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-warning-border bg-warning-bg px-4 py-3">
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-warning/30 border-t-warning" />
              <p className="text-sm font-medium text-warning">
                L&apos;agent travaille sur ce ticket…
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color: "success" | "warning" | "danger";
}) {
  const countColor = {
    success: active ? "bg-success text-white" : "bg-success-bg text-success",
    warning: active ? "bg-warning text-white" : "bg-warning-bg text-warning",
    danger: active ? "bg-danger text-white" : "bg-danger-bg text-danger",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-white shadow-sm"
          : "text-foreground-muted hover:bg-surface-sunken hover:text-foreground"
      )}
    >
      {label}
      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", countColor[color])}>
        {count}
      </span>
    </button>
  );
}

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
          ${stats.total_cost_usd.toFixed(2)}
        </p>
        <p className="mt-1 text-xs font-medium text-foreground-muted">Coût cumulé</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ActiveTab = "resolved" | "in_progress" | "failed";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();

  const [project, setProject] = useState<ProjectOut | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("resolved");
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    getProject(apiKey, projectId)
      .then(setProject)
      .catch((err) =>
        setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue")
      );

    getProjectStats(apiKey, projectId)
      .then(setStats)
      .catch(() => setStats(null));

    getProjectTickets(apiKey, projectId)
      .then(setTickets)
      .catch(() => setTickets([]));
  }, [projectId]);

  const resolvedTickets = tickets?.filter((t) => t.status === "resolved") ?? [];
  const inProgressTickets = tickets?.filter((t) => t.status === "in_progress") ?? [];
  const failedTickets = tickets?.filter((t) => t.status === "failed") ?? [];

  const tabTickets: Record<ActiveTab, Ticket[]> = {
    resolved: resolvedTickets,
    in_progress: inProgressTickets,
    failed: failedTickets,
  };

  if (error) {
    return (
      <div className="flex h-screen flex-col bg-surface">
        <AppHeader />
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
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
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
          {/* Project header */}
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
              <span className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium text-foreground-muted capitalize">
                {project.forge_provider}
              </span>
              <span className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium text-foreground-muted">
                {project.agent_choice}
              </span>
              {/* Settings button */}
              <Link
                href={`/dashboard/${projectId}/settings`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium text-foreground-muted hover:bg-surface-sunken hover:text-foreground transition-colors"
              >
                <SettingsIcon className="h-4 w-4" />
                Paramètres
              </Link>
              {project.is_active && (
                <button
                  onClick={async () => {
                    if (!confirm("Désactiver ce projet ? Le polling s'arrêtera.")) return;
                    setDeactivating(true);
                    try {
                      const apiKey = getApiKey();
                      if (!apiKey) return;
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

          {/* KPI strip */}
          {stats && (
            <div className="mt-8">
              <KpiStrip stats={stats} />
            </div>
          )}

          {/* Tickets section */}
          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Tickets</h2>
              {tickets === null && (
                <div className="flex items-center gap-2 text-xs text-foreground-muted">
                  <div className="h-3 w-3 animate-spin rounded-full border border-border border-t-brand" />
                  Chargement…
                </div>
              )}
            </div>

            {/* Tabs */}
            {tickets !== null && (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  <TabButton
                    active={activeTab === "resolved"}
                    onClick={() => setActiveTab("resolved")}
                    label="Résolus"
                    count={resolvedTickets.length}
                    color="success"
                  />
                  <TabButton
                    active={activeTab === "in_progress"}
                    onClick={() => setActiveTab("in_progress")}
                    label="En cours"
                    count={inProgressTickets.length}
                    color="warning"
                  />
                  <TabButton
                    active={activeTab === "failed"}
                    onClick={() => setActiveTab("failed")}
                    label="Échecs"
                    count={failedTickets.length}
                    color="danger"
                  />
                </div>

                {/* Ticket list */}
                <div className="mt-5 space-y-3">
                  {tabTickets[activeTab].length === 0 ? (
                    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-surface-raised py-12 text-center">
                      <svg className="h-10 w-10 text-foreground-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="mt-3 text-sm font-medium text-foreground-muted">
                        Aucun ticket dans cette catégorie
                      </p>
                    </div>
                  ) : (
                    tabTickets[activeTab].map((ticket) => (
                      <TicketCard key={ticket.id} ticket={ticket} />
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
