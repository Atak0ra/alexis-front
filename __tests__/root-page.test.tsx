import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RootPage from "@/app/page";

describe("RootPage", () => {
  it("shows the product wordmark and pitch", () => {
    render(<RootPage />);
    expect(screen.getAllByText("Alexis").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /un projet livré/i })).toBeInTheDocument();
  });

  it("removes the generic audience badge from the hero", () => {
    render(<RootPage />);
    expect(
      screen.queryByText(/agent de développement, pour solopreneurs et agences/i)
    ).not.toBeInTheDocument();
  });

  it("shows a static ticket ticker instead of the fake dashboard screenshot", () => {
    render(<RootPage />);
    expect(screen.getByText("KARA-142 · Spec Review")).toBeInTheDocument();
    // The fake browser-chrome preview (KPI row) is gone.
    expect(screen.queryByText("Résolus")).not.toBeInTheDocument();
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

  it("shows the pipeline section with all 7 real stages and the human-validation gate", () => {
    render(<RootPage />);
    expect(screen.getByRole("heading", { name: /de l'idée au projet livré, en 7 étapes/i })).toBeInTheDocument();
    expect(screen.getByText(/chaque projet est découpé en tickets/i)).toBeInTheDocument();
    for (const label of ["Backlog", "Todo", "Spec", "Plan", "Dev", "To Merge", "Done"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("Vous validez avant la suite")).toHaveLength(4);
  });

  it("removes the old generic value-props grid", () => {
    render(<RootPage />);
    expect(screen.queryByText("Zéro configuration manuelle")).not.toBeInTheDocument();
    expect(screen.queryByText("Ticket → code testé → livré")).not.toBeInTheDocument();
  });
});
