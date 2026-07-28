# Client Project View (List + Timeline) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the developer-facing Kanban board on the project detail page with a client-readable request list (4 grouped steps) and a dedicated per-request timeline page, on a new slate/indigo dark theme.

**Architecture:** Pure state-mapping logic (`lib/issue-steps.ts`) translates the 14 raw backend states into 4 client-facing steps and is shared by two new presentational components: `IssueList` (rows in place of the Kanban board) and `IssueTimeline` (vertical stepper on a new `issues/[issueId]` page). The existing `KanbanBoard` and its `@dnd-kit` dependency are removed. All existing pages already consume semantic Tailwind tokens (`bg-surface`, `text-foreground-muted`, etc.), so the dark theme ships as a token-value swap in `tailwind.config.ts` / `app/globals.css` plus one hardcoded-color fix.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript 5.4, Tailwind CSS 3.4, Vitest 1.6 + Testing Library, `lucide-react` (new dependency).

## Global Constraints

- UI copy is French, matching all existing screens (e.g. "Aucune demande pour le moment.").
- Use only semantic Tailwind tokens (`bg-surface`, `text-brand`, `border-border`, etc.) — never raw palette classes (`bg-slate-900`, `text-indigo-500`...). The one existing exception (`components/ui/button.tsx:14`, `hover:bg-red-700`) is fixed in Task 1.
- No code comments unless documenting a non-obvious constraint; none of the code in this plan needs any.
- Follow existing test patterns: `vi.spyOn(apiClient, "fnName")` to mock API calls, `vi.mock("next/navigation", () => ({ useParams: () => ({...}), useRouter: () => ({ push: vi.fn() }) }))` for routing, `render`/`screen`/`fireEvent`/`waitFor` from Testing Library. See `__tests__/project-context-card.test.tsx` and `__tests__/project-settings-page.test.tsx` for reference.
- `components/ui/card.tsx` and `components/ui/input.tsx` use a stale, disconnected token set (`text-ink`, `bg-paper`, `border-rule`) not present in `tailwind.config.ts` — they are pre-existing dead/broken components. Do not reuse them for any new UI in this plan; write plain Tailwind markup with the real semantic tokens instead, matching the pattern in `components/kanban-board.tsx` and `app/dashboard/[id]/page.tsx`.
- `lib/project-defaults.ts` exports `DEFAULT_STATES` (14 keys) — use it in tests instead of hand-rolling a states map.

---

### Task 1: Dark theme tokens

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`
- Modify: `components/ui/button.tsx:14`

**Interfaces:**
- Consumes: nothing.
- Produces: the token names `surface`, `surface-raised`, `surface-sunken`, `border`, `border-strong`, `foreground`, `foreground-muted`, `foreground-subtle`, `brand`, `brand-hover`, `brand-light`, `brand-muted`, `success`, `success-bg`, `success-border`, `warning`, `warning-bg`, `warning-border`, `danger`, `danger-bg`, `danger-border` — same names as today, new dark-theme hex values. Every later task relies on these names being unchanged.

- [ ] **Step 1: Replace the color tokens in `tailwind.config.ts`**

Replace the `colors` block:

```ts
      colors: {
        // Backgrounds
        surface: "#020617",
        "surface-raised": "#0F172A",
        "surface-sunken": "#1E293B",
        // Borders
        border: "#1E293B",
        "border-strong": "#334155",
        // Text
        foreground: "#F8FAFC",
        "foreground-muted": "#94A3B8",
        "foreground-subtle": "#475569",
        // Brand / accent
        brand: "#6366F1",
        "brand-hover": "#818CF8",
        "brand-light": "#1E1B4B",
        "brand-muted": "#7C3AED",
        // Status
        success: "#16A34A",
        "success-bg": "#052E16",
        "success-border": "#166534",
        warning: "#F59E0B",
        "warning-bg": "#451A03",
        "warning-border": "#92400E",
        danger: "#EF4444",
        "danger-bg": "#450A0A",
        "danger-border": "#991B1B",
        // Sidebar (non consommé actuellement, conservé pour compat)
        sidebar: "#1E293B",
        "sidebar-hover": "#334155",
        "sidebar-active": "#6366F1",
        "sidebar-text": "#CBD5E1",
        "sidebar-text-active": "#FFFFFF",
      },
