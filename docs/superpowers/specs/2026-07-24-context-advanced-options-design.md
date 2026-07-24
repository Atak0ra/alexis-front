# Context Generation — Advanced Options Design

**Goal:** Let a technically-savvy client specify their stack, architecture pattern, and database when creating or regenerating `.alexis/project.md`, instead of relying solely on a free-text description for the agent to interpret.

**Architecture:** Pure frontend addition to `ProjectContextStep`'s existing `form` phase. No backend or API contract change — structured selections are compiled into a text block client-side and prepended to the existing free-text `brief` string before calling `createProjectContext`.

## Background

`ProjectContextStep` (`components/project-context-step.tsx`) already has a `form` phase with a free-text textarea (`brief`) that gets sent to `POST /projects/{id}/context`, which enqueues `generate_context_job` on the backend. The agent uses this brief plus its own repo analysis to write `.alexis/project.md` (see `orchestrator/prompts/context.md` in the backend repo).

This form phase is reached two ways:
- Directly, on first-time context generation (empty or has-code repo)
- Via the existing "Régénérer" button on the review screen, when editing/redoing an existing `.alexis/project.md` (`handleRegenerate()` sets `phase="form"`)

Both entry points render the same form, so adding advanced options here covers both "initializing" and "modifying" a project's context without new navigation.

## UI

A checkbox, "Option avancée", appears in the form phase (both the empty-repo and has-code variants), above the free-text textarea. Unchecked (default): current behavior, unchanged.

Checked, reveals in order:

1. **Architecture** — select, one of:
   - Monolithe
   - Front + Back
   - Front + Back + BFF

2. **Stack** — 1 to 3 selects depending on the Architecture choice:
   - Monolithe → one "Stack" select
   - Front + Back → "Stack Frontend" + "Stack Backend"
   - Front + Back + BFF → adds "Stack BFF"

   Backend/monolith/BFF stack options: Python + Django · Python + FastAPI · Python + Flask · Node.js + Express · Node.js + NestJS · Ruby on Rails · PHP + Laravel · Java + Spring Boot · Go · .NET / C# · Autre

   Frontend stack options: React · Next.js · Vue.js · Nuxt · Angular · Svelte/SvelteKit · Autre

   The BFF select reuses the backend/monolith option list (a BFF is typically a lightweight backend-ish layer, not always Node, so no separate list is needed).

   Selecting "Autre" on any stack select reveals a free-text input for that field.

3. **Database** — select, always shown when advanced is on: PostgreSQL · MySQL/MariaDB · MongoDB · SQLite · Redis · Aucune · Autre (with free-text input when "Autre" is picked)

All advanced fields are optional — nothing here is required to submit. This matches the existing free-text brief's behavior (required only for the empty-repo case, exactly as today — advanced fields don't change that requirement).

No deployment field — deployment target doesn't meaningfully change what code an agent writes for spec/plan/dev steps, unlike stack/architecture/database. If a user wants to mention it, the free-text field remains available for that.

## Data flow

On submit, a formatter function turns the filled-in advanced fields into a text block, skipping any field left empty/unselected, e.g.:

```
Stack: Python + Django (backend), React (frontend)
Architecture: Front + Back
Base de données: PostgreSQL
```

This block is prepended to whatever the user typed in the free-text textarea (if anything), and the combined string is sent as the single `brief` argument to `createProjectContext(apiKey, projectId, brief)` — the exact same call and API contract as today. No changes to `schemas.py`, `context.py`, `generate_context_job`, or `prompts/context.md` on the backend.

If advanced mode is on but every field is left blank, the compiled block is empty and behavior is identical to advanced mode being off (no empty "Stack: \nArchitecture: \n..." noise sent).

## Testing

Component-level tests on `ProjectContextStep` (`__tests__/project-context-step.test.tsx`), following its existing conventions (`renderStep()` helper, `_pollIntervalMs={0}`):

- Checkbox off by default; toggling it reveals the Architecture select and Database select
- Selecting Architecture = Monolithe shows one Stack select; Front + Back shows two (Frontend, Backend); Front + Back + BFF shows three
- Selecting "Autre" on a stack select reveals a free-text input for that field, and that value (not the select's placeholder) ends up in the compiled brief
- Submitting with advanced fields filled and free text empty sends a `brief` to `createProjectContext` containing the compiled block and no leftover template noise
- Submitting with advanced fields filled AND free text filled sends both, compiled block first
- Submitting with the checkbox on but nothing selected behaves identically to the checkbox being off
- Unchecking the checkbox after filling fields drops those fields from the compiled brief on next submit

## Out of scope

- No backend/API changes (confirmed: purely additive text compiled client-side)
- No deployment field
- No persistence of the advanced-mode selections across sessions/visits — it's a one-shot input at generation time, not saved project settings
- No change to the "Modifier" button's direct content-editing behavior (editing the committed markdown text directly, via `loadExistingContent`) — advanced options only apply to the generation form, reached via "Régénérer"
