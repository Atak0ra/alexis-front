"use client";

import { useEffect, useState } from "react";
import {
  adminListManagedSecrets,
  adminListPlans,
  adminUpdateManagedSecret,
  adminUpdateManagedSecretModels,
  adminToggleManagedSecretActive,
  adminSetManagedSecretPlanIds,
  ManagedSecretOut,
  PlanOut,
  AlexisApiError,
} from "@/lib/api-client";
import { getAdminApiKey } from "@/lib/session";
import { AdminCard, adminButtonClass, adminGhostButtonClass, adminInputClass } from "../_components/chrome";
import { Modal, ModalFooter } from "@/components/ui/modal";

const LABELS: Record<string, { name: string; description: string }> = {
  anthropic:   { name: "Anthropic",       description: "Claude Code — modèles claude-*" },
  openai:      { name: "OpenAI",          description: "aider — gpt-4o, o1, o3…" },
  gemini:      { name: "Google Gemini",   description: "aider — gemini/gemini-2.0-flash…" },
  moonshot:    { name: "Moonshot / Kimi", description: "aider — moonshot/moonshot-v1-8k…" },
  xai:         { name: "xAI / Grok",      description: "aider — xai/grok-3, xai/grok-3-mini…" },
  groq:        { name: "Groq",            description: "aider — groq/llama-3.3-70b-versatile…" },
  openrouter:  { name: "OpenRouter",      description: "aider — accès à +200 modèles" },
  mistral:     { name: "Mistral",         description: "aider — mistral/mistral-large-latest…" },
  deepseek:    { name: "DeepSeek",        description: "aider — deepseek/deepseek-chat…" },
  together_ai: { name: "Together AI",     description: "aider — together_ai/…" },
  cohere:      { name: "Cohere",          description: "aider — cohere/command-r-plus…" },
};

type EmptyModels = { spec: string; plan: string; dev: string; audit: string };
const EMPTY_MODELS: EmptyModels = { spec: "", plan: "", dev: "", audit: "" };

