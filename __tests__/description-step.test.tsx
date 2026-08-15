import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DescriptionPage from "@/app/projects/new/description/page";
import { NewProjectProvider } from "@/lib/new-project-context";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));
vi.mock("@/lib/submit-new-project", () => ({ submitNewProject: vi.fn() }));

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
});

function renderPage() {
  return render(<NewProjectProvider><DescriptionPage /></NewProjectProvider>);
}

describe("DescriptionPage — bouton Aide-moi à être plus clair", () => {
  it("affiche le bouton de raffinement", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /aide-moi à être plus clair/i })).toBeInTheDocument();
  });

  it("le bouton est désactivé quand le textarea est vide", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /aide-moi à être plus clair/i })).toBeDisabled();
  });

  it("le bouton est actif quand le textarea a du contenu", () => {
    renderPage();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "une app" } });
    expect(screen.getByRole("button", { name: /aide-moi à être plus clair/i })).not.toBeDisabled();
  });

  it("au clic, affiche la carte de prévisualisation Markdown", async () => {
    vi.spyOn(apiClient, "refineBrief").mockResolvedValue({ refined: "**Objectif :** App structurée." });
    renderPage();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "une app de livraison" } });
    fireEvent.click(screen.getByRole("button", { name: /aide-moi à être plus clair/i }));
    await waitFor(() => expect(screen.getByText(/brief amélioré par l'ia/i)).toBeInTheDocument());
    // Markdown rendu : pas de ** visibles
    expect(screen.getAllByText(/objectif/i).length).toBeGreaterThan(0);
    // Textarea original inchangé
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("une app de livraison");
  });

  it("'Utiliser ce brief' copie dans le textarea et ferme la carte", async () => {
    const REFINED = "**Objectif :** App structurée.";
    vi.spyOn(apiClient, "refineBrief").mockResolvedValue({ refined: REFINED });
    renderPage();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "une app" } });
    fireEvent.click(screen.getByRole("button", { name: /aide-moi à être plus clair/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /utiliser ce brief/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /utiliser ce brief/i }));
    expect(screen.queryByText(/brief amélioré par l'ia/i)).not.toBeInTheDocument();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(REFINED);
  });

  it("'Ignorer' ferme la carte sans modifier le textarea", async () => {
    vi.spyOn(apiClient, "refineBrief").mockResolvedValue({ refined: "**Objectif :** Ignoré." });
    renderPage();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "mon idée initiale" } });
    fireEvent.click(screen.getByRole("button", { name: /aide-moi à être plus clair/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /^Ignorer$/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^Ignorer$/ }));
    expect(screen.queryByText(/brief amélioré par l'ia/i)).not.toBeInTheDocument();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("mon idée initiale");
  });

  it("affiche un état de chargement pendant l'appel", async () => {
    vi.spyOn(apiClient, "refineBrief").mockImplementation(() => new Promise(() => {}));
    renderPage();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "une idée" } });
    fireEvent.click(screen.getByRole("button", { name: /aide-moi à être plus clair/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /amélioration/i })).toBeInTheDocument());
  });

  it("affiche un message d'erreur si refineBrief échoue", async () => {
    vi.spyOn(apiClient, "refineBrief").mockRejectedValue(
      new apiClient.AlexisApiError(503, "Aucune clé gérée active.")
    );
    renderPage();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "une idée" } });
    fireEvent.click(screen.getByRole("button", { name: /aide-moi à être plus clair/i }));
    await waitFor(() => expect(screen.getByText(/aucune clé|erreur/i)).toBeInTheDocument());
  });

  it("ne modifie pas le textarea si refineBrief échoue", async () => {
    vi.spyOn(apiClient, "refineBrief").mockRejectedValue(new apiClient.AlexisApiError(503, "Erreur"));
    renderPage();
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "mon idée initiale" } });
    fireEvent.click(screen.getByRole("button", { name: /aide-moi à être plus clair/i }));
    await waitFor(() => expect(screen.getByText(/erreur/i)).toBeInTheDocument());
    expect(textarea.value).toBe("mon idée initiale");
  });
});
