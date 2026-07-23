import {
  DEMO_CREDENTIALS,
  addDemoProject,
  getDemoProject,
  getDemoProjectStats,
  getDemoIssues,
  addDemoIssue,
  updateDemoIssue,
  deleteDemoIssue,
  getDemoContextExists,
  startDemoContextGeneration,
  commitDemoContext,
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
    let detail: string = resp.statusText;
    try {
      const body = await resp.json();
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body.detail)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        detail = body.detail.map((e: any) => e.msg ?? String(e)).join(", ");
      } else if (body.detail != null) {
        detail = JSON.stringify(body.detail);
      }
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

export interface ProjectOut {
  id: string;
  name: string;
  repo_url: string | null;
  is_hosted: boolean;
  agent_choice: string;
  agent_base_url: string | null;
  issue_prefix: string | null;
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

// ─── Issues (tracker natif) ───────────────────────────────────────────────────

export interface IssueComment {
  id: string;
  body: string;
  author: string;
  created_at: string;
}

export interface Issue {
  id: string;
  identifier: string;
  number: number;
  title: string;
  description: string;
  state: string;
  labels: string[];
  created_at: string;
  updated_at: string;
  comments: IssueComment[];
}

export interface IssueCreate {
  title: string;
  description?: string;
  state?: string;
  labels?: string[];
}

export interface IssueUpdate {
  title?: string;
  description?: string;
  state?: string;
  labels?: string[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

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

// ─── Forge validation ─────────────────────────────────────────────────────────

export interface ForgeValidation {
  valid: boolean;
  account: string;
}

export function validateForge(
  apiKey: string,
  payload: { forge_provider: string; forge_token: string; repo_url?: string }
): Promise<ForgeValidation> {
  if (isLocalMode()) {
    return Promise.resolve({ valid: true, account: "demo-user" });
  }
  return request("/forge/validate", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface CreateProjectPayload {
  name: string;
  repo_url: string | null;
  agent_choice: string;
  agent_api_key: string | null;
  agent_base_url: string | null;
  forge_provider: string;
  forge_token: string | null;
  hosted?: boolean;
  github_username?: string | null;
  issue_prefix?: string | null;
  states: Record<string, string>;
  trigger_states: string[];
  models: Record<string, string>;
}

export function createProject(apiKey: string, payload: CreateProjectPayload): Promise<ProjectOut> {
  if (isLocalMode()) {
    const isHosted = payload.hosted ?? false;
    const project: ProjectOut = {
      id: `demo-project-${Date.now()}`,
      name: payload.name,
      repo_url: isHosted
        ? `https://github.com/compeel-alexis/${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-demo`
        : payload.repo_url,
      is_hosted: isHosted,
      agent_choice: payload.agent_choice,
      agent_base_url: payload.agent_base_url,
      issue_prefix: payload.issue_prefix ?? null,
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

export interface UpdateProjectPayload {
  name?: string;
  repo_url?: string;
  agent_choice?: string;
  agent_api_key?: string | null;
  agent_base_url?: string | null;
  forge_provider?: string;
  forge_token?: string;
  issue_prefix?: string | null;
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

export function purgeProject(apiKey: string, projectId: string): Promise<void> {
  if (isLocalMode()) return Promise.resolve();
  return request(`/projects/${projectId}?hard=true`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export interface TransferRepoResult {
  new_owner: string;
}

export function transferRepo(
  apiKey: string,
  projectId: string,
  payload: { new_owner?: string }
): Promise<TransferRepoResult> {
  if (isLocalMode()) {
    return Promise.resolve({ new_owner: payload.new_owner ?? "demo-user" });
  }
  return request(`/projects/${projectId}/transfer-repo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
}

// ─── Issues ───────────────────────────────────────────────────────────────────

export function listIssues(apiKey: string, projectId: string): Promise<Issue[]> {
  if (isLocalMode()) return Promise.resolve(getDemoIssues(projectId));
  return request(`/projects/${projectId}/issues`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function createIssue(
  apiKey: string,
  projectId: string,
  payload: IssueCreate
): Promise<Issue> {
  if (isLocalMode()) {
    const issues = getDemoIssues(projectId);
    const number = (issues.reduce((m, i) => Math.max(m, i.number), 0)) + 1;
    const project = getDemoProject(projectId);
    const prefix = project?.issue_prefix ?? "PROJ";
    const issue: Issue = {
      id: `demo-issue-${Date.now()}`,
      identifier: `${prefix}-${number}`,
      number,
      title: payload.title,
      description: payload.description ?? "",
      state: payload.state ?? "Backlog",
      labels: payload.labels ?? [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      comments: [],
    };
    addDemoIssue(projectId, issue);
    return Promise.resolve(issue);
  }
  return request(`/projects/${projectId}/issues`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
}

export function updateIssue(
  apiKey: string,
  projectId: string,
  issueId: string,
  payload: IssueUpdate
): Promise<Issue> {
  if (isLocalMode()) {
    const updated = updateDemoIssue(projectId, issueId, payload);
    if (!updated) return Promise.reject(new AlexisApiError(404, "Issue introuvable"));
    return Promise.resolve(updated);
  }
  return request(`/projects/${projectId}/issues/${issueId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
}

export function deleteIssue(
  apiKey: string,
  projectId: string,
  issueId: string
): Promise<void> {
  if (isLocalMode()) {
    deleteDemoIssue(projectId, issueId);
    return Promise.resolve();
  }
  return request(`/projects/${projectId}/issues/${issueId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function createIssueComment(
  apiKey: string,
  projectId: string,
  issueId: string,
  body: string
): Promise<IssueComment> {
  if (isLocalMode()) {
    const comment: IssueComment = {
      id: `demo-comment-${Date.now()}`,
      body,
      author: "user",
      created_at: new Date().toISOString(),
    };
    return Promise.resolve(comment);
  }
  return request(`/projects/${projectId}/issues/${issueId}/comments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ body }),
  });
}

// ─── Project context (.alexis/project.md) ────────────────────────────────────

export interface RepoSummaryEnqueue {
  job_id: string;
}

export interface RepoSummaryResult {
  has_code: boolean;
  file_count: number;
  languages: string[];
}

export type RepoSummaryJobStatus = "pending" | "done" | "failed";

export interface RepoSummaryStatus {
  status: RepoSummaryJobStatus;
  result?: RepoSummaryResult;
  error?: string;
}

export function enqueueRepoSummary(apiKey: string, projectId: string): Promise<RepoSummaryEnqueue> {
  if (isLocalMode()) {
    return Promise.resolve({ job_id: "demo-job" });
  }
  return request(`/projects/${projectId}/context/repo-summary`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function getRepoSummaryStatus(
  apiKey: string,
  projectId: string,
  jobId: string
): Promise<RepoSummaryStatus> {
  if (isLocalMode()) {
    return Promise.resolve({ status: "done", result: { has_code: false, file_count: 0, languages: [] } });
  }
  return request(`/projects/${projectId}/context/repo-summary/${jobId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export interface ProjectContextState {
  exists: boolean;
}

export type ContextGenerationStatus = "in_progress" | "draft_ready" | "done" | "failed" | null;

export type ContextGenerationPhase =
  | "cloning"
  | "running_agent"
  | "reading_result"
  | "writing_file"
  | "committing";

export interface ProjectContextStatus {
  status: ContextGenerationStatus;
  error?: string | null;
  phase?: ContextGenerationPhase | null;
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

export interface ProjectContextDraft {
  content: string;
}

export function getProjectContextDraft(
  apiKey: string,
  projectId: string
): Promise<ProjectContextDraft> {
  if (isLocalMode()) {
    return Promise.resolve({
      content: "# Contexte projet\n\n## Stack technique\n[Projet démo]\n",
    });
  }
  return request(`/projects/${projectId}/context/draft`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function commitProjectContext(
  apiKey: string,
  projectId: string,
  content: string
): Promise<void> {
  if (isLocalMode()) {
    commitDemoContext(projectId);
    return Promise.resolve();
  }
  return request(`/projects/${projectId}/context/commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ content }),
  });
}

export interface ProjectContextContent {
  status: "ready" | "loading";
  content: string | null;
}

const DEMO_CONTEXT_CONTENT = `# Contexte projet (démo)

## Objectif
Application de gestion de tickets pour solopreneurs.

## Stack technique
- Backend : Python / FastAPI
- Frontend : Next.js / TypeScript
- Base de données : PostgreSQL
- Déploiement : Railway

## Contraintes
- Tests obligatoires avant chaque PR
- Ne pas modifier les migrations existantes
`;

export function getProjectContextContent(
  apiKey: string,
  projectId: string
): Promise<ProjectContextContent> {
  if (isLocalMode()) {
    return Promise.resolve({ status: "ready", content: DEMO_CONTEXT_CONTENT });
  }
  return request(`/projects/${projectId}/context/content`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}
