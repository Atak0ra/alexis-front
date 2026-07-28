# Landing Page Copy Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the AI-magic/cliché copy and "PR" jargon on the public landing page (`app/page.tsx`) with sober, factual copy that frames the product around idea → project → ticket instead of opening on ticket-tracker jargon, and keeps the hero repo-agnostic for non-technical solopreneurs.

**Architecture:** Pure content edit — string replacements inside `PIPELINE_STAGES`, `VALUE_PROPS`, and inline JSX in `app/page.tsx`. No new components, no layout changes, no new props. `__tests__/root-page.test.tsx` assertions updated to match the new copy.

**Tech Stack:** Next.js 14 App Router (React Server Component page, no client state), Vitest + Testing Library for the existing test file.

## Global Constraints

- Text only — no visual/layout changes (colors, spacing, components untouched).
- Zero "automatique", "automatisé", "magique", "révolutionnaire" anywhere in the new copy.
- Zero rhetorical question in CTA copy.
- "Ticket" does not appear before the "Comment ça marche" section (badge, H1, hero subtitle, CTA stay at idea/project level) — it's reintroduced only once the section subtitle has explicitly stated the project → tickets hierarchy.
- Hero section (badge, H1, subtitle) and the final CTA banner must not name "dépôt"/"repo" — those stay agnostic to whether the user has an existing code repository.
- `LivePipelinePreview`'s fake ticket data (`KARA-142`, etc.) and the Kanban stage labels (`Todo`/`Spec`/`Plan`/`Dev`/`Livraison`) are out of scope — not touched.

---

### Task 1: Rewrite landing page copy

**Files:**
- Modify: `app/page.tsx`
- Test: `__tests__/root-page.test.tsx`

**Interfaces:** None — self-contained content change, nothing else in the codebase imports these string constants.

- [ ] **Step 1: Update the test assertions to expect the new copy**

Read `__tests__/root-page.test.tsx` current content first to confirm it still matches what's shown below (it was last touched before this session's other work, should be unchanged). Then apply these four edits:

Line 9, replace:
```tsx
    expect(screen.getByRole("heading", { name: /résolus automatiquement/i })).toBeInTheDocument();
```
with:
```tsx
    expect(screen.getByRole("heading", { name: /un projet livré/i })).toBeInTheDocument();
```

Line 20, replace:
```tsx
    expect(screen.getByText(/attend d'être pris en charge/)).toBeInTheDocument();
```
with:
```tsx
    expect(screen.getByText(/prêt à être pris en charge/)).toBeInTheDocument();
```

Line 23, replace:
```tsx
    expect(screen.getByText(/PR est ouverte/)).toBeInTheDocument();
```
with:
```tsx
    expect(screen.getByText(/livré sur votre dépôt/)).toBeInTheDocument();
```

Line 31, replace:
```tsx
    expect(screen.getByText("Du ticket au PR en autonomie")).toBeInTheDocument();
```
with:
```tsx
    expect(screen.getByText("Ticket → code testé → livré")).toBeInTheDocument();
```

Leave every other assertion in the file untouched (KARA-142 preview, "Zéro configuration manuelle", "Plusieurs projets, un seul tableau de bord", "Coûts transparents et traçables", the `rédige une spécification`/`écrit le code` regexes, the Connexion/CTA links test).

- [ ] **Step 2: Run the test file to verify it now fails against the current (unchanged) page**

Run: `cd /Users/williams.de.souza/devhome/personal/alexis-front && npx vitest run __tests__/root-page.test.tsx`
Expected: FAIL — at least the "shows the product wordmark and pitch", "shows the pipeline stages with descriptions", and "shows the value-props section" tests fail, since `app/page.tsx` still has the old copy.

- [ ] **Step 3: Rewrite `PIPELINE_STAGES` descriptions**

In `app/page.tsx`, the `PIPELINE_STAGES` array (lines 5-56) currently has these four `description` values (icons unchanged, omitted below for brevity — only edit the `description` string on each object, leave `key`, `label`, and `icon` exactly as they are):

Stage `todo` (line 9), replace:
```tsx
    description: "Le ticket est créé et attend d'être pris en charge par l'agent.",
```
with:
```tsx
    description: "Le ticket est décrit et prêt à être pris en charge.",
```

Stage `spec` (line 19), replace:
```tsx
    description: "Alexis analyse le ticket et rédige une spécification technique détaillée.",
```
with:
```tsx
    description: "Alexis rédige une spécification technique détaillée pour ce ticket.",
```

Stage `plan` (line 29), replace:
```tsx
    description: "L'agent décompose le travail en étapes concrètes et prépare son exécution.",
```
with:
```tsx
    description: "L'agent décompose le travail en étapes concrètes.",
```

Stage `dev` (line 39): leave unchanged — `"Alexis écrit le code, lance les tests et itère jusqu'à ce que tout passe."`

