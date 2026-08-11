"use client";

import { useEffect, useState } from "react";
import {
  adminListPlans, adminCreatePlan, adminUpdatePlan, adminDeletePlan,
  PlanOut, PlanPayload, AlexisApiError,
} from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminCard, adminButtonClass, adminGhostButtonClass, adminInputClass } from "../_components/chrome";

const EMPTY_FORM: PlanPayload = {
  name: "", monthly_price_usd: 0, forced_agent_choice: null,
  monthly_max_budget_usd: null,
  display_name: null, description: null, features: null,
  requires_own_key: false, max_members: 1, is_public: true, sort_order: 0,
};

function toNullableNumber(raw: string): number | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : Number(trimmed);
}

function cleanFeatures(lines: string[] | null | undefined): string[] | null {
  if (!lines) return null;
  const cleaned = lines.map((line) => line.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : null;
}

const BUDGET_FIELDS = [
  ["plan-monthly-budget", "Plafond mensuel ($)", "monthly_max_budget_usd"],
] as const;

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanOut[]>([]);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<PlanPayload>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
      name: plan.name, monthly_price_usd: plan.monthly_price_usd, forced_agent_choice: plan.forced_agent_choice,
      monthly_max_budget_usd: plan.monthly_max_budget_usd,
      display_name: plan.display_name, description: plan.description, features: plan.features,
      requires_own_key: plan.requires_own_key, max_members: plan.max_members,
      is_public: plan.is_public, sort_order: plan.sort_order,
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
    const payload = { ...form, features: cleanFeatures(form.features) };
    try {
      if (editingId === "new") {
        await adminCreatePlan(apiKey, payload);
      } else if (editingId) {
        await adminUpdatePlan(apiKey, editingId, payload);
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
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-sunken text-foreground-muted">
              <th className="px-5 py-3 font-medium">Nom</th>
              <th className="px-5 py-3 font-medium">Nom public</th>
              <th className="px-5 py-3 font-medium">Facturation</th>
              <th className="px-5 py-3 font-medium">Agent forcé</th>
              <th className="px-5 py-3 font-medium">Plafond mensuel</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3.5 font-medium text-foreground">{plan.name}</td>
                <td className="px-5 py-3.5 text-foreground-muted">
                  {plan.display_name ?? "—"}
                  {!plan.is_public && (
                    <span className="ml-1.5 rounded bg-surface-sunken px-1.5 py-0.5 text-xs text-foreground-subtle">masqué</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-foreground-muted">
                  {plan.requires_own_key
                    ? `$${plan.monthly_price_usd} / mois (BYOK)`
                    : "Wallet prépayé (pas de prix fixe)"}
                </td>
                <td className="px-5 py-3.5 text-foreground-muted">{plan.forced_agent_choice ?? "—"}</td>
                 <td className="px-5 py-3.5 font-mono text-foreground-muted">
                   {plan.monthly_max_budget_usd != null ? `$${plan.monthly_max_budget_usd.toFixed(2)}` : "illimité"}
                 </td>
                 <td className="px-5 py-3.5 text-right">
                  {confirmDeleteId === plan.id ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs text-foreground-muted">Confirmer ?</span>
                      <button
                        type="button"
                        onClick={() => { handleDelete(plan.id); setConfirmDeleteId(null); }}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-danger px-3 text-sm font-semibold text-white hover:bg-danger/90 transition-colors"
                      >
                        Oui, supprimer
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground-muted hover:bg-surface-sunken transition-colors"
                      >
                        Annuler
                      </button>
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(plan)}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 text-sm font-medium text-brand hover:bg-brand-light transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(plan.id)}
                        className="ml-1 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 text-sm font-medium text-danger hover:bg-danger-bg transition-colors"
                      >
                        Supprimer
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
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
              <label htmlFor="plan-price" className="mb-1.5 block text-sm font-medium text-foreground">Prix ($/mois)</label>
              <input
                id="plan-price"
                type="number"
                value={form.monthly_price_usd}
                onChange={(e) => setForm({ ...form, monthly_price_usd: Number(e.target.value) })}
                className={adminInputClass}
              />
              <p className="mt-1 text-xs text-foreground-subtle">
                Utilisé uniquement si « Nécessite sa propre clé API (BYOK) » est coché ci-dessous
                (abonnement plat). Les plans à clé gérée facturent via le wallet prépayé
                (coût réel × marge, réglable dans Pricing), pas de prix fixe.
              </p>
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

            <hr className="border-border" />
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">Vitrine publique (/pricing)</p>

            <div>
              <label htmlFor="plan-display-name" className="mb-1.5 block text-sm font-medium text-foreground">
                Nom public <span className="text-foreground-subtle font-normal">(affiché sur la page tarifs)</span>
              </label>
              <input
                id="plan-display-name"
                value={form.display_name ?? ""}
                onChange={(e) => setForm({ ...form, display_name: e.target.value || null })}
                className={adminInputClass}
              />
            </div>
            <div>
              <label htmlFor="plan-description" className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
              <textarea
                id="plan-description"
                rows={2}
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value || null })}
                className={adminInputClass}
              />
            </div>
            <div>
              <label htmlFor="plan-features" className="mb-1.5 block text-sm font-medium text-foreground">
                Fonctionnalités <span className="text-foreground-subtle font-normal">(une par ligne)</span>
              </label>
              <textarea
                id="plan-features"
                rows={4}
                value={(form.features ?? []).join("\n")}
                onChange={(e) => setForm({ ...form, features: e.target.value.split("\n") })}
                className={adminInputClass}
              />
            </div>
            <div>
              <label htmlFor="plan-max-members" className="mb-1.5 block text-sm font-medium text-foreground">
                Membres max <span className="text-foreground-subtle font-normal">(vide = illimité)</span>
              </label>
              <input
                id="plan-max-members"
                type="number"
                min="1"
                step="1"
                value={form.max_members ?? ""}
                onChange={(e) => setForm({ ...form, max_members: toNullableNumber(e.target.value) })}
                className={adminInputClass}
              />
            </div>
            <div>
              <label htmlFor="plan-sort-order" className="mb-1.5 block text-sm font-medium text-foreground">Ordre d&apos;affichage</label>
              <input
                id="plan-sort-order"
                type="number"
                step="1"
                value={form.sort_order ?? 0}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                className={adminInputClass}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={form.requires_own_key ?? false}
                onChange={(e) => setForm({ ...form, requires_own_key: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              Nécessite sa propre clé API (BYOK)
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={form.is_public ?? true}
                onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              Visible sur la page tarifs
            </label>
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
