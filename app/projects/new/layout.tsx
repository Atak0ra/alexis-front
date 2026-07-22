"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getApiKey } from "@/lib/session";
import { NewProjectProvider } from "@/lib/new-project-context";
import { AppHeader } from "@/components/app-header";
import NewProjectStepper from "@/components/new-project-stepper";

function pathToStep(pathname: string): 1 | 2 | 3 | 4 {
  if (pathname.includes("/repo")) return 2;
  if (pathname.includes("/agent")) return 3;
  if (pathname.includes("/context")) return 4;
  return 1;
}

export default function NewProjectLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getApiKey()) {
      router.replace("/login");
      return;
    }
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
          <p className="text-sm text-foreground-muted">Chargement…</p>
        </div>
      </div>
    );
  }

  const currentStep = pathToStep(pathname ?? "");

  return (
    <NewProjectProvider>
      <div className="flex min-h-screen flex-col bg-surface">
        <AppHeader />

        {/* Main area: sidebar rail + content */}
        <div className="flex flex-1">
          {/* ── Left rail (desktop) ── */}
          <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-surface-raised px-8 py-12">
            <p className="mb-8 text-xs font-semibold uppercase tracking-widest text-foreground-subtle">
              Nouveau projet
            </p>
            <NewProjectStepper current={currentStep} orientation="vertical" />
          </aside>

          {/* ── Content ── */}
          <main className="flex flex-1 flex-col">
            {/* Mobile stepper (horizontal, compact) */}
            <div className="lg:hidden border-b border-border bg-surface-raised px-6 py-4">
              <NewProjectStepper current={currentStep} orientation="horizontal" />
            </div>

            {/* Page content */}
            <div className="flex flex-1 items-start justify-center px-6 py-12 sm:px-10">
              <div className="w-full max-w-2xl">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </NewProjectProvider>
  );
}
