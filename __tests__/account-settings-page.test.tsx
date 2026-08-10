import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AccountSettingsPage from "@/app/dashboard/account/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

const FAKE_PROFILE: apiClient.ClientProfile = {
  id: "client-1",
  email: "a@b.com",
  email_verified: true,
  github_username: null,
  forced_agent_choice: null,
  plan: null,
  role: "owner",
  first_name: null,
  last_name: null,
};

const FAKE_MEMBERS: apiClient.MembersListOut = {
  members: [
    {
      id: "client-1",
      email: "a@b.com",
      first_name: null,
      last_name: null,
      role: "owner",
      created_at: new Date().toISOString(),
    },
  ],
  used: 1,
  limit: 1,
};

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
  // La page appelle listMembers pour la section Équipe — on le mock par défaut
  vi.spyOn(apiClient, "listMembers").mockResolvedValue(FAKE_MEMBERS);
});

describe("AccountSettingsPage", () => {
  it("shows the client's email", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValue(FAKE_PROFILE);

    render(<AccountSettingsPage />);

    await waitFor(() => expect(screen.getByTestId("account-email")).toHaveTextContent("a@b.com"));
  });

  it("keeps the delete button disabled until the email is typed exactly", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValue(FAKE_PROFILE);

    render(<AccountSettingsPage />);
    await waitFor(() => expect(screen.getByTestId("account-email")).toHaveTextContent("a@b.com"));

    const button = screen.getByRole("button", { name: /supprimer définitivement mon compte/i });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("a@b.com"), { target: { value: "wrong@email.com" } });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("a@b.com"), { target: { value: "a@b.com" } });
    expect(button).not.toBeDisabled();
  });

  it("deletes the account, clears the session, and redirects home on confirm", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValue(FAKE_PROFILE);
    const deleteSpy = vi.spyOn(apiClient, "deleteAccount").mockResolvedValue(undefined);
    const clearSpy = vi.spyOn(session, "clearApiKey").mockImplementation(() => {});

    render(<AccountSettingsPage />);
    await waitFor(() => expect(screen.getByTestId("account-email")).toHaveTextContent("a@b.com"));

    fireEvent.change(screen.getByPlaceholderText("a@b.com"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /supprimer définitivement mon compte/i }));

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith("alx_xxx"));
    expect(clearSpy).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("shows an error message and does not clear the session on API failure", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValue(FAKE_PROFILE);
    vi.spyOn(apiClient, "deleteAccount").mockRejectedValue(
      new apiClient.AlexisApiError(500, "Erreur serveur")
    );
    const clearSpy = vi.spyOn(session, "clearApiKey").mockImplementation(() => {});

    render(<AccountSettingsPage />);
    await waitFor(() => expect(screen.getByTestId("account-email")).toHaveTextContent("a@b.com"));

    fireEvent.change(screen.getByPlaceholderText("a@b.com"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /supprimer définitivement mon compte/i }));

    await waitFor(() => expect(screen.getByText("Erreur serveur")).toBeInTheDocument());
    expect(clearSpy).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
