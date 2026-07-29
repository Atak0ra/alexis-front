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
  is_hosted: false,
  agent_choice: "claude",
  agent_base_url: null,
  has_agent_api_key: true,
  forge_provider: "github",
  has_forge_token: true,
  states: DEFAULT_STATES,
  trigger_states: DEFAULT_TRIGGER_STATES,
  models: DEFAULT_MODELS,
  code_review_enabled: true,
  run_timeout_seconds: 1800,
  is_active: true,
  created_at: "2026-07-15T00:00:00Z",
};

const FAKE_HOSTED_PROJECT: apiClient.ProjectOut = {
  ...FAKE_PROJECT,
  repo_url: "https://github.com/compeel-alexis/acme-kara-abc123.git",
  is_hosted: true,
  has_forge_token: false,
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
  // isByok (section Agent) dérive de profile.plan.requires_own_key — tous
  // les tests de ce fichier attendent la section Agent visible (BYOK).
  vi.spyOn(apiClient, "getMe").mockResolvedValue({
    id: "client-1", email: "a@b.com", email_verified: true, github_username: null, forced_agent_choice: null,
    plan: {
      id: "plan-byok", name: "byok", display_name: "BYOK", description: null, features: null,
      monthly_price_eur: 0, requires_own_key: true, max_members: 1, is_public: true, sort_order: 0,
    },
  });
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

    // Deux indicateurs "Clé configurée" (agent + forge)
    const indicators = screen.getAllByText("Clé configurée");
    expect(indicators).toHaveLength(2);
  });

  it("shows no 'Clé configurée' indicator for keys that aren't actually set", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue({
      ...FAKE_PROJECT,
      has_agent_api_key: false,
      has_forge_token: false,
    });

    render(<ProjectSettingsPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("Nom du projet")).toBeInTheDocument()
    );

    expect(screen.queryByText("Clé configurée")).not.toBeInTheDocument();
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
    // Laisser forge_token vide

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith("alx_xxx", "proj-123", {
        name: "Kara v2",
        repo_url: "https://github.com/acme/kara.git",
        agent_choice: "claude",
        agent_base_url: null,
        models: { spec: "claude-opus-4-5", plan: "claude-opus-4-5", dev: "claude-sonnet-4-5" },
        code_review_enabled: true,
        forge_provider: "github",
        agent_api_key: "sk-ant-new-key",
        // forge_token absent car vide
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
        agent_base_url: null,
        models: { spec: "claude-opus-4-5", plan: "claude-opus-4-5", dev: "claude-sonnet-4-5" },
        code_review_enabled: true,
        forge_provider: "github",
        // aucun secret
      })
    );
  });

  it("submits code_review_enabled: false when the checkbox is unchecked", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
    const updateSpy = vi
      .spyOn(apiClient, "updateProject")
      .mockResolvedValue(FAKE_PROJECT);

    render(<ProjectSettingsPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("Nom du projet")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /revue de code/i }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith(
        "alx_xxx",
        "proj-123",
        expect.objectContaining({ code_review_enabled: false })
      )
    );
  });

  it("hides the Base URL field for claude and shows it for aider", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);

    render(<ProjectSettingsPage />);

    await waitFor(() => expect(screen.getByLabelText("Nom du projet")).toBeInTheDocument());
    expect(screen.queryByLabelText(/Base URL de l'API/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Agent CLI"), { target: { value: "aider" } });
    expect(screen.getByLabelText(/Base URL de l'API/)).toBeInTheDocument();
  });

  it("submits edited base URL and per-step models", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
    const updateSpy = vi.spyOn(apiClient, "updateProject").mockResolvedValue(FAKE_PROJECT);

    render(<ProjectSettingsPage />);
    await waitFor(() => expect(screen.getByLabelText("Nom du projet")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Agent CLI"), { target: { value: "aider" } });
    fireEvent.change(screen.getByLabelText(/Base URL de l'API/), {
      target: { value: "https://api.groq.com/openai/v1" },
    });
    fireEvent.change(screen.getByLabelText("Spec"), { target: { value: "llama-3.3-70b-versatile" } });
    fireEvent.change(screen.getByLabelText("Plan"), { target: { value: "llama-3.3-70b-versatile" } });
    fireEvent.change(screen.getByLabelText("Dev"), { target: { value: "llama-3.3-70b-versatile" } });

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith(
        "alx_xxx",
        "proj-123",
        expect.objectContaining({
          agent_choice: "aider",
          agent_base_url: "https://api.groq.com/openai/v1",
          models: {
            spec: "llama-3.3-70b-versatile",
            plan: "llama-3.3-70b-versatile",
            dev: "llama-3.3-70b-versatile",
          },
        })
      )
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

  it("shows no hosted badge or transfer section for a BYO project", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);

    render(<ProjectSettingsPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("Nom du projet")).toBeInTheDocument()
    );

    expect(screen.queryByText("Hébergé par Alexis")).not.toBeInTheDocument();
    expect(screen.queryByText("Repo hébergé")).not.toBeInTheDocument();
  });

  it("shows the hosted badge and a read-only repo URL for a hosted project", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_HOSTED_PROJECT);

    render(<ProjectSettingsPage />);

    await waitFor(() =>
      expect(screen.getByText("Hébergé par Alexis")).toBeInTheDocument()
    );
    expect(screen.getByLabelText("URL du repo")).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Transférer mon repo" })).toBeInTheDocument();
  });

  it("hides the Forge section for a hosted project (token managed by Alexis)", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_HOSTED_PROJECT);

    render(<ProjectSettingsPage />);

    await waitFor(() =>
      expect(screen.getByText("Hébergé par Alexis")).toBeInTheDocument()
    );

    expect(screen.queryByLabelText("Forge")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Token forge")).not.toBeInTheDocument();
  });

  it("does not send forge_provider when saving a hosted project", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_HOSTED_PROJECT);
    const updateSpy = vi
      .spyOn(apiClient, "updateProject")
      .mockResolvedValue(FAKE_HOSTED_PROJECT);

    render(<ProjectSettingsPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("Nom du projet")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    const sentPayload = updateSpy.mock.calls[0][2];
    expect(sentPayload).not.toHaveProperty("forge_provider");
    expect(sentPayload).not.toHaveProperty("forge_token");
  });

  it("transfers the hosted repo after confirmation", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_HOSTED_PROJECT);
    const transferSpy = vi
      .spyOn(apiClient, "transferRepo")
      .mockResolvedValue({ new_owner: "octocat" });

    render(<ProjectSettingsPage />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Transférer mon repo" })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: "Transférer mon repo" }));

    fireEvent.change(screen.getByLabelText(/compte github cible/i), {
      target: { value: "octocat" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmer le transfert" }));

    await waitFor(() =>
      expect(screen.getByText(/Transfert lancé vers/)).toBeInTheDocument()
    );
    expect(transferSpy).toHaveBeenCalledWith("alx_xxx", "proj-123", { new_owner: "octocat" });
  });

  it("downloads the project as a ZIP when the download button is clicked", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
    const downloadSpy = vi.spyOn(apiClient, "downloadProject").mockResolvedValue(undefined);

    render(<ProjectSettingsPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("Nom du projet")).toHaveValue("Kara")
    );
    fireEvent.click(screen.getByRole("button", { name: /télécharger le code/i }));

    await waitFor(() =>
      expect(downloadSpy).toHaveBeenCalledWith("alx_xxx", "proj-123", "Kara")
    );
  });
});