Stage `livraison` (line 49), replace:
```tsx
    description: "Une PR est ouverte, le ticket est mis à jour. Prêt à review.",
```
with:
```tsx
    description: "Le code est livré sur votre dépôt, avec ou sans relecture selon vos réglages.",
```

- [ ] **Step 4: Rewrite `VALUE_PROPS` title and description**

In the `VALUE_PROPS` array (lines 58-96), the entry at lines 69-71 (second object, icon on lines 72-76 unchanged):

Replace:
```tsx
  {
    title: "Du ticket au PR en autonomie",
    description: "L'agent prend en charge le ticket, écrit le code, vérifie les tests et ouvre la PR. Vous n'avez qu'à valider.",
```
with:
```tsx
  {
    title: "Ticket → code testé → livré",
    description: "L'agent écrit le code, exécute les tests, et livre le résultat sur votre dépôt. Vous validez avant que ça parte plus loin — ou pas, selon vos réglages.",
```

The fourth object (lines 87-89), replace:
```tsx
    title: "Coûts transparents et traçables",
    description: "Chaque ticket affiche son coût d'exécution. Vous savez exactement ce que l'automatisation vous rapporte.",
```
with:
```tsx
    title: "Coûts transparents et traçables",
    description: "Chaque ticket affiche son coût réel. Vous savez ce que vous payez, ticket par ticket.",
```

(title unchanged, only the description) — the first object ("Zéro configuration manuelle") and third object ("Plusieurs projets, un seul tableau de bord") are untouched.

- [ ] **Step 5: Rewrite the hero badge, H1, and subtitle**

Line 198, replace:
```tsx
            Développement automatisé par IA
```
with:
```tsx
            Agent de développement, pour solopreneurs et agences
```

Lines 202-205, replace:
```tsx
          <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-tight tracking-tight text-foreground sm:text-6xl">
            Vos tickets,{" "}
            <span className="text-brand">résolus automatiquement</span>
          </h1>
```
with:
```tsx
          <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-tight tracking-tight text-foreground sm:text-6xl">
            Une idée.{" "}
            <span className="text-brand">Un projet livré.</span>
          </h1>
```

Lines 207-210, replace:
```tsx
          <p className="mt-6 max-w-2xl text-lg text-foreground-muted">
            Alexis connecte vos tickets à un agent de code. Du ticket à la PR mergée,
            sans intervention manuelle. Vous reviewez, vous validez.
          </p>
```
with:
```tsx
          <p className="mt-6 max-w-2xl text-lg text-foreground-muted">
            Décrivez ce qu'il faut faire. Alexis structure le travail, l'exécute,
            teste le résultat, et le livre — avec ou sans relecture avant mise en
            ligne, selon vos réglages.
          </p>
```

- [ ] **Step 6: Rewrite the "Comment ça marche" section heading**

Lines 250-255, replace:
```tsx
            <h2 className="mt-3 text-3xl font-bold text-foreground">
              Du ticket à la PR en 5 étapes
            </h2>
            <p className="mt-3 text-foreground-muted">
              Alexis prend en charge chaque ticket et avance de façon autonome jusqu'à la livraison.
            </p>
```
with:
```tsx
            <h2 className="mt-3 text-3xl font-bold text-foreground">
              De l'idée au projet livré, en 5 étapes
            </h2>
            <p className="mt-3 text-foreground-muted">
              Chaque projet est découpé en tickets. Chaque ticket passe par une spécification,
              un plan, une implémentation testée, avant la livraison.
            </p>
```

- [ ] **Step 7: Rewrite the value-props section heading and the CTA banner**

Line 286, replace:
```tsx
              Conçu pour les équipes qui livrent vite
```
with:
```tsx
              Pensé pour livrer sans y passer vos journées
```

Lines 312-317, replace:
```tsx
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Prêt à automatiser votre développement ?
          </h2>
          <p className="mt-4 max-w-xl text-base text-white/60">
            Connectez votre premier projet en moins de 5 minutes et laissez Alexis traiter vos tickets.
          </p>
```
with:
```tsx
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Créez votre premier projet
          </h2>
          <p className="mt-4 max-w-xl text-base text-white/60">
            Avec ou sans dépôt existant, votre projet est prêt en quelques minutes.
          </p>
```

- [ ] **Step 8: Run the test file to verify it passes**

Run: `cd /Users/williams.de.souza/devhome/personal/alexis-front && npx vitest run __tests__/root-page.test.tsx`
Expected: PASS, all 4 tests

- [ ] **Step 9: Run the full frontend suite**

Run: `cd /Users/williams.de.souza/devhome/personal/alexis-front && npx vitest run`
Expected: PASS, no regressions across all test files (nothing else in the codebase references these landing-page strings — grep confirmed only `__tests__/root-page.test.tsx` imports `@/app/page`)

- [ ] **Step 10: Commit**

```bash
cd /Users/williams.de.souza/devhome/personal/alexis-front
git add app/page.tsx __tests__/root-page.test.tsx
git commit -m "content: rewrite landing page copy — drop AI-magic clichés and PR jargon"
```
