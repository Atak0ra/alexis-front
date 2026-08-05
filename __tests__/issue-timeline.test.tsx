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
    expect(screen.getByText("Terminé", { selector: "p.font-semibold" })).toBeInTheDocument();
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
    // Note: "Terminé" also appears as the rail's own step label, so scope to
    // the panel's summary paragraph specifically.
    expect(screen.getByText("Terminé", { selector: "p.font-semibold" })).toBeInTheDocument();
  });
});