```

- [ ] **Step 2: Update `app/globals.css` body colors and scrollbar**

```css
  body {
    height: 100%;
    background-color: #020617;
    color: #F8FAFC;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
```

and:

```css
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: #334155 transparent;
  }
  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
  }
  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: #334155;
    border-radius: 3px;
  }
```

- [ ] **Step 3: Fix the hardcoded danger hover in `components/ui/button.tsx`**

Change line 14 from:

```ts
    "bg-danger text-white hover:bg-red-700 shadow-sm",
```

to:

```ts
    "bg-danger text-white hover:bg-danger/90 shadow-sm",
```

(This matches the existing `hover:bg-danger/90` / `hover:bg-brand/90` opacity-hover pattern already used elsewhere in the codebase, e.g. `app/dashboard/[id]/page.tsx`.)

- [ ] **Step 4: Run the full test suite to confirm nothing broke**

Run: `npm test`
Expected: all existing tests still PASS (none assert on literal hex values or `bg-red-700`; `__tests__/button.test.tsx` only checks for the presence of `bg-brand` / `border-border` substrings).

- [ ] **Step 5: Run the build to catch any Tailwind/type errors**

Run: `npm run build`
Expected: build succeeds with no TypeScript or Tailwind errors.

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts app/globals.css components/ui/button.tsx
git commit -m "feat: switch to slate/indigo dark theme tokens"
```

---

### Task 2: State-to-step mapping logic

**Files:**
- Create: `lib/issue-steps.ts`
- Test: `__tests__/issue-steps.test.ts`

**Interfaces:**
- Consumes: `Issue` type from `@/lib/api-client` (fields used: `state: string`).
- Produces:
  - `export type StepId = "requested" | "analysis" | "development" | "done"`
  - `export type StepStatus = "done" | "current" | "attention" | "upcoming"`
  - `export interface StepState { id: StepId; label: string; status: StepStatus }`
  - `export const STEP_GROUPS: { id: StepId; label: string; keys: string[] }[]`
  - `export function getIssueSteps(issue: Issue, states: Record<string, string>): StepState[]` — always returns exactly 4 entries, in `STEP_GROUPS` order.

  Later tasks (`IssueList`, `IssueTimeline`) call `getIssueSteps(issue, states)` and branch on `.status`.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/issue-steps.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getIssueSteps, STEP_GROUPS } from "@/lib/issue-steps";
import { DEFAULT_STATES } from "@/lib/project-defaults";
import type { Issue } from "@/lib/api-client";

function makeIssue(state: string): Issue {
  return {
    id: "i1",
    identifier: "PROJ-1",
    number: 1,
    title: "Titre",
    description: "",
    state,
    labels: [],
    created_at: "2026-07-10T00:00:00Z",
    updated_at: "2026-07-10T00:00:00Z",
    comments: [],
  };
}

describe("STEP_GROUPS", () => {
  it("covers every key in DEFAULT_STATES exactly once", () => {
    const allKeys = STEP_GROUPS.flatMap((g) => g.keys);
    const expectedKeys = Object.keys(DEFAULT_STATES);
    expect(allKeys.sort()).toEqual(expectedKeys.sort());
  });
});

