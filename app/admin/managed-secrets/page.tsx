"use client";

import { useEffect, useState } from "react";
import { adminListManagedSecrets, adminUpdateManagedSecret, ManagedSecretOut, AlexisApiError } from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminPanel, adminButtonClass, adminEyebrowClass, adminGhostButtonClass, adminHeadingClass, adminInputClass } from "../_components/chrome";

const LABELS: Record<string, string> = { anthropic: "Anthropic (Claude)", groq: "Groq (aider, plan Free)" };

export default function AdminManagedSecretsPage() {
  const [secrets, setSecrets] = useState<ManagedSecretOut[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    adminListManagedSecrets(apiKey)
      .then(setSecrets)
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"));
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
      <p className={adminEyebrowClass}>Facturation</p>
      <h1 className={`mt-1 ${adminHeadingClass}`}>Clés gérées</h1>
      <p className="mt-2 max-w-lg font-mono text-xs text-admin-mist">
        Utilisées pour les projets sans clé personnelle (BYOK). Jamais affichées en clair une fois enregistrées.
      </p>

      {error && <p className="mt-4 font-mono text-xs text-admin-danger">{error}</p>}

      <div className="mt-6 space-y-4">
        {secrets.map((secret) => (
          <AdminPanel key={secret.key} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-sm font-semibold text-admin-ink">{LABELS[secret.key] ?? secret.key}</p>
                <p className="mt-1.5 font-mono text-[11px] uppercase tracking-widest">
                  <span className={secret.has_value ? "text-admin-good" : "text-admin-mist"}>
                    {secret.has_value ? "● configurée" : "○ non configurée"}
                  </span>
                  <span className="ml-3 normal-case tracking-normal text-admin-mist/70">
                    maj {new Date(secret.updated_at).toLocaleString("fr-FR")}
                  </span>
                </p>
              </div>
              {editingKey !== secret.key && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingKey(secret.key);
                    setValue("");
                  }}
                  className="font-mono text-xs uppercase tracking-widest text-admin-signal hover:text-admin-signal-hover"
                >
                  {secret.has_value ? "Remplacer" : "Configurer"}
                </button>
              )}
            </div>

            {editingKey === secret.key && (
              <div className="mt-5 flex items-center gap-3">
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
          </AdminPanel>
        ))}
      </div>
    </div>
  );
}
