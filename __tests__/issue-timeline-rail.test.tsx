import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IssueTimelineRail from "@/components/issue-timeline-rail";
import type { StepState } from "@/lib/issue-steps";

const STEPS: StepState[] = [
  { id: "requested", label: "Demandé", status: "done" },
  { id: "analysis", label: "Analyse", status: "current" },
  { id: "development", label: "En développement", status: "upcoming" },
  { id: "done", label: "Terminé", status: "upcoming" },
];

describe("IssueTimelineRail", () => {
  it("renders all 4 steps with their status and testid", () => {
    render(<IssueTimelineRail steps={STEPS} selectedStepId="analysis" onSelect={vi.fn()} />);

    expect(screen.getByTestId("issue-step-requested")).toHaveAttribute("data-status", "done");
    expect(screen.getByTestId("issue-step-analysis")).toHaveAttribute("data-status", "current");
    expect(screen.getByTestId("issue-step-development")).toHaveAttribute("data-status", "upcoming");
    expect(screen.getByTestId("issue-step-done")).toHaveAttribute("data-status", "upcoming");
  });

  it("marks the selected step with aria-current", () => {
    render(<IssueTimelineRail steps={STEPS} selectedStepId="analysis" onSelect={vi.fn()} />);

    expect(screen.getByTestId("issue-step-analysis")).toHaveAttribute("aria-current", "step");
    expect(screen.getByTestId("issue-step-requested")).not.toHaveAttribute("aria-current");
  });

  it("calls onSelect with the step id when a done or current step is clicked", () => {
    const onSelect = vi.fn();
    render(<IssueTimelineRail steps={STEPS} selectedStepId="analysis" onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId("issue-step-requested"));

    expect(onSelect).toHaveBeenCalledWith("requested");
  });

  it("disables upcoming steps and does not call onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(<IssueTimelineRail steps={STEPS} selectedStepId="analysis" onSelect={onSelect} />);

    const upcomingStep = screen.getByTestId("issue-step-development");
    expect(upcomingStep).toBeDisabled();

    fireEvent.click(upcomingStep);

    expect(onSelect).not.toHaveBeenCalled();
  });
});
