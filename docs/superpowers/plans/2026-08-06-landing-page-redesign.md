# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `app/page.tsx` (alexis-front) so the landing page shows a ticket's real journey through Alexis's 7 Kanban stages (a sticky rail, scroll-spy highlighted) instead of the generic badge/gradient hero + numbered pipeline + icon grid it has today.

**Architecture:** New standalone client component `components/landing-pipeline-rail.tsx` owns the pipeline data and the rail+content layout (desktop sticky rail with `IntersectionObserver` scroll-spy, mobile horizontal stepper per block). `app/page.tsx` is trimmed: hero loses its badge/gradient/fake-screenshot, gains a one-line ticket ticker; the old "Comment ça marche" + value-props sections are replaced by one section mounting the new rail component.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind, Vitest + Testing Library (existing project stack, no new dependencies).

## Global Constraints

- Reuse existing design tokens only — `brand`/`brand-hover`/`brand-light`, `surface*`, `success`/`warning`/`danger`, `font-display`/`font-sans`/`font-mono`. No new colors, no new typefaces, no new icon library.
- Hero (badge slot removed, H1, subtitle, CTAs, social-proof line) speaks in **idée**/**projet** terms only — never "ticket". H1 and subtitle text are unchanged verbatim: `Une idée. Un projet livré.` / `Décrivez ce qu'il faut faire. Alexis structure le travail, l'exécute, teste le résultat, et le livre, avec ou sans relecture avant mise en ligne, selon vos réglages.`
- "Ticket" vocabulary becomes legitimate starting at the pipeline section, where the sentence `Chaque projet est découpé en tickets.` must appear (word-for-word, established 2026-07-25).
- Copy tone: zero "automatique"/"automatisé"/"magique"/"révolutionnaire", zero rhetorical-question CTA, mechanism-first phrasing.
- CTA banner text stays exactly as-is: `Créez votre premier projet` / `Avec ou sans dépôt existant, votre projet est prêt en quelques minutes.` — not touched by this plan.
- Rail stage labels must match `components/ticket-kanban.tsx` `COLUMNS` exactly, same order: Backlog, Todo, Spec, Plan, Dev, To Merge, Done.
- No dark mode work — app is light-only today, this plan doesn't change that.
- `components/landing-nav.tsx`, `app/pricing/page.tsx`, the footer in `app/page.tsx`, and all login/signup flows are out of scope — do not modify them.

---

### Task 1: `LandingPipelineRail` — static structure, data, gate chips, mobile stepper

**Files:**
- Create: `components/landing-pipeline-rail.tsx`
- Test: `__tests__/landing-pipeline-rail.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils` (existing helper, already used by `components/ticket-kanban.tsx`).
- Produces: `export interface PipelineStage { key: string; label: string; body: string; gate: boolean }`, `export const PIPELINE_STAGES: PipelineStage[]` (7 entries), `export default function LandingPipelineRail(props: { stages?: PipelineStage[] }): JSX.Element`. Task 3/4 import `LandingPipelineRail` (default) with no props (uses the built-in `PIPELINE_STAGES`).

- [ ] **Step 1: Write the failing test**

Create `__tests__/landing-pipeline-rail.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/landing-pipeline-rail.test.tsx`
Expected: FAIL — `Cannot find module '@/components/landing-pipeline-rail'`

- [ ] **Step 3: Write the component**

Create `components/landing-pipeline-rail.tsx`:

```tsx
"use client";

/**
 * LandingPipelineRail — timeline verticale reprenant les 7 colonnes réelles
 * du Kanban produit (components/ticket-kanban.tsx COLUMNS), utilisée sur la
 * landing publique pour montrer le trajet d'un ticket plutôt que de le
 * décrire dans une grille générique.
 *
 * Desktop (lg+) : rail sticky à gauche, nœud actif suivi par scroll-spy
 * (IntersectionObserver, cf. Task 2). Mobile : rail devient un stepper
 * horizontal statique au-dessus de chaque bloc, pas de sticky.
 */

import { cn } from "@/lib/utils";

