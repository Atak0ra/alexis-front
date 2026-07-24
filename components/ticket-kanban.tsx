"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Issue } from "@/lib/api-client";

export interface TicketSummary {
  pr_url: string | null;
  pr_title: string | null;
  cost_usd: number;
}

interface Column {
  key: string;
  label: string;
}

const COLUMNS: Column[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "Todo" },
  { key: "spec", label: "Spec" },
  { key: "plan", label: "Plan" },
  { key: "dev", label: "Dev" },
  { key: "to_merge", label: "To Merge" },
  { key: "done", label: "Done" },
];

// Les sous-états review/failed n'ont pas leur propre colonne — ils restent
// visuellement rattachés à l'étape en cours (ex: "Dev Failed" reste dans la
// colonne Dev), avec un badge sur la carte pour le signaler.
const SUBSTATE_TO_COLUMN: Record<string, string> = {
  spec_review: "spec", spec_failed: "spec",
  plan_review: "plan", plan_failed: "plan",
  dev_review: "dev", dev_failed: "dev",
  to_merge_failed: "to_merge",
};

function stateKeyForLabel(label: string, states: Record<string, string>): string | null {
  return Object.entries(states).find(([, v]) => v === label)?.[0] ?? null;
}

function columnKeyForIssue(issue: Issue, states: Record<string, string>): string {
  const key = stateKeyForLabel(issue.state, states);
  if (!key) return "backlog";
  if (SUBSTATE_TO_COLUMN[key]) return SUBSTATE_TO_COLUMN[key];
  return COLUMNS.some((c) => c.key === key) ? key : "backlog";
}

interface TicketKanbanProps {
  issues: Issue[];
  states: Record<string, string>;
  projectId: string;
  /** Appelé au drop d'une carte sur une colonne, avec le libellé d'état cible. */
  onMoveIssue: (issueId: string, newState: string) => void;
  ticketsByIdentifier?: Record<string, TicketSummary>;
}

export default function TicketKanban({
  issues, states, projectId, onMoveIssue, ticketsByIdentifier,
}: TicketKanbanProps) {
  const router = useRouter();
  const [justRetried, setJustRetried] = useState<string | null>(null);

  const byColumn: Record<string, Issue[]> = {};
  for (const col of COLUMNS) byColumn[col.key] = [];
  for (const issue of issues) {
    byColumn[columnKeyForIssue(issue, states)].push(issue);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, columnKey: string) {
    e.preventDefault();
    const issueId = e.dataTransfer.getData("text/plain");
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) return;
    const targetLabel = states[columnKey] ?? columnKey;
    if (issue.state === targetLabel) return;
    onMoveIssue(issueId, targetLabel);
  }

  function handleRetry(issueId: string, targetLabel: string) {
    onMoveIssue(issueId, targetLabel);
    setJustRetried(issueId);
    setTimeout(() => {
      setJustRetried((current) => (current === issueId ? null : current));
    }, 2500);
  }

  return (
    <div>
      {issues.length === 0 && (
        <p className="mb-3 text-sm text-foreground-subtle">Aucune demande pour le moment.</p>
      )}
      <div className="flex gap-4 overflow-x-auto pb-2">
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          data-testid={`kanban-column-${col.key}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, col.key)}
          className="flex w-64 shrink-0 flex-col rounded-xl bg-surface-sunken/40 p-2"
        >
          <div className="mb-2 flex items-center justify-between px-1.5 py-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              {states[col.key] ?? col.label}
            </p>
            <span className="rounded-full bg-surface px-1.5 py-0.5 text-[11px] font-medium text-foreground-subtle">
              {byColumn[col.key].length}
            </span>
          </div>

          <div className="flex flex-col gap-2 min-h-[3rem]">
            {byColumn[col.key].map((issue) => {
              const ticket = ticketsByIdentifier?.[issue.identifier];
              const isSubstate = issue.state !== (states[col.key] ?? col.label);
              const isFailure = issue.state.endsWith("Failed") || issue.state.endsWith("Échoué");

              return (
                <div
                  key={issue.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", issue.id)}
                  onClick={() => router.push(`/dashboard/${projectId}/issues/${issue.id}`)}
                  className="cursor-grab space-y-1.5 rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-left shadow-card transition-colors hover:border-border-strong active:cursor-grabbing"
                >
                  <p className="font-mono text-[11px] text-foreground-subtle">{issue.identifier}</p>
                  <p className="text-sm font-medium leading-snug text-foreground">{issue.title}</p>

                  {isSubstate && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          isFailure ? "bg-warning/15 text-warning" : "bg-brand/10 text-brand"
                        )}
                      >
                        {issue.state}
                      </span>
                      {isFailure && (
                        <button
                          type="button"
                          title="Réessayer"
                          aria-label="Réessayer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(issue.id, states[col.key] ?? col.label);
                          }}
                          className="text-foreground-subtle transition-colors hover:text-brand"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </button>
                      )}
                      {justRetried === issue.id && (
                        <span className="text-[11px] font-medium text-success">Relancé ✓</span>
                      )}
                    </div>
                  )}

                  {(ticket?.pr_url || (ticket && ticket.cost_usd > 0)) && (
                    <div className="flex items-center gap-2 pt-0.5">
                      {ticket && ticket.cost_usd > 0 && (
                        <span className="font-mono text-[11px] text-foreground-subtle">
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
                          className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-foreground-muted transition-colors hover:bg-surface-sunken hover:text-foreground"
                        >
                          Voir la PR ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
