"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getApiKey } from "@/lib/session";
import { getMe, resendVerification } from "@/lib/api-client";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { NotificationsProvider, useNotificationsContext } from "@/lib/notifications-context";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    const key = getApiKey();
    if (!key) {
      router.replace("/login");
      return;
    }
    setApiKey(key);
    setChecked(true);
    // Récupère le profil : email_verified + must_change_password
    getMe(key)
      .then((profile) => {
        setEmailVerified(profile.email_verified);
        // Guard mot de passe temporaire : redirige vers la page compte
        // si le membre n'a pas encore changé son mot de passe d'invitation.
        // Exception : déjà sur /dashboard/account → on affiche le bandeau
        // sans boucle de redirection.
        if (profile.must_change_password && !pathname.startsWith("/dashboard/account")) {
          router.replace("/dashboard/account?force=1");
        } else {
          setMustChangePassword(profile.must_change_password ?? false);
        }
      })
      .catch(() => setEmailVerified(null));
  }, [router, pathname]);

  async function handleResend() {
    const key = getApiKey();
    if (!key) return;
    setResendState("sending");
    try {
      await resendVerification(key);
      setResendState("sent");
    } catch {
      setResendState("error");
    }
  }

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
          <p className="text-sm text-foreground-muted">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <NotificationsProvider apiKey={apiKey}>
      <DashboardShell
        apiKey={apiKey}
        emailVerified={emailVerified}
        mustChangePassword={mustChangePassword}
        resendState={resendState}
        onResend={handleResend}
      >
        {children}
      </DashboardShell>
    </NotificationsProvider>
  );
}

/**
 * Rendu séparé du provider pour pouvoir consommer NotificationsContext —
 * un composant ne peut pas lire le contexte qu'il fournit lui-même.
 */
function DashboardShell({
  children,
  apiKey,
  emailVerified,
  mustChangePassword,
  resendState,
  onResend,
}: {
  children: ReactNode;
  apiKey: string | null;
  emailVerified: boolean | null;
  mustChangePassword: boolean;
  resendState: "idle" | "sending" | "sent" | "error";
  onResend: () => void;
}) {
  const { notifications, unreadCount, loading: notifLoading, markRead, markAllRead } =
    useNotificationsContext();

  return (
    <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Bandeau d'avertissement email non vérifié */}
        {emailVerified === false && (
          <div role="alert" className="border-b border-danger-border bg-danger-bg px-4 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-danger">
                <span className="font-semibold">Compte non activé.</span>{" "}
                Vérifie ta boîte mail pour activer ton compte et créer des projets.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onResend}
                  disabled={resendState === "sending" || resendState === "sent"}
                  className="shrink-0 rounded-lg border border-danger/30 bg-white px-3 py-1 text-xs font-semibold text-danger hover:bg-danger-bg disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  {resendState === "sending"
                    ? "Envoi…"
                    : resendState === "sent"
                    ? "Email envoyé ✓"
                    : resendState === "error"
                    ? "Réessayer"
                    : "Renvoyer l'email"}
                </button>
                <span aria-live="polite" aria-atomic="true" className="sr-only">
                  {resendState === "sent" ? "Email de vérification envoyé." : resendState === "error" ? "Erreur lors de l'envoi. Réessayez." : ""}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bandeau mot de passe temporaire — visible sur /dashboard/account
            après redirection, rappel tant que must_change_password est True */}
        {mustChangePassword && (
          <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2.5">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Mot de passe temporaire.</span>{" "}
              Tu utilises un mot de passe généré automatiquement lors de ton invitation. Change-le maintenant depuis{" "}
              <a href="/dashboard/account" className="font-semibold underline underline-offset-2">
                Paramètres du compte
              </a>
              .
            </p>
          </div>
        )}

        {/* Barre supérieure avec la cloche et le menu profil */}
        <div className="flex items-center justify-end gap-1 border-b border-border px-4 py-2 lg:px-6">
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            loading={notifLoading}
            markRead={markRead}
            markAllRead={markAllRead}
          />
          <UserMenu apiKey={apiKey} />
        </div>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

