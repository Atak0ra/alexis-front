"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmail, AlexisApiError } from "@/lib/api-client";

type Status = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("verifying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Lien de vérification incomplet.");
      return;
    }
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="inline-flex items-center gap-2 font-mono text-sm font-bold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">
            A
          </span>
          Alexis
        </Link>
        <div className="mt-4 border-t border-border" />

        <div className="mt-8">
          {status === "verifying" && (
            <>
              <h1 className="text-2xl font-bold text-foreground">Vérification…</h1>
              <p className="mt-1.5 text-sm text-foreground-muted">Un instant.</p>
            </>
          )}
          {status === "success" && (
            <>
              <h1 className="text-2xl font-bold text-foreground">Email vérifié</h1>
              <p className="mt-1.5 text-sm text-foreground-muted">
                Ton compte est activé, tu peux créer un projet.
              </p>
              <Link
                href="/dashboard"
                className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover transition-colors"
              >
                Aller au tableau de bord →
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <h1 className="text-2xl font-bold text-foreground">Lien invalide</h1>
              <p className="mt-1.5 text-sm text-danger">{error}</p>
              <Link
                href="/login"
                className="mt-8 inline-flex w-full items-center justify-center rounded-xl border border-border bg-surface-raised py-3 text-sm font-semibold text-foreground hover:bg-surface-sunken transition-colors"
              >
                Retour à la connexion
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
