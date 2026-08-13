import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPipelineSteps, { PIPELINE_STAGES } from "@/components/landing-pipeline-steps";

describe("LandingPipelineSteps", () => {
  it("uses 4 non-technical, visitor-facing phase labels, in order", () => {
    expect(PIPELINE_STAGES.map((s) => s.label)).toEqual([
      "Votre idée", "Alexis code", "Vérification automatique", "Livraison sur votre dépôt",
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
    expect(screen.getByText(/vous décrivez ce que vous voulez faire/i)).toBeInTheDocument();
    expect(screen.getByText(/corrige lui-même si quelque chose échoue/i)).toBeInTheDocument();
    expect(screen.getByText(/refuse de continuer tant que tout ne passe pas/i)).toBeInTheDocument();
    expect(screen.getByText(/pas une sandbox, pas un export/i)).toBeInTheDocument();
  });

  it("shows the human-validation gate on Votre idée and Livraison but not on Alexis code / Vérification", () => {
    render(<LandingPipelineSteps />);
    // gate=true sur "Votre idée" et "Livraison sur votre dépôt" → 2 badges
    expect(screen.getAllByText("Vous validez avant la suite")).toHaveLength(2);
  });

  it("never uses the informal tu/ton register — page is vous throughout", () => {
    render(<LandingPipelineSteps />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/\btu\b|\bton\b|\bta\b|\btes\b/i);
  });
});
