import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AgentPage from "@/app/projects/new/agent/page";
import { NewProjectProvider } from "@/lib/new-project-context";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => "/projects/new/agent",
}));

const FAKE_PROJECT = {
  id: "proj-1",
  name: "kara",
  repo_url: "https://github.com/acme/kara",
  is_hosted: false,
  agent_choice: "claude",
  agent_base_url: null,
  forge_provider: "github",
  states: {},
  trigger_states: [],
  models: {},
  run_timeout_seconds: 1800,
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
});

function renderAgentPage() {
  return render(
    <NewProjectProvider>
      <AgentPage />
    </NewProjectProvider>
  );
}

describe("AgentPage (step 2)", () => {
  it("renders the page heading and the agent fields", () => {
    renderAgentPage();
    expect(screen.getByRole("heading", { name: /agent ia/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Agent CLI")).toBeInTheDocument();
    expect(screen.getByLabelText("Clé API agent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /créer le projet/i })).toBeInTheDocument();
  });

  it("navigates back to /projects/new/repo when Précédent is clicked", () => {
    renderAgentPage();
    fireEvent.click(screen.getByRole("button", { name: /précédent/i }));
    expect(pushMock).toHaveBeenCalledWith("/projects/new/repo");
  });

  it("submits the payload and redirects to /dashboard when context exists", async () => {
    vi.spyOn(apiClient, "createProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: true });

    const { NewProjectProvider: Provider, useNewProject } = await import("@/lib/new-project-context");

    function FilledAgentPage() {
      const ctx = useNewProject();
      if (!ctx.name) {
        ctx.setName("kara");
        ctx.setRepoUrl("https://github.com/acme/kara");
        ctx.setForgeToken("ghp_xxx");
      }
      return <AgentPage />;
    }

    render(
      <Provider>
        <FilledAgentPage />
      </Provider>
    );

    fireEvent.change(screen.getByLabelText("Clé API agent"), { target: { value: "sk-ant-xxx" } });
    fireEvent.click(screen.getByRole("button", { name: /créer le projet/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(apiClient.createProject).toHaveBeenCalledWith(
      "alx_xxx",
      expect.objectContaining({
        name: "kara",
        repo_url: "https://github.com/acme/kara",
        agent_api_key: "sk-ant-xxx",
      })
    );
  });

  it("navigates to /projects/new/context?projectId=... when context does not exist (exists=false)", async () => {
    vi.spyOn(apiClient, "createProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: false });

    const { NewProjectProvider: Provider, useNewProject } = await import("@/lib/new-project-context");

    function FilledAgentPage() {
      const ctx = useNewProject();
      if (!ctx.name) {
        ctx.setName("kara");
        ctx.setRepoUrl("https://github.com/acme/kara");
        ctx.setForgeToken("ghp_xxx");
      }
      return <AgentPage />;
    }

    render(
      <Provider>
        <FilledAgentPage />
      </Provider>
    );

    fireEvent.change(screen.getByLabelText("Clé API agent"), { target: { value: "sk-ant-xxx" } });
    fireEvent.click(screen.getByRole("button", { name: /créer le projet/i }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(`/projects/new/context?projectId=${FAKE_PROJECT.id}`)
    );
  });

  it("submits hosted payload with repo_url/forge_token null and github_username set", async () => {
    vi.spyOn(apiClient, "createProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: true });

    const { NewProjectProvider: Provider, useNewProject } = await import("@/lib/new-project-context");

    function FilledHostedAgentPage() {
      const ctx = useNewProject();
      if (!ctx.name) {
        ctx.setName("kara");
        ctx.setHosted(true);
        ctx.setGithubUsername("octocat");
      }
      return <AgentPage />;
    }

    render(
      <Provider>
        <FilledHostedAgentPage />
      </Provider>
    );

    fireEvent.change(screen.getByLabelText("Clé API agent"), { target: { value: "sk-ant-xxx" } });
    fireEvent.click(screen.getByRole("button", { name: /créer le projet/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(apiClient.createProject).toHaveBeenCalledWith(
      "alx_xxx",
      expect.objectContaining({
        name: "kara",
        repo_url: null,
        forge_token: null,
        forge_provider: "github",
        hosted: true,
        github_username: "octocat",
      })
    );
  });

  it("shows error message on API failure", async () => {
    vi.spyOn(apiClient, "createProject").mockRejectedValue(
      new apiClient.AlexisApiError(400, "Erreur de création du projet")
    );

    const { NewProjectProvider: Provider, useNewProject } = await import("@/lib/new-project-context");

    function FilledAgentPage() {
      const ctx = useNewProject();
      if (!ctx.name) {
        ctx.setName("kara");
        ctx.setRepoUrl("https://github.com/acme/kara");
        ctx.setForgeToken("ghp_xxx");
      }
      return <AgentPage />;
    }

    render(
      <Provider>
        <FilledAgentPage />
      </Provider>
    );

    fireEvent.change(screen.getByLabelText("Clé API agent"), { target: { value: "sk-ant-xxx" } });
    fireEvent.click(screen.getByRole("button", { name: /créer le projet/i }));

    await waitFor(() =>
      expect(screen.getByText("Erreur de création du projet")).toBeInTheDocument()
    );
  });
});
