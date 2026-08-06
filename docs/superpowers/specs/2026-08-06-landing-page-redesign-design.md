# Landing page redesign — Design

## Contexte

`app/page.tsx` n'a pas changé de structure depuis sa dernière passe de copie (cf. `2026-07-25-landing-page-copy-design.md`, texte seul, refonte visuelle explicitement hors scope à l'époque). Depuis, le produit a nettement mûri (notifications temps réel, plans payants, clés gérées, timeline de ticket repensée, page Contexte dédiée) mais la landing reste la même composition : badge pill + blob gradient + H1 + CTA + faux screenshot de dashboard dans une fenêtre de navigateur, puis 5 étapes numérotées avec ligne de connexion, puis une grid de 4 cartes icône+titre+texte, puis un bandeau CTA sombre. C'est la structure par défaut qu'on obtiendrait pour n'importe quel produit SaaS — elle ne dit rien de spécifique à Alexis, et ne reflète pas ce qui a été construit.

Décision utilisateur : refonte des deux à la fois (structure ET message), en gardant les tokens de marque actuels (indigo `#4F46E5`, surfaces, `font-display`/`font-body`/`font-mono`) pour rester cohérent avec le dashboard — pas de rebrand.

## Angle

La page raconte le trajet d'**un ticket réel** à travers Alexis, plutôt que de le décrire depuis l'extérieur avec des cartes génériques. La colonne de gauche (sticky, desktop) est une timeline verticale reprenant **exactement** les colonnes du vrai Kanban produit (`components/ticket-kanban.tsx` → `COLUMNS`) : Backlog · Todo · Spec · Plan · Dev · To Merge · Done — mêmes libellés, même ordre. Le visiteur voit la mécanique réelle du produit avant de se connecter ; il retrouvera les mêmes mots une fois dans l'app.

