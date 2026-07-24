# Context Advanced Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Option avancée" checkbox to the context-generation form that lets a technically-savvy client pick stack/architecture/database, compiled into the brief sent to the agent.

**Architecture:** Pure frontend, three layers: a pure options/compile module, a presentational subcomponent that owns its own form state and reports a single compiled string via `onChange`, and a two-line integration into `ProjectContextStep`'s existing form. No backend or API contract changes.

**Tech Stack:** Next.js 14 App Router, TypeScript, Vitest + Testing Library. Repo: `/Users/williams.de.souza/devhome/personal/alexis-front`.

## Global Constraints

- No backend changes — `createProjectContext(apiKey, projectId, brief)`'s signature and the `/context` POST payload stay exactly as today.
- No new UI kit components — follow the existing raw `<select>` + `components/ui/label.tsx` + `components/ui/input.tsx` pattern used in `app/dashboard/[id]/settings/page.tsx` and `app/projects/new/repo/page.tsx`.
- Advanced fields are always optional — never block form submission on them.
- Value lists (verbatim from the approved spec):
  - Architecture: Monolithe / Front + Back / Front + Back + BFF
  - Backend/monolith/BFF stack: Python + Django, Python + FastAPI, Python + Flask, Node.js + Express, Node.js + NestJS, Ruby on Rails, PHP + Laravel, Java + Spring Boot, Go, .NET / C#, Autre
  - Frontend stack: React, Next.js, Vue.js, Nuxt, Angular, Svelte/SvelteKit, Autre
  - Database: PostgreSQL, MySQL/MariaDB, MongoDB, SQLite, Redis, Aucune, Autre

---

### Task 1: Options data + compile function

**Files:**
- Create: `lib/context-advanced-options.ts`
- Test: `__tests__/context-advanced-options-lib.test.ts`

**Interfaces:**
- Produces: `ArchitecturePattern` type (`"monolith" | "front_back" | "front_back_bff"`), `SelectOption` interface (`{ value: string; label: string }`), constants `ARCHITECTURE_OPTIONS`, `BACKEND_STACK_OPTIONS`, `FRONTEND_STACK_OPTIONS`, `DATABASE_OPTIONS` (all `SelectOption[]`, `ARCHITECTURE_OPTIONS` items typed `{ value: ArchitecturePattern; label: string }`), `CompiledSelections` interface (`{ stackMonolith: string; stackFrontend: string; stackBackend: string; stackBff: string; architectureLabel: string; databaseLabel: string }`), and `compileAdvancedBrief(s: CompiledSelections): string`. Task 2 imports all of these.

- [ ] **Step 1: Write the failing test**

