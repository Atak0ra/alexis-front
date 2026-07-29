"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMe, deleteAccount, AlexisApiError, type ClientProfile } from "@/lib/api-client";
import { getApiKey, clearApiKey } from "@/lib/session";

export default function AccountSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;
    getMe(apiKey)
      .then(setProfile)
      .catch((err) => setLoadError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"));
  }, []);

  async function handleDelete() {
    if (!profile || confirmEmail !== profile.email) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Session absente");
      await deleteAccount(apiKey);
      clearApiKey();
      router.push("/");
    } catch (err) {
      setDeleteError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold text-foreground">Mon compte</h1>

      {loadError && <p className="mt-4 text-sm text-danger">{loadError}</p>}

      {profile && (
        <div className="mt-8 space-y-8">
          <section className="rounded-xl border border-border bg-surface-raised p-5">
            <p className="text-sm text-foreground-muted">Adresse email</p>
            <p className="mt-1 font-medium text-foreground" data-testid="account-email">{profile.email}</p>
          </section>

          <div className="rounded-xl border border-danger-border bg-danger-bg p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-danger uppercase tracking-wider">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Zone de danger
            </h2>
            <p className="mt-2 text-sm text-danger/80">
              Supprime définitivement ton compte : tous tes projets, tickets, l&apos;historique des runs
              et les clés API chiffrées seront effacés, ainsi que le code cloné (volumes Docker) de tes
              projets. <strong>Irréversible.</strong>
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-danger">
                Tapez <strong className="font-mono">{profile.email}</strong> pour confirmer
              </label>
              <input
                type="text"
                value={confirmEmail}
                onChange={(e) => { setConfirmEmail(e.target.value); setDeleteError(null); }}
                placeholder={profile.email}
                className="w-full rounded-xl border border-danger-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-danger/30"
              />
              {deleteError && <p className="text-xs text-danger">{deleteError}</p>}
              <button
                type="button"
                disabled={confirmEmail !== profile.email || deleting}
                onClick={handleDelete}
                className="rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-danger/90 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                {deleting ? "Suppression…" : "Supprimer définitivement mon compte"}
              </button>
            </div>
          </div>

          <Link href="/dashboard" className="text-sm text-foreground-muted hover:text-foreground transition-colors">
            ← Retour au tableau de bord
          </Link>
        </div>
      )}
    </div>
  );
}
