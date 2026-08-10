/**
 * Options avancées de création de projet.
 *
 * Deux modes selon le plan du client :
 *   - Plans free / byok / solo  → mode simple (3 cartes dans ProjectContextStep)
 *   - Plan entreprise           → mode avancé (ce formulaire, architectures complexes)
 *
 * Stacks supportées par le gate qualité Alexis :
 *   - TypeScript / Next.js  (runtime Node préinstallé)
 *   - Python / FastAPI      (runtime Python préinstallé)
 *   - Python / Django       (runtime Python préinstallé)
 *
 * Les autres stacks (Java, Go, Rust, Ruby, PHP, .NET) sont acceptées en "Autre"
 * mais le gate qualité sera désactivé (quality_baseline_enabled=False).
 */

export type ArchitecturePattern = "monolith" | "front_back" | "front_back_bff";

export interface SelectOption {
  value: string;
  label: string;
}

export const ARCHITECTURE_OPTIONS: { value: ArchitecturePattern; label: string }[] = [
  { value: "monolith", label: "Monolithe" },
  { value: "front_back", label: "Front + Back" },
  { value: "front_back_bff", label: "Front + Back + BFF" },
];

/**
 * Stacks backend supportées par le gate qualité.
 * Les 3 premières sont les stacks avec gate complet.
 * "Autre" est accepté mais sans gate automatique.
 */
export const BACKEND_STACK_OPTIONS: SelectOption[] = [
  { value: "python_django", label: "Python + Django" },
  { value: "python_fastapi", label: "Python + FastAPI" },
  { value: "node_express", label: "Node.js + Express" },
  { value: "node_nestjs", label: "Node.js + NestJS" },
  { value: "other", label: "Autre (gate qualité désactivé)" },
];

/**
 * Stacks frontend supportées.
 * Next.js est recommandé — gate complet (build + typecheck + tests).
 */
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

/**
 * Résout la valeur de stack normalisée pour le champ `stack:` de .alexis/project.md.
 * Ce champ est lu par VerifyStep pour choisir les checks qualité.
 */
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

  // Ajouter le hint de stack pour le gate qualité
  const stackHint = resolveStackHint(s);
  if (stackHint) {
    lines.push(`stack: ${stackHint}`);
  }

  return lines.join("\n");
}
