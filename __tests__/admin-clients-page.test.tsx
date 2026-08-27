import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminClientsPage from "@/app/admin/clients/page";
import AdminClientDetailPage from "@/app/admin/clients/[id]/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/clients",
  useParams: () => ({ id: "client-1" }),
}));

const SEEDED_PLAN: apiClient.PlanOut = {
  id: "plan-1", name: "standard", display_name: null, description: null, features: null,
  monthly_price_usd: 0, forced_agent_choice: null, free_monthly_credit_usd: 0,
  overdraft_limit_usd: 0, requires_own_key: false, max_members: 1, is_public: true, sort_order: 0,
};

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

  it("creates a client from the form and shows the email-sent confirmation", async () => {
    vi.spyOn(apiClient, "adminListClients").mockResolvedValue([]);
    vi.spyOn(apiClient, "adminListPlans").mockResolvedValue([SEEDED_PLAN]);
    const createSpy = vi.spyOn(apiClient, "adminCreateClient").mockResolvedValue({
      id: "client-new", email: "tester@b.com", plan_name: "standard", temp_password: null,
    });

    render(<AdminClientsPage />);
    await waitFor(() => expect(screen.getByText(/aucun client/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /créer un client/i }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "tester@b.com" } });
    fireEvent.change(screen.getByLabelText("Plan"), { target: { value: "plan-1" } });
    fireEvent.click(screen.getByRole("button", { name: /^créer$/i }));

    await waitFor(() =>
      expect(createSpy).toHaveBeenCalledWith("alx_admin_xxx", { email: "tester@b.com", plan_id: "plan-1" })
    );
    expect(await screen.findByText(/email avec un mot de passe temporaire a été envoyé/i)).toBeInTheDocument();
  });

  it("shows the temporary password when the email could not be sent", async () => {
    vi.spyOn(apiClient, "adminListClients").mockResolvedValue([]);
    vi.spyOn(apiClient, "adminListPlans").mockResolvedValue([SEEDED_PLAN]);
    vi.spyOn(apiClient, "adminCreateClient").mockResolvedValue({
      id: "client-new", email: "tester@b.com", plan_name: null, temp_password: "Fallback-123",
    });

    render(<AdminClientsPage />);
    await waitFor(() => expect(screen.getByText(/aucun client/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /créer un client/i }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "tester@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^créer$/i }));

    expect(await screen.findByText("Fallback-123")).toBeInTheDocument();
  });

  it("shows a conflict error in the form without closing it", async () => {
    vi.spyOn(apiClient, "adminListClients").mockResolvedValue([]);
    vi.spyOn(apiClient, "adminListPlans").mockResolvedValue([SEEDED_PLAN]);
    vi.spyOn(apiClient, "adminCreateClient").mockRejectedValue(
      new apiClient.AlexisApiError(409, "Cette adresse email est déjà associée à un compte.")
    );

    render(<AdminClientsPage />);
    await waitFor(() => expect(screen.getByText(/aucun client/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /créer un client/i }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "dupe@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^créer$/i }));

    expect(await screen.findByText(/déjà associée à un compte/i)).toBeInTheDocument();
    // Le formulaire reste ouvert après une erreur
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});

describe("AdminClientDetailPage", () => {
  it("renders client detail with per-project costs", async () => {
    vi.spyOn(apiClient, "adminGetClient").mockResolvedValue({
      id: "client-1", email: "a@b.com", github_username: null, plan_name: "standard",
      monthly_spend_usd: 12.5, wallet_balance_usd: 30,
      projects: [{ id: "p1", name: "proj-demo", agent_choice: "claude", is_active: true, total_cost_usd: 3.2 }],
    });

    render(<AdminClientDetailPage />);

    await waitFor(() => expect(screen.getByText("a@b.com")).toBeInTheDocument());
    expect(screen.getByText("proj-demo")).toBeInTheDocument();
    expect(screen.getByText("$3.20")).toBeInTheDocument();
  });
});
