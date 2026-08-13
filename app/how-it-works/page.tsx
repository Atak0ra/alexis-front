import Link from "next/link";
import {
  CheckCircle2, Code2, FileText, GitBranch, GitMerge, Lock,
  RefreshCw, ShieldCheck, TestTube2, Workflow, Box, Eye,
} from "lucide-react";
import LandingNav from "@/components/landing-nav";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Section({ id, label, title, children }: {
  id: string; label: string; title: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-border py-16">
      <div className="mx-auto w-full max-w-4xl px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">{label}</p>
        <h2 className="mt-2 text-2xl font-bold text-foreground">{title}</h2>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function Card({ Icon, title, body }: {
  Icon: React.ComponentType<{ className?: string }>; title: string; body: string;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-border bg-surface-raised p-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10">
        <Icon className="h-5 w-5 text-brand" />
      </span>
      <div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-foreground-muted">{body}</p>
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-surface">
      <LandingNav />

      {/* Header */}
      <div className="border-b border-border bg-surface-raised">
        <div className="mx-auto w-full max-w-4xl px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">Fonctionnement</p>
          <h1 className="mt-2 text-4xl font-bold leading-tight text-foreground">Sous le capot</h1>
          <p className="mt-4 max-w-2xl text-lg text-foreground-muted">
            Ce que fait Alexis à chaque étape — pour les équipes techniques qui ont besoin de comprendre ce qu&apos;elles adoptent.
          </p>
          <nav className="mt-8 flex flex-wrap gap-2">
            {([
              ["#pipeline",  "Pipeline"],
              ["#qualite",   "Qualité & tests"],
              ["#isolation", "Isolation & sécurité"],
              ["#controle",  "Contrôle & propriété"],
            ] as const).map(([href, label]) => (
              <a key={href} href={href}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground-muted hover:border-brand/40 hover:text-brand transition-colors">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Pipeline */}
      <Section id="pipeline" label="1 — Pipeline" title="De l'idée au merge, étape par étape">
        <p className="text-sm leading-relaxed text-foreground-muted mb-6">
          Chaque ticket suit un pipeline structuré. L&apos;agent n&apos;est jamais lancé sans que l’étape précédente ait produit un livrable validé.
        </p>
        <ol className="space-y-4">
          {([
            [FileText,  "Spec",         "Humain → Todo",            "L’agent écrit une spécification fonctionnelle à partir du ticket. Postée en commentaire, validée par l’humain avant Plan."],
            [Workflow,  "Plan",         "Humain → Plan",            "L’agent traduit la spec en plan technique détaillé : fichiers, logique, tests à écrire. Validé avant le code."],
            [Code2,     "Dev",          "Humain → Dev",             "L’agent implémente, commit et push sur feat/{id}/{slug}. Tests TU + TI obligatoires pour tout code métier produit."],
            [ShieldCheck,"Gate qualité","Automatique",              "Lint → typecheck → build → tests. Présence de tests vérifiée (bloquant). Boucle de correction bornée (2 tentatives)."],
            [Eye,       "Review IA",    "Automatique (si activée)", "Revue de code IA postée en commentaire. Non-bloquante — signale les points d’attention."],
            [GitMerge,  "Merge",        "Humain → To Merge",        "Rebase + merge --ff-only sur develop, branche supprimée. Historique linéaire garanti."],
          ] as const).map(([Icon, step, trigger, desc], i) => (
            <li key={step} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-brand bg-brand-light text-xs font-bold text-brand">{i + 1}</span>
                {i < 5 && <div className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="pb-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-foreground-muted" />
                  <span className="text-sm font-bold text-foreground">{step}</span>
                  <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] text-foreground-subtle">{trigger}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground-muted">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 rounded-lg border border-border bg-surface-raised p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-2">Retry borné</p>
          <p className="text-sm text-foreground-muted">
            Chaque étape échoue au maximum <strong className="text-foreground">2 fois</strong> avant de basculer en <code className="text-xs bg-surface px-1 py-0.5 rounded">*_Failed</code>. Un commentaire explicatif est posté sur le ticket.
          </p>
        </div>
      </Section>

      {/* Qualité */}
      <Section id="qualite" label="2 — Qualité & tests" title="Le gate qui bloque les livraisons cassées">
        <p className="text-sm leading-relaxed text-foreground-muted mb-6">
          Le gate est <strong className="text-foreground">bloquant</strong> — aucune pull request créée sur du code qui ne passe pas.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
          <Card Icon={TestTube2} title="Tests obligatoires (TU + TI)"
            body="Le gate vérifie que le diff contient des fichiers de test. Absent : l’agent est renvoyé les écrire (2 tentatives). Toujours absent : livraison bloquée." />
          <Card Icon={RefreshCw} title="Boucle de correction automatique"
            body="Si un check échoue, l’agent relit le rapport d’erreur exact, corrige et recommit. Jusqu’à 2 tentatives avant blocage définitif." />
          <Card Icon={ShieldCheck} title="Jamais de PR cassée"
            body="La PR n’est créée que si le gate passe entièrement. Vous ne recevez jamais du code dont les tests échouent." />
          <Card Icon={CheckCircle2} title="Rapport affiché sur le ticket"
            body="Le commentaire liste les stacks détectées, les checks exécutés et les fichiers de test présents. Traçabilité complète." />
        </div>
        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <p className="text-sm font-bold text-foreground mb-3">Stacks supportées</p>
          <div className="space-y-2">
            {([
              ["TypeScript / Next.js", "ESLint · tsc --noEmit · npm run build · npm test"],
              ["Python / FastAPI",     "Ruff (lint) · Mypy (typecheck) · Pytest"],
              ["Python / Django",      "manage.py check · migrations check · Ruff · Pytest"],
            ] as const).map(([stack, checks]) => (
              <div key={stack} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
                <span className="w-44 shrink-0 text-sm font-semibold text-foreground">{stack}</span>
                <span className="font-mono text-xs text-foreground-muted">{checks}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-foreground-subtle">
            Autres stacks (Java, Go, Rust…) : désactivez le gate via <code className="bg-surface px-1 rounded">quality_baseline_enabled=False</code> dans les réglages du projet.
          </p>
        </div>
      </Section>

      {/* Isolation */}
      <Section id="isolation" label="3 — Isolation & sécurité" title="Ce qui protège votre code et vos secrets">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card Icon={Box} title="Container Docker éphémère par run"
            body="Chaque run s’exécute dans un container isolé, détruit après. Aucun état persistant entre deux runs, aucune contamination entre projets." />
          <Card Icon={Lock} title="Volume isolé par projet"
            body="Workspace dans un volume nommé ws-{client_id}-{project_id}. Isolation totale entre tous les clients et tous les projets." />
          <Card Icon={ShieldCheck} title="Secrets injectés en variables d’env"
            body="Tokens forge et clés API injectés comme variables d’environnement dans le container — jamais écrits sur le disque, jamais dans les logs." />
          <Card Icon={Lock} title="Secrets chiffrés en base (Fernet)"
            body="Tous les secrets (clés agent, tokens forge, clés gérées) sont chiffrés via EncryptedStr + Fernet. Un vol de dump Postgres sans ALEXIS_MASTER_KEY ne donne rien." />
          <Card Icon={ShieldCheck} title="Isolation multi-tenant"
            body="Chaque projet a son propre repo et token forge. Chaque route API vérifie l’ownership. Impossible d’accéder aux données d’un autre client." />
          <Card Icon={GitBranch} title="Token forge éphémère (repos hébergés)"
            body="Pour les repos hébergés (GitHub App), un token scoped temporaire est minté à chaque run. Jamais de token permanent à longue durée de vie." />
        </div>
      </Section>

      {/* Contrôle */}
      <Section id="controle" label="4 — Contrôle & propriété" title="Ce que vous gardez toujours">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card Icon={GitBranch} title="Votre vrai dépôt Git"
            body="Alexis travaille directement sur votre dépôt GitHub ou GitLab. Pas de sandbox, pas d’export. Votre code, votre historique." />
          <Card Icon={GitMerge} title="Historique linéaire (rebase + ff-only)"
            body="Rebase + merge --ff-only sur develop. Zéro commit de merge parasite. L’historique Git reste propre et navigable." />
          <Card Icon={CheckCircle2} title="Validation humaine à chaque étape clé"
            body="Vous validez la spec, le plan, la PR. Alexis ne prend jamais une décision structurante sans votre approbation explicite." />
          <Card Icon={Eye} title="BYOK — votre propre clé d’inférence"
            body="En plan BYOK, vous apportez votre clé API (OpenAI, Groq, Mistral…). Chiffrée en base, injectée en env uniquement au moment du run." />
        </div>
      </Section>

      {/* CTA */}
      <section className="border-t border-border bg-foreground">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-white">Prêt à l&apos;utiliser pour votre équipe ?</h2>
          <p className="mt-3 max-w-xl text-sm text-white/60">
            Essai gratuit, sans carte bancaire. Ou contactez-nous pour votre agence.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login?mode=signup" className={cn(buttonVariants("primary"), "px-6 py-3 text-sm")}>
              Créer un compte gratuit
            </Link>
            <a href="mailto:contact@alexis.dev"
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 hover:border-white/40 hover:text-white transition-colors">
              Nous contacter
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface-raised">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-2 font-display text-sm font-bold text-foreground-muted">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-white text-xs font-bold">A</span>
            Alexis
          </Link>
          <Link href="/" className="text-sm text-foreground-muted hover:text-foreground transition-colors">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </footer>
    </div>
  );
}
