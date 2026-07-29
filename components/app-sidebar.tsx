"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearApiKey, getApiKey, getKeyId } from "@/lib/session";
import { getMe, listProjects, revokeApiKey, type ProjectOut } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import NewProjectCTA from "@/components/new-project-cta";

function NavItem({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-brand-light text-brand" : "text-foreground-muted hover:bg-surface-sunken hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

function SidebarNav({
  pathname, projects, emailVerified,
}: { pathname: string; projects: ProjectOut[] | null; emailVerified: boolean }) {
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  const activeProjectId = match ? match[1] : null;
  const activeProject = projects?.find((p) => p.id === activeProjectId) ?? null;

  if (activeProjectId && activeProject) {
    const base = `/dashboard/${activeProject.id}`;
    return (
      <nav className="flex-1 px-3">
        <Link
          href="/dashboard"
          className="mb-4 flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-foreground-subtle transition-colors hover:text-foreground-muted"
        >
          ← Tous les projets
        </Link>
        <p className="truncate px-2.5 pb-2 font-mono text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
          {activeProject.name}
        </p>
        <div className="space-y-1">
          <NavItem href={base} active={pathname === base || pathname.includes("/issues/")}>
            Tickets
          </NavItem>
          <NavItem href={`${base}/settings`} active={pathname.endsWith("/settings")}>
            Paramètres
          </NavItem>
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex-1 px-3">
      <NavItem href="/dashboard" active={pathname === "/dashboard"}>
        Tableau de bord
      </NavItem>
      <NavItem href="/dashboard/account" active={pathname === "/dashboard/account"}>
        Mon compte
      </NavItem>

      {projects && projects.length > 0 && (
        <div className="mt-5">
          <p className="px-2.5 pb-1 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">Projets</p>
          <div className="space-y-0.5">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/${p.id}`}
                className="flex items-center gap-2 truncate rounded-lg px-2.5 py-1.5 text-sm text-foreground-muted transition-colors hover:bg-surface-sunken hover:text-foreground"
              >
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", p.is_active ? "bg-success" : "bg-border-strong")} />
                <span className="truncate">{p.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <NewProjectCTA
        emailVerified={emailVerified}
        href="/projects/new/choice"
        className="mt-4 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand-light"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nouveau projet
      </NewProjectCTA>
    </nav>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectOut[] | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;
    listProjects(apiKey).then(setProjects).catch(() => setProjects([]));
    getMe(apiKey)
      .then((me) => { setEmail(me.email); setEmailVerified(me.email_verified); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    const apiKey = getApiKey();
    const keyId = getKeyId();
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
    <>
      {/* Mobile top bar */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface-raised px-4 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">
            A
          </span>
          Alexis
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground-muted hover:bg-surface-sunken hover:text-foreground transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-surface-raised py-5">
            <SidebarNav pathname={pathname} projects={projects} emailVerified={emailVerified} />
            <div className="border-t border-border px-3 pt-4">
              {email && <p className="truncate px-2.5 pb-2 text-xs text-foreground-subtle">{email}</p>}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-sunken hover:text-foreground"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-border lg:bg-surface-raised">
        <Link href="/dashboard" className="flex items-center gap-2 px-5 py-5 font-display text-sm font-bold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">
            A
          </span>
          Alexis
        </Link>

        <SidebarNav pathname={pathname} projects={projects} emailVerified={emailVerified} />

        <div className="border-t border-border px-3 py-4">
          {email && <p className="truncate px-2.5 pb-2 text-xs text-foreground-subtle">{email}</p>}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-sunken hover:text-foreground"
          >
            Se déconnecter
          </button>
        </div>
      </aside>
    </>
  );
}
