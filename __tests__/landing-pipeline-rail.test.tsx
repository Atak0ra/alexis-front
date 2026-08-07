import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import LandingPipelineRail, { PIPELINE_STAGES } from "@/components/landing-pipeline-rail";

describe("LandingPipelineRail — static structure", () => {
  it("uses the 7 real Kanban column labels, in order", () => {
    expect(PIPELINE_STAGES.map((s) => s.label)).toEqual([
      "Backlog", "Todo", "Spec", "Plan", "Dev", "To Merge", "Done",
    ]);
  });

  it("renders every stage label at least once", () => {
    render(<LandingPipelineRail />);
    for (const stage of PIPELINE_STAGES) {
      expect(screen.getAllByText(stage.label).length).toBeGreaterThan(0);
    }
  });

  it("renders the mechanism copy for each stage", () => {
    render(<LandingPipelineRail />);
    expect(screen.getByText(/rédige une spécification fonctionnelle/)).toBeInTheDocument();
    expect(screen.getByText(/écrit le code, exécute les tests/)).toBeInTheDocument();
    expect(screen.getByText(/rebase et merge sur ta branche de base/i)).toBeInTheDocument();
  });

  it("shows the human-validation gate only on Spec, Plan, Dev, To Merge", () => {
    render(<LandingPipelineRail />);
    expect(screen.getAllByText("Vous validez avant la suite")).toHaveLength(4);
  });

  it("gives every stage content block a stable test id for scroll-spy targeting", () => {
    render(<LandingPipelineRail />);
    expect(screen.getByTestId("stage-block-backlog")).toBeInTheDocument();
    expect(screen.getByTestId("stage-block-dev")).toBeInTheDocument();
    expect(screen.getByTestId("stage-block-done")).toBeInTheDocument();
  });
});

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
  takeRecords = () => [];
  root = null;
  rootMargin = "";
  thresholds: ReadonlyArray<number> = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
}

describe("LandingPipelineRail — scroll-spy", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver as unknown as typeof IntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("highlights the rail node matching the stage block currently intersecting", () => {
    render(<LandingPipelineRail />);

    const devBlock = screen.getByTestId("stage-block-dev");
    const observerInstance = MockIntersectionObserver.instances.at(-1)!;

    act(() => {
      observerInstance.callback(
        [{ isIntersecting: true, target: devBlock } as IntersectionObserverEntry],
        observerInstance as unknown as IntersectionObserver
      );
    });

    expect(screen.getByTestId("rail-node-dev").className).toContain("border-brand");
    expect(screen.getByTestId("rail-node-spec").className).toContain("border-success");
    expect(screen.getByTestId("rail-node-done").className).toContain("border-border");
  });
});
