/**
 * Tests de la section Équipe de la page Mon compte.
 *
 * Couvre :
 *  - Affichage du message d'upgrade pour les plans sans invitation (free/byok)
 *  - Affichage de la liste des membres (owner + membres)
 *  - Formulaire d'invitation (succès, erreur, quota atteint)
 *  - Retrait d'un membre
 *  - Masquage du formulaire quand quota atteint
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AccountSettingsPage from "@/app/dashboard/account/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const FREE_PLAN: apiClient.PlanPublicOut = {
  id: "plan-free",
  name: "free",
  display_name: "Gratuit",
  description: null,
  features: null,
  monthly_price_usd: 0,
  requires_own_key: false,
  max_members: 1,
  is_public: true,
  sort_order: 0,
};

const BYOK_PLAN: apiClient.PlanPublicOut = {
  ...FREE_PLAN,
  id: "plan-byok",
  name: "byok",
  display_name: "BYOK",
  requires_own_key: true,
  max_members: 1,
};

const SOLO_PLAN: apiClient.PlanPublicOut = {
  ...FREE_PLAN,
  id: "plan-solo",
  name: "solopreneur",
  display_name: "Solopreneur",
  monthly_price_usd: 29,
  max_members: 3,
};

const ENTERPRISE_PLAN: apiClient.PlanPublicOut = {
  ...FREE_PLAN,
  id: "plan-ent",
  name: "enterprise",
  display_name: "Entreprise",
  monthly_price_usd: 99,
  max_members: null,
};

function makeProfile(
  plan: apiClient.PlanPublicOut | null,
  role: "owner" | "member" = "owner"
): apiClient.ClientProfile {
  return {
    id: "client-1",
    email: "owner@test.com",
    email_verified: true,
    github_username: null,
    forced_agent_choice: null,
    plan,
    role,
    first_name: null,
    last_name: null,
  };
}

function makeMembersData(
  used: number,
  limit: number | null,
  extraMembers: apiClient.MemberOut[] = []
): apiClient.MembersListOut {
  const owner: apiClient.MemberOut = {
    id: "client-1",
    email: "owner@test.com",
    first_name: null,
    last_name: null,
    role: "owner",
    created_at: new Date().toISOString(),
  };
  return { members: [owner, ...extraMembers], used, limit };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_test");
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AccountSettingsPage — section Équipe", () => {
  it("affiche le message d'upgrade pour le plan free (max_members=1)", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValue(makeProfile(FREE_PLAN));
    vi.spyOn(apiClient, "listMembers").mockResolvedValue(makeMembersData(1, 1));

    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("team-section")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/invitation de membres n'est pas disponible/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("invite-form")).not.toBeInTheDocument();
  });

  it("affiche le message d'upgrade pour le plan byok (requires_own_key=true)", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValue(makeProfile(BYOK_PLAN));
    vi.spyOn(apiClient, "listMembers").mockResolvedValue(makeMembersData(1, 1));

    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("team-section")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/invitation de membres n'est pas disponible/i)
    ).toBeInTheDocument();
  });

  it("affiche le formulaire d'invitation pour le plan solopreneur", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValue(makeProfile(SOLO_PLAN));
    vi.spyOn(apiClient, "listMembers").mockResolvedValue(makeMembersData(1, 3));

    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("invite-form")).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText("Prénom")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nom")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
  });

  it("affiche le formulaire d'invitation pour le plan entreprise (illimité)", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValue(makeProfile(ENTERPRISE_PLAN));
    vi.spyOn(apiClient, "listMembers").mockResolvedValue(makeMembersData(1, null));

    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("invite-form")).toBeInTheDocument();
    });
  });

  it("affiche la liste des membres existants", async () => {
    const member: apiClient.MemberOut = {
      id: "member-1",
      email: "alice@test.com",
      first_name: "Alice",
      last_name: "Dupont",
      role: "member",
      created_at: new Date().toISOString(),
    };
    vi.spyOn(apiClient, "getMe").mockResolvedValue(makeProfile(SOLO_PLAN));
    vi.spyOn(apiClient, "listMembers").mockResolvedValue(
      makeMembersData(2, 3, [member])
    );

    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("members-list")).toBeInTheDocument();
    });

    expect(screen.getByText("Alice Dupont")).toBeInTheDocument();
    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
    expect(screen.getByText("Membre")).toBeInTheDocument();
    expect(screen.getAllByText("Propriétaire").length).toBeGreaterThan(0);
  });

  it("invite un membre avec succès", async () => {
    const newMember: apiClient.MemberOut = {
      id: "member-new",
      email: "bob@test.com",
      first_name: "Bob",
      last_name: "Martin",
      role: "member",
      created_at: new Date().toISOString(),
    };
    vi.spyOn(apiClient, "getMe").mockResolvedValue(makeProfile(SOLO_PLAN));
    vi.spyOn(apiClient, "listMembers").mockResolvedValue(makeMembersData(1, 3));
    const inviteSpy = vi.spyOn(apiClient, "inviteMember").mockResolvedValue(newMember);

    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("invite-form")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Prénom"), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByPlaceholderText("Nom"), {
      target: { value: "Martin" },
    });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "bob@test.com" },
    });
    fireEvent.click(screen.getByText("Envoyer l'invitation"));

    await waitFor(() => {
      expect(screen.getByText(/invitation envoyée/i)).toBeInTheDocument();
    });

    expect(inviteSpy).toHaveBeenCalledWith("alx_test", {
      email: "bob@test.com",
      first_name: "Bob",
      last_name: "Martin",
    });
  });

  it("affiche une erreur si l'invitation échoue", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValue(makeProfile(SOLO_PLAN));
    vi.spyOn(apiClient, "listMembers").mockResolvedValue(makeMembersData(1, 3));
    vi.spyOn(apiClient, "inviteMember").mockRejectedValue(
      new apiClient.AlexisApiError(409, "Cette adresse email est déjà associée à un compte.")
    );

    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("invite-form")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Prénom"), { target: { value: "X" } });
    fireEvent.change(screen.getByPlaceholderText("Nom"), { target: { value: "Y" } });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "existing@test.com" },
    });
    fireEvent.click(screen.getByText("Envoyer l'invitation"));

    await waitFor(() => {
      expect(
        screen.getByText(/déjà associée à un compte/i)
      ).toBeInTheDocument();
    });
  });

  it("masque le formulaire quand le quota est atteint", async () => {
    const m1: apiClient.MemberOut = {
      id: "m1", email: "m1@test.com", first_name: null, last_name: null,
      role: "member", created_at: new Date().toISOString(),
    };
    const m2: apiClient.MemberOut = {
      id: "m2", email: "m2@test.com", first_name: null, last_name: null,
      role: "member", created_at: new Date().toISOString(),
    };
    vi.spyOn(apiClient, "getMe").mockResolvedValue(makeProfile(SOLO_PLAN));
    vi.spyOn(apiClient, "listMembers").mockResolvedValue(
      makeMembersData(3, 3, [m1, m2])
    );

    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("team-section")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("invite-form")).not.toBeInTheDocument();
    expect(screen.getByText(/quota atteint/i)).toBeInTheDocument();
  });

  it("retire un membre avec succès", async () => {
    const member: apiClient.MemberOut = {
      id: "member-del",
      email: "todelete@test.com",
      first_name: "To",
      last_name: "Delete",
      role: "member",
      created_at: new Date().toISOString(),
    };
    vi.spyOn(apiClient, "getMe").mockResolvedValue(makeProfile(SOLO_PLAN));
    vi.spyOn(apiClient, "listMembers").mockResolvedValue(
      makeMembersData(2, 3, [member])
    );
    const removeSpy = vi.spyOn(apiClient, "removeMember").mockResolvedValue({} as void);

    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("To Delete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Retirer todelete@test.com"));

    await waitFor(() => {
      expect(screen.queryByText("To Delete")).not.toBeInTheDocument();
    });

    expect(removeSpy).toHaveBeenCalledWith("alx_test", "member-del");
  });

  it("n'affiche pas le formulaire d'invitation pour un membre (non-owner)", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValue(makeProfile(SOLO_PLAN, "member"));
    vi.spyOn(apiClient, "listMembers").mockResolvedValue(makeMembersData(2, 3));

    render(<AccountSettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("team-section")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("invite-form")).not.toBeInTheDocument();
  });

  it("affiche le badge Propriétaire pour l'owner", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValue(makeProfile(SOLO_PLAN));
    vi.spyOn(apiClient, "listMembers").mockResolvedValue(makeMembersData(1, 3));

    render(<AccountSettingsPage />);

    await waitFor(() => {
      const badges = screen.getAllByText("Propriétaire");
      expect(badges.length).toBeGreaterThan(0);
    });
  });
});
