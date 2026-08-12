import type { ProjectOut, Issue, IssueAsset, ProjectReference } from "@/lib/api-client";
import { DEFAULT_MODELS, DEFAULT_STATES, DEFAULT_TRIGGER_STATES } from "@/lib/project-defaults";

export function isLocalMode(): boolean {
  return process.env.NEXT_PUBLIC_IS_LOCAL === "true";
}

export const DEMO_CREDENTIALS = { email: "demo", password: "passer" };

let demoProjects: ProjectOut[] = [
  {
    id: "demo-project-1",
    name: "proj-demo",
    repo_url: "https://github.com/acme/proj-demo.git",
    is_hosted: false,
    agent_choice: "claude",
    agent_base_url: null,
    has_agent_api_key: true,
    issue_prefix: "PROJ",
    forge_provider: "github",
    has_forge_token: true,
    states: DEFAULT_STATES,
    trigger_states: DEFAULT_TRIGGER_STATES,
    models: DEFAULT_MODELS,
    code_review_enabled: true,
    run_timeout_seconds: 1800,
    is_active: true,
    created_at: "2026-06-01T09:00:00Z",
  },
  {
    id: "demo-project-2",
    name: "shopfront",
    repo_url: "https://gitlab.com/acme/shopfront.git",
    is_hosted: false,
    agent_choice: "aider",
    agent_base_url: null,
    has_agent_api_key: true,
    issue_prefix: "SHOP",
    forge_provider: "gitlab",
    has_forge_token: true,
    states: DEFAULT_STATES,
    trigger_states: DEFAULT_TRIGGER_STATES,
    models: DEFAULT_MODELS,
    code_review_enabled: true,
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
  total_cost_display: number;
  display_currency: string;
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
  // La devise affichée est USD (identique au backend) — pas de conversion.
  const total_cost_display = total_cost_usd;
  return { resolved, in_progress, failed, total_cost_usd, total_cost_display, display_currency: "USD" };
}

// ─── Demo issues (tracker natif — 14 états du workflow) ──────────────────────

let demoIssues: Record<string, Issue[]> = {
  "demo-project-1": [
    {
      id: "issue-proj-1",
      identifier: "PROJ-1",
      number: 1,
      title: "Ajouter la pagination sur la liste des utilisateurs",
      description:
        "La liste `/admin/users` charge tous les enregistrements en une seule requête. Implémenter une pagination côté serveur (limit/offset) avec des contrôles de navigation dans l'UI.",
      state: "Done",
      labels: ["perf"],
      origin: "human" as const,
      created_at: "2026-07-01T09:00:00Z",
      updated_at: "2026-07-10T14:22:00Z",
      comments: [],
    },
    {
      id: "issue-proj-2",
      identifier: "PROJ-2",
      number: 2,
      title: "Corriger le bug de double soumission du formulaire de paiement",
      description:
        "Quand l'utilisateur clique rapidement deux fois sur « Payer », deux transactions sont créées. Désactiver le bouton après le premier clic et ajouter une protection idempotente côté API.",
      state: "To Merge",
      labels: ["bug"],
      origin: "human" as const,
      created_at: "2026-07-02T10:00:00Z",
      updated_at: "2026-07-09T10:05:00Z",
      comments: [],
    },
    {
      id: "issue-proj-3",
      identifier: "PROJ-3",
      number: 3,
      title: "Migrer les tests unitaires vers Vitest",
      description:
        "Remplacer Jest par Vitest pour bénéficier du support natif ESM et des performances améliorées. Mettre à jour la configuration, les scripts npm et corriger les imports incompatibles.",
      state: "Dev",
      labels: ["chore"],
      origin: "human" as const,
      created_at: "2026-07-03T11:00:00Z",
      updated_at: "2026-07-07T16:40:00Z",
      comments: [],
    },
    {
      id: "issue-proj-4",
      identifier: "PROJ-4",
      number: 4,
      title: "Implémenter le dark mode via CSS variables",
      description:
        "Ajouter un toggle dark/light mode persisté dans localStorage. Utiliser des CSS custom properties pour les couleurs.",
      state: "Plan Review",
      labels: ["feat"],
      origin: "human" as const,
      created_at: "2026-07-04T08:00:00Z",
      updated_at: "2026-07-05T09:15:00Z",
      comments: [],
    },
    {
      id: "issue-proj-5",
      identifier: "PROJ-5",
      number: 5,
      title: "Optimiser les requêtes N+1 sur l'endpoint /projects",
      description:
        "L'endpoint GET /projects effectue une requête SQL par projet pour récupérer les stats. Utiliser une jointure ou un batch query.",
      state: "Plan",
      labels: ["perf"],
      origin: "human" as const,
      created_at: "2026-07-05T09:00:00Z",
      updated_at: "2026-07-05T09:00:00Z",
      comments: [],
    },
    {
      id: "issue-proj-6",
      identifier: "PROJ-6",
      number: 6,
      title: "Intégrer les webhooks GitHub pour les événements de PR",
      description:
        "Recevoir les événements `pull_request` de GitHub (opened, closed, merged) et mettre à jour le statut des issues automatiquement.",
      state: "Spec Review",
      labels: ["feat"],
      origin: "human" as const,
      created_at: "2026-07-06T10:00:00Z",
      updated_at: "2026-07-14T08:00:00Z",
      comments: [],
    },
    {
      id: "issue-proj-7",
      identifier: "PROJ-7",
      number: 7,
      title: "Ajouter des notifications email pour les tickets en échec",
      description:
        "Envoyer un email récapitulatif à l'équipe quand un ticket passe en statut `failed`, avec le message d'erreur et un lien vers les logs.",
      state: "Spec",
      labels: ["feat"],
      origin: "human" as const,
      created_at: "2026-07-07T12:00:00Z",
      updated_at: "2026-07-13T17:45:00Z",
      comments: [],
    },
    {
      id: "issue-proj-8",
      identifier: "PROJ-8",
      number: 8,
      title: "Refactoriser le module d'authentification OAuth",
      description:
        "Extraire la logique OAuth (Google, GitHub) dans un module dédié avec une interface commune. Supprimer le code dupliqué entre les deux providers.",
      state: "Dev Failed",
      labels: ["refactor"],
      origin: "human" as const,
      created_at: "2026-07-08T09:00:00Z",
      updated_at: "2026-07-08T14:10:00Z",
      comments: [
        {
          id: "comment-proj-8-1",
          body: "Échec de la compilation TypeScript : types incompatibles entre le module OAuth existant et la nouvelle interface. L'agent a tenté 3 approches différentes sans succès.",
          author: "alexis",
          created_at: "2026-07-08T14:10:00Z",
        },
      ],
    },
    {
      id: "issue-proj-9",
      identifier: "PROJ-9",
      number: 9,
      title: "Ajouter un système de rate limiting sur l'API publique",
      description:
        "Implémenter un rate limiting par IP et par token API pour protéger les endpoints publics. Utiliser Redis pour stocker les compteurs.",
      state: "Todo",
      labels: ["security"],
      origin: "human" as const,
      created_at: "2026-07-09T10:00:00Z",
      updated_at: "2026-07-09T10:00:00Z",
      comments: [],
    },
    {
      id: "issue-proj-10",
      identifier: "PROJ-10",
      number: 10,
      title: "Documenter l'API avec OpenAPI / Swagger",
      description:
        "Générer la documentation OpenAPI automatiquement depuis les annotations FastAPI et la publier sur /docs avec une interface Swagger UI.",
      state: "Backlog",
      labels: ["docs"],
      origin: "human" as const,
      created_at: "2026-07-10T08:00:00Z",
      updated_at: "2026-07-10T08:00:00Z",
      comments: [],
    },
  ],
  "demo-project-2": [
    {
      id: "issue-shop-1",
      identifier: "SHOP-1",
      number: 1,
      title: "Ajouter le filtre par catégorie sur la page catalogue",
      description:
        "Permettre aux utilisateurs de filtrer les produits par catégorie via des checkboxes dans la sidebar. Les filtres doivent être reflétés dans l'URL.",
      state: "Done",
      labels: ["feat"],
      origin: "human" as const,
      created_at: "2026-07-01T09:00:00Z",
      updated_at: "2026-07-11T13:00:00Z",
      comments: [],
    },
    {
      id: "issue-shop-2",
      identifier: "SHOP-2",
      number: 2,
      title: "Corriger l'affichage des prix avec TVA sur mobile",
      description:
        "Sur les écrans < 375px, le prix TTC et le prix HT se chevauchent. Revoir le layout du composant `PriceDisplay` pour les petits écrans.",
      state: "To Merge",
      labels: ["bug"],
      origin: "human" as const,
      created_at: "2026-07-02T10:00:00Z",
      updated_at: "2026-07-09T09:20:00Z",
      comments: [],
    },
    {
      id: "issue-shop-3",
      identifier: "SHOP-3",
      number: 3,
      title: "Implémenter le cache Redis pour les pages produit",
      description:
        "Les pages produit sont régénérées à chaque requête. Mettre en place un cache Redis avec TTL de 5 minutes pour les données produit.",
      state: "Dev",
      labels: ["perf"],
      origin: "human" as const,
      created_at: "2026-07-03T11:00:00Z",
      updated_at: "2026-07-06T15:55:00Z",
      comments: [],
    },
    {
      id: "issue-shop-4",
      identifier: "SHOP-4",
      number: 4,
      title: "Intégrer Stripe pour les paiements récurrents",
      description:
        "Ajouter le support des abonnements mensuels via Stripe Billing. Créer les webhooks pour gérer les événements de paiement réussi, échoué et d'annulation.",
      state: "Plan",
      labels: ["feat"],
      origin: "human" as const,
      created_at: "2026-07-04T08:00:00Z",
      updated_at: "2026-07-14T10:30:00Z",
      comments: [],
    },
    {
      id: "issue-shop-5",
      identifier: "SHOP-5",
      number: 5,
      title: "Migrer la base de données de MySQL vers PostgreSQL",
      description:
        "Migrer le schéma et les données de MySQL 8 vers PostgreSQL 16. Adapter les requêtes spécifiques à MySQL (JSON_EXTRACT, GROUP_CONCAT, etc.).",
      state: "Plan Failed",
      labels: ["infra"],
      origin: "human" as const,
      created_at: "2026-07-05T09:00:00Z",
      updated_at: "2026-07-08T18:00:00Z",
      comments: [
        {
          id: "comment-shop-5-1",
          body: "La migration du schéma a échoué sur 3 tables avec des contraintes de clés étrangères circulaires. Nécessite une revue manuelle du schéma.",
          author: "alexis",
          created_at: "2026-07-08T18:00:00Z",
        },
      ],
    },
    {
      id: "issue-shop-6",
      identifier: "SHOP-6",
      number: 6,
      title: "Ajouter la recherche full-text sur les produits",
      description:
        "Implémenter une recherche full-text sur le titre et la description des produits avec PostgreSQL `tsvector` et un index GIN.",
      state: "Spec",
      labels: ["feat"],
      origin: "human" as const,
      created_at: "2026-07-06T10:00:00Z",
      updated_at: "2026-07-06T10:00:00Z",
      comments: [],
    },
    {
      id: "issue-shop-7",
      identifier: "SHOP-7",
      number: 7,
      title: "Mettre en place le monitoring avec Sentry",
      description:
        "Intégrer Sentry pour capturer les erreurs front et back. Configurer les alertes et les groupes d'erreurs.",
      state: "Backlog",
      labels: ["ops"],
      origin: "human" as const,
      created_at: "2026-07-07T12:00:00Z",
      updated_at: "2026-07-07T12:00:00Z",
      comments: [],
    },
  ],
};

export function getDemoIssues(projectId: string): Issue[] {
  return demoIssues[projectId] ?? [];
}

export function addDemoIssue(projectId: string, issue: Issue): void {
  demoIssues = {
    ...demoIssues,
    [projectId]: [...(demoIssues[projectId] ?? []), issue],
  };
}

export function updateDemoIssue(projectId: string, issueId: string, patch: Partial<Issue>): Issue | null {
  const issues = demoIssues[projectId] ?? [];
  const idx = issues.findIndex((i) => i.id === issueId);
  if (idx === -1) return null;
  const updated = { ...issues[idx], ...patch, updated_at: new Date().toISOString() };
  const newList = [...issues];
  newList[idx] = updated;
  demoIssues = { ...demoIssues, [projectId]: newList };
  return updated;
}

export function deleteDemoIssue(projectId: string, issueId: string): void {
  demoIssues = {
    ...demoIssues,
    [projectId]: (demoIssues[projectId] ?? []).filter((i) => i.id !== issueId),
  };
}

// ─── Demo issue assets ────────────────────────────────────────────────────────

let demoIssueAssets: Record<string, IssueAsset[]> = {};

function _fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function addDemoIssueAsset(issueId: string, file: File): Promise<IssueAsset> {
  const dataUrl = await _fileToDataUrl(file);
  const asset: IssueAsset & { _dataUrl: string } = {
    id: `demo-asset-${Date.now()}`,
    filename: file.name,
    content_type: file.type,
    size_bytes: file.size,
    created_at: new Date().toISOString(),
    _dataUrl: dataUrl,
  };
  demoIssueAssets[issueId] = [...(demoIssueAssets[issueId] ?? []), asset];
  return asset;
}

export function getDemoIssueAssets(issueId: string): IssueAsset[] {
  return demoIssueAssets[issueId] ?? [];
}

export function getDemoIssueAssetDataUrl(issueId: string, assetId: string): string | null {
  const asset = getDemoIssueAssets(issueId).find((a) => a.id === assetId) as (IssueAsset & { _dataUrl: string }) | undefined;
  return asset?._dataUrl ?? null;
}

// ─── Demo project references ──────────────────────────────────────────────────

let demoProjectReferences: Record<string, ProjectReference[]> = {};

export async function addDemoProjectReference(projectId: string, file: File): Promise<ProjectReference> {
  const dataUrl = await _fileToDataUrl(file);
  const reference: ProjectReference & { _dataUrl: string } = {
    id: `demo-reference-${Date.now()}`,
    filename: file.name,
    content_type: file.type,
    size_bytes: file.size,
    created_at: new Date().toISOString(),
    _dataUrl: dataUrl,
  };
  demoProjectReferences[projectId] = [...(demoProjectReferences[projectId] ?? []), reference];
  return reference;
}

export function getDemoProjectReferences(projectId: string): ProjectReference[] {
  return demoProjectReferences[projectId] ?? [];
}

export function getDemoProjectReferenceDataUrl(projectId: string, referenceId: string): string | null {
  const reference = getDemoProjectReferences(projectId).find((r) => r.id === referenceId) as (ProjectReference & { _dataUrl: string }) | undefined;
  return reference?._dataUrl ?? null;
}

// ─── Demo project context ─────────────────────────────────────────────────────
// Modélise le même enchaînement que le backend réel :
// in_progress (génération) → draft_ready (relecture) → [commit] → done.

/** projectId → "in_progress" | "draft_ready" | "done" | "failed" | null */
const demoContextStatus: Record<string, "in_progress" | "draft_ready" | "done" | "failed" | null> = {};

/** projectIds that already have a .alexis/project.md (context exists) */
const demoContextExists = new Set<string>(["demo-project-1", "demo-project-2"]);

export function getDemoContextExists(projectId: string): boolean {
  return demoContextExists.has(projectId);
}

export function startDemoContextGeneration(projectId: string): void {
  demoContextStatus[projectId] = "in_progress";
  setTimeout(() => {
    demoContextStatus[projectId] = "draft_ready";
  }, 2500);
}

export function commitDemoContext(projectId: string): void {
  demoContextStatus[projectId] = "done";
  demoContextExists.add(projectId);
}

export function getDemoContextStatus(
  projectId: string
): "in_progress" | "draft_ready" | "done" | "failed" | null {
  return demoContextStatus[projectId] ?? null;
}
