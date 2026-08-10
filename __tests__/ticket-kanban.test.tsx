import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TicketKanban from "@/components/ticket-kanban";
import { DEFAULT_STATES } from "@/lib/project-defaults";
import type { Issue } from "@/lib/api-client";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function makeIssue(overrides: Partial<Issue>): Issue {
  return {
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
    ...overrides,
  };
}

// jsdom ne fournit pas DataTransfer — un faux minimal suffit pour setData/getData.
function fakeDataTransfer() {
  const data: Record<string, string> = {};
  return {
    setData: (k: string, v: string) => { data[k] = v; },
    getData: (k: string) => data[k],
  };
}

function dragAndDrop(card: HTMLElement, column: HTMLElement) {
  const dataTransfer = fakeDataTransfer();
  fireEvent.dragStart(card, { dataTransfer });
  fireEvent.dragOver(column, { dataTransfer });
  fireEvent.drop(column, { dataTransfer });
}

beforeEach(() => {
  push.mockClear();
});

describe("TicketKanban", () => {
  it("renders the 7 primary columns", () => {
    render(<TicketKanban issues={[]} states={DEFAULT_STATES} projectId="p1" onMoveIssue={vi.fn()} />);

    for (const label of ["À planifier", "À faire", "Cadrage", "Conception", "Développement", "Finalisation", "Terminé"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("places each issue in its column by state", () => {
    const issues = [
      makeIssue({ id: "i1", title: "En backlog", state: "Backlog" }),
      makeIssue({ id: "i2", title: "En dev", state: "Dev" }),
      makeIssue({ id: "i3", title: "Termine", state: "Done" }),
    ];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={vi.fn()} />);

    expect(screen.getByText("En backlog")).toBeInTheDocument();
    expect(screen.getByText("En dev")).toBeInTheDocument();
    expect(screen.getByText("Termine")).toBeInTheDocument();
  });

  it("groups review/failed sub-states under their parent column and shows a badge", () => {
    const issues = [makeIssue({ id: "i1", title: "Echec dev", state: "Dev Failed" })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={vi.fn()} />);

    const devColumn = screen.getByTestId("kanban-column-dev");
    expect(devColumn).toHaveTextContent("Echec dev");
    expect(devColumn).toHaveTextContent("Dev Failed");
  });

  it("shows a retry button on a failed ticket that resets it to the trigger state (dev_failed → Dev)", () => {
    const onMoveIssue = vi.fn();
    const issues = [makeIssue({ id: "i1", title: "Echec dev", state: "Dev Failed" })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={onMoveIssue} />);

    fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));

    // dev_failed → trigger = states["dev"] = "Dev" (le step dev se déclenche depuis "Dev")
    expect(onMoveIssue).toHaveBeenCalledWith("i1", "Dev");
  });

  it("retry on spec_failed sends the trigger state 'Todo', not 'Spec'", () => {
    // Régression : avant le fix, le bouton envoyait states["spec"] = "Spec" qui n'est
    // pas un état déclencheur → le poller ne relançait rien. Le step spec se déclenche
    // depuis states["todo"] = "Todo" (cf. _TRIGGER_STATE_KEY dans poller.py).
    const onMoveIssue = vi.fn();
    const issues = [makeIssue({ id: "i1", title: "Echec spec", state: "Spec Failed" })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={onMoveIssue} />);

    fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));

    expect(onMoveIssue).toHaveBeenCalledWith("i1", "Todo");
    expect(onMoveIssue).not.toHaveBeenCalledWith("i1", "Spec");
  });

  it("retry on plan_failed sends the trigger state 'Plan'", () => {
    const onMoveIssue = vi.fn();
    const issues = [makeIssue({ id: "i1", title: "Echec plan", state: "Plan Failed" })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={onMoveIssue} />);

    fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));

    expect(onMoveIssue).toHaveBeenCalledWith("i1", "Plan");
  });

  it("retry on to_merge_failed sends the trigger state 'To Merge'", () => {
    const onMoveIssue = vi.fn();
    const issues = [makeIssue({ id: "i1", title: "Echec merge", state: "To Merge Failed" })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={onMoveIssue} />);

    fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));

    expect(onMoveIssue).toHaveBeenCalledWith("i1", "To Merge");
  });

  it("does not show a retry button on a ticket that isn't in a failed sub-state", () => {
    const issues = [makeIssue({ id: "i1", title: "En revue", state: "Dev Review" })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /réessayer/i })).not.toBeInTheDocument();
  });

  it("clicking retry does not navigate to the issue detail page", () => {
    const issues = [makeIssue({ id: "i1", title: "Echec dev", state: "Dev Failed" })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));

    expect(push).not.toHaveBeenCalled();
  });

  it("shows a confirmation message after clicking retry, which disappears after a few seconds", async () => {
    vi.useFakeTimers();
    try {
      const issues = [makeIssue({ id: "i1", title: "Echec dev", state: "Dev Failed" })];
      render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={vi.fn()} />);

      expect(screen.queryByText(/relancé/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));
      expect(screen.getByText(/relancé/i)).toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(2500);
      expect(screen.queryByText(/relancé/i)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to the Backlog column for an unrecognized state label", () => {
    const issues = [makeIssue({ id: "i1", title: "Etat inconnu", state: "Some Custom State" })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={vi.fn()} />);

    expect(screen.getByTestId("kanban-column-backlog")).toHaveTextContent("Etat inconnu");
  });

  it("shows an empty-state message when there are no tickets at all", () => {
    render(<TicketKanban issues={[]} states={DEFAULT_STATES} projectId="p1" onMoveIssue={vi.fn()} />);
    expect(screen.getByText("Aucune demande pour le moment.")).toBeInTheDocument();
  });

  it("navigates to the issue detail page when a card is clicked", () => {
    const issues = [makeIssue({ id: "i1", title: "Corriger la pagination" })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="proj-1" onMoveIssue={vi.fn()} />);

    fireEvent.click(screen.getByText("Corriger la pagination"));
    expect(push).toHaveBeenCalledWith("/dashboard/proj-1/issues/i1");
  });

  it("calls onMoveIssue with the target column's state label when a card is dropped there", () => {
    const onMoveIssue = vi.fn();
    const issues = [makeIssue({ id: "i1", title: "A trier", state: "Backlog" })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={onMoveIssue} />);

    dragAndDrop(screen.getByText("A trier"), screen.getByTestId("kanban-column-todo"));

    expect(onMoveIssue).toHaveBeenCalledWith("i1", "Todo");
  });

  it("does not call onMoveIssue when a card is dropped on its own current column", () => {
    const onMoveIssue = vi.fn();
    const issues = [makeIssue({ id: "i1", title: "Deja backlog", state: "Backlog" })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={onMoveIssue} />);

    dragAndDrop(screen.getByText("Deja backlog"), screen.getByTestId("kanban-column-backlog"));

    expect(onMoveIssue).not.toHaveBeenCalled();
  });

  it("moves a ticket via the Déplacer select — accessible alternative to drag (touch, keyboard, screen reader)", () => {
    const onMoveIssue = vi.fn();
    const issues = [makeIssue({ id: "i1", title: "A trier", state: "Backlog" })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={onMoveIssue} />);

    fireEvent.change(screen.getByLabelText("Déplacer PROJ-1"), { target: { value: "todo" } });

    expect(onMoveIssue).toHaveBeenCalledWith("i1", "Todo");
  });

  it("does not call onMoveIssue when the select is set back to the current column", () => {
    const onMoveIssue = vi.fn();
    const issues = [makeIssue({ id: "i1", title: "Deja backlog", state: "Backlog" })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={onMoveIssue} />);

    fireEvent.change(screen.getByLabelText("Déplacer PROJ-1"), { target: { value: "backlog" } });

    expect(onMoveIssue).not.toHaveBeenCalled();
  });

  it("clicking or changing the move select does not navigate to the issue detail page", () => {
    const issues = [makeIssue({ id: "i1", title: "A trier", state: "Backlog" })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Déplacer PROJ-1"), { target: { value: "todo" } });

    expect(push).not.toHaveBeenCalled();
  });

  it("shows a PR link and cost badge when ticket data matches the issue", () => {
    const issues = [makeIssue({ id: "i1", identifier: "KARA-1", title: "Avec PR", state: "Dev" })];
    render(
      <TicketKanban
        issues={issues}
        states={DEFAULT_STATES}
        projectId="p1"
        onMoveIssue={vi.fn()}
        ticketsByIdentifier={{
          "KARA-1": { pr_url: "https://github.com/acme/kara/pull/9", pr_title: "PR", cost_usd: 0.39 },
        }}
      />
    );

    const prLink = screen.getByRole("link", { name: /voir les modifications/i });
    expect(prLink).toHaveAttribute("href", "https://github.com/acme/kara/pull/9");
    expect(screen.getByText("$0.3900")).toBeInTheDocument();
  });

  it("clicking the PR link does not navigate to the issue detail page", () => {
    const issues = [makeIssue({ id: "i1", identifier: "KARA-1", title: "Avec PR", state: "Dev" })];
    render(
      <TicketKanban
        issues={issues}
        states={DEFAULT_STATES}
        projectId="p1"
        onMoveIssue={vi.fn()}
        ticketsByIdentifier={{
          "KARA-1": { pr_url: "https://github.com/acme/kara/pull/9", pr_title: "PR", cost_usd: 0.39 },
        }}
      />
    );

    fireEvent.click(screen.getByRole("link", { name: /voir les modifications/i }));
    expect(push).not.toHaveBeenCalled();
  });
});

