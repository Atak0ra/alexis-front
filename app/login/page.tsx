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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
    <div className="flex min-h-screen bg-surface">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-foreground p-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-mono text-sm font-bold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white text-sm font-bold">
            A
          </span>
          Alexis
        </Link>

        {/* Quote */}
        <div>
          <blockquote className="text-2xl font-semibold leading-snug text-white">
            &ldquo;Du ticket à la PR, sans intervention manuelle.&rdquo;
          </blockquote>
          <p className="mt-4 text-sm text-white/50">
            Connectez votre repo GitHub/GitLab. Alexis s&apos;occupe du reste.
          </p>

          {/* Mini stats */}
          <div className="mt-10 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-bold text-white">47</p>
              <p className="mt-1 text-xs text-white/40">Tickets résolus</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-2xl font-bold text-white">3</p>
              <p className="mt-1 text-xs text-white/40">En cours</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <p className="font-mono text-2xl font-bold text-white">$142</p>
              <p className="mt-1 text-xs text-white/40">Coût total</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-white/30">© 2026 Alexis</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <Link href="/" className="mb-8 flex items-center gap-2 font-mono text-sm font-bold text-foreground lg:hidden">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">
            A
          </span>
          Alexis
        </Link>

        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              {mode === "login" ? "Bon retour 👋" : "Créer un compte"}
            </h1>
            <p className="mt-2 text-sm text-foreground-muted">
              {mode === "login"
                ? "Connectez-vous pour accéder à votre tableau de bord."
                : "Démarrez en quelques minutes, sans carte bancaire."}
            </p>
          </div>

          {/* Demo hint */}
          {isLocalMode() && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand/20 bg-brand-light px-4 py-3">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-medium text-brand">
                Mode démo — identifiants : <span className="font-mono">demo</span> / <span className="font-mono">passer</span>
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Mot de passe
                </label>
              </div>
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

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-danger-border bg-danger-bg px-4 py-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === "login" ? "Connexion…" : "Création…"}
                </span>
              ) : mode === "login" ? (
                "Se connecter"
              ) : (
                "Créer le compte"
              )}
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
              }}
              className="font-semibold text-brand hover:text-brand-hover transition-colors"
            >
              {mode === "login" ? "Créer un compte" : "Se connecter"}
            </button>
          </p>

          {/* Back to landing */}
          <div className="mt-8 text-center">
            <Link href="/" className="text-xs text-foreground-subtle hover:text-foreground-muted transition-colors">
              ← Retour à l&apos;accueil
            </Link>
          </div>
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
