"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminListClients, AdminClientListItem, AlexisApiError } from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminCard } from "../_components/chrome";

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
      <h1 className="text-2xl font-bold text-foreground">Clients</h1>
      <p className="mt-1 text-sm text-foreground-muted">{clients.length} client(s)</p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

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
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm text-foreground-subtle">
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
