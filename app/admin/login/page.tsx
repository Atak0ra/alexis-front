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
        <Link href="/" className="flex items-center gap-2 font-mono text-sm font-bold text-foreground">
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
            Réservé aux comptes créés via <span className="font-mono">make create-admin</span>.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="vous@exemple.com"
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-foreground">
              Mot de passe
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

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
