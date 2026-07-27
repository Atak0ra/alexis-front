"use client";

import { useEffect, useState } from "react";
import {
  adminListPlans, adminCreatePlan, adminUpdatePlan, adminDeletePlan,
  PlanOut, PlanPayload, AlexisApiError,
} from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminCard, adminButtonClass, adminGhostButtonClass, adminInputClass } from "../_components/chrome";

const EMPTY_FORM: PlanPayload = {
  name: "", monthly_price_eur: 0, forced_agent_choice: null,
  spec_max_budget_usd: null, plan_max_budget_usd: null, dev_max_budget_usd: null, monthly_max_budget_usd: null,
};

function toNullableNumber(raw: string): number | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : Number(trimmed);
}

const BUDGET_FIELDS = [
  ["plan-spec-budget", "Plafond spec ($)", "spec_max_budget_usd"],
  ["plan-plan-budget", "Plafond plan ($)", "plan_max_budget_usd"],
  ["plan-dev-budget", "Plafond dev ($)", "dev_max_budget_usd"],
  ["plan-monthly-budget", "Plafond mensuel ($)", "monthly_max_budget_usd"],
] as const;

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanOut[]>([]);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<PlanPayload>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    adminListPlans(apiKey)
      .then(setPlans)
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function startEdit(plan: PlanOut) {
    setEditingId(plan.id);
    setForm({
      name: plan.name, monthly_price_eur: plan.monthly_price_eur, forced_agent_choice: plan.forced_agent_choice,
      spec_max_budget_usd: plan.spec_max_budget_usd, plan_max_budget_usd: plan.plan_max_budget_usd,
      dev_max_budget_usd: plan.dev_max_budget_usd, monthly_max_budget_usd: plan.monthly_max_budget_usd,
    });
  }

  function startCreate() {
    setEditingId("new");
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    setError(null);
    try {
      if (editingId === "new") {
        await adminCreatePlan(apiKey, form);
      } else if (editingId) {
        await adminUpdatePlan(apiKey, editingId, form);
      }
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    }
  }

  async function handleDelete(planId: string) {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    setError(null);
    try {
      await adminDeletePlan(apiKey, planId);
      load();
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Plans</h1>
        <button type="button" onClick={startCreate} className={adminButtonClass}>
          + Nouveau plan
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {loading && (
        <div className="mt-6 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-sunken" />
          ))}
        </div>
      )}

      {!loading && (
      <AdminCard className="mt-6 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-sunken text-foreground-muted">
              <th className="px-5 py-3 font-medium">Nom</th>
              <th className="px-5 py-3 font-medium">Prix / mois</th>
              <th className="px-5 py-3 font-medium">Agent forcé</th>
              <th className="px-5 py-3 font-medium">Plafond mensuel</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3.5 font-medium text-foreground">{plan.name}</td>
                <td className="px-5 py-3.5 text-foreground-muted">{plan.monthly_price_eur}€</td>
                <td className="px-5 py-3.5 text-foreground-muted">{plan.forced_agent_choice ?? "—"}</td>
                <td className="px-5 py-3.5 font-mono text-foreground-muted">
                  {plan.monthly_max_budget_usd != null ? `$${plan.monthly_max_budget_usd.toFixed(2)}` : "illimité"}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button type="button" onClick={() => startEdit(plan)} className="text-brand hover:text-brand-hover">
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(plan.id)}
                    className="ml-4 text-danger hover:opacity-80"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>
      )}

      {editingId && (
        <AdminCard className="mt-8 max-w-md p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {editingId === "new" ? "Nouveau plan" : "Modifier le plan"}
          </h2>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="plan-name" className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
              <input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={adminInputClass}
              />
            </div>
            <div>
              <label htmlFor="plan-price" className="mb-1.5 block text-sm font-medium text-foreground">Prix (€/mois)</label>
              <input
                id="plan-price"
                type="number"
                value={form.monthly_price_eur}
                onChange={(e) => setForm({ ...form, monthly_price_eur: Number(e.target.value) })}
                className={adminInputClass}
              />
            </div>
            <div>
              <label htmlFor="plan-forced-agent" className="mb-1.5 block text-sm font-medium text-foreground">Agent forcé</label>
              <select
                id="plan-forced-agent"
                value={form.forced_agent_choice ?? ""}
                onChange={(e) => setForm({ ...form, forced_agent_choice: e.target.value || null })}
                className={adminInputClass}
              >
                <option value="">Aucun</option>
                <option value="aider">aider</option>
                <option value="claude">claude</option>
              </select>
            </div>
            {BUDGET_FIELDS.map(([id, label, field]) => (
              <div key={id}>
                <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
                  {label} <span className="text-foreground-subtle font-normal">(vide = illimité)</span>
                </label>
                <input
                  id={id}
                  type="number"
                  step="0.01"
                  value={form[field] ?? ""}
                  onChange={(e) => setForm({ ...form, [field]: toNullableNumber(e.target.value) })}
                  className={adminInputClass}
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setEditingId(null)} className={adminGhostButtonClass}>
              Annuler
            </button>
            <button type="button" onClick={handleSave} className={adminButtonClass}>
              Enregistrer
            </button>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
