import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const PIPELINE_STEPS = [
  { name: "Todo", description: "Le ticket est en file d'attente, prêt à être pris en charge." },
  { name: "Spec", description: "L'agent rédige la spécification technique à partir du ticket." },
  { name: "Plan", description: "L'agent découpe la spec en un plan d'implémentation détaillé." },
  { name: "Dev", description: "L'agent implémente le plan, écrit et fait passer les tests." },
  { name: "PR", description: "Une pull request est ouverte automatiquement, prête à être relue." },
];

export default function RootPage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-semibold text-gray-900">Alexis</h1>
        <p className="mt-3 text-sm text-gray-600">
          Vos tickets Linear pilotent un agent de code, du ticket au PR.
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

      <div className="mt-16 w-full max-w-md border-t border-gray-200 pt-10">
        <ul className="space-y-6">
          {PIPELINE_STEPS.map((step) => (
            <li key={step.name}>
              <p className="text-sm font-medium text-gray-900">{step.name}</p>
              <p className="mt-1 text-sm text-gray-600">{step.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
