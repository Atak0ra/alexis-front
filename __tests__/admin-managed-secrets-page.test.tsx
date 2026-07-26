import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminManagedSecretsPage from "@/app/admin/managed-secrets/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/managed-secrets",
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(session, "getAdminApiKey").mockReturnValue("alx_admin_xxx");
  vi.spyOn(apiClient, "adminListManagedSecrets").mockResolvedValue([
    { key: "anthropic", has_value: true, updated_at: "2026-07-26T00:00:00Z" },
    { key: "groq", has_value: false, updated_at: "2026-07-26T00:00:00Z" },
  ]);
});

describe("AdminManagedSecretsPage", () => {
  it("renders presence status for both managed keys, never the plaintext value", async () => {
    render(<AdminManagedSecretsPage />);

    await waitFor(() => expect(screen.getByText(/anthropic/i)).toBeInTheDocument());
    expect(screen.getByText("Clé configurée")).toBeInTheDocument();
    expect(screen.getByText("Aucune clé configurée")).toBeInTheDocument();
  });

  it("submits a new value for a managed key", async () => {
    const updateSpy = vi.spyOn(apiClient, "adminUpdateManagedSecret").mockResolvedValue({
      key: "groq", has_value: true, updated_at: "2026-07-26T01:00:00Z",
    });

    render(<AdminManagedSecretsPage />);
    await waitFor(() => expect(screen.getByText(/groq/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /configurer/i }));
    fireEvent.change(screen.getByPlaceholderText(/nouvelle valeur/i), { target: { value: "gsk_new_xxx" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith("alx_admin_xxx", "groq", "gsk_new_xxx"));
  });

  it("clears a managed key by submitting an empty value", async () => {
    const updateSpy = vi.spyOn(apiClient, "adminUpdateManagedSecret").mockResolvedValue({
      key: "anthropic", has_value: false, updated_at: "2026-07-26T01:00:00Z",
    });

    render(<AdminManagedSecretsPage />);
    await waitFor(() => expect(screen.getByText(/anthropic/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /remplacer/i }));
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith("alx_admin_xxx", "anthropic", null));
  });
});