export interface PipelineStage {
  key: string;
  label: string;
  body: string;
  gate: boolean;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    key: "backlog",
    label: "Backlog",
    body: "Le ticket est décrit, prêt à être pris en charge. Branché sur ton dépôt GitHub/GitLab existant — ou un dépôt hébergé si tu n'en as pas encore.",
    gate: false,
  },
  {
    key: "todo",
    label: "Todo",
    body: "Le ticket est repris et passe en file d'exécution.",
    gate: false,
  },
  {
    key: "spec",
    label: "Spec",
    body: "Alexis rédige une spécification fonctionnelle détaillée pour ce ticket.",
    gate: true,
  },
  {
    key: "plan",
    label: "Plan",
    body: "Alexis découpe le travail en étapes techniques concrètes.",
    gate: true,
  },
  {
    key: "dev",
    label: "Dev",
    body: "Alexis écrit le code, exécute les tests, itère jusqu'à ce que tout passe. Coût affiché en fin de run — ex. 0,42 € ce ticket.",
    gate: true,
  },
  {
    key: "to_merge",
    label: "To Merge",
    body: "Rebase et merge sur ta branche de base, historique linéaire, sans commit de merge parasite.",
    gate: true,
  },
  {
    key: "done",
    label: "Done",
    body: "Livré. Coût total et durée du ticket restent consultables depuis le tableau de bord.",
    gate: false,
  },
];

const GATE_LABEL = "Vous validez avant la suite";

