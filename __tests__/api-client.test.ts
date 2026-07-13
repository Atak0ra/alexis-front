import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  signup,
  login,
  listLinearTeams,
  createLinearTeam,
  createProject,
  listDemoModeProjects,
  AlexisApiError,
} from "@/lib/api-client";

function mockFetchOnce(status: number, body: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    statusText: "",
    json: async () => body,
  } as Response);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("signup", () => {
  it("posts email/password and returns parsed json", async () => {
    mockFetchOnce(201, { id: "abc", api_key: "alx_xxx" });
    const result = await signup("a@b.com", "password123");
    expect(result).toEqual({ id: "abc", api_key: "alx_xxx" });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/signup"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws AlexisApiError with parsed detail on failure", async () => {
    mockFetchOnce(409, { detail: "Email already registered" });
    try {
      await signup("a@b.com", "password123");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AlexisApiError);
      expect((err as AlexisApiError).status).toBe(409);
      expect((err as AlexisApiError).detail).toBe("Email already registered");
    }
  });
});

describe("login", () => {
  it("posts credentials and returns parsed json", async () => {
    mockFetchOnce(200, { id: "abc", api_key: "alx_yyy" });
    const result = await login("a@b.com", "password123");
    expect(result.api_key).toBe("alx_yyy");
  });
});

describe("listLinearTeams", () => {
  it("sends Bearer header and linear_api_key body", async () => {
    mockFetchOnce(200, [{ id: "t1", name: "Engineering", key: "ENG" }]);
    const result = await listLinearTeams("alx_xxx", "lin_api_xxx");
    expect(result).toEqual([{ id: "t1", name: "Engineering", key: "ENG" }]);
    const [, options] = (global.fetch as any).mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer alx_xxx");
    expect(JSON.parse(options.body)).toEqual({ linear_api_key: "lin_api_xxx" });
  });
});

describe("createLinearTeam", () => {
  it("sends linear_api_key and name", async () => {
    mockFetchOnce(201, { id: "t2", name: "Alexis-Engineering", key: "ALE" });
    const result = await createLinearTeam("alx_xxx", "lin_api_xxx", "Alexis-Engineering");
    expect(result.id).toBe("t2");
    const [, options] = (global.fetch as any).mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ linear_api_key: "lin_api_xxx", name: "Alexis-Engineering" });
  });
});

describe("createProject", () => {
  it("posts the full payload with Bearer auth", async () => {
    mockFetchOnce(201, { id: "p1", name: "kara" });
    const payload = {
      name: "kara",
      repo_url: "git@github.com:acme/kara.git",
      agent_choice: "claude",
      agent_api_key: null,
      agent_base_url: null,
      linear_api_key: "lin_api_xxx",
      linear_team_id: "team-1",
      forge_provider: "github",
      forge_token: "ghp_xxx",
      states: { dev: "Dev" },
      trigger_states: ["Dev"],
      models: { dev: "claude-sonnet-4-5" },
    };
    const result = await createProject("alx_xxx", payload);
    expect(result.name).toBe("kara");
    const [, options] = (global.fetch as any).mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer alx_xxx");
    expect(JSON.parse(options.body)).toEqual(payload);
  });
});

describe("demo mode (NEXT_PUBLIC_IS_LOCAL=true)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_IS_LOCAL", "true");
    global.fetch = vi.fn();
  });

  it("login accepts demo/passer without calling fetch", async () => {
    const result = await login("demo", "passer");
    expect(result).toEqual({ id: "demo-client", api_key: "demo-api-key" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("login rejects any other credentials", async () => {
    await expect(login("demo", "wrong")).rejects.toThrow(AlexisApiError);
  });

  it("listLinearTeams returns fake teams without calling fetch", async () => {
    const teams = await listLinearTeams("demo-api-key", "lin_api_xxx");
    expect(teams.length).toBeGreaterThan(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("createProject returns a fake project and appends it to the demo project list", async () => {
    const before = await listDemoModeProjects();
    const result = await createProject("demo-api-key", {
      name: "new-demo-project",
      repo_url: "git@github.com:acme/new-demo-project.git",
      agent_choice: "claude",
      agent_api_key: null,
      agent_base_url: null,
      linear_api_key: "lin_api_xxx",
      linear_team_id: "team-demo-eng",
      forge_provider: "github",
      forge_token: "ghp_xxx",
      states: { dev: "Dev" },
      trigger_states: ["Dev"],
      models: { dev: "claude-sonnet-4-5" },
    });
    expect(result.name).toBe("new-demo-project");
    expect(global.fetch).not.toHaveBeenCalled();

    const after = await listDemoModeProjects();
    expect(after.length).toBe(before.length + 1);
    expect(after.some((p) => p.id === result.id)).toBe(true);
  });
});
