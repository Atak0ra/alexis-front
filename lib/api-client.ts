import {
  DEMO_CREDENTIALS,
  DEMO_TEAMS,
  addDemoProject,
  getDemoProject,
  getDemoProjectStats,
  getDemoTickets,
  getDemoContextExists,
  startDemoContextGeneration,
  getDemoContextStatus,
  isLocalMode,
  listDemoProjects,
} from "@/lib/demo-data";

export class AlexisApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(`${status}: ${detail}`);
    this.status = status;
    this.detail = detail;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const body = await resp.json();
      detail = body.detail ?? detail;
    } catch {
      // corps non-JSON — on garde statusText
    }
    throw new AlexisApiError(resp.status, detail);
  }

  if (resp.status === 204) {
    return {} as T;
  }
  return resp.json() as Promise<T>;
}

export interface ApiKeyOut {
  id: string;
  api_key: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

export interface ProjectOut {
  id: string;
  name: string;
  repo_url: string;
  agent_choice: string;
  agent_base_url: string | null;
  linear_team_id: string | null;
  forge_provider: string;
  states: Record<string, string>;
  trigger_states: string[];
  models: Record<string, string>;
  run_timeout_seconds: number;
  is_active: boolean;
  created_at: string;
}

export interface ProjectStats {
  resolved: number;
  in_progress: number;
  failed: number;
  total_cost_usd: number;
}

export type TicketStatus = "resolved" | "in_progress" | "failed";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  agent: string;
  cost_usd: number;
  updated_at: string;
  /** Only present when status === "resolved" */
  pr_url?: string;
  pr_title?: string;
  /** Only present when status === "failed" */
  error_message?: string;
}

function demoLogin(email: string, password: string): Promise<ApiKeyOut> {
  if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
    return Promise.resolve({ id: "demo-client", api_key: "demo-api-key" });
  }
  return Promise.reject(
    new AlexisApiError(401, "Identifiants invalides (mode démo : demo / passer)")
  );
}

export function signup(email: string, password: string): Promise<ApiKeyOut> {
  if (isLocalMode()) return demoLogin(email, password);
  return request("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function login(email: string, password: string): Promise<ApiKeyOut> {
  if (isLocalMode()) return demoLogin(email, password);
  return request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function revokeApiKey(apiKey: string, keyId: string): Promise<void> {
  if (isLocalMode()) return Promise.resolve();
  return request(`/auth/api-keys/${keyId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function listLinearTeams(apiKey: string, linearApiKey: string): Promise<LinearTeam[]> {
  if (isLocalMode()) return Promise.resolve(DEMO_TEAMS);
  return request("/linear/teams", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ linear_api_key: linearApiKey }),
  });
}

export function createLinearTeam(apiKey: string, linearApiKey: string, name: string): Promise<LinearTeam> {
  if (isLocalMode()) {
    return Promise.resolve({ id: `team-demo-${name.toLowerCase().replace(/\s+/g, "-")}`, name, key: name.slice(0, 3).toUpperCase() });
  }
  return request("/linear/teams/create", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ linear_api_key: linearApiKey, name }),
  });
}

export interface CreateProjectPayload {
  name: string;
  repo_url: string;
  agent_choice: string;
  agent_api_key: string | null;
  agent_base_url: string | null;
  linear_api_key: string;
  linear_team_id: string;
  forge_provider: string;
  forge_token: string;
  states: Record<string, string>;
  trigger_states: string[];
  models: Record<string, string>;
}

export function createProject(apiKey: string, payload: CreateProjectPayload): Promise<ProjectOut> {
  if (isLocalMode()) {
    const project: ProjectOut = {
      id: `demo-project-${Date.now()}`,
      name: payload.name,
      repo_url: payload.repo_url,
      agent_choice: payload.agent_choice,
      agent_base_url: payload.agent_base_url,
      linear_team_id: payload.linear_team_id,
      forge_provider: payload.forge_provider,
      states: payload.states,
      trigger_states: payload.trigger_states,
      models: payload.models,
      run_timeout_seconds: 1800,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    addDemoProject(project);
    return Promise.resolve(project);
  }
  return request("/projects", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
}

export function listDemoModeProjects(): Promise<ProjectOut[]> {
  return Promise.resolve(listDemoProjects());
}

export function listProjects(apiKey: string): Promise<ProjectOut[]> {
  if (isLocalMode()) return Promise.resolve(listDemoProjects());
  return request("/projects", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function getProject(apiKey: string, projectId: string): Promise<ProjectOut> {
  if (isLocalMode()) {
    const project = getDemoProject(projectId);
    if (!project) return Promise.reject(new AlexisApiError(404, "Projet introuvable"));
    return Promise.resolve(project);
  }
  return request(`/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function getProjectStats(apiKey: string, projectId: string): Promise<ProjectStats> {
  if (isLocalMode()) return Promise.resolve(getDemoProjectStats(projectId));
  return request(`/projects/${projectId}/stats`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function getProjectTickets(apiKey: string, projectId: string): Promise<Ticket[]> {
  if (isLocalMode()) return Promise.resolve(getDemoTickets(projectId));
  return request(`/projects/${projectId}/tickets`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

// ─── Project context (.alexis/project.md) ────────────────────────────────────

export interface ProjectContextState {
  exists: boolean;
}

export type ContextGenerationStatus = "in_progress" | "done" | "failed" | null;

export interface ProjectContextStatus {
  status: ContextGenerationStatus;
}

export function getProjectContext(
  apiKey: string,
  projectId: string
): Promise<ProjectContextState> {
  if (isLocalMode()) {
    return Promise.resolve({ exists: getDemoContextExists(projectId) });
  }
  return request(`/projects/${projectId}/context`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function createProjectContext(
  apiKey: string,
  projectId: string,
  brief: string
): Promise<void> {
  if (isLocalMode()) {
    startDemoContextGeneration(projectId);
    return Promise.resolve();
  }
  return request(`/projects/${projectId}/context`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ brief }),
  });
}

export function getProjectContextStatus(
  apiKey: string,
  projectId: string
): Promise<ProjectContextStatus> {
  if (isLocalMode()) {
    return Promise.resolve({ status: getDemoContextStatus(projectId) });
  }
  return request(`/projects/${projectId}/context/status`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

// ─── Project management ───────────────────────────────────────────────────────

export interface UpdateProjectPayload {
  name?: string;
  repo_url?: string;
  agent_choice?: string;
  agent_api_key?: string | null;
  agent_base_url?: string | null;
  linear_api_key?: string;
  linear_team_id?: string;
  forge_provider?: string;
  forge_token?: string;
  states?: Record<string, string>;
  trigger_states?: string[];
  models?: Record<string, string>;
  run_timeout_seconds?: number;
}

export function updateProject(
  apiKey: string,
  projectId: string,
  payload: UpdateProjectPayload
): Promise<ProjectOut> {
  if (isLocalMode()) {
    const project = getDemoProject(projectId);
    if (!project) return Promise.reject(new AlexisApiError(404, "Projet introuvable"));
    return Promise.resolve({ ...project, ...payload } as ProjectOut);
  }
  return request(`/projects/${projectId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
}

export function deleteProject(apiKey: string, projectId: string): Promise<void> {
  if (isLocalMode()) return Promise.resolve();
  return request(`/projects/${projectId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}
