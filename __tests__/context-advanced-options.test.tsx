import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ContextAdvancedOptions from "@/components/context-advanced-options";

// Mock listStacks pour ne pas appeler le back dans les tests
vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    listStacks: vi.fn().mockResolvedValue([
      { id: "nextjs", label: "Next.js", language: "TypeScript", framework: "Next.js 15",
        description: "Application web fullstack TypeScript.", default_architecture: "monolith",
        recommended_for: ["SaaS", "dashboard"], quality_gate: true },
      { id: "fastapi", label: "FastAPI", language: "Python", framework: "FastAPI",
        description: "API REST Python.", default_architecture: "front_back",
        recommended_for: ["API REST", "IA/ML"], quality_gate: true },
      { id: "django", label: "Django", language: "Python", framework: "Django 5",
        description: "Framework Python.", default_architecture: "monolith",
        recommended_for: ["CRUD", "back-office"], quality_gate: true },
    ]),
  };
});

describe("ContextAdvancedOptions (StackAdvancedOptions)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("est replié par défaut et n'appelle pas onStackChange", () => {
    const onStackChange = vi.fn();
    render(<ContextAdvancedOptions onStackChange={onStackChange} />);
    // Le toggle est présent mais aucune carte de stack n'est visible
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.queryByText("Next.js")).not.toBeInTheDocument();
    expect(onStackChange).not.toHaveBeenCalled();
  });

  it("affiche les cartes de stack après activation", async () => {
    const onStackChange = vi.fn();
    render(<ContextAdvancedOptions onStackChange={onStackChange} />);

    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => {
      expect(screen.getAllByText("Next.js").length).toBeGreaterThan(0);
      expect(screen.getAllByText("FastAPI").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Django").length).toBeGreaterThan(0);
    });
  });

  it("appelle onStackChange avec la stack sélectionnée et son archi par défaut", async () => {
    const onStackChange = vi.fn();
    render(<ContextAdvancedOptions onStackChange={onStackChange} />);
    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => screen.getAllByText("Next.js"));
    // Trouver le bouton qui contient "Next.js" (la carte)
    const nextjsBtns = screen.getAllByRole("button").filter((b) => b.textContent?.includes("Next.js"));
    fireEvent.click(nextjsBtns[0]!);

    expect(onStackChange).toHaveBeenLastCalledWith("nextjs", "monolith");
  });

  it("affiche les options d'architecture après sélection d'une stack", async () => {
    const onStackChange = vi.fn();
    render(<ContextAdvancedOptions onStackChange={onStackChange} />);
    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => screen.getAllByText("FastAPI"));
    const fastapiBtns = screen.getAllByRole("button").filter((b) => b.textContent?.includes("FastAPI"));
    fireEvent.click(fastapiBtns[0]!);

    expect(screen.getByText("Monolithe")).toBeInTheDocument();
    expect(screen.getByText("Front + Back")).toBeInTheDocument();
    expect(screen.getByText("Front + BFF + Back")).toBeInTheDocument();
  });

  it("appelle onStackChange avec la nouvelle archi quand l'utilisateur en choisit une", async () => {
    const onStackChange = vi.fn();
    render(<ContextAdvancedOptions onStackChange={onStackChange} />);
    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => screen.getAllByText("FastAPI"));
    const fastapiBtns = screen.getAllByRole("button").filter((b) => b.textContent?.includes("FastAPI"));
    fireEvent.click(fastapiBtns[0]!);

    // Choisir "Monolithe"
    fireEvent.click(screen.getByText("Monolithe").closest("button")!);
    expect(onStackChange).toHaveBeenLastCalledWith("fastapi", "monolith");
  });

  it("appelle onStackChange(null, null) quand on décoche après sélection", async () => {
    const onStackChange = vi.fn();
    render(<ContextAdvancedOptions onStackChange={onStackChange} />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    await waitFor(() => screen.getByText("Next.js"));
    fireEvent.click(screen.getByText("Next.js").closest("button")!);

    fireEvent.click(checkbox);
    expect(onStackChange).toHaveBeenLastCalledWith(null, null);
  });

  it("déselectionne la stack si on clique dessus une deuxième fois", async () => {
    const onStackChange = vi.fn();
    render(<ContextAdvancedOptions onStackChange={onStackChange} />);
    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => screen.getByText("Next.js"));
    const nextjsBtn = screen.getByText("Next.js").closest("button")!;
    fireEvent.click(nextjsBtn);
    fireEvent.click(nextjsBtn); // deuxième clic → désélection

    expect(onStackChange).toHaveBeenLastCalledWith(null, null);
  });
});

