import type { LinearTeam, ProjectOut } from "@/lib/api-client";
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
    repo_url: "git@github.com:acme/kara.git",
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
    repo_url: "git@gitlab.com:acme/shopfront.git",
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

export function addDemoProject(project: ProjectOut): void {
  demoProjects = [...demoProjects, project];
}
