import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sendIssueChat,
  getIssueChatStatus,
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

describe("sendIssueChat", () => {
  it("posts message and returns in_progress status", async () => {
    mockFetchOnce(202, { status: "in_progress" });
    const result = await sendIssueChat("alx_key", "proj-1", "issue-1", "Ma question");
    expect(result.status).toBe("in_progress");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/projects/proj-1/issues/issue-1/chat"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("sends the message in the request body", async () => {
    mockFetchOnce(202, { status: "in_progress" });
    await sendIssueChat("alx_key", "proj-1", "issue-1", "Quelle pagination ?");
    const callBody = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
    );
    expect(callBody.message).toBe("Quelle pagination ?");
  });

  it("throws AlexisApiError when issue not in review (409)", async () => {
    mockFetchOnce(409, { detail: "Le ticket n'est pas en état de review" });
    try {
      await sendIssueChat("alx_key", "proj-1", "issue-1", "Un message");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AlexisApiError);
      expect((err as AlexisApiError).status).toBe(409);
    }
  });

  it("throws AlexisApiError when another chat is in progress (409)", async () => {
    mockFetchOnce(409, { detail: "Un message est déjà en cours" });
    try {
      await sendIssueChat("alx_key", "proj-1", "issue-1", "Second message");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AlexisApiError);
      expect((err as AlexisApiError).status).toBe(409);
    }
  });

  it("attaches Bearer token to request", async () => {
    mockFetchOnce(202, { status: "in_progress" });
    await sendIssueChat("alx_my_key", "proj-1", "issue-1", "test");
    const headers = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers;
    expect(headers.Authorization).toBe("Bearer alx_my_key");
  });
});

describe("getIssueChatStatus", () => {
  it("returns null status when no job exists", async () => {
    mockFetchOnce(200, { status: null });
    const result = await getIssueChatStatus("alx_key", "proj-1", "issue-1");
    expect(result.status).toBeNull();
  });

  it("returns done status when job completed", async () => {
    mockFetchOnce(200, { status: "done" });
    const result = await getIssueChatStatus("alx_key", "proj-1", "issue-1");
    expect(result.status).toBe("done");
  });

  it("returns failed status with error message", async () => {
    mockFetchOnce(200, { status: "failed", error: "Plafond mensuel atteint." });
    const result = await getIssueChatStatus("alx_key", "proj-1", "issue-1");
    expect(result.status).toBe("failed");
    expect(result.error).toBe("Plafond mensuel atteint.");
  });

  it("calls the correct status endpoint", async () => {
    mockFetchOnce(200, { status: "in_progress" });
    await getIssueChatStatus("alx_key", "proj-1", "issue-1");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/projects/proj-1/issues/issue-1/chat/status"),
      expect.any(Object)
    );
  });
});
