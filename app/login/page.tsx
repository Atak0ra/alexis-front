"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signup, login, AlexisApiError } from "@/lib/api-client";
import { setApiKey, setKeyId } from "@/lib/session";
import { isLocalMode } from "@/lib/demo-data";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(() =>
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "signup" && password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setSubmitting(true);
    try {
      const result = mode === "login" ? await login(email, password) : await signup(email, password);
      setApiKey(result.api_key);
      setKeyId(result.id);
      router.push("/dashboard");
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
            Espace client
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {mode === "login" ? "Bon retour" : "Créer un compte"}
          </h1>
          <p className="mt-1.5 text-sm text-foreground-muted">
            {mode === "login"
              ? "Connecte-toi pour accéder à ton tableau de bord."
              : "Démarre en quelques minutes, sans carte bancaire."}
          </p>
        </div>

        {/* Demo hint */}
        {isLocalMode() && (
          <div className="mt-6 rounded-xl border border-brand/20 bg-brand-light px-4 py-3">
            <p className="text-xs font-medium text-brand">
              Mode démo — identifiants : <span className="font-mono">demo</span> / <span className="font-mono">passer</span>
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
              {isLocalMode() ? "Identifiant" : "Adresse email"}
            </label>
            <input
              id="email"
              type={isLocalMode() ? "text" : "email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={isLocalMode() ? "demo" : "vous@exemple.com"}
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isLocalMode() ? undefined : 8}
              placeholder={isLocalMode() ? "passer" : "••••••••"}
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
            />
          </div>

          {mode === "signup" && !isLocalMode() && (
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-foreground">
                Confirmer le mot de passe
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
              />
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {submitting
              ? mode === "login" ? "Connexion…" : "Création…"
              : mode === "login" ? "Se connecter" : "Créer le compte"}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="mt-6 text-center text-sm text-foreground-muted">
          {mode === "login" ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setConfirmPassword("");
            }}
            className="font-semibold text-brand hover:text-brand-hover transition-colors"
          >
            {mode === "login" ? "Créer un compte" : "Se connecter"}
          </button>
        </p>

        {/* Footer links */}
        <div className="mt-10 flex items-center justify-center gap-3 text-xs text-foreground-subtle">
          <Link href="/" className="hover:text-foreground-muted transition-colors">
            ← Retour à l&apos;accueil
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/admin/login" className="hover:text-foreground-muted transition-colors">
            Espace admin →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
