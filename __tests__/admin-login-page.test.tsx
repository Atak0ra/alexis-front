import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminLoginPage from "@/app/admin/login/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => "/admin/login",
}));

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
});

describe("AdminLoginPage", () => {
  it("logs in and stores the admin key on success", async () => {
    vi.spyOn(apiClient, "adminLogin").mockResolvedValue({ id: "admin-1", api_key: "alx_admin_xxx" });
    const setAdminApiKeySpy = vi.spyOn(session, "setAdminApiKey");

    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "root@alexis.dev" } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/admin/dashboard"));
    expect(setAdminApiKeySpy).toHaveBeenCalledWith("alx_admin_xxx");
  });

  it("shows an error message on invalid credentials", async () => {
    vi.spyOn(apiClient, "adminLogin").mockRejectedValue(new apiClient.AlexisApiError(401, "Identifiants invalides"));

    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "root@alexis.dev" } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

    await waitFor(() => expect(screen.getByText("Identifiants invalides")).toBeInTheDocument());
    expect(pushMock).not.toHaveBeenCalled();
  });
});
