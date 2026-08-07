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

    const secBtn = screen.getByRole("button", { name: /sécurité/i });
    const rgpdBtn = screen.getByRole("button", { name: /rgpd/i });
    const a11yBtn = screen.getByRole("button", { name: /accessibilité/i });

    expect(secBtn).toHaveAttribute("aria-pressed", "true");
    expect(rgpdBtn).toHaveAttribute("aria-pressed", "true");
    expect(a11yBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("désélectionner une catégorie la retire (aria-pressed=false)", async () => {
    render(<AuditPanel apiKey="alx_xxx" projectId="proj-1" />);

    await screen.findByRole("button", { name: /lancer l'audit/i });

    const rgpdBtn = screen.getByRole("button", { name: /rgpd/i });
    fireEvent.click(rgpdBtn);
    expect(rgpdBtn).toHaveAttribute("aria-pressed", "false");
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
});
