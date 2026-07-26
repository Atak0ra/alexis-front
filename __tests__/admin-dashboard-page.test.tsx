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
});

describe("AdminDashboardPage", () => {
  it("renders the 3 stat cards", async () => {
    render(<AdminDashboardPage />);

    await waitFor(() => expect(screen.getByText("4")).toBeInTheDocument());
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("$42.50")).toBeInTheDocument();
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
