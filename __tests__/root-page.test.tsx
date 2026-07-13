import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RootPage from "@/app/page";

describe("RootPage", () => {
  it("shows the product wordmark and pitch, with no explicit mention of Linear", () => {
    render(<RootPage />);
    expect(screen.getAllByText("Alexis").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /s'occupe du reste/ })).toBeInTheDocument();
    expect(screen.queryByText(/Linear/i)).not.toBeInTheDocument();
  });

  it("shows the pipeline tracker and the 5 stage descriptions in plain language", () => {
    render(<RootPage />);
    expect(screen.getByText("KARA-142")).toBeInTheDocument();
    expect(screen.getByText(/attend d'être prise en charge/)).toBeInTheDocument();
    expect(screen.getByText(/rédige le besoin/)).toBeInTheDocument();
    expect(screen.getByText(/prépare les étapes/)).toBeInTheDocument();
    expect(screen.getByText(/écrit le code/)).toBeInTheDocument();
    expect(screen.getByText(/code est livré/)).toBeInTheDocument();
    expect(screen.queryByText(/pull request/i)).not.toBeInTheDocument();
  });

  it("shows the value-props section", () => {
    render(<RootPage />);
    expect(screen.getByText("S'adapte à votre façon de travailler")).toBeInTheDocument();
    expect(screen.getByText("Rien à préparer à la main")).toBeInTheDocument();
    expect(screen.getByText("Un vrai résultat livré")).toBeInTheDocument();
    expect(screen.getByText("Plusieurs projets, un seul compte")).toBeInTheDocument();
  });

  it("links Connexion to /login and every Créer un compte CTA to /login?mode=signup", () => {
    render(<RootPage />);
    expect(screen.getByRole("link", { name: "Connexion" })).toHaveAttribute("href", "/login");

    const signupLinks = screen.getAllByRole("link", { name: "Créer un compte" });
    expect(signupLinks).toHaveLength(3);
    for (const link of signupLinks) {
      expect(link).toHaveAttribute("href", "/login?mode=signup");
    }
  });
});
