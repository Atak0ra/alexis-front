import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AppSidebar } from "@/components/app-sidebar";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";
import { DEFAULT_STATES, DEFAULT_TRIGGER_STATES, DEFAULT_MODELS } from "@/lib/project-defaults";

const pushMock = vi.fn();
let mockPathname = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: pushMock }),
}));

const FAKE_PROJECTS: apiClient.ProjectOut[] = [
  {
    id: "proj-1",
    name: "kara",
    repo_url: "https://github.com/acme/kara.git",
    is_hosted: false,
    agent_choice: "claude",
    agent_base_url: null,
    has_agent_api_key: true,
    issue_prefix: "KARA",
    forge_provider: "github",
    has_forge_token: true,
    states: DEFAULT_STATES,
    trigger_states: DEFAULT_TRIGGER_STATES,
    models: DEFAULT_MODELS,
    code_review_enabled: true,
    run_timeout_seconds: 1800,
    is_active: true,
    created_at: "2026-07-15T00:00:00Z",
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  mockPathname = "/dashboard";
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
  vi.spyOn(session, "getKeyId").mockReturnValue("key-1");
  vi.spyOn(apiClient, "listProjects").mockResolvedValue(FAKE_PROJECTS);
  vi.spyOn(apiClient, "getMe").mockResolvedValue({
    id: "client-1", email: "a@b.com", email_verified: true, github_username: null, forced_agent_choice: null, plan: null,
  });
});

describe("AppSidebar — global state (outside a project)", () => {
  it("shows Tableau de bord as active and lists projects", async () => {
    render(<AppSidebar />);

    await waitFor(() => expect(screen.getAllByText("kara").length).toBeGreaterThan(0));
    const dashboardLinks = screen.getAllByRole("link", { name: "Tableau de bord" });
    expect(dashboardLinks[0]).toHaveClass("bg-brand-light");
  });

  it("shows a link to create a new project", async () => {
    render(<AppSidebar />);
    await waitFor(() => expect(screen.getAllByText(/Nouveau projet/).length).toBeGreaterThan(0));
    expect(screen.getAllByRole("link", { name: /nouveau projet/i }).length).toBeGreaterThan(0);
  });

  it("shows a reminder modal instead of a link when the account isn't email-verified", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValue({
      id: "client-1", email: "a@b.com", email_verified: false, github_username: null, forced_agent_choice: null, plan: null,
    });

    render(<AppSidebar />);
    await waitFor(() => expect(screen.getAllByText(/Nouveau projet/).length).toBeGreaterThan(0));
    expect(screen.queryByRole("link", { name: /nouveau projet/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /nouveau projet/i })[0]);

    expect(screen.getByText("Compte pas encore activé")).toBeInTheDocument();
  });
});

describe("AppSidebar — project context state", () => {
  it("switches to Tickets/Paramètres nav and shows the project name", async () => {
    mockPathname = "/dashboard/proj-1";
    render(<AppSidebar />);

    await waitFor(() => expect(screen.getAllByText("kara").length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Tous les projets/).length).toBeGreaterThan(0);
    const ticketsLinks = screen.getAllByRole("link", { name: "Tickets" });
    expect(ticketsLinks[0]).toHaveClass("bg-brand-light");
    const settingsLinks = screen.getAllByRole("link", { name: "Paramètres" });
    expect(settingsLinks[0]).not.toHaveClass("bg-brand-light");
  });

  it("marks Paramètres active on the settings route", async () => {
    mockPathname = "/dashboard/proj-1/settings";
    render(<AppSidebar />);

    await waitFor(() => expect(screen.getAllByRole("link", { name: "Paramètres" }).length).toBeGreaterThan(0));
    expect(screen.getAllByRole("link", { name: "Paramètres" })[0]).toHaveClass("bg-brand-light");
    expect(screen.getAllByRole("link", { name: "Tickets" })[0]).not.toHaveClass("bg-brand-light");
  });

  it("keeps Tickets active when drilled into a specific issue", async () => {
    mockPathname = "/dashboard/proj-1/issues/issue-1";
    render(<AppSidebar />);

    await waitFor(() => expect(screen.getAllByRole("link", { name: "Tickets" }).length).toBeGreaterThan(0));
    expect(screen.getAllByRole("link", { name: "Tickets" })[0]).toHaveClass("bg-brand-light");
  });
});

describe("AppSidebar — logout", () => {
  it("revokes the key, clears the session, and redirects to the landing page", async () => {
    const revokeSpy = vi.spyOn(apiClient, "revokeApiKey").mockResolvedValue(undefined);
    const clearSpy = vi.spyOn(session, "clearApiKey");

    render(<AppSidebar />);
    await waitFor(() => expect(screen.getAllByText(/Se déconnecter/).length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole("button", { name: /se déconnecter/i })[0]);

    await waitFor(() => expect(revokeSpy).toHaveBeenCalledWith("alx_xxx", "key-1"));
    expect(clearSpy).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/");
  });
});
