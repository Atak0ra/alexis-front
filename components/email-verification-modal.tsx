"use client";

import { useState } from "react";
import { resendVerification, AlexisApiError } from "@/lib/api-client";
import { getApiKey } from "@/lib/session";

export default function EmailVerificationModal({ onClose }: { onClose: () => void }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    const apiKey = getApiKey();
    if (!apiKey) return;
    setSending(true);
    setError(null);
    try {
      await resendVerification(apiKey);
      setSent(true);
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-light">
          <svg className="h-6 w-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h2 className="mt-4 text-center text-lg font-bold text-foreground">Compte pas encore activé</h2>
        <p className="mt-2 text-center text-sm text-foreground-muted leading-relaxed">
          Va vérifier ta boîte mail et clique sur le lien de confirmation pour créer ton premier projet.
        </p>

        {sent && (
          <p className="mt-4 rounded-lg border border-success-border bg-success-bg px-3 py-2 text-center text-xs font-medium text-success">
            Email renvoyé. Vérifie ta boîte mail (et tes spams).
          </p>
        )}
        {error && <p className="mt-4 text-center text-xs text-danger">{error}</p>}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={sending || sent}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 transition-colors"
          >
            {sending ? "Envoi…" : sent ? "Email envoyé ✓" : "Renvoyer l'email"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-border bg-surface-raised py-2.5 text-sm font-medium text-foreground hover:bg-surface-sunken transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
