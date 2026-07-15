import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RootPage from "@/app/page";

describe("RootPage", () => {
  it("shows the product wordmark and pitch", () => {
    render(<RootPage />);
    expect(screen.getAllByText("Alexis").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /résolus automatiquement/i })).toBeInTheDocument();
  });

  it("shows the pipeline stages with descriptions", () => {
    render(<RootPage />);
    // Stage labels
    expect(screen.getAllByText("Todo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Spec").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dev").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Livraison").length).toBeGreaterThan(0);
    // Stage descriptions
    expect(screen.getByText(/attend d'être pris en charge/)).toBeInTheDocument();
    expect(screen.getByText(/rédige une spécification/)).toBeInTheDocument();
    expect(screen.getAllByText(/écrit le code/).length).toBeGreaterThan(0);
    expect(screen.getByText(/PR est ouverte/)).toBeInTheDocument();
    // Ticket preview
    expect(screen.getByText("KARA-142")).toBeInTheDocument();
  });

  it("shows the value-props section", () => {
    render(<RootPage />);
    expect(screen.getByText("Zéro configuration manuelle")).toBeInTheDocument();
    expect(screen.getByText("Du ticket au PR en autonomie")).toBeInTheDocument();
    expect(screen.getByText("Plusieurs projets, un seul tableau de bord")).toBeInTheDocument();
    expect(screen.getByText("Coûts transparents et traçables")).toBeInTheDocument();
  });

  it("links Connexion to /login and CTA links to /login?mode=signup", () => {
    render(<RootPage />);
    expect(screen.getByRole("link", { name: "Connexion" })).toHaveAttribute("href", "/login");

    const signupLinks = screen.getAllByRole("link", { name: /commencer gratuitement|créer un compte gratuit/i });
    expect(signupLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of signupLinks) {
      expect(link).toHaveAttribute("href", "/login?mode=signup");
    }
  });
});
