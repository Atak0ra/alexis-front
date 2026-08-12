import { describe, it, expect, vi, beforeEach } from "vitest";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("validateForge", () => {
  it("sends the correct payload with Bearer auth", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ valid: true, account: "octocat" }), { status: 200 })
    );
    vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");

    const result = await apiClient.validateForge("alx_xxx", {
      forge_provider: "github",
      forge_token: "ghp_xxx",
      repo_url: "https://github.com/acme/proj-demo",
    });

    expect(result).toEqual({ valid: true, account: "octocat" });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/forge/validate"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer alx_xxx" }),
      })
    );
  });

  it("throws AlexisApiError on 400", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "Token GitHub invalide ou expiré." }), { status: 400 })
    );

    await expect(
      apiClient.validateForge("alx_xxx", { forge_provider: "github", forge_token: "bad" })
    ).rejects.toBeInstanceOf(apiClient.AlexisApiError);
  });

  it("returns demo result in local mode without calling fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.stubEnv("NEXT_PUBLIC_IS_LOCAL", "true");

    const result = await apiClient.validateForge("demo-api-key", {
      forge_provider: "github",
      forge_token: "any",
    });

    expect(result).toEqual({ valid: true, account: "demo-user" });
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.unstubAllEnvs();
  });
});
