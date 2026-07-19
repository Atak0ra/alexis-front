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

  it("navigates to /projects/new/team on Suivant click after validation", async () => {
    vi.spyOn(apiClient, "validateForge").mockResolvedValue({ valid: true, account: "octocat" });

    renderRepoPage();
    fireEvent.change(screen.getByLabelText("Nom du projet"), { target: { value: "kara" } });
    fireEvent.change(screen.getByLabelText("URL du dépôt"), { target: { value: "https://github.com/acme/kara" } });
    fireEvent.change(screen.getByPlaceholderText(/ghp_/), { target: { value: "ghp_xxx" } });
    fireEvent.click(screen.getByRole("button", { name: "Tester" }));
    await screen.findByText(/Connecté ✓/);

    fireEvent.click(screen.getByRole("button", { name: /suivant/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/projects/new/team"));
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
