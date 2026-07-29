"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAdminApiKey, getAdminApiKey } from "@/lib/session";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Cockpit" },
  { href: "/admin/runs", label: "Runs" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/managed-secrets", label: "Clés gérées" },
  { href: "/admin/settings", label: "Réglages" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

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

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (!ready) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface-raised px-4 py-6">
        <Link href="/admin/clients" className="mb-8 flex items-center gap-2 font-display text-sm font-bold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">
            A
          </span>
          Admin
        </Link>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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

        <button
          type="button"
          onClick={() => {
            clearAdminApiKey();
            router.push("/admin/login");
          }}
          className="mt-auto block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground-muted hover:bg-surface-sunken hover:text-foreground transition-colors"
        >
          Déconnexion
        </button>
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
