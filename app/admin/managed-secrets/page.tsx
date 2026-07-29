"use client";

import { useEffect, useState } from "react";
import { adminListManagedSecrets, adminUpdateManagedSecret, ManagedSecretOut, AlexisApiError } from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminCard, adminButtonClass, adminGhostButtonClass, adminInputClass } from "../_components/chrome";

const LABELS: Record<string, { name: string; description: string }> = {
  anthropic:   { name: "Anthropic",    description: "Claude Code — modèles claude-*" },
  openai:      { name: "OpenAI",       description: "aider — gpt-4o, o1, o3…" },
  gemini:      { name: "Google Gemini",description: "aider — gemini/gemini-2.0-flash…" },
  moonshot:    { name: "Moonshot / Kimi", description: "aider — moonshot/moonshot-v1-8k…" },
  xai:         { name: "xAI / Grok",   description: "aider — xai/grok-3, xai/grok-3-mini…" },
  groq:        { name: "Groq",         description: "aider — groq/llama-3.3-70b-versatile…" },
  openrouter:  { name: "OpenRouter",   description: "aider — accès à +200 modèles" },
  mistral:     { name: "Mistral",      description: "aider — mistral/mistral-large-latest…" },
  deepseek:    { name: "DeepSeek",     description: "aider — deepseek/deepseek-chat…" },
  together_ai: { name: "Together AI",  description: "aider — together_ai/…" },
  cohere:      { name: "Cohere",       description: "aider — cohere/command-r-plus…" },
};

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
        Clés API des providers LLM utilisées pour les projets sans clé personnelle (BYOK).
        Stockées chiffrées (Fernet/AES). Jamais affichées en clair une fois enregistrées.
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {loading && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-sunken" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="mt-6 space-y-3">
          {secrets.map((secret) => {
            const label = LABELS[secret.key];
            return (
              <AdminCard key={secret.key} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{label?.name ?? secret.key}</p>
                      <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-foreground-subtle">
                        {secret.agent === "claude" ? "Claude Code" : "aider"}
                      </span>
                      {secret.is_active ? (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          ✓ ACTIF
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-foreground-subtle">
                          non configurée
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-foreground-subtle">
                      {label?.description ?? ""} — <code className="font-mono">{secret.env_var}</code>
                    </p>
                    {secret.has_value && (
                      <p className="mt-0.5 text-xs text-foreground-subtle">
                        Mise à jour le {new Date(secret.updated_at).toLocaleString("fr-FR")}
                      </p>
                    )}
                  </div>

                  {editingKey !== secret.key && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingKey(secret.key);
                        setValue("");
                      }}
                      className="shrink-0 text-sm text-brand hover:text-brand-hover"
                    >
                      {secret.has_value ? "Remplacer" : "Configurer"}
                    </button>
                  )}
                </div>

                {editingKey === secret.key && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="password"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Nouvelle clé API…"
                        className={`flex-1 ${adminInputClass}`}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSave(secret.key)}
                        disabled={!value.trim()}
                        className={adminButtonClass}
                      >
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
                    {secret.has_value && (
                      <button
                        type="button"
                        onClick={async () => {
                          const apiKey = getAdminApiKey();
                          if (!apiKey) return;
                          setError(null);
                          try {
                            await adminUpdateManagedSecret(apiKey, secret.key, null);
                            setEditingKey(null);
                            setValue("");
                            load();
                          } catch (err) {
                            setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
                          }
                        }}
                        className="text-xs text-danger hover:underline"
                      >
                        Supprimer la clé existante
                      </button>
                    )}
                  </div>
                )}
              </AdminCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
