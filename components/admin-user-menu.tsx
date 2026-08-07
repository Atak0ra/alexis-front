"use client";

/**
 * AdminUserMenu — pendant admin de components/user-menu.tsx (interface client).
 * Même structure (icône profil dans la barre du haut, dropdown, modale de
 * confirmation de déconnexion) — pas de plan/upgrade ici, les admins n'ont
 * pas de plan.
 *
 * Fermeture : clic extérieur ou Échap (focus retourné au bouton).
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserCircle } from "lucide-react";
import { clearAdminApiKey, getAdminApiKey } from "@/lib/session";
import { adminGetMe, type AdminProfile } from "@/lib/api-client";
import { Modal, ModalFooter } from "@/components/ui/modal";

export function AdminUserMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Charger le profil une seule fois
  useEffect(() => {
    const key = getAdminApiKey();
    if (!key) return;
    adminGetMe(key)
      .then(setProfile)
      .catch(() => {/* fail-open */});
  }, []);

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

  function handleLogout() {
    clearAdminApiKey();
    router.push("/admin/login");
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          aria-label="Menu admin"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="relative flex h-9 items-center gap-1.5 rounded-lg px-2 text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <UserCircle className="h-5 w-5 shrink-0" />
          {profile && (
            <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:inline">
              {profile.email}
            </span>
          )}
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-border bg-surface-raised shadow-lg"
          >
            {profile && (
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-sm font-medium text-foreground">{profile.email}</p>
                <p className="mt-0.5 text-xs text-foreground-subtle">Admin</p>
              </div>
            )}

            <div className="py-1.5">
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
        onClose={() => setConfirmLogout(false)}
        title="Se déconnecter"
        titleId="admin-user-menu-logout-modal-title"
        maxWidth="max-w-sm"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand">
            <LogOut className="h-5 w-5" />
          </span>
          <p className="text-sm text-foreground-muted">
            Tu devras ressaisir tes identifiants pour revenir sur le cockpit.
          </p>
        </div>
        <ModalFooter className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmLogout(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-sunken hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            Se déconnecter
          </button>
        </ModalFooter>
      </Modal>
    </>
  );
}
