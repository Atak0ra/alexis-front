# Filigrane d'icônes animées sur la landing page

**Date**: 2026-08-15
**Repos concernés**: `alexis-front` (front uniquement)

## Contexte

La landing page (`app/page.tsx`) a un hero et un CTA final visuellement
plats — aucun élément décoratif. Référence donnée par l'utilisateur :
`demo.smartbtp.rakostech.com`, dont le hero utilise un canvas JS (grille
blueprint + particules qui dérivent + icônes ligne qui apparaissent et
disparaissent en boucle, position random, couleur brand à faible opacité,
désactivé sur mobile).

Demande : un filigrane du même esprit (icônes qui « apparaissent
disparaissent »), sur le thème solo-dev / code / idées, sans reproduire
tout le mécanisme du site de référence (pas de grille, pas de particules —
hors scope, voir plus bas).

## Décisions

1. **Nouveau composant** `components/landing-icon-field.tsx` :
   - Props : `variant: "light" | "dark"`.
   - Rend 6 icônes `lucide-react` (déjà utilisé ailleurs dans le projet,
     pas de SVG custom à dessiner/maintenir) : `Code2`, `Lightbulb`,
     `GitBranch`, `Terminal`, `Sparkles`, `Rocket`.
   - Positions et tailles fixes, codées en dur dans un tableau `SPOTS`
     (top/left en %, taille 26–44px), une par icône — éparpillées pour ne
     pas se chevaucher avec le texte central.
   - Chaque icône a son propre `animationDelay` (0–6s) et
     `animationDuration` (8.5–11s) → désynchronisées, jamais toutes
     visibles en même temps, pas de logique JS de spawn/despawn.
   - `aria-hidden="true"`, `pointer-events-none`, `hidden lg:block`
     (désactivé sous le breakpoint `lg`, comme la référence sur mobile —
     pas de valeur ajoutée sur petit écran et risque de gêner le texte).

2. **Animation CSS pure** — nouveau keyframe `watermark-fade` ajouté dans
   `tailwind.config.ts` (`extend.keyframes` / `extend.animation`) :
   opacité `0 → 1 (hold) → 0`, `ease-in-out infinite`. Pas de JS
   d'animation (pas de canvas, pas de `requestAnimationFrame`).
   - `@media (prefers-reduced-motion: reduce)` : animation coupée, icônes
     figées à une opacité basse fixe (~0.12) dans `app/globals.css`.

3. **Couleurs par variant** :
   - `light` (hero, fond `bg-surface`) : `text-brand/15`.
   - `dark` (CTA final, fond `bg-foreground`) : `text-white/10`.

4. **Intégration dans `app/page.tsx`** :
   - Section hero (déjà `relative overflow-hidden`) : `<LandingIconField
     variant="light" />` en premier enfant de la section ; le wrapper de
     contenu existant (`div.mx-auto flex...`) passe en `relative z-10`
     pour rester au-dessus du filigrane.
   - Section CTA final (`border-t border-border bg-foreground`, pas
     encore `relative overflow-hidden`) : ajout de ces deux classes, puis
     `<LandingIconField variant="dark" />` en premier enfant ; le wrapper
     de contenu passe en `relative z-10`.

## Hors périmètre

- Grille blueprint et particules qui dérivent (partie du mécanisme de
  référence, pas demandée — le besoin exprimé est uniquement « icônes qui
  apparaissent disparaissent »).
- Toute logique JS d'animation (canvas, `requestAnimationFrame`, spawn
  random) — écarté au profit de CSS pur, plus simple à maintenir dans une
  stack Next.js/Tailwind et sans coût de perf runtime.
- Application du filigrane à d'autres pages (`/pricing`, `/how-it-works`,
  dashboard) — seulement hero + CTA final de la landing.
- Rendu sur mobile/tablette (`< lg`) — composant caché, pas de version
  allégée spécifique demandée.

## Tests

- Pas de test unitaire dédié — composant purement décoratif, statique en
  SSR (les positions/délais sont fixes, pas de state), animation en CSS
  pur sans logique à couvrir.
- Vérification manuelle visuelle (hero clair + CTA sombre, desktop et
  `prefers-reduced-motion`) après implémentation.
