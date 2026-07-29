"use client";

import { useEffect, useState } from "react";
import {
  adminGetDefaultModels, adminUpdateDefaultModels,
  adminGetDisplayCurrency, adminUpdateDisplayCurrency,
  adminGetFxRates, adminUpdateFxRates,
  adminGetProviders, adminGetProviderModel, adminUpdateProviderModel,
  AdminDefaultModels, AdminProviderItem, AdminProviderModel, AlexisApiError,
} from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminCard, adminInputClass, adminButtonClass, adminGhostButtonClass } from "../_components/chrome";

// ── Devises connues ───────────────────────────────────────────────────────────

const KNOWN_CURRENCIES: { code: string; label: string }[] = [
  { code: "EUR", label: "Euro (€)" },
  { code: "XOF", label: "Franc CFA (XOF)" },
  { code: "USD", label: "Dollar US ($)" },
  { code: "GBP", label: "Livre sterling (£)" },
  { code: "MAD", label: "Dirham marocain (MAD)" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function SaveStatus({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  if (status === "saving") return <span className="text-xs text-foreground-muted">Enregistrement…</span>;
  if (status === "saved") return <span className="text-xs text-success">✓ Enregistré</span>;
  return <span className="text-xs text-danger">Erreur</span>;
}

/** Libellé lisible pour un provider (ex: "together_ai" → "Together AI") */
function providerLabel(key: string): string {
  const labels: Record<string, string> = {
    anthropic: "Anthropic (Claude)",
    openai: "OpenAI",
    gemini: "Google Gemini",
    moonshot: "Moonshot / Kimi",
    xai: "xAI / Grok",
    groq: "Groq",
    openrouter: "OpenRouter",
    mistral: "Mistral",
    deepseek: "DeepSeek",
    together_ai: "Together AI",
    cohere: "Cohere",
  };
  return labels[key] ?? key;
}

/** Modèle par défaut suggéré pour un provider */
function defaultModelForProvider(key: string): string {
  const defaults: Record<string, string> = {
    anthropic: "claude-sonnet-4-5",
    openai: "openai/gpt-4o",
    gemini: "gemini/gemini-2.0-flash",
    moonshot: "moonshot/moonshot-v1-8k",
    xai: "xai/grok-3",
    groq: "groq/llama-3.3-70b-versatile",
    openrouter: "openrouter/meta-llama/llama-3.3-70b-instruct",
    mistral: "mistral/mistral-large-latest",
    deepseek: "deepseek/deepseek-chat",
    together_ai: "together_ai/meta-llama/Llama-3-70b-chat-hf",
    cohere: "cohere/command-r-plus",
  };
  return defaults[key] ?? key;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  // Provider actif
  const [providers, setProviders] = useState<AdminProviderItem[]>([]);
  const [providerModel, setProviderModel] = useState<AdminProviderModel>({ agent: "claude", model: "claude-sonnet-4-5" });
  const [selectedProvider, setSelectedProvider] = useState<string>("anthropic");
  const [customModel, setCustomModel] = useState<string>("");
  const [providerStatus, setProviderStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [providerError, setProviderError] = useState<string | null>(null);

  // Modèles LLM par step
  const [models, setModels] = useState<AdminDefaultModels>({ spec: "", plan: "", dev: "" });
  const [modelStatus, setModelStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Devise
  const [currency, setCurrency] = useState("EUR");
  const [currencyStatus, setCurrencyStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Taux de change
  const [fxRates, setFxRates] = useState<Record<string, number>>({ EUR: 0.92 });
  const [fxStatus, setFxStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [newCurrencyCode, setNewCurrencyCode] = useState("");
  const [newCurrencyRate, setNewCurrencyRate] = useState("");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    Promise.all([
      adminGetProviders(apiKey),
      adminGetProviderModel(apiKey),
      adminGetDefaultModels(apiKey),
      adminGetDisplayCurrency(apiKey),
      adminGetFxRates(apiKey),
    ])
      .then(([prov, pm, m, c, fx]) => {
        setProviders(prov);
        setProviderModel(pm);
        // Déduire le provider actif depuis le modèle courant
        const active = prov.find((p) => p.is_active);
        const provKey = active?.key ?? (pm.agent === "claude" ? "anthropic" : "groq");
        setSelectedProvider(provKey);
        setCustomModel(pm.model);
        setModels(m);
        setCurrency(c.display_currency);
        setFxRates(fx.fx_rates);
      })
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur de chargement"));
  }, []);

  // ── Sauvegarde provider actif ──

  async function saveProvider() {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    setProviderStatus("saving");
    setProviderError(null);
    const spec = providers.find((p) => p.key === selectedProvider);
    const agent = spec?.agent ?? "aider";
    const model = customModel || defaultModelForProvider(selectedProvider);
    try {
      const updated = await adminUpdateProviderModel(apiKey, { agent, model });
      setProviderModel(updated);
      // Rafraîchir la liste pour mettre à jour is_active
      const prov = await adminGetProviders(apiKey);
      setProviders(prov);
      setProviderStatus("saved");
      setTimeout(() => setProviderStatus("idle"), 2000);
    } catch (err) {
      setProviderStatus("error");
      setProviderError(err instanceof AlexisApiError ? err.detail : "Erreur");
    }
  }

  // ── Sauvegarde modèles ──

  async function saveModels() {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    setModelStatus("saving");
    try {
      const updated = await adminUpdateDefaultModels(apiKey, models);
      setModels(updated);
      setModelStatus("saved");
      setTimeout(() => setModelStatus("idle"), 2000);
    } catch {
      setModelStatus("error");
    }
  }

  // ── Sauvegarde devise ──

  async function saveCurrency() {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    setCurrencyStatus("saving");
    try {
      await adminUpdateDisplayCurrency(apiKey, currency);
      setCurrencyStatus("saved");
      setTimeout(() => setCurrencyStatus("idle"), 2000);
    } catch {
      setCurrencyStatus("error");
    }
  }

  // ── Sauvegarde taux ──

  async function saveFxRates(rates: Record<string, number>) {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    setFxStatus("saving");
    try {
      const updated = await adminUpdateFxRates(apiKey, rates);
      setFxRates(updated.fx_rates);
      setFxStatus("saved");
      setTimeout(() => setFxStatus("idle"), 2000);
    } catch {
      setFxStatus("error");
    }
  }

  function addCurrency() {
    const code = newCurrencyCode.trim().toUpperCase();
    const rate = parseFloat(newCurrencyRate);
    if (!code || isNaN(rate) || rate <= 0) return;
    const updated = { ...fxRates, [code]: rate };
    setFxRates(updated);
    setNewCurrencyCode("");
    setNewCurrencyRate("");
    saveFxRates(updated);
  }

  function removeCurrency(code: string) {
    const updated = { ...fxRates };
    delete updated[code];
    setFxRates(updated);
    saveFxRates(updated);
  }

  function updateRate(code: string, value: string) {
    const rate = parseFloat(value);
    if (isNaN(rate)) return;
    setFxRates((prev) => ({ ...prev, [code]: rate }));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Réglages</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Pilotez le provider LLM actif, les modèles et la devise sans redéploiement.
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* ── Provider actif de la plateforme ── */}
      <AdminCard className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Provider LLM actif</h2>
            <p className="mt-0.5 text-sm text-foreground-muted">
              Provider utilisé pour tous les clients sans clé personnelle (plans non-BYOK).
            </p>
          </div>
          <SaveStatus status={providerStatus} />
        </div>

        {/* Grille des providers */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-5">
          {providers.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                setSelectedProvider(p.key);
                setCustomModel(defaultModelForProvider(p.key));
              }}
              className={[
                "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                selectedProvider === p.key
                  ? "border-brand bg-brand/5 ring-1 ring-brand"
                  : "border-border bg-surface-raised hover:border-brand/40",
              ].join(" ")}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {providerLabel(p.key)}
                  </span>
                  {p.is_active && (
                    <span className="shrink-0 rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                      ACTIF
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] text-foreground-muted font-mono">{p.agent}</span>
                  {p.has_managed_key ? (
                    <span className="text-[11px] text-success">✓ clé configurée</span>
                  ) : (
                    <span className="text-[11px] text-warning">⚠ clé manquante</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Modèle pour le provider sélectionné */}
        {selectedProvider && (
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-foreground-subtle">
              Modèle ({providerLabel(selectedProvider)})
            </label>
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder={defaultModelForProvider(selectedProvider)}
              className={adminInputClass}
            />
            <p className="mt-1 text-xs text-foreground-muted">
              Format litellm : <code className="font-mono">provider/nom-du-modele</code> (ex: <code className="font-mono">groq/llama-3.3-70b-versatile</code>)
            </p>
          </div>
        )}

        {providerError && (
          <p className="mb-3 text-sm text-danger">{providerError}</p>
        )}

        {/* Avertissement si clé manquante */}
        {selectedProvider && providers.find((p) => p.key === selectedProvider && !p.has_managed_key) && (
          <p className="mb-3 text-sm text-warning">
            ⚠ Aucune clé API gérée pour ce provider. Configure-la dans{" "}
            <a href="/admin/managed-secrets" className="underline">Clés API gérées</a> avant d&apos;activer.
          </p>
        )}

        <div className="flex justify-end">
          <button type="button" onClick={saveProvider} className={adminButtonClass}>
            Activer ce provider
          </button>
        </div>
      </AdminCard>

      {/* ── Modèles LLM par step ── */}
      <AdminCard className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Modèles par step (spec / plan / dev)</h2>
            <p className="mt-0.5 text-sm text-foreground-muted">
              Affine le modèle utilisé par step — indépendant du provider actif.
            </p>
          </div>
          <SaveStatus status={modelStatus} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(["spec", "plan", "dev"] as const).map((step) => (
            <div key={step}>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-foreground-subtle">
                Step {step}
              </label>
              <input
                type="text"
                value={models[step]}
                onChange={(e) => setModels((prev) => ({ ...prev, [step]: e.target.value }))}
                placeholder="ex: groq/llama-3.3-70b-versatile"
                className={adminInputClass}
              />
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={saveModels} className={adminButtonClass}>
            Enregistrer les modèles
          </button>
        </div>
      </AdminCard>

      {/* ── Devise d'affichage ── */}
      <AdminCard className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Devise d&apos;affichage</h2>
            <p className="mt-0.5 text-sm text-foreground-muted">
              Tous les montants du cockpit sont convertis dans cette devise.
            </p>
          </div>
          <SaveStatus status={currencyStatus} />
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-foreground-subtle">
              Devise active
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={adminInputClass}
            >
              {KNOWN_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
              {!KNOWN_CURRENCIES.find((c) => c.code === currency) && (
                <option value={currency}>{currency}</option>
              )}
            </select>
          </div>
          <button type="button" onClick={saveCurrency} className={adminButtonClass}>
            Appliquer
          </button>
        </div>
      </AdminCard>

      {/* ── Taux de change ── */}
      <AdminCard className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Taux de change (USD →)</h2>
            <p className="mt-0.5 text-sm text-foreground-muted">
              Taux appliqués pour convertir les coûts d&apos;inférence (en USD) dans la devise d&apos;affichage.
            </p>
          </div>
          <SaveStatus status={fxStatus} />
        </div>

        <div className="space-y-3">
          {Object.entries(fxRates).map(([code, rate]) => (
            <div key={code} className="flex items-center gap-3">
              <span className="w-16 text-sm font-mono font-semibold text-foreground">{code}</span>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={rate}
                onChange={(e) => updateRate(code, e.target.value)}
                onBlur={() => saveFxRates(fxRates)}
                className="w-36 rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm font-mono text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              <span className="text-xs text-foreground-muted">1 USD = {rate} {code}</span>
              <button
                type="button"
                onClick={() => removeCurrency(code)}
                className="ml-auto text-xs text-danger hover:underline"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-foreground-subtle">
            Ajouter une devise
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-foreground-muted">Code (ex: XOF)</label>
              <input
                type="text"
                placeholder="XOF"
                value={newCurrencyCode}
                onChange={(e) => setNewCurrencyCode(e.target.value.toUpperCase())}
                maxLength={5}
                className="w-24 rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm font-mono text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground-muted">Taux (1 USD = ?)</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                placeholder="655.957"
                value={newCurrencyRate}
                onChange={(e) => setNewCurrencyRate(e.target.value)}
                className="w-36 rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm font-mono text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <button
              type="button"
              onClick={addCurrency}
              disabled={!newCurrencyCode || !newCurrencyRate}
              className={adminButtonClass}
            >
              + Ajouter
            </button>
          </div>
        </div>
      </AdminCard>

      {/* ── Liens rapides ── */}
      <AdminCard className="p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Autres réglages</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/plans" className={adminGhostButtonClass}>Plans & budgets</a>
          <a href="/admin/managed-secrets" className={adminGhostButtonClass}>Clés API gérées</a>
        </div>
      </AdminCard>
    </div>
  );
}
