"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  // Ferme le panneau si l'écran repasse en desktop (évite un panneau
  // "ouvert" invisible qui bloquerait le clavier au retour au mobile)
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 640) setOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <nav className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-sm font-bold tracking-tight text-foreground"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">
            A
          </span>
          Alexis
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/pricing"
            className="text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
          >
            Tarifs
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
          >
            Connexion
          </Link>
          <Link href="/login?mode=signup" className={buttonVariants("primary")}>
            Commencer gratuitement
          </Link>
        </div>

        {/* Mobile trigger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
          className="rounded-lg p-2 text-foreground-muted hover:bg-surface-sunken hover:text-foreground transition-colors sm:hidden"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile panel */}
      {open && (
        <div
          id="landing-mobile-menu"
          className="flex flex-col gap-1 border-t border-border bg-surface px-6 py-4 sm:hidden"
        >
          <Link
            href="/pricing"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground-muted hover:bg-surface-sunken hover:text-foreground transition-colors"
          >
            Tarifs
          </Link>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground-muted hover:bg-surface-sunken hover:text-foreground transition-colors"
          >
            Connexion
          </Link>
          <Link
            href="/login?mode=signup"
            onClick={() => setOpen(false)}
            className={`${buttonVariants("primary")} mt-2 justify-center`}
          >
            Commencer gratuitement
          </Link>
        </div>
      )}
    </nav>
  );
}
