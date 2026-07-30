import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import IssueDetailPage from "@/app/dashboard/[id]/issues/[issueId]/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";
import { DEFAULT_STATES, DEFAULT_TRIGGER_STATES, DEFAULT_MODELS } from "@/lib/project-defaults";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "proj-1", issueId: "issue-1" }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// jsdom doesn't implement Blob URLs — the asset preview fetch-and-blob flow
// calls the real URL.createObjectURL, so stub it for this suite.
if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
}

const FAKE_PROJECT: apiClient.ProjectOut = {
  id: "proj-1",
  name: "Kara",
  repo_url: "https://github.com/acme/kara.git",
  is_hosted: false,
  agent_choice: "claude",
  agent_base_url: null,
  has_agent_api_key: true,
  issue_prefix: null,
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
  description: "Le bouton suivant ne répond pas.",
  state: "Backlog",
  labels: [],
  created_at: "2026-07-10T00:00:00Z",
  updated_at: "2026-07-10T00:00:00Z",
  comments: [],
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
});

describe("IssueDetailPage", () => {
  it("renders the issue title and timeline once loaded", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "getIssue").mockResolvedValue(FAKE_ISSUE);

    render(<IssueDetailPage />);

    await waitFor(() => expect(screen.getByText("Corriger la pagination")).toBeInTheDocument());
    expect(screen.getByText("KARA-1")).toBeInTheDocument();
    expect(screen.getByTestId("issue-step-requested")).toHaveAttribute("data-status", "current");
  });

  it("shows a not-found message when the issue id doesn't match any issue", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "getIssue").mockRejectedValue(new apiClient.AlexisApiError(404, "Demande introuvable"));

    render(<IssueDetailPage />);

    await waitFor(() => expect(screen.getByText("Demande introuvable.")).toBeInTheDocument());
  });

  it("loads and displays existing ticket assets, and uploads a new one", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "getIssue").mockResolvedValue(FAKE_ISSUE);
    vi.spyOn(apiClient, "listIssueAssets").mockResolvedValue([
      { id: "a1", filename: "mockup.png", content_type: "image/png", size_bytes: 10, created_at: "2026-01-01T00:00:00Z" },
    ]);
    const uploadSpy = vi.spyOn(apiClient, "uploadIssueAsset").mockResolvedValue({
      id: "a2", filename: "second.png", content_type: "image/png", size_bytes: 20, created_at: "2026-01-01T00:00:00Z",
    });
    // Real (non-demo) mode: previews are fetched with an Authorization header
    // and turned into blob URLs, since a plain <img src> can't attach headers.
    const fetchMock = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(["data"])),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<IssueDetailPage />);

    expect(await screen.findByAltText("mockup.png")).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/assets/a1/content"),
        expect.objectContaining({ headers: { Authorization: "Bearer alx_xxx" } })
      )
    );

    const file = new File(["data"], "second.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/ajouter un fichier/i), { target: { files: [file] } });

    await waitFor(() => expect(uploadSpy).toHaveBeenCalled());
    expect(await screen.findByAltText("second.png")).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
