import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import LandingNav from "@/components/landing-nav";
import LandingPipelineSteps from "@/components/landing-pipeline-steps";
import LandingBillingSection from "@/components/landing-billing-section";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RootPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* ── Nav ── */}
      <LandingNav />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-6 pb-24 pt-20 text-center">
          {/* Headline */}
          <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
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

          {/* Ticket ticker — un vrai identifiant + phase, vocabulaire public (cf. LandingPipelineSteps) */}
          <div className="mt-12 inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2 font-mono text-xs text-foreground-muted">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
            PROJ-142 · Cadrage
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
              De l'idée au projet livré, en 4 étapes
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-foreground-muted">
              Chaque projet est découpé en tickets. Chaque ticket suit ce parcours
              et vous validez avant chaque étape qui compte. Plusieurs projets,
              un seul tableau de bord.
            </p>
          </div>

          <div className="mt-14">
            <LandingPipelineSteps />
          </div>
        </div>
      </section>

      {/* ── Facturation ── */}
      <LandingBillingSection />

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
          <div className="flex items-center gap-2 font-display text-sm font-bold text-foreground-muted">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-white text-xs font-bold">
              A
            </span>
            Alexis
          </div>
          <div className="flex items-center gap-4">
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
