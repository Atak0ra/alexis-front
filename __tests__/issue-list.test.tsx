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

  it("gives each step badge a visually distinct color", () => {
    const issues = [
      makeIssue({ id: "i1", title: "A", state: "Backlog" }),
      makeIssue({ id: "i2", title: "B", state: "Spec Review" }),
      makeIssue({ id: "i3", title: "C", state: "Dev" }),
      makeIssue({ id: "i4", title: "D", state: "Done" }),
    ];
    render(<IssueList issues={issues} states={DEFAULT_STATES} projectId="proj-1" />);

    const requested = screen.getByText("Demandé").className;
    const analysis = screen.getByText("Analyse").className;
    const development = screen.getByText("En développement").className;
    const done = screen.getByText("Terminé").className;

    const classes = [requested, analysis, development, done];
    expect(new Set(classes).size).toBe(4);
  });
});
