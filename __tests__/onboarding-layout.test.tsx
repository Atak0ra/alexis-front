import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import NewProjectLayout from "@/app/projects/new/layout";
import * as session from "@/lib/session";
import * as apiClient from "@/lib/api-client";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => "/projects/new/repo",
}));

beforeEach(() => {
  vi.restoreAllMocks();
  replaceMock.mockClear();
});

describe("NewProjectLayout", () => {
  it("redirects to /login when no api key is stored", async () => {
    vi.spyOn(session, "getApiKey").mockReturnValue(null);

    render(
      <NewProjectLayout>
        <div>child</div>
      </NewProjectLayout>
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("child")).not.toBeInTheDocument();
  });

  it("renders children when an api key is present", async () => {
    vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");

    render(
      <NewProjectLayout>
        <div>child</div>
      </NewProjectLayout>
    );

    expect(await screen.findByText("child")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("renders the AppHeader (logo Alexis) when authenticated", async () => {
    vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");

    render(
      <NewProjectLayout>
        <div>child</div>
      </NewProjectLayout>
    );

    await screen.findByText("child");
    // AppHeader renders the "Alexis" wordmark
    expect(screen.getByText("Alexis")).toBeInTheDocument();
  });

  it("renders the vertical stepper rail on the left when authenticated", async () => {
    vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");

    render(
      <NewProjectLayout>
        <div>child</div>
      </NewProjectLayout>
    );

    await screen.findByText("child");
    // The stepper labels should be present (rendered in the aside rail)
    expect(screen.getAllByText("Dépôt").length).toBeGreaterThan(0);
  });

  it("blocks the wizard with a reminder modal when the account isn't email-verified", async () => {
    vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
    vi.spyOn(apiClient, "getMe").mockResolvedValue({
      id: "client-1", email: "a@b.com", email_verified: false,
      github_username: null, forced_agent_choice: null, plan: null,
    });

    render(
      <NewProjectLayout>
        <div>child</div>
      </NewProjectLayout>
    );

    // Défense en profondeur : navigation directe vers le wizard, pas de clic
    // sur un bouton gardé — le contenu du wizard ne doit jamais apparaître.
    expect(await screen.findByText("Compte pas encore activé")).toBeInTheDocument();
    expect(screen.queryByText("child")).not.toBeInTheDocument();
  });

  it("renders the wizard normally once the account is email-verified", async () => {
    vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
    vi.spyOn(apiClient, "getMe").mockResolvedValue({
      id: "client-1", email: "a@b.com", email_verified: true,
      github_username: null, forced_agent_choice: null, plan: null,
    });

    render(
      <NewProjectLayout>
        <div>child</div>
      </NewProjectLayout>
    );

    expect(await screen.findByText("child")).toBeInTheDocument();
    expect(screen.queryByText("Compte pas encore activé")).not.toBeInTheDocument();
  });
});
