import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import IssueDetailPage from "@/app/dashboard/[id]/issues/[issueId]/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";
import { DEFAULT_STATES, DEFAULT_TRIGGER_STATES, DEFAULT_MODELS } from "@/lib/project-defaults";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "proj-1", issueId: "issue-1" }),
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
    vi.spyOn(apiClient, "listIssues").mockResolvedValue([FAKE_ISSUE]);

    render(<IssueDetailPage />);

    await waitFor(() => expect(screen.getByText("Corriger la pagination")).toBeInTheDocument());
    expect(screen.getByText("KARA-1")).toBeInTheDocument();
    expect(screen.getByTestId("issue-step-requested")).toHaveAttribute("data-status", "current");
  });

  it("shows a not-found message when the issue id doesn't match any issue", async () => {
    vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
    vi.spyOn(apiClient, "listIssues").mockResolvedValue([]);

    render(<IssueDetailPage />);

    await waitFor(() => expect(screen.getByText("Demande introuvable.")).toBeInTheDocument());
  });
});
