"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { listPublicPlans, type PlanPublicOut } from "@/lib/api-client";
import { getApiKey } from "@/lib/session";

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, highlighted }: { plan: PlanPublicOut; highlighted?: boolean }) {
  const isFree = plan.name === "free";
  const isByok = plan.name === "byok";
  const isPayAsYouGo = plan.name === "solo" || plan.name === "entreprise";
  const isEntreprise = plan.name === "entreprise";

  const priceLabel = isFree
    ? "Gratuit"
    : isPayAsYouGo
    ? "Payez à l'usage"
    : `$${plan.monthly_price_usd} / mois`;

  const ctaLabel = isByok
    ? "Commencer avec ma clé"
    : isEntreprise
    ? "Nous contacter"
    : "Commencer";

  const ctaHref = isEntreprise
    ? "mailto:contact@alexis.dev?subject=Plan%20Entreprise"
    : "/login?mode=signup";

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-8 shadow-card transition-all",
        highlighted
          ? "border-brand bg-brand/5 shadow-brand/10 shadow-lg"
          : "border-border bg-surface-raised hover:border-brand/30 hover:shadow-card-hover"
      )}
    >
      {highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white shadow">
            Populaire
          </span>
        </div>
      )}

      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-foreground">
          {plan.display_name ?? plan.name}
        </h3>
        {plan.description && (
          <p className="mt-1.5 text-sm text-foreground-muted">{plan.description}</p>
        )}
      </div>

      {/* Price */}
      <div className="mt-6">
        <span className="text-3xl font-bold text-foreground">{priceLabel}</span>
        {!isFree && !isPayAsYouGo && (
          <span className="ml-1 text-sm text-foreground-subtle">HT</span>
        )}
      </div>

      {/* Features */}
      {plan.features && plan.features.length > 0 && (
        <ul className="mt-6 space-y-2.5">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground-muted">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      )}

      {/* Free note */}
      {isFree && (
        <p className="mt-4 rounded-lg bg-surface-sunken px-3 py-2 text-xs text-foreground-muted">
          Plan de découverte. Modèle mutualisé, moins rapide et moins performant qu&apos;un plan avec votre propre clé.
        </p>
      )}

      {/* BYOK note */}
      {isByok && (
        <p className="mt-4 rounded-lg bg-warning-bg px-3 py-2 text-xs text-warning">
          Vous avez déjà votre clé IA ? Branchez-la et lancez-vous.
        </p>
      )}

      {/* Pay-as-you-go note (solo + entreprise) */}
      {isPayAsYouGo && (
        <p className="mt-4 rounded-lg bg-surface-sunken px-3 py-2 text-xs text-foreground-muted">
          Wallet prépayé : vous rechargez un solde et chaque run le débite au coût réel mesuré. Aucun abonnement fixe.
        </p>
      )}

      {/* CTA */}
      <div className="mt-8">
        {isEntreprise ? (
          <a
            href={ctaHref}
            className={cn(
              "block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors",
              "border border-brand text-brand hover:bg-brand hover:text-white"
            )}
          >
            {ctaLabel}
          </a>
        ) : (
          <Link
            href={ctaHref}
            className={cn(
              "block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors",
              highlighted
                ? "bg-brand text-white hover:bg-brand-hover shadow-sm"
                : "border border-border text-foreground hover:border-brand/40 hover:text-brand"
            )}
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PlanSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface-raised p-8 shadow-card">
      <div className="h-5 w-32 animate-pulse rounded bg-surface-sunken" />
      <div className="mt-2 h-4 w-48 animate-pulse rounded bg-surface-sunken" />
      <div className="mt-6 h-9 w-24 animate-pulse rounded bg-surface-sunken" />
      <div className="mt-6 space-y-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-surface-sunken" />
        ))}
      </div>
      <div className="mt-8 h-10 w-full animate-pulse rounded-lg bg-surface-sunken" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanPublicOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setLoggedIn(!!getApiKey());
    listPublicPlans()
      .then(setPlans)
      .catch(() => setError("Impossible de charger les plans. Réessayez plus tard."));
  }, []);

  return (
    <div className="min-h-screen bg-surface px-6 py-16">
      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Des plans pour chaque besoin
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-foreground-muted">
            Commencez gratuitement, apportez votre propre clé, ou laissez Alexis tout gérer.
            Pas de carte bancaire requise pour démarrer.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-10 rounded-xl border border-danger-bg bg-danger-bg px-6 py-4 text-center text-sm text-danger">
            {error}
          </div>
        )}

        {/* Plans grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans === null && !error
            ? [1, 2, 3, 4].map((i) => <PlanSkeleton key={i} />)
            : plans?.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  highlighted={plan.name === "solo"}
                />
              ))}
        </div>

        {/* FAQ / note BYOK */}
        <div className="mt-16 rounded-2xl border border-border bg-surface-raised p-8">
          <h2 className="text-lg font-bold text-foreground">Questions fréquentes</h2>
          <dl className="mt-6 space-y-6">
            <div>
              <dt className="font-semibold text-foreground">Qu&apos;est-ce que le plan BYOK ?</dt>
              <dd className="mt-1 text-sm text-foreground-muted">
                BYOK (Bring Your Own Key) vous permet d&apos;utiliser Alexis avec votre propre clé
                d&apos;inférence (OpenAI, Anthropic, Groq…). Vous payez votre consommation IA directement
                chez votre provider. L&apos;abonnement Alexis à 29 $/mois couvre l&apos;infra, le tracker
                natif et l&apos;hébergement de vos repos. Idéal si vous avez déjà un abonnement ou des crédits.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Comment fonctionne le plan Solo Preneur ?</dt>
              <dd className="mt-1 text-sm text-foreground-muted">
                Claude (Anthropic) fourni par Alexis. Vous n&apos;avez rien à configurer. Vous rechargez
                un solde (wallet) et chaque run débite le coût réel mesuré, marge de la plateforme
                comprise. Aucun abonnement fixe. Contactez-nous à{" "}
                <a href="mailto:contact@alexis.dev" className="text-brand hover:underline">
                  contact@alexis.dev
                </a>{" "}
                pour activer votre wallet.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Quelle différence entre Solo Preneur et Entreprise ?</dt>
              <dd className="mt-1 text-sm text-foreground-muted">
                Le nombre de membres : Solo Preneur est limité à 1 membre, Entreprise n&apos;a pas de
                limite. Les deux fonctionnent en pay-as-you-go : vous ne payez que votre usage réel,
                sans abonnement fixe.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Puis-je changer de plan à tout moment ?</dt>
              <dd className="mt-1 text-sm text-foreground-muted">
                Oui. Contactez-nous et nous mettrons à jour votre plan sans interruption de service.
              </dd>
            </div>
          </dl>
        </div>

        {/* Back link — adapté selon l'état de session */}
        {loggedIn !== null && (
          <div className="mt-10 text-center">
            <Link
              href={loggedIn ? "/dashboard" : "/login"}
              className="text-sm text-brand hover:underline"
            >
              {loggedIn ? "← Retour au tableau de bord" : "← Retour à la connexion"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