describe("getIssueSteps", () => {
  it("returns 4 steps in order with 'requested' current for a Backlog issue", () => {
    const steps = getIssueSteps(makeIssue("Backlog"), DEFAULT_STATES);
    expect(steps.map((s) => s.id)).toEqual(["requested", "analysis", "development", "done"]);
    expect(steps[0].status).toBe("current");
    expect(steps[1].status).toBe("upcoming");
    expect(steps[2].status).toBe("upcoming");
    expect(steps[3].status).toBe("upcoming");
  });

  it("marks earlier steps done and the matching step current for Spec Review", () => {
    const steps = getIssueSteps(makeIssue("Spec Review"), DEFAULT_STATES);
    expect(steps[0].status).toBe("done");
    expect(steps[1].status).toBe("current");
    expect(steps[2].status).toBe("upcoming");
    expect(steps[3].status).toBe("upcoming");
  });

  it("marks the analysis step as attention for Plan Failed", () => {
    const steps = getIssueSteps(makeIssue("Plan Failed"), DEFAULT_STATES);
    expect(steps[1].status).toBe("attention");
  });

  it("groups Dev Review into the development step (regression: old Kanban dropped this state)", () => {
    const steps = getIssueSteps(makeIssue("Dev Review"), DEFAULT_STATES);
    expect(steps[2].status).toBe("current");
  });

  it("groups To Merge Failed into the done step as attention (regression: old Kanban dropped this state)", () => {
    const steps = getIssueSteps(makeIssue("To Merge Failed"), DEFAULT_STATES);
    expect(steps[3].status).toBe("attention");
  });

  it("keeps the done step as 'current' (not done) while state is To Merge", () => {
    const steps = getIssueSteps(makeIssue("To Merge"), DEFAULT_STATES);
    expect(steps[3].status).toBe("current");
  });

  it("marks all 4 steps done when state is Done", () => {
    const steps = getIssueSteps(makeIssue("Done"), DEFAULT_STATES);
    expect(steps.every((s) => s.status === "done")).toBe(true);
  });

  it("falls back to 'requested' current for an unmapped state label", () => {
    const steps = getIssueSteps(makeIssue("Some Unknown Label"), DEFAULT_STATES);
    expect(steps[0].status).toBe("current");
    expect(steps.slice(1).every((s) => s.status === "upcoming")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run __tests__/issue-steps.test.ts`
Expected: FAIL — `Cannot find module '@/lib/issue-steps'`.

- [ ] **Step 3: Implement `lib/issue-steps.ts`**

```ts
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

function findStateKey(stateLabel: string, states: Record<string, string>): string | null {
  return Object.entries(states).find(([, label]) => label === stateLabel)?.[0] ?? null;
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run __tests__/issue-steps.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/issue-steps.ts __tests__/issue-steps.test.ts
git commit -m "feat: add 14-state to 4-step client mapping"
```

---

### Task 3: `IssueList` component

**Files:**
- Create: `components/issue-list.tsx`
- Test: `__tests__/issue-list.test.tsx`
- Modify: `package.json` (add `lucide-react`)

**Interfaces:**
- Consumes: `getIssueSteps` and `StepStatus` from `@/lib/issue-steps` (Task 2); `Issue` type from `@/lib/api-client`; `cn` from `@/lib/utils`.
- Produces: `export default function IssueList({ issues, states, projectId }: { issues: Issue[]; states: Record<string, string>; projectId: string }): JSX.Element` — used by Task 6 in place of `KanbanBoard`.

- [ ] **Step 1: Install `lucide-react`**

Run: `npm install lucide-react`
Expected: `package.json` and `package-lock.json` updated, install succeeds.

- [ ] **Step 2: Write the failing tests**

Create `__tests__/issue-list.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IssueList from "@/components/issue-list";
import { DEFAULT_STATES } from "@/lib/project-defaults";
import type { Issue } from "@/lib/api-client";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function makeIssue(overrides: Partial<Issue>): Issue {
  return {
    id: "issue-1",
    identifier: "PROJ-1",
    number: 1,
    title: "Corriger la pagination",
    description: "",
    state: "Backlog",
    labels: [],
    created_at: "2026-07-10T00:00:00Z",
    updated_at: "2026-07-10T00:00:00Z",
    comments: [],
    ...overrides,
  };
}

beforeEach(() => {
  push.mockClear();
});

describe("IssueList", () => {
  it("shows an empty state when there are no issues", () => {
    render(<IssueList issues={[]} states={DEFAULT_STATES} projectId="proj-1" />);
    expect(screen.getByText("Aucune demande pour le moment.")).toBeInTheDocument();
  });

  it("renders one row per issue with title and step badge", () => {
    const issues = [
      makeIssue({ id: "i1", title: "Corriger la pagination", state: "Backlog" }),
      makeIssue({ id: "i2", title: "Ajouter un export CSV", state: "Dev Review" }),
    ];
    render(<IssueList issues={issues} states={DEFAULT_STATES} projectId="proj-1" />);

    expect(screen.getByText("Corriger la pagination")).toBeInTheDocument();
    expect(screen.getByText("Ajouter un export CSV")).toBeInTheDocument();
    expect(screen.getByText("Demandé")).toBeInTheDocument();
    expect(screen.getByText("En développement")).toBeInTheDocument();
  });

  it("navigates to the issue detail page when a row is clicked", () => {
    const issues = [makeIssue({ id: "i1", title: "Corriger la pagination" })];
    render(<IssueList issues={issues} states={DEFAULT_STATES} projectId="proj-1" />);

    fireEvent.click(screen.getByText("Corriger la pagination"));
    expect(push).toHaveBeenCalledWith("/dashboard/proj-1/issues/i1");
  });

  it("shows a warning-colored badge for a failed sub-state", () => {
    const issues = [makeIssue({ id: "i1", title: "Refonte auth", state: "Plan Failed" })];
    render(<IssueList issues={issues} states={DEFAULT_STATES} projectId="proj-1" />);

    const badge = screen.getByText("Analyse");
    expect(badge.className).toContain("text-warning");
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run __tests__/issue-list.test.tsx`
Expected: FAIL — `Cannot find module '@/components/issue-list'`.

- [ ] **Step 4: Implement `components/issue-list.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getIssueSteps, type StepStatus } from "@/lib/issue-steps";
import { cn } from "@/lib/utils";
import type { Issue } from "@/lib/api-client";

const DOT_CLASSES: Record<StepStatus, string> = {
  done: "bg-brand",
  current: "bg-brand animate-pulse",
  attention: "bg-warning animate-pulse",
  upcoming: "bg-surface-sunken border border-border-strong",
};

const BADGE_CLASSES: Record<StepStatus, string> = {
  done: "bg-brand/15 text-brand",
  current: "bg-brand/15 text-brand",
  attention: "bg-warning/15 text-warning",
  upcoming: "bg-surface-sunken text-foreground-muted",
};

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

interface IssueListProps {
  issues: Issue[];
  states: Record<string, string>;
  projectId: string;
}

export default function IssueList({ issues, states, projectId }: IssueListProps) {
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

            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-300",
                BADGE_CLASSES[currentStep.status]
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run __tests__/issue-list.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json components/issue-list.tsx __tests__/issue-list.test.tsx
git commit -m "feat: add IssueList component for the client-facing request list"
```

---

### Task 4: `IssueTimeline` component

**Files:**
- Create: `components/issue-timeline.tsx`
- Test: `__tests__/issue-timeline.test.tsx`

**Interfaces:**
- Consumes: `getIssueSteps`, `StepId`, `StepStatus` from `@/lib/issue-steps` (Task 2); `createIssueComment(apiKey, projectId, issueId, body): Promise<IssueComment>`, `Issue`, `IssueComment` from `@/lib/api-client`; `cn` from `@/lib/utils`.
- Produces: `export default function IssueTimeline({ issue, states, projectId, apiKey, onCommentAdded }: { issue: Issue; states: Record<string, string>; projectId: string; apiKey: string; onCommentAdded: (comment: IssueComment) => void }): JSX.Element` — used by Task 5's issue detail page. Each step `<li>` carries `data-testid="issue-step-{id}"` and `data-status="{status}"` for testability.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/issue-timeline.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import IssueTimeline from "@/components/issue-timeline";
import * as apiClient from "@/lib/api-client";
import { DEFAULT_STATES } from "@/lib/project-defaults";
import type { Issue } from "@/lib/api-client";

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

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("IssueTimeline", () => {
  it("renders the 4 step labels in order", () => {
    render(
      <IssueTimeline
        issue={makeIssue({})}
        states={DEFAULT_STATES}
        projectId="p1"
        apiKey="k1"
        onCommentAdded={vi.fn()}
      />
    );
    expect(screen.getByTestId("issue-step-requested")).toBeInTheDocument();
    expect(screen.getByTestId("issue-step-analysis")).toBeInTheDocument();
    expect(screen.getByTestId("issue-step-development")).toBeInTheDocument();
    expect(screen.getByTestId("issue-step-done")).toBeInTheDocument();
  });

  it("marks the requested step current and later steps upcoming for a Backlog issue", () => {
    render(
      <IssueTimeline
        issue={makeIssue({ state: "Backlog" })}
        states={DEFAULT_STATES}
        projectId="p1"
        apiKey="k1"
        onCommentAdded={vi.fn()}
      />
    );
    expect(screen.getByTestId("issue-step-requested")).toHaveAttribute("data-status", "current");
    expect(screen.getByTestId("issue-step-analysis")).toHaveAttribute("data-status", "upcoming");
  });

  it("marks a failed sub-state as attention with a contextual message", () => {
    render(
      <IssueTimeline
        issue={makeIssue({ state: "Plan Failed" })}
        states={DEFAULT_STATES}
        projectId="p1"
        apiKey="k1"
        onCommentAdded={vi.fn()}
      />
    );
    expect(screen.getByTestId("issue-step-analysis")).toHaveAttribute("data-status", "attention");
    expect(screen.getByText(/Légère itération en cours/)).toBeInTheDocument();
  });

  it("shows the issue description and existing comments under the active step", () => {
    render(
      <IssueTimeline
        issue={makeIssue({
          state: "Dev",
          comments: [
            { id: "c1", body: "Merci pour le retour", author: "Alexis", created_at: "2026-07-11T10:00:00Z" },
          ],
        })}
        states={DEFAULT_STATES}
        projectId="p1"
        apiKey="k1"
        onCommentAdded={vi.fn()}
      />
    );
    expect(screen.getByText("Le bouton suivant ne fonctionne pas sur mobile.")).toBeInTheDocument();
    expect(screen.getByText("Merci pour le retour")).toBeInTheDocument();
  });

  it("submits a new comment and calls onCommentAdded", async () => {
    const newComment: apiClient.IssueComment = {
      id: "c2",
      body: "Merci, ça avance bien",
      author: "user",
      created_at: "2026-07-12T00:00:00Z",
    };
    vi.spyOn(apiClient, "createIssueComment").mockResolvedValue(newComment);
    const onCommentAdded = vi.fn();

    render(
      <IssueTimeline
        issue={makeIssue({ state: "Dev" })}
        states={DEFAULT_STATES}
        projectId="p1"
        apiKey="k1"
        onCommentAdded={onCommentAdded}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Ajouter un commentaire…"), {
      target: { value: "Merci, ça avance bien" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter un commentaire" }));

    await waitFor(() => expect(onCommentAdded).toHaveBeenCalledWith(newComment));
    expect(apiClient.createIssueComment).toHaveBeenCalledWith("k1", "p1", "i1", "Merci, ça avance bien");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run __tests__/issue-timeline.test.tsx`
Expected: FAIL — `Cannot find module '@/components/issue-timeline'`.

- [ ] **Step 3: Implement `components/issue-timeline.tsx`**

```tsx
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run __tests__/issue-timeline.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add components/issue-timeline.tsx __tests__/issue-timeline.test.tsx
git commit -m "feat: add IssueTimeline component"
```

---

### Task 5: Issue detail page

**Files:**
- Create: `app/dashboard/[id]/issues/[issueId]/page.tsx`
- Test: `__tests__/issue-detail-page.test.tsx`

**Interfaces:**
- Consumes: `getProject`, `listIssues`, `AlexisApiError`, `ProjectOut`, `Issue`, `IssueComment` from `@/lib/api-client`; `getApiKey` from `@/lib/session`; `AppHeader` from `@/components/app-header`; `IssueTimeline` from `@/components/issue-timeline` (Task 4).
- Produces: default-exported page component at route `/dashboard/[id]/issues/[issueId]`, consumed by navigation from `IssueList` (Task 3, already wired to this URL shape).

- [ ] **Step 1: Write the failing tests**

Create `__tests__/issue-detail-page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import IssueDetailPage from "@/app/dashboard/[id]/issues/[issueId]/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";
import { DEFAULT_STATES, DEFAULT_TRIGGER_STATES, DEFAULT_MODELS } from "@/lib/project-defaults";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "proj-1", issueId: "issue-1" }),
}));

vi.mock("@/components/app-header", () => ({
  AppHeader: () => <header data-testid="app-header" />,
}));

const FAKE_PROJECT: apiClient.ProjectOut = {
  id: "proj-1",
  name: "Kara",
  repo_url: "https://github.com/acme/kara.git",
  agent_choice: "claude",
  agent_base_url: null,
  issue_prefix: null,
  forge_provider: "github",
  states: DEFAULT_STATES,
  trigger_states: DEFAULT_TRIGGER_STATES,
  models: DEFAULT_MODELS,
  run_timeout_seconds: 1800,
  is_active: true,
  created_at: "2026-07-15T00:00:00Z",
};

const FAKE_ISSUE: apiClient.Issue = {
  id: "issue-1",
  identifier: "KARA-1",
  number: 1,
  title: "Corriger la pagination",
  description: "Le bouton suivant ne répond pas.",
  state: "Backlog",
  labels: [],
  created_at: "2026-07-10T00:00:00Z",
  updated_at: "2026-07-10T00:00:00Z",
  comments: [],
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
});

describe("IssueDetailPage", () => {
  it("renders the issue title and timeline once loaded", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "listIssues").mockResolvedValue([FAKE_ISSUE]);

    render(<IssueDetailPage />);

    await waitFor(() => expect(screen.getByText("Corriger la pagination")).toBeInTheDocument());
    expect(screen.getByText("KARA-1")).toBeInTheDocument();
    expect(screen.getByTestId("issue-step-requested")).toHaveAttribute("data-status", "current");
  });

  it("shows a not-found message when the issue id doesn't match any issue", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "listIssues").mockResolvedValue([]);

    render(<IssueDetailPage />);

    await waitFor(() => expect(screen.getByText("Demande introuvable.")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run __tests__/issue-detail-page.test.tsx`
Expected: FAIL — `Failed to resolve import "@/app/dashboard/[id]/issues/[issueId]/page"`.

- [ ] **Step 3: Implement `app/dashboard/[id]/issues/[issueId]/page.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getApiKey } from "@/lib/session";
import {
  getProject,
  listIssues,
  AlexisApiError,
  type ProjectOut,
  type Issue,
  type IssueComment,
} from "@/lib/api-client";
import { AppHeader } from "@/components/app-header";
import IssueTimeline from "@/components/issue-timeline";

export default function IssueDetailPage() {
  const params = useParams<{ id: string; issueId: string }>();
  const projectId = params.id;
  const issueId = params.issueId;

  const [project, setProject] = useState<ProjectOut | null>(null);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = getApiKey() ?? "";

  useEffect(() => {
    if (!apiKey) return;

    getProject(apiKey, projectId)
      .then(setProject)
      .catch((err) => setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"));

    listIssues(apiKey, projectId)
      .then((issues) => {
        const found = issues.find((i) => i.id === issueId);
        if (found) setIssue(found);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [projectId, issueId, apiKey]);

  function handleCommentAdded(comment: IssueComment) {
    setIssue((prev) => (prev ? { ...prev, comments: [...prev.comments, comment] } : prev));
  }

  if (error || notFound) {
    return (
      <div className="flex h-screen flex-col bg-surface">
        <AppHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <p className="text-base font-semibold text-foreground">
            {error ?? "Demande introuvable."}
          </p>
          <Link
            href={`/dashboard/${projectId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-sunken transition-colors"
          >
            ← Retour au projet
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <Link
        href={`/dashboard/${projectId}`}
        className="text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
      >
        ← Retour au projet
      </Link>

      {issue === null || project === null ? (
        <div className="mt-6 space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded-lg bg-surface-sunken" />
          <div className="h-40 animate-pulse rounded-xl bg-surface-sunken" />
        </div>
      ) : (
        <>
          <h1 className="mt-4 text-2xl font-bold text-foreground">{issue.title}</h1>
          <p className="mt-1 font-mono text-xs text-foreground-subtle">{issue.identifier}</p>

          <div className="mt-8">
            <IssueTimeline
              issue={issue}
              states={project.states}
              projectId={projectId}
              apiKey={apiKey}
              onCommentAdded={handleCommentAdded}
            />
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run __tests__/issue-detail-page.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/dashboard/[id]/issues/[issueId]/page.tsx" __tests__/issue-detail-page.test.tsx
git commit -m "feat: add issue detail page with timeline"
```

---

### Task 6: Wire `IssueList` into the project page, remove the Kanban board

**Files:**
- Modify: `app/dashboard/[id]/page.tsx`
- Delete: `components/kanban-board.tsx`
- Modify: `package.json` (remove `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`)

**Interfaces:**
- Consumes: `IssueList` from `@/components/issue-list` (Task 3).
- Produces: nothing new — this is the integration point; no other task depends on it.

- [ ] **Step 1: Replace the `KanbanBoard` import and usage in `app/dashboard/[id]/page.tsx`**

Change the import block (line 20-23):

```tsx
import { AppHeader } from "@/components/app-header";
import ProjectContextStep from "@/components/project-context-step";
import ProjectContextCard from "@/components/project-context-card";
import IssueList from "@/components/issue-list";
```

Change the board render block (former `<KanbanBoard .../>` call):

```tsx
            {issues !== null && (
              <IssueList issues={issues} states={project.states} projectId={projectId} />
            )}
```

- [ ] **Step 2: Replace the inline `SettingsIcon` with `lucide-react`'s `Settings`**

Remove the `SettingsIcon` function definition (lines 27-34) and add to the top imports:

```tsx
import { Settings, Plus, X } from "lucide-react";
```

Replace its usage:

```tsx
                <Settings className="h-4 w-4" />
```

- [ ] **Step 3: Replace the inline `X` (close) icon in `NewIssueModal` with `lucide-react`'s `X`**

Replace:

```tsx
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
```

with:

```tsx
            <X className="h-4 w-4" />
```

- [ ] **Step 4: Replace the inline `Plus` icon and rename the "Nouveau ticket" button**

Replace:

```tsx
                <button
                  type="button"
                  onClick={() => setShowNewIssue(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand/90 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Nouveau ticket
                </button>
```

with:

```tsx
                <button
                  type="button"
                  onClick={() => setShowNewIssue(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-hover"
                >
                  <Plus className="h-4 w-4" />
                  Demander une modification
                </button>
```

- [ ] **Step 5: Delete `components/kanban-board.tsx`**

Run: `rm components/kanban-board.tsx`

- [ ] **Step 6: Remove the now-unused `@dnd-kit` dependencies**

Run: `npm uninstall @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
Expected: `package.json` and `package-lock.json` updated, no other file imports `@dnd-kit/*` (confirmed in design phase — `kanban-board.tsx` was the only consumer).

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: all tests PASS, including the new `issue-list`, `issue-timeline`, `issue-steps`, and `issue-detail-page` suites from Tasks 2-5.

- [ ] **Step 8: Run the build**

Run: `npm run build`
Expected: build succeeds — no leftover references to `@/components/kanban-board` or `@dnd-kit/*`.

- [ ] **Step 9: Commit**

```bash
git add "app/dashboard/[id]/page.tsx" package.json package-lock.json
git rm components/kanban-board.tsx
git commit -m "feat: replace Kanban board with client-facing request list"
```

---

## Manual verification (after Task 6)

Not automatable in this plan — run once implementation is complete:

1. `npm run dev`, log in, open a project with a mix of issue states (or create a few via "Demander une modification").
2. Confirm the list shows French step badges, not raw state names.
3. Click a row, confirm the timeline page loads at `/dashboard/<id>/issues/<issueId>`, steps render top-to-bottom, and the active step's card is visible with description + comment form.
4. Post a comment, confirm it appears immediately without a page reload.
5. Confirm the whole app (header, login, project list, wizard) renders on the new dark slate/indigo theme with no leftover light-background flashes.
