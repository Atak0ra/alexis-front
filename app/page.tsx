import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const PIPELINE_STAGES = [
  {
    key: "todo",
    label: "Todo",
    description: "Le ticket est décrit et prêt à être pris en charge.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    key: "spec",
    label: "Spec",
    description: "Alexis rédige une spécification technique détaillée pour ce ticket.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    key: "plan",
    label: "Plan",
    description: "L'agent décompose le travail en étapes concrètes.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
  },
  {
    key: "dev",
    label: "Dev",
    description: "Alexis écrit le code, lance les tests et itère jusqu'à ce que tout passe.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
  },
  {
    key: "livraison",
    label: "Livraison",
    description: "Le code est livré sur votre dépôt, avec ou sans relecture selon vos réglages.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
] as const;

const VALUE_PROPS = [
  {
    title: "Zéro configuration manuelle",
    description: "Alexis se branche sur votre workflow GitHub/GitLab existant. Pas de nouvelle méthode à apprendre.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: "Ticket → code testé → livré",
    description: "L'agent écrit le code, exécute les tests, et livre le résultat sur votre dépôt. Vous validez avant que ça parte plus loin, selon vos réglages.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    title: "Plusieurs projets, un seul tableau de bord",
    description: "Gérez tous vos dépôts depuis une interface unifiée. Chaque projet garde ses propres réglages et accès.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    title: "Coûts transparents et traçables",
    description: "Chaque ticket affiche son coût réel. Vous savez ce que vous payez, ticket par ticket.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
] as const;

// ─── Live pipeline preview ────────────────────────────────────────────────────

function LivePipelinePreview() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-modal">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-surface-sunken px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-danger/60" />
        <div className="h-3 w-3 rounded-full bg-warning/60" />
        <div className="h-3 w-3 rounded-full bg-success/60" />
        <span className="ml-3 font-mono text-xs text-foreground-muted">alexis · tableau de bord</span>
      </div>

      {/* Fake dashboard content */}
      <div className="p-6">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-success-border bg-success-bg p-3 text-center">
            <p className="text-2xl font-bold text-success">47</p>
            <p className="text-xs text-success/70">Résolus</p>
          </div>
          <div className="rounded-xl border border-warning-border bg-warning-bg p-3 text-center">
            <p className="text-2xl font-bold text-warning">3</p>
            <p className="text-xs text-warning/70">En cours</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-sunken p-3 text-center">
            <p className="font-mono text-2xl font-bold text-foreground">$142</p>
            <p className="text-xs text-foreground-muted">Coût</p>
          </div>
        </div>

        {/* Ticket list preview */}
        <div className="mt-4 space-y-2">
          {[
            { id: "KARA-142", title: "Pagination côté serveur sur /admin/users", status: "resolved", cost: "$3.42" },
            { id: "KARA-145", title: "Webhooks GitHub pour les événements PR", status: "in_progress", cost: "$1.20" },
            { id: "SHOP-89", title: "Filtre par catégorie sur le catalogue", status: "resolved", cost: "$2.60" },
          ].map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised px-3 py-2.5">
              <div
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  t.status === "resolved" ? "bg-success" : "bg-warning animate-pulse"
                )}
              />
              <span className="font-mono text-xs text-foreground-muted">{t.id}</span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{t.title}</span>
              <span className="font-mono text-xs font-semibold text-foreground-muted">{t.cost}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RootPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-mono text-sm font-bold tracking-tight text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">
              A
            </span>
            Alexis
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
            >
              Connexion
            </Link>
            <Link href="/login?mode=signup" className={buttonVariants("primary")}>
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(79,70,229,0.12) 0%, transparent 70%)",
          }}
        />

        <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-6 pb-24 pt-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-light px-4 py-1.5 text-xs font-semibold text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Agent de développement, pour solopreneurs et agences
          </div>

          {/* Headline */}
          <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-tight tracking-tight text-foreground sm:text-6xl">
            Une idée.{" "}
            <span className="text-brand">Un projet livré.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-foreground-muted">
            Décrivez ce qu'il faut faire. Alexis structure le travail, l'exécute,
            teste le résultat, et le livre, avec ou sans relecture avant mise en
            ligne, selon vos réglages.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login?mode=signup"
              className={cn(buttonVariants("primary"), "px-6 py-3 text-base shadow-md")}
            >
              Créer un compte gratuit
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants("secondary"), "px-6 py-3 text-base")}
            >
              Se connecter
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-6 text-xs text-foreground-subtle">
            Aucune carte bancaire requise · Démarrez en 5 minutes
          </p>

          {/* Dashboard preview */}
          <div className="mt-16 w-full max-w-2xl">
            <LivePipelinePreview />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t border-border bg-surface-raised">
        <div className="mx-auto w-full max-w-7xl px-6 py-20">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              Comment ça marche
            </p>
            <h2 className="mt-3 text-3xl font-bold text-foreground">
              De l'idée au projet livré, en 5 étapes
            </h2>
            <p className="mt-3 text-foreground-muted">
              Chaque projet est découpé en tickets. Chaque ticket passe par une spécification,
              un plan, une implémentation testée, avant la livraison.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {PIPELINE_STAGES.map((stage, i) => (
              <div key={stage.key} className="relative flex flex-col">
                {/* Connector line */}
                {i < PIPELINE_STAGES.length - 1 && (
                  <div className="absolute left-[calc(50%+1.5rem)] top-5 hidden h-px w-full bg-border lg:block" />
                )}
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
                  {stage.icon}
                </div>
                <p className="mt-4 text-sm font-bold text-foreground">{stage.label}</p>
                <p className="mt-1.5 text-sm text-foreground-muted leading-relaxed">
                  {stage.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Value props ── */}
      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-7xl px-6 py-20">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              Pourquoi Alexis
            </p>
            <h2 className="mt-3 text-3xl font-bold text-foreground">
              Pensé pour livrer sans y passer vos journées
            </h2>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_PROPS.map((prop) => (
              <div
                key={prop.title}
                className="rounded-2xl border border-border bg-surface-raised p-6 shadow-card"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand">
                  {prop.icon}
                </div>
                <h3 className="mt-4 text-sm font-bold text-foreground">{prop.title}</h3>
                <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
                  {prop.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="border-t border-border bg-foreground">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 py-20 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Créez votre premier projet
          </h2>
          <p className="mt-4 max-w-xl text-base text-white/60">
            Avec ou sans dépôt existant, votre projet est prêt en quelques minutes.
          </p>
          <Link
            href="/login?mode=signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-brand-hover transition-colors"
          >
            Commencer gratuitement
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-surface-raised">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-8">
          <div className="flex items-center gap-2 font-mono text-sm font-bold text-foreground-muted">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-white text-xs font-bold">
              A
            </span>
            Alexis
          </div>
          <span className="text-xs text-foreground-subtle">© 2026 Alexis. Tous droits réservés.</span>
        </div>
      </footer>
    </div>
  );
}
