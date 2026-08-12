export const AGENT_TEMPLATE = `# Template CLAUDE.md / CONVENTIONS.md / AGENT.md

> Point de départ pour le fichier de règles qu'Alexis lit à la racine de
> votre projet (CLAUDE.md pour Claude Code, CONVENTIONS.md pour aider, ou
> AGENT.md pour un autre agent). Copiez ce qui est pertinent, adaptez,
> gardez court : ce fichier est relu en entier à CHAQUE run (spec, plan,
> dev), pas une seule fois. Même principe que .alexis/project.md : un
> index de règles, pas une documentation exhaustive. Référencez un fichier
> plutôt que d'y recopier son contenu si une règle a besoin de détail.

## Convention de nommage Git (obligatoire pour qu'Alexis fonctionne)

| Élément | Format | Exemple |
|---|---|---|
| Branche | feat/{identifier}/{slug} | feat/PROJ-42/user-auth |
| Commit | Conventional Commits avec scope | feat(PROJ-42): add user auth |
| PR base | develop (jamais main) | |

Alexis retrouve la branche feature par le pattern feat/{identifier}/*
pour merger. Si la branche ne suit pas ce pattern, le merge échoue.

## Ce qu'Alexis ne fait jamais

- Ne crée pas de PR quand la revue de code est désactivée pour ce projet,
  le code part directement sur develop.
- Ne touche jamais votre tracker de tickets en dehors du workflow normal.
- Ne fait jamais de git push --force (--force-with-lease réservé à
  l'étape merge d'Alexis).

## Vos conventions

[Nommage, style de code, structure des dossiers, ce qui est interdit —
bullet points courts.]

## Tests / build

[Comment lancer les tests et le build chez vous — une ligne, pas un
tutoriel complet.]
`;
