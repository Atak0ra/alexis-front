# Landing Icon Watermark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a decorative watermark of fading solo-dev/code-themed icons to the landing page hero and final CTA sections.

**Architecture:** One presentational component (`LandingIconField`) renders 6 absolutely-positioned `lucide-react` icons with a CSS-only fade in/hold/out loop (staggered per-icon via inline `animation-delay`/`animation-duration`). `app/page.tsx` mounts it twice — `variant="light"` in the hero, `variant="dark"` in the final CTA — behind the existing content (`z-10`).

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, `lucide-react`, Vitest + Testing Library.

## Global Constraints

- No JS animation loop (no canvas, no `requestAnimationFrame`) — CSS keyframes only, per spec's hors-périmètre.
- Icons: `Code2`, `Lightbulb`, `GitBranch`, `Terminal`, `Sparkles`, `Rocket` from `lucide-react` — no custom SVG paths.
- Hidden below the `lg` breakpoint (`hidden lg:block`) — no mobile-specific version.
- `aria-hidden="true"` and `pointer-events-none` on the watermark container — purely decorative, must never intercept clicks or be read by screen readers.
- Colors: `text-brand/15` for `variant="light"` (hero, `bg-surface`), `text-white/10` for `variant="dark"` (CTA, `bg-foreground`).
- `@media (prefers-reduced-motion: reduce)` freezes the animation and holds opacity at `0.12`.
- French `vous` register is already enforced project-wide (`root-page.test.tsx` checks for `tu/ton/ta/tes`) — this feature adds no copy, so it can't violate this, but don't introduce any icon `title`/`aria-label` text that would.

---

### Task 1: `LandingIconField` component (foundation + animation)

**Files:**
- Create: `components/landing-icon-field.tsx`
- Modify: `tailwind.config.ts` (add `watermark-fade` keyframes/animation under `theme.extend`)
- Modify: `app/globals.css` (add `prefers-reduced-motion` override, unlayered so it beats the Tailwind utility)
- Test: `__tests__/landing-icon-field.test.tsx`

**Interfaces:**
- Produces: `export default function LandingIconField({ variant }: { variant: IconFieldVariant }): JSX.Element`, `export type IconFieldVariant = "light" | "dark"`, `export const SPOTS: { Icon: LucideIcon; top: string; left: string; size: number; delay: number; duration: number }[]` (length 6). Container rendered by `LandingIconField` has `data-testid={\`icon-field-${variant}\`}` — Task 2 queries the page by this test id.
- Consumes: nothing from other tasks (this is the foundation).

- [ ] **Step 1: Write the failing test**

Create `__tests__/landing-icon-field.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingIconField, { SPOTS } from "@/components/landing-icon-field";

describe("LandingIconField", () => {
  it("defines exactly 6 decorative spots", () => {
    expect(SPOTS).toHaveLength(6);
  });

  it("renders a decorative, aria-hidden container identified by variant", () => {
    render(<LandingIconField variant="light" />);
    const field = screen.getByTestId("icon-field-light");
    expect(field).toHaveAttribute("aria-hidden", "true");
    expect(field).toHaveClass("pointer-events-none");
  });

  it("is hidden below the lg breakpoint", () => {
    render(<LandingIconField variant="light" />);
    expect(screen.getByTestId("icon-field-light")).toHaveClass("hidden", "lg:block");
  });

  it("applies the brand-tinted color class for variant=light", () => {
    render(<LandingIconField variant="light" />);
    const icon = screen.getByTestId("icon-field-light").querySelector("svg");
    expect(icon).toHaveClass("text-brand/15");
  });

  it("applies the white-tinted color class for variant=dark", () => {
    render(<LandingIconField variant="dark" />);
    const icon = screen.getByTestId("icon-field-dark").querySelector("svg");
    expect(icon).toHaveClass("text-white/10");
  });

  it("renders one icon per spot, each with the fade animation and its own timing", () => {
    render(<LandingIconField variant="light" />);
    const icons = screen.getByTestId("icon-field-light").querySelectorAll("svg");
    expect(icons).toHaveLength(SPOTS.length);
    icons.forEach((icon, i) => {
      expect(icon).toHaveClass("animate-watermark-fade");
      expect(icon.style.animationDelay).toBe(`${SPOTS[i].delay}s`);
      expect(icon.style.animationDuration).toBe(`${SPOTS[i].duration}s`);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/landing-icon-field.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/landing-icon-field"`.

- [ ] **Step 3: Create the component**

Create `components/landing-icon-field.tsx`:

