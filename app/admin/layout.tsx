"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAdminApiKey, getAdminApiKey } from "@/lib/session";
import { Modal, ModalFooter } from "@/components/ui/modal";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Cockpit" },
  { href: "/admin/runs", label: "Runs" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/managed-secrets", label: "Clés gérées" },
  { href: "/admin/settings", label: "Réglages" },
];

function AdminNav({
  pathname,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <Link
        href="/admin/clients"
        onClick={onNavigate}
        className="mb-8 flex items-center gap-2 font-display text-sm font-bold text-foreground"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">
          A
        </span>
        Admin
      </Link>

      <nav className="space-y-1" aria-label="Navigation admin">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-light text-brand"
                  : "text-foreground-muted hover:bg-surface-sunken hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border pt-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:border-danger/30 hover:bg-danger-bg hover:text-danger"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Se déconnecter
        </button>
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setReady(true);
      return;
    }
    if (!getAdminApiKey()) {
      router.replace("/admin/login");
      return;
    }
    setReady(true);
  }, [pathname, router]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Close drawer on Escape
  useEffect(() => {
    if (!drawerOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [drawerOpen]);

  function handleLogout() {
    clearAdminApiKey();
    router.push("/admin/login");
  }

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (!ready) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border bg-surface-raised px-4 py-6">
        <AdminNav pathname={pathname} onLogout={() => setConfirmLogout(true)} />
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile drawer panel ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface-raised px-4 py-6 transition-transform duration-200 lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menu admin"
        aria-hidden={!drawerOpen}
      >
        {/* Close button inside drawer */}
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Fermer le menu"
          className="absolute right-3 top-3 rounded-lg p-2 text-foreground-muted hover:bg-surface-sunken hover:text-foreground transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <AdminNav
          pathname={pathname}
          onNavigate={() => setDrawerOpen(false)}
          onLogout={() => {
            setDrawerOpen(false);
            setConfirmLogout(true);
          }}
        />
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="flex items-center gap-3 border-b border-border bg-surface-raised px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={drawerOpen}
            className="rounded-lg p-2 text-foreground-muted hover:bg-surface-sunken hover:text-foreground transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-display text-sm font-bold text-foreground">Admin</span>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>

      {/* Modale de confirmation de déconnexion */}
      <Modal
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Se déconnecter"
        titleId="admin-logout-modal-title"
        maxWidth="max-w-sm"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
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
    </div>
  );
}
