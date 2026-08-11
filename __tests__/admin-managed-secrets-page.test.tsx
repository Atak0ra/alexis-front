import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminManagedSecretsPage from "@/app/admin/managed-secrets/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/managed-secrets",
}));

const ANTHROPIC_SECRET = {
  key: "anthropic", agent: "claude", env_var: "ALEXIS_MANAGED_ANTHROPIC_API_KEY",
  has_value: true, is_active: true, updated_at: "2026-07-26T00:00:00Z",
  plan_ids: ["plan-standard"], models: { spec: "claude-sonnet-4-5", plan: "claude-sonnet-4-5", dev: "claude-sonnet-4-5" },
};
const GROQ_SECRET = {
  key: "groq", agent: "aider", env_var: "ALEXIS_MANAGED_GROQ_API_KEY",
  has_value: false, is_active: false, updated_at: "2026-07-26T00:00:00Z",
  plan_ids: [], models: { spec: "", plan: "", dev: "" },
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(session, "getAdminApiKey").mockReturnValue("alx_admin_xxx");
  vi.spyOn(apiClient, "adminListManagedSecrets").mockResolvedValue([ANTHROPIC_SECRET, GROQ_SECRET]);
  vi.spyOn(apiClient, "adminListPlans").mockResolvedValue([
    { id: "plan-standard", name: "standard", monthly_price_usd: 150, forced_agent_choice: null, monthly_max_budget_usd: null } as apiClient.PlanOut,
  ]);
});

