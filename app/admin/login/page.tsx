"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin, AlexisApiError } from "@/lib/api-client";
import { setAdminApiKey } from "@/lib/session";
import { AdminPanel, adminButtonClass, adminEyebrowClass, adminInputClass } from "../_components/chrome";

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
      router.push("/admin/clients");
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-bg px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className={adminEyebrowClass}>Alexis // Admin</p>
          <h1 className="mt-2 font-mono text-lg font-semibold text-admin-ink">Accès console</h1>
        </div>

        <AdminPanel className="p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="admin-email" className={adminEyebrowClass}>
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`mt-2 ${adminInputClass}`}
              />
            </div>
            <div>
              <label htmlFor="admin-password" className={adminEyebrowClass}>
                Mot de passe
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`mt-2 ${adminInputClass}`}
              />
            </div>

            {error && <p className="font-mono text-xs text-admin-danger">{error}</p>}

            <button type="submit" disabled={submitting} className={`w-full ${adminButtonClass}`}>
              {submitting ? "Connexion…" : "Authentifier →"}
            </button>
          </form>
        </AdminPanel>

        <p className="mt-6 text-center text-xs text-admin-mist">
          Réservé aux comptes créés via <span className="font-mono text-admin-ink/80">make create-admin</span>.
        </p>
      </div>
    </div>
  );
}
