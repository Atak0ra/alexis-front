import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NewProjectStepper from "@/components/new-project-stepper";

describe("NewProjectStepper — projet existant managed (défaut)", () => {
  it("affiche les étapes Origine, Dépôt, Contexte", () => {
    render(<NewProjectStepper current={1} isByok={false} isNewHosted={false} />);
    expect(screen.getByText("Origine")).toBeInTheDocument();
    expect(screen.getByText("Dépôt")).toBeInTheDocument();
    expect(screen.getByText("Contexte")).toBeInTheDocument();
    // Pas d'Agent ni d'Initialisation sur projet existant managed
    expect(screen.queryByText("Agent")).not.toBeInTheDocument();
    expect(screen.queryByText("Initialisation")).not.toBeInTheDocument();
  });

  it("marque l'étape courante avec aria-current=step", () => {
    render(<NewProjectStepper current={2} />);
    const circles = screen.getAllByRole("generic").filter(
      (el) => el.getAttribute("aria-current") === "step"
    );
    expect(circles).toHaveLength(1);
  });

  it("affiche un checkmark pour les étapes complétées", () => {
    const { container } = render(<NewProjectStepper current={2} />);
    expect(container.querySelector('[aria-current="step"]')).toBeTruthy();
  });
});

describe("NewProjectStepper — projet existant BYOK", () => {
  it("affiche les étapes avec Agent", () => {
    render(<NewProjectStepper current={1} isByok isNewHosted={false} />);
    expect(screen.getByText("Agent")).toBeInTheDocument();
    expect(screen.queryByText("Initialisation")).not.toBeInTheDocument();
    expect(screen.queryByText("Backlog")).not.toBeInTheDocument();
  });
});

describe("NewProjectStepper — projet hébergé neuf managed", () => {
  it("affiche les 5 étapes avec Initialisation et Backlog", () => {
    render(<NewProjectStepper current={1} isByok={false} isNewHosted />);
    expect(screen.getByText("Initialisation")).toBeInTheDocument();
    expect(screen.getByText("Backlog")).toBeInTheDocument();
    expect(screen.queryByText("Agent")).not.toBeInTheDocument();
  });

  it("affiche la description Scaffolding", () => {
    render(<NewProjectStepper current={1} isByok={false} isNewHosted orientation="vertical" />);
    expect(screen.getByText("Scaffolding & qualité")).toBeInTheDocument();
    expect(screen.getByText("Tickets de départ")).toBeInTheDocument();
  });
});

describe("NewProjectStepper — projet hébergé neuf BYOK", () => {
  it("affiche les 6 étapes avec Agent, Initialisation et Backlog", () => {
    render(<NewProjectStepper current={1} isByok isNewHosted />);
    expect(screen.getByText("Agent")).toBeInTheDocument();
    expect(screen.getByText("Initialisation")).toBeInTheDocument();
    expect(screen.getByText("Backlog")).toBeInTheDocument();
  });
});

describe("NewProjectStepper — vertical", () => {
  it("affiche les descriptions", () => {
    render(<NewProjectStepper current={1} isByok={false} isNewHosted={false} orientation="vertical" />);
    expect(screen.getByText("Forge & token d'accès")).toBeInTheDocument();
    expect(screen.getByText("Description du projet")).toBeInTheDocument();
  });

  it("ne renvoie pas d'étape Équipe", () => {
    render(<NewProjectStepper current={1} orientation="vertical" />);
    expect(screen.queryByText("Équipe & clé API")).not.toBeInTheDocument();
  });

  it("marque une seule étape courante", () => {
    render(<NewProjectStepper current={2} orientation="vertical" />);
    const circles = screen.getAllByRole("generic").filter(
      (el) => el.getAttribute("aria-current") === "step"
    );
    expect(circles).toHaveLength(1);
  });
});


