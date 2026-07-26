"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin, AlexisApiError } from "@/lib/api-client";
import { setAdminApiKey } from "@/lib/session";
import { AdminCard, adminButtonClass, adminInputClass } from "../_components/chrome";

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
    <div className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
            A
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Back-office Alexis</h1>
          <p className="mt-1 text-sm text-foreground-muted">Réservé aux comptes admin.</p>
        </div>

        <AdminCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                className={adminInputClass}
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
                className={adminInputClass}
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button type="submit" disabled={submitting} className={`w-full ${adminButtonClass}`}>
              {submitting ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </AdminCard>

        <p className="mt-6 text-center text-xs text-foreground-subtle">
          Compte créé via <span className="font-mono">make create-admin</span>.
        </p>
      </div>
    </div>
  );
}
