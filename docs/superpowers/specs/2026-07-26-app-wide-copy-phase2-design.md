# App-wide copy pass — phase 2 — Design

## Contexte

Suite de [[2026-07-25-landing-page-copy-design]] (landing page). Voix déjà tranchée : sobre, factuelle, zéro "automatique/automatisé/magique/révolutionnaire" en accroche, hiérarchie idée → projet → ticket, zéro tiret cadratin (—) dans tout texte destiné à l'utilisateur (retour explicite : "typique IA"). Cette passe applique ces règles au reste de l'app (dashboard, wizard de création, settings, timeline de ticket) — pas de nouvelle décision de ton, juste application.

## Scope

Fichiers touchés : `app/layout.tsx` (title + meta description), `app/dashboard/page.tsx`, `app/projects/new/agent/page.tsx`, `app/projects/new/repo/page.tsx`, `app/dashboard/[id]/settings/page.tsx`, `components/project-context-step.tsx`, `components/issue-timeline.tsx`, `components/context-advanced-options.tsx`.

Exclu : `app/projects/new/choice/page.tsx` — contient un tiret cadratin dans un bouton ("Passer — Alexis créera un dépôt hébergé"), mais ce bouton fait partie d'un travail en cours non commité d'une autre tâche (`git status` le montre modifié, hors scope de cette session) — ne pas y toucher pour ne pas interférer avec ce travail.

Exclu aussi : commentaires de code (`//`, `/* */`) contenant des tirets cadratins — jamais vus par un utilisateur, hors scope d'une passe de copie produit. Le Kanban (labels Todo/Spec/Plan/Dev/Review/Done) reste inchangé, comme en phase 1.

## Règle appliquée : tiret cadratin → point, virgule, ou point médian

Remplacement au cas par cas selon la structure de la phrase :
- Deux propositions indépendantes → point (nouvelle phrase).
- Apposition/clarification courte → virgule ou parenthèses.
- Association label + détail courte (ex : "Connecté ✓ — compte : X") → point médian (·), déjà utilisé sur la landing page ("Aucune carte bancaire requise · Démarrez en 5 minutes").
- Option vide de select ("—" seul) → mot explicite ("Non spécifié").

"Automatique/automatisé" n'est retiré que là où il sert d'accroche vague (ex : "vos projets automatisés", "traiter vos tickets automatiquement" en description d'accroche) — laissé tel quel là où il décrit un mécanisme précis en contexte déjà technique (ex : `project-context-step.tsx:380`, qui explique que la génération du fichier `.alexis/project.md` se fait sans action de l'utilisateur — description factuelle, pas une promesse marketing).

## Copie — avant / après

Voir le tableau validé en conversation (18 remplacements sur 9 fichiers) — reproduit intégralement dans le plan d'implémentation pour exécution, un remplacement par fichier/ligne avec le contexte exact.

## Hors scope

- Refonte visuelle.
- Renommage du Kanban.
- `choice/page.tsx` (WIP non commité d'une autre tâche).
- Commentaires de code.
