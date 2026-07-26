"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  adminGetDashboardSummary, adminGetSpendSeries,
  AdminDashboardSummary, AdminSpendSeries, AlexisApiError,
} from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminCard } from "../_components/chrome";

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
  if (granularity === "month") {
    return d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  }
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "7d", label: "7j" },
  { value: "30d", label: "30j" },
  { value: "90d", label: "90j" },
  { value: "12m", label: "12 mois" },
  { value: "custom", label: "Personnalisé" },
];

const DEFAULT_RANGE = rangeForPreset("30d");

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [spend, setSpend] = useState<AdminSpendSeries | null>(null);
  const [preset, setPreset] = useState<Preset>("30d");
  const [customStart, setCustomStart] = useState(DEFAULT_RANGE.start);
  const [customEnd, setCustomEnd] = useState(DEFAULT_RANGE.end);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    if (preset === "custom") return { start: customStart, end: customEnd };
    return rangeForPreset(preset);
  }, [preset, customStart, customEnd]);

  useEffect(() => {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    adminGetDashboardSummary(apiKey)
      .then(setSummary)
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"));
  }, []);

  useEffect(() => {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    adminGetSpendSeries(apiKey, range.start, range.end)
      .then(setSpend)
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"));
  }, [range.start, range.end]);

  const chartData = spend
    ? spend.series.map((point) => ({ ...point, label: formatBucket(point.bucket, spend.granularity) }))
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-foreground-muted">Vue d&apos;ensemble de l&apos;activité.</p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-6 grid grid-cols-3 gap-4">
        <AdminCard className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">Clients</p>
          <p className="mt-1.5 text-2xl font-bold text-foreground">{summary?.client_count ?? "—"}</p>
        </AdminCard>
        <AdminCard className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">Projets</p>
          <p className="mt-1.5 text-2xl font-bold text-foreground">{summary?.project_count ?? "—"}</p>
        </AdminCard>
        <AdminCard className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">Dépenses (période)</p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-brand">
            {spend ? `$${spend.total_usd.toFixed(2)}` : "—"}
          </p>
        </AdminCard>
      </div>

      <div className="mt-8 flex items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPreset(p.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              preset === p.value
                ? "bg-brand text-white"
                : "border border-border bg-surface-raised text-foreground-muted hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="mt-3 flex items-center gap-3">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-foreground"
          />
          <span className="text-sm text-foreground-muted">→</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-foreground"
          />
        </div>
      )}

      <AdminCard className="mt-6 p-5">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#71717A" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#71717A" }} axisLine={false} tickLine={false} width={50} />
              <Tooltip
                formatter={(value) => [`$${Number(value).toFixed(2)}`, "Dépense"]}
                contentStyle={{ borderRadius: 12, borderColor: "#E4E4E7" }}
              />
              <Area type="monotone" dataKey="cost_usd" stroke="#4F46E5" fill="url(#spendGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </AdminCard>
    </div>
  );
}
