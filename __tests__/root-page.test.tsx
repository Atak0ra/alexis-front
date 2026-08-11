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
    expect(screen.getByText("KARA-142 · Cadrage")).toBeInTheDocument();
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

  it("shows the pipeline section with the 4 non-technical phases and the human-validation gate", () => {
    render(<RootPage />);
    expect(screen.getByRole("heading", { name: /de l'idée au projet livré, en 4 étapes/i })).toBeInTheDocument();
    expect(screen.getByText(/chaque projet est découpé en tickets/i)).toBeInTheDocument();
    for (const label of ["Ton idée", "Cadrage", "Réalisation", "Livraison"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // No raw internal Kanban jargon (Spec/Plan/Dev/To Merge) on the public page.
    for (const jargon of ["Spec", "Plan", "Dev", "To Merge", "Backlog", "Todo"]) {
      expect(screen.queryByText(jargon)).not.toBeInTheDocument();
    }
    expect(screen.getAllByText("Vous validez avant la suite")).toHaveLength(3);
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