export default function AdminManagedSecretsPage() {
  const [secrets, setSecrets] = useState<ManagedSecretOut[]>([]);
  const [plans, setPlans] = useState<PlanOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ── Modale de configuration (une seule, par provider) ──
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [modalValue, setModalValue] = useState("");
  const [modalModels, setModalModels] = useState<EmptyModels>(EMPTY_MODELS);
  const [modalPlanIds, setModalPlanIds] = useState<string[]>([]);
  const [modalActive, setModalActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  function load() {
    const apiKey = getAdminApiKey();
    if (!apiKey) return;
    Promise.all([adminListManagedSecrets(apiKey), adminListPlans(apiKey)])
      .then(([s, p]) => {
        setSecrets(s);
        setPlans(p);
      })
      .catch((err) => setListError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openModal(secret: ManagedSecretOut) {
    setOpenKey(secret.key);
    setModalValue("");
    setModalModels(secret.models ? { ...EMPTY_MODELS, ...secret.models } : EMPTY_MODELS);
    setModalPlanIds(secret.plan_ids ?? []);
    setModalActive(secret.is_active);
    setModalError(null);
  }

  function closeModal() {
    if (saving) return;
    setOpenKey(null);
  }

  function togglePlanId(planId: string) {
    setModalPlanIds((prev) => (prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId]));
  }

  async function handleSave() {
    const apiKey = getAdminApiKey();
    if (!apiKey || !openKey) return;
    const current = secrets.find((s) => s.key === openKey);
    const modelsFilled = modalModels.spec.trim() && modalModels.plan.trim() && modalModels.dev.trim();

    setModalError(null);
    setSaving(true);
    try {
      // 1. Clé API — uniquement si saisie (laisser vide = ne pas modifier).
      if (modalValue.trim()) {
        await adminUpdateManagedSecret(apiKey, openKey, modalValue.trim());
      }
      // 2. Modèles — l'API exige les 3 renseignés, on n'appelle donc que si complet.
      if (modelsFilled) {
        await adminUpdateManagedSecretModels(apiKey, openKey, {
          spec: modalModels.spec.trim(),
          plan: modalModels.plan.trim(),
          dev: modalModels.dev.trim(),
          ...(modalModels.audit.trim() ? { audit: modalModels.audit.trim() } : {}),
        });
      }
      // 3. Plans liés — toujours envoyé, remplace la liste complète (idempotent).
      await adminSetManagedSecretPlanIds(apiKey, openKey, modalPlanIds);
      // 4. Activation — uniquement si l'état désiré diffère de l'état courant.
      if (current && modalActive !== current.is_active) {
        await adminToggleManagedSecretActive(apiKey, openKey);
      }
      load();
      setOpenKey(null);
    } catch (err) {
      setModalError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveValue() {
    const apiKey = getAdminApiKey();
    if (!apiKey || !openKey) return;
    setModalError(null);
    setSaving(true);
    try {
      await adminUpdateManagedSecret(apiKey, openKey, null);
      setModalValue("");
      load();
      setOpenKey(null);
    } catch (err) {
      setModalError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  const openSecret = secrets.find((s) => s.key === openKey) ?? null;
  const openLabel = openKey ? LABELS[openKey] : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Clés gérées</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Clés API des providers LLM utilisées pour les projets sans clé personnelle (BYOK).
        Stockées de manière chiffrée et sécurisée. Jamais affichées en clair une fois enregistrées.
      </p>

      {listError && <p className="mt-4 text-sm text-danger">{listError}</p>}

      {loading && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-sunken" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="mt-6 space-y-3">
          {secrets.map((secret) => {
            const label = LABELS[secret.key];
            const linkedPlanNames = (secret.plan_ids ?? [])
              .map((id) => plans.find((p) => p.id === id)?.name ?? id)
              .join(", ");
            const modelTags = secret.models
              ? ([
                  { step: "spec", model: secret.models.spec },
                  { step: "plan", model: secret.models.plan },
                  { step: "dev",  model: secret.models.dev },
                ] as const).filter((m) => m.model)
              : [];

            return (
              <AdminCard key={secret.key} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{label?.name ?? secret.key}</p>
                      <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-foreground-subtle">
                        {secret.agent === "claude" ? "Claude Code" : "aider"}
                      </span>
                      {secret.is_active ? (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          ✓ Actif
                        </span>
                      ) : secret.has_value ? (
                        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                          ⏸ Désactivé
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-foreground-subtle">
                          Non configurée
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-foreground-subtle">
                      {label?.description ?? ""} — <code className="font-mono">{secret.env_var}</code>
                    </p>
                    {modelTags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {modelTags.map(({ step, model }) => (
                          <span
                            key={step}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-sunken px-2 py-0.5 text-xs"
                          >
                            <span className="font-semibold uppercase text-foreground-subtle">{step}</span>
                            <span className="font-mono text-foreground">{model}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {linkedPlanNames && (
                      <p className="mt-1 text-xs text-foreground-subtle">
                        Plans liés : <span className="font-medium text-foreground">{linkedPlanNames}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openModal(secret)}
                    className={`shrink-0 ${secret.has_value ? adminGhostButtonClass : adminButtonClass}`}
                  >
                    {secret.has_value ? "Modifier" : "Configurer"}
                  </button>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}

      {/* ── Modale de configuration : clé + modèles + plans + actif, en un seul endroit ── */}
      <Modal
        open={openKey !== null}
        onClose={closeModal}
        title={openLabel?.name ?? openKey ?? ""}
        titleId="managed-secret-modal-title"
        maxWidth="max-w-lg"
      >
        {openSecret && (
          <div className="space-y-5">
            {/* Clé API */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-foreground-subtle">
                Clé API
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="password"
                  value={modalValue}
                  onChange={(e) => setModalValue(e.target.value)}
                  placeholder={openSecret.has_value ? "•••••• (laisser vide pour ne pas modifier)" : "Nouvelle clé API…"}
                  className={`flex-1 ${adminInputClass}`}
                  autoFocus
                />
                {openSecret.has_value && (
                  <button
                    type="button"
                    onClick={handleRemoveValue}
                    disabled={saving}
                    className="shrink-0 text-xs text-danger hover:underline disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-foreground-subtle">
                Variable d&apos;environnement : <code className="font-mono">{openSecret.env_var}</code>
              </p>
            </div>

            {/* Modèles par étape */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-foreground-subtle">
                Modèles par étape
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(["spec", "plan", "dev"] as const).map((step) => (
                  <div key={step}>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
                      {step}
                    </label>
                    <input
                      type="text"
                      value={modalModels[step]}
                      onChange={(e) => setModalModels((prev) => ({ ...prev, [step]: e.target.value }))}
                      placeholder={step === "spec" ? `ex: ${openKey}/nom-du-modele` : ""}
                      className={adminInputClass}
                    />
                  </div>
                ))}
              </div>
              {/* Modèle audit — optionnel, fallback sur spec si vide */}
              <div className="mt-3">
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
                  audit{" "}
                  <span className="normal-case font-normal text-foreground-subtle/70">(optionnel — Alexis Check)</span>
                </label>
                <input
                  type="text"
                  value={modalModels.audit}
                  onChange={(e) => setModalModels((prev) => ({ ...prev, audit: e.target.value }))}
                  placeholder="Laisser vide pour utiliser le modèle spec"
                  className={adminInputClass}
                />
              </div>
              <p className="mt-1 text-xs text-foreground-subtle">
                Les 3 étapes (spec / plan / dev) doivent être renseignées pour pouvoir activer ce provider.
                Le modèle audit est utilisé pour les diagnostics Alexis Check ; si vide, le modèle spec est utilisé.
              </p>
            </div>

            {/* Plans liés */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-foreground-subtle">
                Plans liés
              </label>
              {plans.length === 0 ? (
                <p className="text-xs text-foreground-subtle">
                  Aucun plan configuré. Créez d&apos;abord des plans dans{" "}
                  <a href="/admin/plans" className="text-brand hover:underline">Plans</a>.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {plans.map((plan) => {
                    const isSelected = modalPlanIds.includes(plan.id);
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => togglePlanId(plan.id)}
                        className={
                          isSelected
                            ? "rounded-full border border-brand bg-brand/10 px-3 py-1 text-xs font-medium text-brand"
                            : "rounded-full border border-border px-3 py-1 text-xs text-foreground-subtle hover:border-brand/50 hover:text-foreground"
                        }
                      >
                        {isSelected ? "✓ " : ""}{plan.name}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-1 text-xs text-foreground-subtle">
                Les projets des clients sur ces plans (sans clé perso) utiliseront cette clé.
              </p>
            </div>

            {/* Actif */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={modalActive}
                onChange={(e) => setModalActive(e.target.checked)}
                className="h-4 w-4 rounded border-border text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
              <span className="text-sm font-medium text-foreground">Provider actif</span>
            </label>
            <p className="-mt-3 text-xs text-foreground-subtle">
              Nécessite une clé API et les 3 modèles renseignés (ici, ou déjà enregistrés).
            </p>

            {modalError && <p className="text-sm text-danger">{modalError}</p>}
          </div>
        )}

        <ModalFooter className="flex justify-end gap-3">
          <button type="button" onClick={closeModal} disabled={saving} className={adminGhostButtonClass}>
            Annuler
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className={adminButtonClass}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
