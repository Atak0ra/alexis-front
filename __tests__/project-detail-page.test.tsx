import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import ProjectDetailPage from "@/app/dashboard/[id]/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";
import { DEFAULT_STATES, DEFAULT_TRIGGER_STATES, DEFAULT_MODELS } from "@/lib/project-defaults";
import { NotificationsProvider } from "@/lib/notifications-context";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "proj-1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

const FAKE_PROJECT: apiClient.ProjectOut = {
  id: "proj-1",
  name: "Proj Demo",
  repo_url: "https://github.com/acme/proj-demo.git",
  is_hosted: false,
  agent_choice: "claude",
  agent_base_url: null,
  has_agent_api_key: true,
  issue_prefix: "PROJ",
  forge_provider: "github",
  has_forge_token: true,
  states: DEFAULT_STATES,
  trigger_states: DEFAULT_TRIGGER_STATES,
  models: DEFAULT_MODELS,
  run_timeout_seconds: 1800,
  is_active: true,
  created_at: "2026-07-15T00:00:00Z",
};

const FAKE_ISSUE: apiClient.Issue = {
  id: "issue-1",
  identifier: "PROJ-1",
  number: 1,
  title: "Corriger la pagination",
  description: "",
  state: "Backlog",
  labels: [],
  created_at: "2026-07-10T00:00:00Z",
  updated_at: "2026-07-10T00:00:00Z",
  comments: [],
};

const FAKE_TICKET: apiClient.TicketOut = {
  id: "PROJ-1",
  title: "Corriger la pagination",
  description: "",
  status: "in_progress",
  agent: "claude",
  cost_usd: 2.5,
  updated_at: "2026-07-10T00:00:00Z",
  pr_url: "https://github.com/acme/proj-demo/pull/7",
  pr_title: "Fix pagination",
  error_message: null,
};

// jsdom doesn't implement Blob URLs — NewIssueModal's staged-file preview
// calls the real URL.createObjectURL/revokeObjectURL, so stub them for this suite.
if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn();
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
  vi.spyOn(apiClient, "getProject").mockResolvedValue(FAKE_PROJECT);
  vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: true });
  vi.spyOn(apiClient, "getProjectStats").mockResolvedValue({
    resolved: 1, in_progress: 1, failed: 0,
    total_cost_usd: 2.5,
  });
  // Audit — évite les appels réseau dans les tests non-audit
  vi.spyOn(apiClient, "getAuditQuota").mockResolvedValue({ used: 0, limit: 3 });
  vi.spyOn(apiClient, "getAuditStatus").mockResolvedValue({ status: null });
});

describe("ProjectDetailPage — context banner", () => {
  it("shows a banner linking to the Contexte page when no context exists yet", async () => {
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: false });
    vi.spyOn(apiClient, "listIssues").mockResolvedValue([]);
    vi.spyOn(apiClient, "listTickets").mockResolvedValue([]);

    render(<ProjectDetailPage />);

    const link = await screen.findByRole("link", { name: /générer maintenant/i });
    expect(link).toHaveAttribute("href", "/dashboard/proj-1/context");
  });

  it("shows no context banner and no inline context card once context exists", async () => {
    vi.spyOn(apiClient, "getProjectContext").mockResolvedValue({ exists: true });
    vi.spyOn(apiClient, "listIssues").mockResolvedValue([]);
    vi.spyOn(apiClient, "listTickets").mockResolvedValue([]);

    render(<ProjectDetailPage />);

    await screen.findByText("Proj Demo");
    expect(screen.queryByText(/pas encore de fichier de contexte/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Contexte du projet")).not.toBeInTheDocument();
  });
});

