import { describe, it, expect, beforeEach } from "vitest";
import { getApiKey, setApiKey, clearApiKey } from "@/lib/session";

beforeEach(() => {
  window.localStorage.clear();
});

describe("session", () => {
  it("returns null when no key stored", () => {
    expect(getApiKey()).toBeNull();
  });

  it("stores and retrieves the api key", () => {
    setApiKey("alx_xxx");
    expect(getApiKey()).toBe("alx_xxx");
  });

  it("clears the stored key", () => {
    setApiKey("alx_xxx");
    clearApiKey();
    expect(getApiKey()).toBeNull();
  });
});
