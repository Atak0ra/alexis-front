import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ProjectContextStep from "@/components/project-context-step";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
  // Prevent real setInterval from running during tests
  vi.spyOn(global, "setInterval").mockReturnValue(999 as unknown as ReturnType<typeof setInterval>);
  vi.spyOn(global, "clearInterval").mockImplementation(() => {});
});

describe("ProjectContextStep", () => {
  it("shows the form with textarea and Générer button", () => {
    render(<ProjectContextStep projectId="p1" />);
    expect(screen.getByLabelText("Décris ton projet en quelques phrases")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Générer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /passer cette étape/i })).toBeInTheDocument();
  });

  it("Passer cette étape redirects to /dashboard from the form phase", () => {
    render(<ProjectContextStep projectId="p1" />);
    fireEvent.click(screen.getByRole("button", { name: /passer cette étape/i }));
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("submits brief and enters polling phase", async () => {
    vi.spyOn(apiClient, "createProjectContext").mockResolvedValue(undefined);

    render(<ProjectContextStep projectId="p1" />);
    fireEvent.change(screen.getByLabelText("Décris ton projet en quelques phrases"), {
      target: { value: "API FastAPI + Next.js, PostgreSQL." },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Générer" }));
    });

    await waitFor(() =>
      expect(screen.getByText("Génération en cours…")).toBeInTheDocument()
    );
    // Skip button still present during polling
    expect(screen.getByRole("button", { name: /passer cette étape/i })).toBeInTheDocument();
  });

  it("Passer cette étape redirects to /dashboard during polling", async () => {
    vi.spyOn(apiClient, "createProjectContext").mockResolvedValue(undefined);

    render(<ProjectContextStep projectId="p1" />);
    fireEvent.change(screen.getByLabelText("Décris ton projet en quelques phrases"), {
      target: { value: "Mon projet." },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Générer" }));
    });

    await waitFor(() =>
      expect(screen.getByText("Génération en cours…")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /passer cette étape/i }));
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("shows done confirmation when status becomes done", async () => {
    vi.spyOn(apiClient, "createProjectContext").mockResolvedValue(undefined);
    // Immediately resolve to done on first status check
    vi.spyOn(apiClient, "getProjectContextStatus").mockResolvedValue({ status: "done" });

    // Override setInterval to call the callback immediately (synchronously after setup)
    let captured: (() => Promise<void>) | null = null;
    vi.mocked(global.setInterval).mockImplementation((fn: TimerHandler) => {
      captured = fn as () => Promise<void>;
      return 999 as unknown as ReturnType<typeof setInterval>;
    });

    render(<ProjectContextStep projectId="p1" />);
    fireEvent.change(screen.getByLabelText("Décris ton projet en quelques phrases"), {
      target: { value: "Mon projet." },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Générer" }));
    });

    // Manually trigger the poll callback
    await act(async () => {
      if (captured) await captured();
    });

    await waitFor(() =>
      expect(screen.getByText("Fichier de contexte généré avec succès")).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Aller au tableau de bord" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /passer cette étape/i })).toBeInTheDocument();
  });

  it("shows error and Réessayer button when status is failed", async () => {
    vi.spyOn(apiClient, "createProjectContext").mockResolvedValue(undefined);
    vi.spyOn(apiClient, "getProjectContextStatus").mockResolvedValue({ status: "failed" });

    let captured: (() => Promise<void>) | null = null;
    vi.mocked(global.setInterval).mockImplementation((fn: TimerHandler) => {
      captured = fn as () => Promise<void>;
      return 999 as unknown as ReturnType<typeof setInterval>;
    });

    render(<ProjectContextStep projectId="p1" />);
    fireEvent.change(screen.getByLabelText("Décris ton projet en quelques phrases"), {
      target: { value: "Mon projet." },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Générer" }));
    });

    await act(async () => {
      if (captured) await captured();
    });

    await waitFor(() =>
      expect(screen.getByText(/La génération du fichier de contexte a échoué/)).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /passer cette étape/i })).toBeInTheDocument();
  });

  it("Réessayer re-shows the form with the same brief text", async () => {
    vi.spyOn(apiClient, "createProjectContext").mockResolvedValue(undefined);
    vi.spyOn(apiClient, "getProjectContextStatus").mockResolvedValue({ status: "failed" });

    let captured: (() => Promise<void>) | null = null;
    vi.mocked(global.setInterval).mockImplementation((fn: TimerHandler) => {
      captured = fn as () => Promise<void>;
      return 999 as unknown as ReturnType<typeof setInterval>;
    });

    render(<ProjectContextStep projectId="p1" />);
    fireEvent.change(screen.getByLabelText("Décris ton projet en quelques phrases"), {
      target: { value: "Mon projet." },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Générer" }));
    });

    await act(async () => {
      if (captured) await captured();
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

    const ta = screen.getByLabelText("Décris ton projet en quelques phrases") as HTMLTextAreaElement;
    expect(ta.value).toBe("Mon projet.");
  });

  it("Passer cette étape redirects to /dashboard from the done phase", async () => {
    vi.spyOn(apiClient, "createProjectContext").mockResolvedValue(undefined);
    vi.spyOn(apiClient, "getProjectContextStatus").mockResolvedValue({ status: "done" });

    let captured: (() => Promise<void>) | null = null;
    vi.mocked(global.setInterval).mockImplementation((fn: TimerHandler) => {
      captured = fn as () => Promise<void>;
      return 999 as unknown as ReturnType<typeof setInterval>;
    });

    render(<ProjectContextStep projectId="p1" />);
    fireEvent.change(screen.getByLabelText("Décris ton projet en quelques phrases"), {
      target: { value: "Mon projet." },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Générer" }));
    });

    await act(async () => {
      if (captured) await captured();
    });

    await waitFor(() =>
      expect(screen.getByText("Fichier de contexte généré avec succès")).toBeInTheDocument()
    );

    fireEvent.click(screen.getAllByRole("button", { name: /passer cette étape/i })[0]);
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });
});
