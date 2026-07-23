import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ProjectContextCard from "@/components/project-context-card";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const CONTENT = "# Mon projet\n\n## Stack\n- Python\n- FastAPI\n";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ProjectContextCard", () => {
  it("renders the card header with file name and Committé badge", () => {
    render(<ProjectContextCard projectId="p1" />);
    expect(screen.getByText("Contexte du projet")).toBeInTheDocument();
    expect(screen.getByText(".alexis/project.md")).toBeInTheDocument();
    expect(screen.getByText("Committé")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Modifier" })).toBeInTheDocument();
  });

  it("does not fetch content before the card is expanded", () => {
    vi.spyOn(apiClient, "getProjectContextContent").mockResolvedValue({
      status: "ready",
      content: CONTENT,
    });
    render(<ProjectContextCard projectId="p1" />);
    expect(apiClient.getProjectContextContent).not.toHaveBeenCalled();
  });

  it("fetches and renders markdown content when expanded", async () => {
    vi.spyOn(apiClient, "getProjectContextContent").mockResolvedValue({
      status: "ready",
      content: CONTENT,
    });

    render(<ProjectContextCard projectId="p1" />);
    fireEvent.click(screen.getByText("Contexte du projet"));

    await waitFor(() =>
      expect(screen.getByText("Mon projet")).toBeInTheDocument()
    );
    expect(screen.getByText("Stack")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("FastAPI")).toBeInTheDocument();
  });

  it("shows loading spinner while status is loading", async () => {
    vi.spyOn(apiClient, "getProjectContextContent").mockResolvedValue({
      status: "loading",
      content: null,
    });

    render(<ProjectContextCard projectId="p1" _pollIntervalMs={0} />);
    fireEvent.click(screen.getByText("Contexte du projet"));

    await waitFor(() =>
      expect(screen.getByText("Chargement du contexte…")).toBeInTheDocument()
    );
  });

  it("shows error message when fetch fails", async () => {
    vi.spyOn(apiClient, "getProjectContextContent").mockRejectedValue(
      new Error("Network error")
    );

    render(<ProjectContextCard projectId="p1" />);
    fireEvent.click(screen.getByText("Contexte du projet"));

    await waitFor(() =>
      expect(screen.getByText("Impossible de charger le contexte.")).toBeInTheDocument()
    );
  });

  it("does not fetch again on second expand (cache)", async () => {
    vi.spyOn(apiClient, "getProjectContextContent").mockResolvedValue({
      status: "ready",
      content: CONTENT,
    });

    render(<ProjectContextCard projectId="p1" />);
    // First expand
    fireEvent.click(screen.getByText("Contexte du projet"));
    await waitFor(() => expect(screen.getByText("Mon projet")).toBeInTheDocument());

    // Collapse
    fireEvent.click(screen.getByText("Contexte du projet"));
    // Re-expand
    fireEvent.click(screen.getByText("Contexte du projet"));

    // Should still only have been called once
    expect(apiClient.getProjectContextContent).toHaveBeenCalledTimes(1);
  });

  it("opens edit modal when Modifier is clicked", async () => {
    vi.spyOn(apiClient, "getProjectContextContent").mockResolvedValue({
      status: "ready",
      content: CONTENT,
    });
    // Mock deps needed by ProjectContextStep inside the modal
    vi.spyOn(apiClient, "enqueueRepoSummary").mockResolvedValue({ job_id: "j1" });
    vi.spyOn(apiClient, "getRepoSummaryStatus").mockResolvedValue({
      status: "done",
      result: { has_code: false, file_count: 0, languages: [] },
    });

    render(<ProjectContextCard projectId="p1" />);
    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Décris ton projet en quelques phrases")).toBeInTheDocument()
    );
  });

  it("closes edit modal when Fermer (×) is clicked", async () => {
    vi.spyOn(apiClient, "enqueueRepoSummary").mockResolvedValue({ job_id: "j1" });
    vi.spyOn(apiClient, "getRepoSummaryStatus").mockResolvedValue({
      status: "done",
      result: { has_code: false, file_count: 0, languages: [] },
    });

    render(<ProjectContextCard projectId="p1" />);
    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Décris ton projet en quelques phrases")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByLabelText("Décris ton projet en quelques phrases")).not.toBeInTheDocument();
  });

  it("calls onContextUpdated after edit is done", async () => {
    vi.spyOn(apiClient, "getProjectContextContent").mockResolvedValue({
      status: "ready",
      content: CONTENT,
    });
    vi.spyOn(apiClient, "enqueueRepoSummary").mockResolvedValue({ job_id: "j1" });
    vi.spyOn(apiClient, "getRepoSummaryStatus").mockResolvedValue({
      status: "done",
      result: { has_code: false, file_count: 0, languages: [] },
    });
    vi.spyOn(apiClient, "createProjectContext").mockResolvedValue(undefined);
    vi.spyOn(apiClient, "getProjectContextStatus").mockResolvedValue({ status: "draft_ready" });
    vi.spyOn(apiClient, "getProjectContextDraft").mockResolvedValue({ content: "# Nouveau\n" });
    vi.spyOn(apiClient, "commitProjectContext").mockResolvedValue(undefined);
    vi.spyOn(apiClient, "getProjectContextStatus")
      .mockResolvedValueOnce({ status: null, error: null, phase: null }) // resume-on-mount check
      .mockResolvedValueOnce({ status: "draft_ready" })
      .mockResolvedValue({ status: "done" });

    const onContextUpdated = vi.fn();
    render(<ProjectContextCard projectId="p1" _pollIntervalMs={0} onContextUpdated={onContextUpdated} />);

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Décris ton projet en quelques phrases")).toBeInTheDocument()
    );

    // Submit brief
    fireEvent.change(screen.getByLabelText("Décris ton projet en quelques phrases"), {
      target: { value: "Nouveau contexte" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Générer" }));
    });

    // Wait for review phase
    await waitFor(() =>
      expect(screen.getByText("Relire et valider")).toBeInTheDocument(),
      { timeout: 3000 }
    );

    // Commit
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Valider et committer" }));
    });

    // Wait for done
    await waitFor(() =>
      expect(screen.getByText("Contexte committé ✓")).toBeInTheDocument(),
      { timeout: 3000 }
    );

    // Click Fermer (onDone) — le bouton texte de la phase done (pas le × de la modal)
    const fermerButtons = screen.getAllByRole("button", { name: "Fermer" });
    // Le dernier est le bouton "Fermer" de ProjectContextStep (phase done)
    fireEvent.click(fermerButtons[fermerButtons.length - 1]);
    expect(onContextUpdated).toHaveBeenCalledOnce();
  });
});
