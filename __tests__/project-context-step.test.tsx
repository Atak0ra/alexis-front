import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ProjectContextStep from "@/components/project-context-step";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

const EMPTY_RESULT: apiClient.RepoSummaryResult = { has_code: false, file_count: 0, languages: [] };
const CODE_RESULT: apiClient.RepoSummaryResult = { has_code: true, file_count: 42, languages: ["TypeScript", "Python"] };
const DRAFT_CONTENT = "# Contexte projet\n\n## Stack technique\nPython, FastAPI\n";

// Render helper — always passes _pollIntervalMs=0 so setInterval fires immediately
function renderStep(props: Partial<React.ComponentProps<typeof ProjectContextStep>> = {}) {
  return render(<ProjectContextStep projectId="p1" _pollIntervalMs={0} {...props} />);
}

beforeEach(() => {
  vi.restoreAllMocks();
  pushMock.mockClear();
  vi.spyOn(session, "getApiKey").mockReturnValue("alx_xxx");
  vi.spyOn(apiClient, "enqueueRepoSummary").mockResolvedValue({ job_id: "test-job-id" });
  vi.spyOn(apiClient, "getRepoSummaryStatus").mockResolvedValue({
    status: "done",
    result: EMPTY_RESULT,
  });
});

// The component checks GET /context/status on mount to resume an in-flight
// job across a refresh. This is "nothing to resume" — chain it before a
// test's own mockResolvedValue(...) (which governs the *polling* phase,
// after submit) so the resume check doesn't short-circuit straight to a
// terminal phase before the form ever renders.
const NOTHING_TO_RESUME: apiClient.ProjectContextStatus = { status: null, error: null, phase: null };

afterEach(() => {
  vi.restoreAllMocks();
});

/** Wait for the detecting phase to resolve and the form to appear */
async function waitForForm() {
  await waitFor(() =>
    expect(screen.getByLabelText("Décris ton projet en quelques phrases")).toBeInTheDocument(),
    { timeout: 3000 }
  );
}

/** Submit the brief, wait until the form is gone (polling or review phase started) */
async function submitBrief(brief = "Mon projet FastAPI.") {
  vi.spyOn(apiClient, "createProjectContext").mockResolvedValue(undefined);
  await waitForForm();
  fireEvent.change(screen.getByLabelText("Décris ton projet en quelques phrases"), {
    target: { value: brief },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Générer" }));
  });
  // With _pollIntervalMs=0 the component may skip straight past "polling" to the
  // next phase before we can observe it — just wait until the form disappears.
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Générer" })).not.toBeInTheDocument(),
    { timeout: 3000 }
  );
}

