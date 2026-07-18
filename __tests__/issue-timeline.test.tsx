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
