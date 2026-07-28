# App-Wide Copy Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove em-dashes and cliché "automatique/automatisé" hook-words from user-facing copy across the rest of the app (dashboard, wizard, settings, ticket timeline, page metadata), extending the voice rules already applied to the landing page.

**Architecture:** Pure content edits — 18 string replacements across 9 files. No new components, no logic changes, no new props.

**Tech Stack:** Next.js 14 App Router, Vitest + Testing Library.

## Global Constraints

- No em-dash (—) in any user-facing string — replace with period (independent clauses), comma/parentheses (short apposition), or middle dot (·) (label + short detail pairing, matching the landing page's existing "Aucune carte bancaire requise · Démarrez en 5 minutes" convention).
- Drop "automatique/automatisé" only where it's a vague hook-word (e.g. "vos projets automatisés"); leave it where it factually describes a mechanism in an already-technical context (e.g. `project-context-step.tsx:380`, which explains `.alexis/project.md` generation happens without user action — not a marketing claim).
- `app/projects/new/choice/page.tsx` is out of scope — it has unrelated uncommitted work from another task (a "Passer" button with its own em-dash); do not touch this file.
- Code comments (`//`, `/* */`) are out of scope — never user-facing.
- Confirmed via grep: no test in `__tests__/` asserts the exact substrings being changed below except three cases where the test regex matches only the *unchanged* leading portion of the string (`Connecté ✓`, `Transfert lancé vers`, `Légère itération en cours`) — those three keep passing untouched since the edits only change text *after* the matched prefix.

---

### Task 1: Remove em-dashes and cliché words from app-wide copy

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/dashboard/page.tsx`
- Modify: `app/projects/new/agent/page.tsx`
- Modify: `app/projects/new/repo/page.tsx`
- Modify: `app/dashboard/[id]/settings/page.tsx`
- Modify: `components/project-context-step.tsx`
- Modify: `components/issue-timeline.tsx`
- Modify: `components/context-advanced-options.tsx`
- Test: `__tests__/repo-step.test.tsx`, `__tests__/project-settings-page.test.tsx`, `__tests__/issue-timeline.test.tsx` (verification only, no edits expected — see Global Constraints)

**Interfaces:** None — self-contained content change, no other file imports these string constants.

- [ ] **Step 1: `app/layout.tsx` — title and meta description**

Replace:
```tsx
export const metadata: Metadata = {
  title: "Alexis — Développement automatisé",
  description: "Vos tickets pilotent un agent de code, du ticket au PR.",
};
```
with:
```tsx
export const metadata: Metadata = {
  title: "Alexis, agent de développement",
  description: "Une idée. Un projet livré. Alexis écrit le code, exécute les tests, et livre le résultat sur votre dépôt.",
};
```

- [ ] **Step 2: `app/dashboard/page.tsx` — page subtitle**

Replace:
```tsx
          <p className="mt-1 text-sm text-foreground-muted">
            Vue d&apos;ensemble de vos projets automatisés
          </p>
```
with:
```tsx
          <p className="mt-1 text-sm text-foreground-muted">
            Vue d&apos;ensemble de vos projets
          </p>
```

- [ ] **Step 3: `app/dashboard/page.tsx` — empty-state description**

Replace:
```tsx
            <p className="mt-2 max-w-sm text-sm text-foreground-muted">
              Créez un projet pour qu&apos;Alexis commence à traiter vos tickets automatiquement — avec votre propre dépôt, ou un dépôt hébergé par Alexis si vous n&apos;en avez pas.
            </p>
```
with:
```tsx
            <p className="mt-2 max-w-sm text-sm text-foreground-muted">
              Créez un projet pour qu&apos;Alexis commence à traiter vos tickets, avec votre propre dépôt, ou un dépôt hébergé par Alexis si vous n&apos;en avez pas.
            </p>
```

- [ ] **Step 4: `app/projects/new/agent/page.tsx` — managed-key hint**

Replace:
```tsx
              ? "Sans clé, Alexis utilise sa propre clé Anthropic pour traiter vos tickets — la facturation de l'usage agent est alors gérée par Alexis, séparément de votre abonnement."
```
with:
```tsx
              ? "Sans clé, Alexis utilise sa propre clé Anthropic pour traiter vos tickets. La facturation de l'usage agent est alors gérée par Alexis, séparément de votre abonnement."
```

- [ ] **Step 5: `app/projects/new/agent/page.tsx` — base URL hint**

Replace:
```tsx
                description="Laissez vide pour OpenAI. Pour OpenRouter : https://openrouter.ai/api/v1 — Pour Groq : https://api.groq.com/openai/v1. Aider utilisera cette URL à la place de l'endpoint OpenAI par défaut."
```
with:
```tsx
                description="Laissez vide pour OpenAI. Pour OpenRouter : https://openrouter.ai/api/v1. Pour Groq : https://api.groq.com/openai/v1. Aider utilisera cette URL à la place de l'endpoint OpenAI par défaut."
```

- [ ] **Step 6: `app/projects/new/repo/page.tsx` — connected-account status**

Replace:
```tsx
                  Connecté ✓ — compte&nbsp;: <span className="font-mono font-medium">{validatedAccount}</span>
```
with:
```tsx
                  Connecté ✓ · compte&nbsp;: <span className="font-mono font-medium">{validatedAccount}</span>
```

- [ ] **Step 7: `app/dashboard/[id]/settings/page.tsx` — secret field placeholder**

Replace:
```tsx
        placeholder={isConfigured ? "•••••• — laisser vide pour ne pas modifier" : placeholder}
```
with:
```tsx
        placeholder={isConfigured ? "•••••• (laisser vide pour ne pas modifier)" : placeholder}
```

- [ ] **Step 8: `app/dashboard/[id]/settings/page.tsx` — hosted-repo transfer explanation**

Replace:
```tsx
                      <p className="text-sm text-foreground-muted">
                        Ce dépôt vit sous l&apos;organisation GitHub Alexis. Tu peux le transférer vers ton propre
                        compte GitHub à tout moment — action définitive : Alexis n&apos;aura plus accès au repo une
                        fois le transfert accepté, et ce projet s&apos;arrêtera (plus de run automatique).
                      </p>
```
with:
```tsx
                      <p className="text-sm text-foreground-muted">
                        Ce dépôt vit sous l&apos;organisation GitHub Alexis. Tu peux le transférer vers ton propre
                        compte GitHub à tout moment. Action définitive : Alexis n&apos;aura plus accès au repo une
                        fois le transfert accepté, et ce projet s&apos;arrêtera (plus de run automatique).
                      </p>
```

- [ ] **Step 9: `app/dashboard/[id]/settings/page.tsx` — transfer success message**

Replace:
```tsx
                        <p className="text-sm font-medium text-success">
                          ✓ Transfert lancé vers <span className="font-mono">{transferredTo}</span> — vérifie ton
                          compte GitHub pour l&apos;accepter.
                        </p>
```
with:
```tsx
                        <p className="text-sm font-medium text-success">
                          ✓ Transfert lancé vers <span className="font-mono">{transferredTo}</span>. Vérifie ton
                          compte GitHub pour l&apos;accepter.
                        </p>
```

- [ ] **Step 10: `app/dashboard/[id]/settings/page.tsx` — managed-key hint (settings mirror of Step 4)**

Replace:
```tsx
                          ? "Sans clé, Alexis utilise sa propre clé Anthropic — facturation gérée par Alexis dans ce cas."
```
with:
```tsx
                          ? "Sans clé, Alexis utilise sa propre clé Anthropic. Facturation gérée par Alexis dans ce cas."
```

- [ ] **Step 11: `app/dashboard/[id]/settings/page.tsx` — base URL hint**

Replace:
```tsx
                        <p className="mt-1 text-xs text-foreground-subtle">
                          Laisse vide pour OpenAI. Groq : https://api.groq.com/openai/v1 — OpenRouter :
                          https://openrouter.ai/api/v1.
                        </p>
```
with:
```tsx
                        <p className="mt-1 text-xs text-foreground-subtle">
                          Laisse vide pour OpenAI. Groq : https://api.groq.com/openai/v1. OpenRouter :
                          https://openrouter.ai/api/v1.
                        </p>
```

- [ ] **Step 12: `app/dashboard/[id]/settings/page.tsx` — per-step model hint**

Replace:
```tsx
                      <p className="mb-2 text-xs text-foreground-subtle">
                        Doit correspondre au fournisseur de la clé ci-dessus (ex : claude-sonnet-4-5 pour
                        Anthropic, gpt-4o pour OpenAI). Avec Groq ou OpenRouter, préfixe le nom du modèle par{" "}
                        <code className="font-mono">groq/</code> ou{" "}
                        <code className="font-mono">openrouter/</code> — ex :{" "}
                        <code className="font-mono">groq/llama-3.3-70b-versatile</code>. Ces providers sont
                        gérés nativement, la Base URL ci-dessus n&apos;est alors pas utilisée.
                      </p>
```
with:
```tsx
                      <p className="mb-2 text-xs text-foreground-subtle">
                        Doit correspondre au fournisseur de la clé ci-dessus (ex : claude-sonnet-4-5 pour
                        Anthropic, gpt-4o pour OpenAI). Avec Groq ou OpenRouter, préfixe le nom du modèle par{" "}
                        <code className="font-mono">groq/</code> ou{" "}
                        <code className="font-mono">openrouter/</code>, ex :{" "}
                        <code className="font-mono">groq/llama-3.3-70b-versatile</code>. Ces providers sont
                        gérés nativement, la Base URL ci-dessus n&apos;est alors pas utilisée.
                      </p>
```

- [ ] **Step 13: `app/dashboard/[id]/settings/page.tsx` — project context file status**

Replace:
```tsx
                            {contextExists === null && "Vérification…"}
                            {contextExists === true && "Fichier présent — Alexis l'utilise à chaque run."}
                            {contextExists === false && "Absent — Alexis travaillera mieux avec ce fichier."}
```
with:
```tsx
                            {contextExists === null && "Vérification…"}
                            {contextExists === true && "Fichier présent. Alexis l'utilise à chaque run."}
                            {contextExists === false && "Absent. Alexis travaillera mieux avec ce fichier."}
```

- [ ] **Step 14: `components/project-context-step.tsx` — empty-repo form subtitle**

Replace:
```tsx
      Votre repo est vide ou tout nouveau. Décrivez votre projet en quelques phrases — stack
      souhaitée, objectif, contraintes — et Alexis génère{" "}
```
with:
```tsx
      Votre repo est vide ou tout nouveau. Décrivez votre projet en quelques phrases (stack
      souhaitée, objectif, contraintes) et Alexis génère{" "}
```

- [ ] **Step 15: `components/project-context-step.tsx` — textarea hint**

Replace:
```tsx
                    Stack technique, objectif principal, contraintes particulières — texte libre.
```
with:
```tsx
                    Stack technique, objectif principal, contraintes particulières. Texte libre.
```

- [ ] **Step 16: `components/issue-timeline.tsx` — in-progress status text**

Replace:
```tsx
                      Légère itération en cours — Alexis ajuste le travail.
```
with:
```tsx
                      Légère itération en cours. Alexis ajuste le travail.
```

- [ ] **Step 17: `components/context-advanced-options.tsx` — empty select option (appears twice)**

The file has two identical `<option value="">—</option>` lines (one in the `StackSelect` component around line 45, one further down around line 123 in a second select — read the file first to confirm both locations before editing, since `Edit` requires a unique match or `replace_all`). Use `replace_all: true` to change both in one edit:

Replace:
```tsx
        <option value="">—</option>
```
with:
```tsx
        <option value="">Non spécifié</option>
```

(If the second occurrence has different indentation, run the edit twice with the exact indentation for each instead of `replace_all`.)

- [ ] **Step 18: Run the three test files with partial-match assertions to confirm no regressions**

Run: `cd /Users/williams.de.souza/devhome/personal/alexis-front && npx vitest run __tests__/repo-step.test.tsx __tests__/project-settings-page.test.tsx __tests__/issue-timeline.test.tsx`
Expected: PASS, all tests — these assert only the unchanged leading portion of the strings touched in Steps 6, 9, 16 (`Connecté ✓`, `Transfert lancé vers`, `Légère itération en cours`)

- [ ] **Step 19: Run the full frontend suite**

Run: `cd /Users/williams.de.souza/devhome/personal/alexis-front && npx vitest run`
Expected: PASS, no regressions across all test files

- [ ] **Step 20: Grep-verify no em-dash remains in any touched file**

Run: `cd /Users/williams.de.souza/devhome/personal/alexis-front && grep -n "—" app/layout.tsx app/dashboard/page.tsx app/projects/new/agent/page.tsx app/projects/new/repo/page.tsx "app/dashboard/[id]/settings/page.tsx" components/project-context-step.tsx components/issue-timeline.tsx components/context-advanced-options.tsx`
Expected: no output for any of Steps 1-17's target lines (the grep may still match unrelated code comments in `project-context-step.tsx` — those are out of scope per Global Constraints, confirm any remaining hits are inside `//` or `/* */` comments, not JSX text/strings)

- [ ] **Step 21: Commit**

```bash
cd /Users/williams.de.souza/devhome/personal/alexis-front
git add app/layout.tsx app/dashboard/page.tsx app/projects/new/agent/page.tsx app/projects/new/repo/page.tsx "app/dashboard/[id]/settings/page.tsx" components/project-context-step.tsx components/issue-timeline.tsx components/context-advanced-options.tsx
git commit -m "content: drop em-dashes and cliché automation language app-wide"
```
