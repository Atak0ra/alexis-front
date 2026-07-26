import { describe, it, expect, beforeEach } from "vitest";
import { getAdminApiKey, setAdminApiKey, clearAdminApiKey } from "@/lib/session";

describe("admin session storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns null when no admin key is stored", () => {
    expect(getAdminApiKey()).toBeNull();
  });

  it("stores and retrieves the admin key", () => {
    setAdminApiKey("alx_admin_xxx");
    expect(getAdminApiKey()).toBe("alx_admin_xxx");
  });

  it("clears the admin key without touching the client key", () => {
    setAdminApiKey("alx_admin_xxx");
    window.localStorage.setItem("alexis_api_key", "alx_client_xxx");

    clearAdminApiKey();

    expect(getAdminApiKey()).toBeNull();
    expect(window.localStorage.getItem("alexis_api_key")).toBe("alx_client_xxx");
  });
});
