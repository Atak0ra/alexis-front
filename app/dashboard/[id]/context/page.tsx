"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getProject, getProjectContext, getProjectContextContent, AlexisApiError, friendlyError, type ProjectOut } from "@/lib/api-client";
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

interface Section {
  title: string;
  body: string;
}

/** Découpe .alexis/project.md par titres ## — chaque section garde son propre
 * en-tête (icône + titre) au sein d'un même document qui se lit comme du
 * texte continu, pas des cartes séparées. Tout ce qui précède le premier ##
 * (le # Contexte projet du template) est ignoré : redondant avec le H1 de
 * la page. */
function splitSections(content: string): Section[] {
  const lines = content.split("\n");
  const sections: Section[] = [];
  let title: string | null = null;
  let body: string[] = [];

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)/);
    if (match) {
      if (title !== null) sections.push({ title, body: body.join("\n").trim() });
      title = match[1].trim();
      body = [];
    } else if (title !== null) {
      body.push(line);
    }
  }
  if (title !== null) sections.push({ title, body: body.join("\n").trim() });
  return sections;
}

const SECTION_ICONS: Record<string, ReactNode> = {
  objectif: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
  ),
  "stack technique": (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
  ),
  conventions: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.098 4.02 8.25 4.982 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
  ),
  contraintes: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
  ),
  pointeurs: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  ),
};

const DEFAULT_ICON = (
  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
);

function SectionBlock({ section, first }: { section: Section; first: boolean }) {
  const icon = SECTION_ICONS[section.title.toLowerCase()] ?? DEFAULT_ICON;
  return (
    <div className={first ? "" : "mt-8 border-t border-border pt-8"}>
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10">
          <svg className="h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {icon}
          </svg>
        </div>
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-foreground-subtle">
          {section.title}
        </p>
      </div>
      <div className="[&_p]:text-[15px] [&_p]:leading-relaxed [&_li]:text-[15px] [&_li]:leading-relaxed">
        <MarkdownLite text={section.body} />
      </div>
    </div>
  );
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
      .catch((err) => setLoadError(friendlyError(err)));

    getProjectContext(apiKey, projectId)
      .then(({ exists }) => {
        if (exists) {
          getProjectContextContent(apiKey, projectId)
            .then((res) => {
              if (res.status === "not_found") {
                // Le contexte n'est pas encore persisté en DB → afficher le formulaire
                setContextExists(false);
              } else {
                setContextExists(true);
                setContent(res.content);
              }
            })
            .catch(() => {
              setContextExists(false);
            });
        } else {
          setContextExists(false);
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
      if (exists) {
        getProjectContextContent(apiKey, projectId).then((res) => {
          if (res.status === "not_found") {
            setContextExists(false);
          } else {
            setContextExists(true);
            setContent(res.content);
          }
        });
      } else {
        setContextExists(false);
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
      <div className="mx-auto w-full max-w-[1600px] px-6 py-8">
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

            {/* Document continu — chaque ## garde un en-tête icône + titre,
                mais tout se lit comme un seul texte, pas des cartes séparées. */}
            <div className="mt-8 max-w-3xl">
              {splitSections(content ?? "").map((section, i) => (
                <SectionBlock key={section.title} section={section} first={i === 0} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
