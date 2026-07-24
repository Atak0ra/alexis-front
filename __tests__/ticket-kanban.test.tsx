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

    for (const label of ["Backlog", "Todo", "Spec", "Plan", "Dev", "To Merge", "Done"]) {
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

  it("shows a retry button on a failed ticket that resets it to the column's primary state", () => {
    const onMoveIssue = vi.fn();
    const issues = [makeIssue({ id: "i1", title: "Echec dev", state: "Dev Failed" })];
    render(<TicketKanban issues={issues} states={DEFAULT_STATES} projectId="p1" onMoveIssue={onMoveIssue} />);

    fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));

    expect(onMoveIssue).toHaveBeenCalledWith("i1", "Dev");
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

  it("shows a PR link and cost badge when ticket data matches the issue", () => {
    const issues = [makeIssue({ id: "i1", identifier: "KARA-1", title: "Avec PR", state: "Dev" })];
    render(
      <TicketKanban
        issues={issues}
        states={DEFAULT_STATES}
        projectId="p1"
        onMoveIssue={vi.fn()}
        ticketsByIdentifier={{
          "KARA-1": { pr_url: "https://github.com/acme/kara/pull/9", pr_title: "PR", cost_usd: 0.42 },
        }}
      />
    );

    const prLink = screen.getByRole("link", { name: /voir la pr/i });
    expect(prLink).toHaveAttribute("href", "https://github.com/acme/kara/pull/9");
    expect(screen.getByText("$0.42")).toBeInTheDocument();
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
          "KARA-1": { pr_url: "https://github.com/acme/kara/pull/9", pr_title: "PR", cost_usd: 0.42 },
        }}
      />
    );

    fireEvent.click(screen.getByRole("link", { name: /voir la pr/i }));
    expect(push).not.toHaveBeenCalled();
  });
});
