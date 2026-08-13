/**
 * Options avancées de création de projet — option avancée du wizard.
 *
 * Le client peut choisir :
 *   - Sa stack (nextjs | fastapi | django) — alimente `Project.stack`
 *   - Son architecture (monolith | front_back | front_back_bff)
 *
 * Sans choix explicite → l'agent décide automatiquement (cas 3 du pipeline).
 *
 * Source de vérité : GET /projects/stacks (STACK_CATALOG backend).
 * Les valeurs ici sont des alias front pour la cohérence avec la lib `context-advanced-options.ts`
 * existante (brief textuel) — les champs `stack`/`architecture` sont désormais
 * transmis directement au back via CreateProjectPayload.
 */

export type StackId = "nextjs" | "fastapi" | "django";
export type ArchitectureId = "monolith" | "front_back" | "front_back_bff";

export interface ArchitectureOption {
  value: ArchitectureId;
  label: string;
  description: string;
}

export const ARCHITECTURE_OPTIONS: ArchitectureOption[] = [
  {
    value: "monolith",
    label: "Monolithe",
    description: "Une seule application — idéal pour démarrer vite.",
  },
  {
    value: "front_back",
    label: "Front + Back",
    description: "Interface et API séparées — Next.js + FastAPI, React + Django…",
  },
  {
    value: "front_back_bff",
    label: "Front + BFF + Back",
    description: "Trois services : interface, BFF Node, API Python/autre.",
  },
];

/** Mapping architecture label → id (pour affichage rétrocompat). */
export const ARCHITECTURE_LABEL: Record<ArchitectureId, string> = {
  monolith: "Monolithe",
  front_back: "Front + Back",
  front_back_bff: "Front + BFF + Back",
};

// ─── Legacy context-advanced-options (conservés pour rétrocompat) ─────────────
// Utilisés uniquement pour générer le brief textuel injecté dans le contexte.
// Les champs `stack`/`architecture` sont désormais transmis directement au back.

export type ArchitecturePattern = ArchitectureId;

export interface SelectOption {
  value: string;
  label: string;
}

export const BACKEND_STACK_OPTIONS: SelectOption[] = [
  { value: "python_django", label: "Python + Django" },
  { value: "python_fastapi", label: "Python + FastAPI" },
  { value: "node_express", label: "Node.js + Express" },
  { value: "node_nestjs", label: "Node.js + NestJS" },
  { value: "other", label: "Autre (gate qualité désactivé)" },
];

export const FRONTEND_STACK_OPTIONS: SelectOption[] = [
  { value: "nextjs", label: "Next.js (recommandé)" },
  { value: "react", label: "React" },
  { value: "vue", label: "Vue.js" },
  { value: "nuxt", label: "Nuxt" },
  { value: "svelte", label: "Svelte/SvelteKit" },
  { value: "other", label: "Autre" },
];

export const DATABASE_OPTIONS: SelectOption[] = [
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL/MariaDB" },
  { value: "mongodb", label: "MongoDB" },
  { value: "sqlite", label: "SQLite" },
  { value: "redis", label: "Redis" },
  { value: "none", label: "Aucune" },
  { value: "other", label: "Autre" },
];

export interface CompiledSelections {
  stackMonolith: string;
  stackFrontend: string;
  stackBackend: string;
  stackBff: string;
  architectureLabel: string;
  databaseLabel: string;
}

export function resolveStackHint(selections: CompiledSelections): string {
  const { stackMonolith, stackFrontend, stackBackend } = selections;
  const primary = stackMonolith || stackBackend || stackFrontend;
  if (!primary) return "";
  const mapping: Record<string, string> = {
    python_django: "django",
    python_fastapi: "python",
    node_express: "typescript",
    node_nestjs: "typescript",
    nextjs: "typescript",
    react: "typescript",
    vue: "typescript",
    nuxt: "typescript",
    svelte: "typescript",
  };
  return mapping[primary] ?? "";
}

export function compileAdvancedBrief(s: CompiledSelections): string {
  const stackParts: string[] = [];
  if (s.stackMonolith) stackParts.push(s.stackMonolith);
  if (s.stackBackend) stackParts.push(`${s.stackBackend} (backend)`);
  if (s.stackFrontend) stackParts.push(`${s.stackFrontend} (frontend)`);
  if (s.stackBff) stackParts.push(`${s.stackBff} (BFF)`);

  const lines: string[] = [];
  if (stackParts.length > 0) lines.push(`Stack: ${stackParts.join(", ")}`);
  if (s.architectureLabel) lines.push(`Architecture: ${s.architectureLabel}`);
  if (s.databaseLabel && s.databaseLabel !== "Aucune") {
    lines.push(`Base de données: ${s.databaseLabel}`);
  }
  const stackHint = resolveStackHint(s);
  if (stackHint) lines.push(`stack: ${stackHint}`);
  return lines.join("\n");
}

