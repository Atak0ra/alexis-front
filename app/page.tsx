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

export default function RootPage() {
  return (
    <div className="relative mx-auto flex min-h-screen max-w-xl flex-col items-center px-6 py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-signal/10 blur-3xl"
      />
      <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">Orchestrateur de tickets</p>
      <h1 className="mt-3 font-mono text-4xl font-medium tracking-tight text-ink">Alexis</h1>
      <p className="mt-4 text-center text-base text-ink-muted">
        Vos tickets Linear pilotent un agent de code, du ticket au PR.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-1 gap-y-2 font-mono text-xs">
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

      <div className="mt-10 flex justify-center gap-3">
        <Link href="/login" className={buttonVariants("secondary")}>
          Connexion
        </Link>
        <Link href="/login?mode=signup" className={buttonVariants("primary")}>
          Créer un compte
        </Link>
      </div>

      <div className="mt-20 w-full border-t border-rule pt-10">
        <ul className="space-y-6">
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
    </div>
  );
}
