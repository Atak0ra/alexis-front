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

export const BACKEND_STACK_OPTIONS: SelectOption[] = [
  { value: "python_django", label: "Python + Django" },
  { value: "python_fastapi", label: "Python + FastAPI" },
  { value: "python_flask", label: "Python + Flask" },
  { value: "node_express", label: "Node.js + Express" },
  { value: "node_nestjs", label: "Node.js + NestJS" },
  { value: "ruby_rails", label: "Ruby on Rails" },
  { value: "php_laravel", label: "PHP + Laravel" },
  { value: "java_spring", label: "Java + Spring Boot" },
  { value: "go", label: "Go" },
  { value: "dotnet", label: ".NET / C#" },
  { value: "other", label: "Autre" },
];

export const FRONTEND_STACK_OPTIONS: SelectOption[] = [
  { value: "react", label: "React" },
  { value: "nextjs", label: "Next.js" },
  { value: "vue", label: "Vue.js" },
  { value: "nuxt", label: "Nuxt" },
  { value: "angular", label: "Angular" },
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

  return lines.join("\n");
}
