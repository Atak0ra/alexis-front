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
        onIssueUpdated={vi.fn()}
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
        onIssueUpdated={vi.fn()}
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
        onIssueUpdated={vi.fn()}
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
        onIssueUpdated={vi.fn()}
      />
    );
    expect(screen.getByText("Le bouton suivant ne fonctionne pas sur mobile.")).toBeInTheDocument();
    expect(screen.getByText("Merci pour le retour")).toBeInTheDocument();
  });

  it("shows the creation date under the requested step and the last-activity date under the active step", () => {
    render(
      <IssueTimeline
        issue={makeIssue({ state: "Dev", created_at: "2026-07-08T09:30:00Z", updated_at: "2026-07-14T16:45:00Z" })}
        states={DEFAULT_STATES}
        projectId="p1"
        apiKey="k1"
        onIssueUpdated={vi.fn()}
      />
    );
    expect(screen.getByText(/Créée le/)).toBeInTheDocument();
    expect(screen.getByText(/Dernière activité le/)).toBeInTheDocument();
  });

  it("renders a visible connecting line between non-last steps", () => {
    render(
      <IssueTimeline
        issue={makeIssue({ state: "Backlog" })}
        states={DEFAULT_STATES}
        projectId="p1"
        apiKey="k1"
        onIssueUpdated={vi.fn()}
      />
    );
    const requestedStep = screen.getByTestId("issue-step-requested");
    const line = requestedStep.querySelector(".min-h-\\[2rem\\]");
    expect(line).not.toBeNull();
  });

  it("does not show the chat/regenerate/validate zone outside a review state", () => {
    render(
      <IssueTimeline
        issue={makeIssue({ state: "Dev" })}
        states={DEFAULT_STATES}
        projectId="p1"
        apiKey="k1"
        onIssueUpdated={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Discuter" })).not.toBeInTheDocument();
  });

  it("sends a chat message in a review state and disables the button while in progress", async () => {
    vi.spyOn(apiClient, "sendIssueChat").mockResolvedValue({ status: "in_progress" });
    vi.spyOn(apiClient, "getIssueChatStatus").mockResolvedValue({ status: "in_progress" });

    render(
      <IssueTimeline
        issue={makeIssue({ state: "Spec Review" })}
        states={DEFAULT_STATES}
        projectId="p1"
        apiKey="k1"
        onIssueUpdated={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/posez une question/i), {
      target: { value: "Quelle approche pour la pagination ?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Discuter" }));

    await waitFor(() => expect(apiClient.sendIssueChat).toHaveBeenCalledWith("k1", "p1", "i1", "Quelle approche pour la pagination ?"));
    expect(screen.getByRole("button", { name: /en cours/i })).toBeDisabled();
  });

  it("calls updateIssue and onIssueUpdated when Valider is clicked in a review state", async () => {
    const updatedIssue = makeIssue({ state: "Plan" });
    vi.spyOn(apiClient, "updateIssue").mockResolvedValue(updatedIssue);
    const onIssueUpdated = vi.fn();

    render(
      <IssueTimeline
        issue={makeIssue({ state: "Spec Review" })}
        states={DEFAULT_STATES}
        projectId="p1"
        apiKey="k1"
        onIssueUpdated={onIssueUpdated}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() => expect(onIssueUpdated).toHaveBeenCalledWith(updatedIssue));
    expect(apiClient.updateIssue).toHaveBeenCalledWith("k1", "p1", "i1", { state: DEFAULT_STATES.plan });
  });
});
