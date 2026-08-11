# Explication de la facturation sur la landing page + correction /pricing

**Date**: 2026-08-12
**Repos concernés**: `alexis-front` (front) et `Alexis` (orchestrator, backend)

## Contexte

La landing page (`app/page.tsx` dans alexis-front) ne dit rien sur la
facturation — un visiteur doit cliquer sur "Tarifs" dans la nav pour
découvrir `/pricing`. Cette page `/pricing` existe déjà, fetch les plans
publics via `GET /plans`, mais présente un modèle obsolète : plans "Solo
Preneur" et "Entreprise" affichés avec un prix mensuel fixe (199$ et 499$)
alors que le vrai modèle économique actuel est un **wallet prépayé
pay-as-you-go** (`orchestrator/domain/wallet_service.py`) :

- Chaque run débite `provider_cost_usd × margin_multiplier` (marge interne,
  jamais exposée — `AppSetting.margin_multiplier`, défaut 3.0, réglable via
  `PATCH /admin/pricing/margin`).
- Le solde (`Wallet.balance_usd`) n'est aujourd'hui rechargé que
  manuellement par un admin (`POST /admin/pricing/topup`) — pas de paiement
  self-service (Stripe prévu mais pas branché).

Le vrai modèle produit à date (confirmé par l'utilisateur) :

| Plan | Prix fixe | Différenciateur |
|---|---|---|
| `free` (Découverte) | 0$ | Crédit d'essai offert, sans CB |
| `byok` | 29$/mois | Seul plan à prix fixe — clé d'inférence perso, abonnement plateforme (infra/tracker/hébergement) |
| `solo` (Solo Preneur) | 0$ (plus de 199$) | Pay-as-you-go, `max_members = 1` |
| `entreprise` | 0$ (plus de 499$) | Pay-as-you-go, `max_members` illimité (équipe) |

## Décisions

1. **Backend** : migration Alembic qui met `solo.monthly_price_usd` et
   `entreprise.monthly_price_usd` à `0`, et met à jour leurs `description`
   pour retirer toute mention de prix fixe. Pas de changement de schéma —
   `max_members` existe déjà et porte la différenciation solo (1) vs
   entreprise (illimité/NULL).
2. **Front `/pricing`** : la logique `isFree = monthly_price_usd === 0`
   matcherait désormais aussi solo/entreprise → distinction refaite sur
   `plan.name`, pas sur le prix :
   - `free` → carte "Gratuit" (essai), inchangée.
   - `solo` / `entreprise` → nouveau traitement "Payez à l'usage" : pas de
     `$X/mois`, badge pay-as-you-go + ligne dérivée de `max_members`
     (`"1 membre"` si `max_members === 1`, sinon `"Membres illimités"`).
   - `byok` → inchangé, seul prix fixe affiché (`$29/mois`).
   FAQ réécrite : retire "199€/mois" et "à partir de 499€/mois", explique le
   wallet (recharge, débit à l'usage réel mesuré par run, pas d'abonnement
   sauf BYOK). Corrige `€` → `$` dans le paragraphe BYOK pour cohérence avec
   le reste de l'app (le wallet dashboard affiche déjà en `$`).
3. **Front landing (`app/page.tsx`)** : nouvelle section statique "Comment
   fonctionne la facturation", insérée entre la section Pipeline et le CTA
   banner. Trois blocs, pas de fetch API (les chiffres réels sont
   admin-configurables et déjà affichés en détail sur `/pricing` — éviter
   toute désynchronisation) :
   1. **Essai gratuit** — créez un compte, crédit offert, sans CB.
   2. **Payez à l'usage** — wallet prépayé, débité au run réel, pas
      d'abonnement forcé.
   3. **BYOK** — connectez votre clé, payez votre provider directement +
      abonnement plateforme fixe.
   CTA "Voir le détail des tarifs" → `/pricing`.

## Hors périmètre

- Intégration Stripe / self-service topup (mentionné comme futur dans
  `admin_pricing.py`, non traité ici).
- Changement du montant du crédit d'essai gratuit ou du multiplicateur de
  marge (restent pilotables via l'admin existant).
- Renommage/suppression des plans `standard`/`unlimited` (déjà
  `is_public=False`, non affichés, hors sujet).

## Tests

- Backend : test migration (upgrade/downgrade) sur `solo`/`entreprise`
  price + description.
- Front : pas de test existant pour `/pricing` (public) — nouveau
  `__tests__/pricing-page.test.tsx` couvrant la carte pay-as-you-go
  (solo/entreprise) vs `free` vs `byok`. `__tests__/root-page.test.tsx`
  existant à étendre pour la nouvelle section landing (présence du texte,
  lien vers `/pricing`).
