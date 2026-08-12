"use client";

/**
 * AuditPanel — Alexis Check
 *
 * Cycle complet :
 *  1. Sélection des catégories via cartes cliquables (security / rgpd / a11y)
 *  2. Lancement → polling du statut toutes les 3 s
 *  3. Affichage du rapport groupé par catégorie
 *  4. Sélection des findings → "Créer les tickets sélectionnés"
 *  5. Affichage du quota mensuel
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Stethoscope,
  Lock,
  FileText,
  Accessibility,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Tag,
  RefreshCw,
} from "lucide-react";
import {
  createAudit,
  getAuditStatus,
  getAuditReport,
  getAuditQuota,
  auditToTickets,
  friendlyError,
  type AuditCategory,
  type AuditFinding,
  type AuditStatus,
  type AuditQuota,
} from "@/lib/api-client";

// ─── Constantes catégories ────────────────────────────────────────────────────

const CATEGORIES: {
  value: AuditCategory;
  label: string;
  description: string;
  Icon: React.ElementType;
  colorClass: string;
  selectedClass: string;
}[] = [
  {
    value: "security",
    label: "Sécurité",
    description: "Injections, secrets exposés, routes non protégées",
    Icon: Lock,
    colorClass: "text-danger",
    selectedClass: "border-danger/50 bg-danger/5 ring-1 ring-danger/30",
  },
  {
    value: "rgpd",
    label: "RGPD",
    description: "Consentement, rétention des données, droits utilisateurs",
    Icon: FileText,
    colorClass: "text-warning",
    selectedClass: "border-warning/50 bg-warning/5 ring-1 ring-warning/30",
  },
  {
    value: "a11y",
    label: "Accessibilité",
    description: "Contrastes, labels ARIA, navigation clavier",
    Icon: Accessibility,
    colorClass: "text-brand",
    selectedClass: "border-brand/50 bg-brand/5 ring-1 ring-brand/30",
  },
];

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  security: "Sécurité",
  rgpd: "RGPD",
  a11y: "Accessibilité",
};

const CATEGORY_COLORS: Record<AuditCategory, string> = {
  security: "bg-danger-bg border-danger-border text-danger",
  rgpd: "bg-warning-bg border-warning-border text-warning",
  a11y: "bg-brand/10 border-brand/30 text-brand",
};

// ─── Sous-composants ──────────────────────────────────────────────────────────

function QuotaBadge({ quota }: { quota: AuditQuota }) {
  const isUnlimited = quota.limit === null;
  const isExhausted = !isUnlimited && quota.used >= quota.limit!;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        isExhausted
          ? "border-danger-border bg-danger-bg text-danger"
          : "border-border bg-surface-raised text-foreground-muted"
      }`}
      aria-label={
        isUnlimited
          ? "Quota illimité"
          : `${quota.used} audit${quota.used > 1 ? "s" : ""} utilisé${quota.used > 1 ? "s" : ""} sur ${quota.limit}`
      }
    >
      <Stethoscope className="h-3 w-3" aria-hidden="true" />
      {isUnlimited ? "Illimité" : `${quota.used} / ${quota.limit}`}
    </span>
  );
}

/** Carte de sélection d'une catégorie d'audit. */
function CategoryCard({
  value: _value,
  label,
  description,
  Icon,
  colorClass,
  selectedClass,
  selected,
  disabled,
  onToggle,
}: {
  value: AuditCategory;
  label: string;
  description: string;
  Icon: React.ElementType;
  colorClass: string;
  selectedClass: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      disabled={disabled}
      className={`group relative flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? selectedClass
          : "border-border bg-surface hover:border-border-strong hover:bg-surface-raised"
      }`}
    >
      {/* Icône */}
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
          selected
            ? `border-current/20 bg-current/10 ${colorClass}`
            : "border-border bg-surface-raised text-foreground-muted"
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>

      {/* Texte */}
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold leading-tight ${
            selected ? colorClass : "text-foreground"
          }`}
        >
          {label}
        </p>
        <p className="mt-0.5 text-xs text-foreground-muted leading-snug">
          {description}
        </p>
      </div>

      {/* Indicateur sélection */}
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
          selected
            ? `border-current/40 bg-current/20 ${colorClass}`
            : "border-border bg-surface"
        }`}
        aria-hidden="true"
      >
        {selected && <CheckCircle2 className="h-3 w-3" />}
      </span>
    </button>
  );
}

