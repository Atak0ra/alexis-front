# Refonte vue intérieure projet — liste client + timeline (design)

## Contexte

`app/dashboard/[id]/page.tsx` affiche aujourd'hui un Kanban technique
(`components/kanban-board.tsx`) sur les états dev bruts définis par
`lib/project-defaults.ts` (`DEFAULT_STATES`, 14 clés : backlog, todo,
spec, spec_review, spec_failed, plan, plan_review, plan_failed, dev,
dev_review, dev_failed, to_merge, to_merge_failed, done). Cette vue est
destinée à des développeurs, pas aux utilisateurs finaux d'Alexis
(solopreneurs, porteurs de projet non-tech).

Note : le `COLUMN_ORDER` actuel de `kanban-board.tsx` n'en liste que 12
(il oublie `dev_review` et `to_merge_failed`, qui n'apparaissent donc
dans aucune colonne aujourd'hui). Le nouveau mapping ci-dessous corrige
cet oubli et couvre les 14 clés.

Cette refonte remplace le Kanban par :
1. une **liste de demandes** lisible et épurée
2. une **timeline verticale à 4 étapes** par demande, sur une page dédiée

Le thème visuel de toute l'application passe en sombre (slate) avec un
accent indigo/violet — pas de vert : "le vert crie trop" pour cette
identité de marque.

## Palette (remplace `tailwind.config.ts` + `app/globals.css`)

```
surface:            slate-950  #020617   fond de page
surface-raised:      slate-900  #0F172A   cards, rangées, modals
surface-sunken:      slate-800  #1E293B   inputs, hover, badges neutres
border:              slate-800  #1E293B
border-strong:        slate-700  #334155
foreground:            slate-50  #F8FAFC
foreground-muted:      slate-400 #94A3B8
foreground-subtle:     slate-600 #475569

brand (accent):       indigo-500 #6366F1
brand-hover:            indigo-400 #818CF8
brand-light (glow bg):  indigo-500/10
brand-muted (depth):    violet-600 #7C3AED  — dégradé subtil sur pulsation "en cours"

warning: amber-500 #F59E0B  — étapes en "attention" (ex-états _failed)
danger:  red-500   #EF4444  — actions destructives uniquement (désactiver projet)
success: conservé (`#16A34A` / bg / border) pour compat API/KPI, non utilisé
          comme accent de timeline (pas de vert dans l'UI de progression)
```

Ces tokens remplacent les valeurs actuelles (indigo clair sur fond
`surface: #F8FAFC`) dans `tailwind.config.ts` et `app/globals.css`
(`body { background-color; color }`, scrollbar-thin).

**Portée** : le thème sombre s'applique à toute l'app (header, liste
projets, login, wizard `projects/new/*`), pas seulement à la page projet,
pour éviter un flash clair→sombre en navigant. Comme le code utilise déjà
des tokens sémantiques (`bg-surface`, `text-foreground-muted`, etc.)
partout sauf quelques exceptions, le retheme est en grande partie un
changement de valeurs de tokens. Exceptions à corriger manuellement :
- `components/ui/button.tsx:14` — `hover:bg-red-700` en dur → remplacer
  par un token `danger-hover`
- `app/login/page.tsx` (bg-white décoratifs), `components/project-context-card.tsx`
  (bg-black en modal overlay, à garder tel quel — c'est un overlay, pas un
  fond de contenu) — vérifier au cas par cas pendant l'implémentation que
  le contraste reste correct sur fond sombre

## Mapping des états → 4 étapes client

```
1. Demandé          ← backlog, todo
2. Analyse            ← spec, spec_review, spec_failed, plan, plan_review, plan_failed
3. En développement  ← dev, dev_review, dev_failed
4. Terminé            ← to_merge, to_merge_failed (étape courante, pulse), done (complété)
```

Règles d'affichage par étape :
- **Étapes passées** (avant l'étape courante) : point plein indigo, coche,
  libellé en `foreground`.
- **Étape courante** : point indigo avec pulsation (`animate-pulse`
  discrète, halo `brand-light`/dégradé vers `brand-muted`). Si l'état brut
  sous-jacent se termine par `_failed`, le point passe en **ambre**
  (`warning`) avec une icône alerte fine (lucide `AlertTriangle` ou
  `RotateCcw`) au lieu du check — texte contextualisé du type "légère
  itération en cours", jamais alarmiste, jamais rouge.
- **Étapes futures** : point creux, libellé `foreground-subtle`, pas
  d'animation.

`to_merge` reste "étape courante" (pulse) tant que l'état n'est pas
`done` — le passage à `done` illumine l'étape 4 en complet (coche pleine,
pas de CTA).

## Composants

### `components/issue-list.tsx` (nouveau, remplace `kanban-board.tsx`)

Liste verticale de rangées (pas de grille de cartes, pas de drag & drop).
Chaque rangée :
- titre de l'issue (tronqué une ligne)
- badge d'étape coloré selon la règle ci-dessus (texte : "Demandé" /
  "Analyse" / "En développement" / "Terminé")
- 4 mini-points de progression (même code couleur que la timeline, en
  miniature) donnant un aperçu visuel immédiat de l'avancement
- date relative (`updated_at`)
- chevron `lucide-react` `ChevronRight`

Clic sur une rangée → navigation vers
`/dashboard/${projectId}/issues/${issue.id}`.

Le bouton d'en-tête `[ + Demander une modification ]` (déjà existant sous
le nom "Nouveau ticket" dans `app/dashboard/[id]/page.tsx`) est conservé
au même endroit, rethemé en indigo (`bg-brand hover:bg-brand-hover`,
transition `transition-all duration-300`), avec l'icône `Plus` de
`lucide-react` et le libellé renommé "Demander une modification".

