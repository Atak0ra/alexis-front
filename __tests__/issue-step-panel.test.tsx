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
