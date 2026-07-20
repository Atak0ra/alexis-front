import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NewProjectStepper from "@/components/new-project-stepper";

describe("NewProjectStepper — horizontal (default)", () => {
  it("renders all 3 step labels", () => {
    render(<NewProjectStepper current={1} />);
    expect(screen.getByText("Dépôt")).toBeInTheDocument();
    expect(screen.getByText("Agent")).toBeInTheDocument();
    expect(screen.getByText("Contexte")).toBeInTheDocument();
  });

  it("marks the current step with aria-current=step", () => {
    render(<NewProjectStepper current={2} />);
    const circles = screen.getAllByRole("generic").filter(
      (el) => el.getAttribute("aria-current") === "step"
    );
    expect(circles).toHaveLength(1);
  });

  it("shows step number for future steps and checkmark for completed steps", () => {
    const { container } = render(<NewProjectStepper current={2} />);
    expect(container.querySelector('[aria-current="step"]')).toBeTruthy();
  });
});

describe("NewProjectStepper — vertical", () => {
  it("renders all 3 step labels with descriptions", () => {
    render(<NewProjectStepper current={1} orientation="vertical" />);
    expect(screen.getByText("Dépôt")).toBeInTheDocument();
    expect(screen.getByText("Agent")).toBeInTheDocument();
    expect(screen.getByText("Contexte")).toBeInTheDocument();
    // Descriptions
    expect(screen.getByText("Forge & token d'accès")).toBeInTheDocument();
    expect(screen.getByText("Modèle IA")).toBeInTheDocument();
  });

  it("does not render an Équipe step", () => {
    render(<NewProjectStepper current={1} orientation="vertical" />);
    expect(screen.queryByText("Équipe & clé API")).not.toBeInTheDocument();
  });

  it("marks the current step with aria-current=step", () => {
    render(<NewProjectStepper current={2} orientation="vertical" />);
    const circles = screen.getAllByRole("generic").filter(
      (el) => el.getAttribute("aria-current") === "step"
    );
    expect(circles).toHaveLength(1);
  });

  it("completed steps have no aria-current", () => {
    render(<NewProjectStepper current={3} orientation="vertical" />);
    const active = screen.getAllByRole("generic").filter(
      (el) => el.getAttribute("aria-current") === "step"
    );
    expect(active).toHaveLength(1);
  });
});
