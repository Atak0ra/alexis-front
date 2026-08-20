"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getScaffoldStatus } from "@/lib/api-client";
import { getApiKey } from "@/lib/session";

type Phase = "polling" | "done" | "failed";

const SCAFFOLD_STEPS = [
  "Choix de la stack technique",
  "Génération de la structure Monorepo",
  "Vérification qualité (lint · tests)",
  "Push du code initial sur la branche principale",
];

export default function ScaffoldPage() {
  const router = useRouter();
  const params = useSearchParams();
  const projectId = params.get("projectId");
  const isNew = params.get("new") === "true";

  const [phase, setPhase] = useState<Phase>("polling");
  const [elapsed, setElapsed] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { if (!projectId) router.replace("/dashboard"); }, [projectId, router]);

  // Chrono
  useEffect(() => {
    if (phase !== "polling") return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Animation étapes ~6s chacune
  useEffect(() => {
    if (phase !== "polling") return;
    const id = setInterval(
      () => setActiveStep((s) => Math.min(s + 1, SCAFFOLD_STEPS.length - 1)),
      6000
    );
    return () => clearInterval(id);
  }, [phase]);

  // Polling statut
  useEffect(() => {
    if (!projectId) return;
    pollRef.current = setInterval(async () => {
      const apiKey = getApiKey();
      if (!apiKey) return;
      try {
        const { status, error: err } = await getScaffoldStatus(apiKey, projectId);
        if (status === "done") {
          clearInterval(pollRef.current!);
          setPhase("done");
          setTimeout(() => {
            router.push(
              `/projects/new/context?projectId=${projectId}${isNew ? "&new=true" : ""}`
            );
          }, 1200);
        } else if (status === "failed") {
          clearInterval(pollRef.current!);
          setPhase("failed");
          setError(err ?? "Le scaffolding a échoué. Tu peux continuer ou contacter le support.");
        }
      } catch { /* erreur réseau → on continue */ }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [projectId, isNew, router]);

  if (!projectId) return null;
  const nextUrl = `/projects/new/context?projectId=${projectId}${isNew ? "&new=true" : ""}`;

  return (
    <div className="space-y-8">
      {/* Titre */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {phase === "done"
            ? "Projet initialisé ✓"
            : phase === "failed"
            ? "Initialisation échouée"
            : "Alexis prépare ton projet…"}
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {phase === "polling" && (
            <>
              Alexis génère la structure de code, configure les outils de qualité
              et pousse le code initial sur la branche principale.
              {elapsed > 12 && <> Cela peut prendre une minute.</>}
            </>
          )}
          {phase === "done" && "Structure prête. Redirection en cours…"}
          {phase === "failed" && "Une erreur est survenue lors de l'initialisation."}
        </p>
      </div>

      {/* Checklist des sous-étapes */}
      <ul className="space-y-3">
        {SCAFFOLD_STEPS.map((label, idx) => {
          const isDone = phase === "done" || idx < activeStep;
          const isCurrent = phase === "polling" && idx === activeStep;
          return (
            <li key={idx} className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isDone
                    ? "bg-brand text-white"
                    : isCurrent
                    ? "border-2 border-brand bg-brand-light text-brand"
                    : "border-2 border-border bg-surface text-foreground-subtle"
                }`}
              >
                {isDone ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                ) : (
                  idx + 1
                )}
              </span>
              <span
                className={`text-sm ${
                  isDone
                    ? "text-foreground-muted line-through"
                    : isCurrent
                    ? "font-medium text-foreground"
                    : "text-foreground-subtle"
                }`}
              >
                {label}
                {isCurrent && (
                  <span className="ml-2 text-xs text-foreground-subtle">({elapsed}s)</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Barre de progression */}
      {phase === "polling" && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-brand transition-all duration-[6000ms] ease-linear"
            style={{
              width: `${Math.round(((activeStep + 1) / SCAFFOLD_STEPS.length) * 100)}%`,
            }}
          />
        </div>
      )}

      {/* Succès */}
      {phase === "done" && (
        <div className="flex items-start gap-4 rounded-xl border border-success-border bg-success-bg px-5 py-4">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="text-sm font-medium text-foreground">Structure générée et poussée sur la branche principale</p>
            <p className="mt-0.5 text-xs text-foreground-muted">Redirection vers l&apos;étape contexte…</p>
          </div>
        </div>
      )}

      {/* Échec */}
      {phase === "failed" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-danger-border bg-danger-bg px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-danger">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push(nextUrl)}
            className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors"
          >
            Continuer quand même →
          </button>
        </div>
      )}
    </div>
  );
}
