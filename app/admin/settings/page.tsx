"use client";

import { useEffect, useState } from "react";
import {
  adminGetDefaultModels, adminUpdateDefaultModels,
  adminGetDisplayCurrency, adminUpdateDisplayCurrency,
  adminGetFxRates, adminUpdateFxRates,
  AdminDefaultModels, AlexisApiError,
} from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminCard, adminInputClass, adminButtonClass, adminGhostButtonClass } from "../_components/chrome";

// ── Modèles disponibles ───────────────────────────────────────────────────────

const CLAUDE_MODELS = [
  "claude-opus-4-5",
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
  "claude-opus-4",
  "claude-sonnet-4",
];

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
];

const ALL_MODELS = [...CLAUDE_MODELS, ...GROQ_MODELS];

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  // Modèles LLM
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
      adminGetDefaultModels(apiKey),
      adminGetDisplayCurrency(apiKey),
      adminGetFxRates(apiKey),
    ])
      .then(([m, c, fx]) => {
        setModels(m);
        setCurrency(c.display_currency);
        setFxRates(fx.fx_rates);
      })
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur de chargement"));
  }, []);

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
          Pilotez les modèles LLM et la devise d&apos;affichage sans redéploiement.
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* ── Modèles LLM ── */}
      <AdminCard className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Modèles LLM par défaut</h2>
            <p className="mt-0.5 text-sm text-foreground-muted">
              Appliqués à tous les projets immédiatement — sans redéploiement.
            </p>
          </div>
          <SaveStatus status={modelStatus} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {(["spec", "plan", "dev"] as const).map((step) => (
            <div key={step}>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-foreground-subtle">
                Step {step}
              </label>
              <select
                value={models[step]}
                onChange={(e) => setModels((prev) => ({ ...prev, [step]: e.target.value }))}
                className={adminInputClass}
              >
                <optgroup label="Claude">
                  {CLAUDE_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </optgroup>
                <optgroup label="Groq / Llama">
                  {GROQ_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </optgroup>
                {/* Modèle personnalisé non listé */}
                {models[step] && !ALL_MODELS.includes(models[step]) && (
                  <option value={models[step]}>{models[step]}</option>
                )}
              </select>
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
              {/* Devise personnalisée non listée */}
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

        {/* Taux existants */}
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

        {/* Ajouter une devise */}
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
