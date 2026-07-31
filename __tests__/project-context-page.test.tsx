import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ProjectContextPage from "@/app/dashboard/[id]/context/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "proj-1" }),
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
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
  states: {},
  trigger_states: {},
  models: {},
  run_timeout_seconds: 1800,
  is_active: true,
  created_at: "2026-07-15T00:00:00Z",
};

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  refreshMock.mockClear();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
  vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
});

describe("ProjectContextPage (/dashboard/[id]/context)", () => {
  it("shows the context card, already expanded, when context exists", async () => {
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: true });
    vi.spyOn(apiClient, "getProjectContextContent").mockResolvedValue({
      status: "ready",
      content: "# Mon projet\n",
    });

    render(<ProjectContextPage />);

    await waitFor(() => expect(screen.getByText("Contexte du projet")).toBeInTheDocument());
    // defaultExpanded=true — no click needed, content fetches immediately.
    await waitFor(() => expect(apiClient.getProjectContextContent).toHaveBeenCalled());
  });

  it("shows the generate flow when context does not exist yet", async () => {
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: false });
    vi.spyOn(apiClient, "enqueueRepoSummary").mockResolvedValue({ job_id: "job-1" });
    vi.spyOn(apiClient, "getRepoSummaryStatus").mockResolvedValue({
      status: "done",
      result: { has_code: false, file_count: 0, languages: [] },
    });

    render(<ProjectContextPage />);

    await waitFor(() => expect(screen.getByText(/Décris ton nouveau projet/)).toBeInTheDocument());
  });

  it("shows the breadcrumb with the project name", async () => {
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: true });
    vi.spyOn(apiClient, "getProjectContextContent").mockResolvedValue({ status: "ready", content: "# x\n" });

    render(<ProjectContextPage />);

    await waitFor(() => expect(screen.getAllByText("Kara").length).toBeGreaterThan(0));
  });
});
