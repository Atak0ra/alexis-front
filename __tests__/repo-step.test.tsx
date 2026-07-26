import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RepoPage from "@/app/projects/new/repo/page";
import { NewProjectProvider } from "@/lib/new-project-context";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => "/projects/new/repo",
}));

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
});

function renderRepoPage() {
  return render(
    <NewProjectProvider>
      <RepoPage />
    </NewProjectProvider>
  );
}

describe("RepoPage (step 1)", () => {
  it("renders the page heading and form fields", () => {
    renderRepoPage();
    expect(screen.getByRole("heading", { name: /dépôt/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Nom du projet")).toBeInTheDocument();
    expect(screen.getByLabelText("URL du dépôt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tester" })).toBeInTheDocument();
  });

  it("Suivant button is disabled before validation", () => {
    renderRepoPage();
    const suivant = screen.getByRole("button", { name: /suivant/i });
    expect(suivant).toBeDisabled();
  });

  it("shows success badge after successful forge validation", async () => {
    vi.spyOn(apiClient, "validateForge").mockResolvedValue({ valid: true, account: "octocat" });

    renderRepoPage();
    fireEvent.change(screen.getByLabelText("Nom du projet"), { target: { value: "kara" } });
    fireEvent.change(screen.getByLabelText("URL du dépôt"), { target: { value: "https://github.com/acme/kara" } });
    fireEvent.change(screen.getByPlaceholderText(/ghp_/), { target: { value: "ghp_xxx" } });
    fireEvent.click(screen.getByRole("button", { name: "Tester" }));

    await waitFor(() =>
      expect(screen.getByText(/Connecté ✓/)).toBeInTheDocument()
    );
    expect(screen.getByText(/octocat/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /suivant/i })).not.toBeDisabled();
  });

  it("shows error message on failed forge validation", async () => {
    vi.spyOn(apiClient, "validateForge").mockRejectedValue(
      new apiClient.AlexisApiError(400, "Token GitHub invalide ou expiré.")
    );

    renderRepoPage();
    fireEvent.change(screen.getByPlaceholderText(/ghp_/), { target: { value: "bad-token" } });
    fireEvent.click(screen.getByRole("button", { name: "Tester" }));

    await waitFor(() =>
      expect(screen.getByText("Token GitHub invalide ou expiré.")).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /suivant/i })).toBeDisabled();
  });

  it("navigates to /projects/new/agent on Suivant click after validation", async () => {
    vi.spyOn(apiClient, "validateForge").mockResolvedValue({ valid: true, account: "octocat" });

    renderRepoPage();
    fireEvent.change(screen.getByLabelText("Nom du projet"), { target: { value: "kara" } });
    fireEvent.change(screen.getByLabelText("URL du dépôt"), { target: { value: "https://github.com/acme/kara" } });
    fireEvent.change(screen.getByPlaceholderText(/ghp_/), { target: { value: "ghp_xxx" } });
    fireEvent.click(screen.getByRole("button", { name: "Tester" }));
    await screen.findByText(/Connecté ✓/);

    fireEvent.click(screen.getByRole("button", { name: /suivant/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/projects/new/agent"));
  });

  it("links back to the choice step to change the repo origin", () => {
    renderRepoPage();
    expect(screen.getByRole("link", { name: /modifier mon choix/i })).toHaveAttribute(
      "href",
      "/projects/new/choice"
    );
  });

  it("resets validation state when token changes", async () => {
    vi.spyOn(apiClient, "validateForge").mockResolvedValue({ valid: true, account: "octocat" });

    renderRepoPage();
    fireEvent.change(screen.getByLabelText("Nom du projet"), { target: { value: "kara" } });
    fireEvent.change(screen.getByLabelText("URL du dépôt"), { target: { value: "https://github.com/acme/kara" } });
    fireEvent.change(screen.getByPlaceholderText(/ghp_/), { target: { value: "ghp_xxx" } });
    fireEvent.click(screen.getByRole("button", { name: "Tester" }));
    await screen.findByText(/Connecté ✓/);

    // Change token → validation should reset
    fireEvent.change(screen.getByPlaceholderText(/ghp_/), { target: { value: "ghp_new" } });
    expect(screen.queryByText(/Connecté ✓/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /suivant/i })).toBeDisabled();
  });
});

describe("RepoPage — hosted (chosen on the previous step)", () => {
  async function renderHostedRepoPage() {
    const { NewProjectProvider: Provider, useNewProject } = await import("@/lib/new-project-context");

    function PreHostedRepoPage() {
      const ctx = useNewProject();
      if (!ctx.hosted) ctx.setHosted(true);
      return <RepoPage />;
    }

    return render(
      <Provider>
        <PreHostedRepoPage />
      </Provider>
    );
  }

  it("shows the GitHub username field instead of repo/forge fields, marked optional", async () => {
    await renderHostedRepoPage();

    expect(screen.queryByLabelText("URL du dépôt")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/token github/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Pseudo GitHub/)).toBeInTheDocument();

    const suivant = screen.getByRole("button", { name: /suivant/i });
    expect(suivant).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Nom du projet"), { target: { value: "kara" } });
    expect(suivant).not.toBeDisabled();
  });

  it("allows proceeding on a hosted project without ever filling a GitHub username", async () => {
    await renderHostedRepoPage();

    fireEvent.change(screen.getByLabelText("Nom du projet"), { target: { value: "kara" } });

    expect(screen.getByRole("button", { name: /suivant/i })).not.toBeDisabled();
    expect(screen.getByLabelText(/Pseudo GitHub/)).toHaveValue("");
  });

  it("navigates to /projects/new/agent when submitting the hosted flow", async () => {
    await renderHostedRepoPage();
    fireEvent.change(screen.getByLabelText("Nom du projet"), { target: { value: "kara" } });
    fireEvent.change(screen.getByLabelText(/Pseudo GitHub/), { target: { value: "octocat" } });

    fireEvent.click(screen.getByRole("button", { name: /suivant/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/projects/new/agent"));
  });

  it("pre-fills the GitHub username remembered from a previous hosted project", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValue({
      id: "client-1", email: "a@b.com", github_username: "deSully",
    });

    await renderHostedRepoPage();

    await waitFor(() =>
      expect(screen.getByLabelText(/Pseudo GitHub/)).toHaveValue("deSully")
    );
  });

  it("does not overwrite a username the user already typed", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValue({
      id: "client-1", email: "a@b.com", github_username: "deSully",
    });

    await renderHostedRepoPage();
    fireEvent.change(screen.getByLabelText(/Pseudo GitHub/), { target: { value: "octocat" } });

    // Laisser le temps à un éventuel pré-remplissage tardif de s'appliquer.
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByLabelText(/Pseudo GitHub/)).toHaveValue("octocat");
  });
});
