import { useEffect } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AgentPage from "@/app/projects/new/agent/page";
import { NewProjectProvider, useNewProject } from "@/lib/new-project-context";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => "/projects/new/agent",
}));

const FAKE_PROJECT = {
  id: "proj-1",
  name: "proj-demo",
  repo_url: "https://github.com/acme/proj-demo",
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
  vi.spyOn(apiClient, "getMe").mockResolvedValue({
    id: "client-1", email: "x@x.com", email_verified: true, github_username: null, forced_agent_choice: null,
  });
});

// isByok n'est plus résolu par AgentPage lui-même — il est peuplé par le
// layout parent (via getMe()) avant que cette route ne soit atteinte
// (repo/page.tsx ne route vers /agent que pour un client BYOK). On simule
// cette précondition ici plutôt que de monter le layout complet.
function ForceByok({ byok, children }: { byok: boolean; children: React.ReactNode }) {
  const { setIsByok } = useNewProject();
  useEffect(() => {
    setIsByok(byok);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byok]);
  return <>{children}</>;
}

function renderAgentPage({ byok = true }: { byok?: boolean } = {}) {
  return render(
    <NewProjectProvider>
      <ForceByok byok={byok}>
        <AgentPage />
      </ForceByok>
    </NewProjectProvider>
  );
}

