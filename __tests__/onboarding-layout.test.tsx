import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import OnboardingLayout from "@/app/onboarding/layout";
import * as session from "@/lib/session";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  replaceMock.mockClear();
});

describe("OnboardingLayout", () => {
  it("redirects to /login when no api key is stored", async () => {
    vi.spyOn(session, "getApiKey").mockReturnValue(null);

    render(
      <OnboardingLayout>
        <div>child</div>
      </OnboardingLayout>
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("child")).not.toBeInTheDocument();
  });

  it("renders children when an api key is present", async () => {
    vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");

    render(
      <OnboardingLayout>
        <div>child</div>
      </OnboardingLayout>
    );

    expect(await screen.findByText("child")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
