import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminPlansPage from "@/app/admin/plans/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/plans",
}));

const SEEDED_PLAN: apiClient.PlanOut = {
  id: "plan-standard", name: "standard", monthly_price_usd: 150, forced_agent_choice: null,
  spec_max_budget_usd: 2, plan_max_budget_usd: 2, dev_max_budget_usd: 6, monthly_max_budget_usd: 75,
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(session, "getAdminApiKey").mockReturnValue("alx_admin_xxx");
  vi.spyOn(apiClient, "adminListPlans").mockResolvedValue([SEEDED_PLAN]);
});

describe("AdminPlansPage", () => {
  it("renders the plans table", async () => {
    render(<AdminPlansPage />);
    await waitFor(() => expect(screen.getByText("standard")).toBeInTheDocument());
    expect(screen.getByText("$150")).toBeInTheDocument();
    expect(screen.getByText("$75.00")).toBeInTheDocument();
  });

  it("creates a new plan from the form", async () => {
    const createSpy = vi.spyOn(apiClient, "adminCreatePlan").mockResolvedValue({
      ...SEEDED_PLAN, id: "plan-new", name: "enterprise", monthly_price_usd: 900,
    });

    render(<AdminPlansPage />);
    await waitFor(() => expect(screen.getByText("standard")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /nouveau plan/i }));
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "enterprise" } });
    fireEvent.change(screen.getByLabelText(/prix/i), { target: { value: "900" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() =>
      expect(createSpy).toHaveBeenCalledWith(
        "alx_admin_xxx",
        expect.objectContaining({ name: "enterprise", monthly_price_usd: 900 })
      )
    );
  });

  it("edits an existing plan and can clear a budget cap back to unlimited", async () => {
    const updateSpy = vi.spyOn(apiClient, "adminUpdatePlan").mockResolvedValue(SEEDED_PLAN);

    render(<AdminPlansPage />);
    await waitFor(() => expect(screen.getByText("standard")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /modifier/i }));
    const monthlyBudgetInput = screen.getByLabelText(/plafond mensuel/i);
    fireEvent.change(monthlyBudgetInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith(
        "alx_admin_xxx", "plan-standard",
        expect.objectContaining({ monthly_max_budget_usd: null })
      )
    );
  });

  it("deletes a plan", async () => {
    const deleteSpy = vi.spyOn(apiClient, "adminDeletePlan").mockResolvedValue(undefined);

    render(<AdminPlansPage />);
    await waitFor(() => expect(screen.getByText("standard")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /^supprimer$/i }));
    fireEvent.click(screen.getByRole("button", { name: /oui, supprimer/i }));

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith("alx_admin_xxx", "plan-standard"));
  });
});
