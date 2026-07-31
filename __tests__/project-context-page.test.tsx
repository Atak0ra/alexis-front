import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

const FAKE_CONTENT = [
  "## Stack technique",
  "Python 3.12, FastAPI, PostgreSQL",
  "",
  "## Conventions",
  "- Branches feat/{id}/{slug}",
].join("\n");

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  refreshMock.mockClear();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
  vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
});

describe("ProjectContextPage (/dashboard/[id]/context)", () => {
  it("renders the document full-page with the budget gauge when context exists", async () => {
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: true });
    vi.spyOn(apiClient, "getProjectContextContent").mockResolvedValue({
      status: "ready",
      content: FAKE_CONTENT,
    });

    render(<ProjectContextPage />);

    await waitFor(() => expect(screen.getByText("Contexte du projet")).toBeInTheDocument());
    expect(screen.getByText("Stack technique")).toBeInTheDocument();
    expect(screen.getByText("Conventions")).toBeInTheDocument();
    // Budget gauge: 5 lines in FAKE_CONTENT.
    expect(screen.getByText(/5 \/ 150 lignes/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /modifier/i })).toBeInTheDocument();
  });

  it("switches to the edit flow when Modifier is clicked, and back to the document on done", async () => {
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: true });
    vi.spyOn(apiClient, "getProjectContextContent").mockResolvedValue({
      status: "ready",
      content: FAKE_CONTENT,
    });
    vi.spyOn(apiClient, "getProjectContextStatus").mockResolvedValue({ status: null, error: null, phase: null });
    vi.spyOn(apiClient, "enqueueRepoSummary").mockResolvedValue({ job_id: "job-1" });
    vi.spyOn(apiClient, "getRepoSummaryStatus").mockResolvedValue({
      status: "done",
      result: { has_code: true, file_count: 12, languages: ["Python"] },
    });

    const { unmount } = render(<ProjectContextPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: /modifier/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /modifier/i }));

    await waitFor(() => expect(screen.getByText("Contexte du projet")).toBeInTheDocument());
    // ProjectContextStep's own heading text when hasCode=true.
    expect(screen.queryByText(/5 \/ 150 lignes/)).not.toBeInTheDocument();

    // Unmount explicitly: ProjectContextStep (now mounted via the edit toggle)
    // owns a polling setInterval — without an explicit unmount here it can
    // keep firing into the next test in this file and leak mock call state.
    unmount();
  });

  it("shows the generate flow directly when context does not exist yet (no edit toggle needed)", async () => {
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: false });
    vi.spyOn(apiClient, "enqueueRepoSummary").mockResolvedValue({ job_id: "job-1" });
    vi.spyOn(apiClient, "getRepoSummaryStatus").mockResolvedValue({
      status: "done",
      result: { has_code: false, file_count: 0, languages: [] },
    });

    render(<ProjectContextPage />);

    await waitFor(() => expect(screen.getByText(/Décris ton nouveau projet/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /^modifier$/i })).not.toBeInTheDocument();
  });

  it("shows the breadcrumb with the project name", async () => {
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: true });
    vi.spyOn(apiClient, "getProjectContextContent").mockResolvedValue({ status: "ready", content: FAKE_CONTENT });

    render(<ProjectContextPage />);

    await waitFor(() => expect(screen.getAllByText("Kara").length).toBeGreaterThan(0));
  });
});
