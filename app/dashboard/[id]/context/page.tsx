"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getProject, getProjectContext, AlexisApiError, type ProjectOut } from "@/lib/api-client";
import { getApiKey } from "@/lib/session";
import ProjectContextCard from "@/components/project-context-card";
import ProjectContextStep from "@/components/project-context-step";

export default function ProjectContextPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();

  const [project, setProject] = useState<ProjectOut | null>(null);
  const [contextExists, setContextExists] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const apiKey = getApiKey() ?? "";

  useEffect(() => {
    if (!apiKey) return;

    getProject(apiKey, projectId)
      .then(setProject)
      .catch((err) => setLoadError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"));

    getProjectContext(apiKey, projectId)
      .then(({ exists }) => setContextExists(exists))
      .catch(() => setContextExists(false));
  }, [projectId, apiKey]);

  function handleGenerated() {
    setContextExists(true);
    router.refresh();
  }

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <p className="text-base font-semibold text-foreground">{loadError}</p>
        <Link
          href={`/dashboard/${projectId}`}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-sunken transition-colors"
        >
          ← Retour au projet
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-foreground-muted">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          Projets
        </Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`} className="hover:text-foreground transition-colors">
          {project?.name ?? "…"}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Contexte</span>
      </div>

      <h1 className="text-2xl font-bold text-foreground">Contexte du projet</h1>
      <p className="mt-1.5 text-sm text-foreground-muted">
        Le fichier <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-foreground">.alexis/project.md</code>{" "}
        qu&apos;Alexis relit à chaque étape (spec, plan, dev) pour comprendre votre projet.
      </p>

      <div className="mt-6">
        {contextExists === null && (
          <div className="flex items-center gap-3 py-8 text-sm text-foreground-muted">
            <svg className="h-4 w-4 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Chargement…
          </div>
        )}

        {contextExists === true && (
          <ProjectContextCard projectId={projectId} defaultExpanded onContextUpdated={handleGenerated} />
        )}

        {contextExists === false && (
          <ProjectContextStep
            projectId={projectId}
            embedded
            onDone={handleGenerated}
            onSkip={() => router.push(`/dashboard/${projectId}`)}
          />
        )}
      </div>
    </div>
  );
}
