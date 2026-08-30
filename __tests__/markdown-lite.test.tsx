import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MarkdownLite from "@/components/markdown-lite";

describe("MarkdownLite", () => {
  it("renders **bold** text as a <strong> element", () => {
    render(<MarkdownLite text="**Alexis — 2 tentatives échouées (plan) :**" />);
    const strong = screen.getByText("Alexis — 2 tentatives échouées (plan) :");
    expect(strong.tagName).toBe("STRONG");
  });

  it("renders *italic* text as an <em> element", () => {
    render(<MarkdownLite text="*avertissement*" />);
    expect(screen.getByText("avertissement").tagName).toBe("EM");
  });

  it("renders `inline code` as a <code> element", () => {
    render(<MarkdownLite text="Voir `plan.md`" />);
    expect(screen.getByText("plan.md").tagName).toBe("CODE");
  });

  it("renders a fenced code block as <pre><code>", () => {
    render(<MarkdownLite text={"Erreur :\n```\nFichier plan non généré : plan.md\n```\nRéessaie."} />);
    const code = screen.getByText("Fichier plan non généré : plan.md");
    expect(code.tagName).toBe("CODE");
    expect(code.closest("pre")).not.toBeNull();
    // Le texte après le bloc doit rester du texte normal, pas du code.
    expect(screen.getByText("Réessaie.").tagName).toBe("P");
  });

  it("still renders plain text with no markdown syntax as-is", () => {
    render(<MarkdownLite text="Merci pour le retour" />);
    expect(screen.getByText("Merci pour le retour")).toBeInTheDocument();
  });

  it("renders headings", () => {
    render(<MarkdownLite text="## Plan technique" />);
    expect(screen.getByRole("heading", { name: "Plan technique" })).toBeInTheDocument();
  });

  it("renders a bullet list", () => {
    render(<MarkdownLite text={"- premier\n- second"} />);
    expect(screen.getByText("premier").tagName).toBe("LI");
    expect(screen.getByText("second").tagName).toBe("LI");
  });

  it("hides HTML comment blocks (e.g. the hidden error_detail block from run_step.py)", () => {
    render(
      <MarkdownLite
        text={
          "**Modèle IA indisponible**\n\nLe modèle IA configuré n'est plus disponible.\n" +
          "<!-- alexis:error_detail -->\nlitellm.NotFoundError: GroqException - raw stack trace\n<!-- /alexis:error_detail -->"
        }
      />
    );
    expect(screen.getByText("Le modèle IA configuré n'est plus disponible.")).toBeInTheDocument();
    expect(screen.queryByText(/litellm/)).not.toBeInTheDocument();
    expect(screen.queryByText(/alexis:error_detail/)).not.toBeInTheDocument();
  });

  it("hides a single-line HTML comment mixed into normal text", () => {
    render(<MarkdownLite text={"Avant.\n<!-- note interne -->\nAprès."} />);
    expect(screen.getByText("Avant.")).toBeInTheDocument();
    expect(screen.getByText("Après.")).toBeInTheDocument();
    expect(screen.queryByText(/note interne/)).not.toBeInTheDocument();
  });
});
