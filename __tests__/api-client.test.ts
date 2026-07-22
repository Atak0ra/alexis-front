import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  signup,
  login,
  createProject,
  listProjects,
  createIssue,
  updateIssue,
  deleteIssue,
  getProjectContext,
  createProjectContext,
  getProjectContextStatus,
  commitProjectContext,
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

describe("createProject", () => {
  it("posts the full payload with Bearer auth", async () => {
    mockFetchOnce(201, { id: "p1", name: "kara" });
    const payload = {
      name: "kara",
      repo_url: "git@github.com:acme/kara.git",
      agent_choice: "claude",
      agent_api_key: null,
      agent_base_url: null,
      forge_provider: "github" as const,
      forge_token: "ghp_xxx",
      issue_prefix: "KARA",
      states: { dev: "Dev" },
      trigger_states: ["Dev"],
      models: { dev: "claude-sonnet-4-5" },
    };
    const result = await createProject("alx_xxx", payload);
    expect(result.name).toBe("kara");
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer alx_xxx");
    expect(JSON.parse(options.body)).toEqual(payload);
  });
});

describe("createIssue", () => {
  it("posts to /projects/{id}/issues with Bearer auth", async () => {
    mockFetchOnce(201, {
      id: "issue-1",
      identifier: "KARA-1",
      number: 1,
      title: "Fix bug",
      description: "",
      state: "Backlog",
      labels: [],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      comments: [],
    });
    const result = await createIssue("alx_xxx", "p1", { title: "Fix bug" });
    expect(result.identifier).toBe("KARA-1");
    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/projects/p1/issues");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer alx_xxx");
    expect(JSON.parse(options.body)).toEqual({ title: "Fix bug" });
  });
});

describe("updateIssue", () => {
  it("patches state with Bearer auth", async () => {
    mockFetchOnce(200, {
      id: "issue-1",
      identifier: "KARA-1",
      number: 1,
      title: "Fix bug",
      description: "",
      state: "Todo",
      labels: [],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      comments: [],
    });
    const result = await updateIssue("alx_xxx", "p1", "issue-1", { state: "Todo" });
    expect(result.state).toBe("Todo");
    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/projects/p1/issues/issue-1");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toEqual({ state: "Todo" });
  });
});

describe("deleteIssue", () => {
  it("sends DELETE with Bearer auth", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      statusText: "",
      json: async () => ({}),
    } as Response);
    await deleteIssue("alx_xxx", "p1", "issue-1");
    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/projects/p1/issues/issue-1");
    expect(options.method).toBe("DELETE");
    expect(options.headers.Authorization).toBe("Bearer alx_xxx");
  });
});

describe("getProjectContext", () => {
  it("sends Bearer header and returns { exists }", async () => {
    mockFetchOnce(200, { exists: true });
    const result = await getProjectContext("alx_xxx", "p1");
    expect(result).toEqual({ exists: true });
    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/projects/p1/context");
    expect(options.headers.Authorization).toBe("Bearer alx_xxx");
  });
});

describe("createProjectContext", () => {
  it("posts brief with Bearer auth and accepts 202", async () => {
    mockFetchOnce(202, {});
    await createProjectContext("alx_xxx", "p1", "API FastAPI + Next.js");
    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/projects/p1/context");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer alx_xxx");
    expect(JSON.parse(options.body)).toEqual({ brief: "API FastAPI + Next.js" });
  });
});

describe("getProjectContextStatus", () => {
  it("sends Bearer header and returns status", async () => {
    mockFetchOnce(200, { status: "done" });
    const result = await getProjectContextStatus("alx_xxx", "p1");
    expect(result).toEqual({ status: "done" });
    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/projects/p1/context/status");
    expect(options.headers.Authorization).toBe("Bearer alx_xxx");
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

  it("createProject returns a fake project without calling fetch", async () => {
    const before = await listProjects("demo-api-key");
    const result = await createProject("demo-api-key", {
      name: "new-demo-project",
      repo_url: "git@github.com:acme/new-demo-project.git",
      agent_choice: "claude",
      agent_api_key: null,
      agent_base_url: null,
      forge_provider: "github",
      forge_token: "ghp_xxx",
      issue_prefix: "NEW",
      states: { dev: "Dev" },
      trigger_states: ["Dev"],
      models: { dev: "claude-sonnet-4-5" },
    });
    expect(result.name).toBe("new-demo-project");
    expect(global.fetch).not.toHaveBeenCalled();

    const after = await listProjects("demo-api-key");
    expect(after.length).toBe(before.length + 1);
    expect(after.some((p) => p.id === result.id)).toBe(true);
  });

  it("createIssue returns a fake issue without calling fetch", async () => {
    const result = await createIssue("demo-api-key", "demo-project-1", {
      title: "Test issue",
      description: "Test description",
    });
    expect(result.title).toBe("Test issue");
    expect(result.state).toBe("Backlog");
    expect(result.identifier).toMatch(/^KARA-\d+$/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("updateIssue updates state in demo mode without calling fetch", async () => {
    const created = await createIssue("demo-api-key", "demo-project-1", {
      title: "Issue to update",
    });
    const updated = await updateIssue("demo-api-key", "demo-project-1", created.id, {
      state: "Todo",
    });
    expect(updated.state).toBe("Todo");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("context generation reaches draft_ready (not done) so the review phase is reachable", async () => {
    vi.useFakeTimers();
    try {
      await createProjectContext("demo-api-key", "demo-project-new-ctx", "brief");
      expect((await getProjectContextStatus("demo-api-key", "demo-project-new-ctx")).status).toBe("in_progress");

      await vi.advanceTimersByTimeAsync(2500);

      expect((await getProjectContextStatus("demo-api-key", "demo-project-new-ctx")).status).toBe("draft_ready");
    } finally {
      vi.useRealTimers();
    }
  });

  it("commitProjectContext moves demo status from draft_ready to done", async () => {
    vi.useFakeTimers();
    try {
      await createProjectContext("demo-api-key", "demo-project-commit-ctx", "brief");
      await vi.advanceTimersByTimeAsync(2500);
      expect((await getProjectContextStatus("demo-api-key", "demo-project-commit-ctx")).status).toBe("draft_ready");

      await commitProjectContext("demo-api-key", "demo-project-commit-ctx", "final content");

      expect((await getProjectContextStatus("demo-api-key", "demo-project-commit-ctx")).status).toBe("done");
    } finally {
      vi.useRealTimers();
    }
  });
});
