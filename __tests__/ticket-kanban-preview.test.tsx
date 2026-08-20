/**
 * Tests du bouton « Voir le résultat » dans TicketKanban.
 * Couvre : rendu conditionnel, déclenchement de la preview, états building/live/failed.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import TicketKanban from "@/components/ticket-kanban";
import type { Issue } from "@/lib/api-client";

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/lib/api-client", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...orig,
    startPreview: vi.fn().mockResolvedValue({ status: "building" }),
    getPreviewStatus: vi.fn().mockResolvedValue({ status: "live", url: "https://test.preview.alexis.compeel.com", error: null }),
  };
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

const DEFAULT_STATES: Record<string, string> = {
  backlog: "Backlog", todo: "Todo", spec: "Spec", spec_review: "Spec Review",
  spec_failed: "Spec Failed", plan: "Plan", plan_review: "Plan Review",
  plan_failed: "Plan Failed", dev: "Dev", dev_review: "Dev Review",
  dev_failed: "Dev Failed", to_merge: "To Merge", to_merge_failed: "To Merge Failed",
  done: "Done",
};

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "issue-1",
    identifier: "PROJ-1",
    number: 1,
    title: "Test ticket",
    description: "",
    state: "Dev Review",
    labels: [],
    origin: "human",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    comments: [],
    ...overrides,
  };
}

function makeTickets(overrides = {}) {
  return {
    "PROJ-1": {
      pr_url: "https://github.com/test/repo/pull/1",
      pr_title: "PROJ-1: Add feature",
      cost_usd: 0.05,
      error_message: null,
      error_hint: null,
      chat_active: false,
      preview_url: null,
      preview_status: null,
      project_preview_active: false,
      ...overrides,
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("TicketKanban — bouton « Voir le résultat »", () => {
  const baseProps = {
    issues: [makeIssue()],
    states: DEFAULT_STATES,
    projectId: "proj-123",
    apiKey: "test-api-key",
    onMoveIssue: vi.fn(),
  };

  it("affiche le bouton « Voir le résultat » quand pr_url est présente et preview non démarrée", () => {
    render(<TicketKanban {...baseProps} ticketsByIdentifier={makeTickets()} />);
    expect(screen.getByText("Voir le résultat")).toBeInTheDocument();
  });

  it("n'affiche pas le bouton si pr_url est null", () => {
    render(
      <TicketKanban
        {...baseProps}
        ticketsByIdentifier={makeTickets({ pr_url: null })}
      />
    );
    expect(screen.queryByText("Voir le résultat")).not.toBeInTheDocument();
  });

  it("affiche « Préparation… » quand preview_status=building (chargé depuis l'API)", () => {
    render(
      <TicketKanban
        {...baseProps}
        ticketsByIdentifier={makeTickets({ preview_status: "building" })}
      />
    );
    expect(screen.getByText("Préparation…")).toBeInTheDocument();
    expect(screen.queryByText("Voir le résultat")).not.toBeInTheDocument();
  });

  it("affiche un lien « Voir le résultat ↗ » quand preview_status=live", () => {
    render(
      <TicketKanban
        {...baseProps}
        ticketsByIdentifier={makeTickets({
          preview_status: "live",
          preview_url: "https://mon-projet.preview.alexis.compeel.com",
        })}
      />
    );
    const link = screen.getByRole("link", { name: /Voir le résultat/i });
    expect(link).toHaveAttribute("href", "https://mon-projet.preview.alexis.compeel.com");
  });

  it("appelle startPreview au clic sur le bouton", async () => {
    const { startPreview } = await import("@/lib/api-client");
    render(<TicketKanban {...baseProps} ticketsByIdentifier={makeTickets()} />);
    const btn = screen.getByText("Voir le résultat");
    await act(async () => { fireEvent.click(btn); });
    expect(startPreview).toHaveBeenCalledWith("test-api-key", "proj-123", "PROJ-1");
  });

  it("affiche « Voir le résultat ↺ » (retry) quand preview_status=failed", () => {
    render(
      <TicketKanban
        {...baseProps}
        ticketsByIdentifier={makeTickets({ preview_status: "failed", preview_url: null })}
      />
    );
    expect(screen.getByText(/Voir le résultat ↺/)).toBeInTheDocument();
  });

  it("affiche « Aperçu de la tâche » grisé quand project_preview_active=true", () => {
    render(
      <TicketKanban
        {...baseProps}
        ticketsByIdentifier={makeTickets({ project_preview_active: true })}
      />
    );
    expect(screen.getByText("Aperçu de la tâche")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Voir le résultat/ })).not.toBeInTheDocument();
  });

  it("affiche « Aperçu pas encore disponible » quand pr_url est null", () => {
    render(
      <TicketKanban
        {...baseProps}
        ticketsByIdentifier={makeTickets({ pr_url: null })}
      />
    );
    expect(screen.getByText("Aperçu pas encore disponible")).toBeInTheDocument();
  });
});
