"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminLogin, AlexisApiError } from "@/lib/api-client";
import { setAdminApiKey } from "@/lib/session";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await adminLogin(email, password);
      setAdminApiKey(result.api_key);
      router.push("/admin/dashboard");
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">
            A
          </span>
          Alexis
        </Link>
        <div className="mt-4 border-t border-border" />

        {/* Heading */}
        <div className="mt-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-foreground-subtle">
            Espace admin
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Bon retour</h1>
          <p className="mt-1.5 text-sm text-foreground-muted">
            Connecte-toi pour accéder au cockpit d&apos;administration.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <div>
            <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-foreground">
              Email <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              aria-describedby={error ? "admin-form-error" : undefined}
              placeholder="vous@exemple.com"
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-foreground">
              Mot de passe <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              aria-describedby={error ? "admin-form-error" : undefined}
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
            />
          </div>

          {error && (
            <p id="admin-form-error" role="alert" className="flex items-center gap-2 rounded-lg border border-danger-border bg-danger-bg px-3 py-2.5 text-sm text-danger">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {submitting ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        {/* Footer link */}
        <div className="mt-10 flex items-center justify-center text-xs text-foreground-subtle">
          <Link href="/" className="hover:text-foreground-muted transition-colors">
            ← Retour au site
          </Link>
        </div>
      </div>
    </div>
  );
}
