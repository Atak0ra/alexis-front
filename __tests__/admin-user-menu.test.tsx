import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminUserMenu } from "@/components/admin-user-menu";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  push.mockReset();
  vi.spyOn(session, "getAdminApiKey").mockReturnValue("alx_admin_xxx");
  vi.spyOn(session, "clearAdminApiKey").mockImplementation(() => {});
  vi.spyOn(apiClient, "adminGetMe").mockResolvedValue({ id: "admin-1", email: "root@alexis.dev" });
});

describe("AdminUserMenu", () => {
  it("loads and shows the admin email once the profile resolves", async () => {
    render(<AdminUserMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Menu admin" }));
    await waitFor(() => expect(screen.getAllByText("root@alexis.dev").length).toBeGreaterThan(0));
  });

  it("logs out through a confirmation modal, then clears the session and redirects", async () => {
    render(<AdminUserMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Menu admin" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /se déconnecter/i }));

    // Confirmation required — not logged out yet.
    expect(session.clearAdminApiKey).not.toHaveBeenCalled();

    const dialogLogoutButtons = screen.getAllByRole("button", { name: "Se déconnecter" });
    fireEvent.click(dialogLogoutButtons[dialogLogoutButtons.length - 1]);

    expect(session.clearAdminApiKey).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/admin/login");
  });

  it("closes the dropdown on Escape and returns focus to the trigger", () => {
    render(<AdminUserMenu />);
    const trigger = screen.getByRole("button", { name: "Menu admin" });
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