describe("ProjectContextStep", () => {
  // ── FORM phase ──────────────────────────────────────────────────────────────

  it("shows the form with textarea and Générer button (empty repo)", async () => {
    renderStep();
    await waitForForm();
    expect(screen.getByLabelText("Décris ton projet en quelques phrases")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Générer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /passer cette étape/i })).toBeInTheDocument();
  });

  it("shows adapted label and button for repo with code", async () => {
    vi.spyOn(apiClient, "getRepoSummaryStatus").mockResolvedValue({
      status: "done",
      result: CODE_RESULT,
    });
    renderStep();
    await waitFor(() =>
      expect(screen.getByLabelText("Contexte supplémentaire (optionnel)")).toBeInTheDocument(),
      { timeout: 3000 }
    );
    expect(screen.getByRole("button", { name: "Générer depuis le code" })).toBeInTheDocument();
    expect(screen.getByText(/42 fichiers/)).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
  });

  it("Passer cette étape redirects to /dashboard from the form phase", async () => {
    renderStep();
    await waitForForm();
    fireEvent.click(screen.getByRole("button", { name: /passer cette étape/i }));
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("calls onSkip callback instead of router.push when provided", async () => {
    const onSkip = vi.fn();
    renderStep({ onSkip });
    await waitForForm();
    fireEvent.click(screen.getByRole("button", { name: /passer cette étape/i }));
    expect(onSkip).toHaveBeenCalledOnce();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("falls back to form if repo-summary job fails", async () => {
    vi.spyOn(apiClient, "getRepoSummaryStatus").mockResolvedValue({ status: "failed", error: "clone_failed" });
    renderStep();
    await waitForForm();
    expect(screen.getByRole("button", { name: "Générer" })).toBeInTheDocument();
  });

  // ── POLLING phase ────────────────────────────────────────────────────────────

  it("submits brief and enters polling phase", async () => {
    vi.spyOn(apiClient, "createProjectContext").mockResolvedValue(undefined);
    renderStep();
    await submitBrief();
    expect(screen.getByText("Génération en cours…")).toBeInTheDocument();
    expect(screen.getByText(/Vous pourrez relire et modifier avant de valider/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /passer cette étape/i })).toBeInTheDocument();
  });

  it("Passer cette étape redirects to /dashboard during polling", async () => {
    vi.spyOn(apiClient, "createProjectContext").mockResolvedValue(undefined);
    renderStep();
    await submitBrief();
    fireEvent.click(screen.getByRole("button", { name: /passer cette étape/i }));
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  // ── REVIEW phase (draft_ready) ───────────────────────────────────────────────

  it("shows review phase with draft content when status becomes draft_ready", async () => {
    vi.spyOn(apiClient, "getProjectContextStatus")
      .mockResolvedValueOnce(NOTHING_TO_RESUME)
      .mockResolvedValue({ status: "draft_ready" });
    vi.spyOn(apiClient, "getProjectContextDraft").mockResolvedValue({ content: DRAFT_CONTENT });

    renderStep();
    await submitBrief();

    await waitFor(() =>
      expect(screen.getByText("Relire et valider")).toBeInTheDocument(),
      { timeout: 3000 }
    );
    const draftTextarea = screen.getByLabelText(/Contenu de/) as HTMLTextAreaElement;
    expect(draftTextarea.value).toBe(DRAFT_CONTENT);
    expect(screen.getByRole("button", { name: "Valider et committer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Régénérer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /passer cette étape/i })).toBeInTheDocument();
  });

  it("allows editing the draft content before committing", async () => {
    vi.spyOn(apiClient, "getProjectContextStatus")
      .mockResolvedValueOnce(NOTHING_TO_RESUME)
      .mockResolvedValue({ status: "draft_ready" });
    vi.spyOn(apiClient, "getProjectContextDraft").mockResolvedValue({ content: DRAFT_CONTENT });

    renderStep();
    await submitBrief();

    await waitFor(() => expect(screen.getByText("Relire et valider")).toBeInTheDocument(), { timeout: 3000 });

    const draftTextarea = screen.getByLabelText(/Contenu de/) as HTMLTextAreaElement;
    fireEvent.change(draftTextarea, { target: { value: "# Modifié\n" } });
    expect(draftTextarea.value).toBe("# Modifié\n");
  });

  it("Régénérer returns to form phase", async () => {
    vi.spyOn(apiClient, "getProjectContextStatus")
      .mockResolvedValueOnce(NOTHING_TO_RESUME)
      .mockResolvedValue({ status: "draft_ready" });
    vi.spyOn(apiClient, "getProjectContextDraft").mockResolvedValue({ content: DRAFT_CONTENT });

    renderStep();
    await submitBrief();

    await waitFor(() => expect(screen.getByText("Relire et valider")).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByRole("button", { name: "Régénérer" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Décris ton projet en quelques phrases")).toBeInTheDocument()
    );
  });

  it("Passer cette étape redirects to /dashboard from review phase", async () => {
    vi.spyOn(apiClient, "getProjectContextStatus")
      .mockResolvedValueOnce(NOTHING_TO_RESUME)
      .mockResolvedValue({ status: "draft_ready" });
    vi.spyOn(apiClient, "getProjectContextDraft").mockResolvedValue({ content: DRAFT_CONTENT });

    renderStep();
    await submitBrief();

    await waitFor(() => expect(screen.getByText("Relire et valider")).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByRole("button", { name: /passer cette étape/i }));
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  // ── COMMITTING phase ─────────────────────────────────────────────────────────

  it("clicking Valider et committer enters committing phase", async () => {
    vi.spyOn(apiClient, "getProjectContextStatus")
      .mockResolvedValueOnce(NOTHING_TO_RESUME)
      .mockResolvedValue({ status: "draft_ready" });
    vi.spyOn(apiClient, "getProjectContextDraft").mockResolvedValue({ content: DRAFT_CONTENT });
    vi.spyOn(apiClient, "commitProjectContext").mockResolvedValue(undefined);

    renderStep();
    await submitBrief();

    await waitFor(() => expect(screen.getByText("Relire et valider")).toBeInTheDocument(), { timeout: 3000 });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Valider et committer" }));
    });

    await waitFor(() =>
      expect(screen.getByText("Commit en cours…")).toBeInTheDocument(),
      { timeout: 3000 }
    );
    expect(apiClient.commitProjectContext).toHaveBeenCalledWith("alx_xxx", "p1", DRAFT_CONTENT);
  });

  // ── DONE phase ───────────────────────────────────────────────────────────────

  it("shows done confirmation when commit status becomes done", async () => {
    vi.spyOn(apiClient, "commitProjectContext").mockResolvedValue(undefined);
    vi.spyOn(apiClient, "getProjectContextDraft").mockResolvedValue({ content: DRAFT_CONTENT });
    vi.spyOn(apiClient, "getProjectContextStatus")
      .mockResolvedValueOnce(NOTHING_TO_RESUME)
      .mockResolvedValueOnce({ status: "draft_ready" })
      .mockResolvedValue({ status: "done" });

    renderStep();
    await submitBrief();

    await waitFor(() => expect(screen.getByText("Relire et valider")).toBeInTheDocument(), { timeout: 3000 });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Valider et committer" }));
    });

    await waitFor(() =>
      expect(screen.getByText("Contexte committé ✓")).toBeInTheDocument(),
      { timeout: 3000 }
    );
    expect(screen.getByText("Fichier de contexte committé avec succès")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aller au tableau de bord" })).toBeInTheDocument();
  });

  it("calls onDone callback instead of router.push when provided", async () => {
    vi.spyOn(apiClient, "commitProjectContext").mockResolvedValue(undefined);
    vi.spyOn(apiClient, "getProjectContextDraft").mockResolvedValue({ content: DRAFT_CONTENT });
    vi.spyOn(apiClient, "getProjectContextStatus")
      .mockResolvedValueOnce(NOTHING_TO_RESUME)
      .mockResolvedValueOnce({ status: "draft_ready" })
      .mockResolvedValue({ status: "done" });
    const onDone = vi.fn();

    renderStep({ onDone });
    await submitBrief();

    await waitFor(() => expect(screen.getByText("Relire et valider")).toBeInTheDocument(), { timeout: 3000 });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Valider et committer" }));
    });

    await waitFor(() => expect(screen.getByText("Contexte committé ✓")).toBeInTheDocument(), { timeout: 3000 });

    expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onDone).toHaveBeenCalledOnce();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("Passer cette étape redirects to /dashboard from the done phase", async () => {
    vi.spyOn(apiClient, "commitProjectContext").mockResolvedValue(undefined);
    vi.spyOn(apiClient, "getProjectContextDraft").mockResolvedValue({ content: DRAFT_CONTENT });
    vi.spyOn(apiClient, "getProjectContextStatus")
      .mockResolvedValueOnce(NOTHING_TO_RESUME)
      .mockResolvedValueOnce({ status: "draft_ready" })
      .mockResolvedValue({ status: "done" });

    renderStep();
    await submitBrief();

    await waitFor(() => expect(screen.getByText("Relire et valider")).toBeInTheDocument(), { timeout: 3000 });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Valider et committer" }));
    });

    await waitFor(() => expect(screen.getByText("Contexte committé ✓")).toBeInTheDocument(), { timeout: 3000 });

    fireEvent.click(screen.getAllByRole("button", { name: /passer cette étape/i })[0]);
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  // ── FAILED phase ─────────────────────────────────────────────────────────────

  it("shows error and Réessayer button when generation status is failed", async () => {
    vi.spyOn(apiClient, "getProjectContextStatus")
      .mockResolvedValueOnce(NOTHING_TO_RESUME)
      .mockResolvedValue({ status: "failed" });

    renderStep();
    await submitBrief();

    await waitFor(() =>
      expect(screen.getByText(/La génération du fichier de contexte a échoué/)).toBeInTheDocument(),
      { timeout: 3000 }
    );
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /passer cette étape/i })).toBeInTheDocument();
  });

  it("shows the phase checklist with the current phase highlighted while generation is in progress", async () => {
    vi.spyOn(apiClient, "getProjectContextStatus")
      .mockResolvedValueOnce(NOTHING_TO_RESUME)
      .mockResolvedValue({ status: "in_progress", phase: "running_agent" });

    renderStep();
    await submitBrief();

    await waitFor(() =>
      expect(screen.getByText(/Exécution de l'agent/)).toBeInTheDocument(),
      { timeout: 3000 }
    );
    expect(screen.getByText("Clonage du dépôt")).toBeInTheDocument();
    expect(screen.getByText("Lecture du résultat")).toBeInTheDocument();
  });

  it("shows the real backend error detail when provided instead of the generic message", async () => {
    vi.spyOn(apiClient, "getProjectContextStatus")
      .mockResolvedValueOnce(NOTHING_TO_RESUME)
      .mockResolvedValue({
        status: "failed",
        error: "litellm.RateLimitError: You exceeded your current quota",
      });

    renderStep();
    await submitBrief();

    await waitFor(
      () =>
        expect(
          screen.getByText(/litellm\.RateLimitError: You exceeded your current quota/)
        ).toBeInTheDocument(),
      { timeout: 3000 }
    );
  });

  it("Réessayer re-shows the form with the same brief text", async () => {
    vi.spyOn(apiClient, "getProjectContextStatus")
      .mockResolvedValueOnce(NOTHING_TO_RESUME)
      .mockResolvedValue({ status: "failed" });

    renderStep();
    await submitBrief("Mon projet.");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument(),
      { timeout: 3000 }
    );

    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

    const ta = screen.getByLabelText("Décris ton projet en quelques phrases") as HTMLTextAreaElement;
    expect(ta.value).toBe("Mon projet.");
  });

  // ── Resuming a job across a refresh ───────────────────────────────────────────
  // A refresh remounts the component from scratch — without checking the
  // backend's real status first, it would always restart the repo-detection
  // flow, no matter how far a previous attempt had gotten.

  describe("resuming an in-flight job on mount", () => {
    it("jumps straight to the polling phase when a generation is already in_progress, skipping repo detection", async () => {
      vi.spyOn(apiClient, "getProjectContextStatus").mockResolvedValue({
        status: "in_progress",
        phase: "cloning",
      });
      const enqueueSpy = vi.spyOn(apiClient, "enqueueRepoSummary");

      renderStep();

      await waitFor(() =>
        expect(screen.getByText("Génération en cours…")).toBeInTheDocument(),
        { timeout: 3000 }
      );
      expect(screen.queryByLabelText("Décris ton projet en quelques phrases")).not.toBeInTheDocument();
      expect(enqueueSpy).not.toHaveBeenCalled();
    });

    it("jumps straight to the committing phase when a commit is already in_progress", async () => {
      vi.spyOn(apiClient, "getProjectContextStatus").mockResolvedValue({
        status: "in_progress",
        phase: "committing",
      });

      renderStep();

      await waitFor(() =>
        expect(screen.getByText("Commit en cours…")).toBeInTheDocument(),
        { timeout: 3000 }
      );
    });

    it("jumps straight to the review phase with the draft when status is already draft_ready", async () => {
      vi.spyOn(apiClient, "getProjectContextStatus").mockResolvedValue({ status: "draft_ready" });
      vi.spyOn(apiClient, "getProjectContextDraft").mockResolvedValue({ content: DRAFT_CONTENT });

      renderStep();

      await waitFor(() =>
        expect(screen.getByText("Relire et valider")).toBeInTheDocument(),
        { timeout: 3000 }
      );
      const draftTextarea = screen.getByLabelText(/Contenu de/) as HTMLTextAreaElement;
      expect(draftTextarea.value).toBe(DRAFT_CONTENT);
    });

    it("shows the previous failure directly when status is already failed, without re-detecting the repo", async () => {
      vi.spyOn(apiClient, "getProjectContextStatus").mockResolvedValue({
        status: "failed",
        error: "litellm.RateLimitError: You exceeded your current quota",
      });
      const enqueueSpy = vi.spyOn(apiClient, "enqueueRepoSummary");

      renderStep();

      await waitFor(() =>
        expect(
          screen.getByText(/La génération précédente a échoué : litellm\.RateLimitError/)
        ).toBeInTheDocument(),
        { timeout: 3000 }
      );
      expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
      expect(enqueueSpy).not.toHaveBeenCalled();
    });

    it("falls back to normal repo detection when there is nothing to resume", async () => {
      vi.spyOn(apiClient, "getProjectContextStatus").mockResolvedValue({ status: null });
      const enqueueSpy = vi.spyOn(apiClient, "enqueueRepoSummary").mockResolvedValue({ job_id: "test-job-id" });

      renderStep();
      await waitForForm();

      expect(enqueueSpy).toHaveBeenCalled();
    });
  });
});
