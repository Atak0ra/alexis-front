"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { adminGetClient, AdminClientDetail, AlexisApiError } from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminPanel, adminEyebrowClass, adminHeadingClass } from "../../_components/chrome";

export default function AdminClientDetailPage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<AdminClientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    adminGetClient(apiKey, params.id)
      .then(setClient)
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <p className="font-mono text-xs text-admin-mist">Chargement…</p>;
  if (error) return <p className="font-mono text-xs text-admin-danger">{error}</p>;
  if (!client) return null;

  return (
    <div>
      <p className={adminEyebrowClass}>Compte</p>
      <h1 className={`mt-1 ${adminHeadingClass}`}>{client.email}</h1>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <AdminPanel className="p-5">
          <p className={adminEyebrowClass}>Plan</p>
          <p className="mt-2 font-mono text-lg text-admin-ink">{client.plan_name ?? "illimité"}</p>
        </AdminPanel>
        <AdminPanel className="p-5">
          <p className={adminEyebrowClass}>Dépense ce mois</p>
          <p className="mt-2 font-mono text-lg tabular-nums text-admin-signal">${client.monthly_spend_usd.toFixed(2)}</p>
        </AdminPanel>
        <AdminPanel className="p-5">
          <p className={adminEyebrowClass}>GitHub</p>
          <p className="mt-2 font-mono text-lg text-admin-ink">{client.github_username ?? "—"}</p>
        </AdminPanel>
      </div>

      <p className={`mt-10 ${adminEyebrowClass}`}>Projets</p>
      <AdminPanel className="mt-3">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-admin-line">
              <th className={`px-5 py-3 ${adminEyebrowClass}`}>Nom</th>
              <th className={`px-5 py-3 ${adminEyebrowClass}`}>Agent</th>
              <th className={`px-5 py-3 ${adminEyebrowClass}`}>Statut</th>
              <th className={`px-5 py-3 text-right ${adminEyebrowClass}`}>Coût total</th>
            </tr>
          </thead>
          <tbody>
            {client.projects.map((p) => (
              <tr key={p.id} className="border-b border-admin-line last:border-0">
                <td className="px-5 py-3.5 font-mono text-admin-ink">{p.name}</td>
                <td className="px-5 py-3.5 text-admin-mist">{p.agent_choice}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`font-mono text-[11px] uppercase tracking-widest ${
                      p.is_active ? "text-admin-good" : "text-admin-mist"
                    }`}
                  >
                    {p.is_active ? "actif" : "désactivé"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right font-mono tabular-nums text-admin-ink">
                  ${p.total_cost_usd.toFixed(2)}
                </td>
              </tr>
            ))}
            {client.projects.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center font-mono text-xs text-admin-mist">
                  Aucun projet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminPanel>
    </div>
  );
}
