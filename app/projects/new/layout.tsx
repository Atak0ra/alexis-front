"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getApiKey } from "@/lib/session";
import { getMe } from "@/lib/api-client";
import { NewProjectProvider, useNewProject } from "@/lib/new-project-context";
import { AppHeader } from "@/components/app-header";
import NewProjectStepper from "@/components/new-project-stepper";
import EmailVerificationModal from "@/components/email-verification-modal";

// Composant interne qui a accès au contexte NewProject pour y injecter isByok
function LayoutInner({ children, pathname }: { children: ReactNode; pathname: string }) {
  const { isByok, setIsByok } = useNewProject();
  const router = useRouter();
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;
    getMe(apiKey)
      .then((me) => { setIsByok(me.plan?.requires_own_key ?? false); setEmailVerified(me.email_verified); })
      .catch(() => setIsByok(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calcul du numéro d'étape courant selon le plan :
  // BYOK  : 1=choice, 2=repo, 3=agent, 4=context
  // non-BYOK : 1=choice, 2=repo, 3=context  (agent sauté)
  function pathToStep(p: string): 1 | 2 | 3 | 4 {
    if (p.includes("/repo")) return 2;
    if (p.includes("/agent")) return isByok ? 3 : 3; // agent visible seulement BYOK
    if (p.includes("/context")) return isByok ? 4 : 3;
    return 1;
  }

  const currentStep = pathToStep(pathname ?? "");

  // Défense en profondeur : les points d'entrée (sidebar, dashboard) bloquent
  // déjà le clic, mais une navigation directe vers /projects/new/* doit
  // aussi être coupée avant de laisser remplir tout le wizard pour rien —
  // POST /projects renvoie 403 tant que le compte n'est pas vérifié.
  if (emailVerified === false) {
    return (
      <div className="flex min-h-screen flex-col bg-surface">
        <AppHeader />
        <EmailVerificationModal onClose={() => router.push("/dashboard")} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <AppHeader />

      {/* Main area: sidebar rail + content */}
      <div className="flex flex-1">
        {/* ── Left rail (desktop) ── */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-surface-raised px-8 py-12">
          <p className="mb-8 text-xs font-semibold uppercase tracking-widest text-foreground-subtle">
            Nouveau projet
          </p>
          <NewProjectStepper current={currentStep} isByok={isByok} orientation="vertical" />
        </aside>

        {/* ── Content ── */}
        <main className="flex flex-1 flex-col">
          {/* Mobile stepper (horizontal, compact) */}
          <div className="lg:hidden border-b border-border bg-surface-raised px-6 py-4">
            <NewProjectStepper current={currentStep} isByok={isByok} orientation="horizontal" />
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
  );
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

  return (
    <NewProjectProvider>
      <LayoutInner pathname={pathname ?? ""}>{children}</LayoutInner>
    </NewProjectProvider>
  );
}