export default function LandingPipelineRail({
  stages = PIPELINE_STAGES,
}: {
  stages?: PipelineStage[];
}) {
  // Static for now — Task 2 wires this to real scroll position via
  // IntersectionObserver. Backlog (index 0) is the sensible default: it's
  // what's in view when the page loads scrolled to the top of this section.
  const activeIndex = 0;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">
      {/* Rail — desktop only */}
      <ol className="hidden lg:sticky lg:top-24 lg:block lg:h-fit">
        {stages.map((stage, i) => (
          <li key={stage.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                data-testid={`rail-node-${stage.key}`}
                aria-hidden="true"
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full border-2",
                  i === activeIndex
                    ? "border-brand bg-brand"
                    : i < activeIndex
                    ? "border-success bg-success"
                    : "border-border bg-surface"
                )}
              />
              {i < stages.length - 1 && <span className="w-px flex-1 bg-border" />}
            </div>
            <span
              className={cn(
                "pb-8 text-sm font-medium",
                i === activeIndex ? "text-foreground" : "text-foreground-muted"
              )}
            >
              {stage.label}
            </span>
          </li>
        ))}
      </ol>

      {/* Content blocks */}
      <div className="flex flex-col gap-16">
        {stages.map((stage, i) => (
          <div key={stage.key} data-testid={`stage-block-${stage.key}`}>
            {/* Stepper — mobile only */}
            <div className="mb-3 flex flex-wrap gap-x-1.5 gap-y-1 lg:hidden" aria-hidden="true">
              {stages.map((s, j) => (
                <span
                  key={s.key}
                  className={cn(
                    "text-xs font-semibold",
                    j === i ? "text-brand" : "text-foreground-subtle"
                  )}
                >
                  {s.label}
                  {j < stages.length - 1 && <span className="text-foreground-subtle"> · </span>}
                </span>
              ))}
            </div>

            <h3 className="text-lg font-bold text-foreground">{stage.label}</h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-muted">
              {stage.body}
            </p>
            {stage.gate && (
              <span className="mt-3 inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground-muted">
                {GATE_LABEL}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/landing-pipeline-rail.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit --pretty false`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add components/landing-pipeline-rail.tsx __tests__/landing-pipeline-rail.test.tsx
git commit -m "feat(landing): add LandingPipelineRail with the 7 real Kanban stages"
```

---

### Task 2: `LandingPipelineRail` — scroll-spy behavior

**Files:**
- Modify: `components/landing-pipeline-rail.tsx` (replace the static `activeIndex` with real scroll-driven state)
- Test: `__tests__/landing-pipeline-rail.test.tsx` (append)

**Interfaces:**
- Consumes: `MockIntersectionObserver` test double defined in this task's test file only.
- Produces: no change to the component's public props/exports — `activeIndex` becomes internal `useState`, `blockRefs` becomes an internal `useRef`, both private to the component.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/landing-pipeline-rail.test.tsx` (after the existing `describe` block):

```tsx
import { act } from "@testing-library/react";

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
```

Also update the file's top import line to pull in `vi`, `beforeEach`, `afterEach`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/landing-pipeline-rail.test.tsx`
Expected: FAIL — Task 1's component never constructs an `IntersectionObserver`, so `MockIntersectionObserver.instances.at(-1)` is `undefined` and `.callback` throws `Cannot read properties of undefined (reading 'callback')`.

- [ ] **Step 3: Wire scroll-spy into the component**

In `components/landing-pipeline-rail.tsx`, add the React imports:

```tsx
import { useEffect, useRef, useState } from "react";
```

Replace the static `activeIndex` line:

```tsx
  // Static for now — Task 2 wires this to real scroll position via
  // IntersectionObserver. Backlog (index 0) is the sensible default: it's
  // what's in view when the page loads scrolled to the top of this section.
  const activeIndex = 0;
```

with:

```tsx
  const [activeIndex, setActiveIndex] = useState(0);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = blockRefs.current.findIndex((el) => el === entry.target);
          if (idx !== -1) setActiveIndex(idx);
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );

    blockRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [stages]);
```

Replace the content-block `div` opening tag:

```tsx
          <div key={stage.key} data-testid={`stage-block-${stage.key}`}>
```

with:

```tsx
          <div
            key={stage.key}
            data-testid={`stage-block-${stage.key}`}
            ref={(el) => {
              blockRefs.current[i] = el;
            }}
          >
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/landing-pipeline-rail.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add __tests__/landing-pipeline-rail.test.tsx
git commit -m "test(landing): cover LandingPipelineRail scroll-spy highlighting"
```

---

### Task 3: Hero rewrite — remove badge/gradient/fake screenshot, add ticket ticker

**Files:**
- Modify: `app/page.tsx:99-153` (delete `LivePipelinePreview` function), `app/page.tsx:157-223` (hero section)
- Test: `__tests__/root-page.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — pure JSX edit, no new exports.

- [ ] **Step 1: Write the failing test**

Replace `__tests__/root-page.test.tsx` entirely with:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RootPage from "@/app/page";

describe("RootPage", () => {
  it("shows the product wordmark and pitch", () => {
    render(<RootPage />);
    expect(screen.getAllByText("Alexis").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /un projet livré/i })).toBeInTheDocument();
  });

  it("removes the generic audience badge from the hero", () => {
    render(<RootPage />);
    expect(
      screen.queryByText(/agent de développement, pour solopreneurs et agences/i)
    ).not.toBeInTheDocument();
  });

  it("shows a static ticket ticker instead of the fake dashboard screenshot", () => {
    render(<RootPage />);
    expect(screen.getByText("KARA-142 · Spec Review")).toBeInTheDocument();
    // The fake browser-chrome preview (KPI row) is gone.
    expect(screen.queryByText("Résolus")).not.toBeInTheDocument();
  });

  it("links Connexion to /login and CTA links to /login?mode=signup", () => {
    render(<RootPage />);
    expect(screen.getByRole("link", { name: "Connexion" })).toHaveAttribute("href", "/login");

    const signupLinks = screen.getAllByRole("link", { name: /commencer gratuitement|créer un compte gratuit/i });
    expect(signupLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of signupLinks) {
      expect(link).toHaveAttribute("href", "/login?mode=signup");
    }
  });
});
```

(This intentionally drops the old `root-page.test.tsx` assertions about pipeline stages and value-props — those move to Task 4's version of this file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/root-page.test.tsx`
Expected: FAIL — badge text still present, ticker text absent, "Résolus" (KPI row) still present.

- [ ] **Step 3: Rewrite the hero in `app/page.tsx`**

Delete the `LivePipelinePreview` function (current lines 99-153, from `// ─── Live pipeline preview ───` through the closing `}` of the function).

Replace the `{/* ── Hero ── */}` section (current lines 163-223) with:

```tsx
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-6 pb-24 pt-20 text-center">
          {/* Headline */}
          <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
            Une idée.{" "}
            <span className="text-brand">Un projet livré.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-foreground-muted">
            Décrivez ce qu'il faut faire. Alexis structure le travail, l'exécute,
            teste le résultat, et le livre, avec ou sans relecture avant mise en
            ligne, selon vos réglages.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login?mode=signup"
              className={cn(buttonVariants("primary"), "px-6 py-3 text-base shadow-md")}
            >
              Créer un compte gratuit
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants("secondary"), "px-6 py-3 text-base")}
            >
              Se connecter
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-6 text-xs text-foreground-subtle">
            Aucune carte bancaire requise · Démarrez en 5 minutes
          </p>

          {/* Ticket ticker — un vrai identifiant + état, format des notifs produit */}
          <div className="mt-12 inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2 font-mono text-xs text-foreground-muted">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
            KARA-142 · Spec Review
          </div>
        </div>
      </section>
```

Note: the radial-gradient background `<div>` and the audience badge `<div>` are both deleted, not just restyled — they don't appear anywhere in the replacement above.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/root-page.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit --pretty false`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx __tests__/root-page.test.tsx
git commit -m "redesign(landing): strip hero badge/gradient/fake-screenshot, add ticket ticker"
```

---

### Task 4: Replace "Comment ça marche" + value-props with the pipeline rail section

**Files:**
- Modify: `app/page.tsx` (delete `PIPELINE_STAGES`/`VALUE_PROPS` consts and the two sections that render them; add one new section mounting `LandingPipelineRail`). Line numbers below are from the file as it stands after Task 3 — Task 3 already changed line offsets from the pre-plan original, so search by the `{/* ── ... ── */}` comment markers quoted below rather than trusting absolute numbers if they've drifted further.
- Test: `__tests__/root-page.test.tsx` (append)

**Interfaces:**
- Consumes: `LandingPipelineRail` (default export) and `PIPELINE_STAGES` from `@/components/landing-pipeline-rail` (Task 1).
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/root-page.test.tsx`, inside the existing `describe("RootPage", ...)` block:

```tsx
  it("shows the pipeline section with all 7 real stages and the human-validation gate", () => {
    render(<RootPage />);
    expect(screen.getByRole("heading", { name: /de l'idée au projet livré, en 7 étapes/i })).toBeInTheDocument();
    expect(screen.getByText(/chaque projet est découpé en tickets/i)).toBeInTheDocument();
    for (const label of ["Backlog", "Todo", "Spec", "Plan", "Dev", "To Merge", "Done"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("Vous validez avant la suite")).toHaveLength(4);
  });

  it("removes the old generic value-props grid", () => {
    render(<RootPage />);
    expect(screen.queryByText("Zéro configuration manuelle")).not.toBeInTheDocument();
    expect(screen.queryByText("Ticket → code testé → livré")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/root-page.test.tsx`
Expected: FAIL — the new heading text doesn't exist yet (old sections still render the old headings/grid).

- [ ] **Step 3: Replace the sections in `app/page.tsx`**

Delete the `PIPELINE_STAGES` const and the `VALUE_PROPS` const entirely (near the top of the file, above the `KpiStrip` component — unaffected by Task 3's edits since those are further down the file).

Add the import, alongside the existing imports at the top of the file:

```tsx
import LandingPipelineRail from "@/components/landing-pipeline-rail";
```

Replace both the `{/* ── How it works ── */}` section and the `{/* ── Value props ── */}` section (the two `<section>` blocks directly below the hero, in that order) with this single section:

```tsx
      {/* ── Pipeline ── */}
      <section className="border-t border-border bg-surface-raised">
        <div className="mx-auto w-full max-w-7xl px-6 py-20">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              Comment ça marche
            </p>
            <h2 className="mt-3 text-3xl font-bold text-foreground">
              De l'idée au projet livré, en 7 étapes
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-foreground-muted">
              Chaque projet est découpé en tickets. Chaque ticket suit ce parcours,
              du backlog à la livraison — et tu valides avant chaque étape qui
              compte. Plusieurs projets, un seul tableau de bord.
            </p>
          </div>

          <div className="mt-14">
            <LandingPipelineRail />
          </div>
        </div>
      </section>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/root-page.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit --pretty false`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx __tests__/root-page.test.tsx
git commit -m "redesign(landing): replace pipeline-steps + value-props grid with LandingPipelineRail"
```

---

### Task 5: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass except the 3 pre-existing unrelated failures already known before this plan (`admin-managed-secrets-page.test.tsx`, `app-sidebar.test.tsx`, `project-context-step.test.tsx`) — confirm no new failures.

- [ ] **Step 2: Full typecheck**

Run: `npx tsc --noEmit --pretty false`
Expected: no errors.

- [ ] **Step 3: Manual visual check**

Run: `npm run dev`, open `http://localhost:3000`. Confirm:
- Hero has no badge pill, no gradient blob, shows the `KARA-142 · Spec Review` ticker.
- Pipeline section shows the sticky rail on desktop width, scroll-spy highlights the node matching the section in view.
- Resize below `lg` (1024px): rail becomes the horizontal stepper above each block, no sticky sidebar.
- `/pricing`, nav, footer, login unaffected.

- [ ] **Step 4: Clean up build artifact noise**

Run: `git checkout -- tsconfig.tsbuildinfo` (typecheck runs regenerate this tracked file; discard the diff before the final commit if `git status` shows it modified).

- [ ] **Step 5: Final commit (if Step 3 caught anything to fix)**

```bash
git add -A
git commit -m "fix(landing): address manual QA findings from redesign verification pass"
```

Skip this commit if Step 3 found nothing to fix.
