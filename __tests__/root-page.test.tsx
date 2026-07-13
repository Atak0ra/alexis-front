import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RootPage from "@/app/page";

describe("RootPage", () => {
  it("shows the product title and tagline", () => {
    render(<RootPage />);
    expect(screen.getByRole("heading", { name: "Alexis" })).toBeInTheDocument();
    expect(screen.getByText(/pilotent un agent de code/)).toBeInTheDocument();
  });

  it("lists the 5 pipeline steps", () => {
    render(<RootPage />);
    expect(screen.getByText("Todo")).toBeInTheDocument();
    expect(screen.getByText("Spec")).toBeInTheDocument();
    expect(screen.getByText("Plan")).toBeInTheDocument();
    expect(screen.getByText("Dev")).toBeInTheDocument();
    expect(screen.getByText("PR")).toBeInTheDocument();
  });

  it("links Connexion to /login and Créer un compte to /login?mode=signup", () => {
    render(<RootPage />);
    expect(screen.getByRole("link", { name: "Connexion" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/login?mode=signup");
  });
});
