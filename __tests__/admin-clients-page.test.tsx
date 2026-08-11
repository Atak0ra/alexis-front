import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AdminClientsPage from "@/app/admin/clients/page";
import AdminClientDetailPage from "@/app/admin/clients/[id]/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/clients",
  useParams: () => ({ id: "client-1" }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(session, "getAdminApiKey").mockReturnValue("alx_admin_xxx");
});

describe("AdminClientsPage", () => {
  it("renders the client list with plan, project count and spend", async () => {
    vi.spyOn(apiClient, "adminListClients").mockResolvedValue([
      { id: "client-1", email: "a@b.com", plan_name: "standard", project_count: 2, monthly_spend_usd: 12.5, wallet_balance_usd: 30 },
    ]);

    render(<AdminClientsPage />);

    await waitFor(() => expect(screen.getByText("a@b.com")).toBeInTheDocument());
    expect(screen.getByText("standard")).toBeInTheDocument();
    expect(screen.getByText("$12.50")).toBeInTheDocument();
  });

  it("shows an error message when the list request fails", async () => {
    vi.spyOn(apiClient, "adminListClients").mockRejectedValue(new apiClient.AlexisApiError(500, "Erreur serveur"));

    render(<AdminClientsPage />);

    await waitFor(() => expect(screen.getByText("Erreur serveur")).toBeInTheDocument());
  });
});

describe("AdminClientDetailPage", () => {
  it("renders client detail with per-project costs", async () => {
    vi.spyOn(apiClient, "adminGetClient").mockResolvedValue({
      id: "client-1", email: "a@b.com", github_username: null, plan_name: "standard",
      monthly_spend_usd: 12.5, wallet_balance_usd: 30,
      projects: [{ id: "p1", name: "kara", agent_choice: "claude", is_active: true, total_cost_usd: 3.2 }],
    });

    render(<AdminClientDetailPage />);

    await waitFor(() => expect(screen.getByText("a@b.com")).toBeInTheDocument());
    expect(screen.getByText("kara")).toBeInTheDocument();
    expect(screen.getByText("$3.20")).toBeInTheDocument();
  });
});
