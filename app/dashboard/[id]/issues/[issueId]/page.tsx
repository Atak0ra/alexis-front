"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getApiKey } from "@/lib/session";
import {
  getProject,
  listIssues,
  AlexisApiError,
  type ProjectOut,
  type Issue,
} from "@/lib/api-client";
import IssueTimeline from "@/components/issue-timeline";

export default function IssueDetailPage() {
  const params = useParams<{ id: string; issueId: string }>();
  const projectId = params.id;
  const issueId = params.issueId;

  const [project, setProject] = useState<ProjectOut | null>(null);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = getApiKey() ?? "";

  useEffect(() => {
    if (!apiKey) return;

    getProject(apiKey, projectId)
      .then(setProject)
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"));

    listIssues(apiKey, projectId)
      .then((issues) => {
        const found = issues.find((i) => i.id === issueId);
        if (found) setIssue(found);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [projectId, issueId, apiKey]);

  function handleIssueUpdated(updated: Issue) {
    // Si l'état a changé (Valider / Régénérer), recharger tout le fil
    // pour récupérer le nouvel état + commentaires depuis l'API.
    if (updated.state !== issue?.state) {
      listIssues(apiKey, projectId)
        .then((issues) => {
          const found = issues.find((i) => i.id === issueId);
          if (found) setIssue(found);
        })
        .catch(() => {});
    } else {
      // Sinon (rafraîchissement suite à chat done), recharger l'issue pour
      // afficher le nouveau commentaire alexis.
      listIssues(apiKey, projectId)
        .then((issues) => {
          const found = issues.find((i) => i.id === issueId);
          if (found) setIssue(found);
        })
        .catch(() => {});
    }
  }

  if (error || notFound) {
    return (
      <div className="flex h-full min-h-[calc(100vh-3.5rem)] flex-col bg-surface lg:min-h-screen">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <p className="text-base font-semibold text-foreground">
            {error ?? "Demande introuvable."}
          </p>
          <Link
            href={`/dashboard/${projectId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-sunken transition-colors"
          >
            ← Retour au projet
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      {issue === null || project === null ? (
        <div className="mt-6 space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded-lg bg-surface-sunken" />
          <div className="h-40 animate-pulse rounded-xl bg-surface-sunken" />
        </div>
      ) : (
        <>
          <h1 className="mt-4 text-2xl font-bold text-foreground">{issue.title}</h1>
          <p className="mt-1 font-mono text-xs text-foreground-subtle">{issue.identifier}</p>

          <div className="mt-8">
            <IssueTimeline
              issue={issue}
              states={project.states}
              projectId={projectId}
              apiKey={apiKey}
              onIssueUpdated={handleIssueUpdated}
            />
          </div>
        </>
      )}
    </div>
  );
}
