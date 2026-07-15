import type { LinearTeam, ProjectOut, Ticket } from "@/lib/api-client";
import { DEFAULT_MODELS, DEFAULT_STATES, DEFAULT_TRIGGER_STATES } from "@/lib/project-defaults";

export function isLocalMode(): boolean {
  return process.env.NEXT_PUBLIC_IS_LOCAL === "true";
}

export const DEMO_CREDENTIALS = { email: "demo", password: "passer" };

export const DEMO_TEAMS: LinearTeam[] = [
  { id: "team-demo-eng", name: "Engineering", key: "ENG" },
  { id: "team-demo-product", name: "Product", key: "PRD" },
];

let demoProjects: ProjectOut[] = [
  {
    id: "demo-project-1",
    name: "kara",
    repo_url: "https://github.com/acme/kara.git",
    agent_choice: "claude",
    agent_base_url: null,
    linear_team_id: "team-demo-eng",
    forge_provider: "github",
    states: DEFAULT_STATES,
    trigger_states: DEFAULT_TRIGGER_STATES,
    models: DEFAULT_MODELS,
    run_timeout_seconds: 1800,
    is_active: true,
    created_at: "2026-06-01T09:00:00Z",
  },
  {
    id: "demo-project-2",
    name: "shopfront",
    repo_url: "https://gitlab.com/acme/shopfront.git",
    agent_choice: "aider",
    agent_base_url: null,
    linear_team_id: "team-demo-product",
    forge_provider: "gitlab",
    states: DEFAULT_STATES,
    trigger_states: DEFAULT_TRIGGER_STATES,
    models: DEFAULT_MODELS,
    run_timeout_seconds: 1800,
    is_active: true,
    created_at: "2026-05-20T14:30:00Z",
  },
];

export function listDemoProjects(): ProjectOut[] {
  return demoProjects;
}

export function getDemoProject(projectId: string): ProjectOut | null {
  return demoProjects.find((p) => p.id === projectId) ?? null;
}

export function addDemoProject(project: ProjectOut): void {
  demoProjects = [...demoProjects, project];
}

export interface DemoProjectStats {
  resolved: number;
  in_progress: number;
  failed: number;
  total_cost_usd: number;
}

function seedFromId(id: string): number {
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  return seed;
}

export function getDemoProjectStats(projectId: string): DemoProjectStats {
  const seed = seedFromId(projectId);
  const resolved = 8 + (seed % 40);
  const in_progress = 1 + (seed % 5);
  const failed = seed % 4;
  const total_cost_usd = Math.round(resolved * (2.1 + (seed % 7) * 0.4) * 100) / 100;
  return { resolved, in_progress, failed, total_cost_usd };
}

// ─── Demo tickets ────────────────────────────────────────────────────────────

