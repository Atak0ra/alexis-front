import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminPricingPage from "@/app/admin/pricing/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/pricing",
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(session, "getAdminApiKey").mockReturnValue("alx_admin_xxx");
  vi.spyOn(apiClient, "adminGetMargin").mockResolvedValue({ margin_multiplier: 3.0 });
});

describe("AdminPricingPage", () => {
  it("renders the margin setting", async () => {
    render(<AdminPricingPage />);
    await waitFor(() => expect(screen.getByLabelText(/multiplicateur/i)).toHaveValue(3));
  });

  it("updates the margin multiplier", async () => {
    const updateSpy = vi.spyOn(apiClient, "adminUpdateMargin").mockResolvedValue({ margin_multiplier: 4.0 });

    render(<AdminPricingPage />);
    await waitFor(() => expect(screen.getByLabelText(/multiplicateur/i)).toHaveValue(3));

    fireEvent.change(screen.getByLabelText(/multiplicateur/i), { target: { value: "4.0" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith("alx_admin_xxx", 4.0));
    await waitFor(() => expect(screen.getByLabelText(/multiplicateur/i)).toHaveValue(4));
  });
});
