import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPipelineSteps, { PIPELINE_STAGES } from "@/components/landing-pipeline-steps";

describe("LandingPipelineSteps", () => {
  it("uses 4 non-technical, visitor-facing phase labels, in order", () => {
    expect(PIPELINE_STAGES.map((s) => s.label)).toEqual([
      "Ton idée", "Cadrage", "Réalisation", "Livraison",
    ]);
  });

  it("renders every phase label and a numbered marker", () => {
    render(<LandingPipelineSteps />);
    for (const stage of PIPELINE_STAGES) {
      expect(screen.getByText(stage.label)).toBeInTheDocument();
    }
    for (const n of ["1", "2", "3", "4"]) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
  });

  it("renders the mechanism copy for each phase", () => {
    render(<LandingPipelineSteps />);
    expect(screen.getByText(/vous décrivez ce qu'il faut faire/i)).toBeInTheDocument();
    expect(screen.getByText(/une spécification fonctionnelle, puis un plan technique/i)).toBeInTheDocument();
    expect(screen.getByText(/écrit le code, exécute les tests/i)).toBeInTheDocument();
    expect(screen.getByText(/mise en ligne propre/i)).toBeInTheDocument();
  });

  it("shows the human-validation gate on Cadrage, Réalisation, Livraison but not on Ton idée", () => {
    render(<LandingPipelineSteps />);
    expect(screen.getAllByText("Vous validez avant la suite")).toHaveLength(3);
  });

  it("never uses the informal tu/ton register — page is vous throughout", () => {
    render(<LandingPipelineSteps />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/\btu\b|\bton\b|\bta\b|\btes\b/i);
  });
});