La modale de création (`NewIssueModal`, actuellement inline dans
`app/dashboard/[id]/page.tsx`) est rethemée sur les nouveaux tokens
(fond `surface-raised`, `rounded-2xl`, champs `rounded-xl`, focus ring
indigo) — reste dans le même fichier, pas d'extraction nécessaire.

### `app/dashboard/[id]/issues/[issueId]/page.tsx` (nouveau)

Page dédiée. Récupère les issues via `listIssues(apiKey, projectId)`
(pas de `getIssue` unitaire dans l'API actuelle) et trouve celle dont
`id === issueId`. Affiche :
- fil d'ariane / lien retour vers `/dashboard/${projectId}`
- titre + description de l'issue
- `<IssueTimeline issue={issue} onCommentAdded={...} />`

Gère les états de chargement (skeleton) et "issue introuvable" (404
local, lien retour) sur le même modèle que `ProjectDetailPage`.

### `components/issue-timeline.tsx` (nouveau)

Timeline verticale à 4 étapes (icônes fines `lucide-react` : `Inbox`,
`Search`, `Code2`, `CheckCircle2` alignées sur la ligne verticale).
Sous l'étape active :
- description de l'issue
- liste des commentaires existants (`issue.comments`, triés par
  `created_at`)
- formulaire "Ajouter un commentaire" : textarea + bouton indigo
  (`bg-brand hover:bg-brand-hover`), appelle
  `createIssueComment(apiKey, projectId, issueId, body)`, optimistic
  append à la liste locale

Micro-transitions `transition-all duration-300` sur : changement d'état
des points de timeline, hover des boutons, apparition du contenu
d'étape. Pas de CTA d'action supplémentaire (pas d'approbation manuelle
dans ce flux) — le seul geste utilisateur possible est le commentaire.

### `app/dashboard/[id]/page.tsx` (modifié)

- Retire `<KanbanBoard issues={...} states={...} .../>` et l'import
  correspondant
- Insère `<IssueList issues={issues} projectId={projectId} />` à la
  même place
- Conserve la KPI strip (rethemée sur les nouveaux tokens), le bandeau
  de contexte projet, le header projet, la modale de création — logique
  de fetch (`getProject`, `getProjectStats`, `listIssues`,
  `getProjectContext`) inchangée

### `components/kanban-board.tsx`

Supprimé. Le drag & drop entre colonnes n'a plus de sens dans une liste
client — le changement d'état est piloté par le backend/agent, pas par
l'utilisateur final.

### Dépendances

`package.json` — ajoute `lucide-react` (icônes minimalistes utilisées
partout : `Plus`, `ChevronRight`, `Inbox`, `Search`, `Code2`,
`CheckCircle2`, `AlertTriangle`, `X`). Les SVG inline existants
(`SettingsIcon` dans `app/dashboard/[id]/page.tsx`, icônes de
`NewIssueModal`) sont remplacés par leurs équivalents `lucide-react` par
cohérence.

## Hors scope

- Pas de refonte du wizard `projects/new/*` au-delà du retheme de
  tokens (pas de nouveaux champs/écrans)
- Pas de `getIssue` unitaire ajouté côté API — la page détail réutilise
  `listIssues` et filtre côté client
- Pas de drag & drop ni de changement d'état manuel par l'utilisateur
  final
- Les KPI (`resolved`, `in_progress`, `failed`, `total_cost_usd`)
  gardent leur logique actuelle, seul le style change
