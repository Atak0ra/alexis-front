import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RootPage from "@/app/page";

describe("RootPage", () => {
  it("shows the product title and tagline", () => {
    render(<RootPage />);
    expect(screen.getByRole("heading", { name: "Alexis" })).toBeInTheDocument();
    expect(screen.getByText(/pilotent un agent de code/)).toBeInTheDocument();
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

  it("links Connexion to /login and Créer un compte to /login?mode=signup", () => {
    render(<RootPage />);
    expect(screen.getByRole("link", { name: "Connexion" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/login?mode=signup");
  });
});
