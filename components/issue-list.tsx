"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getIssueSteps, type StepState, type StepStatus } from "@/lib/issue-steps";
import { cn } from "@/lib/utils";
import type { Issue } from "@/lib/api-client";

const DOT_CLASSES: Record<StepStatus, string> = {
  done: "bg-brand",
  current: "bg-brand animate-pulse",
  attention: "bg-warning animate-pulse",
  upcoming: "bg-surface-sunken border border-border-strong",
};

function badgeClasses(step: StepState): string {
  if (step.status === "attention") return "bg-warning/15 text-warning";
  switch (step.id) {
    case "requested":
      return "bg-surface-sunken text-foreground-muted";
    case "analysis":
      return "bg-blue-500/10 text-blue-600";
    case "development":
      return "bg-brand/15 text-brand";
    case "done":
      return "bg-success-bg text-success";
  }
}

function relativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `il y a ${diffD} j`;
}

export interface TicketSummary {
  pr_url: string | null;
  pr_title: string | null;
  cost_usd: number;
}

interface IssueListProps {
  issues: Issue[];
  states: Record<string, string>;
  projectId: string;
  /** Résumé run (PR, coût) par identifier — depuis GET /projects/{id}/tickets. */
  ticketsByIdentifier?: Record<string, TicketSummary>;
}

export default function IssueList({ issues, states, projectId, ticketsByIdentifier }: IssueListProps) {
  const router = useRouter();

  if (issues.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border py-12">
        <p className="text-sm text-foreground-subtle">Aucune demande pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {issues.map((issue) => {
        const steps = getIssueSteps(issue, states);
        const currentStep = steps.find((s) => s.status !== "done") ?? steps[steps.length - 1];
        const ticket = ticketsByIdentifier?.[issue.identifier];

        return (
          <button
            key={issue.id}
            type="button"
            onClick={() => router.push(`/dashboard/${projectId}/issues/${issue.id}`)}
            className="flex items-center gap-4 rounded-xl border border-border bg-surface-raised px-4 py-3.5 text-left transition-all duration-300 hover:border-border-strong hover:bg-surface-sunken"
          >
            <div className="flex shrink-0 items-center gap-1.5">
              {steps.map((step) => (
                <span
                  key={step.id}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-all duration-300",
                    DOT_CLASSES[step.status]
                  )}
                />
              ))}
            </div>

            <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {issue.title}
            </p>

            {ticket && ticket.cost_usd > 0 && (
              <span className="shrink-0 font-mono text-xs text-foreground-subtle">
                ${ticket.cost_usd.toFixed(2)}
              </span>
            )}

            {ticket?.pr_url && (
              <a
                href={ticket.pr_url}
                target="_blank"
                rel="noopener noreferrer"
                title={ticket.pr_title ?? undefined}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface-sunken hover:text-foreground"
              >
                Voir la PR ↗
              </a>
            )}

            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-300",
                badgeClasses(currentStep)
              )}
            >
              {currentStep.label}
            </span>

            <span className="w-16 shrink-0 text-right text-xs text-foreground-subtle">
              {relativeDate(issue.updated_at)}
            </span>

            <ChevronRight className="h-4 w-4 shrink-0 text-foreground-subtle" />
          </button>
        );
      })}
    </div>
  );
}
