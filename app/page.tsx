import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const STAGES = [
  { key: "todo", label: "Todo", description: "La demande attend d'être prise en charge." },
  { key: "spec", label: "Spec", description: "Alexis rédige le besoin en détail." },
  { key: "plan", label: "Plan", description: "Alexis prépare les étapes du travail à faire." },
  { key: "dev", label: "Dev", description: "Alexis écrit le code et vérifie qu'il fonctionne." },
  { key: "livraison", label: "Livraison", description: "Le code est livré, prêt à être vérifié." },
] as const;

const ACTIVE_STAGE_INDEX = 3;

const VALUE_PROPS = [
  {
    title: "S'adapte à votre façon de travailler",
    description: "Les étapes suivent l'organisation que vous utilisez déjà, sans nouvelle méthode à apprendre.",
  },
  {
    title: "Rien à préparer à la main",
    description: "Alexis met en place ce qu'il faut dès que vous branchez un projet.",
  },
  {
    title: "Un vrai résultat livré",
    description: "Le travail se termine par du code livré et prêt à être vérifié, jamais une simple ébauche.",
  },
  {
    title: "Plusieurs projets, un seul compte",
    description: "Chaque projet garde ses propres réglages et accès, pilotés depuis la même interface.",
  },
] as const;

function PipelineTrail({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-2 font-mono text-xs", className)}>
      <span className="rounded-sm bg-paper px-2 py-1 text-ink">KARA-142</span>
      {STAGES.map((stage, i) => (
        <span key={stage.key} className="flex items-center gap-1">
          <span className="text-ink-muted/60">/</span>
          <span className={cn("flex items-center gap-1.5", i === ACTIVE_STAGE_INDEX ? "text-ink" : "text-ink-muted")}>
            {i === ACTIVE_STAGE_INDEX && (
              <span className="h-1.5 w-1.5 rounded-full bg-signal motion-safe:animate-pulse" aria-hidden="true" />
            )}
            {stage.label}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function RootPage() {
  return (
    <div className="relative w-full">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-signal/10 blur-3xl"
      />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <span className="font-mono text-sm font-medium tracking-tight text-ink">Alexis</span>
        <nav className="flex items-center gap-6">
          <Link href="/login" className="text-sm text-ink-muted hover:text-ink">
            Connexion
          </Link>
          <Link href="/login?mode=signup" className={buttonVariants("primary")}>
            Créer un compte
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-20 pt-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">Développement automatisé</p>
        <h1 className="mt-6 text-4xl font-medium leading-tight tracking-tight text-ink sm:text-5xl">
          Décrivez ce qu&apos;il faut faire, Alexis s&apos;occupe du reste.
        </h1>
        <p className="mt-5 max-w-xl text-base text-ink-muted sm:text-lg">
          Alexis suit vos demandes et avance, étape par étape, jusqu&apos;à un code livré et prêt à être vérifié.
        </p>

        <Link href="/login?mode=signup" className={cn(buttonVariants("primary"), "mt-8 px-6 py-3 text-base")}>
          Créer un compte
        </Link>

        <div className="mt-16 w-full max-w-2xl rounded-sm border border-rule bg-paper-dim px-6 py-6 text-left shadow-[0_1px_2px_rgba(32,28,24,0.05),0_16px_32px_-20px_rgba(32,28,24,0.25)]">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">Suivi en direct</p>
          <PipelineTrail className="mt-4" />
        </div>
      </section>

      <section className="w-full border-t border-rule bg-paper-dim/40">
        <div className="mx-auto w-full max-w-5xl px-6 py-16">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">Comment ça marche</p>
          <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {STAGES.map((stage) => (
              <li key={stage.key}>
                <p className="font-mono text-xs uppercase tracking-widest text-ink">{stage.label}</p>
                <p className="mt-2 text-sm text-ink-muted">{stage.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="w-full border-t border-rule">
        <div className="mx-auto w-full max-w-5xl px-6 py-16">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">Pourquoi Alexis</p>
          <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_PROPS.map((prop) => (
              <li key={prop.title}>
                <p className="text-sm font-medium text-ink">{prop.title}</p>
                <p className="mt-1.5 text-sm text-ink-muted">{prop.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="w-full border-t border-rule bg-paper-dim/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-16 text-center">
          <p className="text-2xl font-medium text-ink">Prêt à connecter votre premier projet ?</p>
          <Link href="/login?mode=signup" className={cn(buttonVariants("primary"), "mt-6 px-6 py-3 text-base")}>
            Créer un compte
          </Link>
        </div>
      </section>

      <footer className="w-full border-t border-rule">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
          <span className="font-mono text-xs text-ink-muted">Alexis</span>
          <span className="text-xs text-ink-muted">© 2026</span>
        </div>
      </footer>
    </div>
  );
}
