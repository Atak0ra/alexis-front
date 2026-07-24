import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ProjectDetailPage from "@/app/dashboard/[id]/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";
import { DEFAULT_STATES, DEFAULT_TRIGGER_STATES, DEFAULT_MODELS } from "@/lib/project-defaults";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "proj-1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/app-header", () => ({
  AppHeader: () => <header data-testid="app-header" />,
}));

const FAKE_PROJECT: apiClient.ProjectOut = {
  id: "proj-1",
  name: "Kara",
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
  run_timeout_seconds: 1800,
  is_active: true,
  created_at: "2026-07-15T00:00:00Z",
};

const FAKE_ISSUE: apiClient.Issue = {
  id: "issue-1",
  identifier: "KARA-1",
  number: 1,
  title: "Corriger la pagination",
  description: "",
  state: "Backlog",
  labels: [],
  created_at: "2026-07-10T00:00:00Z",
  updated_at: "2026-07-10T00:00:00Z",
  comments: [],
};

const FAKE_TICKET: apiClient.TicketOut = {
  id: "KARA-1",
  title: "Corriger la pagination",
  description: "",
  status: "in_progress",
  agent: "claude",
  cost_usd: 2.5,
  updated_at: "2026-07-10T00:00:00Z",
  pr_url: "https://github.com/acme/kara/pull/7",
  pr_title: "Fix pagination",
  error_message: null,
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
  vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
  vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: true });
  vi.spyOn(apiClient, "getProjectStats").mockResolvedValue({
    resolved: 1, in_progress: 1, failed: 0, total_cost_usd: 2.5,
  });
});

describe("ProjectDetailPage — ticket/PR wiring", () => {
  it("shows a PR link on an issue row once ticket data (PR/cost) loads", async () => {
    vi.spyOn(apiClient, "listIssues").mockResolvedValue([FAKE_ISSUE]);
    vi.spyOn(apiClient, "listTickets").mockResolvedValue([FAKE_TICKET]);

    render(<ProjectDetailPage />);

    const prLink = await screen.findByRole("link", { name: /voir la pr/i });
    expect(prLink).toHaveAttribute("href", "https://github.com/acme/kara/pull/7");
  });

  it("renders issues normally when listTickets fails", async () => {
    vi.spyOn(apiClient, "listIssues").mockResolvedValue([FAKE_ISSUE]);
    vi.spyOn(apiClient, "listTickets").mockRejectedValue(new Error("boom"));

    render(<ProjectDetailPage />);

    await waitFor(() => expect(screen.getByText("Corriger la pagination")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /voir la pr/i })).not.toBeInTheDocument();
  });
});