Create `__tests__/context-advanced-options-lib.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { compileAdvancedBrief } from "@/lib/context-advanced-options";

const EMPTY = {
  stackMonolith: "", stackFrontend: "", stackBackend: "", stackBff: "",
  architectureLabel: "", databaseLabel: "",
};

describe("compileAdvancedBrief", () => {
  it("returns an empty string when nothing is filled", () => {
    expect(compileAdvancedBrief(EMPTY)).toBe("");
  });

  it("compiles a monolith stack + architecture + database", () => {
    const result = compileAdvancedBrief({
      ...EMPTY,
      stackMonolith: "Python + Django",
      architectureLabel: "Monolithe",
      databaseLabel: "PostgreSQL",
    });
    expect(result).toBe(
      "Stack: Python + Django\nArchitecture: Monolithe\nBase de données: PostgreSQL"
    );
  });

  it("compiles frontend + backend stacks with layer suffixes", () => {
    const result = compileAdvancedBrief({
      ...EMPTY,
      stackFrontend: "React",
      stackBackend: "Python + Django",
      architectureLabel: "Front + Back",
    });
    expect(result).toBe(
      "Stack: Python + Django (backend), React (frontend)\nArchitecture: Front + Back"
    );
  });

  it("compiles frontend + backend + BFF stacks", () => {
    const result = compileAdvancedBrief({
      ...EMPTY,
      stackFrontend: "React",
      stackBackend: "Python + Django",
      stackBff: "Node.js + NestJS",
      architectureLabel: "Front + Back + BFF",
    });
    expect(result).toBe(
      "Stack: Python + Django (backend), React (frontend), Node.js + NestJS (BFF)\n" +
      "Architecture: Front + Back + BFF"
    );
  });

  it("omits the database line when 'Aucune' is selected", () => {
    const result = compileAdvancedBrief({ ...EMPTY, databaseLabel: "Aucune" });
    expect(result).toBe("");
  });

  it("omits empty fields entirely rather than producing blank lines", () => {
    const result = compileAdvancedBrief({ ...EMPTY, architectureLabel: "Monolithe" });
    expect(result).toBe("Architecture: Monolithe");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/williams.de.souza/devhome/personal/alexis-front && npx vitest run __tests__/context-advanced-options-lib.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/context-advanced-options"` (module doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `lib/context-advanced-options.ts`:

```ts
export type ArchitecturePattern = "monolith" | "front_back" | "front_back_bff";

export interface SelectOption {
  value: string;
  label: string;
}

export const ARCHITECTURE_OPTIONS: { value: ArchitecturePattern; label: string }[] = [
  { value: "monolith", label: "Monolithe" },
  { value: "front_back", label: "Front + Back" },
  { value: "front_back_bff", label: "Front + Back + BFF" },
];

export const BACKEND_STACK_OPTIONS: SelectOption[] = [
  { value: "python_django", label: "Python + Django" },
  { value: "python_fastapi", label: "Python + FastAPI" },
  { value: "python_flask", label: "Python + Flask" },
  { value: "node_express", label: "Node.js + Express" },
  { value: "node_nestjs", label: "Node.js + NestJS" },
  { value: "ruby_rails", label: "Ruby on Rails" },
  { value: "php_laravel", label: "PHP + Laravel" },
  { value: "java_spring", label: "Java + Spring Boot" },
  { value: "go", label: "Go" },
  { value: "dotnet", label: ".NET / C#" },
  { value: "other", label: "Autre" },
];

export const FRONTEND_STACK_OPTIONS: SelectOption[] = [
  { value: "react", label: "React" },
  { value: "nextjs", label: "Next.js" },
  { value: "vue", label: "Vue.js" },
  { value: "nuxt", label: "Nuxt" },
  { value: "angular", label: "Angular" },
  { value: "svelte", label: "Svelte/SvelteKit" },
  { value: "other", label: "Autre" },
];

export const DATABASE_OPTIONS: SelectOption[] = [
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL/MariaDB" },
  { value: "mongodb", label: "MongoDB" },
  { value: "sqlite", label: "SQLite" },
  { value: "redis", label: "Redis" },
  { value: "none", label: "Aucune" },
  { value: "other", label: "Autre" },
];

export interface CompiledSelections {
  stackMonolith: string;
  stackFrontend: string;
  stackBackend: string;
  stackBff: string;
  architectureLabel: string;
  databaseLabel: string;
}

export function compileAdvancedBrief(s: CompiledSelections): string {
  const stackParts: string[] = [];
  if (s.stackMonolith) stackParts.push(s.stackMonolith);
  if (s.stackBackend) stackParts.push(`${s.stackBackend} (backend)`);
  if (s.stackFrontend) stackParts.push(`${s.stackFrontend} (frontend)`);
  if (s.stackBff) stackParts.push(`${s.stackBff} (BFF)`);

  const lines: string[] = [];
  if (stackParts.length > 0) lines.push(`Stack: ${stackParts.join(", ")}`);
  if (s.architectureLabel) lines.push(`Architecture: ${s.architectureLabel}`);
  if (s.databaseLabel && s.databaseLabel !== "Aucune") {
    lines.push(`Base de données: ${s.databaseLabel}`);
  }

  return lines.join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/williams.de.souza/devhome/personal/alexis-front && npx vitest run __tests__/context-advanced-options-lib.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/williams.de.souza/devhome/personal/alexis-front
git add lib/context-advanced-options.ts __tests__/context-advanced-options-lib.test.ts
git commit -m "feat: add options data + compile function for advanced context options"
```

---

### Task 2: ContextAdvancedOptions component

**Files:**
- Create: `components/context-advanced-options.tsx`
- Test: `__tests__/context-advanced-options.test.tsx`

**Interfaces:**
- Consumes: everything from Task 1 (`ARCHITECTURE_OPTIONS`, `BACKEND_STACK_OPTIONS`, `FRONTEND_STACK_OPTIONS`, `DATABASE_OPTIONS`, `compileAdvancedBrief`, `ArchitecturePattern`, `SelectOption` — from `@/lib/context-advanced-options`); `Label` from `@/components/ui/label`; `Input` from `@/components/ui/input`.
- Produces: default export `ContextAdvancedOptions`, props `{ onChange: (compiledText: string) => void }`. Task 3 renders `<ContextAdvancedOptions onChange={setAdvancedBrief} />`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/context-advanced-options.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ContextAdvancedOptions from "@/components/context-advanced-options";

describe("ContextAdvancedOptions", () => {
  it("is collapsed by default and reports an empty compiled brief", () => {
    const onChange = vi.fn();
    render(<ContextAdvancedOptions onChange={onChange} />);

    expect(screen.queryByLabelText("Architecture")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("reveals Architecture and Database when checked", () => {
    const onChange = vi.fn();
    render(<ContextAdvancedOptions onChange={onChange} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Option avancée" }));

    expect(screen.getByLabelText("Architecture")).toBeInTheDocument();
    expect(screen.getByLabelText("Base de données")).toBeInTheDocument();
    expect(screen.queryByLabelText("Stack")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Stack Frontend")).not.toBeInTheDocument();
  });

  it("shows a single Stack select for Monolithe", () => {
    const onChange = vi.fn();
    render(<ContextAdvancedOptions onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Option avancée" }));

    fireEvent.change(screen.getByLabelText("Architecture"), { target: { value: "monolith" } });

    expect(screen.getByLabelText("Stack")).toBeInTheDocument();
    expect(screen.queryByLabelText("Stack Frontend")).not.toBeInTheDocument();
  });

  it("shows Stack Frontend and Stack Backend for Front + Back", () => {
    const onChange = vi.fn();
    render(<ContextAdvancedOptions onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Option avancée" }));

    fireEvent.change(screen.getByLabelText("Architecture"), { target: { value: "front_back" } });

    expect(screen.getByLabelText("Stack Frontend")).toBeInTheDocument();
    expect(screen.getByLabelText("Stack Backend")).toBeInTheDocument();
    expect(screen.queryByLabelText("Stack BFF")).not.toBeInTheDocument();
  });

  it("also shows Stack BFF for Front + Back + BFF", () => {
    const onChange = vi.fn();
    render(<ContextAdvancedOptions onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Option avancée" }));

    fireEvent.change(screen.getByLabelText("Architecture"), { target: { value: "front_back_bff" } });

    expect(screen.getByLabelText("Stack Frontend")).toBeInTheDocument();
    expect(screen.getByLabelText("Stack Backend")).toBeInTheDocument();
    expect(screen.getByLabelText("Stack BFF")).toBeInTheDocument();
  });

  it("reveals a free-text input when 'Autre' is chosen, and its value ends up in the compiled brief", () => {
    const onChange = vi.fn();
    render(<ContextAdvancedOptions onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Option avancée" }));
    fireEvent.change(screen.getByLabelText("Architecture"), { target: { value: "monolith" } });

    fireEvent.change(screen.getByLabelText("Stack"), { target: { value: "other" } });
    expect(screen.getByPlaceholderText("Précise ta stack")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Précise ta stack"), {
      target: { value: "Elixir + Phoenix" },
    });

    expect(onChange).toHaveBeenLastCalledWith("Stack: Elixir + Phoenix\nArchitecture: Monolithe");
  });

  it("compiles the full brief for a Front + Back + BFF selection with a database", () => {
    const onChange = vi.fn();
    render(<ContextAdvancedOptions onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Option avancée" }));
    fireEvent.change(screen.getByLabelText("Architecture"), { target: { value: "front_back_bff" } });
    fireEvent.change(screen.getByLabelText("Stack Frontend"), { target: { value: "react" } });
    fireEvent.change(screen.getByLabelText("Stack Backend"), { target: { value: "python_django" } });
    fireEvent.change(screen.getByLabelText("Stack BFF"), { target: { value: "node_nestjs" } });
    fireEvent.change(screen.getByLabelText("Base de données"), { target: { value: "postgresql" } });

    expect(onChange).toHaveBeenLastCalledWith(
      "Stack: Python + Django (backend), React (frontend), Node.js + NestJS (BFF)\n" +
      "Architecture: Front + Back + BFF\n" +
      "Base de données: PostgreSQL"
    );
  });

  it("reports an empty compiled brief again after unchecking, even with fields previously filled", () => {
    const onChange = vi.fn();
    render(<ContextAdvancedOptions onChange={onChange} />);
    const checkbox = screen.getByRole("checkbox", { name: "Option avancée" });
    fireEvent.click(checkbox);
    fireEvent.change(screen.getByLabelText("Architecture"), { target: { value: "monolith" } });
    fireEvent.change(screen.getByLabelText("Stack"), { target: { value: "python_django" } });

    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenLastCalledWith("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/williams.de.souza/devhome/personal/alexis-front && npx vitest run __tests__/context-advanced-options.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/context-advanced-options"`.

- [ ] **Step 3: Write the implementation**

Create `components/context-advanced-options.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ARCHITECTURE_OPTIONS,
  BACKEND_STACK_OPTIONS,
  FRONTEND_STACK_OPTIONS,
  DATABASE_OPTIONS,
  compileAdvancedBrief,
  type ArchitecturePattern,
  type SelectOption,
} from "@/lib/context-advanced-options";

interface Props {
  onChange: (compiledText: string) => void;
}

function resolveLabel(choice: string, other: string, options: SelectOption[]): string {
  if (!choice) return "";
  if (choice === "other") return other.trim();
  return options.find((o) => o.value === choice)?.label ?? "";
}

const selectClass =
  "w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

function StackSelect({
  id, label, options, choice, onChoiceChange, other, onOtherChange, otherPlaceholder,
}: {
  id: string;
  label: string;
  options: SelectOption[];
  choice: string;
  onChoiceChange: (v: string) => void;
  other: string;
  onOtherChange: (v: string) => void;
  otherPlaceholder: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select id={id} value={choice} onChange={(e) => onChoiceChange(e.target.value)} className={selectClass}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {choice === "other" && (
        <Input
          className="mt-2"
          placeholder={otherPlaceholder}
          value={other}
          onChange={(e) => onOtherChange(e.target.value)}
        />
      )}
    </div>
  );
}

export default function ContextAdvancedOptions({ onChange }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [architecture, setArchitecture] = useState<ArchitecturePattern | "">("");

  const [monolithChoice, setMonolithChoice] = useState("");
  const [monolithOther, setMonolithOther] = useState("");
  const [frontendChoice, setFrontendChoice] = useState("");
  const [frontendOther, setFrontendOther] = useState("");
  const [backendChoice, setBackendChoice] = useState("");
  const [backendOther, setBackendOther] = useState("");
  const [bffChoice, setBffChoice] = useState("");
  const [bffOther, setBffOther] = useState("");
  const [databaseChoice, setDatabaseChoice] = useState("");
  const [databaseOther, setDatabaseOther] = useState("");

  const architectureLabel = enabled
    ? ARCHITECTURE_OPTIONS.find((o) => o.value === architecture)?.label ?? ""
    : "";

  const showFrontBack = architecture === "front_back" || architecture === "front_back_bff";

  const compiled = enabled
    ? compileAdvancedBrief({
        stackMonolith:
          architecture === "monolith" ? resolveLabel(monolithChoice, monolithOther, BACKEND_STACK_OPTIONS) : "",
        stackFrontend: showFrontBack ? resolveLabel(frontendChoice, frontendOther, FRONTEND_STACK_OPTIONS) : "",
        stackBackend: showFrontBack ? resolveLabel(backendChoice, backendOther, BACKEND_STACK_OPTIONS) : "",
        stackBff:
          architecture === "front_back_bff" ? resolveLabel(bffChoice, bffOther, BACKEND_STACK_OPTIONS) : "",
        architectureLabel,
        databaseLabel: resolveLabel(databaseChoice, databaseOther, DATABASE_OPTIONS),
      })
    : "";

  useEffect(() => {
    onChange(compiled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compiled]);

  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-brand"
        />
        Option avancée
      </label>

      {enabled && (
        <div className="mt-3 space-y-3 rounded-xl border border-border bg-surface-raised p-4">
          <div>
            <Label htmlFor="adv-architecture">Architecture</Label>
            <select
              id="adv-architecture"
              value={architecture}
              onChange={(e) => setArchitecture(e.target.value as ArchitecturePattern | "")}
              className={selectClass}
            >
              <option value="">—</option>
              {ARCHITECTURE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {architecture === "monolith" && (
            <StackSelect
              id="adv-stack-monolith"
              label="Stack"
              options={BACKEND_STACK_OPTIONS}
              choice={monolithChoice}
              onChoiceChange={setMonolithChoice}
              other={monolithOther}
              onOtherChange={setMonolithOther}
              otherPlaceholder="Précise ta stack"
            />
          )}

          {showFrontBack && (
            <>
              <StackSelect
                id="adv-stack-frontend"
                label="Stack Frontend"
                options={FRONTEND_STACK_OPTIONS}
                choice={frontendChoice}
                onChoiceChange={setFrontendChoice}
                other={frontendOther}
                onOtherChange={setFrontendOther}
                otherPlaceholder="Précise ta stack frontend"
              />
              <StackSelect
                id="adv-stack-backend"
                label="Stack Backend"
                options={BACKEND_STACK_OPTIONS}
                choice={backendChoice}
                onChoiceChange={setBackendChoice}
                other={backendOther}
                onOtherChange={setBackendOther}
                otherPlaceholder="Précise ta stack backend"
              />
            </>
          )}

          {architecture === "front_back_bff" && (
            <StackSelect
              id="adv-stack-bff"
              label="Stack BFF"
              options={BACKEND_STACK_OPTIONS}
              choice={bffChoice}
              onChoiceChange={setBffChoice}
              other={bffOther}
              onOtherChange={setBffOther}
              otherPlaceholder="Précise ta stack BFF"
            />
          )}

          <StackSelect
            id="adv-database"
            label="Base de données"
            options={DATABASE_OPTIONS}
            choice={databaseChoice}
            onChoiceChange={setDatabaseChoice}
            other={databaseOther}
            onOtherChange={setDatabaseOther}
            otherPlaceholder="Précise la base de données"
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/williams.de.souza/devhome/personal/alexis-front && npx vitest run __tests__/context-advanced-options.test.tsx`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/williams.de.souza/devhome/personal/alexis-front
git add components/context-advanced-options.tsx __tests__/context-advanced-options.test.tsx
git commit -m "feat: add ContextAdvancedOptions component"
```

---

### Task 3: Wire into ProjectContextStep

**Files:**
- Modify: `components/project-context-step.tsx:1-17` (imports), `:91` (state), `:311-328` (`handleSubmit`), `:427-428` (form JSX)
- Test: `__tests__/project-context-step.test.tsx`

**Interfaces:**
- Consumes: `ContextAdvancedOptions` default export from `@/components/context-advanced-options` (Task 2), props `{ onChange: (compiledText: string) => void }`.

- [ ] **Step 1: Write the failing tests**

Add to `__tests__/project-context-step.test.tsx`, inside the top-level `describe("ProjectContextStep", ...)` block (after the closing of the existing `describe("embedded mode", ...)` block, i.e. as a new sibling `describe`):

```tsx
  describe("advanced options", () => {
    it("prepends the compiled advanced brief to the submitted text", async () => {
      const createSpy = vi.spyOn(apiClient, "createProjectContext").mockResolvedValue(undefined);
      renderStep();
      await waitForForm();

      fireEvent.click(screen.getByRole("checkbox", { name: "Option avancée" }));
      fireEvent.change(screen.getByLabelText("Architecture"), { target: { value: "monolith" } });
      fireEvent.change(screen.getByLabelText("Stack"), { target: { value: "python_django" } });
      fireEvent.change(screen.getByLabelText("Décris ton projet en quelques phrases"), {
        target: { value: "Mon projet FastAPI." },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Générer" }));
      });

      await waitFor(() => expect(createSpy).toHaveBeenCalled());
      expect(createSpy).toHaveBeenCalledWith(
        "alx_xxx",
        "p1",
        "Stack: Python + Django\nArchitecture: Monolithe\n\nMon projet FastAPI."
      );
    });

    it("submits only the free text when advanced options is left unchecked", async () => {
      const createSpy = vi.spyOn(apiClient, "createProjectContext").mockResolvedValue(undefined);
      renderStep();
      await waitForForm();

      fireEvent.change(screen.getByLabelText("Décris ton projet en quelques phrases"), {
        target: { value: "Mon projet FastAPI." },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Générer" }));
      });

      await waitFor(() => expect(createSpy).toHaveBeenCalled());
      expect(createSpy).toHaveBeenCalledWith("alx_xxx", "p1", "Mon projet FastAPI.");
    });
  });
```

This file already imports `vi`, `screen`, `fireEvent`, `waitFor`, `act`, and `apiClient` (see the top of the file) — no new imports needed for this step.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/williams.de.souza/devhome/personal/alexis-front && npx vitest run __tests__/project-context-step.test.tsx -t "advanced options"`
Expected: FAIL — `Unable to find role="checkbox" with name "Option avancée"` (component not wired in yet).

- [ ] **Step 3: Wire the component into ProjectContextStep**

In `components/project-context-step.tsx`, add the import after line 17 (`import { getApiKey } from "@/lib/session";`):

```tsx
import ContextAdvancedOptions from "@/components/context-advanced-options";
```

Add state after line 91 (`const [brief, setBrief] = useState("");`):

```tsx
  const [advancedBrief, setAdvancedBrief] = useState("");
```

Replace the body of `handleSubmit` (lines 311-328) — only the `createProjectContext` call changes:

```tsx
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("Session absente");
      setGenPhase(null);
      setElapsedSec(0);
      const finalBrief = advancedBrief
        ? [advancedBrief, brief.trim()].filter(Boolean).join("\n\n")
        : brief;
      await createProjectContext(apiKey, projectId, finalBrief);
      setPhase("polling");
      startPolling();
    } catch (err) {
      setError(err instanceof AlexisApiError ? err.detail : "Erreur inattendue lors de la soumission.");
    } finally {
      setSubmitting(false);
    }
  }
```

In the FORM phase JSX, insert `<ContextAdvancedOptions>` right after the `<form>` opening tag (line 427) and before the textarea's wrapping `<div>` (line 428):

```tsx
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <ContextAdvancedOptions onChange={setAdvancedBrief} />

              <div>
                <label htmlFor="brief" className="mb-1.5 block text-sm font-medium text-foreground">
```

(Everything from the existing `<div>` at line 428 onward is unchanged — this only adds the one line above it.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/williams.de.souza/devhome/personal/alexis-front && npx vitest run __tests__/project-context-step.test.tsx`
Expected: PASS — all tests in the file, including the 2 new ones (30 total).

- [ ] **Step 5: Run the full frontend suite**

Run: `cd /Users/williams.de.souza/devhome/personal/alexis-front && npx vitest run`
Expected: PASS — no regressions in any other file (this change only adds an import, one line of state, one JSX line, and a 4-line branch in `handleSubmit`; nothing existing is removed or renamed).

- [ ] **Step 6: Commit**

```bash
cd /Users/williams.de.souza/devhome/personal/alexis-front
git add components/project-context-step.tsx __tests__/project-context-step.test.tsx
git commit -m "feat: wire advanced options into the context generation form"
```

---

## Self-Review Notes

- **Spec coverage:** checkbox + conditional fields (Task 2), architecture-driven stack select count (Task 2), "Autre" free text (Task 2), compiled text prepended to brief with no backend change (Task 3), optional fields / unchecked = current behavior (Tasks 2 and 3 tests), no deployment field (never added one) — all covered.
- **Placeholder scan:** none found — every step has full code.
- **Type consistency:** `CompiledSelections` (Task 1) fields match exactly what `ContextAdvancedOptions` (Task 2) passes into `compileAdvancedBrief`; `onChange: (compiledText: string) => void` (Task 2) matches how Task 3 uses it (`onChange={setAdvancedBrief}`, a `Dispatch<SetStateAction<string>>`, which is a valid `(v: string) => void`).
