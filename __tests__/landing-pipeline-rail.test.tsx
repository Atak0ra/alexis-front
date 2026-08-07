import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPipelineRail, { PIPELINE_STAGES } from "@/components/landing-pipeline-rail";

describe("LandingPipelineRail — static structure", () => {
  it("uses the 7 real Kanban column labels, in order", () => {
    expect(PIPELINE_STAGES.map((s) => s.label)).toEqual([
      "Backlog", "Todo", "Spec", "Plan", "Dev", "To Merge", "Done",
    ]);
  });

  it("renders every stage label at least once", () => {
    render(<LandingPipelineRail />);
    for (const stage of PIPELINE_STAGES) {
      expect(screen.getAllByText(stage.label).length).toBeGreaterThan(0);
    }
  });

  it("renders the mechanism copy for each stage", () => {
    render(<LandingPipelineRail />);
    expect(screen.getByText(/rédige une spécification fonctionnelle/)).toBeInTheDocument();
    expect(screen.getByText(/écrit le code, exécute les tests/)).toBeInTheDocument();
    expect(screen.getByText(/rebase et merge sur ta branche de base/i)).toBeInTheDocument();
  });

  it("shows the human-validation gate only on Spec, Plan, Dev, To Merge", () => {
    render(<LandingPipelineRail />);
    expect(screen.getAllByText("Vous validez avant la suite")).toHaveLength(4);
  });

  it("gives every stage content block a stable test id for scroll-spy targeting", () => {
    render(<LandingPipelineRail />);
    expect(screen.getByTestId("stage-block-backlog")).toBeInTheDocument();
    expect(screen.getByTestId("stage-block-dev")).toBeInTheDocument();
    expect(screen.getByTestId("stage-block-done")).toBeInTheDocument();
  });
});
