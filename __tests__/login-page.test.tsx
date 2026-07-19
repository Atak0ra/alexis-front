import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/login/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

const pushMock = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}));

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  mockSearchParams = new URLSearchParams();
});

describe("LoginPage", () => {
  it("logs in and redirects to /dashboard", async () => {
    vi.spyOn(apiClient, "login").mockResolvedValue({ id: "abc", api_key: "alx_xxx" });
    const setApiKeySpy = vi.spyOn(session, "setApiKey").mockImplementation(() => {});

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Adresse email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(setApiKeySpy).toHaveBeenCalledWith("alx_xxx");
  });

  it("signs up and redirects to /dashboard", async () => {
    vi.spyOn(apiClient, "signup").mockResolvedValue({ id: "abc", api_key: "alx_yyy" });
    vi.spyOn(session, "setApiKey").mockImplementation(() => {});

    render(<LoginPage />);
    fireEvent.click(screen.getByText("Créer un compte"));
    fireEvent.change(screen.getByLabelText("Adresse email"), { target: { value: "new@b.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer le compte" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("displays the backend error detail on failure", async () => {
    vi.spyOn(apiClient, "login").mockRejectedValue(new apiClient.AlexisApiError(401, "Invalid credentials"));

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Adresse email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });

  it("starts in signup mode when the URL has mode=signup", () => {
    mockSearchParams = new URLSearchParams("mode=signup");

    render(<LoginPage />);

    expect(screen.getByRole("heading", { name: "Créer un compte" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer le compte" })).toBeInTheDocument();
  });
});
