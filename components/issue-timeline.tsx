"use client";

import { useState, useEffect, useRef } from "react";
import { Inbox, Search, Code2, CheckCircle2, AlertTriangle, SendHorizonal, RefreshCw, CircleCheck, Loader2, type LucideIcon } from "lucide-react";
import { getIssueSteps, getRetryTargetState, type StepId } from "@/lib/issue-steps";
import { cn } from "@/lib/utils";
import {
  sendIssueChat,
  getIssueChatStatus,
  updateIssue,
  type Issue,
  type IssueComment,
  type ChatStatus,
} from "@/lib/api-client";
import MarkdownLite from "@/components/markdown-lite";

const STEP_ICONS: Record<StepId, LucideIcon> = {
  requested: Inbox,
  analysis: Search,
  development: Code2,
  done: CheckCircle2,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface IssueTimelineProps {
  issue: Issue;
  states: Record<string, string>;
  projectId: string;
  apiKey: string;
  onIssueUpdated: (issue: Issue) => void;
}

/** Détecte si l'état courant est une phase de review (spec ou plan). */
function isReviewState(state: string): boolean {
  const s = state.toLowerCase();
  return s.includes("review") && (s.includes("spec") || s.includes("plan"));
}

/** Retourne la clé interne du step (spec|plan) selon l'état. */
function reviewPhase(state: string): "spec" | "plan" | null {
  const s = state.toLowerCase();
  if (s.includes("spec")) return "spec";
  if (s.includes("plan")) return "plan";
  return null;
}

/** Trouve le state label à partir d'une clé dans la map states du projet. */
function findStateLabel(states: Record<string, string>, key: string): string | null {
  return states[key] ?? null;
}

export default function IssueTimeline({
  issue,
  states,
  projectId,
  apiKey,
  onIssueUpdated,
}: IssueTimelineProps) {
  const steps = getIssueSteps(issue, states);
  const [chatMessage, setChatMessage] = useState("");
  const [chatStatus, setChatStatus] = useState<ChatStatus>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"regen" | "validate" | "retry" | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inReview = isReviewState(issue.state);
  const phase = reviewPhase(issue.state);
  const retryTargetState = getRetryTargetState(issue.state, states);

  // Polling du statut chat tant que in_progress
  useEffect(() => {
    if (chatStatus === "in_progress") {
      pollRef.current = setInterval(async () => {
        try {
          const res = await getIssueChatStatus(apiKey, projectId, issue.id);
          setChatStatus(res.status);
          if (res.status !== "in_progress") {
            clearInterval(pollRef.current!);
            if (res.status === "failed") setChatError(res.error ?? "Erreur inconnue");
            // Rafraîchir l'issue pour afficher le commentaire alexis
            if (res.status === "done") onIssueUpdated({ ...issue });
          }
        } catch {
          clearInterval(pollRef.current!);
          setChatStatus("failed");
          setChatError("Erreur lors de la vérification du statut.");
        }
      }, 2000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [chatStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSendChat() {
    const msg = chatMessage.trim();
    if (!msg || chatStatus === "in_progress") return;
    setChatError(null);
    setChatStatus("in_progress");
    setChatMessage("");
    try {
      await sendIssueChat(apiKey, projectId, issue.id, msg);
    } catch (err: unknown) {
      setChatStatus("failed");
      const detail = (err as { detail?: string })?.detail;
      setChatError(detail ?? "Impossible d'envoyer le message.");
    }
  }

  async function handleRegenerate() {
    if (!phase) return;
    setActionLoading("regen");
    try {
      // Repasser au trigger du step courant (efface le lock → poller relance)
      const triggerKey = phase === "spec" ? "todo" : "plan";
      const newState = findStateLabel(states, triggerKey);
      if (!newState) throw new Error(`État "${triggerKey}" introuvable dans la config.`);
      const updated = await updateIssue(apiKey, projectId, issue.id, { state: newState });
      onIssueUpdated(updated);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      setChatError(detail ?? "Impossible de relancer la génération.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRetry() {
    if (!retryTargetState) return;
    setActionLoading("retry");
    setChatError(null);
    try {
      const updated = await updateIssue(apiKey, projectId, issue.id, { state: retryTargetState });
      onIssueUpdated(updated);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      setChatError(detail ?? "Impossible de relancer le ticket.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleValidate() {
    if (!phase) return;
    setActionLoading("validate");
    try {
      // Passer au trigger du step suivant
      const nextKey = phase === "spec" ? "plan" : "dev";
      const newState = findStateLabel(states, nextKey);
      if (!newState) throw new Error(`État "${nextKey}" introuvable dans la config.`);
      const updated = await updateIssue(apiKey, projectId, issue.id, { state: newState });
      onIssueUpdated(updated);
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      setChatError(detail ?? "Impossible de valider.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <ol className="flex flex-col gap-6">
      {steps.map((step, idx) => {
        const Icon = step.status === "attention" ? AlertTriangle : STEP_ICONS[step.id];
        const isLast = idx === steps.length - 1;
        const isActive = step.status === "current" || step.status === "attention";

        const dotCls = cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
          step.status === "done" && "border-brand bg-brand text-white",
          step.status === "current" && "border-brand bg-brand text-white",
          step.status === "attention" && "border-warning bg-warning text-white",
          step.status === "upcoming" && "border-border-strong bg-surface-sunken text-foreground-subtle"
        );

        return (
          <li
            key={step.id}
            data-testid={`issue-step-${step.id}`}
            data-status={step.status}
            className="flex gap-4"
          >
            <div className="flex flex-col items-center">
              <div className={dotCls}>
                <Icon className="h-4 w-4" />
                {isActive && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                    <span
                      className={cn(
                        "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                        step.status === "attention" ? "bg-warning" : "bg-brand"
                      )}
                    />
                    <span
                      className={cn(
                        "relative inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-surface",
                        step.status === "attention" ? "bg-warning" : "bg-brand"
                      )}
                    />
                  </span>
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "mt-1 min-h-[2rem] w-0.5 flex-1 transition-all duration-300",
                    step.status === "done" ? "bg-brand" : "bg-border-strong"
                  )}
                />
              )}
            </div>

            <div className={cn("flex-1 pb-2", !isActive && "opacity-70")}>
              <p
                className={cn(
                  "text-sm font-semibold transition-all duration-300",
                  step.status === "upcoming" ? "text-foreground-subtle" : "text-foreground"
                )}
              >
                {step.label}
              </p>

              {step.id === "requested" && (
                <p className="mt-0.5 text-xs text-foreground-subtle">
                  Créée le {formatDate(issue.created_at)}
                </p>
              )}

              {isActive && (
                <div className="mt-3 space-y-4 rounded-xl border border-border bg-surface-raised p-4">
                  {step.status === "attention" && (
                    <p className="text-xs font-medium text-warning">
                      Légère itération en cours. Alexis ajuste le travail.
                    </p>
                  )}

                  <p className="text-xs text-foreground-subtle">
                    Dernière activité le {formatDate(issue.updated_at)}
                  </p>

                  <p className="whitespace-pre-wrap text-sm text-foreground-muted">
                    {issue.description || "Pas de description."}
                  </p>

                  {issue.comments.length > 0 && (
                    <ul className="space-y-3">
                      {issue.comments.map((c) => (
                        <li
                          key={c.id}
                          className={cn(
                            "rounded-lg p-3",
                            c.author === "alexis"
                              ? "bg-brand/10 border border-brand/20"
                              : "bg-surface-sunken"
                          )}
                        >
                          <p className="text-xs font-medium text-foreground-muted">
                            {c.author === "alexis" ? "Alexis" : "Vous"} · {formatDate(c.created_at)}
                          </p>
                          <div className="mt-1 text-sm text-foreground">
                            <MarkdownLite text={c.body} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Zone de conversation — disponible uniquement en review */}
                  {inReview && (
                    <div className="flex flex-col gap-3">
                      <textarea
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSendChat();
                        }}
                        rows={3}
                        placeholder="Posez une question ou apportez une précision… (⌘↵ pour envoyer)"
                        disabled={chatStatus === "in_progress"}
                        className="w-full resize-none rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
                      />

                      {chatError && (
                        <p className="text-xs font-medium text-red-500">{chatError}</p>
                      )}

                      {/* Boutons : Discuter / Régénérer / Valider */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={!chatMessage.trim() || chatStatus === "in_progress"}
                          onClick={handleSendChat}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-hover disabled:opacity-50"
                        >
                          {chatStatus === "in_progress" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SendHorizonal className="h-4 w-4" />
                          )}
                          {chatStatus === "in_progress" ? "En cours…" : "Discuter"}
                        </button>

                        <button
                          type="button"
                          disabled={actionLoading !== null}
                          onClick={handleRegenerate}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-surface-sunken disabled:opacity-50"
                        >
                          {actionLoading === "regen" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          Régénérer
                        </button>

                        <button
                          type="button"
                          disabled={actionLoading !== null}
                          onClick={handleValidate}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-brand bg-transparent px-4 py-2 text-sm font-medium text-brand transition-all hover:bg-brand/10 disabled:opacity-50"
                        >
                          {actionLoading === "validate" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CircleCheck className="h-4 w-4" />
                          )}
                          Valider
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Ticket en échec (2 tentatives) : bouton pour repasser dans l'état
                      actif (efface le lock, repris au prochain cycle poller) plutôt
                      que de glisser-déposer la carte manuellement. */}
                  {!inReview && retryTargetState && (
                    <div className="flex flex-col gap-2">
                      {chatError && (
                        <p className="text-xs font-medium text-red-500">{chatError}</p>
                      )}
                      <button
                        type="button"
                        disabled={actionLoading !== null}
                        onClick={handleRetry}
                        className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-hover disabled:opacity-50"
                      >
                        {actionLoading === "retry" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Relancer
                      </button>
                    </div>
                  )}

                  {/* Hors review : affichage des commentaires sans zone de chat */}
                  {!inReview && !retryTargetState && issue.comments.length === 0 && (
                    <p className="text-xs text-foreground-subtle">Aucune activité pour l&apos;instant.</p>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
