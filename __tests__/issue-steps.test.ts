import { describe, it, expect } from "vitest";
import { getIssueSteps, STEP_GROUPS } from "@/lib/issue-steps";
import { DEFAULT_STATES } from "@/lib/project-defaults";
import type { Issue } from "@/lib/api-client";

function makeIssue(state: string): Issue {
  return {
    id: "i1",
    identifier: "PROJ-1",
    number: 1,
    title: "Titre",
    description: "",
    state,
    labels: [],
    created_at: "2026-07-10T00:00:00Z",
    updated_at: "2026-07-10T00:00:00Z",
    comments: [],
  };
}

describe("STEP_GROUPS", () => {
  it("covers every key in DEFAULT_STATES exactly once", () => {
    const allKeys = STEP_GROUPS.flatMap((g) => g.keys);
    const expectedKeys = Object.keys(DEFAULT_STATES);
    expect(allKeys.sort()).toEqual(expectedKeys.sort());
  });
});

describe("getIssueSteps", () => {
  it("returns 4 steps in order with 'requested' current for a Backlog issue", () => {
    const steps = getIssueSteps(makeIssue("Backlog"), DEFAULT_STATES);
    expect(steps.map((s) => s.id)).toEqual(["requested", "analysis", "development", "done"]);
    expect(steps[0].status).toBe("current");
    expect(steps[1].status).toBe("upcoming");
    expect(steps[2].status).toBe("upcoming");
    expect(steps[3].status).toBe("upcoming");
  });

  it("marks earlier steps done and the matching step current for Spec Review", () => {
    const steps = getIssueSteps(makeIssue("Spec Review"), DEFAULT_STATES);
    expect(steps[0].status).toBe("done");
    expect(steps[1].status).toBe("current");
    expect(steps[2].status).toBe("upcoming");
    expect(steps[3].status).toBe("upcoming");
  });

  it("marks the analysis step as attention for Plan Failed", () => {
    const steps = getIssueSteps(makeIssue("Plan Failed"), DEFAULT_STATES);
    expect(steps[1].status).toBe("attention");
  });

  it("groups Dev Review into the development step (regression: old Kanban dropped this state)", () => {
    const steps = getIssueSteps(makeIssue("Dev Review"), DEFAULT_STATES);
    expect(steps[2].status).toBe("current");
  });

  it("groups To Merge Failed into the done step as attention (regression: old Kanban dropped this state)", () => {
    const steps = getIssueSteps(makeIssue("To Merge Failed"), DEFAULT_STATES);
    expect(steps[3].status).toBe("attention");
  });

  it("keeps the done step as 'current' (not done) while state is To Merge", () => {
    const steps = getIssueSteps(makeIssue("To Merge"), DEFAULT_STATES);
    expect(steps[3].status).toBe("current");
  });

  it("marks all 4 steps done when state is Done", () => {
    const steps = getIssueSteps(makeIssue("Done"), DEFAULT_STATES);
    expect(steps.every((s) => s.status === "done")).toBe(true);
  });

  it("falls back to 'requested' current for an unmapped state label", () => {
    const steps = getIssueSteps(makeIssue("Some Unknown Label"), DEFAULT_STATES);
    expect(steps[0].status).toBe("current");
    expect(steps.slice(1).every((s) => s.status === "upcoming")).toBe(true);
  });
});
