"use client";

import { useState } from "react";
import { Inbox, Search, Code2, CheckCircle2, AlertTriangle, type LucideIcon } from "lucide-react";
import { getIssueSteps, type StepId } from "@/lib/issue-steps";
import { cn } from "@/lib/utils";
import { createIssueComment, type Issue, type IssueComment } from "@/lib/api-client";

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
  onCommentAdded: (comment: IssueComment) => void;
}

export default function IssueTimeline({
  issue,
  states,
  projectId,
  apiKey,
  onCommentAdded,
}: IssueTimelineProps) {
  const steps = getIssueSteps(issue, states);
  const [commentBody, setCommentBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmitComment() {
    const body = commentBody.trim();
    if (!body) return;
    setSubmitting(true);
    try {
      const comment = await createIssueComment(apiKey, projectId, issue.id, body);
      onCommentAdded(comment);
      setCommentBody("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ol className="flex flex-col gap-6">
      {steps.map((step, idx) => {
        const Icon = step.status === "attention" ? AlertTriangle : STEP_ICONS[step.id];
        const isLast = idx === steps.length - 1;
        const isActive = step.status === "current" || step.status === "attention";

        const dotCls = cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
          step.status === "done" && "border-brand bg-brand text-white",
          step.status === "current" &&
            "border-brand bg-gradient-to-br from-brand to-brand-muted text-white animate-pulse",
          step.status === "attention" && "border-warning bg-warning text-white animate-pulse",
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
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "mt-1 w-px flex-1 transition-all duration-300",
                    step.status === "done" ? "bg-brand" : "bg-border"
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

              {isActive && (
                <div className="mt-3 space-y-4 rounded-xl border border-border bg-surface-raised p-4">
                  {step.status === "attention" && (
                    <p className="text-xs font-medium text-warning">
                      Légère itération en cours — Alexis ajuste le travail.
                    </p>
                  )}

                  <p className="whitespace-pre-wrap text-sm text-foreground-muted">
                    {issue.description || "Pas de description."}
                  </p>

                  {issue.comments.length > 0 && (
                    <ul className="space-y-3">
                      {issue.comments.map((c) => (
                        <li key={c.id} className="rounded-lg bg-surface-sunken p-3">
                          <p className="text-xs font-medium text-foreground-muted">
                            {c.author} · {formatDate(c.created_at)}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{c.body}</p>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-col gap-2">
                    <textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      rows={3}
                      placeholder="Ajouter un commentaire…"
                      className="w-full resize-none rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                    <button
                      type="button"
                      disabled={!commentBody.trim() || submitting}
                      onClick={handleSubmitComment}
                      className="self-end rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-hover disabled:opacity-50"
                    >
                      {submitting ? "Envoi…" : "Ajouter un commentaire"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
