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
  /** Email saisi au moment du signup — affiché dans l'encart de confirmation */
  const [signupEmail, setSignupEmail] = useState<string | null>(null);

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
      if (mode === "signup" && !isLocalMode()) {
        // Après signup : afficher l'encart "vérifie ta boîte mail"
        // plutôt que de rediriger directement — le user doit savoir qu'un
        // email l'attend avant de pouvoir créer des projets.
        setSignupEmail(email);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  }

  // Encart de confirmation post-signup (affiché à la place du formulaire)
  if (signupEmail) {
    return (
      <div className="flex min-h-screen flex-col bg-surface px-6 py-10 sm:items-center sm:justify-center sm:py-16">
        <div className="w-full sm:max-w-sm">
          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">
              A
            </span>
            Alexis
          </Link>
          <div className="mt-4 border-t border-border" />

          <div className="mt-8 rounded-xl border border-brand/20 bg-brand-light px-6 py-6">
            <h2 className="text-lg font-bold text-foreground">Compte créé</h2>
            <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
              On t&apos;a envoyé un email à{" "}
              <span className="font-medium text-foreground">{signupEmail}</span>.
              Clique sur le lien pour activer ton compte et commencer à créer des projets.
            </p>
            <p className="mt-3 text-xs text-foreground-subtle">
              Vérifie aussi tes spams si tu ne vois rien dans les prochaines minutes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-6 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors"
          >
            Aller au tableau de bord
          </button>

          <div className="mt-10 flex items-center justify-center gap-3 text-xs text-foreground-subtle">
            <Link href="/" className="hover:text-foreground-muted transition-colors">
              ← Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface px-6 py-10 sm:items-center sm:justify-center sm:py-16">
      <div className="w-full sm:max-w-sm">
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
        <form onSubmit={handleSubmit} className="mt-8 space-y-5" aria-describedby={error ? "form-error" : undefined} noValidate>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
              {isLocalMode() ? "Identifiant" : "Adresse email"}
              <span className="text-danger ml-0.5" aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              type={isLocalMode() ? "text" : "email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              aria-describedby={error ? "form-error" : undefined}
              placeholder={isLocalMode() ? "demo" : "vous@exemple.com"}
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
              Mot de passe
              <span className="text-danger ml-0.5" aria-hidden="true">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              aria-describedby={error ? "form-error" : undefined}
              minLength={isLocalMode() ? undefined : 8}
              placeholder={isLocalMode() ? "passer" : "••••••••"}
              className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
            />
          </div>

          {mode === "signup" && !isLocalMode() && (
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-foreground">
                Confirmer le mot de passe
                <span className="text-danger ml-0.5" aria-hidden="true">*</span>
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                aria-required="true"
                aria-describedby={error ? "form-error" : undefined}
                minLength={8}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
              />
            </div>
          )}

          {error && (
            <p id="form-error" role="alert" className="flex items-center gap-2 rounded-lg border border-danger-border bg-danger-bg px-3 py-2.5 text-sm text-danger">
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
