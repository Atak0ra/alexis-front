import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RootPage from "@/app/page";

describe("RootPage", () => {
  it("shows the product title and pitch, with no explicit mention of Linear", () => {
    render(<RootPage />);
    expect(screen.getByRole("heading", { name: "Alexis" })).toBeInTheDocument();
    expect(screen.getByText(/deviennent des pull requests/)).toBeInTheDocument();
    expect(screen.queryByText(/Linear/i)).not.toBeInTheDocument();
  });

  it("shows the ticket pipeline tracker and the 5 stage descriptions", () => {
    render(<RootPage />);
    expect(screen.getByText("KARA-142")).toBeInTheDocument();
    expect(screen.getByText(/file d'attente/)).toBeInTheDocument();
    expect(screen.getByText(/rédige la spécification technique/)).toBeInTheDocument();
    expect(screen.getByText(/découpe la spec/)).toBeInTheDocument();
    expect(screen.getByText(/implémente le plan/)).toBeInTheDocument();
    expect(screen.getByText(/pull request est ouverte/)).toBeInTheDocument();
  });

  it("shows the value-props section", () => {
    render(<RootPage />);
    expect(screen.getByText("Suit votre process")).toBeInTheDocument();
    expect(screen.getByText("Rien à préparer à la main")).toBeInTheDocument();
    expect(screen.getByText("Une vraie pull request")).toBeInTheDocument();
    expect(screen.getByText("Plusieurs projets, un seul compte")).toBeInTheDocument();
  });

  it("links Connexion to /login and every Créer un compte CTA to /login?mode=signup", () => {
    render(<RootPage />);
    expect(screen.getByRole("link", { name: "Connexion" })).toHaveAttribute("href", "/login");

    const signupLinks = screen.getAllByRole("link", { name: "Créer un compte" });
    expect(signupLinks).toHaveLength(2);
    for (const link of signupLinks) {
      expect(link).toHaveAttribute("href", "/login?mode=signup");
    }
  });
});
