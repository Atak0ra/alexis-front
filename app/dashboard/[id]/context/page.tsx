"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getProject, getProjectContext, getProjectContextContent, AlexisApiError, type ProjectOut } from "@/lib/api-client";
import { getApiKey } from "@/lib/session";
import ProjectContextStep from "@/components/project-context-step";
import MarkdownLite from "@/components/markdown-lite";

const LINE_CAP = 150;
const TOKEN_CAP = 2000;

/** Estimation grossière (~4 caractères/token) — cohérente avec l'ordre de
 * grandeur visé par le prompt context.md, pas un tokenizer exact. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function BudgetGauge({ content }: { content: string }) {
  const lines = content.split("\n").length;
  const tokens = estimateTokens(content);
  const ratio = Math.min(1, lines / LINE_CAP);
  const overBudget = lines > LINE_CAP || tokens > TOKEN_CAP;
  const nearBudget = !overBudget && ratio > 0.8;

  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-sunken sm:w-40">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            overBudget ? "bg-danger" : nearBudget ? "bg-warning" : "bg-brand"
          }`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <p className="whitespace-nowrap font-mono text-xs text-foreground-subtle">
        {lines} / {LINE_CAP} lignes
        <span className="hidden sm:inline"> · ~{tokens} / {TOKEN_CAP} tokens</span>
      </p>
    </div>
  );
}

export default function ProjectContextPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();

  const [project, setProject] = useState<ProjectOut | null>(null);
  const [contextExists, setContextExists] = useState<boolean | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const apiKey = getApiKey() ?? "";

  useEffect(() => {
    if (!apiKey) return;

    getProject(apiKey, projectId)
      .then(setProject)
      .catch((err) => setLoadError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"));

    getProjectContext(apiKey, projectId)
      .then(({ exists }) => {
        setContextExists(exists);
        if (exists) {
          getProjectContextContent(apiKey, projectId)
            .then((res) => setContent(res.content))
            .catch(() => setContent(null));
        }
      })
      .catch(() => setContextExists(false));
  }, [projectId, apiKey]);

  function handleEditDone() {
    setEditing(false);
    setContent(null);
    setContextExists(null);
    if (!apiKey) return;
    getProjectContext(apiKey, projectId).then(({ exists }) => {
      setContextExists(exists);
      if (exists) {
        getProjectContextContent(apiKey, projectId).then((res) => setContent(res.content));
      }
    });
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

  const isLoading = contextExists === null || (contextExists === true && content === null);

  return (
    <div className="min-h-full">
      <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm text-foreground-muted">
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

        {editing ? (
          <ProjectContextStep
            projectId={projectId}
            embedded
            onDone={handleEditDone}
            onSkip={() => setEditing(false)}
          />
        ) : isLoading ? (
          <div className="flex items-center gap-3 py-16 text-sm text-foreground-muted">
            <svg className="h-4 w-4 animate-spin text-brand" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Chargement…
          </div>
        ) : contextExists === false ? (
          <ProjectContextStep
            projectId={projectId}
            embedded
            onDone={handleEditDone}
            onSkip={() => router.push(`/dashboard/${projectId}`)}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-2xl font-bold text-foreground">Contexte du projet</h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 text-xs font-medium text-success">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Committé
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-foreground-subtle">.alexis/project.md</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modifier
              </button>
            </div>

            <div className="mt-5">
              <BudgetGauge content={content ?? ""} />
            </div>

            <div className="mt-8 border-t border-border" />

            {/* Document */}
            <div
              className="mt-2 [&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:border-t [&_h3]:border-border [&_h3]:pt-6 [&_h3]:font-mono [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-widest [&_h3]:text-foreground-subtle first:[&_h3]:mt-0 first:[&_h3]:border-t-0 first:[&_h3]:pt-0 [&_p]:text-[15px] [&_p]:leading-relaxed [&_li]:text-[15px] [&_li]:leading-relaxed"
            >
              <MarkdownLite text={content ?? ""} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
