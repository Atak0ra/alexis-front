"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  adminGetDashboardSummary, adminGetSpendSeries, adminGetKpis,
  adminGetCostByModel, adminGetCostByStep, adminGetSuccessByStep,
  adminGetTopClients, adminGetRecentRuns,
  AdminDashboardSummary, AdminSpendSeries, AdminKpis,
  AdminCostByModelItem, AdminCostByStepItem, AdminSuccessByStepItem,
  AdminTopClientItem, AdminRecentRun, AlexisApiError,
} from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminCard } from "../_components/chrome";
import { cn } from "@/lib/utils";

// ── Types & helpers ───────────────────────────────────────────────────────────

type Preset = "7d" | "30d" | "90d" | "12m" | "custom";

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeForPreset(preset: Exclude<Preset, "custom">): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  if (preset === "7d") start.setDate(start.getDate() - 6);
  else if (preset === "30d") start.setDate(start.getDate() - 29);
  else if (preset === "90d") start.setDate(start.getDate() - 89);
  else start.setMonth(start.getMonth() - 12);
  return { start: toDateString(start), end: toDateString(end) };
}

function formatBucket(bucket: string, granularity: AdminSpendSeries["granularity"]): string {
  const d = new Date(`${bucket}T00:00:00`);
  if (granularity === "month") return d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function fmtCurrency(value: number, currency: string): string {
  return `${value.toFixed(2)} ${currency}`;
}

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)} %`;
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "7d", label: "7j" },
  { value: "30d", label: "30j" },
  { value: "90d", label: "90j" },
  { value: "12m", label: "12 mois" },
  { value: "custom", label: "Personnalisé" },
];

const DEFAULT_RANGE = rangeForPreset("30d");

const PIE_COLORS = ["#4F46E5", "#7C3AED", "#2563EB", "#0891B2", "#059669", "#D97706", "#DC2626"];

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <AdminCard className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">{label}</p>
      <p className={cn("mt-1.5 text-2xl font-bold", accent ? "text-brand" : "text-foreground")}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-foreground-muted">{sub}</p>}
    </AdminCard>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "done" ? "bg-success/10 text-success" :
    status === "failed" ? "bg-danger/10 text-danger" :
    "bg-warning/10 text-warning";
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", cls)}>{status}</span>;
}

// ── Run Detail Modal ──────────────────────────────────────────────────────────

function RunDetailModal({ run, onClose }: { run: AdminRecentRun; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
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
          {/* Infos principales */}
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

          {/* Métriques */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">Métriques</h3>
            <dl className="space-y-2">
              <Row label="Modèle" value={<span className="font-mono text-xs">{run.model ?? "—"}</span>} />
              <Row label="Coût" value={run.cost_usd != null ? `$${run.cost_usd.toFixed(6)}` : "—"} />
              <Row label="Durée" value={run.duration_ms != null ? fmtMs(run.duration_ms) : "—"} />
            </dl>
          </section>

          {/* Erreur */}
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-sm text-foreground-muted">{label}</dt>
      <dd className="text-right text-sm text-foreground">{value}</dd>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [spend, setSpend] = useState<AdminSpendSeries | null>(null);
  const [kpis, setKpis] = useState<AdminKpis | null>(null);
  const [costByModel, setCostByModel] = useState<AdminCostByModelItem[]>([]);
  const [costByStep, setCostByStep] = useState<AdminCostByStepItem[]>([]);
  const [successByStep, setSuccessByStep] = useState<AdminSuccessByStepItem[]>([]);
  const [topClients, setTopClients] = useState<AdminTopClientItem[]>([]);
  const [recentRuns, setRecentRuns] = useState<AdminRecentRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<AdminRecentRun | null>(null);
  const [preset, setPreset] = useState<Preset>("30d");
  const [customStart, setCustomStart] = useState(DEFAULT_RANGE.start);
  const [customEnd, setCustomEnd] = useState(DEFAULT_RANGE.end);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [stepFilter, setStepFilter] = useState<string>("");

  const range = useMemo(() => {
    if (preset === "custom") return { start: customStart, end: customEnd };
    return rangeForPreset(preset);
  }, [preset, customStart, customEnd]);

  // Summary (pas de filtre date)
  useEffect(() => {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    adminGetDashboardSummary(apiKey)
      .then(setSummary)
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"));
  }, []);

  // Données filtrées par période
  useEffect(() => {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    const { start, end } = range;
    setError(null);
    Promise.all([
      adminGetSpendSeries(apiKey, start, end),
      adminGetKpis(apiKey, start, end),
      adminGetCostByModel(apiKey, start, end),
      adminGetCostByStep(apiKey, start, end),
      adminGetSuccessByStep(apiKey, start, end),
      adminGetTopClients(apiKey, start, end, 5),
    ])
      .then(([s, k, cbm, cbs, sbs, tc]) => {
        setSpend(s); setKpis(k); setCostByModel(cbm);
        setCostByStep(cbs); setSuccessByStep(sbs); setTopClients(tc);
      })
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"));
  }, [range.start, range.end]);

  // Derniers runs (filtrables indépendamment)
  useEffect(() => {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    adminGetRecentRuns(apiKey, {
      limit: 50,
      status: statusFilter || undefined,
      step: stepFilter || undefined,
    })
      .then(setRecentRuns)
      .catch(() => {});
  }, [statusFilter, stepFilter]);

  const chartData = spend
    ? spend.series.map((p) => ({ ...p, label: formatBucket(p.bucket, spend.granularity) }))
    : [];

  const currency = kpis?.display_currency ?? "EUR";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cockpit</h1>
        <p className="mt-1 text-sm text-foreground-muted">Vue d&apos;ensemble et pilotage de l&apos;activité.</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* ── Sélecteur de période ── */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPreset(p.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              preset === p.value
                ? "bg-brand text-white"
                : "border border-border bg-surface-raised text-foreground-muted hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
        {preset === "custom" && (
          <>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-foreground" />
            <span className="text-sm text-foreground-muted">→</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-foreground" />
          </>
        )}
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Clients" value={summary ? String(summary.client_count) : "—"} />
        <KpiCard label="Projets" value={summary ? String(summary.project_count) : "—"} />
        <KpiCard label={`Coût (${currency})`} value={kpis ? fmtCurrency(kpis.total_cost_display, currency) : "—"} accent />
        <KpiCard label="Runs" value={kpis ? String(kpis.run_count) : "—"}
          sub={kpis ? `✓ ${fmtPct(kpis.success_rate)} · ✗ ${fmtPct(kpis.failure_rate)}` : undefined} />
        <KpiCard label="MRR (€)" value={kpis ? `${kpis.mrr_eur} €` : "—"} />
        <KpiCard label={`Marge est. (${currency})`}
          value={kpis ? fmtCurrency(kpis.margin_display, currency) : "—"}
          sub={kpis ? `Coût moy. $${kpis.avg_cost_per_run_usd.toFixed(4)}/run · ${fmtMs(kpis.avg_duration_ms)}` : undefined}
          accent={kpis ? kpis.margin_display > 0 : false} />
      </div>

      {/* ── Courbe dépenses + Donut modèles ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <AdminCard className="p-5 lg:col-span-2">
          <p className="mb-4 text-sm font-semibold text-foreground">Dépenses dans le temps</p>
          <div className="h-64">
            {!spend ? (
              <div className="h-full animate-pulse rounded-lg bg-surface-sunken" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#71717A" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717A" }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip formatter={(v) => [`$${Number(v).toFixed(4)}`, "Coût"]} contentStyle={{ borderRadius: 12, borderColor: "#E4E4E7" }} />
                  <Area type="monotone" dataKey="cost_usd" stroke="#4F46E5" fill="url(#spendGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </AdminCard>

        <AdminCard className="p-5">
          <p className="mb-4 text-sm font-semibold text-foreground">Runs par modèle</p>
          <div className="h-64">
            {costByModel.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-foreground-muted">Aucune donnée</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={costByModel} dataKey="run_count" nameKey="model" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, percent }) => `${String(name).split("/").pop()?.split("-")[0] ?? name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {costByModel.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, name) => [`${v} runs`, String(name)]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </AdminCard>
      </div>

      {/* ── Coût par step + Succès/échecs ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard className="p-5">
          <p className="mb-4 text-sm font-semibold text-foreground">Coût par step ($)</p>
          <div className="h-56">
            {costByStep.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-foreground-muted">Aucune donnée</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costByStep} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#71717A" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="step" tick={{ fontSize: 11, fill: "#71717A" }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip formatter={(v) => [`$${Number(v).toFixed(4)}`, "Coût"]} />
                  <Bar dataKey="cost_usd" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </AdminCard>

        <AdminCard className="p-5">
          <p className="mb-4 text-sm font-semibold text-foreground">Succès / Échecs par step</p>
          <div className="h-56">
            {successByStep.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-foreground-muted">Aucune donnée</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={successByStep}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
                  <XAxis dataKey="step" tick={{ fontSize: 11, fill: "#71717A" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717A" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="success" name="Succès" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" name="Échecs" fill="#DC2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </AdminCard>
      </div>

      {/* ── Top clients ── */}
      {topClients.length > 0 && (
        <AdminCard className="p-5">
          <p className="mb-4 text-sm font-semibold text-foreground">Top clients par dépense</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-foreground-subtle">
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 text-right font-medium">Coût ($)</th>
              </tr>
            </thead>
            <tbody>
              {topClients.map((c) => (
                <tr key={c.client_id} className="border-b border-border/50 last:border-0">
                  <td className="py-2">
                    <Link href={`/admin/clients/${c.client_id}`} className="text-foreground-muted hover:text-brand hover:underline">
                      {c.email}
                    </Link>
                  </td>
                  <td className="py-2 text-right font-mono text-foreground">${c.cost_usd.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}

      {/* ── Derniers runs ── */}
      <AdminCard className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">Derniers runs</p>
          <div className="flex gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-foreground">
              <option value="">Tous statuts</option>
              <option value="done">done</option>
              <option value="failed">failed</option>
              <option value="in_progress">in_progress</option>
            </select>
            <select value={stepFilter} onChange={(e) => setStepFilter(e.target.value)}
              className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-foreground">
              <option value="">Tous steps</option>
              {["spec", "plan", "dev", "merge", "chat"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
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
                <th className="pb-2 text-right font-medium">Coût ($)</th>
                <th className="pb-2 text-right font-medium">Durée</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.length === 0 ? (
                <tr><td colSpan={9} className="py-6 text-center text-foreground-muted">Aucun run</td></tr>
              ) : recentRuns.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedRun(r)}
                  className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-surface-sunken/50 transition-colors"
                >
                  <td className="py-2 font-mono text-xs text-foreground">{r.identifier}</td>
                  <td className="py-2 text-foreground-muted">{r.client_email}</td>
                  <td className="py-2 text-foreground-muted">{r.project_name}</td>
                  <td className="py-2 text-foreground-muted">{r.step}</td>
                  <td className="py-2"><StatusBadge status={r.status} /></td>
                  <td className="py-2 font-mono text-xs text-foreground-muted">
                    {r.model ? r.model.split("/").pop()?.split("-").slice(0, 2).join("-") ?? r.model : "—"}
                  </td>
                  <td className="py-2 text-right font-mono text-xs">{r.cost_usd != null ? `$${r.cost_usd.toFixed(4)}` : "—"}</td>
                  <td className="py-2 text-right text-xs text-foreground-muted">{r.duration_ms != null ? fmtMs(r.duration_ms) : "—"}</td>
                  <td className="py-2 text-xs text-foreground-muted">{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-foreground-muted">Cliquez sur une ligne pour voir le détail.</p>
      </AdminCard>

      {/* ── Modale détail run ── */}
      {selectedRun && (
        <RunDetailModal run={selectedRun} onClose={() => setSelectedRun(null)} />
      )}
    </div>
  );
}
