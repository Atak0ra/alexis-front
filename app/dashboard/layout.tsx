"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getApiKey } from "@/lib/session";
import { getMe, resendVerification } from "@/lib/api-client";
import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) {
      router.replace("/login");
      return;
    }
    setChecked(true);
    // Récupère le profil pour savoir si l'email est vérifié
    getMe(apiKey)
      .then((profile) => setEmailVerified(profile.email_verified))
      .catch(() => setEmailVerified(null)); // fail-open : on n'affiche pas le bandeau si /me échoue
  }, [router]);

  async function handleResend() {
    const apiKey = getApiKey();
    if (!apiKey) return;
    setResendState("sending");
    try {
      await resendVerification(apiKey);
      setResendState("sent");
    } catch {
      setResendState("error");
    }
  }

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
          <p className="text-sm text-foreground-muted">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Bandeau d'avertissement email non vérifié */}
        {emailVerified === false && (
          <div role="alert" className="border-b border-danger-border bg-danger-bg px-4 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-danger">
                <span className="font-semibold">Compte non activé.</span>{" "}
                Vérifie ta boîte mail pour activer ton compte et créer des projets.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendState === "sending" || resendState === "sent"}
                  className="shrink-0 rounded-lg border border-danger/30 bg-white px-3 py-1 text-xs font-semibold text-danger hover:bg-danger-bg disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  {resendState === "sending"
                    ? "Envoi…"
                    : resendState === "sent"
                    ? "Email envoyé ✓"
                    : resendState === "error"
                    ? "Réessayer"
                    : "Renvoyer l'email"}
                </button>
                {/* aria-live region announces the send result to screen readers */}
                <span aria-live="polite" aria-atomic="true" className="sr-only">
                  {resendState === "sent" ? "Email de vérification envoyé." : resendState === "error" ? "Erreur lors de l'envoi. Réessayez." : ""}
                </span>
              </div>
            </div>
          </div>
        )}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
