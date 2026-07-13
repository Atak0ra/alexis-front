import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TeamPage from "@/app/onboarding/team/page";
import { OnboardingProvider } from "@/lib/onboarding-context";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
});

function renderTeamPage() {
  return render(
    <OnboardingProvider>
      <TeamPage />
    </OnboardingProvider>
  );
}

describe("TeamPage", () => {
  it("fetches teams then always defaults to 'create new', requiring explicit selection of an existing team", async () => {
    vi.spyOn(apiClient, "listLinearTeams").mockResolvedValue([{ id: "team-1", name: "Engineering", key: "ENG" }]);

    renderTeamPage();
    fireEvent.change(screen.getByLabelText("Clé API Linear"), { target: { value: "lin_api_xxx" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    expect(await screen.findByText("Engineering")).toBeInTheDocument();
    const createRadio = screen.getByRole("radio", { name: "Créer une nouvelle équipe" }) as HTMLInputElement;
    expect(createRadio.checked).toBe(true);
  });

  it("confirms an explicitly chosen existing team and advances to /onboarding/project", async () => {
    vi.spyOn(apiClient, "listLinearTeams").mockResolvedValue([{ id: "team-1", name: "Engineering", key: "ENG" }]);

    renderTeamPage();
    fireEvent.change(screen.getByLabelText("Clé API Linear"), { target: { value: "lin_api_xxx" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    await screen.findByText("Engineering");

    fireEvent.click(screen.getByRole("radio", { name: "Engineering" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/onboarding/project"));
  });

  it("creates a new team with the default name and advances", async () => {
    vi.spyOn(apiClient, "listLinearTeams").mockResolvedValue([]);
    const createSpy = vi
      .spyOn(apiClient, "createLinearTeam")
      .mockResolvedValue({ id: "team-new", name: "Alexis-Engineering", key: "ALE" });

    renderTeamPage();
    fireEvent.change(screen.getByLabelText("Clé API Linear"), { target: { value: "lin_api_xxx" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    await screen.findByRole("radio", { name: "Créer une nouvelle équipe" });

    expect(screen.getByLabelText("Nom de l'équipe")).toHaveValue("Alexis-Engineering");
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith("alx_xxx", "lin_api_xxx", "Alexis-Engineering"));
    expect(pushMock).toHaveBeenCalledWith("/onboarding/project");
  });
});
