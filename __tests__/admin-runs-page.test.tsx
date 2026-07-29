import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminRunsPage from "@/app/admin/runs/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";
import type { AdminRecentRun } from "@/lib/api-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/runs",
}));

function makeRun(overrides: Partial<AdminRecentRun>): AdminRecentRun {
  return {
    id: "run-1",
    identifier: "KARA-1",
    step: "dev",
    status: "done",
    model: "claude-sonnet-4-5",
    cost_usd: 1.234,
    duration_ms: 45000,
    error: null,
    created_at: "2026-07-20T10:00:00Z",
    client_email: "a@b.com",
    client_id: "client-1",
    project_name: "Kara",
    project_id: "project-1",
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(session, "getAdminApiKey").mockReturnValue("alx_admin_xxx");
  vi.spyOn(apiClient, "adminListClients").mockResolvedValue([
    { id: "client-1", email: "a@b.com", plan_name: "standard", project_count: 1, monthly_spend_usd: 5 },
  ]);
  vi.spyOn(apiClient, "adminGetClient").mockResolvedValue({
    id: "client-1", email: "a@b.com", github_username: null, plan_name: "standard",
    monthly_spend_usd: 5,
    projects: [{ id: "project-1", name: "Kara", agent_choice: "claude", is_active: true, total_cost_usd: 5 }],
  });
});

describe("AdminRunsPage", () => {
  it("renders the runs list", async () => {
    vi.spyOn(apiClient, "adminGetRecentRuns").mockResolvedValue({ items: [makeRun({})], total: 1 });

    render(<AdminRunsPage />);

    await waitFor(() => expect(screen.getByText("KARA-1")).toBeInTheDocument());
    expect(screen.getAllByText("a@b.com").length).toBeGreaterThan(0);
  });

  it("shows the pagination summary and disables Précédent on the first page", async () => {
    vi.spyOn(apiClient, "adminGetRecentRuns").mockResolvedValue({
      items: Array.from({ length: 25 }, (_, i) => makeRun({ id: `run-${i}`, identifier: `KARA-${i}` })),
      total: 60,
    });

    render(<AdminRunsPage />);

    await waitFor(() => expect(screen.getByText("1–25 sur 60")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /précédent/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /suivant/i })).not.toBeDisabled();
  });

  it("requests the next page with the right offset when Suivant is clicked", async () => {
    const spy = vi.spyOn(apiClient, "adminGetRecentRuns").mockResolvedValue({
      items: [makeRun({})], total: 60,
    });

    render(<AdminRunsPage />);
    await waitFor(() => expect(spy).toHaveBeenCalledWith("alx_admin_xxx", expect.objectContaining({ offset: 0 })));

    fireEvent.click(screen.getByRole("button", { name: /suivant/i }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("alx_admin_xxx", expect.objectContaining({ offset: 25 })));
  });

  it("disables the project filter until a client is selected, then populates it", async () => {
    vi.spyOn(apiClient, "adminGetRecentRuns").mockResolvedValue({ items: [], total: 0 });

    render(<AdminRunsPage />);
    await waitFor(() => expect(screen.getByText("a@b.com")).toBeInTheDocument());

    const projectSelect = screen.getByText("Choisis d'abord un client").closest("select")!;
    expect(projectSelect).toBeDisabled();

    fireEvent.change(screen.getByDisplayValue("Tous clients"), { target: { value: "client-1" } });

    await waitFor(() => expect(screen.getByText("Kara")).toBeInTheDocument());
  });

  it("re-fetches scoped to client and project when filters change", async () => {
    const spy = vi.spyOn(apiClient, "adminGetRecentRuns").mockResolvedValue({ items: [], total: 0 });

    render(<AdminRunsPage />);
    await waitFor(() => expect(screen.getByText("a@b.com")).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue("Tous clients"), { target: { value: "client-1" } });
    await waitFor(() => expect(screen.getByText("Kara")).toBeInTheDocument());

    fireEvent.change(screen.getByText("Kara").closest("select")!, { target: { value: "project-1" } });

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        "alx_admin_xxx",
        expect.objectContaining({ clientId: "client-1", projectId: "project-1" })
      )
    );
  });

  it("opens the run detail modal when a row is clicked", async () => {
    vi.spyOn(apiClient, "adminGetRecentRuns").mockResolvedValue({ items: [makeRun({})], total: 1 });

    render(<AdminRunsPage />);
    await waitFor(() => expect(screen.getByText("KARA-1")).toBeInTheDocument());

    fireEvent.click(screen.getByText("KARA-1"));

    expect(await screen.findByText("Voir la fiche client →")).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    vi.spyOn(apiClient, "adminGetRecentRuns").mockRejectedValue(new apiClient.AlexisApiError(500, "Erreur serveur"));

    render(<AdminRunsPage />);

    await waitFor(() => expect(screen.getByText("Erreur serveur")).toBeInTheDocument());
  });
});
