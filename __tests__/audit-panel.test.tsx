import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AuditPanel from "@/components/audit-panel";
import * as apiClient from "@/lib/api-client";

const FAKE_QUOTA: apiClient.AuditQuota = { used: 1, limit: 3 };

const FAKE_FINDINGS: apiClient.AuditFinding[] = [
  {
    category: "security",
    title: "Clés API exposées",
    explanation: "Des clés sont en dur dans le code.",
    risk: "Accès non autorisé.",
    ticket_titles: ["Déplacer les clés dans .env"],
    no_code: false,
  },
  {
    category: "rgpd",
    title: "Pas de politique de rétention",
    explanation: "Les données ne sont pas supprimées.",
    risk: "Non-conformité RGPD.",
    ticket_titles: [],
    no_code: true,
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(apiClient, "getAuditQuota").mockResolvedValue(FAKE_QUOTA);
  vi.spyOn(apiClient, "getAuditStatus").mockResolvedValue({ status: null });
});

describe("AuditPanel — état initial", () => {
  it("affiche le bouton Lancer l'audit et le quota", async () => {
    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    const btn = await screen.findByRole("button", { name: /lancer l'audit/i });
    expect(btn).toBeInTheDocument();

    // Quota badge
    await waitFor(() =>
      expect(screen.getByText("1 / 3")).toBeInTheDocument()
    );
  });

  it("les 3 catégories sont pré-sélectionnées (aria-pressed=true)", async () => {
    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await screen.findByRole("button", { name: /lancer l'audit/i });

    // Les catégories sont maintenant des cartes (CategoryCard) avec aria-pressed
    const secBtn = screen.getByRole("button", { name: /sécurité/i });
    const rgpdBtn = screen.getByRole("button", { name: /rgpd/i });
    const a11yBtn = screen.getByRole("button", { name: /accessibilité/i });

    expect(secBtn).toHaveAttribute("aria-pressed", "true");
    expect(rgpdBtn).toHaveAttribute("aria-pressed", "true");
    expect(a11yBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("chaque carte de catégorie affiche une description", async () => {
    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await screen.findByRole("button", { name: /lancer l'audit/i });

    expect(screen.getByText(/injections, secrets exposés/i)).toBeInTheDocument();
    expect(screen.getByText(/consentement, rétention/i)).toBeInTheDocument();
    expect(screen.getByText(/contrastes, labels aria/i)).toBeInTheDocument();
  });

  it("désélectionner une catégorie la retire (aria-pressed=false)", async () => {
    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await screen.findByRole("button", { name: /lancer l'audit/i });

    const rgpdBtn = screen.getByRole("button", { name: /rgpd/i });
    fireEvent.click(rgpdBtn);
    expect(rgpdBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("les cartes de catégorie sont masquées quand l'audit est en cours", async () => {
    vi.spyOn(apiClient, "createAudit").mockResolvedValue(undefined);
    vi.spyOn(apiClient, "getAuditStatus")
      .mockResolvedValueOnce({ status: null })
      .mockResolvedValue({ status: "in_progress" });

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" pollIntervalMs={50} />);

    const btn = await screen.findByRole("button", { name: /lancer l'audit/i });
    fireEvent.click(btn);

    await waitFor(() =>
      expect(screen.getByText(/audit en cours/i)).toBeInTheDocument()
    );
    // Les cartes de catégorie ne doivent plus être visibles
    expect(screen.queryByRole("button", { name: /sécurité/i })).not.toBeInTheDocument();
  });
});

describe("AuditPanel — lancement et polling", () => {
  it("appelle createAudit avec les catégories sélectionnées puis passe en in_progress", async () => {
    const createSpy = vi.spyOn(apiClient, "createAudit").mockResolvedValue(undefined);
    // Après lancement, le polling verra "in_progress" puis "ready"
    vi.spyOn(apiClient, "getAuditStatus")
      .mockResolvedValueOnce({ status: null })   // mount initial
      .mockResolvedValueOnce({ status: "ready" }); // premier tick polling
    vi.spyOn(apiClient, "getAuditReport").mockResolvedValue({ findings: FAKE_FINDINGS });

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    const btn = await screen.findByRole("button", { name: /lancer l'audit/i });
    fireEvent.click(btn);

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith(
      "alx_xxx",
      "proj-1",
      expect.arrayContaining(["security", "rgpd", "a11y"])
    ));
  });

  it("affiche le rapport quand le statut passe à ready", async () => {
    vi.spyOn(apiClient, "createAudit").mockResolvedValue(undefined);
    vi.spyOn(apiClient, "getAuditStatus")
      .mockResolvedValueOnce({ status: null })
      .mockResolvedValue({ status: "ready" });
    vi.spyOn(apiClient, "getAuditReport").mockResolvedValue({ findings: FAKE_FINDINGS });

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" pollIntervalMs={50} />);

    const btn = await screen.findByRole("button", { name: /lancer l'audit/i });
    fireEvent.click(btn);

    await waitFor(() =>
      expect(screen.getByText("Clés API exposées")).toBeInTheDocument(),
      { timeout: 2000 }
    );
    expect(screen.getByText("Pas de politique de rétention")).toBeInTheDocument();
  });

  it("affiche une erreur si createAudit rejette (quota 429)", async () => {
    vi.spyOn(apiClient, "createAudit").mockRejectedValue(
      new apiClient.AlexisApiError(429, "Quota mensuel d'audits atteint (3 audits/mois).")
    );

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" pollIntervalMs={50} />);

    const btn = await screen.findByRole("button", { name: /lancer l'audit/i });
    fireEvent.click(btn);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/quota mensuel/i)
    );
  });

  it("affiche une erreur si le statut passe à failed", async () => {
    vi.spyOn(apiClient, "createAudit").mockResolvedValue(undefined);
    vi.spyOn(apiClient, "getAuditStatus")
      .mockResolvedValueOnce({ status: null })
      .mockResolvedValue({ status: "failed", error: "Erreur agent." });

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" pollIntervalMs={50} />);

    const btn = await screen.findByRole("button", { name: /lancer l'audit/i });
    fireEvent.click(btn);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/erreur agent/i),
      { timeout: 2000 }
    );
  });
});

describe("AuditPanel — rapport et to-tickets", () => {
  beforeEach(() => {
    // Simule un audit déjà "ready" au mount
    vi.spyOn(apiClient, "getAuditStatus").mockResolvedValue({ status: "ready" });
    vi.spyOn(apiClient, "getAuditReport").mockResolvedValue({ findings: FAKE_FINDINGS });
  });

  it("affiche les findings groupés par catégorie", async () => {
    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await waitFor(() =>
      expect(screen.getByText("Clés API exposées")).toBeInTheDocument()
    );
    expect(screen.getByText("Pas de politique de rétention")).toBeInTheDocument();
    // Badge "Sans impact code" sur le finding RGPD
    expect(screen.getByText("Sans impact code")).toBeInTheDocument();
  });

  it("envoie les findings sélectionnés en tickets", async () => {
    const toTicketsSpy = vi.spyOn(apiClient, "auditToTickets").mockResolvedValue(undefined);

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await waitFor(() =>
      expect(screen.getByText("Clés API exposées")).toBeInTheDocument()
    );

    // Les 2 findings sont pré-sélectionnés — on clique directement sur "Créer"
    const createBtn = screen.getByRole("button", { name: /créer.*ticket/i });
    fireEvent.click(createBtn);

    await waitFor(() =>
      expect(toTicketsSpy).toHaveBeenCalledWith("alx_xxx", "proj-1", FAKE_FINDINGS)
    );
  });

  it("affiche le message de succès après envoi en tickets", async () => {
    vi.spyOn(apiClient, "auditToTickets").mockResolvedValue(undefined);

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await waitFor(() =>
      expect(screen.getByText("Clés API exposées")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /créer.*ticket/i }));

    await waitFor(() =>
      expect(screen.getByText(/tickets créés avec succès/i)).toBeInTheDocument()
    );
  });

  it("désélectionner tous les findings désactive le bouton to-tickets", async () => {
    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await waitFor(() =>
      expect(screen.getByText("Clés API exposées")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /tout désélectionner/i }));

    const createBtn = screen.getByRole("button", { name: /créer.*ticket/i });
    expect(createBtn).toBeDisabled();
  });

  it("affiche une erreur si auditToTickets rejette", async () => {
    vi.spyOn(apiClient, "auditToTickets").mockRejectedValue(
      new apiClient.AlexisApiError(422, "La liste de points d'audit ne peut pas être vide.")
    );

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await waitFor(() =>
      expect(screen.getByText("Clés API exposées")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /créer.*ticket/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/liste de points/i)
    );
  });
});

describe("AuditPanel — quota épuisé", () => {
  it("désactive le bouton lancer et affiche un message quand le quota est atteint", async () => {
    vi.spyOn(apiClient, "getAuditQuota").mockResolvedValue({ used: 3, limit: 3 });

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await waitFor(() =>
      expect(screen.getByText("3 / 3")).toBeInTheDocument()
    );

    const btn = screen.getByRole("button", { name: /lancer l'audit/i });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/quota mensuel atteint/i)).toBeInTheDocument();
  });

  it("n'affiche pas de message de quota si la limite est null (illimité)", async () => {
    vi.spyOn(apiClient, "getAuditQuota").mockResolvedValue({ used: 10, limit: null });

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await waitFor(() =>
      expect(screen.getByText("Illimité")).toBeInTheDocument()
    );

    const btn = screen.getByRole("button", { name: /lancer l'audit/i });
    expect(btn).not.toBeDisabled();
  });

  it("affiche le bandeau quota épuisé dans le rapport et désactive le bouton relancer", async () => {
    vi.spyOn(apiClient, "getAuditQuota").mockResolvedValue({ used: 3, limit: 3 });
    vi.spyOn(apiClient, "getAuditStatus").mockResolvedValue({ status: "ready" });
    vi.spyOn(apiClient, "getAuditReport").mockResolvedValue({ findings: FAKE_FINDINGS });

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await waitFor(() =>
      expect(screen.getByText("Clés API exposées")).toBeInTheDocument()
    );

    // Bandeau quota épuisé visible
    expect(screen.getByText(/quota mensuel atteint \(3\/3\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(/reviens le mois prochain ou passe à un plan supérieur/i)
    ).toBeInTheDocument();

    // Bouton "Relancer un audit" désactivé
    const relancerBtn = screen.getByRole("button", { name: /relancer un audit/i });
    expect(relancerBtn).toBeDisabled();
  });

  it("le bouton créer les tickets reste actif même quand le quota est épuisé", async () => {
    vi.spyOn(apiClient, "getAuditQuota").mockResolvedValue({ used: 3, limit: 3 });
    vi.spyOn(apiClient, "getAuditStatus").mockResolvedValue({ status: "ready" });
    vi.spyOn(apiClient, "getAuditReport").mockResolvedValue({ findings: FAKE_FINDINGS });

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await waitFor(() =>
      expect(screen.getByText("Clés API exposées")).toBeInTheDocument()
    );

    // Le bouton "Créer les tickets" doit être actif (findings pré-sélectionnés)
    const createBtn = screen.getByRole("button", { name: /créer.*ticket/i });
    expect(createBtn).not.toBeDisabled();
  });
});

describe("AuditPanel — bandeau récap rapport", () => {
  it("affiche le bandeau succès avec le nombre de points et le quota restant", async () => {
    vi.spyOn(apiClient, "getAuditQuota").mockResolvedValue({ used: 1, limit: 3 });
    vi.spyOn(apiClient, "getAuditStatus").mockResolvedValue({ status: "ready" });
    vi.spyOn(apiClient, "getAuditReport").mockResolvedValue({ findings: FAKE_FINDINGS });

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await waitFor(() =>
      expect(screen.getByText("Clés API exposées")).toBeInTheDocument()
    );

    // Bandeau succès
    expect(screen.getByText(/ton dernier audit est prêt/i)).toBeInTheDocument();
    // Quota restant : 3 - 1 = 2
    expect(screen.getByText(/2 restant/i)).toBeInTheDocument();
  });

  it("affiche 'quota illimité' dans le bandeau si la limite est null", async () => {
    vi.spyOn(apiClient, "getAuditQuota").mockResolvedValue({ used: 5, limit: null });
    vi.spyOn(apiClient, "getAuditStatus").mockResolvedValue({ status: "ready" });
    vi.spyOn(apiClient, "getAuditReport").mockResolvedValue({ findings: FAKE_FINDINGS });

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await waitFor(() =>
      expect(screen.getByText("Clés API exposées")).toBeInTheDocument()
    );

    expect(screen.getByText(/quota illimité/i)).toBeInTheDocument();
  });

  it("le bouton 'Relancer un audit' est actif quand le quota n'est pas épuisé", async () => {
    vi.spyOn(apiClient, "getAuditQuota").mockResolvedValue({ used: 1, limit: 3 });
    vi.spyOn(apiClient, "getAuditStatus").mockResolvedValue({ status: "ready" });
    vi.spyOn(apiClient, "getAuditReport").mockResolvedValue({ findings: FAKE_FINDINGS });

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await waitFor(() =>
      expect(screen.getByText("Clés API exposées")).toBeInTheDocument()
    );

    const relancerBtn = screen.getByRole("button", { name: /relancer un audit/i });
    expect(relancerBtn).not.toBeDisabled();
  });

  it("cliquer sur 'Relancer un audit' remet l'état à zéro (retour à la sélection)", async () => {
    vi.spyOn(apiClient, "getAuditQuota").mockResolvedValue({ used: 1, limit: 3 });
    vi.spyOn(apiClient, "getAuditStatus").mockResolvedValue({ status: "ready" });
    vi.spyOn(apiClient, "getAuditReport").mockResolvedValue({ findings: FAKE_FINDINGS });

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await waitFor(() =>
      expect(screen.getByText("Clés API exposées")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /relancer un audit/i }));

    // Retour à l'écran de sélection
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /lancer l'audit/i })).toBeInTheDocument()
    );
    expect(screen.queryByText("Clés API exposées")).not.toBeInTheDocument();
  });
});

describe("AuditPanel — callback onTicketsCreated", () => {
  it("affiche le bouton 'Voir le backlog' après création réussie et appelle onTicketsCreated au clic", async () => {
    vi.spyOn(apiClient, "getAuditStatus").mockResolvedValue({ status: "ready" });
    vi.spyOn(apiClient, "getAuditReport").mockResolvedValue({ findings: FAKE_FINDINGS });
    vi.spyOn(apiClient, "auditToTickets").mockResolvedValue(undefined);

    const onTicketsCreated = vi.fn();
    render(
      <AuditPanel
        apiKey="alx_xxx"
        projectId="proj-1"
        pollIntervalMs={50}
        onTicketsCreated={onTicketsCreated}
      />
    );

    // Attendre l'affichage du rapport
    await waitFor(() =>
      expect(screen.getByText("Clés API exposées")).toBeInTheDocument()
    );

    // Cliquer sur "Créer les tickets"
    fireEvent.click(screen.getByRole("button", { name: /créer.*ticket/i }));

    // Attendre le message de succès
    await waitFor(() =>
      expect(screen.getByText(/tickets créés avec succès/i)).toBeInTheDocument()
    );

    // Le bouton "Voir le backlog" doit apparaître
    const backlogBtn = screen.getByRole("button", { name: /voir le backlog/i });
    expect(backlogBtn).toBeInTheDocument();

    // Cliquer dessus doit appeler onTicketsCreated
    fireEvent.click(backlogBtn);
    expect(onTicketsCreated).toHaveBeenCalledTimes(1);
  });

  it("n'affiche pas le bouton 'Voir le backlog' si onTicketsCreated n'est pas fourni", async () => {
    vi.spyOn(apiClient, "getAuditStatus").mockResolvedValue({ status: "ready" });
    vi.spyOn(apiClient, "getAuditReport").mockResolvedValue({ findings: FAKE_FINDINGS });
    vi.spyOn(apiClient, "auditToTickets").mockResolvedValue(undefined);

    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" pollIntervalMs={50} />);

    await waitFor(() =>
      expect(screen.getByText("Clés API exposées")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /créer.*ticket/i }));

    await waitFor(() =>
      expect(screen.getByText(/tickets créés avec succès/i)).toBeInTheDocument()
    );

    expect(screen.queryByRole("button", { name: /voir le backlog/i })).not.toBeInTheDocument();
  });
});