const DEMO_TICKETS: Record<string, Ticket[]> = {
  "demo-project-1": [
    // Resolved
    {
      id: "KARA-142",
      title: "Ajouter la pagination sur la liste des utilisateurs",
      description:
        "La liste `/admin/users` charge tous les enregistrements en une seule requête. Implémenter une pagination côté serveur (limit/offset) avec des contrôles de navigation dans l'UI.",
      status: "resolved",
      agent: "claude-3-5-sonnet",
      cost_usd: 3.42,
      updated_at: "2026-07-10T14:22:00Z",
      pr_url: "https://github.com/acme/kara/pull/87",
      pr_title: "feat: server-side pagination for /admin/users",
    },
    {
      id: "KARA-138",
      title: "Corriger le bug de double soumission du formulaire de paiement",
      description:
        "Quand l'utilisateur clique rapidement deux fois sur « Payer », deux transactions sont créées. Désactiver le bouton après le premier clic et ajouter une protection idempotente côté API.",
      status: "resolved",
      agent: "claude-3-5-sonnet",
      cost_usd: 2.18,
      updated_at: "2026-07-09T10:05:00Z",
      pr_url: "https://github.com/acme/kara/pull/85",
      pr_title: "fix: prevent double-submit on payment form",
    },
    {
      id: "KARA-131",
      title: "Migrer les tests unitaires vers Vitest",
      description:
        "Remplacer Jest par Vitest pour bénéficier du support natif ESM et des performances améliorées. Mettre à jour la configuration, les scripts npm et corriger les imports incompatibles.",
      status: "resolved",
      agent: "claude-3-5-sonnet",
      cost_usd: 4.75,
      updated_at: "2026-07-07T16:40:00Z",
      pr_url: "https://github.com/acme/kara/pull/82",
      pr_title: "chore: migrate test suite to Vitest",
    },
    {
      id: "KARA-127",
      title: "Implémenter le dark mode via CSS variables",
      description:
        "Ajouter un toggle dark/light mode persisté dans localStorage. Utiliser des CSS custom properties pour les couleurs afin d'éviter les classes conditionnelles partout dans le code.",
      status: "resolved",
      agent: "claude-3-5-sonnet",
      cost_usd: 5.90,
      updated_at: "2026-07-05T09:15:00Z",
      pr_url: "https://github.com/acme/kara/pull/79",
      pr_title: "feat: dark mode with CSS variables and localStorage",
    },
    {
      id: "KARA-119",
      title: "Optimiser les requêtes N+1 sur l'endpoint /projects",
      description:
        "L'endpoint GET /projects effectue une requête SQL par projet pour récupérer les stats. Utiliser une jointure ou un batch query pour ramener tout en une seule requête.",
      status: "resolved",
      agent: "claude-3-5-sonnet",
      cost_usd: 2.85,
      updated_at: "2026-07-03T11:30:00Z",
      pr_url: "https://github.com/acme/kara/pull/76",
      pr_title: "perf: fix N+1 queries on /projects endpoint",
    },
    // In progress
    {
      id: "KARA-145",
      title: "Intégrer les webhooks GitHub pour les événements de PR",
      description:
        "Recevoir les événements `pull_request` de GitHub (opened, closed, merged) et mettre à jour le statut des tickets Linear correspondants automatiquement.",
      status: "in_progress",
      agent: "claude-3-5-sonnet",
      cost_usd: 1.20,
      updated_at: "2026-07-14T08:00:00Z",
    },
    {
      id: "KARA-143",
      title: "Ajouter des notifications email pour les tickets en échec",
      description:
        "Envoyer un email récapitulatif à l'équipe quand un ticket passe en statut `failed`, avec le message d'erreur et un lien vers les logs.",
      status: "in_progress",
      agent: "claude-3-5-sonnet",
      cost_usd: 0.65,
      updated_at: "2026-07-13T17:45:00Z",
    },
    // Failed
    {
      id: "KARA-136",
      title: "Refactoriser le module d'authentification OAuth",
      description:
        "Extraire la logique OAuth (Google, GitHub) dans un module dédié avec une interface commune. Supprimer le code dupliqué entre les deux providers.",
      status: "failed",
      agent: "claude-3-5-sonnet",
      cost_usd: 1.95,
      updated_at: "2026-07-08T14:10:00Z",
      error_message:
        "Échec de la compilation TypeScript : types incompatibles entre le module OAuth existant et la nouvelle interface. L'agent a tenté 3 approches différentes sans succès. Intervention manuelle requise pour résoudre les conflits de types.",
    },
  ],
  "demo-project-2": [
    // Resolved
    {
      id: "SHOP-89",
      title: "Ajouter le filtre par catégorie sur la page catalogue",
      description:
        "Permettre aux utilisateurs de filtrer les produits par catégorie via des checkboxes dans la sidebar. Les filtres doivent être reflétés dans l'URL pour permettre le partage de liens.",
      status: "resolved",
      agent: "aider",
      cost_usd: 2.60,
      updated_at: "2026-07-11T13:00:00Z",
      pr_url: "https://gitlab.com/acme/shopfront/-/merge_requests/54",
      pr_title: "feat: category filter with URL sync on catalog page",
    },
    {
      id: "SHOP-84",
      title: "Corriger l'affichage des prix avec TVA sur mobile",
      description:
        "Sur les écrans < 375px, le prix TTC et le prix HT se chevauchent. Revoir le layout du composant `PriceDisplay` pour les petits écrans.",
      status: "resolved",
      agent: "aider",
      cost_usd: 1.10,
      updated_at: "2026-07-09T09:20:00Z",
      pr_url: "https://gitlab.com/acme/shopfront/-/merge_requests/51",
      pr_title: "fix: price display overlap on small screens",
    },
    {
      id: "SHOP-78",
      title: "Implémenter le cache Redis pour les pages produit",
      description:
        "Les pages produit sont régénérées à chaque requête. Mettre en place un cache Redis avec TTL de 5 minutes pour les données produit, invalidé lors des mises à jour.",
      status: "resolved",
      agent: "aider",
      cost_usd: 3.80,
      updated_at: "2026-07-06T15:55:00Z",
      pr_url: "https://gitlab.com/acme/shopfront/-/merge_requests/48",
      pr_title: "perf: Redis cache for product pages (TTL 5min)",
    },
    // In progress
    {
      id: "SHOP-92",
      title: "Intégrer Stripe pour les paiements récurrents",
      description:
        "Ajouter le support des abonnements mensuels via Stripe Billing. Créer les webhooks pour gérer les événements de paiement réussi, échoué et d'annulation.",
      status: "in_progress",
      agent: "aider",
      cost_usd: 2.30,
      updated_at: "2026-07-14T10:30:00Z",
    },
    // Failed
    {
      id: "SHOP-81",
      title: "Migrer la base de données de MySQL vers PostgreSQL",
      description:
        "Migrer le schéma et les données de MySQL 8 vers PostgreSQL 16. Adapter les requêtes spécifiques à MySQL (JSON_EXTRACT, GROUP_CONCAT, etc.).",
      status: "failed",
      agent: "aider",
      cost_usd: 4.15,
      updated_at: "2026-07-08T18:00:00Z",
      error_message:
        "La migration du schéma a échoué sur 3 tables avec des contraintes de clés étrangères circulaires. Les requêtes JSON_EXTRACT ont été converties mais les tests d'intégration révèlent des différences de comportement sur les valeurs NULL. Nécessite une revue manuelle du schéma.",
    },
  ],
};

export function getDemoTickets(projectId: string): Ticket[] {
  return DEMO_TICKETS[projectId] ?? [];
}

// ─── Demo project context ─────────────────────────────────────────────────────

/** projectId → "in_progress" | "done" | "failed" | null */
const demoContextStatus: Record<string, "in_progress" | "done" | "failed" | null> = {};

/** projectIds that already have a .alexis/project.md (context exists) */
const demoContextExists = new Set<string>(["demo-project-1", "demo-project-2"]);

export function getDemoContextExists(projectId: string): boolean {
  return demoContextExists.has(projectId);
}

export function startDemoContextGeneration(projectId: string): void {
  demoContextStatus[projectId] = "in_progress";
  // Simulate async completion after 1 poll cycle
  setTimeout(() => {
    demoContextStatus[projectId] = "done";
    demoContextExists.add(projectId);
  }, 2500);
}

export function getDemoContextStatus(
  projectId: string
): "in_progress" | "done" | "failed" | null {
  return demoContextStatus[projectId] ?? null;
}
