import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChoicePage from "@/app/projects/new/choice/page";
import { NewProjectProvider } from "@/lib/new-project-context";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => "/projects/new/choice",
}));

beforeEach(() => {
  pushMock.mockClear();
});

function renderChoicePage() {
  return render(
    <NewProjectProvider>
      <ChoicePage />
    </NewProjectProvider>
  );
}

describe("ChoicePage (step 1 — repo origin)", () => {
  it("renders the page heading and both choices", () => {
    renderChoicePage();
    expect(screen.getByRole("heading", { name: /ton dépôt de code/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /j'ai déjà un dépôt/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /je n'ai pas de dépôt/i })).toBeInTheDocument();
  });

  it("choosing 'J'ai déjà un dépôt' sets hosted=false and navigates to /projects/new/repo", async () => {
    const { useNewProject } = await import("@/lib/new-project-context");
    let captured: ReturnType<typeof useNewProject> | null = null;

    function Probe() {
      captured = useNewProject();
      return <ChoicePage />;
    }
    const { NewProjectProvider: Provider } = await import("@/lib/new-project-context");
    render(
      <Provider>
        <Probe />
      </Provider>
    );

    fireEvent.click(screen.getByRole("button", { name: /j'ai déjà un dépôt/i }));

    expect(pushMock).toHaveBeenCalledWith("/projects/new/repo");
    expect(captured?.hosted).toBe(false);
  });

  it("choosing 'Je n'ai pas de dépôt' sets hosted=true and navigates to /projects/new/repo", async () => {
    const { useNewProject, NewProjectProvider: Provider } = await import("@/lib/new-project-context");
    let captured: ReturnType<typeof useNewProject> | null = null;

    function Probe() {
      captured = useNewProject();
      return <ChoicePage />;
    }
    render(
      <Provider>
        <Probe />
      </Provider>
    );

    fireEvent.click(screen.getByRole("button", { name: /je n'ai pas de dépôt/i }));

    expect(pushMock).toHaveBeenCalledWith("/projects/new/repo");
    expect(captured?.hosted).toBe(true);
  });
});
