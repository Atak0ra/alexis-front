"use client";

import Link from "next/link";
import { type AdminRecentRun } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "done" ? "bg-success/10 text-success" :
    status === "failed" ? "bg-danger/10 text-danger" :
    "bg-warning/10 text-warning";
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", cls)}>{status}</span>;
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-sm text-foreground-muted">{label}</dt>
      <dd className="text-right text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function RunDetailModal({ run, onClose }: { run: AdminRecentRun; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="font-mono text-sm font-bold text-foreground">{run.identifier}</p>
            <p className="mt-0.5 text-xs text-foreground-muted">{run.step} · <StatusBadge status={run.status} /></p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-foreground-muted hover:bg-surface-sunken hover:text-foreground transition-colors"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">Informations</h3>
            <dl className="space-y-2">
              <Row label="Client" value={
                <Link href={`/admin/clients/${run.client_id}`} className="text-brand hover:underline">
                  {run.client_email}
                </Link>
              } />
              <Row label="Projet" value={run.project_name} />
              <Row label="Step" value={run.step} />
              <Row label="Statut" value={<StatusBadge status={run.status} />} />
              <Row label="Date" value={new Date(run.created_at).toLocaleString("fr-FR")} />
            </dl>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">Métriques</h3>
            <dl className="space-y-2">
              <Row label="Modèle" value={<span className="font-mono text-xs">{run.model ?? "—"}</span>} />
              <Row label="Coût" value={run.cost_usd != null ? `$${run.cost_usd.toFixed(6)}` : "—"} />
              <Row label="Durée" value={run.duration_ms != null ? fmtMs(run.duration_ms) : "—"} />
            </dl>
          </section>

          {run.error && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-danger">Erreur</h3>
              <pre className="max-h-64 overflow-y-auto rounded-xl bg-danger/5 p-4 text-xs text-danger whitespace-pre-wrap break-words">
                {run.error}
              </pre>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4">
          <Link
            href={`/admin/clients/${run.client_id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-sunken transition-colors"
          >
            Voir la fiche client →
          </Link>
        </div>
      </div>
    </div>
  );
}
