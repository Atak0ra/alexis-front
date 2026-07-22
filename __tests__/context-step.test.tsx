import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ContextPage from "@/app/projects/new/context/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

const pushMock = vi.fn();
const replaceMock = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => mockSearchParams,
}));

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  replaceMock.mockClear();
  mockSearchParams = new URLSearchParams();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
});

describe("ContextPage (/projects/new/context)", () => {
  it("renders ProjectContextStep for the projectId in the query string", async () => {
    mockSearchParams = new URLSearchParams({ projectId: "proj-42" });
    vi.spyOn(apiClient, "enqueueRepoSummary").mockResolvedValue({ job_id: "job-1" });
    vi.spyOn(apiClient, "getRepoSummaryStatus").mockResolvedValue({
      status: "done",
      result: { has_code: false, file_count: 0, languages: [] },
    });

    render(<ContextPage />);

    await waitFor(() =>
      expect(screen.getByText(/Décris ton nouveau projet/)).toBeInTheDocument()
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /dashboard when no projectId is present — surviving a refresh with a stale/empty URL", () => {
    render(<ContextPage />);
    expect(replaceMock).toHaveBeenCalledWith("/dashboard");
  });
});