function FindingCard({
  finding,
  checked,
  onToggle,
}: {
  finding: AuditFinding;
  checked: boolean;
  onToggle: () => void;
}) {
  const checkId = useId();
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        checked ? "border-brand/40 bg-brand/5" : "border-border bg-surface-raised"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          id={checkId}
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-brand"
          aria-label={`Sélectionner : ${finding.title}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <label
              htmlFor={checkId}
              className="cursor-pointer text-sm font-semibold text-foreground"
            >
              {finding.title}
            </label>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[finding.category]}`}
            >
              {CATEGORY_LABELS[finding.category]}
            </span>
            {finding.no_code && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-foreground-muted">
                <Tag className="h-3 w-3" aria-hidden="true" />
                Sans impact code
              </span>
            )}
          </div>
          <p className="text-sm text-foreground-muted">{finding.explanation}</p>
          <p className="mt-1 text-xs text-danger/80">
            <span className="font-medium">Risque :</span> {finding.risk}
          </p>
          {finding.ticket_titles.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {finding.ticket_titles.map((t, i) => (
                <li
                  key={i}
                  className="flex items-center gap-1.5 text-xs text-foreground-subtle"
                >
                  <span
                    className="h-1 w-1 rounded-full bg-foreground-subtle"
                    aria-hidden="true"
                  />
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface AuditPanelProps {
  apiKey: string;
  projectId: string;
  /** Intervalle de polling en ms. Défaut : 3000. Passer 50 dans les tests. */
  pollIntervalMs?: number;
  /**
   * Appelé après la création réussie des tickets.
   * Permet au parent de fermer la modale et de rafraîchir le Kanban.
   */
  onTicketsCreated?: () => void;
}

export default function AuditPanel({
  apiKey,
  projectId,
  pollIntervalMs = 3000,
  onTicketsCreated,
}: AuditPanelProps) {
  // Catégories sélectionnées pour le lancement
  const [selectedCategories, setSelectedCategories] = useState<
    Set<AuditCategory>
  >(new Set(["security", "rgpd", "a11y"]));

  // État de l'audit
  const [auditStatus, setAuditStatus] = useState<AuditStatus>(null);
  const [findings, setFindings] = useState<AuditFinding[] | null>(null);
  const [quota, setQuota] = useState<AuditQuota | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Sélection des findings pour to-tickets
  const [selectedFindings, setSelectedFindings] = useState<Set<number>>(
    new Set()
  );

  // États UI
  const [launching, setLaunching] = useState(false);
  const [sendingToTickets, setSendingToTickets] = useState(false);
  const [ticketsSent, setTicketsSent] = useState(false);
  const [toTicketsError, setToTicketsError] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Chargement initial du quota + statut ──────────────────────────────────

  useEffect(() => {
    getAuditQuota(apiKey, projectId)
      .then(setQuota)
      .catch(() => setQuota(null));

    getAuditStatus(apiKey, projectId)
      .then(({ status, error }) => {
        setAuditStatus(status);
        if (status === "in_progress") startPolling();
        if (status === "ready") fetchReport();
        if (status === "failed") {
          setAuditError(error ?? "L'audit a échoué. Veuillez réessayer.");
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, projectId]);

  // ── Nettoyage polling au démontage ────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const fetchReport = useCallback(async () => {
    try {
      const report = await getAuditReport(apiKey, projectId);
      setFindings(report.findings);
      // Pré-sélectionner tous les findings
      setSelectedFindings(new Set(report.findings.map((_, i) => i)));
    } catch (err) {
      setAuditError(friendlyError(err));
    }
  }, [apiKey, projectId]);

  const pollOnce = useCallback(async (): Promise<boolean> => {
    try {
      const { status, error } = await getAuditStatus(apiKey, projectId);
      setAuditStatus(status);
      if (status === "ready") {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        await fetchReport();
        getAuditQuota(apiKey, projectId)
          .then(setQuota)
          .catch(() => {});
        return true; // terminé
      } else if (status === "failed") {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setAuditError(error ?? "L'audit a échoué. Veuillez réessayer.");
        return true; // terminé
      }
    } catch {
      // Erreur réseau transitoire — on continue
    }
    return false;
  }, [apiKey, projectId, fetchReport]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    // Premier tick immédiat — l'audit LLM est souvent rapide
    pollOnce().then((done) => {
      if (!done) {
        pollingRef.current = setInterval(async () => {
          const done = await pollOnce();
          if (done && pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }, pollIntervalMs);
      }
    });
  }, [pollOnce, pollIntervalMs]);

  // ── Lancement de l'audit ──────────────────────────────────────────────────

  async function handleLaunch() {
    if (selectedCategories.size === 0) return;
    setLaunching(true);
    setAuditError(null);
    setFindings(null);
    setSelectedFindings(new Set());
    setTicketsSent(false);
    setToTicketsError(null);
    try {
      await createAudit(apiKey, projectId, Array.from(selectedCategories));
      setAuditStatus("in_progress");
      startPolling();
    } catch (err) {
      setAuditError(friendlyError(err));
      setAuditStatus(null);
    } finally {
      setLaunching(false);
    }
  }

  /** Relancer un audit après un échec — remet l'état à zéro. */
  function handleRetry() {
    setAuditError(null);
    setAuditStatus(null);
    setFindings(null);
    setSelectedFindings(new Set());
    setTicketsSent(false);
    setToTicketsError(null);
  }

  // ── Envoi en tickets ──────────────────────────────────────────────────────

  async function handleToTickets() {
    if (!findings || selectedFindings.size === 0) return;
    setSendingToTickets(true);
    setToTicketsError(null);
    try {
      const toSend = findings.filter((_, i) => selectedFindings.has(i));
      await auditToTickets(apiKey, projectId, toSend);
      setTicketsSent(true);
    } catch (err) {
      setToTicketsError(friendlyError(err));
    } finally {
      setSendingToTickets(false);
    }
  }

  function toggleFinding(idx: number) {
    setSelectedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function toggleCategory(cat: AuditCategory) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // ── Quota épuisé ? ────────────────────────────────────────────────────────

  const quotaExhausted =
    quota !== null && quota.limit !== null && quota.used >= quota.limit;

  // ── Groupement des findings par catégorie ─────────────────────────────────

  const findingsByCategory = findings
    ? CATEGORIES.map(({ value, label, Icon }) => ({
        value,
        label,
        Icon,
        items: findings
          .map((f, i) => ({ finding: f, idx: i }))
          .filter(({ finding }) => finding.category === value),
      })).filter(({ items }) => items.length > 0)
    : [];

  // ── Rendu ─────────────────────────────────────────────────────────────────

  const isRunning = auditStatus === "in_progress";
  const hasReport = findings !== null && auditStatus === "ready";

  return (
    <div className="space-y-5">
      {/* ── Sélection des catégories + quota ── */}
      {!isRunning && !hasReport && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              Catégories à analyser
            </p>
            {quota && <QuotaBadge quota={quota} />}
          </div>

          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            role="group"
            aria-label="Catégories d'audit"
          >
            {CATEGORIES.map((cat) => (
              <CategoryCard
                key={cat.value}
                {...cat}
                selected={selectedCategories.has(cat.value)}
                disabled={isRunning}
                onToggle={() => toggleCategory(cat.value)}
              />
            ))}
          </div>

          {/* Quota épuisé */}
          {quotaExhausted && (
            <p className="text-xs text-danger">
              Quota mensuel atteint ({quota!.used}/{quota!.limit}). Revenez le
              mois prochain ou passez à un plan supérieur.
            </p>
          )}

          {/* Bouton lancer */}
          <button
            type="button"
            onClick={handleLaunch}
            disabled={
              launching || selectedCategories.size === 0 || quotaExhausted
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50 transition-colors"
          >
            {launching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Lancement…
              </>
            ) : (
              <>
                <Stethoscope className="h-4 w-4" aria-hidden="true" />
                Lancer l&apos;audit
              </>
            )}
          </button>
        </div>
      )}

      {/* ── En cours ── */}
      {isRunning && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3"
        >
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-brand"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm text-brand font-medium">Audit en cours…</p>
            <p className="text-xs text-brand/70 mt-0.5">
              L&apos;analyse peut prendre 1 à 3 minutes selon la taille du
              projet.
            </p>
          </div>
        </div>
      )}

      {/* ── Erreur ── */}
      {auditError && (
        <div
          role="alert"
          className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 space-y-2"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="h-4 w-4 shrink-0 text-danger mt-0.5"
              aria-hidden="true"
            />
            <p className="text-sm text-danger">{auditError}</p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-danger hover:text-danger/80 transition-colors"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Réessayer
          </button>
        </div>
      )}

      {/* ── Rapport ── */}
      {hasReport && (
        <div className="space-y-5">
          {/* ── Bandeau récap audit prêt ── */}
          {quotaExhausted ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-warning-border bg-warning-bg px-4 py-3 space-y-1"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="h-4 w-4 shrink-0 text-warning mt-0.5"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-warning">
                    Quota mensuel atteint ({quota!.used}/{quota!.limit})
                  </p>
                  <p className="text-xs text-warning/80 mt-0.5">
                    Traite les points ci-dessous ou transforme-les en tickets.
                    Reviens le mois prochain ou passe à un plan supérieur pour relancer un audit.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-success-border bg-success-bg px-4 py-3 space-y-1"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-success mt-0.5"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-success">
                    Ton dernier audit est prêt :{" "}
                    {findings!.length} point{findings!.length > 1 ? "s" : ""} détecté
                    {findings!.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-success/80 mt-0.5">
                    Traite-les ci-dessous ou transforme-les en tickets.
                    {quota && quota.limit !== null && (
                      <> Tu peux relancer un audit quand tu veux ({quota.limit - quota.used} restant{quota.limit - quota.used > 1 ? "s" : ""} ce mois-ci).</>
                    )}
                    {quota && quota.limit === null && (
                      <> Tu peux relancer un audit quand tu veux (quota illimité).</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* En-tête rapport + quota + bouton relancer */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {quota && <QuotaBadge quota={quota} />}
            </div>
            <button
              type="button"
              onClick={handleRetry}
              disabled={quotaExhausted}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground-muted hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Relancer un audit
            </button>
          </div>

          {findings!.length === 0 && (
            <p className="text-sm text-foreground-muted">
              Aucun point d&apos;amélioration détecté. Excellent travail !
            </p>
          )}

          {/* Findings groupés par catégorie */}
          {findingsByCategory.map(({ value, label, Icon, items }) => (
            <div key={value}>
              <div className="flex items-center gap-2 mb-3">
                <Icon
                  className="h-4 w-4 text-foreground-muted"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold text-foreground">
                  {label}
                </h3>
                <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-foreground-muted">
                  {items.length}
                </span>
              </div>
              <div className="space-y-3">
                {items.map(({ finding, idx }) => (
                  <FindingCard
                    key={idx}
                    finding={finding}
                    checked={selectedFindings.has(idx)}
                    onToggle={() => toggleFinding(idx)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Sélection rapide */}
          {findings!.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-foreground-muted">
              <button
                type="button"
                onClick={() =>
                  setSelectedFindings(
                    new Set(findings!.map((_, i) => i))
                  )
                }
                className="hover:text-brand transition-colors"
              >
                Tout sélectionner
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setSelectedFindings(new Set())}
                className="hover:text-brand transition-colors"
              >
                Tout désélectionner
              </button>
              <span className="ml-auto">
                {selectedFindings.size} sélectionné
                {selectedFindings.size > 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Succès to-tickets */}
          {ticketsSent && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-success-border bg-success-bg px-4 py-3 space-y-3"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className="h-4 w-4 text-success"
                  aria-hidden="true"
                />
                <p className="text-sm text-success font-medium">
                  Tickets créés avec succès dans le backlog.
                </p>
              </div>
              {onTicketsCreated && (
                <button
                  type="button"
                  onClick={onTicketsCreated}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/90 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Voir le backlog
                </button>
              )}
            </div>
          )}

          {/* Erreur to-tickets */}
          {toTicketsError && (
            <p role="alert" className="text-sm text-danger">
              {toTicketsError}
            </p>
          )}

          {/* Bouton to-tickets */}
          {findings!.length > 0 && !ticketsSent && (
            <button
              type="button"
              onClick={handleToTickets}
              disabled={sendingToTickets || selectedFindings.size === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand bg-surface px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand/5 disabled:opacity-50 transition-colors"
            >
              {sendingToTickets ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Création en cours…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Créer{" "}
                  {selectedFindings.size > 0
                    ? `${selectedFindings.size} `
                    : ""}
                  ticket{selectedFindings.size > 1 ? "s" : ""} sélectionné
                  {selectedFindings.size > 1 ? "s" : ""}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
