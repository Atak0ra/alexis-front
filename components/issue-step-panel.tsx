"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleX, Loader2, RefreshCw, SendHorizonal, TriangleAlert } from "lucide-react";
import { getRetryTargetState, type StepState } from "@/lib/issue-steps";
import { cn } from "@/lib/utils";
import {
  sendIssueChat,
  getIssueChatStatus,
  updateIssue,
  type Issue,
  type ChatStatus,
} from "@/lib/api-client";
import MarkdownLite from "@/components/markdown-lite";
import { humanizeErrorComment } from "@/lib/humanize-comment";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function findStateLabel(states: Record<string, string>, key: string): string | null {
  return states[key] ?? null;
}

function tabCls(selected: boolean): string {
  return cn(
    "rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
    selected ? "border-b-2 border-brand text-brand" : "border-b-2 border-transparent text-foreground-muted hover:text-foreground"
  );
}

interface IssueStepPanelProps {
  step: StepState;
  issue: Issue;
  states: Record<string, string>;
  projectId: string;
  apiKey: string;
  onIssueUpdated: (issue: Issue) => void;
}

export default function IssueStepPanel({
  step,
  issue,
  states,
  projectId,
  apiKey,
  onIssueUpdated,
}: IssueStepPanelProps) {
  const [activeTab, setActiveTab] = useState<"apercu" | "discussion">("apercu");
  const [chatMessage, setChatMessage] = useState("");
  const [chatStatus, setChatStatus] = useState<ChatStatus>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"regen" | "validate" | "retry" | null>(null);
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inReview = isReviewState(issue.state);
  const phase = reviewPhase(issue.state);
  const retryTargetState = getRetryTargetState(issue.state, states);

  useEffect(() => {
    if (chatStatus === "in_progress") {
      pollRef.current = setInterval(async () => {
        try {
          const res = await getIssueChatStatus(apiKey, projectId, issue.id);
          setChatStatus(res.status);
          if (res.status !== "in_progress") {
            clearInterval(pollRef.current!);
            if (res.status === "failed") setChatError(res.error ?? "Erreur inconnue");
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
      await updateIssue(apiKey, projectId, issue.id, { state: retryTargetState });
      // Retour direct sur le kanban plutôt qu'une simple mise à jour locale :
      // le kanban a son propre state (fetché une fois au montage) qui ne se
      // rafraîchit pas tout seul si la navigation "arrière" est servie depuis
      // le cache du router Next.js. router.refresh() force le refetch pour
      // voir la carte dans sa nouvelle colonne dès l'arrivée sur le kanban.
      router.push(`/dashboard/${projectId}`);
      router.refresh();
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail;
      setChatError(detail ?? "Impossible de relancer le ticket.");
      setActionLoading(null);
    }
  }

  async function handleValidate() {
    if (!phase) return;
    setActionLoading("validate");
    try {
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

  const isActiveStep = step.status === "current" || step.status === "attention";
  const showChat = isActiveStep && inReview;
  const showRetry = isActiveStep && !inReview && !!retryTargetState;
  const showPlaceholder = issue.comments.length === 0 && !showChat && !showRetry;

  return (
    <div className="rounded-xl border border-border bg-surface-raised">
      <div role="tablist" aria-label="Détails de l'étape" className="flex gap-1 border-b border-border px-2 pt-2">
        <button type="button" role="tab" aria-selected={activeTab === "apercu"} onClick={() => setActiveTab("apercu")} className={tabCls(activeTab === "apercu")}>
          Aperçu
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "discussion"} onClick={() => setActiveTab("discussion")} className={tabCls(activeTab === "discussion")}>
          Discussion
        </button>
      </div>

      <div role="tabpanel" className="p-4">
        {activeTab === "apercu" ? (
          <div className="space-y-3">
            {step.status === "done" && (
              <span
                data-testid="step-done-badge"
                className="inline-flex items-center rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-foreground-subtle"
              >
                Terminé
              </span>
            )}
            {step.status === "attention" && (
              <p className="text-xs font-medium text-warning">Légère itération en cours. Alexis ajuste le travail.</p>
            )}
            {step.id === "requested" && (
              <p className="text-xs text-foreground-subtle">Créée le {formatDate(issue.created_at)}</p>
            )}
            <p className="text-xs text-foreground-subtle">Dernière activité le {formatDate(issue.updated_at)}</p>
            <p className="whitespace-pre-wrap text-sm text-foreground-muted">
              {issue.description || "Pas de description."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {issue.comments.length > 0 && (
              <ul className="space-y-3">
                {issue.comments.map((c) => (
                  <li key={c.id}>
                    {(() => {
                      const humanized = c.author === "alexis" ? humanizeErrorComment(c.body) : null;
                      if (humanized) {
                        return (
                          <div className={cn(
                            "rounded-lg p-3 border",
                            humanized.isFinal
                              ? "bg-danger/5 border-danger/20"
                              : "bg-warning/5 border-warning/20"
                          )}>
                            <p className="text-xs font-medium text-foreground-muted mb-2">
                              Alexis · {formatDate(c.created_at)}
                            </p>
                            <p className={cn(
                              "flex items-center gap-1.5 text-sm font-semibold",
                              humanized.isFinal ? "text-danger" : "text-warning"
                            )}>
                              {humanized.isFinal
                                ? <CircleX className="h-4 w-4 shrink-0" />
                                : <TriangleAlert className="h-4 w-4 shrink-0" />}
                              {humanized.title}
                            </p>
                            <p className="mt-1 text-sm text-foreground-muted">{humanized.hint}</p>
                            {humanized.detail && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-xs text-foreground-subtle hover:text-foreground transition-colors select-none">
                                  Détails techniques
                                </summary>
                                <pre className="mt-1.5 overflow-x-auto rounded-lg bg-surface-sunken p-3 font-mono text-xs text-foreground-muted whitespace-pre-wrap break-words">
                                  {humanized.detail}
                                </pre>
                              </details>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div className={cn(
                          "rounded-lg p-3",
                          c.author === "alexis" ? "bg-brand/10 border border-brand/20" : "bg-surface-sunken"
                        )}>
                          <p className="text-xs font-medium text-foreground-muted">
                            {c.author === "alexis" ? "Alexis" : "Vous"} · {formatDate(c.created_at)}
                          </p>
                          <div className="mt-1 text-sm text-foreground">
                            <MarkdownLite text={c.body} />
                          </div>
                        </div>
                      );
                    })()}
                  </li>
                ))}
              </ul>
            )}

            {showChat && (
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

                {chatError && <p className="text-xs font-medium text-red-500">{chatError}</p>}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!chatMessage.trim() || chatStatus === "in_progress"}
                    onClick={handleSendChat}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-hover disabled:opacity-50"
                  >
                    {chatStatus === "in_progress" ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                    {chatStatus === "in_progress" ? "En cours…" : "Discuter"}
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading !== null}
                    onClick={handleRegenerate}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-surface-sunken disabled:opacity-50"
                  >
                    {actionLoading === "regen" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Régénérer
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading !== null}
                    onClick={handleValidate}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand bg-transparent px-4 py-2 text-sm font-medium text-brand transition-all hover:bg-brand/10 disabled:opacity-50"
                  >
                    {actionLoading === "validate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
                    Valider
                  </button>
                </div>
              </div>
            )}

            {showRetry && (
              <div className="flex flex-col gap-2">
                {chatError && <p className="text-xs font-medium text-red-500">{chatError}</p>}
                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={handleRetry}
                  className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-hover disabled:opacity-50"
                >
                  {actionLoading === "retry" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Relancer
                </button>
              </div>
            )}

            {showPlaceholder && (
              <p className="text-xs text-foreground-subtle">Aucune activité pour l&apos;instant.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
