"use client";

/**
 * NotificationPanel — dropdown liste des notifications.
 *
 * - Affiche les 50 dernières notifications (les plus récentes en premier).
 * - Les non-lues ont un fond légèrement coloré.
 * - Cliquer sur une notif la marque comme lue.
 * - Bouton "Tout marquer comme lu" en haut à droite.
 * - Icône de sévérité : ✅ success, ❌ error, ℹ️ info.
 * - Deep-link vers l'issue si issue_identifier est présent.
 */

import { CheckCheck, X } from "lucide-react";
import { type Notification } from "@/hooks/use-notifications";

interface NotificationPanelProps {
  notifications: Notification[];
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  onClose: () => void;
}

function severityIcon(severity: Notification["severity"]): string {
  if (severity === "success") return "✅";
  if (severity === "error") return "❌";
  return "ℹ️";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export function NotificationPanel({
  notifications,
  loading,
  markRead,
  markAllRead,
  onClose,
}: NotificationPanelProps) {
  const unread = notifications.filter((n) => n.read_at === null).length;

  return (
    <div
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-surface shadow-lg sm:w-96"
    >
      {/* En-tête */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          Notifications
          {unread > 0 && (
            <span className="ml-2 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              title="Tout marquer comme lu"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground-muted hover:bg-surface-hover hover:text-foreground transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tout lire
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-md p-1 text-foreground-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Corps */}
      <ul
        className="max-h-[420px] overflow-y-auto divide-y divide-border"
        aria-label="Liste des notifications"
      >
        {loading && (
          <li className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-brand" />
          </li>
        )}

        {!loading && notifications.length === 0 && (
          <li className="py-10 text-center text-sm text-foreground-muted">
            Aucune notification
          </li>
        )}

        {!loading &&
          notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  if (n.read_at === null) markRead(n.id);
                }}
                className={[
                  "w-full px-4 py-3 text-left transition-colors hover:bg-surface-hover",
                  n.read_at === null ? "bg-brand/5" : "",
                ].join(" ")}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-base leading-none" aria-hidden="true">
                    {severityIcon(n.severity)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {n.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-foreground-muted">
                      {n.body}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      {n.issue_identifier && (
                        <span className="rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-mono text-foreground-muted">
                          {n.issue_identifier}
                        </span>
                      )}
                      <span className="text-[10px] text-foreground-muted">
                        {relativeTime(n.created_at)}
                      </span>
                    </div>
                  </div>
                  {n.read_at === null && (
                    <span
                      aria-label="Non lu"
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand"
                    />
                  )}
                </div>
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
