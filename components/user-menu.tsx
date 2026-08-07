"use client";

/**
 * UserMenu — icône profil dans la barre du haut.
 *
 * Clique → ouvre/ferme un dropdown avec :
 *   - En-tête : email + nom du plan
 *   - Mon profil → /dashboard/account
 *   - Paramètres → /dashboard/account
 *   - Faire évoluer mon plan → /pricing  (si plan non premium)
 *   - Se déconnecter (avec modale de confirmation)
 *
 * Fermeture : clic extérieur ou Échap (focus retourné au bouton).
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings, Sparkles, UserCircle } from "lucide-react";
import { clearApiKey, getApiKey, getKeyId } from "@/lib/session";
import { getMe, revokeApiKey, type ClientProfile } from "@/lib/api-client";
import { Modal, ModalFooter } from "@/components/ui/modal";

interface UserMenuProps {
  apiKey: string | null;
}

export function UserMenu({ apiKey }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Charger le profil une seule fois
  useEffect(() => {
    if (!apiKey) return;
    getMe(apiKey)
      .then(setProfile)
      .catch(() => {/* fail-open */});
  }, [apiKey]);

  // Fermer au clic extérieur ou Échap
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setLoggingOut(true);
    const key = getApiKey();
    const keyId = getKeyId();
    if (key && keyId) {
      try {
        await revokeApiKey(key, keyId);
      } catch {
        // Échec silencieux — on déconnecte quand même localement
      }
    }
    clearApiKey();
    router.push("/");
  }

  const planName = profile?.plan?.display_name ?? profile?.plan?.name ?? null;
  const isPaid = profile?.plan && profile.plan.monthly_price_usd > 0;

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          aria-label="Menu utilisateur"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="relative flex h-9 items-center gap-1.5 rounded-lg px-2 text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <UserCircle className="h-5 w-5 shrink-0" />
          {planName && (
            <span className="hidden rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-foreground-subtle sm:inline">
              {planName}
            </span>
          )}
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-border bg-surface-raised shadow-lg"
          >
            {/* En-tête profil */}
            {profile && (
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-sm font-medium text-foreground">{profile.email}</p>
                {planName && (
                  <p className="mt-0.5 text-xs text-foreground-subtle">{planName}</p>
                )}
              </div>
            )}

            {/* Entrées du menu */}
            <div className="py-1.5">
              <Link
                href="/dashboard/account"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground-muted transition-colors hover:bg-surface-sunken hover:text-foreground"
              >
                <UserCircle className="h-4 w-4 shrink-0" />
                Mon profil
              </Link>

              <Link
                href="/dashboard/account"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground-muted transition-colors hover:bg-surface-sunken hover:text-foreground"
              >
                <Settings className="h-4 w-4 shrink-0" />
                Paramètres
              </Link>

              {/* Invitation à évoluer — affichée uniquement sur plan gratuit */}
              {!isPaid && (
                <Link
                  href="/pricing"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand-light"
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  Faire évoluer mon plan
                </Link>
              )}
            </div>

            {/* Séparateur + déconnexion */}
            <div className="border-t border-border py-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); setConfirmLogout(true); }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-foreground-muted transition-colors hover:bg-surface-sunken hover:text-foreground"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Se déconnecter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modale de confirmation de déconnexion */}
      <Modal
        open={confirmLogout}
        onClose={() => { if (!loggingOut) setConfirmLogout(false); }}
        title="Se déconnecter"
        titleId="user-menu-logout-modal-title"
        maxWidth="max-w-sm"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand">
            <LogOut className="h-5 w-5" />
          </span>
          <p className="text-sm text-foreground-muted">
            Tu devras ressaisir tes identifiants pour revenir.
          </p>
        </div>
        <ModalFooter className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmLogout(false)}
            disabled={loggingOut}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-sunken hover:text-foreground disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {loggingOut ? "Déconnexion…" : "Se déconnecter"}
          </button>
        </ModalFooter>
      </Modal>
    </>
  );
}
