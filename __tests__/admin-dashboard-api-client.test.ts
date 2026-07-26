import { describe, it, expect, vi, beforeEach } from "vitest";
import { adminGetDashboardSummary, adminGetSpendSeries } from "@/lib/api-client";

function mockFetchOnce(body: unknown) {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
}

describe("admin dashboard api-client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("adminGetDashboardSummary calls the summary endpoint with the admin bearer token", async () => {
    mockFetchOnce({ client_count: 3, project_count: 7 });
    const result = await adminGetDashboardSummary("alx_admin_xxx");
    expect(result).toEqual({ client_count: 3, project_count: 7 });
    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/admin/dashboard/summary");
    expect(options.headers.Authorization).toBe("Bearer alx_admin_xxx");
  });

  it("adminGetSpendSeries passes start/end as query params", async () => {
    mockFetchOnce({ granularity: "day", total_usd: 10, series: [] });
    await adminGetSpendSeries("alx_admin_xxx", "2026-07-01", "2026-07-07");
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/admin/dashboard/spend?start=2026-07-01&end=2026-07-07");
  });
});