describe("TicketKanban — badges audit", () => {
  it("affiche le badge Sécurité sur une carte avec le label 'Sécurité'", () => {
    const issues = [makeIssue({ id: "i1", title: "Clés exposées", state: "Backlog", labels: ["Sécurité", "À affiner"] })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={vi.fn()} />);

    expect(screen.getByText("Sécurité")).toBeInTheDocument();
    expect(screen.getByText("À affiner")).toBeInTheDocument();
  });

  it("affiche le badge RGPD sur une carte avec le label 'RGPD'", () => {
    const issues = [makeIssue({ id: "i1", title: "Rétention données", state: "Backlog", labels: ["RGPD"] })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={vi.fn()} />);

    expect(screen.getByText("RGPD")).toBeInTheDocument();
  });

  it("affiche le badge Accessibilité sur une carte avec le label 'Accessibilité'", () => {
    const issues = [makeIssue({ id: "i1", title: "Contraste insuffisant", state: "Backlog", labels: ["Accessibilité"] })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={vi.fn()} />);

    expect(screen.getByText("Accessibilité")).toBeInTheDocument();
  });

  it("n'affiche pas de badge audit si les labels ne contiennent pas de catégorie audit", () => {
    const issues = [makeIssue({ id: "i1", title: "Feature normale", state: "Backlog", labels: ["feature"] })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={vi.fn()} />);

    expect(screen.queryByText("Sécurité")).not.toBeInTheDocument();
    expect(screen.queryByText("RGPD")).not.toBeInTheDocument();
    expect(screen.queryByText("Accessibilité")).not.toBeInTheDocument();
    expect(screen.queryByText("À affiner")).not.toBeInTheDocument();
  });

  it("peut afficher simultanément un badge type (feature) et un badge audit (Sécurité)", () => {
    const issues = [makeIssue({ id: "i1", title: "Ticket mixte", state: "Backlog", labels: ["feature", "Sécurité", "À affiner"] })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={vi.fn()} />);

    expect(screen.getByText("Évolution")).toBeInTheDocument();
    expect(screen.getByText("Sécurité")).toBeInTheDocument();
    expect(screen.getByText("À affiner")).toBeInTheDocument();
  });
});
