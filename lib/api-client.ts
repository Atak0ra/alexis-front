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

export function signup(email: string, password: string): Promise<ApiKeyOut> {
  return request("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function login(email: string, password: string): Promise<ApiKeyOut> {
  return request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function listLinearTeams(apiKey: string, linearApiKey: string): Promise<LinearTeam[]> {
  return request("/linear/teams", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ linear_api_key: linearApiKey }),
  });
}

export function createLinearTeam(apiKey: string, linearApiKey: string, name: string): Promise<LinearTeam> {
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
  return request("/projects", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
}
