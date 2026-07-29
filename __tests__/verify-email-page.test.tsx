import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import VerifyEmailPage from "@/app/verify-email/page";
import * as apiClient from "@/lib/api-client";
import { AlexisApiError } from "@/lib/api-client";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}));

beforeEach(() => {
  vi.restoreAllMocks();
  mockSearchParams = new URLSearchParams();
});

describe("VerifyEmailPage", () => {
  it("shows a success state and a dashboard link when the token is valid", async () => {
    mockSearchParams = new URLSearchParams({ token: "valid-token" });
    vi.spyOn(apiClient, "verifyEmail").mockResolvedValue({
      id: "client-1", email: "a@b.com", email_verified: true,
      github_username: null, forced_agent_choice: null, plan: null,
    });

    render(<VerifyEmailPage />);

    await waitFor(() => expect(screen.getByText("Email vérifié")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /tableau de bord/i })).toHaveAttribute("href", "/dashboard");
  });

  it("shows an error state when the token is rejected by the API", async () => {
    mockSearchParams = new URLSearchParams({ token: "bad-token" });
    vi.spyOn(apiClient, "verifyEmail").mockRejectedValue(
      new AlexisApiError(400, "Token de vérification invalide")
    );

    render(<VerifyEmailPage />);

    await waitFor(() => expect(screen.getByText("Lien invalide")).toBeInTheDocument());
    expect(screen.getByText("Token de vérification invalide")).toBeInTheDocument();
  });

  it("shows an error state immediately when no token is in the URL", async () => {
    render(<VerifyEmailPage />);

    await waitFor(() => expect(screen.getByText("Lien invalide")).toBeInTheDocument());
  });
});
