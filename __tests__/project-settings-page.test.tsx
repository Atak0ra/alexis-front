import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProjectSettingsPage from "@/app/dashboard/[id]/settings/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";
import { DEFAULT_STATES, DEFAULT_TRIGGER_STATES, DEFAULT_MODELS } from "@/lib/project-defaults";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "proj-123" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/components/app-header", () => ({
  AppHeader: () => <header data-testid="app-header" />,
}));

const FAKE_PROJECT: apiClient.ProjectOut = {
  id: "proj-123",
  name: "Kara",
  repo_url: "https://github.com/acme/kara.git",
  agent_choice: "claude",
  agent_base_url: null,
  linear_team_id: "team-1",
  forge_provider: "github",
  states: DEFAULT_STATES,
  trigger_states: DEFAULT_TRIGGER_STATES,
  models: DEFAULT_MODELS,
  run_timeout_seconds: 1800,
  is_active: true,
  created_at: "2026-07-15T00:00:00Z",
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("ProjectSettingsPage", () => {
  it("renders the form pre-filled with project data", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);

    render(<ProjectSettingsPage />);

    // Skeleton visible pendant le chargement
    expect(screen.queryByLabelText("Nom du projet")).toBeNull();

    // Après chargement, les champs sont préremplis
    await waitFor(() =>
      expect(screen.getByLabelText("Nom du projet")).toHaveValue("Kara")
    );
    expect(screen.getByLabelText("URL du repo")).toHaveValue(
      "https://github.com/acme/kara.git"
    );
  });

  it("shows 'Clé configurée' indicators for all secret fields", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);

    render(<ProjectSettingsPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("Nom du projet")).toBeInTheDocument()
    );

    // Deux indicateurs "Clé configurée" (agent + forge — Linear supprimé)
    const indicators = screen.getAllByText("Clé configurée");
    expect(indicators).toHaveLength(2);
  });

  it("submits only non-empty secrets and all classic fields", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
    const updateSpy = vi
      .spyOn(apiClient, "updateProject")
      .mockResolvedValue(FAKE_PROJECT);

    render(<ProjectSettingsPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("Nom du projet")).toBeInTheDocument()
    );

    // Modifier le nom et remplir seulement la clé agent
    fireEvent.change(screen.getByLabelText("Nom du projet"), {
      target: { value: "Kara v2" },
    });
    fireEvent.change(screen.getByLabelText("Clé API agent"), {
      target: { value: "sk-ant-new-key" },
    });
    // Laisser linear_api_key et forge_token vides

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith("alx_xxx", "proj-123", {
        name: "Kara v2",
        repo_url: "https://github.com/acme/kara.git",
        agent_choice: "claude",
        forge_provider: "github",
        agent_api_key: "sk-ant-new-key",
        // linear_api_key et forge_token absents car vides
      })
    );
  });

  it("omits all secrets when left empty", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
    const updateSpy = vi
      .spyOn(apiClient, "updateProject")
      .mockResolvedValue(FAKE_PROJECT);

    render(<ProjectSettingsPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("Nom du projet")).toBeInTheDocument()
    );

    // Soumettre sans toucher aux secrets
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith("alx_xxx", "proj-123", {
        name: "Kara",
        repo_url: "https://github.com/acme/kara.git",
        agent_choice: "claude",
        forge_provider: "github",
        // aucun secret
      })
    );
  });

  it("shows success message and clears secret fields after save", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "updateProject").mockResolvedValue(FAKE_PROJECT);

    render(<ProjectSettingsPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("Nom du projet")).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText("Clé API agent"), {
      target: { value: "sk-ant-xxx" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(screen.getByText("✓ Paramètres enregistrés")).toBeInTheDocument()
    );

    // Le champ secret est réinitialisé après sauvegarde
    expect(screen.getByLabelText("Clé API agent")).toHaveValue("");
  });

  it("shows error message on API failure", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "updateProject").mockRejectedValue(
      new apiClient.AlexisApiError(400, "Données invalides")
    );

    render(<ProjectSettingsPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("Nom du projet")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(screen.getByText("Données invalides")).toBeInTheDocument()
    );
  });
});
