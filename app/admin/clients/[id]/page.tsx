"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminGetClient, adminDeleteClient, AdminClientDetail, AlexisApiError } from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminCard } from "../../_components/chrome";

export default function AdminClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<AdminClientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // État de la suppression
  const [deleteState, setDeleteState] = useState<"idle" | "confirm" | "deleting" | "error">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    adminGetClient(apiKey, params.id)
      .then(setClient)
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleDelete() {
    const apiKey = getAdminApiKey();
    if (!apiKey || !client) return;
    setDeleteState("deleting");
    setDeleteError(null);
    try {
      await adminDeleteClient(apiKey, client.id);
      // Suppression réussie → retour à la liste
      router.push("/admin/clients");
    } catch (err) {
      setDeleteError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
      setDeleteState("error");
    }
  }

  if (loading) {
    return (
      <div>
        <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-sunken" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-sunken" />
          ))}
        </div>
        <div className="mt-10 h-6 w-24 animate-pulse rounded-lg bg-surface-sunken" />
        <div className="mt-3 h-32 animate-pulse rounded-xl bg-surface-sunken" />
      </div>
    );
  }
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!client) return null;

  return (
    <div>
      {/* En-tête : email + bouton supprimer */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">{client.email}</h1>

        {deleteState === "confirm" ? (
          /* Zone de confirmation — irréversible */
          <div className="flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg px-4 py-2.5">
            <p className="text-sm text-danger font-medium">
              Supprimer définitivement ce client ?
            </p>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Confirmer
            </button>
            <button
              type="button"
              onClick={() => { setDeleteState("idle"); setDeleteError(null); }}
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground-muted hover:bg-surface-sunken transition-colors"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setDeleteState("confirm")}
            disabled={deleteState === "deleting"}
            className="rounded-xl border border-danger/30 bg-danger-bg px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {deleteState === "deleting" ? "Suppression…" : "Supprimer le client"}
          </button>
        )}
      </div>

      {deleteError && (
        <p className="mt-2 text-sm text-danger">{deleteError}</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminCard className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">Plan</p>
          <p className="mt-1.5 text-lg font-semibold text-foreground">{client.plan_name ?? "illimité"}</p>
        </AdminCard>
        <AdminCard className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">Dépense ce mois</p>
          <p className="mt-1.5 font-mono text-lg font-semibold text-brand">${client.monthly_spend_usd.toFixed(2)}</p>
        </AdminCard>
        <AdminCard className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">GitHub</p>
          <p className="mt-1.5 text-lg font-semibold text-foreground">{client.github_username ?? "—"}</p>
        </AdminCard>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-foreground">Projets</h2>
      <AdminCard className="mt-3 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-sunken text-foreground-muted">
              <th className="px-5 py-3 font-medium">Nom</th>
              <th className="px-5 py-3 font-medium">Agent</th>
              <th className="px-5 py-3 font-medium">Statut</th>
              <th className="px-5 py-3 text-right font-medium">Coût total</th>
            </tr>
          </thead>
          <tbody>
            {client.projects.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3.5 font-medium text-foreground">{p.name}</td>
                <td className="px-5 py-3.5 text-foreground-muted">{p.agent_choice}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.is_active ? "bg-success-bg text-success" : "bg-surface-sunken text-foreground-subtle"
                    }`}
                  >
                    {p.is_active ? "actif" : "désactivé"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right font-mono text-foreground">${p.total_cost_usd.toFixed(2)}</td>
              </tr>
            ))}
            {client.projects.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-sm text-foreground-subtle">
                  Aucun projet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminCard>

      {/* Zone danger — rappel RGPD */}
      <div className="mt-10 rounded-xl border border-danger-border bg-danger-bg px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-danger">Zone danger</p>
        <p className="mt-1 text-sm text-foreground-muted">
          La suppression est <span className="font-semibold text-foreground">définitive et irréversible</span> — tous les projets, tickets, runs et clés API de ce client seront effacés (droit à l&apos;oubli RGPD).
        </p>
      </div>
    </div>
  );
}