Cet angle répond aux trois objections identifiées en amont sans les diluer dans un seul hero :
- **Confiance/contrôle** — les étapes Spec, Plan, Dev et To Merge affichent chacune un repère « Vous validez avant la suite » une fois que l'agent a fini son tour ; le contrôle humain devient visible dans la structure, pas juste affirmé dans une phrase.
- **Coût imprévisible** — l'étape Dev affiche un exemple de coût réel par ticket (format `0,42 €`), dans le même style mono que les coûts affichés en vrai dans le produit.
- **Complexité d'intégration** — l'étape Backlog/Todo mentionne explicitement le branchement sur un dépôt GitHub/GitLab existant (ou un dépôt hébergé si le visiteur n'en a pas — capacité déjà livrée).

## Hiérarchie de copie — inchangée, réutilisée telle quelle

La règle idée → projet → ticket posée dans `2026-07-25-landing-page-copy-design.md` reste en vigueur et **n'est pas rouverte** par cette passe :
- Le hero (badge, H1, sous-titre, CTA) continue de parler en **idée**/**projet**, jamais en ticket. H1 et sous-titre hero gardés tels quels (« Une idée. Un projet livré. » / « Décrivez ce qu'il faut faire… »).
- Le mot **ticket** redevient légitime à partir de la section pipeline (nouvelle version de « Comment ça marche »), exactement comme avant — c'est là que la phrase « Chaque projet est découpé en tickets » continue de vivre, juste au-dessus du rail.
- CTA banner de fin de page reste **« Créez votre premier projet »** (pas « premier ticket ») — la métaphore ticket vit dans la section pipeline, elle ne remonte pas dans les CTA de conversion qui parlent du niveau projet.
- Ton : zéro « automatique/automatisé/magique/révolutionnaire », zéro question rhétorique en CTA, mécanisme d'abord — règles reconduites sans changement.

## Structure de la page

```
Nav (components/landing-nav.tsx) — inchangée

── HERO ──
Badge pill + blob radial gradient → supprimés (générique).
H1 / sous-titre / CTA x2 / preuve sociale → inchangés (texte déjà validé).
LivePipelinePreview (fausse fenêtre de navigateur avec KPI + liste
tickets) → supprimé : son contenu (KPI, coût, liste tickets) est
désormais montré *en vrai*, intégré au rail plus bas, pas comme un
aperçu isolé avant que le mécanisme soit expliqué.
Remplacé par : un bandeau discret sous les CTA, une seule ligne mono,
qui affiche un identifiant de ticket suivi de son état, dans le même
format que les notifications produit (ex. `KARA-142 · Spec Review`).
Pas d'animation de frappe/typewriter — juste un texte statique réaliste,
pour rester dans la sobriété du ton déjà validé.

── PIPELINE (remplace "Comment ça marche" + la grid 4 value-props) ──
Éyebrow + titre + sous-titre : reprennent la logique de l'ancienne
section "Comment ça marche" (dont la phrase de hiérarchie
idée→projet→ticket), adaptés pour introduire le rail plutôt que la
grille à connecteurs.

Desktop (≥ lg) : deux colonnes.
  - Rail sticky (~240px) : 7 nœuds verticaux, un par colonne Kanban
    réelle (Backlog/Todo/Spec/Plan/Dev/To Merge/Done). Nœud actif
    (scroll-spy IntersectionObserver) en brand plein ; nœuds déjà
    dépassés en success ; nœuds à venir en gris (border/foreground-muted).
    Trait de connexion fin (1px, border), pas de dégradé.
  - Colonne contenu (flex-1) : un bloc par étape, dans l'ordre du rail.
    Chaque bloc = titre étape + 1-2 phrases mécanisme + éventuellement
    un repère "Vous validez avant la suite" (chip bordée, pas pleine,
    pour rester secondaire au texte) + une preuve concrète quand
    pertinent (coût sur Dev, dépôt existant/hébergé sur Todo).

Mobile (< lg) : une colonne. Le rail devient un stepper horizontal fin
(labels courts, pas de sticky) au-dessus de chaque bloc — même pattern
que la responsive déjà choisie pour `IssueTimelineRail` sur la page
détail ticket (cohérence intra-produit).

── CTA banner ── inchangé (fond sombre, "Créez votre premier projet",
"Avec ou sans dépôt existant…") — aucune modification de copie ici.

── Footer ── inchangé.
```

## Copie des étapes du rail

Mécanisme d'abord, présent pour l'action agent, pas de mot magique. Les 4 étapes avec gate affichent la chip "Vous validez avant la suite" ; Backlog/Todo n'en ont pas (rien à valider, c'est la capture initiale).

| Étape | Texte | Gate |
|---|---|---|
| Backlog | Le ticket est décrit, prêt à être pris en charge. Branché sur ton dépôt GitHub/GitLab existant — ou un dépôt hébergé si tu n'en as pas encore. | non |
| Todo | Le ticket est repris et passe en file d'exécution. | non |
| Spec | Alexis rédige une spécification fonctionnelle détaillée pour ce ticket. | oui |
| Plan | Alexis découpe le travail en étapes techniques concrètes. | oui |
| Dev | Alexis écrit le code, exécute les tests, itère jusqu'à ce que tout passe. Coût affiché en fin de run — ex. `0,42 €` ce ticket. | oui |
| To Merge | Rebase et merge sur ta branche de base, historique linéaire, sans commit de merge parasite. | oui |
| Done | Livré. Coût total et durée du ticket restent consultables depuis le tableau de bord. | non |

Ces textes sont un point de départ fidèle au mécanisme réel (cf. `README.md` pipeline, `orchestrator/domain/workflow/*.py`, `NotificationService._STATE_LABELS`) ; l'implémenteur peut affiner la formulation sans changer le sens, tant que les règles de ton (`2026-07-25-landing-page-copy-design.md`) sont respectées.

## Visuel

Conservé (tokens existants, pas de nouveau système) :
- Couleurs : `brand`/`brand-hover`/`brand-light`, `surface*`, `success`/`warning`/`danger` (pour les nœuds de rail dépassés/actifs, pas de nouvelle sémantique).
- Typo : `font-display` (Space Grotesk, titres), `font-sans`/Inter (corps), `font-mono`/JetBrains Mono (identifiants de ticket, coûts, états techniques) — inchangés.
- Rayons/ombres (`rounded-xl`, `shadow-card`) réutilisés là où il reste des cartes (blocs d'étape), pas de nouveau vocabulaire de composant.

Supprimé :
- Badge pill hero, blob radial gradient.
- `LivePipelinePreview` (fenêtre de navigateur factice) — supprimée en tant que composant hero ; son contenu (liste de tickets, coûts) n'est plus dupliqué ailleurs sur la page, le rail suffit.
- La grille 4 colonnes de value props à icône Heroicons — les propositions de valeur qu'elle portait (zéro config, multi-projets, coût transparent) sont maintenant portées par les étapes du rail directement, pas répétées dans une section séparée. Seule "Plusieurs projets, un seul tableau de bord" n'a pas de home naturelle dans le rail (le rail suit un ticket, pas un portefeuille de projets) : elle est réintégrée en une ligne courte dans le sous-titre de la section pipeline plutôt que de justifier une grille entière pour un seul message restant.

Nouveau, minimal :
- Nœuds de rail (petits cercles pleins/vides, ~10px) + trait de connexion 1px — pas de nouvelle bibliothèque d'icônes, pas d'illustration.
- Chip "Vous validez avant la suite" : `border border-border`, texte `text-foreground-muted`, pas de fond plein — reste secondaire visuellement au texte de mécanisme.

## Composants touchés

- `app/page.tsx` — reconstruction du hero (retrait badge/blob/LivePipelinePreview, ajout du bandeau ticker) et remplacement des sections "Comment ça marche" + value-props par la section pipeline à rail. CTA banner et footer inchangés dans le fichier.
- Nouveau composant `components/landing-pipeline-rail.tsx` (ou nom équivalent, au choix de l'implémenteur) : rail sticky + scroll-spy + les 7 blocs, extrait de `page.tsx` pour éviter un fichier monolithique — pattern déjà suivi ailleurs sur ce projet (`IssueTimelineRail` séparé de `IssueTimeline`).
- `LivePipelinePreview` (actuellement défini dans `app/page.tsx`) — supprimé, pas migré ailleurs.
- `PIPELINE_STAGES` / `VALUE_PROPS` (actuellement définis dans `app/page.tsx`) — remplacés par les données du tableau ci-dessus, colocalisées avec le nouveau composant de rail.
- `components/landing-nav.tsx`, `app/pricing/page.tsx`, footer — non touchés.

## Hors scope

- Page `/pricing`, nav, footer, flows login/signup — inchangés.
- Toute nouvelle capacité backend/API — page statique, données d'exemple only (comme l'était déjà `LivePipelinePreview`).
- Renommage des états Kanban réels — le rail *reprend* les libellés existants, ne les redéfinit pas.
- Dark mode — l'app entière est actuellement light-only (cf. tokens fixes dans `tailwind.config.ts`/`globals.css`), cette passe ne l'introduit pas.
- Réouverture des règles de ton/hiérarchie de copie validées le 2026-07-25 — reconduites telles quelles.
