"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getMe,
  deleteAccount,
  listMembers,
  inviteMember,
  removeMember,
  getWallet,
  getWalletTransactions,
  friendlyError,
  type ClientProfile,
  type MembersListOut,
  type MemberOut,
  type WalletOut,
  type WalletTransactionOut,
} from "@/lib/api-client";
import { getApiKey, clearApiKey } from "@/lib/session";

// ── Section Wallet ────────────────────────────────────────────────────────────

function WalletSection({
  apiKey,
  profile,
}: {
  apiKey: string;
  profile: ClientProfile;
}) {
  const [wallet, setWallet] = useState<WalletOut | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionOut[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // BYOK (clé perso) ou pas de plan du tout = jamais de wallet — rien à afficher.
  const hasWallet = !!profile.plan && !profile.plan.requires_own_key;

  useEffect(() => {
    if (!hasWallet) return;
    getWallet(apiKey)
      .then(setWallet)
      .catch((err) => setLoadErr(friendlyError(err)));
    getWalletTransactions(apiKey, 20, 0)
      .then((res) => setTransactions(res.items))
      .catch(() => {/* historique optionnel, pas bloquant */});
  }, [apiKey, hasWallet]);

  if (!hasWallet) return null;

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-5" data-testid="wallet-section">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        Wallet
      </h3>

      {loadErr && <p className="text-sm text-danger">{loadErr}</p>}

      {wallet && (
        <>
          <p
            className={`font-mono text-2xl font-bold ${wallet.balance_usd < 10 ? "text-danger" : "text-foreground"}`}
            data-testid="wallet-balance"
          >
            ${wallet.balance_usd.toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-foreground-muted">
            Solde prépayé en dollars réels — pas de tokens, débité au coût réel de chaque run.
          </p>
          {wallet.balance_usd < 10 && (
            <p className="mt-2 text-sm font-medium text-danger">
              Solde bas. Contactez-nous pour recharger votre compte.
            </p>
          )}
        </>
      )}

      {transactions.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Historique récent
          </p>
          <ul className="space-y-2">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-foreground-muted">
                    {t.type === "topup" ? "Recharge" : (t.issue_identifier ?? t.step ?? "Débit")}
                  </p>
                  {t.model && (
                    <p className="truncate text-xs text-foreground-subtle">{t.model}</p>
                  )}
                </div>
                <span className={`shrink-0 font-mono ${t.type === "topup" ? "text-success" : "text-foreground"}`}>
                  {t.type === "topup" ? "+" : "-"}${t.billed_usd.toFixed(4)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {wallet && transactions.length === 0 && (
        <p className="mt-4 text-sm text-foreground-subtle">Aucune transaction pour le moment.</p>
      )}
    </section>
  );
}

// ── Section Équipe ────────────────────────────────────────────────────────────

function TeamSection({
  apiKey,
  profile,
}: {
  apiKey: string;
  profile: ClientProfile;
}) {
  const [data, setData] = useState<MembersListOut | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // Formulaire d'invitation
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirst, setInviteFirst] = useState("");
  const [inviteLast, setInviteLast] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [inviteOk, setInviteOk] = useState(false);

  // Suppression
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeErr, setRemoveErr] = useState<string | null>(null);

  const isOwner = profile.role === "owner";
  const plan = profile.plan;

  // Plans sans invitation : free (max_members=1) et byok (requires_own_key=true)
  const canInvite =
    isOwner &&
    plan !== null &&
    !plan.requires_own_key &&
    (plan.max_members === null || plan.max_members > 1);

  useEffect(() => {
    listMembers(apiKey)
      .then(setData)
      .catch((err) => setLoadErr(friendlyError(err)));
  }, [apiKey]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteErr(null);
    setInviteOk(false);
    setInviting(true);
    try {
      const member = await inviteMember(apiKey, {
        email: inviteEmail,
        first_name: inviteFirst,
        last_name: inviteLast,
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              members: [...prev.members, member],
              used: prev.used + 1,
            }
          : prev
      );
      setInviteEmail("");
      setInviteFirst("");
      setInviteLast("");
      setInviteOk(true);
    } catch (err) {
      setInviteErr(friendlyError(err));
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(member: MemberOut) {
    setRemoveErr(null);
    setRemovingId(member.id);
    try {
      await removeMember(apiKey, member.id);
      setData((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.filter((m) => m.id !== member.id),
              used: prev.used - 1,
            }
          : prev
      );
    } catch (err) {
      setRemoveErr(friendlyError(err));
    } finally {
      setRemovingId(null);
    }
  }

  // Plans sans multi-utilisateur : on affiche un message d'upgrade
  if (!canInvite && isOwner && (plan === null || plan.max_members === 1 || plan.requires_own_key)) {
    return (
      <section className="rounded-xl border border-border bg-surface-raised p-5" data-testid="team-section">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
          Équipe
        </h3>
        <p className="text-sm text-foreground-muted">
          L&apos;invitation de membres n&apos;est pas disponible sur votre plan actuel.
        </p>
        <Link
          href="/pricing"
          className="mt-3 inline-block text-sm font-medium text-brand hover:text-brand-hover transition-colors"
        >
          Passer au plan Solopreneur ou Entreprise →
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-5" data-testid="team-section">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
          Équipe
        </h3>
        {data && (
          <span className="text-xs text-foreground-subtle">
            {data.used}
            {data.limit !== null ? ` / ${data.limit}` : ""} membre{data.used > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loadErr && <p className="mb-3 text-sm text-danger">{loadErr}</p>}

      {/* Liste des membres */}
      {data && data.members.length > 0 && (
        <ul className="mb-5 divide-y divide-border" data-testid="members-list">
          {data.members.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {m.first_name && m.last_name
                    ? `${m.first_name} ${m.last_name}`
                    : m.email}
                </p>
                {(m.first_name || m.last_name) && (
                  <p className="text-xs text-foreground-muted">{m.email}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    m.role === "owner"
                      ? "bg-brand-light text-brand"
                      : "bg-surface text-foreground-muted border border-border"
                  }`}
                >
                  {m.role === "owner" ? "Propriétaire" : "Membre"}
                </span>
                {isOwner && m.role !== "owner" && (
                  <button
                    type="button"
                    disabled={removingId === m.id}
                    onClick={() => handleRemove(m)}
                    className="text-xs text-danger hover:text-danger/80 disabled:opacity-40 transition-colors"
                    aria-label={`Retirer ${m.email}`}
                  >
                    {removingId === m.id ? "…" : "Retirer"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {removeErr && <p className="mb-3 text-sm text-danger">{removeErr}</p>}

      {/* Formulaire d'invitation — owner uniquement, quota non atteint */}
      {isOwner && (data === null || data.limit === null || data.used < data.limit) && (
        <form onSubmit={handleInvite} className="space-y-3" data-testid="invite-form">
          <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
            Inviter un membre
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="Prénom"
              value={inviteFirst}
              onChange={(e) => setInviteFirst(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <input
              type="text"
              required
              placeholder="Nom"
              value={inviteLast}
              onChange={(e) => setInviteLast(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <input
            type="email"
            required
            placeholder="Email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          {inviteErr && <p className="text-xs text-danger">{inviteErr}</p>}
          {inviteOk && (
            <p className="text-xs text-success">
              Invitation envoyée ! Le membre recevra un email avec ses identifiants.
            </p>
          )}
          <button
            type="submit"
            disabled={inviting}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            {inviting ? "Envoi…" : "Envoyer l'invitation"}
          </button>
        </form>
      )}

      {/* Quota atteint */}
      {isOwner && data !== null && data.limit !== null && data.used >= data.limit && (
        <div className="mt-3 rounded-xl border border-border bg-surface p-3">
          <p className="text-sm text-foreground-muted">
            Quota atteint ({data.used}/{data.limit} membres).{" "}
            <Link href="/pricing" className="text-brand hover:text-brand-hover font-medium">
              Passer à Entreprise
            </Link>{" "}
            pour inviter davantage.
          </p>
        </div>
      )}
    </section>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AccountSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const key = getApiKey();
    if (!key) return;
    setApiKey(key);
    getMe(key)
      .then(setProfile)
      .catch((err) => setLoadError(friendlyError(err)));
  }, []);

  async function handleDelete() {
    if (!profile || confirmEmail !== profile.email) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const key = getApiKey();
      if (!key) throw new Error("Session absente");
      await deleteAccount(key);
      clearApiKey();
      router.push("/");
    } catch (err) {
      setDeleteError(friendlyError(err));
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-8">
      <h1 className="font-display text-2xl font-bold text-foreground">Mon compte</h1>

      {loadError && <p className="mt-4 text-sm text-danger">{loadError}</p>}

      {profile && apiKey && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ── Colonne principale ── */}
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-xl border border-border bg-surface-raised p-5">
              <p className="text-sm text-foreground-muted">Adresse email</p>
              <p className="mt-1 font-medium text-foreground" data-testid="account-email">{profile.email}</p>
              {(profile.first_name || profile.last_name) && (
                <p className="mt-0.5 text-sm text-foreground-muted">
                  {[profile.first_name, profile.last_name].filter(Boolean).join(" ")}
                </p>
              )}
              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  profile.role === "owner"
                    ? "bg-brand-light text-brand"
                    : "bg-surface text-foreground-muted border border-border"
                }`}
              >
                {profile.role === "owner" ? "Propriétaire" : "Membre"}
              </span>
            </section>

            {/* Zone de danger — uniquement pour l'owner */}
            {profile.role === "owner" && (
              <div className="rounded-xl border border-danger-border bg-danger-bg p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-danger uppercase tracking-wider">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Zone de danger
                </h2>
                <p className="mt-2 text-sm text-danger/80">
                  Supprime définitivement ton compte : tous tes projets, tickets, l&apos;historique des runs
                  et l&apos;ensemble du code de tes projets seront <strong>définitivement effacés</strong>.
                </p>

                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium text-danger">
                    Tapez <strong className="font-mono">{profile.email}</strong> pour confirmer
                  </label>
                  <input
                    type="text"
                    value={confirmEmail}
                    onChange={(e) => { setConfirmEmail(e.target.value); setDeleteError(null); }}
                    placeholder={profile.email}
                    className="w-full rounded-xl border border-danger-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-danger/30"
                  />
                  {deleteError && <p className="text-xs text-danger">{deleteError}</p>}
                  <button
                    type="button"
                    disabled={confirmEmail !== profile.email || deleting}
                    onClick={handleDelete}
                    className="rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-danger/90 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    {deleting ? "Suppression…" : "Supprimer définitivement mon compte"}
                  </button>
                </div>
              </div>
            )}

            <Link href="/dashboard" className="inline-block text-sm text-foreground-muted hover:text-foreground transition-colors">
              ← Retour au tableau de bord
            </Link>
          </div>

          {/* ── Colonne latérale : abonnement + équipe ── */}
          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-surface-raised p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Mon abonnement
              </h3>
              {profile.plan ? (
                <>
                  <p className="text-lg font-semibold text-foreground">
                    {profile.plan.display_name ?? profile.plan.name}
                  </p>
                  <p className="mt-0.5 text-sm text-foreground-muted">
                    {profile.plan.monthly_price_usd === 0
                      ? "Gratuit"
                      : `$${profile.plan.monthly_price_usd} / mois`}
                  </p>
                  {profile.plan.description && (
                    <p className="mt-3 text-sm text-foreground-muted">{profile.plan.description}</p>
                  )}
                  {profile.plan.features && profile.plan.features.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {profile.plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href="/pricing"
                    className="mt-4 inline-block text-sm font-medium text-brand hover:text-brand-hover transition-colors"
                  >
                    Changer de plan →
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-foreground-muted">Aucun plan actif.</p>
                  <Link
                    href="/pricing"
                    className="mt-3 inline-block text-sm font-medium text-brand hover:text-brand-hover transition-colors"
                  >
                    Voir les plans →
                  </Link>
                </>
              )}
            </section>

            {/* Section Wallet — masquée pour les plans BYOK */}
            <WalletSection apiKey={apiKey} profile={profile} />

            {/* Section Équipe */}
            <TeamSection apiKey={apiKey} profile={profile} />
          </div>
        </div>
      )}
    </div>
  );
}
