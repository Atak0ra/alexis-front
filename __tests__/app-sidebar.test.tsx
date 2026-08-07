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

const FAKE_PROJECTS_WITH_INACTIVE: apiClient.ProjectOut[] = [
  ...FAKE_PROJECTS,
  {
    id: "proj-2",
    name: "deleted-project",
    repo_url: "https://github.com/acme/deleted.git",
    is_hosted: false,
    agent_choice: "claude",
    agent_base_url: null,
    has_agent_api_key: false,
    issue_prefix: null,
    forge_provider: "github",
    has_forge_token: true,
    states: DEFAULT_STATES,
    trigger_states: DEFAULT_TRIGGER_STATES,
    models: DEFAULT_MODELS,
    code_review_enabled: true,
    run_timeout_seconds: 1800,
    is_active: false,
    created_at: "2026-07-10T00:00:00Z",
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

  it("shows a Contexte link between Tickets and Paramètres, marked active on the context route", async () => {
    mockPathname = "/dashboard/proj-1/context";
    render(<AppSidebar />);

    await waitFor(() => expect(screen.getAllByRole("link", { name: "Contexte" }).length).toBeGreaterThan(0));
    expect(screen.getAllByRole("link", { name: "Contexte" })[0]).toHaveClass("bg-brand-light");
    expect(screen.getAllByRole("link", { name: "Tickets" })[0]).not.toHaveClass("bg-brand-light");
    expect(screen.getAllByRole("link", { name: "Paramètres" })[0]).not.toHaveClass("bg-brand-light");
  });
});

describe("AppSidebar — inactive projects", () => {
  it("does not show inactive (soft-deleted) projects in the sidebar list", async () => {
    vi.spyOn(apiClient, "listProjects").mockResolvedValue(FAKE_PROJECTS_WITH_INACTIVE);

    render(<AppSidebar />);

    await waitFor(() => expect(screen.getAllByText("kara").length).toBeGreaterThan(0));
    expect(screen.queryByText("deleted-project")).not.toBeInTheDocument();
  });

  it("still shows active projects when inactive ones are present", async () => {
    vi.spyOn(apiClient, "listProjects").mockResolvedValue(FAKE_PROJECTS_WITH_INACTIVE);

    render(<AppSidebar />);

    await waitFor(() => expect(screen.getAllByText("kara").length).toBeGreaterThan(0));
    expect(screen.getAllByText("kara").length).toBeGreaterThan(0);
  });
});

