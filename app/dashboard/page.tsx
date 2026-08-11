"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiKey } from "@/lib/session";
import { listProjects, getProjectStats, getMe, getWallet, type ProjectOut, type ProjectStats, type WalletOut } from "@/lib/api-client";
import NewProjectCTA from "@/components/new-project-cta";

type StatsState = ProjectStats | "unavailable" | null;

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "brand" | "success" | "warning" | "danger";
}) {
  const colorMap = {
    brand: "bg-brand-light text-brand",
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
    danger: "bg-danger-bg text-danger",
  };
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-raised p-5 shadow-card">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", colorMap[color])}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="mt-0.5 text-sm text-foreground-muted">{label}</p>
      </div>
    </div>
  );
}

// ─── Status bar ──────────────────────────────────────────────────────────────

function StatusBar({ stats }: { stats: ProjectStats }) {
  const total = stats.resolved + stats.in_progress + stats.failed;
  if (total === 0) return null;
  const resolvedPct = (stats.resolved / total) * 100;
  const inProgressPct = (stats.in_progress / total) * 100;
  const failedPct = (stats.failed / total) * 100;
  return (
    <div className="mt-4 flex h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
      <div className="bg-success transition-all" style={{ width: `${resolvedPct}%` }} />
      <div className="bg-warning transition-all" style={{ width: `${inProgressPct}%` }} />
      <div className="bg-danger transition-all" style={{ width: `${failedPct}%` }} />
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, stats }: { project: ProjectOut; stats: StatsState }) {
  const forgeIcon = project.forge_provider === "github" ? (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  ) : (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z" />
    </svg>
  );

  return (
    <Link
      href={`/dashboard/${project.id}`}
      className="group flex flex-col rounded-xl border border-border bg-surface-raised p-6 shadow-card transition-all hover:border-brand/40 hover:shadow-card-hover"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-semibold text-foreground group-hover:text-brand transition-colors">
              {project.name}
            </span>
            {project.is_active && (
              <span className="flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Actif
              </span>
            )}
          </div>
          <p className="mt-1 truncate font-mono text-xs text-foreground-subtle">
            {project.repo_url}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-foreground-muted">
          {forgeIcon}
          <span className="text-xs font-medium capitalize">{project.forge_provider}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5">
        {stats === null && (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 animate-spin rounded-full border border-border border-t-brand" />
            <span className="text-xs text-foreground-subtle">Chargement des stats…</span>
          </div>
        )}
        {stats === "unavailable" && (
          <p className="text-xs text-foreground-subtle">Statistiques bientôt disponibles</p>
        )}
        {stats && stats !== "unavailable" && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-success-bg px-3 py-2.5 text-center">
                <p className="text-xl font-bold text-success">{stats.resolved}</p>
                <p className="mt-0.5 text-xs text-success/70">Résolus</p>
              </div>
              <div className="rounded-lg bg-warning-bg px-3 py-2.5 text-center">
                <p className="text-xl font-bold text-warning">{stats.in_progress}</p>
                <p className="mt-0.5 text-xs text-warning/70">En cours</p>
              </div>
              <div className="rounded-lg bg-danger-bg px-3 py-2.5 text-center">
                <p className="text-xl font-bold text-danger">{stats.failed}</p>
                <p className="mt-0.5 text-xs text-danger/70">Échecs</p>
              </div>
            </div>
            <StatusBar stats={stats} />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-foreground-muted">Coût cumulé</span>
              <span className="font-mono text-sm font-semibold text-foreground">
                ${(stats.total_cost_usd ?? 0).toFixed(4)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs text-foreground-subtle">
          Agent : <span className="font-medium text-foreground-muted">{project.agent_choice}</span>
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
          Voir les tickets
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectOut[] | null>(null);
  const [stats, setStats] = useState<Record<string, StatsState>>({});
  const [emailVerified, setEmailVerified] = useState(true);
  const [wallet, setWallet] = useState<WalletOut | null>(null);

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    getMe(apiKey)
      .then((me) => {
        setEmailVerified(me.email_verified);
        // BYOK (clé perso) ou pas de plan du tout = jamais de wallet à afficher.
        if (me.plan && !me.plan.requires_own_key) {
          getWallet(apiKey).then(setWallet).catch(() => {/* fail-open */});
        }
      })
      .catch(() => {/* fail-open */});

    listProjects(apiKey).then((result) => {
      setProjects(result);
      for (const project of result) {
        getProjectStats(apiKey, project.id)
          .then((s) => setStats((prev) => ({ ...prev, [project.id]: s })))
          .catch(() => setStats((prev) => ({ ...prev, [project.id]: "unavailable" })));
      }
    });
  }, []);

  // Aggregate KPIs
  const allStats = Object.values(stats).filter((s): s is ProjectStats => !!s && s !== "unavailable");
  const totalResolved = allStats.reduce((acc, s) => acc + s.resolved, 0);
  const totalInProgress = allStats.reduce((acc, s) => acc + s.in_progress, 0);
  const totalFailed = allStats.reduce((acc, s) => acc + s.failed, 0);
  const totalCost = allStats.reduce((acc, s) => acc + (s.total_cost_usd ?? 0), 0);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-8">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Vue d&apos;ensemble de vos projets
          </p>
        </div>
        <NewProjectCTA
          emailVerified={emailVerified}
          href="/projects/new/choice"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-hover hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded bg-white/15">
            <FolderPlus className="h-3.5 w-3.5" />
          </span>
          Nouveau projet
        </NewProjectCTA>
      </div>

      {/* Solde wallet — uniquement pour les plans à clé gérée (pas BYOK) */}
      {wallet && (
        <Link
          href="/dashboard/account"
          className={cn(
            "mt-6 flex items-center justify-between rounded-xl border px-5 py-3.5 transition-colors",
            wallet.balance_usd < 10
              ? "border-danger-border bg-danger-bg hover:bg-danger-bg/80"
              : "border-border bg-surface-raised hover:bg-surface-sunken"
          )}
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">Solde wallet</p>
            <p className={cn("mt-0.5 font-mono text-lg font-semibold", wallet.balance_usd < 10 ? "text-danger" : "text-foreground")}>
              ${wallet.balance_usd.toFixed(2)}
            </p>
          </div>
          <span className="text-sm font-medium text-brand">
            {wallet.balance_usd < 10 ? "Solde bas — recharger →" : "Voir le détail →"}
          </span>
        </Link>
      )}

      {/* KPIs — only show when we have data */}
      {allStats.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard
            label="Tickets résolus"
            value={totalResolved}
            color="success"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <KpiCard
            label="En cours"
            value={totalInProgress}
            color="warning"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <KpiCard
            label="Échecs"
            value={totalFailed}
            color="danger"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <KpiCard
            label="Coût total"
            value={`$${totalCost.toFixed(4)}`}
            color="brand"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Projects section */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Projets</h2>
          {projects !== null && (
            <span className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs font-medium text-foreground-muted">
              {projects.length} projet{projects.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Loading */}
        {projects === null && (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 animate-pulse rounded-xl border border-border bg-surface-raised" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {projects !== null && projects.length === 0 && (
          <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-border bg-surface-raised px-8 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light">
              <svg className="h-7 w-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Aucun projet</h3>
            <p className="mt-2 max-w-sm text-sm text-foreground-muted">
              Créez un projet pour qu&apos;Alexis commence à traiter vos tickets, avec votre propre dépôt, ou un dépôt hébergé par Alexis si vous n&apos;en avez pas.
            </p>
            <Link
            href="/projects/new/choice"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-hover transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Créer mon premier projet
            </Link>
          </div>
        )}

        {/* Project grid */}
        {projects !== null && projects.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                stats={stats[project.id] ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
