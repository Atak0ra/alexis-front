import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  adminLogin, adminListClients, adminGetClient,
  adminListPlans, adminCreatePlan, adminUpdatePlan, adminDeletePlan,
  adminListManagedSecrets, adminUpdateManagedSecret,
} from "@/lib/api-client";

function mockFetchOnce(body: unknown, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => body,
  });
}

describe("admin api-client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("adminLogin posts credentials without auth header", async () => {
    mockFetchOnce({ id: "admin-1", api_key: "alx_admin_xxx" });
    const result = await adminLogin("root@alexis.dev", "password123");
    expect(result.api_key).toBe("alx_admin_xxx");
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ email: "root@alexis.dev", password: "password123" });
  });

  it("adminListClients sends the admin bearer token", async () => {
    mockFetchOnce([{ id: "c1", email: "a@b.com", plan_name: "standard", project_count: 2, monthly_spend_usd: 12.5 }]);
    const result = await adminListClients("alx_admin_xxx");
    expect(result).toHaveLength(1);
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer alx_admin_xxx");
  });

  it("adminGetClient calls the client detail endpoint", async () => {
    mockFetchOnce({ id: "c1", email: "a@b.com", github_username: null, plan_name: "standard", monthly_spend_usd: 0, projects: [] });
    await adminGetClient("alx_admin_xxx", "c1");
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/admin/clients/c1");
  });

  it("adminListPlans, adminCreatePlan, adminUpdatePlan, adminDeletePlan hit the right endpoints and methods", async () => {
    mockFetchOnce([]);
    await adminListPlans("alx_admin_xxx");
    let [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/admin/plans");
    expect(options.method ?? "GET").toBe("GET");

    mockFetchOnce({ id: "p1", name: "enterprise", monthly_price_usd: 900, forced_agent_choice: null, spec_max_budget_usd: null, plan_max_budget_usd: null, dev_max_budget_usd: null, monthly_max_budget_usd: null });
    await adminCreatePlan("alx_admin_xxx", { name: "enterprise", monthly_price_usd: 900 });
    [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.method).toBe("POST");

    mockFetchOnce({ id: "p1", name: "enterprise", monthly_price_usd: 950, forced_agent_choice: null, spec_max_budget_usd: null, plan_max_budget_usd: null, dev_max_budget_usd: null, monthly_max_budget_usd: null });
    await adminUpdatePlan("alx_admin_xxx", "p1", { monthly_price_usd: 950 });
    [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/admin/plans/p1");
    expect(options.method).toBe("PATCH");

    mockFetchOnce({}, 204);
    await adminDeletePlan("alx_admin_xxx", "p1");
    [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/admin/plans/p1");
    expect(options.method).toBe("DELETE");
  });

  it("adminListManagedSecrets and adminUpdateManagedSecret hit the right endpoints", async () => {
    mockFetchOnce([{ key: "anthropic", has_value: true, updated_at: "2026-07-26T00:00:00Z" }]);
    await adminListManagedSecrets("alx_admin_xxx");
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/admin/managed-secrets");

    mockFetchOnce({ key: "anthropic", has_value: true, updated_at: "2026-07-26T00:00:00Z" });
    await adminUpdateManagedSecret("alx_admin_xxx", "anthropic", "sk-ant-new");
    const [updatedUrl, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(updatedUrl).toContain("/admin/managed-secrets/anthropic");
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({ value: "sk-ant-new" });
  });
});
