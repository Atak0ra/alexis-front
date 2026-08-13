import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HowItWorksPage from "@/app/how-it-works/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/how-it-works",
}));

describe("HowItWorksPage", () => {
  it("renders the main heading", () => {
    render(<HowItWorksPage />);
    expect(screen.getByRole("heading", { name: /sous le capot/i })).toBeInTheDocument();
  });

  it("has the 4 anchor sections", () => {
    render(<HowItWorksPage />);
    expect(screen.getByText(/1 — Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/2 — Qualit/i)).toBeInTheDocument();
    expect(screen.getByText(/3 — Isolation/i)).toBeInTheDocument();
    expect(screen.getByText(/4 — Contr/i)).toBeInTheDocument();
  });

  it("mentions the quality gate", () => {
    render(<HowItWorksPage />);
    expect(screen.getByText(/Le gate est/)).toBeInTheDocument();
    // "bloquant" apparaît plusieurs fois (titre section + body) — on vérifie la présence
    expect(screen.getAllByText(/bloquant/).length).toBeGreaterThan(0);
  });

  it("lists the 3 supported stacks", () => {
    render(<HowItWorksPage />);
    expect(screen.getByText("TypeScript / Next.js")).toBeInTheDocument();
    expect(screen.getByText("Python / FastAPI")).toBeInTheDocument();
    expect(screen.getByText("Python / Django")).toBeInTheDocument();
  });

  it("mentions Docker isolation guarantees", () => {
    render(<HowItWorksPage />);
    expect(screen.getByText(/Container Docker éphémère par run/)).toBeInTheDocument();
    expect(screen.getByText(/Volume isolé par projet/)).toBeInTheDocument();
    // "Fernet" apparaît dans le titre ET le body — on vérifie juste qu'il est présent
    expect(screen.getAllByText(/Fernet/).length).toBeGreaterThan(0);
  });

  it("CTA links to signup", () => {
    render(<HowItWorksPage />);
    const signupLinks = screen.getAllByRole("link", { name: /créer un compte gratuit/i });
    expect(signupLinks.length).toBeGreaterThanOrEqual(1);
    expect(signupLinks[0]).toHaveAttribute("href", "/login?mode=signup");
  });

  it("back link points to home", () => {
    render(<HowItWorksPage />);
    const backLink = screen.getByRole("link", { name: /retour/i });
    expect(backLink).toHaveAttribute("href", "/");
  });
});
