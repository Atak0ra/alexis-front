import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RootPage from "@/app/page";

describe("RootPage", () => {
  it("shows the product wordmark and pitch", () => {
    render(<RootPage />);
    expect(screen.getAllByText("Alexis").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /du code testé/i })).toBeInTheDocument();
  });

  it("removes the old generic hero", () => {
    render(<RootPage />);
    expect(screen.queryByRole("heading", { name: /une idée.*un projet livré/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/agent de développement, pour solopreneurs et agences/i)).not.toBeInTheDocument();
  });

  it("shows the dashboard preview instead of the old delivery card", () => {
    render(<RootPage />);
    // L'aperçu du vrai dashboard est affiché (colonnes réelles)
    expect(screen.getByText("Développement")).toBeInTheDocument();
    expect(screen.getByText("Cadrage")).toBeInTheDocument();
    // La vieille carte de livraison Wave a disparu
    expect(screen.queryByText("PROJET-142 · Ajout du paiement Wave")).not.toBeInTheDocument();
    expect(screen.queryByText("Résolus")).not.toBeInTheDocument();
  });

  it("links Connexion to /login and CTA links to /login?mode=signup", () => {
    render(<RootPage />);
    expect(screen.getByRole("link", { name: "Connexion" })).toHaveAttribute("href", "/login");
    const signupLinks = screen.getAllByRole("link", { name: /commencer gratuitement/i });
    expect(signupLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of signupLinks) {
      expect(link).toHaveAttribute("href", "/login?mode=signup");
    }
  });

  it("shows the pipeline section with the 4 new non-technical phases", () => {
    render(<RootPage />);
    expect(screen.getByRole("heading", { name: /de l'idée à la livraison, en 4 étapes/i })).toBeInTheDocument();
    for (const label of ["Votre idée", "Alexis code", "Vérification automatique", "Livraison sur votre dépôt"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const jargon of ["Spec", "Dev", "To Merge", "Backlog", "Todo"]) {
      expect(screen.queryByText(jargon)).not.toBeInTheDocument();
    }
  });

  it("stays in the vous register throughout, no informal tu", () => {
    render(<RootPage />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/\btu\b|\bton\b|\bta\b|\btes\b/i);
  });

  it("removes the old generic value-props grid", () => {
    render(<RootPage />);
    expect(screen.queryByText("Zéro configuration manuelle")).not.toBeInTheDocument();
    expect(screen.queryByText("Ticket → code testé → livré")).not.toBeInTheDocument();
  });

  it("shows the Fonctionnement link in the footer pointing to /how-it-works", () => {
    render(<RootPage />);
    const link = screen.getByRole("link", { name: "Fonctionnement" });
    expect(link).toHaveAttribute("href", "/how-it-works");
  });

  it("shows the billing section explaining pay-as-you-go pricing", () => {
    render(<RootPage />);
    expect(
      screen.getByRole("heading", { name: /vous ne payez que ce que vous utilisez/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/essai gratuit/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/payez à l'usage/i)).toBeInTheDocument();
    expect(screen.getByText("BYOK")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /voir le détail des tarifs/i })).toHaveAttribute(
      "href",
      "/pricing"
    );
  });
});
