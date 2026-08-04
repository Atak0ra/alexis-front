# Issue timeline redesign

## Problem

`components/issue-timeline.tsx`, rendered on `app/dashboard/[id]/issues/[issueId]/page.tsx`, is a single long vertical left-rail stepper (4 fixed steps: Demandé/Analyse/En développement/Terminé) confined to a `max-w-4xl` centered column. The active step expands into one big card holding description, dates, comment list, and a chat textarea + action buttons all stacked together. The result reads as a long, cramped, generic-looking column dominating the page center — not the redesign a shipped product deserves.

User feedback pinpointed three issues:
1. Column too narrow/long (everything stacked in one `max-w-4xl` scroll)
2. The stepper style itself (dot-and-line rail) looks templated
3. The active-step card is overloaded (description + comments + chat + buttons all in one block)

## Approach

Move from a single centered vertical stack to a two-column layout:

- **Left rail** (compact, sticky, ~260px): 4 steps as dot + label only, no embedded content. `done`, `current`, and `attention` steps are clickable; `upcoming` is greyed out and inert. Clicking a step selects it and drives the right panel.
- **Right panel** (flex-1, wide): content depends on the selected step's status:
  - **Selected step is current/attention** (there is always at most one): two tabs, **Aperçu** (description, dates, attention warning if applicable) and **Discussion** (comment list + chat textarea + action buttons, or just the Relancer button on failure, or an "Aucune activité" placeholder — same conditions as today).
  - **Selected step is done** (a past step): a simple "Terminé" summary card. No comment replay — `issue.comments` is a flat list for the whole issue with no per-step attribution or step-transition timestamps in the API today, so filtering comments by step would be fabricated precision. This is a known backend gap; out of scope here.
  - **Selected step is upcoming**: not reachable (rail item is inert), no panel state needed.

Default selection on page load: the current/attention step (today's default focus).

### Responsive behavior

Below the `lg` breakpoint, the rail collapses from a sticky sidebar into a horizontal row of pills above the content panel (no sticky positioning needed at that width).

### Page width

Container widens from `max-w-4xl` to `max-w-6xl` to give the two-column layout room. Header (title + identifier) and the asset upload grid (`AssetUploadGrid`) stay full-width above the two-column area, unchanged in placement.

### Business logic — unchanged

All existing behavior carries over as-is, just relocated into the new structure:
- Chat send + 2s polling loop (`sendIssueChat`, `getIssueChatStatus`)
- Régénérer / Valider (`handleRegenerate`, `handleValidate`) — visible only when `inReview`
- Relancer (`handleRetry`) — visible when `!inReview && retryTargetState`
- `getIssueSteps` / `STEP_GROUPS` continue to derive step status; no backend or `lib/issue-steps.ts` changes

## Components

- `components/issue-timeline.tsx` — restructured into the rail + panel layout described above. Internal split likely becomes a rail sub-component and a panel sub-component (with the two tabs) inside the same file or extracted, implementer's call at plan time — no behavior change to justify prescribing file boundaries here.
- `app/dashboard/[id]/issues/[issueId]/page.tsx` — container width change (`max-w-4xl` → `max-w-6xl`); asset grid and header stay where they are, only the wrapper around `IssueTimeline` needs adjusting for the new width.
- `__tests__/issue-timeline.test.tsx` — existing tests cover step status rendering and (presumably) chat/action flows; they'll need updates for the new DOM structure (tab panels, selected-step state) while preserving behavioral coverage. No new test infra needed.

## Out of scope

- Per-step comment history (needs backend step-transition data, not just frontend work)
- Changing asset upload grid placement or behavior
- Changing the underlying state machine / `lib/issue-steps.ts` step derivation