describe("AdminManagedSecretsPage", () => {
  it("renders presence status for both managed keys, never the plaintext value", async () => {
    render(<AdminManagedSecretsPage />);

    await waitFor(() => expect(screen.getByText("Anthropic")).toBeInTheDocument());
    // has_value:true → "Modifier" + horodatage indirect via modèles/plans affichés ; jamais la valeur en clair.
    expect(screen.getByRole("button", { name: /modifier/i })).toBeInTheDocument();
    expect(screen.queryByText(/gsk_|sk-ant-/)).not.toBeInTheDocument();

    // has_value:false → "Configurer".
    expect(screen.getByRole("button", { name: /configurer/i })).toBeInTheDocument();
  });

  it("shows configured models and linked plans on the row summary", async () => {
    render(<AdminManagedSecretsPage />);
    await waitFor(() => expect(screen.getByText("Anthropic")).toBeInTheDocument());

    // Les modèles sont rendus dans des éléments séparés (spec / plan / dev)
    expect(screen.getAllByText("claude-sonnet-4-5").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("standard")).toBeInTheDocument();
  });

  it("saves a new key value through the modal, using the dedicated value endpoint", async () => {
    const updateSpy = vi.spyOn(apiClient, "adminUpdateManagedSecret").mockResolvedValue({ ...GROQ_SECRET, has_value: true });
    const plansSpy = vi.spyOn(apiClient, "adminSetManagedSecretPlanIds").mockResolvedValue(GROQ_SECRET);

    render(<AdminManagedSecretsPage />);
    await waitFor(() => expect(screen.getByText("Groq")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /configurer/i }));
    fireEvent.change(screen.getByPlaceholderText(/nouvelle clé api/i), { target: { value: "gsk_new_xxx" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith("alx_admin_xxx", "groq", "gsk_new_xxx"));
    // Plans liés toujours envoyés (remplacement idempotent, même vide).
    expect(plansSpy).toHaveBeenCalledWith("alx_admin_xxx", "groq", []);
  });

  it("saves models through the dedicated /models endpoint, not the generic value endpoint", async () => {
    const modelsSpy = vi.spyOn(apiClient, "adminUpdateManagedSecretModels").mockResolvedValue(ANTHROPIC_SECRET);
    vi.spyOn(apiClient, "adminSetManagedSecretPlanIds").mockResolvedValue(ANTHROPIC_SECRET);
    const valueSpy = vi.spyOn(apiClient, "adminUpdateManagedSecret");

    render(<AdminManagedSecretsPage />);
    await waitFor(() => expect(screen.getByText("Anthropic")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /modifier/i }));
    const specInput = screen.getByPlaceholderText(/ex: anthropic\/nom-du-modele/i);
    fireEvent.change(specInput, { target: { value: "claude-opus-4-5" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() =>
      expect(modelsSpy).toHaveBeenCalledWith("alx_admin_xxx", "anthropic", {
        spec: "claude-opus-4-5", plan: "claude-sonnet-4-5", dev: "claude-sonnet-4-5",
      })
    );
    // Aucun champ clé saisi → l'endpoint valeur générique ne doit jamais être appelé.
    expect(valueSpy).not.toHaveBeenCalled();
  });

  it("includes audit model in the /models payload when filled", async () => {
    const modelsSpy = vi.spyOn(apiClient, "adminUpdateManagedSecretModels").mockResolvedValue(ANTHROPIC_SECRET);
    vi.spyOn(apiClient, "adminSetManagedSecretPlanIds").mockResolvedValue(ANTHROPIC_SECRET);

    render(<AdminManagedSecretsPage />);
    await waitFor(() => expect(screen.getByText("Anthropic")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /modifier/i }));

    // Remplir le champ audit
    const auditInput = screen.getByPlaceholderText(/laisser vide pour utiliser le modèle spec/i);
    fireEvent.change(auditInput, { target: { value: "claude-opus-4-5" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() =>
      expect(modelsSpy).toHaveBeenCalledWith("alx_admin_xxx", "anthropic", expect.objectContaining({
        audit: "claude-opus-4-5",
      }))
    );
  });

  it("omits audit field from /models payload when left empty", async () => {
    const modelsSpy = vi.spyOn(apiClient, "adminUpdateManagedSecretModels").mockResolvedValue(ANTHROPIC_SECRET);
    vi.spyOn(apiClient, "adminSetManagedSecretPlanIds").mockResolvedValue(ANTHROPIC_SECRET);

    render(<AdminManagedSecretsPage />);
    await waitFor(() => expect(screen.getByText("Anthropic")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /modifier/i }));
    // Ne pas toucher au champ audit (vide par défaut)
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() =>
      expect(modelsSpy).toHaveBeenCalledWith("alx_admin_xxx", "anthropic", expect.not.objectContaining({
        audit: expect.any(String),
      }))
    );
  });

  it("renders the audit model input with the correct placeholder", async () => {
    render(<AdminManagedSecretsPage />);
    await waitFor(() => expect(screen.getByText("Anthropic")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /modifier/i }));

    expect(screen.getByPlaceholderText(/laisser vide pour utiliser le modèle spec/i)).toBeInTheDocument();
  });

  it("clears a managed key from within the modal", async () => {
    const updateSpy = vi.spyOn(apiClient, "adminUpdateManagedSecret").mockResolvedValue({ ...ANTHROPIC_SECRET, has_value: false });

    render(<AdminManagedSecretsPage />);
    await waitFor(() => expect(screen.getByText("Anthropic")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /modifier/i }));
    fireEvent.click(screen.getByRole("button", { name: /^supprimer$/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith("alx_admin_xxx", "anthropic", null));
  });

  it("toggles active state only when the desired state differs from current", async () => {
    vi.spyOn(apiClient, "adminSetManagedSecretPlanIds").mockResolvedValue(ANTHROPIC_SECRET);
    vi.spyOn(apiClient, "adminUpdateManagedSecretModels").mockResolvedValue(ANTHROPIC_SECRET);
    const toggleSpy = vi.spyOn(apiClient, "adminToggleManagedSecretActive").mockResolvedValue({ ...ANTHROPIC_SECRET, is_active: false });

    render(<AdminManagedSecretsPage />);
    await waitFor(() => expect(screen.getByText("Anthropic")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /modifier/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /provider actif/i })); // anthropic starts active → unchecking
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => expect(toggleSpy).toHaveBeenCalledWith("alx_admin_xxx", "anthropic"));
  });
});
