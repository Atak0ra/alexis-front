import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProjectPage from "@/app/onboarding/project/page";
import { OnboardingProvider, useOnboarding } from "@/lib/onboarding-context";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";
import { DEFAULT_STATES, DEFAULT_TRIGGER_STATES, DEFAULT_MODELS } from "@/lib/project-defaults";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

function Seed({ linearApiKey, linearTeamId }: { linearApiKey: string; linearTeamId: string }) {
  const { setLinearApiKey, setLinearTeamId } = useOnboarding();
  useEffect(() => {
    setLinearApiKey(linearApiKey);
    setLinearTeamId(linearTeamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function renderProjectPage() {
  return render(
    <OnboardingProvider>
      <Seed linearApiKey="lin_api_xxx" linearTeamId="team-1" />
      <ProjectPage />
    </OnboardingProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
});

describe("ProjectPage", () => {
  it("submits the full payload including linear_team_id from context and the fixed state constants", async () => {
    const createSpy = vi.spyOn(apiClient, "createProject").mockResolvedValue({
      id: "p1",
      name: "kara",
      repo_url: "git@github.com:acme/kara.git",
      agent_choice: "claude",
      agent_base_url: null,
      linear_team_id: "team-1",
      forge_provider: "github",
      states: DEFAULT_STATES,
      trigger_states: DEFAULT_TRIGGER_STATES,
      models: DEFAULT_MODELS,
      run_timeout_seconds: 1800,
      is_active: true,
      created_at: "2026-07-13T00:00:00Z",
    });

    renderProjectPage();
    fireEvent.change(screen.getByLabelText("Nom du projet"), { target: { value: "kara" } });
    fireEvent.change(screen.getByLabelText("URL du repo"), { target: { value: "git@github.com:acme/kara.git" } });
    fireEvent.change(screen.getByLabelText("Token forge"), { target: { value: "ghp_xxx" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer le projet" }));

    await waitFor(() =>
      expect(createSpy).toHaveBeenCalledWith("alx_xxx", {
        name: "kara",
        repo_url: "git@github.com:acme/kara.git",
        agent_choice: "claude",
        agent_api_key: null,
        agent_base_url: null,
        linear_api_key: "lin_api_xxx",
        linear_team_id: "team-1",
        forge_provider: "github",
        forge_token: "ghp_xxx",
        states: DEFAULT_STATES,
        trigger_states: DEFAULT_TRIGGER_STATES,
        models: DEFAULT_MODELS,
      })
    );
    expect(await screen.findByText("kara (p1)")).toBeInTheDocument();
  });

  it("redirects back to the team step when linear context is missing", async () => {
    render(
      <OnboardingProvider>
        <ProjectPage />
      </OnboardingProvider>
    );

    fireEvent.change(screen.getByLabelText("Nom du projet"), { target: { value: "kara" } });
    fireEvent.change(screen.getByLabelText("URL du repo"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("Token forge"), { target: { value: "ghp_xxx" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer le projet" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/onboarding/team"));
  });
});
