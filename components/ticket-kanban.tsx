"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Issue } from "@/lib/api-client";

export interface TicketSummary {
  pr_url: string | null;
  pr_title: string | null;
  cost_display: number;
  display_currency: string;
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

// Mapping état échoué → clé d'état déclencheur du step correspondant.
// Doit rester synchronisé avec _TRIGGER_STATE_KEY dans orchestrator/application/poller.py.
// Le step "spec" se déclenche depuis "todo" (pas "spec"), les autres depuis leur propre clé.
const FAILED_TO_TRIGGER_KEY: Record<string, string> = {
  spec_failed:     "todo",
  plan_failed:     "plan",
  dev_failed:      "dev",
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

/**
 * Retourne le libellé d'état déclencheur pour relancer un step échoué.
 * Ex: issue en "Spec Failed" (stateKey="spec_failed") → states["todo"] = "Todo"
 * car le step spec se déclenche depuis l'état "todo", pas "spec".
 */
function triggerLabelForFailure(
  stateKey: string,
  states: Record<string, string>,
  fallbackLabel: string,
): string {
  const triggerKey = FAILED_TO_TRIGGER_KEY[stateKey];
  if (!triggerKey) return fallbackLabel;
  return states[triggerKey] ?? fallbackLabel;
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
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:snap-none">
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          data-testid={`kanban-column-${col.key}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, col.key)}
          className="flex w-[85vw] shrink-0 snap-start flex-col rounded-xl bg-surface-sunken/40 p-2 sm:w-64 sm:snap-align-none"
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
                  // Détection d'échec via la clé d'état (ex: "spec_failed", "dev_failed"),
                  // pas via le libellé — robuste aux libellés personnalisés par le client.
                  const stateKey = stateKeyForLabel(issue.state, states);
                  const isFailure = stateKey !== null && stateKey.endsWith("_failed");

              return (
                <div
                  key={issue.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", issue.id)}
                  className="rounded-lg border border-border bg-surface-raised shadow-card transition-colors hover:border-border-strong"
                >
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/${projectId}/issues/${issue.id}`)}
                  aria-label={`Voir le ticket ${issue.identifier} : ${issue.title}`}
                  className="w-full cursor-pointer space-y-1.5 px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:rounded-lg"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[11px] text-foreground-subtle">{issue.identifier}</p>
                    {/* Alternative au glisser-déposer — le drag HTML5 natif ne
                        fonctionne pas au toucher, et n'est pas accessible au
                        clavier/lecteur d'écran. Fonctionne partout, pas
                        seulement sur mobile. */}
                    <select
                      aria-label={`Déplacer ${issue.identifier}`}
                      value={col.key}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const targetLabel = states[e.target.value] ?? e.target.value;
                        if (targetLabel !== issue.state) onMoveIssue(issue.id, targetLabel);
                      }}
                      className="shrink-0 rounded-md border border-border bg-surface px-1 py-0.5 text-[10px] text-foreground-subtle transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.key} value={c.key}>
                          {states[c.key] ?? c.label}
                        </option>
                      ))}
                    </select>
                  </div>
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
                      {isFailure && stateKey && (
                        <button
                          type="button"
                          title="Réessayer"
                          aria-label="Réessayer"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Envoie l'état DÉCLENCHEUR du step (pas le label de colonne).
                            // Ex: "Spec Failed" → envoie "Todo" (trigger du step spec),
                            // pas "Spec" qui n'est pas un état déclencheur et ne relance rien.
                            const triggerLabel = triggerLabelForFailure(
                              stateKey,
                              states,
                              states[col.key] ?? col.label,
                            );
                            handleRetry(issue.id, triggerLabel);
                          }}
                          className="text-foreground-subtle transition-colors hover:text-brand"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
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

                  {(ticket?.pr_url || (ticket && (ticket.cost_display ?? 0) > 0)) && (
                    <div className="flex items-center gap-2 pt-0.5">
                      {ticket && (ticket.cost_display ?? 0) > 0 && (
                        <span className="font-mono text-[11px] text-foreground-subtle">
                          {ticket.cost_display.toFixed(2)} {ticket.display_currency ?? "EUR"}
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
                </button>
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
