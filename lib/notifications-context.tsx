"use client";

/**
 * NotificationsContext — partage un seul flux useNotifications (SSE + fallback
 * polling) entre la cloche du header et les pages qui ont besoin de savoir
 * qu'un ticket a changé d'état (ex: le Kanban projet).
 *
 * Sans ce contexte, chaque consommateur ouvrirait sa propre connexion SSE ;
 * pire, les pages qui chargent leur liste d'issues une seule fois au mount
 * (listIssues) n'ont aucun moyen de savoir qu'un ticket a bougé côté backend
 * tant qu'elles ne rechargent pas — le Kanban reste figé sur le snapshot
 * initial même quand les notifs arrivent en temps réel dans la cloche.
 */

import { createContext, useContext, type ReactNode } from "react";
import { useNotifications, type Notification } from "@/hooks/use-notifications";

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

// Valeur par défaut hors provider : pages/tests rendus sans DashboardLayout
// (ex: rendu isolé en test) continuent de fonctionner, juste sans mise à jour
// temps réel — dégradation silencieuse plutôt que crash, cohérent avec le
// reste du hook (fallback polling, PUBLISH Redis best-effort, etc.).
const FALLBACK_VALUE: NotificationsContextValue = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  markRead: async () => {},
  markAllRead: async () => {},
};

const NotificationsContext = createContext<NotificationsContextValue>(FALLBACK_VALUE);

export function NotificationsProvider({
  apiKey,
  children,
}: {
  apiKey: string | null;
  children: ReactNode;
}) {
  const value = useNotifications(apiKey);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotificationsContext(): NotificationsContextValue {
  return useContext(NotificationsContext);
}
