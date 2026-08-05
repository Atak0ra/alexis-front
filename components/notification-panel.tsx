"use client";

/**
 * NotificationPanel — dropdown liste des notifications.
 *
 * - Affiche les 50 dernières notifications (les plus récentes en premier),
 *   regroupées par période (Aujourd'hui / Cette semaine / Plus ancien).
 * - Un liseré coloré par sévérité encode aussi l'état lu/non-lu (pleine
 *   opacité si non lu, estompé sinon) : un seul élément pour deux signaux.
 * - Cliquer sur une notif la marque comme lue.
 * - Cliquer sur l'identifiant de l'issue navigue vers l'issue (sans marquer
 *   comme lu implicitement autre chose que cette notif).
 * - Bouton "Tout marquer comme lu" en haut à droite.
 * - Navigation clavier : ↑/↓ déplacent le focus entre les lignes, Entrée/
 *   Espace marque comme lu. Échap est géré par le parent (NotificationBell).
 */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CheckCheck, CheckCircle2, Inbox, Info, X, XCircle } from "lucide-react";
import { type Notification } from "@/hooks/use-notifications";
import { groupByRecency } from "@/lib/notification-grouping";

interface NotificationPanelProps {
  notifications: Notification[];
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  onClose: () => void;
}

const SEVERITY_STYLES: Record<
  Notification["severity"],
  { rail: string; chipBg: string; chipFg: string; Icon: typeof Info }
> = {
  success: { rail: "bg-success", chipBg: "bg-success-bg", chipFg: "text-success", Icon: CheckCircle2 },
  error: { rail: "bg-danger", chipBg: "bg-danger-bg", chipFg: "text-danger", Icon: XCircle },
  info: { rail: "bg-brand", chipBg: "bg-brand-light", chipFg: "text-brand", Icon: Info },
};

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

function NotificationRow({
  notification: n,
  focusable,
  rowRef,
  onMarkRead,
  onKeyDown,
}: {
  notification: Notification;
  focusable: boolean;
  rowRef: (el: HTMLDivElement | null) => void;
  onMarkRead: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const unread = n.read_at === null;
  const { rail, chipBg, chipFg, Icon } = SEVERITY_STYLES[n.severity];
  const issueHref = n.project_id && n.issue_id ? `/dashboard/${n.project_id}/issues/${n.issue_id}` : null;

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={focusable ? 0 : -1}
      aria-label={`${n.title}${unread ? " (non lu)" : ""}`}
      onClick={() => {
        if (unread) onMarkRead();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (unread) onMarkRead();
        }
        onKeyDown(e);
      }}
      className="group flex cursor-pointer items-stretch outline-none focus-visible:bg-surface-hover"
    >
      <span
        aria-hidden="true"
        className={["my-1.5 w-[3px] shrink-0 rounded-full transition-opacity", rail, unread ? "opacity-100" : "opacity-20"].join(" ")}
      />
      <div className="flex min-w-0 flex-1 items-start gap-2.5 py-2.5 pl-2.5 pr-4 transition-colors group-hover:bg-surface-hover">
        <span
          aria-hidden="true"
          className={["mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md", chipBg, chipFg].join(" ")}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={["truncate text-sm", unread ? "font-semibold text-foreground" : "font-medium text-foreground-muted"].join(" ")}>
            {n.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-foreground-muted">{n.body}</p>
          <div className="mt-1 flex items-center gap-2">
            {n.issue_identifier &&
              (issueHref ? (
                <Link
                  href={issueHref}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-[10px] text-brand hover:underline"
                >
                  {n.issue_identifier}
                </Link>
              ) : (
                <span className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted">
                  {n.issue_identifier}
                </span>
              ))}
            <span className="text-[10px] text-foreground-muted">{relativeTime(n.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationPanel({
  notifications,
  loading,
  markRead,
  markAllRead,
  onClose,
}: NotificationPanelProps) {
  const unread = notifications.filter((n) => n.read_at === null).length;
  const groups = groupByRecency(notifications);
  const rowRefs = useRef<HTMLDivElement[]>([]);
  rowRefs.current = [];

  // Focus la première ligne à l'ouverture, pour permettre une navigation
  // clavier immédiate sans devoir tabuler jusque-là.
  useEffect(() => {
    rowRefs.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function registerRow(el: HTMLDivElement | null) {
    if (el) rowRefs.current.push(el);
  }

  function focusRowAt(index: number) {
    const target = rowRefs.current[index];
    if (target) target.focus();
  }

  function handleRowKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusRowAt(Math.min(index + 1, rowRefs.current.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusRowAt(Math.max(index - 1, 0));
    }
  }

  let rowIndex = -1;

  return (
    <div
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-11 z-50 w-[21rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-surface-raised shadow-lg"
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
      <div className="max-h-[420px] overflow-y-auto" aria-label="Liste des notifications">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-brand" />
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Inbox className="h-6 w-6 text-foreground-muted opacity-60" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">Tu es à jour</p>
            <p className="text-xs text-foreground-muted">Les nouvelles notifications apparaîtront ici.</p>
          </div>
        )}

        {!loading &&
          groups.map((group) => (
            <div key={group.label}>
              <p className="px-4 pb-1 pt-2.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
                {group.label}
              </p>
              <div className="divide-y divide-border">
                {group.items.map((n) => {
                  rowIndex += 1;
                  const index = rowIndex;
                  return (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      focusable={index === 0}
                      rowRef={registerRow}
                      onMarkRead={() => markRead(n.id)}
                      onKeyDown={(e) => handleRowKeyDown(index, e)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
