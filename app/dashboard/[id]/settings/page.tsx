"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getMe,
  getProject,
  updateProject,
  getProjectContext,
  purgeProject,
  transferRepo,
  downloadProject,
  listProjectReferences,
  uploadProjectReference,
  projectReferenceContentUrl,
  friendlyError,
  type ProjectOut,
  type ClientProfile,
  type ProjectReference,
} from "@/lib/api-client";
import { getApiKey } from "@/lib/session";
import { isLocalMode, getDemoProjectReferenceDataUrl } from "@/lib/demo-data";
import ProjectContextStep from "@/components/project-context-step";
import AssetUploadGrid from "@/components/asset-upload-grid";

// ─── Secret field ─────────────────────────────────────────────────────────────

function SecretField({
  id,
  label,
  placeholder,
  value,
  onChange,
  isConfigured,
}: {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  isConfigured: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label htmlFor={id}>{label}</Label>
        {isConfigured && (
          <span className="flex items-center gap-1 text-xs text-success font-medium">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Clé configurée
          </span>
        )}
      </div>
      <Input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isConfigured ? "•••••• (laisser vide pour ne pas modifier)" : placeholder}
        autoComplete="new-password"
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectSettingsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();

  const [project, setProject] = useState<ProjectOut | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // isByok : true si le plan du client autorise la config agent personnalisée.
  // Fail-safe : pas de plan → non-BYOK → section masquée.
  const isByok = profile?.plan?.requires_own_key ?? false;

  // Champs classiques
  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [agentChoice, setAgentChoice] = useState("claude");
  const [agentBaseUrl, setAgentBaseUrl] = useState("");
  const [specModel, setSpecModel] = useState("");
  const [planModel, setPlanModel] = useState("");
  const [devModel, setDevModel] = useState("");
  const [codeReviewEnabled, setCodeReviewEnabled] = useState(true);
  const [forgeProvider, setForgeProvider] = useState("github");

  // Secrets (write-only)
  const [agentApiKey, setAgentApiKey] = useState("");
  const [forgeToken, setForgeToken] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Contexte
  const [contextExists, setContextExists] = useState<boolean | null>(null);
  const [showContextStep, setShowContextStep] = useState(false);

  // Danger Zone
  const [purgeConfirmName, setPurgeConfirmName] = useState("");
  const [purging, setPurging] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  // Repo hébergé — transfert
  const [transferConfirming, setTransferConfirming] = useState(false);
  const [transferOwner, setTransferOwner] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferredTo, setTransferredTo] = useState<string | null>(null);

  // Bibliothèque de style — références visuelles par défaut du projet
  const [references, setReferences] = useState<ProjectReference[]>([]);
  const [referencePreviewUrls, setReferencePreviewUrls] = useState<Record<string, string>>({});
  const [uploadingReference, setUploadingReference] = useState(false);

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    // Charger le profil client (pour dériver isByok)
    getMe(apiKey)
      .then(setProfile)
      .catch(() => setProfile(null));

    getProject(apiKey, projectId)
      .then((p) => {
        setProject(p);
        setName(p.name);
        setRepoUrl(p.repo_url ?? "");
        // agent_choice / agent_base_url / models sont null/{} pour les projets non-BYOK
        setAgentChoice(p.agent_choice ?? "claude");
        setAgentBaseUrl(p.agent_base_url ?? "");
        setSpecModel(p.models?.spec ?? "");
        setPlanModel(p.models?.plan ?? "");
        setDevModel(p.models?.dev ?? "");
        setCodeReviewEnabled(p.code_review_enabled);
        setForgeProvider(p.forge_provider);
      })
      .catch((err) =>
        setLoadError(friendlyError(err))
      );

    getProjectContext(apiKey, projectId)
      .then(({ exists }) => setContextExists(exists))
      .catch(() => setContextExists(null));

    listProjectReferences(apiKey, projectId)
      .then((list) => {
        setReferences(list);

        // Le endpoint /content exige un Bearer token : une <img src> brute ne
        // peut pas attacher de header, donc on résout les previews en amont
        // (data: URL en démo, blob authentifié sinon) plutôt que de laisser
        // AssetUploadGrid pointer directement vers l'URL de contenu.
        if (isLocalMode()) {
          const urls: Record<string, string> = {};
          for (const r of list) {
            const dataUrl = getDemoProjectReferenceDataUrl(projectId, r.id);
            if (dataUrl) urls[r.id] = dataUrl;
          }
          setReferencePreviewUrls((prev) => ({ ...prev, ...urls }));
        } else {
          Promise.all(
            list
              .filter((r) => r.content_type.startsWith("image/"))
              .map((r) =>
                fetch(projectReferenceContentUrl(projectId, r.id), {
                  headers: { Authorization: `Bearer ${apiKey}` },
                })
                  .then((res) => res.blob())
                  .then((blob) => [r.id, URL.createObjectURL(blob)] as const)
                  .catch(() => null)
              )
          ).then((pairs) => {
            const urls: Record<string, string> = {};
            for (const pair of pairs) {
              if (pair) urls[pair[0]] = pair[1];
            }
            setReferencePreviewUrls((prev) => ({ ...prev, ...urls }));
          });
        }
      })
      .catch(() => setReferences([]));
  }, [projectId]);

  async function handleUploadReference(file: File) {
    const apiKey = getApiKey();
    if (!apiKey) return;
    setUploadingReference(true);
    try {
      const reference = await uploadProjectReference(apiKey, projectId, file);
      setReferences((prev) => [...prev, reference]);

      if (isLocalMode()) {
        const dataUrl = getDemoProjectReferenceDataUrl(projectId, reference.id);
        if (dataUrl) {
          setReferencePreviewUrls((prev) => ({ ...prev, [reference.id]: dataUrl }));
        }
      } else if (reference.content_type.startsWith("image/")) {
        fetch(projectReferenceContentUrl(projectId, reference.id), {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
          .then((res) => res.blob())
          .then((blob) => {
            setReferencePreviewUrls((prev) => ({ ...prev, [reference.id]: URL.createObjectURL(blob) }));
          })
          .catch((err) => console.error("[settings] reference preview failed", err));
      }
    } catch {
      // silencieux — pas de blocage du reste de la page pour un échec d'upload
    } finally {
      setUploadingReference(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);
    setSaving(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Session absente");
      const payload: Parameters<typeof updateProject>[2] = {
        name,
        repo_url: repoUrl,
        // Champs BYOK : envoyés uniquement si le plan l'autorise.
        // Sinon le backend renverrait 403 (plan sans requires_own_key).
        ...(isByok ? {
          agent_choice: agentChoice,
          agent_base_url: agentBaseUrl.trim() || null,
          models: { spec: specModel.trim(), plan: planModel.trim(), dev: devModel.trim() },
          ...(agentApiKey ? { agent_api_key: agentApiKey } : {}),
        } : {}),
        code_review_enabled: codeReviewEnabled,
        ...(project?.is_hosted ? {} : { forge_provider: forgeProvider }),
        ...(!project?.is_hosted && forgeToken ? { forge_token: forgeToken } : {}),
      };
      await updateProject(apiKey, projectId, payload);
      setSaveSuccess(true);
      setAgentApiKey("");
      setForgeToken("");
    } catch (err) {
      setSaveError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handlePurge() {
    if (!project || purgeConfirmName !== project.name) return;
    setPurgeError(null);
    setPurging(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Session absente");
      await purgeProject(apiKey, projectId);
      router.push("/dashboard");
    } catch (err) {
      setPurgeError(friendlyError(err));
      setPurging(false);
    }
  }

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloadError(null);
    setDownloading(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey || !project) throw new Error("Session absente");
      await downloadProject(apiKey, projectId, project.name);
    } catch (err) {
      setDownloadError(friendlyError(err));
    } finally {
      setDownloading(false);
    }
  }

  async function handleTransferRepo() {
    setTransferError(null);
    setTransferring(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Session absente");
      const result = await transferRepo(apiKey, projectId, {
        ...(transferOwner.trim() ? { new_owner: transferOwner.trim() } : {}),
      });
      setTransferredTo(result.new_owner);
      setTransferConfirming(false);
    } catch (err) {
      setTransferError(friendlyError(err));
    } finally {
      setTransferring(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <p className="text-base font-semibold text-foreground">{loadError}</p>
        <Link
          href={`/dashboard/${projectId}`}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-sunken transition-colors"
        >
          ← Retour au projet
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-foreground-muted">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          Projets
        </Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`} className="hover:text-foreground transition-colors">
          {project?.name ?? "…"}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Paramètres</span>
      </div>

      <h1 className="mb-6 font-display text-2xl font-bold text-foreground">Paramètres du projet</h1>

      {project === null ? (
        <div className="max-w-2xl space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-sunken" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ── Colonne principale : formulaire ── */}
          <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
            {/* Général */}
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Général
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom du projet</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="repo-url">URL du repo</Label>
                    {project.is_hosted && (
                      <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand">
                        Hébergé par Alexis
                      </span>
                    )}
                  </div>
                  <Input
                    id="repo-url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    readOnly={project.is_hosted}
                    required
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Code source
              </h3>
              <div className="rounded-xl border border-border bg-surface-raised p-4 space-y-3">
                <p className="text-sm text-foreground-muted">
                  Récupère l&apos;état actuel du code de ce projet, à tout moment, pendant ou après
                  l&apos;implémentation d&apos;un ticket.
                </p>
                {downloadError && <p className="text-sm text-danger">{downloadError}</p>}
                <Button type="button" variant="secondary" disabled={downloading} onClick={handleDownload}>
                  {downloading ? "Préparation…" : "Télécharger le code (ZIP)"}
                </Button>
              </div>
            </section>

            {project.is_hosted && (
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Repo hébergé
                </h3>
                <div className="rounded-xl border border-border bg-surface-raised p-4 space-y-3">
                  <p className="text-sm text-foreground-muted">
                    Ce dépôt vit sous l&apos;organisation GitHub Alexis. Tu peux le transférer vers ton propre
                    compte GitHub à tout moment. Action définitive : Alexis n&apos;aura plus accès au repo une
                    fois le transfert accepté, et ce projet s&apos;arrêtera (plus de run automatique).
                  </p>

                  {transferredTo ? (
                    <p className="text-sm font-medium text-success">
                      ✓ Transfert lancé vers <span className="font-mono">{transferredTo}</span>. Vérifie ton
                      compte GitHub pour l&apos;accepter.
                    </p>
                  ) : transferConfirming ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="transfer-owner">
                          Compte GitHub cible{" "}
                          <span className="text-foreground-subtle font-normal">(optionnel)</span>
                        </Label>
                        <Input
                          id="transfer-owner"
                          value={transferOwner}
                          onChange={(e) => setTransferOwner(e.target.value)}
                          placeholder="ton-pseudo-github"
                        />
                      </div>
                      {transferError && <p className="text-sm text-danger">{transferError}</p>}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={transferring}
                          onClick={handleTransferRepo}
                          className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-danger/90 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        >
                          {transferring ? "Transfert…" : "Confirmer le transfert"}
                        </button>
                        <Button type="button" variant="secondary" onClick={() => setTransferConfirming(false)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button type="button" variant="secondary" onClick={() => setTransferConfirming(true)}>
                      Transférer mon repo
                    </Button>
                  )}
                </div>
              </section>
            )}

            {/* Agent — visible uniquement pour les plans BYOK (requires_own_key).
                Les plans gérés utilisent le provider par défaut de la plateforme. */}
            {isByok && (
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Agent
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="agent-choice">Agent CLI</Label>
                    <select
                      id="agent-choice"
                      value={agentChoice}
                      onChange={(e) => setAgentChoice(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <option value="claude">claude</option>
                      <option value="aider">aider</option>
                    </select>
                  </div>
                  <SecretField
                    id="agent-api-key"
                    label="Clé API agent"
                    placeholder="sk-ant-… ou clé aider"
                    value={agentApiKey}
                    onChange={setAgentApiKey}
                    isConfigured={project.has_agent_api_key}
                  />
                  {agentChoice === "aider" && (
                    <div>
                      <Label htmlFor="agent-base-url">
                        Base URL de l&apos;API{" "}
                        <span className="text-foreground-subtle font-normal">(optionnel)</span>
                      </Label>
                      <Input
                        id="agent-base-url"
                        type="url"
                        value={agentBaseUrl}
                        onChange={(e) => setAgentBaseUrl(e.target.value)}
                        placeholder="https://api.groq.com/openai/v1"
                      />
                      <p className="mt-1 text-xs text-foreground-subtle">
                        Laisse vide pour OpenAI. Groq : https://api.groq.com/openai/v1. OpenRouter :
                        https://openrouter.ai/api/v1.
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-foreground">Modèles par étape</p>
                    <p className="mb-2 text-xs text-foreground-subtle">
                      Doit correspondre au fournisseur de la clé ci-dessus (ex : claude-sonnet-4-5 pour
                      Anthropic, gpt-4o pour OpenAI). Avec Groq ou OpenRouter, préfixe le nom du modèle par{" "}
                      <code className="font-mono">groq/</code> ou{" "}
                      <code className="font-mono">openrouter/</code>, ex :{" "}
                      <code className="font-mono">groq/llama-3.3-70b-versatile</code>. Ces providers sont
                      gérés nativement, la Base URL ci-dessus n&apos;est alors pas utilisée.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <Label htmlFor="spec-model">Spec</Label>
                        <Input id="spec-model" value={specModel} onChange={(e) => setSpecModel(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="plan-model">Plan</Label>
                        <Input id="plan-model" value={planModel} onChange={(e) => setPlanModel(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="dev-model">Dev</Label>
                        <Input id="dev-model" value={devModel} onChange={(e) => setDevModel(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Revue de code — visible pour tous les plans */}
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Qualité
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    id="code-review-enabled"
                    type="checkbox"
                    checked={codeReviewEnabled}
                    onChange={(e) => setCodeReviewEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                  <Label htmlFor="code-review-enabled">Revue de code</Label>
                </div>
                <p className="text-xs text-foreground-subtle">
                  Décoché : le code part directement sur develop au prochain ticket, sans Pull Request.
                </p>
              </div>
            </section>

            {/* Forge — masqué pour un projet hébergé : le token est géré par
                Alexis (GitHub App), forge_provider est toujours github et
                n'est pas modifiable (voir la garde côté API sur PATCH). */}
            {!project.is_hosted && (
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Forge
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="forge-provider">Forge</Label>
                    <select
                      id="forge-provider"
                      value={forgeProvider}
                      onChange={(e) => setForgeProvider(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <option value="github">github</option>
                      <option value="gitlab">gitlab</option>
                    </select>
                  </div>
                  <SecretField
                    id="forge-token"
                    label="Clé d'accès (GitHub/GitLab)"
                    placeholder="ghp_… ou glpat-…"
                    value={forgeToken}
                    onChange={setForgeToken}
                    isConfigured={project.has_forge_token}
                  />
                </div>
              </section>
            )}

            {/* Feedback */}
            {saveError && (
              <p className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
                {saveError}
              </p>
            )}
            {saveSuccess && (
              <p className="rounded-lg border border-success-border bg-success-bg px-4 py-3 text-sm text-success font-medium">
                ✓ Paramètres enregistrés
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Link
                href={`/dashboard/${projectId}`}
                className="text-sm text-foreground-muted hover:text-foreground transition-colors"
              >
                ← Retour au projet
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </form>

          {/* ── Colonne latérale : panneaux indépendants ── */}
          <div className="space-y-6">
            {/* Contexte du projet */}
            <section className="rounded-xl border border-border bg-surface-raised p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Contexte du projet
              </h3>
              {showContextStep ? (
                <ProjectContextStep
                  projectId={projectId}
                  embedded
                  onDone={() => { setShowContextStep(false); setContextExists(true); }}
                  onSkip={() => setShowContextStep(false)}
                />
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    {contextExists === true && (
                      <svg className="h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {contextExists === false && (
                      <svg className="h-4 w-4 shrink-0 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        <code className="font-mono">.alexis/project.md</code>
                      </p>
                      <p className="mt-0.5 text-xs text-foreground-muted">
                        {contextExists === null && "Vérification…"}
                        {contextExists === true && "Fichier présent. Alexis l'utilise à chaque run."}
                        {contextExists === false && "Absent. Alexis travaillera mieux avec ce fichier."}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowContextStep(true)}
                    disabled={contextExists === null}
                  >
                    {contextExists === true ? "Régénérer" : "Générer"}
                  </Button>
                </div>
              )}
            </section>

            {/* Bibliothèque de style */}
            <section className="rounded-xl border border-border bg-surface-raised p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Bibliothèque de style
              </h3>
              <p className="mb-3 text-sm text-foreground-muted">
                Références visuelles utilisées par défaut quand un ticket n&apos;apporte pas sa propre maquette.
              </p>
              <AssetUploadGrid
                assets={references}
                onUpload={handleUploadReference}
                contentUrl={(id) => referencePreviewUrls[id] ?? ""}
                uploading={uploadingReference}
              />
            </section>

            {/* Danger Zone */}
            <div className="rounded-xl border border-danger-border bg-danger-bg p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-danger uppercase tracking-wider">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Zone de danger
              </h3>
              <p className="mt-2 text-sm text-danger/80">
                La suppression est <strong>irréversible</strong>. Tous les tickets, l&apos;historique des runs et le code du projet seront définitivement supprimés.
              </p>

              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-danger">
                  Tapez <strong className="font-mono">{project.name}</strong> pour confirmer
                </label>
                <input
                  type="text"
                  value={purgeConfirmName}
                  onChange={(e) => { setPurgeConfirmName(e.target.value); setPurgeError(null); }}
                  placeholder={project.name}
                  className="w-full rounded-xl border border-danger-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-danger/30"
                />
                {purgeError && (
                  <p className="text-xs text-danger">{purgeError}</p>
                )}
                <button
                  type="button"
                  disabled={purgeConfirmName !== project.name || purging}
                  onClick={handlePurge}
                  className="rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-danger/90 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  {purging ? "Suppression…" : "Supprimer définitivement ce projet"}
                </button>
              </div>
            </div>
          </div>
            </div>
          )}
    </div>
  );
}
