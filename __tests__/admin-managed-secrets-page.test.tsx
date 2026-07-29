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
    { key: "anthropic", agent: "claude", env_var: "ALEXIS_MANAGED_ANTHROPIC_API_KEY", has_value: true, is_active: true, updated_at: "2026-07-26T00:00:00Z" },
    { key: "groq", agent: "aider", env_var: "ALEXIS_MANAGED_GROQ_API_KEY", has_value: false, is_active: false, updated_at: "2026-07-26T00:00:00Z" },
  ]);
});

describe("AdminManagedSecretsPage", () => {
  it("renders presence status for both managed keys, never the plaintext value", async () => {
    render(<AdminManagedSecretsPage />);

    await waitFor(() => expect(screen.getByText("Anthropic")).toBeInTheDocument());
    // has_value:true → "Remplacer" + horodatage ; jamais la valeur en clair.
    expect(screen.getByRole("button", { name: /remplacer/i })).toBeInTheDocument();
    expect(screen.getByText(/mise à jour le/i)).toBeInTheDocument();
    expect(screen.queryByText(/gsk_|sk-ant-/)).not.toBeInTheDocument();

    // has_value:false → "Configurer", pas d'horodatage.
    expect(screen.getByRole("button", { name: /configurer/i })).toBeInTheDocument();
  });

  it("submits a new value for a managed key", async () => {
    const updateSpy = vi.spyOn(apiClient, "adminUpdateManagedSecret").mockResolvedValue({
      key: "groq", agent: "aider", env_var: "ALEXIS_MANAGED_GROQ_API_KEY", has_value: true, is_active: true, updated_at: "2026-07-26T01:00:00Z",
    });

    render(<AdminManagedSecretsPage />);
    await waitFor(() => expect(screen.getByText("Groq")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /configurer/i }));
    fireEvent.change(screen.getByPlaceholderText(/nouvelle clé api/i), { target: { value: "gsk_new_xxx" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith("alx_admin_xxx", "groq", "gsk_new_xxx"));
  });

  it("clears a managed key by submitting an empty value", async () => {
    const updateSpy = vi.spyOn(apiClient, "adminUpdateManagedSecret").mockResolvedValue({
      key: "anthropic", agent: "claude", env_var: "ALEXIS_MANAGED_ANTHROPIC_API_KEY", has_value: false, is_active: false, updated_at: "2026-07-26T01:00:00Z",
    });

    render(<AdminManagedSecretsPage />);
    await waitFor(() => expect(screen.getByText("Anthropic")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /remplacer/i }));
    fireEvent.click(screen.getByRole("button", { name: /supprimer la clé existante/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith("alx_admin_xxx", "anthropic", null));
  });
});
