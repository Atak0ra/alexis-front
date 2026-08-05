"use client";

import { AdminCard, adminGhostButtonClass } from "../_components/chrome";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Réglages</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Pilotez les providers LLM et les modèles sans redéploiement. Tous les
          montants sont exprimés en dollars (USD), sans conversion.
        </p>
      </div>

      {/* ── Liens rapides ── */}
      <AdminCard className="p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Autres réglages</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/plans" className={adminGhostButtonClass}>Plans &amp; budgets</a>
          <a href="/admin/managed-secrets" className={adminGhostButtonClass}>Clés API gérées (providers &amp; modèles)</a>
        </div>
      </AdminCard>
    </div>
  );
}
