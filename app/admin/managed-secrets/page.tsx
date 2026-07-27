"use client";

import { useEffect, useState } from "react";
import { adminListManagedSecrets, adminUpdateManagedSecret, ManagedSecretOut, AlexisApiError } from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminCard, adminButtonClass, adminGhostButtonClass, adminInputClass } from "../_components/chrome";

const LABELS: Record<string, string> = { anthropic: "Anthropic (Claude)", groq: "Groq (aider, plan Free)" };

export default function AdminManagedSecretsPage() {
  const [secrets, setSecrets] = useState<ManagedSecretOut[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    adminListManagedSecrets(apiKey)
      .then(setSecrets)
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSave(key: string) {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    setError(null);
    try {
      await adminUpdateManagedSecret(apiKey, key, value.trim() || null);
      setEditingKey(null);
      setValue("");
      load();
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Clés gérées</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Utilisées pour les projets sans clé personnelle (BYOK). Jamais affichées en clair une fois enregistrées.
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {loading && (
        <div className="mt-6 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-sunken" />
          ))}
        </div>
      )}

      {!loading && (
      <div className="mt-6 space-y-4">
        {secrets.map((secret) => (
          <AdminCard key={secret.key} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{LABELS[secret.key] ?? secret.key}</p>
                <p className="mt-1 text-xs text-foreground-subtle">
                  <span>{secret.has_value ? "Clé configurée" : "Aucune clé configurée"}</span> — mise à jour le{" "}
                  {new Date(secret.updated_at).toLocaleString("fr-FR")}
                </p>
              </div>
              {editingKey !== secret.key && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingKey(secret.key);
                    setValue("");
                  }}
                  className="text-sm text-brand hover:text-brand-hover"
                >
                  {secret.has_value ? "Remplacer" : "Configurer"}
                </button>
              )}
            </div>

            {editingKey === secret.key && (
              <div className="mt-4 flex items-center gap-3">
                <input
                  type="password"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Nouvelle valeur — laisser vide pour effacer"
                  className={`flex-1 ${adminInputClass}`}
                />
                <button type="button" onClick={() => handleSave(secret.key)} className={adminButtonClass}>
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingKey(null);
                    setValue("");
                  }}
                  className={adminGhostButtonClass}
                >
                  Annuler
                </button>
              </div>
            )}
          </AdminCard>
        ))}
      </div>
      )}
    </div>
  );
}
