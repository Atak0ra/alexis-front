/**
 * Tests du hook useNotifications.
 *
 * Couvre :
 *   - chargement initial via fetch REST
 *   - unreadCount calculé correctement
 *   - markRead met à jour l'état optimistiquement
 *   - markAllRead met à jour tous les non-lus
 *   - SSE : nouvelle notif prépendée à la liste
 *   - SSE : heartbeat ping ignoré
 *   - SSE : déduplique les notifications déjà présentes
 *   - fallback polling si SSE échoue (setInterval déclenché)
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useNotifications, type Notification } from "@/hooks/use-notifications";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeNotif(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notif-1",
    project_id: "proj-1",
    issue_id: "issue-1",
    issue_identifier: "PROJ-1",
    state: "spec_review",
    severity: "success",
    title: "PROJ-1 : Spec prête à revoir",
    body: "La spec est prête pour relecture.",
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ReadableStream minimal pour simuler SSE
function makeSseStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let idx = 0;
  return new ReadableStream({
    pull(controller) {
      if (idx < events.length) {
        controller.enqueue(encoder.encode(events[idx++]));
      } else {
        // Garder le stream ouvert (ne pas fermer) pour éviter que le hook
        // ne bascule en polling après la fin du stream.
        // On ferme seulement quand tous les events ont été envoyés.
        controller.close();
      }
    },
  });
}

// SSE stream qui reste ouvert indéfiniment (simule une connexion longue durée)
function makeOpenSseStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let idx = 0;
  return new ReadableStream({
    pull(controller) {
      if (idx < events.length) {
        controller.enqueue(encoder.encode(events[idx++]));
      }
      // Ne pas fermer → stream reste ouvert
    },
  });
}

const API_KEY = "test-api-key";

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useNotifications", () => {
  it("charge la liste initiale et calcule unreadCount", async () => {
    const notifs = [
      makeNotif({ id: "1", read_at: null }),
      makeNotif({ id: "2", read_at: new Date().toISOString() }),
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if ((url as string).includes("/notifications/stream")) {
          return Promise.resolve({ ok: false, body: null });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(notifs),
        });
      })
    );

    const { result } = renderHook(() => useNotifications(API_KEY));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
  });

  it("retourne une liste vide si apiKey est null", async () => {
    const { result } = renderHook(() => useNotifications(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.unreadCount).toBe(0);
  });

  it("markRead met à jour read_at optimistiquement", async () => {
    const notif = makeNotif({ id: "n1", read_at: null });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if ((url as string).includes("/stream")) return Promise.resolve({ ok: false, body: null });
        if ((opts?.method ?? "GET") === "POST") return Promise.resolve({ ok: true });
        return Promise.resolve({ ok: true, json: () => Promise.resolve([notif]) });
      })
    );

    const { result } = renderHook(() => useNotifications(API_KEY));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.unreadCount).toBe(1);

    await act(async () => {
      await result.current.markRead("n1");
    });

    expect(result.current.notifications[0].read_at).not.toBeNull();
    expect(result.current.unreadCount).toBe(0);
  });

  it("markAllRead marque toutes les notifs non-lues", async () => {
    const notifs = [
      makeNotif({ id: "a", read_at: null }),
      makeNotif({ id: "b", read_at: null }),
      makeNotif({ id: "c", read_at: new Date().toISOString() }),
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if ((url as string).includes("/stream")) return Promise.resolve({ ok: false, body: null });
        if ((opts?.method ?? "GET") === "POST") return Promise.resolve({ ok: true });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(notifs) });
      })
    );

    const { result } = renderHook(() => useNotifications(API_KEY));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.unreadCount).toBe(2);

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((n: Notification) => n.read_at !== null)).toBe(true);
  });

  it("SSE : prépend une nouvelle notification reçue", async () => {
    const initial = makeNotif({ id: "old", created_at: new Date(Date.now() - 5000).toISOString() });
    const incoming = makeNotif({ id: "new-sse", title: "Nouvelle notif SSE" });
    const ssePayload = `data: ${JSON.stringify(incoming)}\n\n`;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if ((url as string).includes("/stream")) {
          return Promise.resolve({
            ok: true,
            body: makeOpenSseStream([ssePayload]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([initial]),
        });
      })
    );

    const { result } = renderHook(() => useNotifications(API_KEY));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Attendre que le SSE soit traité
    await waitFor(
      () => expect(result.current.notifications.some((n: Notification) => n.id === "new-sse")).toBe(true),
      { timeout: 3000 }
    );

    expect(result.current.notifications[0].id).toBe("new-sse");
    expect(result.current.notifications[1].id).toBe("old");
  });

  it("SSE : heartbeat ping est ignoré", async () => {
    const initial = makeNotif({ id: "x" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if ((url as string).includes("/stream")) {
          return Promise.resolve({
            ok: true,
            body: makeOpenSseStream(["data: ping\n\n"]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([initial]),
        });
      })
    );

    const { result } = renderHook(() => useNotifications(API_KEY));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Attendre un peu que le SSE soit traité
    await new Promise((r) => setTimeout(r, 100));

    // Après le ping, la liste ne doit pas changer
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].id).toBe("x");
  });

  it("SSE : déduplique les notifications déjà présentes", async () => {
    const notif = makeNotif({ id: "dup" });
    const ssePayload = `data: ${JSON.stringify(notif)}\n\n`;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if ((url as string).includes("/stream")) {
          return Promise.resolve({
            ok: true,
            body: makeOpenSseStream([ssePayload]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([notif]),
        });
      })
    );

    const { result } = renderHook(() => useNotifications(API_KEY));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Attendre que le SSE soit traité
    await new Promise((r) => setTimeout(r, 200));

    // Toujours 1 seule notif (pas de doublon)
    expect(result.current.notifications).toHaveLength(1);
  });

  it("fallback polling : setInterval est démarré si SSE échoue", async () => {
    const initial = makeNotif({ id: "p1" });

    // Espionner setInterval pour vérifier qu'il est appelé
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if ((url as string).includes("/stream")) {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([initial]) });
      })
    );

    const { result } = renderHook(() => useNotifications(API_KEY));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Attendre que le SSE échoue et que le polling démarre
    await waitFor(() => expect(setIntervalSpy).toHaveBeenCalled(), { timeout: 3000 });

    expect(result.current.notifications).toHaveLength(1);
  });
});
