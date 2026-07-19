"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearApiKey, getApiKey, getKeyId } from "@/lib/session";
import { revokeApiKey } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  projectName?: string;
}

export function AppHeader({ projectName }: AppHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    const apiKey = getApiKey();
    const keyId = getKeyId();
    // Révoquer la clé côté backend avant de la supprimer localement
    if (apiKey && keyId) {
      try {
        await revokeApiKey(apiKey, keyId);
      } catch {
        // Échec silencieux — on déconnecte quand même localement
      }
    }
    clearApiKey();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-surface-raised px-6 shadow-sm">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight text-foreground hover:text-brand transition-colors"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">
          A
        </span>
        Alexis
      </Link>

      {/* Breadcrumb */}
      {projectName && (
        <div className="ml-4 flex items-center gap-2 text-sm text-foreground-muted">
          <span>/</span>
          <span className="font-medium text-foreground">{projectName}</span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        {/* New project button */}
        <Link
          href="/projects/new/repo"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium text-foreground-muted hover:bg-surface-sunken hover:text-foreground transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nouveau projet
        </Link>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-brand hover:bg-brand hover:text-white transition-colors text-sm font-semibold"
            aria-label="Menu utilisateur"
          >
            U
          </button>

          {menuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              {/* Dropdown */}
              <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-border bg-surface-raised shadow-modal overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-xs text-foreground-muted">Connecté en tant que</p>
                  <p className="mt-0.5 text-sm font-medium text-foreground truncate">Utilisateur</p>
                </div>
                <div className="p-1">
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface-sunken transition-colors"
                  >
                    <svg className="h-4 w-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Tableau de bord
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger-bg transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Se déconnecter
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
