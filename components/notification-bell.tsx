"use client";

/**
 * NotificationBell — icône cloche avec badge de compteur non-lu.
 *
 * Clique → ouvre/ferme le NotificationPanel.
 * Le badge disparaît quand unreadCount === 0.
 */

import { Bell } from "lucide-react";
import { type Notification } from "@/hooks/use-notifications";
import { NotificationPanel } from "./notification-panel";
import { useRef, useState, useEffect } from "react";

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function NotificationBell({
  notifications,
  unreadCount,
  loading,
  markRead,
  markAllRead,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer le panel si clic en dehors
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
            : "Notifications"
        }
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand px-0.5 text-[10px] font-bold leading-none text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationPanel
          notifications={notifications}
          loading={loading}
          markRead={async (id) => {
            await markRead(id);
          }}
          markAllRead={async () => {
            await markAllRead();
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
