import { describe, it, expect } from "vitest";
import { DEFAULT_STATES, DEFAULT_TRIGGER_STATES, DEFAULT_MODELS } from "@/lib/project-defaults";

describe("project defaults", () => {
  it("has all 14 states matching the CLI's DEFAULT_STATES", () => {
    expect(Object.keys(DEFAULT_STATES)).toHaveLength(14);
    expect(DEFAULT_STATES.backlog).toBe("Backlog");
    expect(DEFAULT_STATES.done).toBe("Done");
  });

  it("has the 4 trigger states", () => {
    expect(DEFAULT_TRIGGER_STATES).toEqual(["Todo", "Plan", "Dev", "To Merge"]);
  });

  it("has models for spec/plan/dev", () => {
    expect(DEFAULT_MODELS).toEqual({
      spec: "claude-sonnet-4-5",
      plan: "claude-opus-4-5",
      dev: "claude-sonnet-4-5",
    });
  });
});
