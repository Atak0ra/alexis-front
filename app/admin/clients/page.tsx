"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminListClients, AdminClientListItem, AlexisApiError } from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminPanel, adminEyebrowClass, adminHeadingClass } from "../_components/chrome";

export default function AdminClientsPage() {
  const [clients, setClients] = useState<AdminClientListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    adminListClients(apiKey)
      .then(setClients)
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <p className={adminEyebrowClass}>Comptes</p>
      <h1 className={`mt-1 ${adminHeadingClass}`}>Clients</h1>
      <p className="mt-2 font-mono text-xs text-admin-mist">{clients.length} compte(s) enregistré(s)</p>

      {error && <p className="mt-4 font-mono text-xs text-admin-danger">{error}</p>}
      {loading && <p className="mt-4 font-mono text-xs text-admin-mist">Chargement…</p>}

      {!loading && !error && (
        <AdminPanel className="mt-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-admin-line">
                <th className={`px-5 py-3 ${adminEyebrowClass}`}>Email</th>
                <th className={`px-5 py-3 ${adminEyebrowClass}`}>Plan</th>
                <th className={`px-5 py-3 ${adminEyebrowClass}`}>Projets</th>
                <th className={`px-5 py-3 text-right ${adminEyebrowClass}`}>Dépense (mois)</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-admin-line last:border-0">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/clients/${c.id}`} className="font-mono text-admin-signal hover:text-admin-signal-hover">
                      {c.email}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-admin-ink">{c.plan_name ?? "—"}</td>
                  <td className="px-5 py-3.5 font-mono text-admin-mist">{c.project_count}</td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums text-admin-ink">
                    ${c.monthly_spend_usd.toFixed(2)}
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center font-mono text-xs text-admin-mist">
                    Aucun client pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </AdminPanel>
      )}
    </div>
  );
}
