import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const STAGES = [
  { key: "todo", label: "Todo", description: "Le ticket est en file d'attente, prêt à être pris en charge." },
  { key: "spec", label: "Spec", description: "L'agent rédige la spécification technique à partir du ticket." },
  { key: "plan", label: "Plan", description: "L'agent découpe la spec en un plan d'implémentation détaillé." },
  { key: "dev", label: "Dev", description: "L'agent implémente le plan, écrit et fait passer les tests." },
  { key: "pr", label: "PR", description: "Une pull request est ouverte automatiquement, prête à être relue." },
] as const;

const ACTIVE_STAGE_INDEX = 3;

const VALUE_PROPS = [
  {
    title: "Suit votre process",
    description:
      "Les étapes (Todo, Spec, Plan, Dev, PR) sont celles de votre tracker de tickets, pas un workflow imposé à apprendre.",
  },
  {
    title: "Rien à préparer à la main",
    description:
      "Alexis crée les statuts manquants directement dans votre tracker au moment où vous branchez un projet.",
  },
  {
    title: "Une vraie pull request",
    description:
      "Le travail se termine par une PR ouverte automatiquement sur GitHub ou GitLab, prête à être relue — pas juste du code qui traîne.",
  },
  {
    title: "Plusieurs projets, un seul compte",
    description:
      "Chaque projet garde son propre dépôt, son propre agent et ses propres accès — pilotés depuis la même interface.",
  },
] as const;

export default function RootPage() {
  return (
    <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col items-center px-6 py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-signal/10 blur-3xl"
      />

      <div className="flex w-full max-w-md flex-col items-center text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">Automatisation de développement</p>
        <h1 className="mt-3 font-mono text-2xl font-medium tracking-tight text-ink">Alexis</h1>
        <p className="mt-6 text-2xl font-medium leading-snug text-ink">
          Vos tickets deviennent des pull requests.
        </p>
        <p className="mt-4 text-base text-ink-muted">
          Alexis surveille votre tracker de tickets et fait avancer un agent de code à travers chaque étape de votre
          process, jusqu&apos;à une pull request prête à relire.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <Link href="/login" className={buttonVariants("secondary")}>
            Connexion
          </Link>
          <Link href="/login?mode=signup" className={buttonVariants("primary")}>
            Créer un compte
          </Link>
        </div>
      </div>

      <div className="mt-24 w-full border-t border-rule pt-12">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">Comment ça marche</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-1 gap-y-2 font-mono text-xs">
          <span className="rounded-sm bg-paper-dim px-2 py-1 text-ink">KARA-142</span>
          {STAGES.map((stage, i) => (
            <span key={stage.key} className="flex items-center gap-1">
              <span className="text-ink-muted/60">/</span>
              <span
                className={cn("flex items-center gap-1.5", i === ACTIVE_STAGE_INDEX ? "text-ink" : "text-ink-muted")}
              >
                {i === ACTIVE_STAGE_INDEX && (
                  <span className="h-1.5 w-1.5 rounded-full bg-signal motion-safe:animate-pulse" aria-hidden="true" />
                )}
                {stage.label}
              </span>
            </span>
          ))}
        </div>

        <ul className="mt-8 space-y-6">
          {STAGES.map((stage) => (
            <li key={stage.key} className="flex gap-4">
              <span className="w-12 shrink-0 font-mono text-xs uppercase tracking-widest text-ink-muted">
                {stage.label}
              </span>
              <p className="text-sm text-ink-muted">{stage.description}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-20 w-full border-t border-rule pt-12">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">Pourquoi Alexis</p>
        <ul className="mt-6 grid gap-8 sm:grid-cols-2">
          {VALUE_PROPS.map((prop) => (
            <li key={prop.title}>
              <p className="text-sm font-medium text-ink">{prop.title}</p>
              <p className="mt-1.5 text-sm text-ink-muted">{prop.description}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-20 flex w-full flex-col items-center border-t border-rule pt-12 text-center">
        <p className="text-lg font-medium text-ink">Prêt à connecter votre premier projet ?</p>
        <Link href="/login?mode=signup" className={cn(buttonVariants("primary"), "mt-6")}>
          Créer un compte
        </Link>
      </div>
    </div>
  );
}