```tsx
import { Code2, GitBranch, Lightbulb, Rocket, Sparkles, Terminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type IconFieldVariant = "light" | "dark";

type Spot = {
  Icon: LucideIcon;
  top: string;
  left: string;
  size: number;
  delay: number;
  duration: number;
};

export const SPOTS: Spot[] = [
  { Icon: Code2,     top: "8%",  left: "6%",  size: 44, delay: 0,   duration: 9 },
  { Icon: Lightbulb, top: "70%", left: "10%", size: 32, delay: 2.4, duration: 11 },
  { Icon: GitBranch, top: "15%", left: "88%", size: 40, delay: 4.8, duration: 8.5 },
  { Icon: Terminal,  top: "55%", left: "92%", size: 28, delay: 1.2, duration: 10 },
  { Icon: Sparkles,  top: "85%", left: "50%", size: 36, delay: 6,   duration: 9.5 },
  { Icon: Rocket,    top: "4%",  left: "45%", size: 26, delay: 3.6, duration: 10.5 },
];

const VARIANT_COLOR_CLASS: Record<IconFieldVariant, string> = {
  light: "text-brand/15",
  dark: "text-white/10",
};

export default function LandingIconField({ variant }: { variant: IconFieldVariant }) {
  return (
    <div
      aria-hidden="true"
      data-testid={`icon-field-${variant}`}
      className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block"
    >
      {SPOTS.map(({ Icon, top, left, size, delay, duration }, i) => (
        <Icon
          key={i}
          strokeWidth={1.5}
          className={`absolute animate-watermark-fade ${VARIANT_COLOR_CLASS[variant]}`}
          style={{
            top,
            left,
            width: size,
            height: size,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
          }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/landing-icon-field.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Wire up the real CSS animation**

In `tailwind.config.ts`, inside `theme.extend` (after `borderRadius`, before the closing `},` of `extend`), add:

```ts
      keyframes: {
        "watermark-fade": {
          "0%":   { opacity: "0" },
          "15%":  { opacity: "1" },
          "70%":  { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "watermark-fade": "watermark-fade 9s ease-in-out infinite",
      },
```

In `app/globals.css`, after the closing `}` of the existing `@layer utilities { ... }` block, add (unlayered, so it beats the Tailwind utility per CSS cascade-layer rules regardless of source order):

```css
@media (prefers-reduced-motion: reduce) {
  .animate-watermark-fade {
    animation: none;
    opacity: 0.12;
  }
}
```

- [ ] **Step 6: Run the full test suite to confirm nothing broke**

Run: `npx vitest run`
Expected: PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add components/landing-icon-field.tsx tailwind.config.ts app/globals.css __tests__/landing-icon-field.test.tsx
git commit -m "feat: add LandingIconField watermark component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Mount the watermark in the hero and final CTA sections

**Files:**
- Modify: `app/page.tsx:1-9` (import), `app/page.tsx:16-54` (hero section), `app/page.tsx:102-121` (CTA section)
- Test: `__tests__/root-page.test.tsx`

**Interfaces:**
- Consumes: `LandingIconField` default export and `IconFieldVariant` from Task 1 (`@/components/landing-icon-field`), rendering `variant="light"` and `variant="dark"`. Relies on the `data-testid={\`icon-field-${variant}\`}` contract from Task 1 to assert presence.
- Produces: nothing consumed by later tasks — this is the last task.

- [ ] **Step 1: Write the failing test**

In `__tests__/root-page.test.tsx`, add inside the `describe("RootPage", ...)` block (after the last existing `it`):

```tsx
  it("shows the decorative icon watermark in the hero and the final CTA", () => {
    render(<RootPage />);
    expect(screen.getByTestId("icon-field-light")).toBeInTheDocument();
    expect(screen.getByTestId("icon-field-dark")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/root-page.test.tsx`
Expected: FAIL — `Unable to find an element by: [data-testid="icon-field-light"]`.

- [ ] **Step 3: Mount `LandingIconField` in the hero section**

In `app/page.tsx`, add the import (after the existing `LandingDashboardPreview` import on line 8):

```tsx
import LandingIconField from "@/components/landing-icon-field";
```

Then change the hero section (currently `app/page.tsx:16-54`) from:

```tsx
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-6 pb-24 pt-20 text-center">
```

to:

```tsx
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <LandingIconField variant="light" />
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-6 pb-24 pt-20 text-center">
```

(The closing `</div>` / `</section>` tags for this block are unchanged — only the two opening tags above and the new `<LandingIconField />` line are touched.)

- [ ] **Step 4: Mount `LandingIconField` in the final CTA section**

Change the CTA section (currently `app/page.tsx:102-103`) from:

```tsx
      {/* ── CTA final ── */}
      <section className="border-t border-border bg-foreground">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 py-20 text-center">
```

to:

```tsx
      {/* ── CTA final ── */}
      <section className="relative overflow-hidden border-t border-border bg-foreground">
        <LandingIconField variant="dark" />
        <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-6 py-20 text-center">
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/root-page.test.tsx`
Expected: PASS.

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, no regressions (in particular the existing `root-page.test.tsx` assertions about headings/links/copy still hold — this task only adds two new elements, it doesn't touch existing text).

- [ ] **Step 7: Manual visual check**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: on a viewport ≥ 1024px wide, faint icons (code brackets, lightbulb, git branch, terminal, sparkles, rocket) fade in and out at staggered times behind the hero text and behind the final "Créez votre premier projet" CTA — brand-violet tint on the light hero, white tint on the dark CTA. Below 1024px, no icons render. In OS-level reduced-motion mode, icons are static and faint instead of fading.

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx __tests__/root-page.test.tsx
git commit -m "feat: mount icon watermark in landing hero and final CTA

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
