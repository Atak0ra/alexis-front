"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  adminListClients, adminCreateClient, adminListPlans,
  AdminClientListItem, AdminClientCreated, PlanOut, AlexisApiError,
} from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminCard, adminButtonClass, adminGhostButtonClass, adminInputClass } from "../_components/chrome";

export default function AdminClientsPage() {
  const [clients, setClients] = useState<AdminClientListItem[]>([]);
  const [plans, setPlans] = useState<PlanOut[]>([]);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPlanId, setCreatePlanId] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<AdminClientCreated | null>(null);

  function load() {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    adminListClients(apiKey)
      .then(setClients)
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  useEffect(() => {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    adminListPlans(apiKey)
      .then(setPlans)
      .catch((err) => setPlansError(err instanceof AlexisApiError ? err.detail : "Impossible de charger les plans."));
  }, []);

  function openCreateForm() {
    setCreateEmail("");
    setCreatePlanId("");
    setCreateError(null);
    setCreatedAccount(null);
    setShowCreateForm(true);
  }

  async function handleCreate() {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    setCreateError(null);
    setCreating(true);
    try {
      const created = await adminCreateClient(apiKey, {
        email: createEmail,
        plan_id: createPlanId || null,
      });
      setCreatedAccount(created);
      setShowCreateForm(false);
      load();
    } catch (err) {
      setCreateError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="mt-1 text-sm text-foreground-muted">{clients.length} client(s)</p>
        </div>
        <button type="button" onClick={openCreateForm} className={adminButtonClass}>
          + Créer un client
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {createdAccount && (
        <AdminCard className="mt-4 border-brand/30 bg-brand-light p-4">
          <p className="text-sm font-medium text-foreground">
            Compte créé pour {createdAccount.email}.
          </p>
          {createdAccount.temp_password ? (
            <p className="mt-1 text-sm text-foreground-muted">
              L&apos;email n&apos;a pas pu être envoyé — mot de passe temporaire à transmettre
              manuellement : <span className="font-mono font-semibold text-foreground">{createdAccount.temp_password}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-foreground-muted">
              Un email avec un mot de passe temporaire a été envoyé.
            </p>
          )}
          <button
            type="button"
            onClick={() => setCreatedAccount(null)}
            className="mt-2 text-sm font-medium text-brand hover:text-brand-hover"
          >
            Fermer
          </button>
        </AdminCard>
      )}

      {showCreateForm && (
        <AdminCard className="mt-6 max-w-md p-6">
          <h2 className="text-lg font-semibold text-foreground">Créer un client</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="create-client-email" className="mb-1.5 block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="create-client-email"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                className={adminInputClass}
              />
            </div>
            <div>
              <label htmlFor="create-client-plan" className="mb-1.5 block text-sm font-medium text-foreground">
                Plan
              </label>
              <select
                id="create-client-plan"
                value={createPlanId}
                onChange={(e) => setCreatePlanId(e.target.value)}
                className={adminInputClass}
              >
                <option value="">Aucun plan (wallet à 0$, à approvisionner)</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.display_name ?? plan.name}
                  </option>
                ))}
              </select>
              {plansError && <p className="mt-1.5 text-sm text-danger">{plansError}</p>}
            </div>
            {createError && <p className="text-sm text-danger">{createError}</p>}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setShowCreateForm(false)} className={adminGhostButtonClass}>
              Annuler
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !createEmail}
              className={adminButtonClass}
            >
              {creating ? "Création..." : "Créer"}
            </button>
          </div>
        </AdminCard>
      )}

      {loading && (
        <div className="mt-6 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-sunken" />
          ))}
        </div>
      )}

      {!loading && !error && (
        <AdminCard className="mt-6 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-sunken text-foreground-muted">
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Projets</th>
                <th className="px-5 py-3 text-right font-medium">Dépense (mois)</th>
                <th className="px-5 py-3 text-right font-medium">Solde wallet</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/clients/${c.id}`} className="font-medium text-brand hover:text-brand-hover">
                      {c.email}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-foreground-muted">{c.plan_name ?? "—"}</td>
                  <td className="px-5 py-3.5 text-foreground-muted">{c.project_count}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-foreground">${c.monthly_spend_usd.toFixed(2)}</td>
                  <td
                    className={`px-5 py-3.5 text-right font-mono ${
                      c.wallet_balance_usd < 10 ? "text-danger" : "text-foreground"
                    }`}
                  >
                    ${c.wallet_balance_usd.toFixed(2)}
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-sm text-foreground-subtle">
                    Aucun client pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
