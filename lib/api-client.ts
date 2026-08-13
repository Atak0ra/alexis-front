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
  addDemoIssueAsset,
  getDemoIssueAssets,
  addDemoProjectReference,
  getDemoProjectReferences,
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

/**
 * Transforme une erreur API en message lisible pour un utilisateur non-technique.
 * Préfère le message `detail` du serveur quand il est déjà en français et compréhensible,
 * sinon retourne un message générique adapté au code HTTP.
 */
export function friendlyError(err: unknown): string {
  if (!(err instanceof AlexisApiError)) {
    return "Une erreur est survenue. Merci de réessayer.";
  }
  // Le serveur a renvoyé un message explicite → on l'affiche tel quel
  if (err.detail && err.detail !== err.status.toString()) {
    return err.detail;
  }
  switch (err.status) {
    case 401:
      return "Votre session a expiré. Veuillez vous reconnecter.";
    case 403:
      return "Vous n'avez pas accès à cette ressource.";
    case 404:
      return "Ressource introuvable.";
    case 409:
      return "Une action est déjà en cours. Veuillez patienter.";
    case 422:
      return "Les informations saisies sont invalides. Vérifiez le formulaire.";
    case 429:
      return "Trop de tentatives. Veuillez patienter quelques instants.";
    case 500:
    case 502:
    case 503:
      return "Une erreur est survenue côté serveur. Merci de réessayer.";
    default:
      return "Une erreur est survenue. Merci de réessayer.";
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const resp = await fetch(`${API_URL}${path}`, {
    ...options,
    // no-store : jamais de cache HTTP — chaque appel lit les données fraîches.
    // Sans ça, le navigateur peut servir une ancienne réponse (ex : page /pricing
    // qui ne reflète pas les modifs faites dans l'admin).
    cache: "no-store",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
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
  /** null si le projet n'a pas de clé perso (non-BYOK) */
  agent_choice: string | null;
  /** null si le projet n'a pas de clé perso (non-BYOK) */
  agent_base_url: string | null;
  has_agent_api_key: boolean;
  issue_prefix: string | null;
  forge_provider: string;
  has_forge_token: boolean;
  states: Record<string, string>;
  trigger_states: string[];
  /** {} si le projet n'a pas de clé perso (non-BYOK) */
  models: Record<string, string>;
  code_review_enabled: boolean;
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
  /** Origine du ticket — immuable.
   * "human"      : créé manuellement par le client
   * "ai_backlog" : généré par l'IA lors du commit du backlog
   * "ai_audit"   : généré par l'IA à partir d'un diagnostic Alexis Check
   */
  origin: "human" | "ai_backlog" | "ai_audit";
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

export interface IssueAsset {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface ProjectReference {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
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

// ─── Plans publics (page pricing + /auth/me) ──────────────────────────────────

export interface PlanPublicOut {
  id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  features: string[] | null;
  monthly_price_usd: number;
  requires_own_key: boolean;
  max_members: number | null;
  /** Crédit gratuit ajouté au wallet à chaque cycle mensuel (0 = aucun). */
  free_monthly_credit_usd: number;
  /** Découvert autorisé : le wallet peut descendre jusqu'à -overdraft_limit_usd (0 = pas de découvert). */
  overdraft_limit_usd: number;
  is_public: boolean;
  sort_order: number;
}

export function listPublicPlans(): Promise<PlanPublicOut[]> {
  if (isLocalMode()) return Promise.resolve([]);
  return request("/plans");
}

export interface ClientProfile {
  id: string;
  email: string;
  email_verified: boolean;
  github_username: string | null;
  forced_agent_choice: string | null;
  /** Plan courant du client — null si aucun plan assigné (fail-open). */
  plan: PlanPublicOut | null;
  /** "owner" = propriétaire du compte, "member" = membre invité. */
  role: "owner" | "member";
  first_name: string | null;
  last_name: string | null;
  /** True si le mot de passe doit être changé (membre invité, mot de passe temporaire). */
  must_change_password?: boolean;
}

export function getMe(apiKey: string): Promise<ClientProfile> {
  if (isLocalMode()) {
    return Promise.resolve({
      id: "demo-client", email: DEMO_CREDENTIALS.email, email_verified: true,
      github_username: null, forced_agent_choice: null, plan: null,
      role: "owner", first_name: null, last_name: null,
    });
  }
  return request("/auth/me", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function verifyEmail(token: string): Promise<ClientProfile> {
  if (isLocalMode()) {
    return Promise.resolve({
      id: "demo-client", email: DEMO_CREDENTIALS.email, email_verified: true,
      github_username: null, forced_agent_choice: null, plan: null,
      role: "owner", first_name: null, last_name: null,
    });
  }
  return request("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });
}

/**
 * Choisit un plan pour le compte de l'owner (sans paiement immédiat).
 * Retourne le profil mis à jour avec le nouveau plan.
 * Seul l'owner peut appeler cette fonction — les membres héritent du plan de leur owner.
 */
export function selectPlan(apiKey: string, planId: string): Promise<ClientProfile> {
  if (isLocalMode()) {
    return Promise.resolve({
      id: "demo-client", email: DEMO_CREDENTIALS.email, email_verified: true,
      github_username: null, forced_agent_choice: null, plan: null,
      role: "owner", first_name: null, last_name: null,
    });
  }
  return request("/auth/plan", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ plan_id: planId }),
  });
}

// ── Wallet — recharge via PSP CinetPay ────────────────────────────────────────

export interface TopupCheckoutOut {
  payment_url: string;
  transaction_id: string;
}

/**
 * Initie une recharge wallet via CinetPay.
 * Retourne l'URL de paiement vers laquelle rediriger l'utilisateur.
 * Le wallet n'est crédité QUE par le webhook /webhooks/cinetpay (asynchrone).
 */
export function topupCheckout(apiKey: string, amountUsd: number): Promise<TopupCheckoutOut> {
  if (isLocalMode()) {
    // En mode démo, on simule une URL de paiement factice
    return Promise.resolve({
      payment_url: "#demo-payment",
      transaction_id: `demo-${Date.now()}`,
    });
  }
  return request("/wallet/topup/checkout", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ amount_usd: amountUsd }),
  });
}

// ─── Wallet (solde prépayé, plans à clé gérée uniquement) ────────────────────
// Le solde est exprimé en $ réels (prix Alexis = coût fournisseur × marge),
// jamais en "tokens" — voir orchestrator/domain/wallet_service.py.

export interface WalletOut {
  balance_usd: number;
  updated_at: string;
}

export interface WalletTransactionOut {
  id: string;
  type: "topup" | "debit" | "plan_subscription";
  billed_usd: number;
  model: string | null;
  step: string | null;
  issue_identifier: string | null;
  created_at: string;
}

export interface WalletTransactionsOut {
  items: WalletTransactionOut[];
  total: number;
}

export function getWallet(apiKey: string): Promise<WalletOut> {
  if (isLocalMode()) {
    return Promise.resolve({ balance_usd: 42.5, updated_at: new Date().toISOString() });
  }
  return request("/wallet", { headers: { Authorization: `Bearer ${apiKey}` } });
}

export function getWalletTransactions(
  apiKey: string,
  limit = 20,
  offset = 0
): Promise<WalletTransactionsOut> {
  if (isLocalMode()) return Promise.resolve({ items: [], total: 0 });
  return request(`/wallet/transactions?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

// ─── Membres (multi-utilisateur) ─────────────────────────────────────────────

export interface MemberOut {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "owner" | "member";
  created_at: string;
}

export interface MembersListOut {
  members: MemberOut[];
  used: number;
  limit: number | null; // null = illimité
}

export interface MemberInvitePayload {
  email: string;
  first_name: string;
  last_name: string;
}

export function listMembers(apiKey: string): Promise<MembersListOut> {
  if (isLocalMode()) {
    return Promise.resolve({ members: [], used: 1, limit: 1 });
  }
  return request("/members", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function inviteMember(apiKey: string, payload: MemberInvitePayload): Promise<MemberOut> {
  if (isLocalMode()) {
    return Promise.reject(new AlexisApiError(403, "Non disponible en mode démo"));
  }
  return request("/members", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
}

export function removeMember(apiKey: string, memberId: string): Promise<void> {
  if (isLocalMode()) return Promise.resolve();
  return request(`/members/${memberId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function changePassword(
  apiKey: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (isLocalMode()) return Promise.resolve();
  return request("/auth/change-password", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export function revokeApiKey(apiKey: string, keyId: string): Promise<void> {
  if (isLocalMode()) return Promise.resolve();
  return request(`/auth/api-keys/${keyId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function deleteAccount(apiKey: string): Promise<void> {
  if (isLocalMode()) return Promise.resolve();
  return request("/auth/me", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function resendVerification(apiKey: string): Promise<void> {
  if (isLocalMode()) return Promise.resolve();
  return request("/auth/resend-verification", {
    method: "POST",
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
  code_review_enabled?: boolean;
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
      has_agent_api_key: !!payload.agent_api_key,
      issue_prefix: payload.issue_prefix ?? null,
      forge_provider: payload.forge_provider,
      has_forge_token: isHosted ? false : !!payload.forge_token,
      states: payload.states,
      trigger_states: payload.trigger_states,
      models: payload.models,
      code_review_enabled: payload.code_review_enabled ?? true,
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
  code_review_enabled?: boolean;
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
    return Promise.resolve({
      ...project,
      ...payload,
      has_agent_api_key: payload.agent_api_key ? true : project.has_agent_api_key,
      has_forge_token: payload.forge_token ? true : project.has_forge_token,
    } as ProjectOut);
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

export async function downloadProject(apiKey: string, projectId: string, projectName: string): Promise<void> {
  if (isLocalMode()) return;
  const resp = await fetch(`${API_URL}/projects/${projectId}/download`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!resp.ok) {
    throw new AlexisApiError(resp.status, resp.statusText);
  }
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName || "projet"}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Tickets (vue agrégée run/PR/coût, dérivée de TicketRun côté backend) ──────

export interface TicketOut {
  id: string; // identifier de l'issue (ex: PROJ-42)
  title: string;
  description: string;
  status: "resolved" | "in_progress" | "failed";
  agent: string;
  cost_usd: number;
  updated_at: string;
  pr_url: string | null;
  pr_title: string | null;
  /** Titre court humanisé (ex: "Incident technique temporaire") */
  error_message: string | null;
  /** Phrase d'explication client-friendly */
  error_hint: string | null;
  /** True si Alexis est en train de répondre à un message de raffinement sur ce ticket. */
  chat_active?: boolean;
}

export function listTickets(apiKey: string, projectId: string): Promise<TicketOut[]> {
  if (isLocalMode()) return Promise.resolve([]);
  return request(`/projects/${projectId}/tickets`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

// ─── Issues ───────────────────────────────────────────────────────────────────

export function listIssues(apiKey: string, projectId: string): Promise<Issue[]> {
  if (isLocalMode()) return Promise.resolve(getDemoIssues(projectId));
  return request(`/projects/${projectId}/issues`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function getIssue(apiKey: string, projectId: string, issueId: string): Promise<Issue> {
  if (isLocalMode()) {
    const found = getDemoIssues(projectId).find((i) => i.id === issueId);
    if (!found) return Promise.reject(new AlexisApiError(404, "Demande introuvable"));
    return Promise.resolve(found);
  }
  return request(`/projects/${projectId}/issues/${issueId}`, {
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
      origin: "human",
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

// ─── Issue assets (mockups joints à une issue) ────────────────────────────────

export function issueAssetContentUrl(projectId: string, issueId: string, assetId: string): string {
  return `${API_URL}/projects/${projectId}/issues/${issueId}/assets/${assetId}/content`;
}

export async function uploadIssueAsset(
  apiKey: string,
  projectId: string,
  issueId: string,
  file: File
): Promise<IssueAsset> {
  if (isLocalMode()) {
    return addDemoIssueAsset(issueId, file);
  }
  const form = new FormData();
  form.append("file", file);
  return request(`/projects/${projectId}/issues/${issueId}/assets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
}

export function listIssueAssets(
  apiKey: string,
  projectId: string,
  issueId: string
): Promise<IssueAsset[]> {
  if (isLocalMode()) {
    return Promise.resolve(getDemoIssueAssets(issueId));
  }
  return request(`/projects/${projectId}/issues/${issueId}/assets`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

// ─── Project references (documents de référence attachés au projet) ──────────

export function projectReferenceContentUrl(projectId: string, referenceId: string): string {
  return `${API_URL}/projects/${projectId}/references/${referenceId}/content`;
}

export async function uploadProjectReference(
  apiKey: string,
  projectId: string,
  file: File
): Promise<ProjectReference> {
  if (isLocalMode()) {
    return addDemoProjectReference(projectId, file);
  }
  const form = new FormData();
  form.append("file", file);
  return request(`/projects/${projectId}/references`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
}

export function listProjectReferences(
  apiKey: string,
  projectId: string
): Promise<ProjectReference[]> {
  if (isLocalMode()) {
    return Promise.resolve(getDemoProjectReferences(projectId));
  }
  return request(`/projects/${projectId}/references`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

// ─── Chat (raffinement conversationnel spec/plan) ─────────────────────────────

export type ChatStatus = "in_progress" | "done" | "failed" | null;

export interface IssueChatStatusOut {
  status: ChatStatus;
  error?: string | null;
}

export function sendIssueChat(
  apiKey: string,
  projectId: string,
  issueId: string,
  message: string
): Promise<IssueChatStatusOut> {
  if (isLocalMode()) {
    return Promise.resolve({ status: "done" });
  }
  return request(`/projects/${projectId}/issues/${issueId}/chat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ message }),
  });
}

export function getIssueChatStatus(
  apiKey: string,
  projectId: string,
  issueId: string
): Promise<IssueChatStatusOut> {
  if (isLocalMode()) {
    return Promise.resolve({ status: null });
  }
  return request(`/projects/${projectId}/issues/${issueId}/chat/status`, {
    headers: { Authorization: `Bearer ${apiKey}` },
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
  | "reading_result";

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

// ─── Audit (Alexis Check) ─────────────────────────────────────────────────────

export type AuditCategory = "security" | "rgpd" | "a11y";
export type AuditStatus = "in_progress" | "ready" | "failed" | null;

export interface AuditFinding {
  category: AuditCategory;
  title: string;
  explanation: string;
  risk: string;
  ticket_titles: string[];
  no_code: boolean;
}

export interface AuditStatusOut {
  status: AuditStatus;
  error?: string | null;
}

export interface AuditReport {
  findings: AuditFinding[];
}

export interface AuditQuota {
  used: number;
  limit: number | null;
}

const DEMO_AUDIT_FINDINGS: AuditFinding[] = [
  {
    category: "security",
    title: "Clés API exposées dans le code source",
    explanation: "Des clés d'API sont stockées en dur dans le code, ce qui les expose en cas de fuite du dépôt.",
    risk: "Accès non autorisé aux services tiers.",
    ticket_titles: ["Déplacer les clés API dans des variables d'environnement"],
    no_code: false,
  },
  {
    category: "rgpd",
    title: "Absence de politique de rétention des données",
    explanation: "Les données utilisateurs ne sont pas supprimées automatiquement après une période d'inactivité.",
    risk: "Non-conformité RGPD, risque de sanction CNIL.",
    ticket_titles: ["Implémenter une politique de rétention des données"],
    no_code: true,
  },
  {
    category: "a11y",
    title: "Images sans attribut alt",
    explanation: "Plusieurs images du projet n'ont pas d'attribut alt, rendant le contenu inaccessible aux lecteurs d'écran.",
    risk: "Exclusion des utilisateurs malvoyants.",
    ticket_titles: ["Ajouter des attributs alt sur toutes les images"],
    no_code: false,
  },
];

export function createAudit(
  apiKey: string,
  projectId: string,
  categories: AuditCategory[]
): Promise<void> {
  if (isLocalMode()) return Promise.resolve();
  return request(`/projects/${projectId}/audit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ categories }),
  });
}

export function getAuditStatus(
  apiKey: string,
  projectId: string
): Promise<AuditStatusOut> {
  if (isLocalMode()) return Promise.resolve({ status: null });
  return request(`/projects/${projectId}/audit/status`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function getAuditReport(
  apiKey: string,
  projectId: string
): Promise<AuditReport> {
  if (isLocalMode()) return Promise.resolve({ findings: DEMO_AUDIT_FINDINGS });
  return request(`/projects/${projectId}/audit/report`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function getAuditQuota(
  apiKey: string,
  projectId: string
): Promise<AuditQuota> {
  if (isLocalMode()) return Promise.resolve({ used: 0, limit: 3 });
  return request(`/projects/${projectId}/audit/quota`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function auditToTickets(
  apiKey: string,
  projectId: string,
  findings: AuditFinding[]
): Promise<void> {
  if (isLocalMode()) return Promise.resolve();
  return request(`/projects/${projectId}/audit/to-tickets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ findings }),
  });
}

export interface ProjectContextContent {
  status: "ready" | "not_found";
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

// ─── Admin back-office ──────────────────────────────────────────────────────
// Pas de branche isLocalMode() ici : le démo public (isLocalMode()) est une
// vitrine client, jamais un chemin admin — ces fonctions ne sont atteignables
// que depuis /admin/*, qui n'existe pas dans le flux démo.

export interface AdminApiKeyOut {
  id: string;
  api_key: string;
}

export function adminLogin(email: string, password: string): Promise<AdminApiKeyOut> {
  return request("/admin/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export interface AdminProfile {
  id: string;
  email: string;
}

export function adminGetMe(adminApiKey: string): Promise<AdminProfile> {
  return request("/admin/auth/me", {
    headers: { Authorization: `Bearer ${adminApiKey}` },
  });
}

export interface AdminClientListItem {
  id: string;
  email: string;
  plan_name: string | null;
  project_count: number;
  monthly_spend_usd: number;
  wallet_balance_usd: number;
}

export function adminListClients(adminApiKey: string): Promise<AdminClientListItem[]> {
  return request("/admin/clients", { headers: { Authorization: `Bearer ${adminApiKey}` } });
}

export interface AdminProjectSummary {
  id: string;
  name: string;
  agent_choice: string;
  is_active: boolean;
  total_cost_usd: number;
}

export interface AdminClientDetail {
  id: string;
  email: string;
  github_username: string | null;
  plan_name: string | null;
  monthly_spend_usd: number;
  wallet_balance_usd: number;
  projects: AdminProjectSummary[];
}

export function adminGetClient(adminApiKey: string, clientId: string): Promise<AdminClientDetail> {
  return request(`/admin/clients/${clientId}`, { headers: { Authorization: `Bearer ${adminApiKey}` } });
}

export function adminDeleteClient(adminApiKey: string, clientId: string): Promise<void> {
  return request(`/admin/clients/${clientId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminApiKey}` },
  });
}

export interface PlanOut {
  id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  features: string[] | null;
  monthly_price_usd: number;
  forced_agent_choice: string | null;
  /** Crédit gratuit ajouté au wallet à chaque cycle mensuel (0 = aucun). */
  free_monthly_credit_usd: number;
  /** Découvert autorisé : le wallet peut descendre jusqu'à -overdraft_limit_usd (0 = pas de découvert). */
  overdraft_limit_usd: number;
  requires_own_key: boolean;
  max_members: number | null;
  is_public: boolean;
  sort_order: number;
}

export interface PlanPayload {
  name: string;
  monthly_price_usd: number;
  forced_agent_choice?: string | null;
  free_monthly_credit_usd?: number;
  overdraft_limit_usd?: number;
  display_name?: string | null;
  description?: string | null;
  features?: string[] | null;
  requires_own_key?: boolean;
  max_members?: number | null;
  is_public?: boolean;
  sort_order?: number;
}

export function adminListPlans(adminApiKey: string): Promise<PlanOut[]> {
  return request("/admin/plans", { headers: { Authorization: `Bearer ${adminApiKey}` } });
}

export function adminCreatePlan(adminApiKey: string, payload: PlanPayload): Promise<PlanOut> {
  return request("/admin/plans", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminApiKey}` },
    body: JSON.stringify(payload),
  });
}

export function adminUpdatePlan(
  adminApiKey: string,
  planId: string,
  payload: Partial<PlanPayload>
): Promise<PlanOut> {
  return request(`/admin/plans/${planId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminApiKey}` },
    body: JSON.stringify(payload),
  });
}

export function adminDeletePlan(adminApiKey: string, planId: string): Promise<void> {
  return request(`/admin/plans/${planId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminApiKey}` },
  });
}

// ─── Pricing wallet (marge appliquée au débit) ────────────────────────────────
// billed_usd = provider_cost_usd × margin_multiplier.

export interface MarginSettingOut {
  margin_multiplier: number;
}

export function adminGetMargin(adminApiKey: string): Promise<MarginSettingOut> {
  return request("/admin/pricing/margin", { headers: { Authorization: `Bearer ${adminApiKey}` } });
}

export function adminUpdateMargin(adminApiKey: string, marginMultiplier: number): Promise<MarginSettingOut> {
  return request("/admin/pricing/margin", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminApiKey}` },
    body: JSON.stringify({ margin_multiplier: marginMultiplier }),
  });
}

/** Crédite manuellement le wallet d'un client (recharge admin). */
export function adminTopupWallet(
  adminApiKey: string,
  clientId: string,
  amountUsd: number
): Promise<WalletOut> {
  return request("/admin/pricing/topup", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminApiKey}` },
    body: JSON.stringify({ client_id: clientId, amount_usd: amountUsd }),
  });
}

export interface ManagedSecretOut {
  key: string;
  agent: string;      // "claude" | "aider"
  env_var: string;    // ex: "GROQ_API_KEY"
  has_value: boolean;
  /** True si la clé est configurée — badge ACTIF dans l'UI admin */
  is_active: boolean;
  updated_at: string;
  /** Plans liés à cette clé (M2M, migration 0022). Liste d'UUIDs. */
  plan_ids: string[];
  /** Modèles LLM par step (spec/plan/dev/audit) portés par cette clé gérée.
   *  Le champ "audit" est optionnel — si absent/vide, le worker retombe sur "spec". */
  models: { spec: string; plan: string; dev: string; audit?: string } | null;
}

export function adminListManagedSecrets(adminApiKey: string): Promise<ManagedSecretOut[]> {
  return request("/admin/managed-secrets", { headers: { Authorization: `Bearer ${adminApiKey}` } });
}

export function adminUpdateManagedSecret(
  adminApiKey: string,
  key: string,
  value: string | null,
  models?: { spec: string; plan: string; dev: string } | null
): Promise<ManagedSecretOut> {
  return request(`/admin/managed-secrets/${key}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminApiKey}` },
    body: JSON.stringify({ value, ...(models !== undefined ? { models } : {}) }),
  });
}

/** PUT /admin/managed-secrets/{key}/models — met à jour uniquement les modèles
 * spec/plan/dev, sans toucher à la valeur de la clé (contrairement à
 * adminUpdateManagedSecret, dont le champ `value` est obligatoire côté API). */
export function adminUpdateManagedSecretModels(
  adminApiKey: string,
  key: string,
  models: { spec: string; plan: string; dev: string }
): Promise<ManagedSecretOut> {
  return request(`/admin/managed-secrets/${key}/models`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminApiKey}` },
    body: JSON.stringify(models),
  });
}

export function adminToggleManagedSecretActive(
  adminApiKey: string,
  key: string
): Promise<ManagedSecretOut> {
  return request(`/admin/managed-secrets/${key}/toggle-active`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminApiKey}` },
  });
}

export function adminSetManagedSecretPlanIds(
  adminApiKey: string,
  key: string,
  plan_ids: string[]
): Promise<ManagedSecretOut> {
  return request(`/admin/managed-secrets/${key}/plan-ids`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminApiKey}` },
    body: JSON.stringify({ plan_ids }),
  });
}

export interface AdminDashboardSummary {
  client_count: number;
  project_count: number;
}

export function adminGetDashboardSummary(adminApiKey: string): Promise<AdminDashboardSummary> {
  return request("/admin/dashboard/summary", { headers: { Authorization: `Bearer ${adminApiKey}` } });
}

export interface AdminSpendBucket {
  bucket: string;
  cost_usd: number;
}

export interface AdminSpendSeries {
  granularity: "day" | "week" | "month";
  total_usd: number;
  series: AdminSpendBucket[];
}

export function adminGetSpendSeries(adminApiKey: string, start: string, end: string): Promise<AdminSpendSeries> {
  return request(`/admin/dashboard/spend?start=${start}&end=${end}`, {
    headers: { Authorization: `Bearer ${adminApiKey}` },
  });
}

// ─── Admin cockpit — KPIs & analytics ────────────────────────────────────────

export interface AdminKpis {
  total_cost_usd: number;
  run_count: number;
  success_rate: number;
  failure_rate: number;
  avg_cost_per_run_usd: number;
  avg_duration_ms: number;
  mrr_usd: number;
  margin_usd: number;
}

export function adminGetKpis(adminApiKey: string, start: string, end: string): Promise<AdminKpis> {
  return request(`/admin/dashboard/kpis?start=${start}&end=${end}`, {
    headers: { Authorization: `Bearer ${adminApiKey}` },
  });
}

export interface AdminCostByModelItem {
  model: string;
  cost_usd: number;
  run_count: number;
}

export function adminGetCostByModel(adminApiKey: string, start: string, end: string): Promise<AdminCostByModelItem[]> {
  return request(`/admin/dashboard/cost-by-model?start=${start}&end=${end}`, {
    headers: { Authorization: `Bearer ${adminApiKey}` },
  });
}

export interface AdminCostByStepItem {
  step: string;
  cost_usd: number;
  run_count: number;
}

export function adminGetCostByStep(adminApiKey: string, start: string, end: string): Promise<AdminCostByStepItem[]> {
  return request(`/admin/dashboard/cost-by-step?start=${start}&end=${end}`, {
    headers: { Authorization: `Bearer ${adminApiKey}` },
  });
}

export interface AdminSuccessByStepItem {
  step: string;
  success: number;
  failed: number;
}

export function adminGetSuccessByStep(adminApiKey: string, start: string, end: string): Promise<AdminSuccessByStepItem[]> {
  return request(`/admin/dashboard/success-by-step?start=${start}&end=${end}`, {
    headers: { Authorization: `Bearer ${adminApiKey}` },
  });
}

export interface AdminTopClientItem {
  client_id: string;
  email: string;
  cost_usd: number;
}

export function adminGetTopClients(adminApiKey: string, start: string, end: string, limit = 5): Promise<AdminTopClientItem[]> {
  return request(`/admin/dashboard/top-clients?start=${start}&end=${end}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${adminApiKey}` },
  });
}

export interface AdminActiveRun {
  identifier: string;
  step: string;
  container_id: string | null;
  started_at: string | null;
  client_email: string;
  client_id: string;
  project_name: string;
  project_id: string;
}

export function adminGetActiveRuns(adminApiKey: string): Promise<AdminActiveRun[]> {
  return request("/admin/dashboard/active-runs", {
    headers: { Authorization: `Bearer ${adminApiKey}` },
  });
}

export interface AdminRecentRun {
  id: string;
  identifier: string;
  step: string;
  status: string;
  model: string | null;
  cost_usd: number | null;
  duration_ms: number | null;
  error: string | null;
  created_at: string;
  client_email: string;
  client_id: string;
  project_name: string;
  project_id: string;
  stdout: string | null;
}

export interface AdminRecentRunsPage {
  items: AdminRecentRun[];
  total: number;
}

export function adminGetRecentRuns(
  adminApiKey: string,
  opts?: {
    limit?: number; offset?: number; status?: string; step?: string;
    clientId?: string; projectId?: string;
  }
): Promise<AdminRecentRunsPage> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  if (opts?.status) params.set("status", opts.status);
  if (opts?.step) params.set("step", opts.step);
  if (opts?.clientId) params.set("client_id", opts.clientId);
  if (opts?.projectId) params.set("project_id", opts.projectId);
  const qs = params.toString();
  return request(`/admin/dashboard/recent-runs${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${adminApiKey}` },
  });
}

// ─── Admin settings ───────────────────────────────────────────────────────────

export interface AdminDefaultModels {
  spec: string;
  plan: string;
  dev: string;
}

export function adminGetDefaultModels(adminApiKey: string): Promise<AdminDefaultModels> {
  return request("/admin/settings/default-models", { headers: { Authorization: `Bearer ${adminApiKey}` } });
}

export function adminUpdateDefaultModels(adminApiKey: string, payload: Partial<AdminDefaultModels>): Promise<AdminDefaultModels> {
  return request("/admin/settings/default-models", {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminApiKey}` },
    body: JSON.stringify(payload),
  });
}

// ── Providers LLM ─────────────────────────────────────────────────────────────

export interface AdminProviderItem {
  key: string;
  agent: string;
  env_var: string;
  base_url: string | null;
  is_active: boolean;
  has_managed_key: boolean;
}

export interface AdminProviderModel {
  agent: string;
  model: string;
}

export function adminGetProviders(adminApiKey: string): Promise<AdminProviderItem[]> {
  return request("/admin/settings/providers", { headers: { Authorization: `Bearer ${adminApiKey}` } });
}

export function adminGetProviderModel(adminApiKey: string): Promise<AdminProviderModel> {
  return request("/admin/settings/provider-model", { headers: { Authorization: `Bearer ${adminApiKey}` } });
}

export function adminUpdateProviderModel(adminApiKey: string, payload: AdminProviderModel): Promise<AdminProviderModel> {
  return request("/admin/settings/provider-model", {
    method: "PUT",
    headers: { Authorization: `Bearer ${adminApiKey}` },
    body: JSON.stringify(payload),
  });
}

export interface AdminProjectToggle {
  project_id: string;
  is_active: boolean;
}

export function adminToggleProjectActive(adminApiKey: string, projectId: string): Promise<AdminProjectToggle> {
  return request(`/admin/settings/projects/${projectId}/toggle-active`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminApiKey}` },
  });
}

// ─── Backlog auto-généré ──────────────────────────────────────────────────────

export interface BacklogTicketDraft {
  title: string;
  description: string;
  labels: string[];
}

export interface BacklogDraftOut {
  tickets: BacklogTicketDraft[];
}

export interface BacklogStatusOut {
  status: "in_progress" | "draft_ready" | "done" | "failed" | null;
  error?: string | null;
}

export function createBacklog(apiKey: string, projectId: string, brief: string): Promise<void> {
  if (isLocalMode()) return Promise.resolve();
  return request(`/projects/${projectId}/backlog`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ brief }),
  });
}

export function getBacklogStatus(apiKey: string, projectId: string): Promise<BacklogStatusOut> {
  if (isLocalMode()) return Promise.resolve({ status: null });
  return request(`/projects/${projectId}/backlog/status`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function getBacklogDraft(apiKey: string, projectId: string): Promise<BacklogDraftOut> {
  if (isLocalMode()) return Promise.resolve({ tickets: [] });
  return request(`/projects/${projectId}/backlog/draft`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export function commitBacklog(
  apiKey: string,
  projectId: string,
  tickets: BacklogTicketDraft[]
): Promise<void> {
  if (isLocalMode()) return Promise.resolve();
  return request(`/projects/${projectId}/backlog/commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ tickets }),
  });
}
