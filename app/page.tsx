import Link from "next/link";
import { RefreshCw, ShieldCheck, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import LandingNav from "@/components/landing-nav";
import LandingPipelineSteps from "@/components/landing-pipeline-steps";
import LandingBillingSection from "@/components/landing-billing-section";
import LandingDashboardPreview from "@/components/landing-dashboard-preview";
import LandingIconField from "@/components/landing-icon-field";

export default function RootPage() {
  return (
    <div className="min-h-screen bg-surface">
      <LandingNav />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <LandingIconField variant="light" />
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-6 pb-24 pt-20 text-center">

          <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
            Du code testé,{" "}
            <span className="text-brand">pas juste généré.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-foreground-muted">
            Décrivez ce que vous voulez. Alexis code, vérifie que tout fonctionne,
            corrige lui-même si quelque chose échoue, et livre sur votre vrai dépôt.
            Vous ne recevez jamais quelque chose de cassé.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login?mode=signup"
              className={cn(buttonVariants("primary"), "px-6 py-3 text-base shadow-md")}
            >
              Commencer gratuitement
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link href="/login" className={cn(buttonVariants("secondary"), "px-6 py-3 text-base")}>
              Se connecter
            </Link>
          </div>

          <p className="mt-6 text-xs text-foreground-subtle">
            Aucune carte bancaire requise · Démarrez en 5 minutes
          </p>

          {/* Aperçu du vrai dashboard — remplace la carte de livraison */}
          <div className="mt-14 w-full">
            <LandingDashboardPreview />
          </div>
        </div>
      </section>

      {/* ── Garantie qualité ── */}
      <section className="border-t border-border bg-foreground">
        <div className="mx-auto w-full max-w-7xl px-6 py-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {([
              [RefreshCw,   "Il corrige lui-même",         "Si une vérification échoue, Alexis relit l'erreur, corrige le code, et recommence. Vous ne voyez que le résultat final."],
              [ShieldCheck, "Jamais quelque chose de cassé","Alexis refuse de vous livrer un travail qui ne passe pas ses vérifications. Aucune livraison bâclée."],
              [GitBranch,   "Sur votre vrai dépôt",         "Pas une sandbox, pas un export. Votre code, dans votre compte GitHub ou GitLab, avec son historique complet."],
            ] as const).map(([Icon, title, body]) => (
              <div key={title} className="flex flex-col gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-5 w-5 text-white" aria-hidden />
                </span>
                <h3 className="text-base font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/60">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pipeline ── */}
      <section className="border-t border-border bg-surface-raised">
        <div className="mx-auto w-full max-w-7xl px-6 py-20">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              Comment ça marche
            </p>
            <h2 className="mt-3 text-3xl font-bold text-foreground">
              De l&apos;idée à la livraison, en 4 étapes
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-foreground-muted">
              Vous décrivez, vous validez aux moments clés. Alexis fait le reste —
              et ne vous livre que ce qui fonctionne vraiment.
            </p>
          </div>
          <div className="mt-14">
            <LandingPipelineSteps />
          </div>
        </div>
      </section>

      {/* ── Facturation ── */}
      <LandingBillingSection />

      {/* ── CTA final ── */}
      <section className="relative overflow-hidden border-t border-border bg-foreground">
        <LandingIconField variant="dark" />
        <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-6 py-20 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Créez votre premier projet
          </h2>
          <p className="mt-4 max-w-xl text-base text-white/60">
            Avec ou sans dépôt existant. Votre projet est prêt en quelques minutes.
            Vous ne payez que ce qu&apos;Alexis livre vraiment.
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
          <div className="flex items-center gap-2 font-display text-sm font-bold text-foreground-muted">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-white text-xs font-bold">
              A
            </span>
            Alexis
          </div>
          <div className="flex items-center gap-4">
            <Link href="/how-it-works" className="text-xs text-foreground-subtle hover:text-foreground-muted transition-colors">
              Fonctionnement
            </Link>
            <Link href="/admin/login" className="text-xs text-foreground-subtle hover:text-foreground-muted transition-colors">
              Connexion admin
            </Link>
            <span className="text-xs text-foreground-subtle">© 2026 Alexis. Tous droits réservés.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

