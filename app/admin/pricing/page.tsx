"use client";

import { useEffect, useState } from "react";
import {
  adminGetMargin, adminUpdateMargin,
  AlexisApiError,
} from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminCard, adminButtonClass, adminInputClass } from "../_components/chrome";


export default function AdminPricingPage() {
  const [margin, setMargin] = useState<number | null>(null);
  const [marginInput, setMarginInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingMargin, setSavingMargin] = useState(false);

  function load() {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    setError(null);
    adminGetMargin(apiKey)
      .then((marginSetting) => {
        setMargin(marginSetting.margin_multiplier);
        setMarginInput(String(marginSetting.margin_multiplier));
      })
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSaveMargin() {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    const value = Number(marginInput);
    if (!value || value <= 0) {
      setError("Le multiplicateur de marge doit être un nombre positif.");
      return;
    }
    setSavingMargin(true);
    setError(null);
    try {
      const updated = await adminUpdateMargin(apiKey, value);
      setMargin(updated.margin_multiplier);
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    } finally {
      setSavingMargin(false);
    }
  }

  const exampleBilled = margin != null ? (1 * margin).toFixed(2) : null;

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pricing</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Marge appliquée au débit du wallet des plans à clé gérée (Solo/Entreprise).
          Sans effet sur les plans BYOK, qui paient leur propre clé et n&apos;ont pas de wallet.
        </p>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {loading && (
        <div className="mt-6 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-sunken" />
          ))}
        </div>
      )}

      {!loading && (
        <AdminCard className="mt-6 max-w-md p-6">
          <h2 className="text-base font-semibold text-foreground">Marge</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Multiplicateur appliqué au coût fournisseur réel pour calculer le montant
            débité du wallet client : <span className="font-mono">billed_usd = coût fournisseur × marge</span>.
          </p>
          <div className="mt-4 flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="margin-multiplier" className="mb-1.5 block text-sm font-medium text-foreground">
                Multiplicateur (ex: 3.0 = coût × 3)
              </label>
              <input
                id="margin-multiplier"
                type="number"
                step="0.1"
                min="0"
                value={marginInput}
                onChange={(e) => setMarginInput(e.target.value)}
                className={adminInputClass}
              />
            </div>
            <button
              type="button"
              onClick={handleSaveMargin}
              disabled={savingMargin}
              className={adminButtonClass}
            >
              Enregistrer
            </button>
          </div>
          {exampleBilled && (
            <p className="mt-2 text-xs text-foreground-subtle">
              Exemple : un run coûtant $1.00 au fournisseur débite ${exampleBilled} du wallet client.
            </p>
          )}
        </AdminCard>
      )}
    </div>
  );
}
