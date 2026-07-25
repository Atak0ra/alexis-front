# Landing page copy — Design

## Contexte

`app/page.tsx` (alexis-front) utilisait un vocabulaire clichéesque — "Développement automatisé par IA", "Prêt à automatiser votre développement ?" — et du jargon technique ("PR") incompréhensible pour la cible principale (solopreneurs, agences de dev sans développeur dédié disponible). Le produit vend de la précision et du sérieux (coûts tracés par ticket, revue de code optionnelle mais explicite — cf. le toggle `code_review_enabled` livré cette session) ; la page d'accueil doit refléter ça plutôt que promettre de la magie.

## Scope

Cette passe touche uniquement `app/page.tsx` (landing publique, texte seul — pas de refonte visuelle). Le reste de l'app (dashboard, wizard de création, settings, vue tickets) garde son vocabulaire actuel et fait l'objet d'un spec séparé une fois ce ton validé sur un cas concret. Le Kanban et ses colonnes (Todo/Spec/Plan/Dev/Review/Done) ne sont pas touchés — ce sont des labels opérationnels internes, pas de la copie marketing.

## Ton

Repère : Linear/Stripe/Vercel — sobre, factuel, confiant sans emphase. Règles :
- Zéro "automatique", "automatisé", "magique", "révolutionnaire" — ces mots vendent un résultat sans expliquer le mécanisme, exactement ce qu'on veut éviter.
- Zéro question rhétorique en CTA ("Prêt à... ?") — remplacé par un impératif direct.
- Phrases courtes, mécanisme d'abord ("X fait Y"), pas de bénéfice émotionnel abstrait.

## Hiérarchie conceptuelle : idée → projet → ticket

Point clé de cadrage (corrigé après un premier brouillon qui ouvrait directement sur "ticket") : le mot d'entrée pour l'utilisateur est **idée** — ce qu'il a en tête, pas encore structuré. Une idée devient un **projet** dans le produit. Un projet est découpé en **tickets** (le grain de travail réel, celui qui porte le coût, la spec, le plan, le code).

Conséquence directe sur la copie : le haut de page (badge, H1, sous-titre hero, CTA) parle en termes d'**idée** et de **projet** — jamais de ticket à ce niveau, ça change le prisme (on ne vend pas "un outil de gestion de tickets", on vend "votre idée devient un projet livré"). Une fois la hiérarchie posée explicitement dans la section "Comment ça marche" (*"Chaque projet est découpé en tickets"*), le mot **ticket** redevient légitime dans le détail en dessous (étapes du pipeline, value props de mécanisme, coût par ticket) — parce qu'à ce stade de lecture, le lecteur sait déjà où le ticket se situe dans la hiérarchie.

## Double audience : technique et non-technique

Cible = solopreneurs (souvent sans repo de code, ne savent pas ce qu'est un "dépôt") **et** agences de dev (connaissent le vocabulaire technique). Règle appliquée : le haut de page (hero) reste agnostique — aucune mention de "dépôt"/"repo"/"PR" avant que le lecteur ait compris le principe général. Le détail technique (dépôt Git, PR optionnelle) n'apparaît que plus bas, dans "Comment ça marche" et les value props, où un lecteur technique va chercher la confirmation du mécanisme et un lecteur non-technique peut simplement ne pas s'y attarder sans perdre le message.

Concrètement, ça change le CTA final : *"Connectez votre premier projet"* supposait un dépôt existant à connecter — faux pour une partie de la cible (le produit héberge un dépôt privé automatiquement si l'utilisateur n'en a pas, fonctionnalité déjà livrée). Remplacé par *"Créez votre premier projet"* + *"Avec ou sans dépôt existant, votre projet est prêt en quelques minutes"* — couvre les deux cas explicitement plutôt que d'en présumer un.

## Copie — avant / après

| Emplacement | Avant | Après |
|---|---|---|
| Badge hero | Développement automatisé par IA | Agent de développement, pour solopreneurs et agences |
| H1 | Vos tickets, résolus automatiquement | Une idée. Un projet livré. |
| Sous-titre hero | Alexis connecte vos tickets à un agent de code. Du ticket à la PR mergée, sans intervention manuelle. Vous reviewez, vous validez. | Décrivez ce qu'il faut faire. Alexis structure le travail, l'exécute, teste le résultat, et le livre — avec ou sans relecture avant mise en ligne, selon vos réglages. |
| "Comment ça marche" — titre | Du ticket à la PR en 5 étapes | De l'idée au projet livré, en 5 étapes |
| "Comment ça marche" — sous-titre | Alexis prend en charge chaque ticket et avance de façon autonome jusqu'à la livraison. | Chaque projet est découpé en tickets. Chaque ticket passe par une spécification, un plan, une implémentation testée, avant la livraison. |
| Étape Todo | Le ticket est créé et attend d'être pris en charge par l'agent. | Le ticket est décrit et prêt à être pris en charge. |
| Étape Spec | Alexis analyse le ticket et rédige une spécification technique détaillée. | Alexis rédige une spécification technique détaillée pour ce ticket. |
| Étape Plan | L'agent décompose le travail en étapes concrètes et prépare son exécution. | L'agent décompose le travail en étapes concrètes. |
| Étape Dev | Alexis écrit le code, lance les tests et itère jusqu'à ce que tout passe. | *(inchangé)* |
| Étape Livraison | Une PR est ouverte, le ticket est mis à jour. Prêt à review. | Le code est livré sur votre dépôt, avec ou sans relecture selon vos réglages. |
| Value props — titre section | Conçu pour les équipes qui livrent vite | Pensé pour livrer sans y passer vos journées |
| Value prop 1 | Zéro configuration manuelle / description | *(inchangé)* |
| Value prop 2 — titre | Du ticket au PR en autonomie | Ticket → code testé → livré |
| Value prop 2 — desc | L'agent prend en charge le ticket, écrit le code, vérifie les tests et ouvre la PR. Vous n'avez qu'à valider. | L'agent écrit le code, exécute les tests, et livre le résultat sur votre dépôt. Vous validez avant que ça parte plus loin — ou pas, selon vos réglages. |
| Value prop 3 | Plusieurs projets, un seul tableau de bord / description | *(inchangé)* |
| Value prop 4 — desc | Chaque ticket affiche son coût d'exécution. Vous savez exactement ce que l'automatisation vous rapporte. | Chaque ticket affiche son coût réel. Vous savez ce que vous payez, ticket par ticket. |
| CTA banner — titre | Prêt à automatiser votre développement ? | Créez votre premier projet |
| CTA banner — desc | Connectez votre premier projet en moins de 5 minutes et laissez Alexis traiter vos tickets. | Avec ou sans dépôt existant, votre projet est prêt en quelques minutes. |

Non touchés : nav ("Connexion", "Commencer gratuitement"), CTA hero ("Créer un compte gratuit", "Se connecter"), preuve sociale ("Aucune carte bancaire requise · Démarrez en 5 minutes"), le mockup `LivePipelinePreview` (titres de tickets fictifs type "Webhooks GitHub pour les événements PR" — c'est un aperçu réaliste de produit, pas de la prose marketing, le jargon y est attendu).

## Hors scope

- Refonte visuelle (mise en page, couleurs, composants) — texte seul pour cette passe.
- Reste de l'app (dashboard, wizard, settings) — spec séparé après validation de ce ton sur la landing.
- Renommage des états Kanban (Todo/Spec/Plan/Dev/Review/Done) — labels opérationnels, pas de la copie marketing.
