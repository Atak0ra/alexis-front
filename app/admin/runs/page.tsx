"use client";

import { useEffect, useState } from "react";
import {
  adminGetRecentRuns, adminListClients, adminGetClient,
  type AdminRecentRun, type AdminClientListItem, type AdminProjectSummary,
  AlexisApiError,
} from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminCard } from "../_components/chrome";
import { StatusBadge, RunDetailModal, fmtMs } from "../_components/run-detail";

const PAGE_SIZE = 25;
const STEPS = ["spec", "plan", "dev", "merge", "chat"];

export default function AdminRunsPage() {
  const [clients, setClients] = useState<AdminClientListItem[]>([]);
  const [projects, setProjects] = useState<AdminProjectSummary[]>([]);
  const [clientFilter, setClientFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stepFilter, setStepFilter] = useState("");
  const [page, setPage] = useState(0);

  const [runs, setRuns] = useState<AdminRecentRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<AdminRecentRun | null>(null);

  // Liste des clients pour le filtre — une fois.
  useEffect(() => {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    adminListClients(apiKey).then(setClients).catch((err) => console.error("[admin-runs] list clients failed", err));
  }, []);

  // Projets du client sélectionné — filtre en cascade, pas de liste globale
  // de projets nécessaire côté API.
  useEffect(() => {
    setProjectFilter("");
    if (!clientFilter) {
      setProjects([]);
      return;
    }
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    adminGetClient(apiKey, clientFilter).then((c) => setProjects(c.projects)).catch(() => setProjects([]));
  }, [clientFilter]);

  // Revenir à la page 1 quand un filtre change.
  useEffect(() => {
    setPage(0);
  }, [clientFilter, projectFilter, statusFilter, stepFilter]);

  useEffect(() => {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    setLoading(true);
    adminGetRecentRuns(apiKey, {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      status: statusFilter || undefined,
      step: stepFilter || undefined,
      clientId: clientFilter || undefined,
      projectId: projectFilter || undefined,
    })
      .then(({ items, total: t }) => { setRuns(items); setTotal(t); })
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"))
      .finally(() => setLoading(false));
  }, [page, statusFilter, stepFilter, clientFilter, projectFilter]);

  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  const hasNext = to < total;
  const hasPrev = page > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Runs</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Historique complet des exécutions, filtrable par client et par projet.
        </p>
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <AdminCard className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrer par client"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">Tous clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.email}</option>
            ))}
          </select>

          <select
            aria-label="Filtrer par projet"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            disabled={!clientFilter}
            className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-foreground disabled:opacity-50"
          >
            <option value="">
              {clientFilter ? "Tous projets" : "Choisis d'abord un client"}
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            aria-label="Filtrer par statut"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">Tous statuts</option>
            <option value="done">done</option>
            <option value="failed">failed</option>
            <option value="in_progress">in_progress</option>
          </select>

          <select
            aria-label="Filtrer par step"
            value={stepFilter}
            onChange={(e) => setStepFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">Tous steps</option>
            {STEPS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-surface-sunken" />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-foreground-subtle">
                    <th className="pb-2 font-medium">Ticket</th>
                    <th className="pb-2 font-medium">Client</th>
                    <th className="pb-2 font-medium">Projet</th>
                    <th className="pb-2 font-medium">Step</th>
                    <th className="pb-2 font-medium">Statut</th>
                    <th className="pb-2 font-medium">Modèle</th>
                    <th className="pb-2 text-right font-medium">Coût</th>
                    <th className="pb-2 text-right font-medium">Durée</th>
                    <th className="pb-2 pl-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.length === 0 ? (
                    <tr><td colSpan={9} className="py-6 text-center text-foreground-muted">Aucun run</td></tr>
                  ) : runs.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-border/50 last:border-0 hover:bg-surface-sunken/50 transition-colors"
                    >
                      <td className="py-2 font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => setSelectedRun(r)}
                          aria-label={`Voir le détail du run ${r.identifier}`}
                          className="font-mono text-xs text-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand rounded"
                        >
                          {r.identifier}
                        </button>
                      </td>
                      <td className="py-2 text-foreground-muted">{r.client_email}</td>
                      <td className="py-2 text-foreground-muted">{r.project_name}</td>
                      <td className="py-2 text-foreground-muted">{r.step}</td>
                      <td className="py-2"><StatusBadge status={r.status} /></td>
                      <td className="py-2 font-mono text-xs text-foreground-muted">
                        {r.model ? r.model.split("/").pop()?.split("-").slice(0, 2).join("-") ?? r.model : "—"}
                      </td>
                      <td className="py-2 text-right font-mono text-xs">{r.cost_usd != null ? `$${r.cost_usd.toFixed(4)}` : "—"}</td>
                      <td className="py-2 text-right text-xs text-foreground-muted">{r.duration_ms != null ? fmtMs(r.duration_ms) : "—"}</td>
                      <td className="py-2 pl-4 text-xs text-foreground-muted">{new Date(r.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-foreground-muted">
                {total === 0 ? "Aucun run" : `${from}–${to} sur ${total}`}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-sunken disabled:opacity-40 disabled:pointer-events-none"
                >
                  ← Précédent
                </button>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-sunken disabled:opacity-40 disabled:pointer-events-none"
                >
                  Suivant →
                </button>
              </div>
            </div>
          </>
        )}
      </AdminCard>

      {selectedRun && (
        <RunDetailModal run={selectedRun} onClose={() => setSelectedRun(null)} />
      )}
    </div>
  );
}
