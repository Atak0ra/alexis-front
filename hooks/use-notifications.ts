"use client";

/**
 * useNotifications — hook SSE + fallback polling pour les notifications.
 *
 * Stratégie :
 *   1. Charge la liste initiale via GET /notifications (REST).
 *   2. Ouvre un flux SSE GET /notifications/stream.
 *      - Chaque événement SSE `data: <json>` est prépendé à la liste.
 *      - Les heartbeats `data: ping` sont ignorés.
 *   3. Si SSE échoue (réseau, Redis indisponible), bascule sur un polling
 *      REST toutes les POLL_INTERVAL_MS millisecondes.
 *   4. Expose markRead(id) et markAllRead() qui appellent l'API REST et
 *      mettent à jour l'état local optimistiquement.
 *
 * Usage :
 *   const { notifications, unreadCount, markRead, markAllRead, loading } =
 *     useNotifications(apiKey);
 */

import { useCallback, useEffect, useRef, useState } from "react";

const API_URL = process.env.SERVER_API_URL ?? "http://localhost:8000";
const POLL_INTERVAL_MS = 30_000; // fallback polling toutes les 30 s
const MAX_NOTIFICATIONS = 50;    // on garde les 50 plus récentes en mémoire

export interface Notification {
  id: string;
  project_id: string | null;
  issue_id: string | null;
  issue_identifier: string | null;
  state: string;
  severity: "info" | "success" | "error";
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(apiKey: string | null): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  // ── Chargement initial ──────────────────────────────────────────────────────
  const fetchInitial = useCallback(async () => {
    if (!apiKey) return;
    try {
      const resp = await fetch(`${API_URL}/notifications?limit=50`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!resp.ok) return;
      const data: Notification[] = await resp.json();
      if (mountedRef.current) {
        setNotifications(data);
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) setLoading(false);
    }
  }, [apiKey]);

  // ── Polling fallback ────────────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    if (pollRef.current) return; // déjà en cours
    pollRef.current = setInterval(async () => {
      if (!apiKey || !mountedRef.current) return;
      try {
        const resp = await fetch(`${API_URL}/notifications?limit=50`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!resp.ok) return;
        const data: Notification[] = await resp.json();
        if (mountedRef.current) setNotifications(data);
      } catch {
        // best-effort
      }
    }, POLL_INTERVAL_MS);
  }, [apiKey]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ── SSE ─────────────────────────────────────────────────────────────────────
  const openSSE = useCallback(() => {
    if (!apiKey || esRef.current) return;

    // EventSource ne supporte pas les headers custom — on passe la clé en
    // query param (le backend lit Authorization: Bearer <token> en header,
    // mais pour SSE on utilise un token dans l'URL via un proxy ou on accepte
    // le query param). Ici on utilise un workaround : fetch + ReadableStream
    // pour les navigateurs modernes, avec fallback EventSource natif.
    //
    // Implémentation simplifiée : fetch streaming (compatible Chrome/Firefox/Safari).
    const controller = new AbortController();

    (async () => {
      try {
        const resp = await fetch(`${API_URL}/notifications/stream`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
        });

        if (!resp.ok || !resp.body) {
          // SSE indisponible → polling
          startPolling();
          return;
        }

        stopPolling(); // SSE actif, pas besoin de polling

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done || !mountedRef.current) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "ping" || payload === "") continue;
            try {
              const notif: Notification = JSON.parse(payload);
              if (mountedRef.current) {
                setNotifications((prev) => {
                  // Dédupliquer par id
                  const exists = prev.some((n) => n.id === notif.id);
                  if (exists) return prev;
                  return [notif, ...prev].slice(0, MAX_NOTIFICATIONS);
                });
              }
            } catch {
              // JSON invalide — ignorer
            }
          }
        }
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === "AbortError") return;
        // Erreur réseau → fallback polling
        if (mountedRef.current) startPolling();
      }
    })();

    // Stocker le controller pour pouvoir annuler
    esRef.current = { close: () => controller.abort() } as unknown as EventSource;
  }, [apiKey, startPolling, stopPolling]);

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    if (!apiKey) {
      setLoading(false);
      return;
    }
    fetchInitial().then(() => openSSE());

    return () => {
      mountedRef.current = false;
      esRef.current?.close();
      esRef.current = null;
      stopPolling();
    };
  }, [apiKey, fetchInitial, openSSE, stopPolling]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const markRead = useCallback(
    async (id: string) => {
      if (!apiKey) return;
      // Optimiste
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      try {
        await fetch(`${API_URL}/notifications/${id}/read`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
        });
      } catch {
        // best-effort — l'état optimiste reste
      }
    },
    [apiKey]
  );

  const markAllRead = useCallback(async () => {
    if (!apiKey) return;
    const now = new Date().toISOString();
    // Optimiste
    setNotifications((prev) =>
      prev.map((n) => (n.read_at === null ? { ...n, read_at: now } : n))
    );
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
    } catch {
      // best-effort
    }
  }, [apiKey]);

  return { notifications, unreadCount, loading, markRead, markAllRead };
}
