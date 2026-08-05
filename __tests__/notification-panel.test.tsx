/**
 * Tests du NotificationPanel.
 *
 * Couvre :
 *   - regroupement par période affiché (Aujourd'hui / Cette semaine / Plus ancien)
 *   - clic sur une notif non lue → markRead appelé
 *   - clic sur une notif déjà lue → markRead non appelé
 *   - clic sur le tag d'issue → n'appelle pas markRead (stopPropagation)
 *   - lien d'issue pointe vers /dashboard/{project_id}/issues/{issue_id}
 *   - état vide affiché quand la liste est vide
 *   - Tout marquer comme lu déclenche markAllRead
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NotificationPanel } from "@/components/notification-panel";
import { type Notification } from "@/hooks/use-notifications";

function makeNotif(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notif-1",
    project_id: "proj-1",
    issue_id: "issue-1",
    issue_identifier: "KARA-1",
    state: "spec_review",
    severity: "success",
    title: "Déploiement réussi",
    body: "KARA-1 a été déployé en production.",
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("NotificationPanel", () => {
  it("regroupe les notifications par période", () => {
    const notifications = [
      makeNotif({ id: "a", created_at: new Date().toISOString() }),
      makeNotif({ id: "b", created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }),
    ];

    render(
      <NotificationPanel
        notifications={notifications}
        loading={false}
        markRead={vi.fn()}
        markAllRead={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Aujourd'hui")).toBeInTheDocument();
    expect(screen.getByText("Plus ancien")).toBeInTheDocument();
  });

  it("marque comme lu au clic sur une notif non lue", () => {
    const markRead = vi.fn();
    const notifications = [makeNotif({ id: "a", read_at: null })];

    render(
      <NotificationPanel
        notifications={notifications}
        loading={false}
        markRead={markRead}
        markAllRead={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Déploiement réussi/ }));
    expect(markRead).toHaveBeenCalledWith("a");
  });

  it("n'appelle pas markRead au clic sur une notif déjà lue", () => {
    const markRead = vi.fn();
    const notifications = [makeNotif({ id: "a", read_at: new Date().toISOString() })];

    render(
      <NotificationPanel
        notifications={notifications}
        loading={false}
        markRead={markRead}
        markAllRead={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Déploiement réussi/ }));
    expect(markRead).not.toHaveBeenCalled();
  });

  it("le tag d'issue pointe vers la page de l'issue et ne marque pas lu au clic", () => {
    const markRead = vi.fn();
    const notifications = [makeNotif({ id: "a", read_at: null, project_id: "proj-9", issue_id: "issue-9" })];

    render(
      <NotificationPanel
        notifications={notifications}
        loading={false}
        markRead={markRead}
        markAllRead={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const issueLink = screen.getByRole("link", { name: "KARA-1" });
    expect(issueLink).toHaveAttribute("href", "/dashboard/proj-9/issues/issue-9");

    fireEvent.click(issueLink);
    expect(markRead).not.toHaveBeenCalled();
  });

  it("affiche l'état vide quand il n'y a aucune notification", () => {
    render(
      <NotificationPanel
        notifications={[]}
        loading={false}
        markRead={vi.fn()}
        markAllRead={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Tu es à jour")).toBeInTheDocument();
  });

  it("déclenche markAllRead au clic sur « Tout lire »", () => {
    const markAllRead = vi.fn();
    const notifications = [makeNotif({ id: "a", read_at: null })];

    render(
      <NotificationPanel
        notifications={notifications}
        loading={false}
        markRead={vi.fn()}
        markAllRead={markAllRead}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Tout lire/ }));
    expect(markAllRead).toHaveBeenCalled();
  });
});
