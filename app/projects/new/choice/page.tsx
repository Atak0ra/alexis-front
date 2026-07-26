"use client";

import { useRouter } from "next/navigation";
import { useNewProject } from "@/lib/new-project-context";

export default function ChoicePage() {
  const router = useRouter();
  const { setHosted } = useNewProject();

  function choose(hosted: boolean) {
    setHosted(hosted);
    router.push("/projects/new/repo");
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">Ton dépôt de code</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        As-tu déjà un dépôt Git pour ce projet ?
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => choose(false)}
          className="flex flex-col items-start gap-2 rounded-xl border border-border bg-surface-raised p-5 text-left transition-colors hover:border-brand hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span className="text-base font-semibold text-foreground">J&apos;ai déjà un dépôt</span>
          <span className="text-sm text-foreground-muted">
            Connecte ton dépôt GitHub ou GitLab existant avec un token d&apos;accès.
          </span>
        </button>

        <button
          type="button"
          onClick={() => choose(true)}
          className="flex flex-col items-start gap-2 rounded-xl border border-border bg-surface-raised p-5 text-left transition-colors hover:border-brand hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span className="text-base font-semibold text-foreground">Je n&apos;ai pas de dépôt</span>
          <span className="text-sm text-foreground-muted">
            Alexis en crée un privé pour toi et t&apos;y ajoute en tant que collaborateur admin.
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => choose(true)}
        className="mt-4 text-sm text-foreground-muted underline-offset-2 hover:text-foreground hover:underline transition-colors"
      >
        Passer — Alexis créera un dépôt hébergé
      </button>
    </>
  );
}