describe("AgentPage (step 2)", () => {
  it("renders the page heading and the agent fields", () => {
    renderAgentPage();
    expect(screen.getByRole("heading", { name: /agent ia/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Agent CLI")).toBeInTheDocument();
    expect(screen.getByLabelText(/Clé API agent/i)).toBeInTheDocument();
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
        ctx.setName("proj-demo");
        ctx.setRepoUrl("https://github.com/acme/proj-demo");
        ctx.setForgeToken("ghp_xxx");
        ctx.setIsByok(true);
      }
      return <AgentPage />;
    }

    render(
      <Provider>
        <FilledAgentPage />
      </Provider>
    );

    fireEvent.change(screen.getByLabelText(/Clé API agent/i), { target: { value: "sk-ant-xxx" } });
    fireEvent.click(screen.getByRole("button", { name: /créer le projet/i }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(`/projects/new/context?projectId=${FAKE_PROJECT.id}`)
    );
    expect(apiClient.createProject).toHaveBeenCalledWith(
      "alx_xxx",
      expect.objectContaining({
        name: "proj-demo",
        repo_url: "https://github.com/acme/proj-demo",
        agent_api_key: "sk-ant-xxx",
      })
    );
  });

  it("submits successfully with an empty agent-api-key field, sending agent_api_key: null", async () => {
    vi.spyOn(apiClient, "createProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: true });

    const { NewProjectProvider: Provider, useNewProject } = await import("@/lib/new-project-context");

    function FilledAgentPage() {
      const ctx = useNewProject();
      if (!ctx.name) {
        ctx.setName("proj-demo");
        ctx.setRepoUrl("https://github.com/acme/proj-demo");
        ctx.setForgeToken("ghp_xxx");
        ctx.setIsByok(true);
      }
      return <AgentPage />;
    }

    render(
      <Provider>
        <FilledAgentPage />
      </Provider>
    );

    // Ne pas toucher au champ clé API — le laisser vide
    fireEvent.click(screen.getByRole("button", { name: /créer le projet/i }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(`/projects/new/context?projectId=${FAKE_PROJECT.id}`)
    );
    expect(apiClient.createProject).toHaveBeenCalledWith(
      "alx_xxx",
      expect.objectContaining({
        agent_api_key: null,
      })
    );
  });

  it("defaults code_review_enabled to true and sends false when the checkbox is unchecked", async () => {
    vi.spyOn(apiClient, "createProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: true });

    const { NewProjectProvider: Provider, useNewProject } = await import("@/lib/new-project-context");

    function FilledAgentPage() {
      const ctx = useNewProject();
      if (!ctx.name) {
        ctx.setName("proj-demo");
        ctx.setRepoUrl("https://github.com/acme/proj-demo");
        ctx.setForgeToken("ghp_xxx");
        ctx.setIsByok(true);
      }
      return <AgentPage />;
    }

    render(
      <Provider>
        <FilledAgentPage />
      </Provider>
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /revue de code/i }));
    fireEvent.click(screen.getByRole("button", { name: /créer le projet/i }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(`/projects/new/context?projectId=${FAKE_PROJECT.id}`)
    );
    expect(apiClient.createProject).toHaveBeenCalledWith(
      "alx_xxx",
      expect.objectContaining({
        code_review_enabled: false,
      })
    );
  });

  it("sends OpenAI-compatible default models when the agent is aider (not Claude model names)", async () => {
    vi.spyOn(apiClient, "createProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: true });

    const { NewProjectProvider: Provider, useNewProject } = await import("@/lib/new-project-context");

    function FilledAiderAgentPage() {
      const ctx = useNewProject();
      if (!ctx.name) {
        ctx.setName("proj-demo");
        ctx.setRepoUrl("https://github.com/acme/proj-demo");
        ctx.setForgeToken("ghp_xxx");
        ctx.setAgentChoice("aider");
        ctx.setIsByok(true);
      }
      return <AgentPage />;
    }

    render(
      <Provider>
        <FilledAiderAgentPage />
      </Provider>
    );

    fireEvent.change(screen.getByLabelText(/Clé API agent/i), { target: { value: "sk-proj-xxx" } });
    fireEvent.click(screen.getByRole("button", { name: /créer le projet/i }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(`/projects/new/context?projectId=${FAKE_PROJECT.id}`)
    );
    expect(apiClient.createProject).toHaveBeenCalledWith(
      "alx_xxx",
      expect.objectContaining({
        models: { spec: "gpt-4o", plan: "gpt-4o", dev: "gpt-4o" },
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
        ctx.setName("proj-demo");
        ctx.setRepoUrl("https://github.com/acme/proj-demo");
        ctx.setForgeToken("ghp_xxx");
        ctx.setIsByok(true);
      }
      return <AgentPage />;
    }

    render(
      <Provider>
        <FilledAgentPage />
      </Provider>
    );

    fireEvent.change(screen.getByLabelText(/Clé API agent/i), { target: { value: "sk-ant-xxx" } });
    fireEvent.click(screen.getByRole("button", { name: /créer le projet/i }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(`/projects/new/context?projectId=${FAKE_PROJECT.id}&new=true`)
    );
  });

  it("submits hosted payload with repo_url/forge_token null and github_username set", async () => {
    vi.spyOn(apiClient, "createProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: true });

    const { NewProjectProvider: Provider, useNewProject } = await import("@/lib/new-project-context");

    function FilledHostedAgentPage() {
      const ctx = useNewProject();
      if (!ctx.name) {
        ctx.setName("proj-demo");
        ctx.setHosted(true);
        ctx.setGithubUsername("octocat");
        ctx.setIsByok(true);
      }
      return <AgentPage />;
    }

    render(
      <Provider>
        <FilledHostedAgentPage />
      </Provider>
    );

    fireEvent.change(screen.getByLabelText(/Clé API agent/i), { target: { value: "sk-ant-xxx" } });
    fireEvent.click(screen.getByRole("button", { name: /créer le projet/i }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(`/projects/new/context?projectId=${FAKE_PROJECT.id}`)
    );
    expect(apiClient.createProject).toHaveBeenCalledWith(
      "alx_xxx",
      expect.objectContaining({
        name: "proj-demo",
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
        ctx.setName("proj-demo");
        ctx.setRepoUrl("https://github.com/acme/proj-demo");
        ctx.setForgeToken("ghp_xxx");
        ctx.setIsByok(true);
      }
      return <AgentPage />;
    }

    render(
      <Provider>
        <FilledAgentPage />
      </Provider>
    );

    fireEvent.change(screen.getByLabelText(/Clé API agent/i), { target: { value: "sk-ant-xxx" } });
    fireEvent.click(screen.getByRole("button", { name: /créer le projet/i }));

    await waitFor(() =>
      expect(screen.getByText("Erreur de création du projet")).toBeInTheDocument()
    );
  });

  it("shows the agent/key fields as optional for a client on a forced-agent plan, with reframed hint copy", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValue({
      id: "client-1", email: "free@x.com", email_verified: true, github_username: null, forced_agent_choice: "aider",
    });
    vi.spyOn(apiClient, "createProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: true });

    renderAgentPage();

    await waitFor(() => {
      expect(screen.getByLabelText("Agent CLI")).toBeInTheDocument();
      expect(screen.getByLabelText(/Clé API agent/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/clé gérée par Alexis/i)).toBeInTheDocument();
  });

  it("submits the client's own agent choice and key on a forced-agent plan when a key is provided", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValue({
      id: "client-1", email: "free@x.com", email_verified: true, github_username: null, forced_agent_choice: "aider",
    });
    vi.spyOn(apiClient, "createProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: true });

    const { NewProjectProvider: Provider, useNewProject } = await import("@/lib/new-project-context");

    function FilledAgentPage() {
      const ctx = useNewProject();
      if (!ctx.name) {
        ctx.setName("proj-demo");
        ctx.setRepoUrl("https://github.com/acme/proj-demo");
        ctx.setForgeToken("ghp_xxx");
        ctx.setAgentChoice("claude");
        ctx.setIsByok(true);
      }
      return <AgentPage />;
    }

    render(
      <Provider>
        <FilledAgentPage />
      </Provider>
    );

    await waitFor(() => expect(screen.getByLabelText("Agent CLI")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Clé API agent/i), { target: { value: "sk-ant-xxx" } });
    fireEvent.click(screen.getByRole("button", { name: /créer le projet/i }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(`/projects/new/context?projectId=${FAKE_PROJECT.id}`)
    );
    expect(apiClient.createProject).toHaveBeenCalledWith(
      "alx_xxx",
      expect.objectContaining({ agent_choice: "claude", agent_api_key: "sk-ant-xxx" })
    );
  });
});