describe("ProjectDetailPage — ticket/PR wiring", () => {
  it("shows a PR link on an issue row once ticket data (PR/cost) loads", async () => {
    vi.spyOn(apiClient, "listIssues").mockResolvedValue([FAKE_ISSUE]);
    vi.spyOn(apiClient, "listTickets").mockResolvedValue([FAKE_TICKET]);

    render(<ProjectDetailPage />);

    const prLink = await screen.findByRole("link", { name: /voir les modifications/i });
    expect(prLink).toHaveAttribute("href", "https://github.com/acme/proj-demo/pull/7");
  });

  it("creates a new ticket in Backlog — triage into a trigger state is manual, via the Kanban", async () => {
    vi.spyOn(apiClient, "listIssues").mockResolvedValue([]);
    vi.spyOn(apiClient, "listTickets").mockResolvedValue([]);
    const createSpy = vi.spyOn(apiClient, "createIssue").mockResolvedValue({
      ...FAKE_ISSUE,
      id: "issue-2",
      title: "Nouvelle demande",
    });

    render(<ProjectDetailPage />);

    const newTicketButton = await screen.findByRole("button", { name: /nouvelle demande/i });
    fireEvent.click(newTicketButton);

    fireEvent.change(screen.getByPlaceholderText(/corriger le bug/i), {
      target: { value: "Nouvelle demande" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer" }));

    await waitFor(() => expect(createSpy).toHaveBeenCalled());
    const payload = createSpy.mock.calls[0][2];
    expect(payload.state).toBe("Backlog");
    expect(payload.labels).toEqual(["feature"]);
  });

  it("uploads staged mockup files after the ticket is created", async () => {
    vi.spyOn(apiClient, "listIssues").mockResolvedValue([]);
    vi.spyOn(apiClient, "listTickets").mockResolvedValue([]);
    vi.spyOn(apiClient, "createIssue").mockResolvedValue({
      ...FAKE_ISSUE,
      id: "issue-2",
      title: "New ticket",
    });
    const uploadSpy = vi.spyOn(apiClient, "uploadIssueAsset").mockResolvedValue({
      id: "asset-1", filename: "mockup.png", content_type: "image/png", size_bytes: 10, created_at: "2026-01-01T00:00:00Z",
    });

    render(<ProjectDetailPage />);

    const newTicketButton = await screen.findByRole("button", { name: /nouvelle demande/i });
    fireEvent.click(newTicketButton);

    const file = new File(["data"], "mockup.png", { type: "image/png" });
    const fileInput = screen.getByLabelText(/ajouter un fichier/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.change(screen.getByPlaceholderText(/corriger le bug/i), {
      target: { value: "New ticket" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer" }));

    await waitFor(() => expect(uploadSpy).toHaveBeenCalled());
    const [, , issueId, uploadedFile] = uploadSpy.mock.calls[0];
    expect(issueId).toBe("issue-2");
    expect(uploadedFile.name).toBe("mockup.png");
  });

  it("renders issues normally when listTickets fails", async () => {
    vi.spyOn(apiClient, "listIssues").mockResolvedValue([FAKE_ISSUE]);
    vi.spyOn(apiClient, "listTickets").mockRejectedValue(new Error("boom"));

    render(<ProjectDetailPage />);

    await waitFor(() => expect(screen.getByText("Corriger la pagination")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /voir les modifications/i })).not.toBeInTheDocument();
  });

  it("keeps the created ticket visible and closes the modal even when a staged upload fails", async () => {
    vi.spyOn(apiClient, "listIssues").mockResolvedValue([]);
    vi.spyOn(apiClient, "listTickets").mockResolvedValue([]);
    vi.spyOn(apiClient, "createIssue").mockResolvedValue({
      ...FAKE_ISSUE,
      id: "issue-2",
      title: "New ticket",
    });
    vi.spyOn(apiClient, "uploadIssueAsset").mockRejectedValue(
      new apiClient.AlexisApiError(422, "Trop de fichiers")
    );

    render(<ProjectDetailPage />);

    const newTicketButton = await screen.findByRole("button", { name: /nouvelle demande/i });
    fireEvent.click(newTicketButton);

    const file = new File(["data"], "mockup.png", { type: "image/png" });
    const fileInput = screen.getByLabelText(/ajouter un fichier/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.change(screen.getByPlaceholderText(/corriger le bug/i), {
      target: { value: "New ticket" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer" }));

    // The ticket must show up in the visible list...
    await waitFor(() => expect(screen.getByText("New ticket")).toBeInTheDocument());
    // ...and the modal must close, even though the asset upload rejected.
    await waitFor(() => expect(screen.queryByRole("heading", { name: /nouvelle demande/i })).not.toBeInTheDocument());
    // No error banner should be shown for an upload-only failure.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("caps staged mockup files at 5 and ignores files beyond the limit", async () => {
    vi.spyOn(apiClient, "listIssues").mockResolvedValue([]);
    vi.spyOn(apiClient, "listTickets").mockResolvedValue([]);
    vi.spyOn(apiClient, "createIssue").mockResolvedValue({
      ...FAKE_ISSUE,
      id: "issue-3",
      title: "Many files",
    });
    const uploadSpy = vi.spyOn(apiClient, "uploadIssueAsset").mockResolvedValue({
      id: "asset-1", filename: "f.png", content_type: "image/png", size_bytes: 10, created_at: "2026-01-01T00:00:00Z",
    });

    render(<ProjectDetailPage />);

    const newTicketButton = await screen.findByRole("button", { name: /nouvelle demande/i });
    fireEvent.click(newTicketButton);

    const fileInput = screen.getByLabelText(/ajouter un fichier/i);
    const files = Array.from({ length: 6 }, (_, i) => new File(["data"], `f${i}.png`, { type: "image/png" }));
    fireEvent.change(fileInput, { target: { files } });

    // Only 5 preview thumbnails should be staged, not 6.
    await waitFor(() => expect(screen.getAllByAltText(/f\d\.png/)).toHaveLength(5));
    expect(screen.queryByAltText("f5.png")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/corriger le bug/i), {
      target: { value: "Many files" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer" }));

    await waitFor(() => expect(uploadSpy).toHaveBeenCalledTimes(5));
  });
});

// ── Reconciliation Kanban ↔ notifications SSE ──────────────────────────────
//
// Bug réel : le Kanban charge `issues` une seule fois au mount ; sans lien
// avec le flux de notifications, une carte reste affichée dans sa colonne
// d'origine même après que le backend a fait avancer le ticket (ex: Todo →
// Spec), tant que la page n'est pas rechargée manuellement.

function makeOpenSseStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let idx = 0;
  return new ReadableStream({
    pull(controller) {
      if (idx < events.length) controller.enqueue(encoder.encode(events[idx++]));
      // Ne ferme jamais — simule une connexion SSE longue durée.
    },
  });
}

describe("ProjectDetailPage — reconciliation Kanban / notifications", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("déplace une carte vers sa nouvelle colonne dès qu'une notif SSE arrive pour ce ticket", async () => {
    const issueInTodo = { ...FAKE_ISSUE, state: "Todo" };
    vi.spyOn(apiClient, "listIssues").mockResolvedValue([issueInTodo]);
    vi.spyOn(apiClient, "listTickets").mockResolvedValue([]);

    const incomingNotif = {
      id: "notif-1",
      project_id: "proj-1",
      issue_id: issueInTodo.id,
      issue_identifier: issueInTodo.identifier,
      state: "spec", // clé interne du workflow, pas le libellé — résolu via project.states
      severity: "info",
      title: "PROJ-1 : Spec en cours",
      body: "Alexis rédige la spec fonctionnelle.",
      read_at: null,
      created_at: new Date().toISOString(),
    };
    const ssePayload = `data: ${JSON.stringify(incomingNotif)}\n\n`;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/notifications/stream")) {
          return Promise.resolve({ ok: true, body: makeOpenSseStream([ssePayload]) });
        }
        if (url.includes("/notifications")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.reject(new Error(`unexpected fetch: ${url}`));
      })
    );

    render(
      <NotificationsProvider apiKey="alx_xxx">
        <ProjectDetailPage />
      </NotificationsProvider>
    );

    // La notif SSE peut être traitée avant le premier render observable côté
    // test — on n'affirme donc pas un passage transitoire par "todo", juste
    // l'état final : la carte doit finir dans "spec", jamais rester en "todo".
    const specColumn = await screen.findByTestId("kanban-column-spec");
    await waitFor(() => expect(within(specColumn).getByText("Corriger la pagination")).toBeInTheDocument());

    const todoColumn = screen.getByTestId("kanban-column-todo");
    expect(within(todoColumn).queryByText("Corriger la pagination")).not.toBeInTheDocument();
  });
});
