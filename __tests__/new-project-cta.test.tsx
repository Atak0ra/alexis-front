import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NewProjectCTA from "@/components/new-project-cta";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
});

describe("NewProjectCTA", () => {
  it("renders as a plain link to href when the account is verified", () => {
    render(
      <NewProjectCTA emailVerified href="/projects/new/choice">
        Nouveau projet
      </NewProjectCTA>
    );

    const link = screen.getByRole("link", { name: "Nouveau projet" });
    expect(link).toHaveAttribute("href", "/projects/new/choice");
  });

  it("shows the reminder modal instead of navigating when the account isn't verified", () => {
    render(
      <NewProjectCTA emailVerified={false} href="/projects/new/choice">
        Nouveau projet
      </NewProjectCTA>
    );

    expect(screen.queryByRole("link", { name: "Nouveau projet" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nouveau projet" }));

    expect(screen.getByText("Compte pas encore activé")).toBeInTheDocument();
  });

  it("resends the verification email from the modal", async () => {
    const resendSpy = vi.spyOn(apiClient, "resendVerification").mockResolvedValue(undefined);

    render(
      <NewProjectCTA emailVerified={false} href="/projects/new/choice">
        Nouveau projet
      </NewProjectCTA>
    );
    fireEvent.click(screen.getByRole("button", { name: "Nouveau projet" }));
    fireEvent.click(screen.getByRole("button", { name: "Renvoyer l'email" }));

    await waitFor(() => expect(resendSpy).toHaveBeenCalledWith("alx_xxx"));
    expect(await screen.findByText(/email renvoyé/i)).toBeInTheDocument();
  });

  it("closes the modal without navigating", () => {
    render(
      <NewProjectCTA emailVerified={false} href="/projects/new/choice">
        Nouveau projet
      </NewProjectCTA>
    );
    fireEvent.click(screen.getByRole("button", { name: "Nouveau projet" }));
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));

    expect(screen.queryByText("Compte pas encore activé")).not.toBeInTheDocument();
  });
});
