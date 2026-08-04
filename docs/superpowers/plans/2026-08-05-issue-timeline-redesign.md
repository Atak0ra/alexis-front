# Issue Timeline Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single long vertical stepper in `components/issue-timeline.tsx` with a sidebar-rail + tabbed-content-panel layout, per `docs/superpowers/specs/2026-08-05-issue-timeline-redesign-design.md`.

**Architecture:** Split the current monolithic component into three pieces: `IssueTimelineRail` (presentational step selector), `IssueStepPanel` (business logic + tabbed content for whichever step is selected), and `IssueTimeline` (thin container holding `selectedStepId` state and wiring the two together). The page container widens from `max-w-4xl` to `max-w-6xl` to fit the two-column layout.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, `clsx` + `tailwind-merge` (via `lib/utils.ts` `cn`), `lucide-react` icons, vitest + `@testing-library/react` (`npm test` runs `vitest run`; globals enabled, `@/` aliases to repo root).

## Global Constraints

- Follow existing design tokens only — no new colors. Reuse: `border-brand`/`bg-brand`, `border-warning`/`bg-warning`/`text-warning`, `bg-brand-light`/`text-brand` (selected-state convention, see `app/admin/layout.tsx:50`), `bg-surface-raised`, `bg-surface-sunken`, `border-border`, `text-foreground`/`text-foreground-muted`/`text-foreground-subtle`.
- Responsive breakpoint convention in this codebase is `lg:` (see `app/admin/layout.tsx`, `components/app-sidebar.tsx`). Use `lg:` for the rail's desktop-vs-mobile layout switch.
- Date formatting: `new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })` — copy verbatim, do not change locale/format.
- No per-step comment history — `issue.comments` is a flat, unattributed list. A selected step with `status === "done"` gets a bare "Terminé" summary, never a filtered comment list (see spec's "Out of scope").
- All existing business logic (chat send + 2s poll, Régénérer, Valider, Relancer) must behave identically to today — this is a layout redesign, not a behavior change, except where the spec explicitly calls for relocating UI into tabs.
- Test stack: `vitest run`. Run the full suite (`npm test`) at the end of every task, not just the new/changed file, to catch cross-file regressions (`__tests__/issue-detail-page.test.tsx` imports the page and transitively the whole tree).

---

### Task 1: `IssueTimelineRail` — presentational step selector

**Files:**
- Create: `components/issue-timeline-rail.tsx`
- Test: `__tests__/issue-timeline-rail.test.tsx`

**Interfaces:**
- Consumes: `StepId`, `StepStatus`, `StepState` from `lib/issue-steps.ts` (existing, unchanged):
  ```ts
  export type StepId = "requested" | "analysis" | "development" | "done";
  export type StepStatus = "done" | "current" | "attention" | "upcoming";
  export interface StepState { id: StepId; label: string; status: StepStatus; }
  ```
  `cn` from `lib/utils.ts` (existing, unchanged): `export function cn(...inputs: ClassValue[]): string`.
- Produces (for Task 3): default export `IssueTimelineRail`, props:
  ```ts
  interface IssueTimelineRailProps {
    steps: StepState[];
    selectedStepId: StepId;
    onSelect: (id: StepId) => void;
  }
  ```
  Renders one `<button>` per step with `data-testid="issue-step-{id}"` and `data-status={step.status}` (both preserved from the old component so `__tests__/issue-detail-page.test.tsx:65` keeps passing unmodified). Upcoming steps render `disabled`. Selected step gets `aria-current="step"`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/issue-timeline-rail.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IssueTimelineRail from "@/components/issue-timeline-rail";
import type { StepState } from "@/lib/issue-steps";

const STEPS: StepState[] = [
  { id: "requested", label: "Demandé", status: "done" },
  { id: "analysis", label: "Analyse", status: "current" },
  { id: "development", label: "En développement", status: "upcoming" },
  { id: "done", label: "Terminé", status: "upcoming" },
];

describe("IssueTimelineRail", () => {
  it("renders all 4 steps with their status and testid", () => {
    render(<IssueTimelineRail steps={STEPS} selectedStepId="analysis" onSelect={vi.fn()} />);

    expect(screen.getByTestId("issue-step-requested")).toHaveAttribute("data-status", "done");
    expect(screen.getByTestId("issue-step-analysis")).toHaveAttribute("data-status", "current");
    expect(screen.getByTestId("issue-step-development")).toHaveAttribute("data-status", "upcoming");
    expect(screen.getByTestId("issue-step-done")).toHaveAttribute("data-status", "upcoming");
  });

  it("marks the selected step with aria-current", () => {
    render(<IssueTimelineRail steps={STEPS} selectedStepId="analysis" onSelect={vi.fn()} />);

    expect(screen.getByTestId("issue-step-analysis")).toHaveAttribute("aria-current", "step");
    expect(screen.getByTestId("issue-step-requested")).not.toHaveAttribute("aria-current");
  });

  it("calls onSelect with the step id when a done or current step is clicked", () => {
    const onSelect = vi.fn();
    render(<IssueTimelineRail steps={STEPS} selectedStepId="analysis" onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId("issue-step-requested"));

    expect(onSelect).toHaveBeenCalledWith("requested");
  });

  it("disables upcoming steps and does not call onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(<IssueTimelineRail steps={STEPS} selectedStepId="analysis" onSelect={onSelect} />);

    const upcomingStep = screen.getByTestId("issue-step-development");
    expect(upcomingStep).toBeDisabled();

    fireEvent.click(upcomingStep);

    expect(onSelect).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- issue-timeline-rail`
Expected: FAIL — `Cannot find module '@/components/issue-timeline-rail'`

- [ ] **Step 3: Write the implementation**

Create `components/issue-timeline-rail.tsx`:

```tsx
"use client";

import { AlertTriangle, CheckCircle2, Code2, Inbox, Search, type LucideIcon } from "lucide-react";
import type { StepId, StepState } from "@/lib/issue-steps";
import { cn } from "@/lib/utils";

const STEP_ICONS: Record<StepId, LucideIcon> = {
  requested: Inbox,
  analysis: Search,
  development: Code2,
  done: CheckCircle2,
};

interface IssueTimelineRailProps {
  steps: StepState[];
  selectedStepId: StepId;
  onSelect: (id: StepId) => void;
}

export default function IssueTimelineRail({ steps, selectedStepId, onSelect }: IssueTimelineRailProps) {
  return (
    <nav
      aria-label="Étapes du ticket"
      className="flex shrink-0 gap-2 overflow-x-auto rounded-xl border border-border bg-surface-raised p-2 lg:sticky lg:top-6 lg:w-60 lg:flex-col lg:gap-1 lg:overflow-visible lg:p-3"
    >
      {steps.map((step) => {
        const Icon = step.status === "attention" ? AlertTriangle : STEP_ICONS[step.id];
        const isUpcoming = step.status === "upcoming";
        const isSelected = step.id === selectedStepId;
        const isPulsing = step.status === "current" || step.status === "attention";

        const dotCls = cn(
          "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
          step.status === "done" && "border-brand bg-brand text-white",
          step.status === "current" && "border-brand bg-brand text-white",
          step.status === "attention" && "border-warning bg-warning text-white",
          isUpcoming && "border-border-strong bg-surface-sunken text-foreground-subtle"
        );

        return (
          <button
            key={step.id}
            type="button"
            data-testid={`issue-step-${step.id}`}
            data-status={step.status}
            disabled={isUpcoming}
            aria-current={isSelected ? "step" : undefined}
            onClick={() => onSelect(step.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
              isSelected ? "bg-brand-light text-brand" : "text-foreground-muted hover:bg-surface-sunken",
              isUpcoming && "cursor-not-allowed opacity-50 hover:bg-transparent"
            )}
          >
            <span className={dotCls}>
              <Icon className="h-3.5 w-3.5" />
              {isPulsing && (
                <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                  <span
                    className={cn(
                      "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                      step.status === "attention" ? "bg-warning" : "bg-brand"
                    )}
                  />
                  <span
                    className={cn(
                      "relative inline-flex h-2 w-2 rounded-full ring-2 ring-surface",
                      step.status === "attention" ? "bg-warning" : "bg-brand"
                    )}
                  />
                </span>
              )}
            </span>
            <span className="whitespace-nowrap">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- issue-timeline-rail`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add components/issue-timeline-rail.tsx __tests__/issue-timeline-rail.test.tsx
git commit -m "feat: add IssueTimelineRail presentational step selector"
```

---

### Task 2: `IssueStepPanel` — tabbed content + business logic for the selected step

**Files:**
- Create: `components/issue-step-panel.tsx`
- Test: `__tests__/issue-step-panel.test.tsx`

**Interfaces:**
- Consumes:
  - `StepState` from `lib/issue-steps.ts` (see Task 1)
  - `getRetryTargetState(stateLabel: string, states: Record<string, string>): string | null` from `lib/issue-steps.ts` (existing, unchanged)
  - `cn` from `lib/utils.ts`
  - From `lib/api-client.ts` (existing, unchanged):
    ```ts
    export interface IssueComment { id: string; body: string; author: string; created_at: string; }
    export interface Issue {
      id: string; identifier: string; number: number; title: string; description: string;
      state: string; labels: string[]; created_at: string; updated_at: string; comments: IssueComment[];
    }
    export type ChatStatus = "in_progress" | "done" | "failed" | null;
    export function sendIssueChat(apiKey: string, projectId: string, issueId: string, message: string): Promise<{ status: ChatStatus }>;
    export function getIssueChatStatus(apiKey: string, projectId: string, issueId: string): Promise<{ status: ChatStatus; error?: string | null }>;
    export function updateIssue(apiKey: string, projectId: string, issueId: string, patch: { state: string }): Promise<Issue>;
    ```
  - `MarkdownLite` default export from `components/markdown-lite.tsx` (existing, unchanged), props `{ text: string }`.
  - `useRouter` from `next/navigation`.
- Produces (for Task 3): default export `IssueStepPanel`, props:
  ```ts
  interface IssueStepPanelProps {
    step: StepState;
    issue: Issue;
    states: Record<string, string>;
    projectId: string;
    apiKey: string;
    onIssueUpdated: (issue: Issue) => void;
  }
  ```
  Task 3 must mount this with `key={step.id}` so switching the selected step remounts the panel and resets its local chat/tab state instead of carrying stale input across steps.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/issue-step-panel.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import IssueStepPanel from "@/components/issue-step-panel";
import * as apiClient from "@/lib/api-client";
import { DEFAULT_STATES } from "@/lib/project-defaults";
import type { Issue } from "@/lib/api-client";
import type { StepState } from "@/lib/issue-steps";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

function makeIssue(overrides: Partial<Issue>): Issue {
  return {
    id: "i1",
    identifier: "PROJ-1",
    number: 1,
    title: "Corriger la pagination",
    description: "Le bouton suivant ne fonctionne pas sur mobile.",
    state: "Backlog",
    labels: [],
    created_at: "2026-07-10T00:00:00Z",
    updated_at: "2026-07-14T16:45:00Z",
    comments: [],
    ...overrides,
  };
}

const REQUESTED_CURRENT: StepState = { id: "requested", label: "Demandé", status: "current" };
const ANALYSIS_ATTENTION: StepState = { id: "analysis", label: "Analyse", status: "attention" };
const ANALYSIS_CURRENT: StepState = { id: "analysis", label: "Analyse", status: "current" };
const DEVELOPMENT_CURRENT: StepState = { id: "development", label: "En développement", status: "current" };
const ANALYSIS_DONE: StepState = { id: "analysis", label: "Analyse", status: "done" };
const REQUESTED_DONE: StepState = { id: "requested", label: "Demandé", status: "done" };

function renderPanel(step: StepState, issue: Issue, onIssueUpdated = vi.fn()) {
  return render(
    <IssueStepPanel
      step={step}
      issue={issue}
      states={DEFAULT_STATES}
      projectId="p1"
      apiKey="k1"
      onIssueUpdated={onIssueUpdated}
    />
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  refreshMock.mockClear();
});

describe("IssueStepPanel", () => {
  it("shows a plain Terminé summary for a done step, with no tabs or actions", () => {
    renderPanel(ANALYSIS_DONE, makeIssue({ state: "Dev" }));

    expect(screen.getByText("Terminé")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Aperçu" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Discuter" })).not.toBeInTheDocument();
  });

  it("shows the creation date on a done requested step's summary", () => {
    renderPanel(REQUESTED_DONE, makeIssue({ state: "Dev" }));

    expect(screen.getByText("Terminé")).toBeInTheDocument();
    expect(screen.getByText(/Créée le/)).toBeInTheDocument();
  });

  it("shows the description under the Aperçu tab by default for an active step", () => {
    renderPanel(DEVELOPMENT_CURRENT, makeIssue({ state: "Dev" }));

    expect(screen.getByText("Le bouton suivant ne fonctionne pas sur mobile.")).toBeInTheDocument();
    expect(screen.getByText(/Dernière activité le/)).toBeInTheDocument();
    expect(screen.queryByText(/Créée le/)).not.toBeInTheDocument();
  });

  it("shows both creation and last-activity dates for the active requested step", () => {
    renderPanel(REQUESTED_CURRENT, makeIssue({ state: "Backlog" }));

    expect(screen.getByText(/Créée le/)).toBeInTheDocument();
    expect(screen.getByText(/Dernière activité le/)).toBeInTheDocument();
  });

  it("shows the attention message in Aperçu for an attention step", () => {
    renderPanel(ANALYSIS_ATTENTION, makeIssue({ state: "Plan Failed" }));

    expect(screen.getByText(/Légère itération en cours/)).toBeInTheDocument();
  });

  it("shows existing comments under the Discussion tab", () => {
    renderPanel(
      DEVELOPMENT_CURRENT,
      makeIssue({
        state: "Dev",
        comments: [{ id: "c1", body: "Merci pour le retour", author: "Alexis", created_at: "2026-07-11T10:00:00Z" }],
      })
    );

    expect(screen.queryByText("Merci pour le retour")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Discussion" }));
    expect(screen.getByText("Merci pour le retour")).toBeInTheDocument();
  });

  it("does not show the chat/regenerate/validate zone outside a review state", () => {
    renderPanel(DEVELOPMENT_CURRENT, makeIssue({ state: "Dev" }));

    fireEvent.click(screen.getByRole("tab", { name: "Discussion" }));

    expect(screen.queryByRole("button", { name: "Discuter" })).not.toBeInTheDocument();
  });

  it("sends a chat message in a review state and disables the button while in progress", async () => {
    vi.spyOn(apiClient, "sendIssueChat").mockResolvedValue({ status: "in_progress" });
    vi.spyOn(apiClient, "getIssueChatStatus").mockResolvedValue({ status: "in_progress" });

    renderPanel(ANALYSIS_CURRENT, makeIssue({ state: "Spec Review" }));
    fireEvent.click(screen.getByRole("tab", { name: "Discussion" }));

    fireEvent.change(screen.getByPlaceholderText(/posez une question/i), {
      target: { value: "Quelle approche pour la pagination ?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Discuter" }));

    await waitFor(() =>
      expect(apiClient.sendIssueChat).toHaveBeenCalledWith("k1", "p1", "i1", "Quelle approche pour la pagination ?")
    );
    expect(screen.getByRole("button", { name: /en cours/i })).toBeDisabled();
  });

  it("calls updateIssue and onIssueUpdated when Valider is clicked in a review state", async () => {
    const updatedIssue = makeIssue({ state: "Plan" });
    vi.spyOn(apiClient, "updateIssue").mockResolvedValue(updatedIssue);
    const onIssueUpdated = vi.fn();

    renderPanel(ANALYSIS_CURRENT, makeIssue({ state: "Spec Review" }), onIssueUpdated);
    fireEvent.click(screen.getByRole("tab", { name: "Discussion" }));
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() => expect(onIssueUpdated).toHaveBeenCalledWith(updatedIssue));
    expect(apiClient.updateIssue).toHaveBeenCalledWith("k1", "p1", "i1", { state: DEFAULT_STATES.plan });
  });

  it("shows a Relancer button on a failed ticket, reverts it to the trigger state, and returns to the kanban", async () => {
    vi.spyOn(apiClient, "updateIssue").mockResolvedValue(makeIssue({ state: "Plan" }));

    renderPanel(ANALYSIS_ATTENTION, makeIssue({ state: "Plan Failed" }));
    fireEvent.click(screen.getByRole("tab", { name: "Discussion" }));
    fireEvent.click(screen.getByRole("button", { name: "Relancer" }));

    await waitFor(() =>
      expect(apiClient.updateIssue).toHaveBeenCalledWith("k1", "p1", "i1", { state: DEFAULT_STATES.plan })
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard/p1"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows an error and stays on the page when the retry API call fails", async () => {
    vi.spyOn(apiClient, "updateIssue").mockRejectedValue(new apiClient.AlexisApiError(500, "Erreur serveur"));

    renderPanel(ANALYSIS_ATTENTION, makeIssue({ state: "Plan Failed" }));
    fireEvent.click(screen.getByRole("tab", { name: "Discussion" }));
    fireEvent.click(screen.getByRole("button", { name: "Relancer" }));

    await waitFor(() => expect(screen.getByText("Erreur serveur")).toBeInTheDocument());
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("reverts a Spec Failed ticket to Todo (not Spec), the spec trigger state", async () => {
    vi.spyOn(apiClient, "updateIssue").mockResolvedValue(makeIssue({ state: "Todo" }));

    renderPanel(REQUESTED_CURRENT, makeIssue({ state: "Spec Failed" }));
    fireEvent.click(screen.getByRole("tab", { name: "Discussion" }));
    fireEvent.click(screen.getByRole("button", { name: "Relancer" }));

    await waitFor(() =>
      expect(apiClient.updateIssue).toHaveBeenCalledWith("k1", "p1", "i1", { state: DEFAULT_STATES.todo })
    );
  });

  it("does not show a Relancer button outside a failed state", () => {
    renderPanel(DEVELOPMENT_CURRENT, makeIssue({ state: "Dev" }));

    fireEvent.click(screen.getByRole("tab", { name: "Discussion" }));

    expect(screen.queryByRole("button", { name: "Relancer" })).not.toBeInTheDocument();
  });

  it("shows a placeholder when there is no activity and no available action", () => {
    renderPanel(DEVELOPMENT_CURRENT, makeIssue({ state: "Dev", comments: [] }));

    fireEvent.click(screen.getByRole("tab", { name: "Discussion" }));

    expect(screen.getByText("Aucune activité pour l'instant.")).toBeInTheDocument();
  });
});
```

Note: `REQUESTED_CURRENT` with `state: "Spec Failed"` in the second-to-last retry test is intentionally inconsistent (a requested-step object paired with a spec-failed issue state) — this mirrors the original test's setup, which drove `handleRetry`'s branch purely off `issue.state`, not the passed-in step. The `step` prop only controls which panel body renders (done-summary vs. tabs); the retry/regenerate/validate logic reads `issue.state` directly, exactly as it did before the split.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- issue-step-panel`
Expected: FAIL — `Cannot find module '@/components/issue-step-panel'`

- [ ] **Step 3: Write the implementation**

Create `components/issue-step-panel.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Loader2, RefreshCw, SendHorizonal } from "lucide-react";
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

  if (step.status === "done") {
    return (
      <div className="rounded-xl border border-border bg-surface-raised p-4">
        <p className="text-sm font-semibold text-foreground">Terminé</p>
        {step.id === "requested" && (
          <p className="mt-1 text-xs text-foreground-subtle">Créée le {formatDate(issue.created_at)}</p>
        )}
      </div>
    );
  }

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
                  <li
                    key={c.id}
                    className={cn(
                      "rounded-lg p-3",
                      c.author === "alexis" ? "bg-brand/10 border border-brand/20" : "bg-surface-sunken"
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

            {!inReview && retryTargetState && (
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

            {!inReview && !retryTargetState && issue.comments.length === 0 && (
              <p className="text-xs text-foreground-subtle">Aucune activité pour l&apos;instant.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- issue-step-panel`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add components/issue-step-panel.tsx __tests__/issue-step-panel.test.tsx
git commit -m "feat: add IssueStepPanel with tabbed Aperçu/Discussion content"
```

---

### Task 3: Rewrite `IssueTimeline` as the container wiring Rail + Panel

**Files:**
- Modify: `components/issue-timeline.tsx` (full rewrite)
- Modify: `__tests__/issue-timeline.test.tsx` (full rewrite — old per-behavior tests now live in `__tests__/issue-step-panel.test.tsx` from Task 2; this file becomes an integration test of selection + wiring)

**Interfaces:**
- Consumes: `IssueTimelineRail` (Task 1), `IssueStepPanel` (Task 2), `getIssueSteps(issue: Issue, states: Record<string, string>): StepState[]` from `lib/issue-steps.ts` (existing, unchanged).
- Produces: default export `IssueTimeline`, same public props as before (unchanged, consumed by `app/dashboard/[id]/issues/[issueId]/page.tsx`):
  ```ts
  interface IssueTimelineProps {
    issue: Issue;
    states: Record<string, string>;
    projectId: string;
    apiKey: string;
    onIssueUpdated: (issue: Issue) => void;
  }
  ```

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `__tests__/issue-timeline.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IssueTimeline from "@/components/issue-timeline";
import { DEFAULT_STATES } from "@/lib/project-defaults";
import type { Issue } from "@/lib/api-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function makeIssue(overrides: Partial<Issue>): Issue {
  return {
    id: "i1",
    identifier: "PROJ-1",
    number: 1,
    title: "Corriger la pagination",
    description: "Le bouton suivant ne fonctionne pas sur mobile.",
    state: "Backlog",
    labels: [],
    created_at: "2026-07-10T00:00:00Z",
    updated_at: "2026-07-10T00:00:00Z",
    comments: [],
    ...overrides,
  };
}

describe("IssueTimeline", () => {
  it("renders the 4 step labels in order", () => {
    render(
      <IssueTimeline issue={makeIssue({})} states={DEFAULT_STATES} projectId="p1" apiKey="k1" onIssueUpdated={vi.fn()} />
    );

    expect(screen.getByTestId("issue-step-requested")).toBeInTheDocument();
    expect(screen.getByTestId("issue-step-analysis")).toBeInTheDocument();
    expect(screen.getByTestId("issue-step-development")).toBeInTheDocument();
    expect(screen.getByTestId("issue-step-done")).toBeInTheDocument();
  });

  it("marks the requested step current and later steps upcoming for a Backlog issue", () => {
    render(
      <IssueTimeline issue={makeIssue({ state: "Backlog" })} states={DEFAULT_STATES} projectId="p1" apiKey="k1" onIssueUpdated={vi.fn()} />
    );

    expect(screen.getByTestId("issue-step-requested")).toHaveAttribute("data-status", "current");
    expect(screen.getByTestId("issue-step-analysis")).toHaveAttribute("data-status", "upcoming");
  });

  it("defaults the panel to the current/attention step", () => {
    render(
      <IssueTimeline issue={makeIssue({ state: "Dev" })} states={DEFAULT_STATES} projectId="p1" apiKey="k1" onIssueUpdated={vi.fn()} />
    );

    // "Dev" -> development step is current -> Aperçu tab shows its description by default.
    expect(screen.getByText("Le bouton suivant ne fonctionne pas sur mobile.")).toBeInTheDocument();
  });

  it("defaults to the last step's Terminé summary when the issue is fully done", () => {
    render(
      <IssueTimeline issue={makeIssue({ state: "Done" })} states={DEFAULT_STATES} projectId="p1" apiKey="k1" onIssueUpdated={vi.fn()} />
    );

    expect(screen.getByTestId("issue-step-done")).toHaveAttribute("data-status", "done");
    expect(screen.getByText("Terminé")).toBeInTheDocument();
  });

  it("switches the panel content when a different step is selected", () => {
    render(
      <IssueTimeline
        issue={makeIssue({ state: "Dev", description: "Description du dev" })}
        states={DEFAULT_STATES}
        projectId="p1"
        apiKey="k1"
        onIssueUpdated={vi.fn()}
      />
    );

    expect(screen.getByText("Description du dev")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("issue-step-requested"));

    expect(screen.queryByText("Description du dev")).not.toBeInTheDocument();
    expect(screen.getByText("Terminé")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- issue-timeline.test`
Expected: FAIL — old `issue-timeline.tsx` doesn't select steps or render "Terminé"/tabs; assertions like `getByText("Terminé")` and tab-switch behavior don't match current markup.

- [ ] **Step 3: Rewrite the implementation**

Replace the full contents of `components/issue-timeline.tsx`:

```tsx
"use client";

import { useState } from "react";
import { getIssueSteps, type StepId } from "@/lib/issue-steps";
import type { Issue } from "@/lib/api-client";
import IssueTimelineRail from "@/components/issue-timeline-rail";
import IssueStepPanel from "@/components/issue-step-panel";

interface IssueTimelineProps {
  issue: Issue;
  states: Record<string, string>;
  projectId: string;
  apiKey: string;
  onIssueUpdated: (issue: Issue) => void;
}

export default function IssueTimeline({
  issue,
  states,
  projectId,
  apiKey,
  onIssueUpdated,
}: IssueTimelineProps) {
  const steps = getIssueSteps(issue, states);
  const activeStep = steps.find((s) => s.status === "current" || s.status === "attention") ?? steps[steps.length - 1];
  const [selectedStepId, setSelectedStepId] = useState<StepId>(activeStep.id);

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? activeStep;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <IssueTimelineRail steps={steps} selectedStepId={selectedStep.id} onSelect={setSelectedStepId} />
      <div className="min-w-0 flex-1">
        <IssueStepPanel
          key={selectedStep.id}
          step={selectedStep}
          issue={issue}
          states={states}
          projectId={projectId}
          apiKey={apiKey}
          onIssueUpdated={onIssueUpdated}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- issue-timeline.test`
Expected: PASS (5 tests)

- [ ] **Step 5: Run the full suite to catch regressions**

Run: `npm test`
Expected: PASS across all files, including `__tests__/issue-detail-page.test.tsx` (still finds `issue-step-requested` with `data-status="current"`) and `__tests__/issue-steps.test.ts` (untouched, `lib/issue-steps.ts` wasn't modified).

- [ ] **Step 6: Commit**

```bash
git add components/issue-timeline.tsx __tests__/issue-timeline.test.tsx
git commit -m "refactor: rebuild IssueTimeline as a rail+panel container"
```

---

### Task 4: Widen the issue detail page container

**Files:**
- Modify: `app/dashboard/[id]/issues/[issueId]/page.tsx:153`

**Interfaces:**
- No interface changes — purely a Tailwind class edit on the page's root wrapper `div`.

- [ ] **Step 1: Change the container width**

In `app/dashboard/[id]/issues/[issueId]/page.tsx`, change:

```tsx
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
```

to:

```tsx
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
```

- [ ] **Step 2: Run the full suite**

Run: `npm test`
Expected: PASS — `__tests__/issue-detail-page.test.tsx` doesn't assert on the container's width class, so this change is covered by the existing behavioral assertions still passing.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/\[id\]/issues/\[issueId\]/page.tsx
git commit -m "style: widen issue detail page to fit the two-column timeline"
```

---

## Manual verification (after all tasks)

Automated tests cover behavior; they don't confirm the layout actually looks right. After Task 4:

1. Run the dev server (`npm run dev`), open an issue detail page in each of the four step states (Backlog, a review state like "Spec Review", "Dev", "Done") and confirm:
   - Desktop width (≥1024px): rail sticky on the left, panel content to the right, no more single centered column.
   - Narrow width (<1024px): rail collapses to a horizontal scrollable row above the panel.
   - Clicking a done step shows the plain "Terminé" summary; clicking upcoming steps does nothing (disabled).
   - Aperçu/Discussion tabs switch correctly; chat, Régénérer, Valider, Relancer all still work end-to-end against the demo/local API.
