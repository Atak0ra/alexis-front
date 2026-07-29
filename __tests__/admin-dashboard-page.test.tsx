import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminDashboardPage from "@/app/admin/dashboard/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/dashboard",
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(session, "getAdminApiKey").mockReturnValue("alx_admin_xxx");
  vi.spyOn(apiClient, "adminGetDashboardSummary").mockResolvedValue({ client_count: 4, project_count: 9 });
  vi.spyOn(apiClient, "adminGetSpendSeries").mockResolvedValue({
    granularity: "day",
    total_usd: 42.5,
    series: [
      { bucket: "2026-07-20", cost_usd: 10 },
      { bucket: "2026-07-21", cost_usd: 32.5 },
    ],
  });
  // Le KPI "Coût" est lu depuis adminGetKpis (total_cost_display), pas
  // adminGetSpendSeries.total_usd — endpoint séparé ajouté avec le cockpit.
  vi.spyOn(apiClient, "adminGetKpis").mockResolvedValue({
    total_cost_usd: 42.5,
    total_cost_display: 39.1,
    display_currency: "EUR",
    run_count: 12,
    success_rate: 0.9,
    failure_rate: 0.1,
    avg_cost_per_run_usd: 3.5,
    avg_duration_ms: 45000,
    mrr_eur: 500,
    margin_display: 460.9,
  });
  vi.spyOn(apiClient, "adminGetCostByModel").mockResolvedValue([]);
  vi.spyOn(apiClient, "adminGetCostByStep").mockResolvedValue([]);
  vi.spyOn(apiClient, "adminGetSuccessByStep").mockResolvedValue([]);
  vi.spyOn(apiClient, "adminGetTopClients").mockResolvedValue([]);
  vi.spyOn(apiClient, "adminGetRecentRuns").mockResolvedValue([]);
});

describe("AdminDashboardPage", () => {
  it("renders the 3 stat cards", async () => {
    render(<AdminDashboardPage />);

    await waitFor(() => expect(screen.getByText("4")).toBeInTheDocument());
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("39.10 EUR")).toBeInTheDocument();
  });

  it("defaults to the 30j preset and fetches a 29-day-wide range", async () => {
    render(<AdminDashboardPage />);

    await waitFor(() => expect(apiClient.adminGetSpendSeries).toHaveBeenCalled());
    const [, start, end] = (apiClient.adminGetSpendSeries as ReturnType<typeof vi.fn>).mock.calls[0];
    const days = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
    expect(days).toBe(29);
  });

  it("switches preset and refetches the spend series for the new range", async () => {
    render(<AdminDashboardPage />);
    await waitFor(() => expect(apiClient.adminGetSpendSeries).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "7j" }));

    await waitFor(() => expect(apiClient.adminGetSpendSeries).toHaveBeenCalledTimes(2));
    const [, start, end] = (apiClient.adminGetSpendSeries as ReturnType<typeof vi.fn>).mock.calls[1];
    const days = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
    expect(days).toBe(6);
  });

  it("shows custom date inputs when Personnalisé is selected, and refetches on change", async () => {
    render(<AdminDashboardPage />);
    await waitFor(() => expect(apiClient.adminGetSpendSeries).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /personnalisé/i }));
    const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/);
    fireEvent.change(dateInputs[0], { target: { value: "2026-01-01" } });

    await waitFor(() => {
      const calls = (apiClient.adminGetSpendSeries as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[calls.length - 1][1]).toBe("2026-01-01");
    });
  });
});
