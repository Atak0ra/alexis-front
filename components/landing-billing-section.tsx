import Link from "next/link";

const BILLING_POINTS = [
  {
    title: "Essai gratuit",
    body: "Créez un compte, un crédit d'essai est offert. Aucune carte bancaire requise.",
  },
  {
    title: "Payez à l'usage",
    body: "Un wallet prépayé, débité au run réel mesuré. Pas d'abonnement forcé.",
  },
  {
    title: "BYOK",
    body: "Connectez votre propre clé d'inférence, payez votre provider directement, plus un abonnement plateforme fixe.",
  },
];

// ─── Section facturation (landing) ─────────────────────────────────────────────
// Statique volontairement : pas de fetch /plans ici — les vrais montants et
// plafonds sont admin-configurables et déjà détaillés sur /pricing. Un fetch
// ici risquerait de désynchroniser deux sources de vérité.

export default function LandingBillingSection() {
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            Facturation
          </p>
          <h2 className="mt-3 text-3xl font-bold text-foreground">
            Vous ne payez que ce que vous utilisez
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-foreground-muted">
            Pas d&apos;abonnement forcé. Un essai gratuit pour démarrer, un wallet prépayé
            débité à l&apos;usage réel, ou votre propre clé d&apos;inférence.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {BILLING_POINTS.map((point) => (
            <div
              key={point.title}
              className="rounded-2xl border border-border bg-surface-raised p-8"
            >
              <h3 className="text-lg font-bold text-foreground">{point.title}</h3>
              <p className="mt-2 text-sm text-foreground-muted">{point.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/pricing" className="text-sm font-semibold text-brand hover:underline">
            Voir le détail des tarifs →
          </Link>
        </div>
      </div>
    </section>
  );
}
