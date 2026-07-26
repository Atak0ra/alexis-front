"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAdminApiKey, getAdminApiKey } from "@/lib/session";
import { adminEyebrowClass } from "./_components/chrome";

const NAV_ITEMS = [
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/managed-secrets", label: "Clés gérées" },
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
    <div className="flex min-h-screen bg-admin-bg">
      <aside className="flex w-60 shrink-0 flex-col border-r border-admin-line bg-admin-panel px-5 py-6">
        <Link href="/admin/clients" className="mb-10 block">
          <p className={adminEyebrowClass}>Alexis</p>
          <p className="font-mono text-sm font-semibold text-admin-ink">// Admin console</p>
        </Link>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 rounded px-3 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest transition-colors ${
                  active
                    ? "bg-admin-bg text-admin-signal"
                    : "text-admin-mist hover:bg-admin-panel-hover hover:text-admin-ink"
                }`}
              >
                <span
                  className={`h-3.5 w-[2px] shrink-0 rounded-full transition-colors ${
                    active ? "bg-admin-signal" : "bg-admin-line"
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-admin-line pt-4">
          <button
            type="button"
            onClick={() => {
              clearAdminApiKey();
              router.push("/admin/login");
            }}
            className="w-full rounded px-3 py-2.5 text-left font-mono text-xs font-semibold uppercase tracking-widest text-admin-mist hover:bg-admin-panel-hover hover:text-admin-ink transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 px-10 py-10">{children}</main>
    </div>
  );
}
