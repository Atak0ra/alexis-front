"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getAdminApiKey } from "@/lib/session";
import { AdminUserMenu } from "@/components/admin-user-menu";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Cockpit" },
  { href: "/admin/runs", label: "Runs" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/managed-secrets", label: "Clés gérées" },
  { href: "/admin/settings", label: "Réglages" },
];

function AdminNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
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
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        <AdminNav pathname={pathname} />
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
        <AdminNav pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
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
          <div className="ml-auto">
            <AdminUserMenu />
          </div>
        </header>

        {/* Desktop topbar — parité avec la barre du haut côté client (cloche +
            menu profil) : ici juste le menu profil, pas de notifications admin. */}
        <div className="hidden items-center justify-end border-b border-border px-4 py-2 lg:flex lg:px-6">
          <AdminUserMenu />
        </div>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
