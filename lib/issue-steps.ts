import type { Issue } from "@/lib/api-client";

export type StepId = "requested" | "analysis" | "development" | "done";
export type StepStatus = "done" | "current" | "attention" | "upcoming";

export interface StepState {
  id: StepId;
  label: string;
  status: StepStatus;
}

interface StepDefinition {
  id: StepId;
  label: string;
  keys: string[];
}

export const STEP_GROUPS: StepDefinition[] = [
  { id: "requested", label: "Demandé", keys: ["backlog", "todo"] },
  {
    id: "analysis",
    label: "Analyse",
    keys: ["spec", "spec_review", "spec_failed", "plan", "plan_review", "plan_failed"],
  },
  {
    id: "development",
    label: "En développement",
    keys: ["dev", "dev_review", "dev_failed"],
  },
  { id: "done", label: "Terminé", keys: ["to_merge", "to_merge_failed", "done"] },
];

export function findStateKey(stateLabel: string, states: Record<string, string>): string | null {
  return Object.entries(states).find(([, label]) => label === stateLabel)?.[0] ?? null;
}

/** État vers lequel relancer un ticket en échec ("X Failed") — le trigger du
 * même step (spec_failed -> todo, sinon même clé : plan_failed -> plan,
 * dev_failed -> dev, to_merge_failed -> to_merge). null si l'état courant
 * n'est pas un état d'échec. */
export function getRetryTargetState(stateLabel: string, states: Record<string, string>): string | null {
  const stateKey = findStateKey(stateLabel, states);
  if (!stateKey || !stateKey.endsWith("_failed")) return null;
  const step = stateKey.slice(0, -"_failed".length);
  const triggerKey = step === "spec" ? "todo" : step;
  return states[triggerKey] ?? null;
}

export function getIssueSteps(issue: Issue, states: Record<string, string>): StepState[] {
  const stateKey = findStateKey(issue.state, states);
  const matchedIdx = stateKey
    ? STEP_GROUPS.findIndex((group) => group.keys.includes(stateKey))
    : -1;
  const activeIdx = matchedIdx === -1 ? 0 : matchedIdx;
  const attention = stateKey?.endsWith("_failed") ?? false;
  const lastIdx = STEP_GROUPS.length - 1;

  return STEP_GROUPS.map((group, idx) => {
    let status: StepStatus;
    if (idx < activeIdx) {
      status = "done";
    } else if (idx === activeIdx) {
      if (idx === lastIdx && stateKey === "done") {
        status = "done";
      } else if (attention) {
        status = "attention";
      } else {
        status = "current";
      }
    } else {
      status = "upcoming";
    }
    return { id: group.id, label: group.label, status };
  });
}
