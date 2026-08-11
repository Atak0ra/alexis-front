# Landing Billing Explanation + Pay-As-You-Go Pricing Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Explain Alexis's real billing model (pay-as-you-go wallet, BYOK flat fee) on the public landing page, and fix `/pricing` which still shows obsolete fixed prices (199$/499$) for `solo`/`entreprise`.

**Architecture:** Two repos, three tasks. Task 1 (backend, `Alexis` repo) zeroes the fixed price on `solo`/`entreprise` via an Alembic migration and rewrites their `description`/`features` to drop fixed-fee language. Tasks 2–3 (frontend, `alexis-front` repo) adjust `/pricing`'s card logic to stop deriving "free" from price and show a pay-as-you-go treatment for `solo`/`entreprise`, then add a new static section to the landing page.

**Tech Stack:** Python/FastAPI/SQLAlchemy/Alembic (backend), Next.js/React/TypeScript/Vitest + Testing Library (frontend).

## Global Constraints

- Only `byok` keeps a fixed `monthly_price_usd` (29). `free`, `solo`, `entreprise` are all `0` (pay-as-you-go or trial).
- Plan differentiator between `solo` and `entreprise` is `max_members` (1 vs unlimited/NULL), never price.
- Currency symbol in all new/edited front copy is `$` (matches the wallet dashboard, which already shows `$`) — never `€`.
- No Stripe / self-service top-up work. Wallet recharge stays admin-manual (`POST /admin/pricing/topup`) — copy must not promise self-service card payment.
- `margin_multiplier` (default 3.0, `AppSetting`) and `monthly_max_budget_usd` caps are untouched — out of scope.
- Landing page section is static (no `/plans` fetch) — real numbers live on `/pricing` only, avoids drift.
- Register: "vous" throughout new French copy, never "tu/ton/ta/tes" (enforced by existing `root-page.test.tsx` test).
- Two separate git repos: backend work happens in `~/devhome/personal/Alexis`, frontend work in `~/devhome/personal/alexis-front` (this repo). Commit each task in its own repo.

---

### Task 1: Backend migration — zero the fixed price on `solo`/`entreprise`

**Repo:** `~/devhome/personal/Alexis`

**Files:**
- Create: `orchestrator/alembic/versions/0037_pay_as_you_go_pricing.py`
- Test: `tests/orchestrator/test_migrations.py` (append)

**Interfaces:**
- Consumes: existing `plans` table, columns `name`, `monthly_price_usd`, `description`, `features` (all already present since migration `0026_plan_price_usd`).
- Produces: after `alembic upgrade head`, `solo.monthly_price_usd == 0` and `entreprise.monthly_price_usd == 0`, with `description`/`features` rewritten (no more "199", "499", "Tarif sur devis", or "Budget inférence ... inclus"). Consumed by Task 2 (front reads these via `GET /plans` → `PlanPublicOut`).

- [ ] **Step 1: Write the failing test**

Append to `tests/orchestrator/test_migrations.py`:

```python
def test_solo_and_entreprise_have_no_fixed_price_after_migration_0037(tmp_path, monkeypatch):
    """Migration 0037 doit mettre monthly_price_usd à 0 pour solo et entreprise —
    ce sont des plans pay-as-you-go, plus de prix fixe (ancien 199$/499$)."""
    db_path = tmp_path / "migrated.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "orchestrator/alembic.ini", "upgrade", "head"],
        capture_output=True, text=True,
        env={**os.environ, "DATABASE_URL": f"sqlite:///{db_path}"},
    )
    assert result.returncode == 0, result.stderr

    from sqlalchemy import create_engine, text

    engine = create_engine(f"sqlite:///{db_path}")
    with engine.connect() as conn:
        solo = conn.execute(text("SELECT monthly_price_usd, description, features FROM plans WHERE name = 'solo'")).fetchone()
        entreprise = conn.execute(text("SELECT monthly_price_usd, description, features FROM plans WHERE name = 'entreprise'")).fetchone()

    assert solo[0] == 0
    assert "199" not in (solo[1] or "")
    assert "199" not in (solo[2] or "")
    assert "inclus" not in (solo[2] or "").lower()

    assert entreprise[0] == 0
    assert "499" not in (entreprise[1] or "")
    assert "devis" not in (entreprise[1] or "").lower()


def test_migration_0037_downgrade_restores_original_pricing(tmp_path, monkeypatch):
    """Downgrade vers 0036 doit restaurer les prix fixes d'origine (199/499)."""
    db_path = tmp_path / "migrated.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")

    subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "orchestrator/alembic.ini", "upgrade", "head"],
        capture_output=True, text=True,
        env={**os.environ, "DATABASE_URL": f"sqlite:///{db_path}"},
    )
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "orchestrator/alembic.ini", "downgrade", "0036"],
        capture_output=True, text=True,
        env={**os.environ, "DATABASE_URL": f"sqlite:///{db_path}"},
    )
    assert result.returncode == 0, result.stderr

    from sqlalchemy import create_engine, text

    engine = create_engine(f"sqlite:///{db_path}")
    with engine.connect() as conn:
        solo_price = conn.execute(text("SELECT monthly_price_usd FROM plans WHERE name = 'solo'")).scalar()
        entreprise_price = conn.execute(text("SELECT monthly_price_usd FROM plans WHERE name = 'entreprise'")).scalar()

    assert solo_price == 199
    assert entreprise_price == 499
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/devhome/personal/Alexis && source venv/bin/activate && python -m pytest tests/orchestrator/test_migrations.py -k "0037" -v`
Expected: FAIL — `solo[0] == 0` fails (actual value is `199`), because migration 0037 doesn't exist yet (head is still 0036).

- [ ] **Step 3: Write the migration**

Create `orchestrator/alembic/versions/0037_pay_as_you_go_pricing.py`:

```python
"""Pay-as-you-go pricing — solo/entreprise n'ont plus de prix fixe

Revision ID: 0037
Revises: 0036
Create Date: 2026-08-12

Contexte : le vrai modèle économique est un wallet prépayé (cf. migration
0035, WalletService.debit) — provider_cost_usd × margin_multiplier, débité
au run réel. Les plans solo (199$/mois) et entreprise (499$/mois) affichaient
encore un prix fixe hérité d'un ancien modèle par abonnement (migration
0013). Seul BYOK (29$/mois, abonnement plateforme) garde un prix fixe — tout
le reste est pay-as-you-go. Le différenciateur solo/entreprise devient
max_members (1 vs illimité), déjà en base depuis 0012.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0037"
down_revision = "0036"
branch_labels = None
depends_on = None

_PLANS_TABLE = sa.table(
    "plans",
    sa.column("name", sa.String),
    sa.column("description", sa.String),
    sa.column("features", sa.JSON),
    sa.column("monthly_price_usd", sa.Integer),
)


def upgrade() -> None:
    conn = op.get_bind()

    conn.execute(
        _PLANS_TABLE.update().where(_PLANS_TABLE.c.name == "solo").values(
            monthly_price_usd=0,
            description="Pour les indépendants et freelances. Claude (Anthropic) fourni par Alexis — vous n'avez rien à configurer. Payez à l'usage réel, sans abonnement fixe.",
            features=[
                "Clé API fournie par Alexis",
                "Agent Claude (Anthropic)",
                "Projets illimités",
                "Payez à l'usage réel (wallet prépayé)",
                "1 membre",
                "Support email prioritaire",
            ],
        )
    )

    conn.execute(
        _PLANS_TABLE.update().where(_PLANS_TABLE.c.name == "entreprise").values(
            monthly_price_usd=0,
            description="Pour les équipes qui veulent automatiser leur développement à grande échelle. Payez à l'usage réel, sans limite de membres.",
            features=[
                "Clé API fournie par Alexis",
                "Agent Claude (Anthropic)",
                "Projets illimités",
                "Membres illimités",
                "Payez à l'usage réel (wallet prépayé)",
                "Support dédié",
                "Onboarding personnalisé",
            ],
        )
    )


def downgrade() -> None:
    conn = op.get_bind()

    conn.execute(
        _PLANS_TABLE.update().where(_PLANS_TABLE.c.name == "solo").values(
            monthly_price_usd=199,
            description="Pour les indépendants et freelances. Claude (Anthropic) fourni par Alexis — vous n'avez rien à configurer.",
            features=[
                "Clé API fournie par Alexis",
                "Agent Claude (Anthropic)",
                "Projets illimités",
                "Budget inférence 100 $/mois inclus",
                "1 membre",
                "Support email prioritaire",
            ],
        )
    )

    conn.execute(
        _PLANS_TABLE.update().where(_PLANS_TABLE.c.name == "entreprise").values(
            monthly_price_usd=499,
            description="Pour les équipes qui veulent automatiser leur développement à grande échelle. Tarif sur devis selon le nombre de membres et les besoins.",
            features=[
                "Clé API fournie par Alexis",
                "Agent Claude (Anthropic)",
                "Projets illimités",
                "Membres illimités",
                "Budget inférence sur mesure",
                "Support dédié",
                "Onboarding personnalisé",
            ],
        )
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/devhome/personal/Alexis && source venv/bin/activate && python -m pytest tests/orchestrator/test_migrations.py -k "0037" -v`
Expected: PASS (both tests)

- [ ] **Step 5: Run the full migration + plans-router test suites (regression check)**

Run: `cd ~/devhome/personal/Alexis && source venv/bin/activate && python -m pytest tests/orchestrator/test_migrations.py tests/orchestrator/test_plans_router.py -v`
Expected: PASS — `test_plans_router.py` uses its own `conftest.py` fixtures (solo=49, entreprise=199, independent of migration data), so it is unaffected by this migration.

- [ ] **Step 6: Commit**

```bash
cd ~/devhome/personal/Alexis
git add orchestrator/alembic/versions/0037_pay_as_you_go_pricing.py tests/orchestrator/test_migrations.py
git commit -m "fix(billing): solo/entreprise plans are pay-as-you-go, no fixed price

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SC7DgJqQyuEBUfabfxUGtW"
```

---

### Task 2: Front `/pricing` — pay-as-you-go card treatment + FAQ rewrite

**Repo:** `~/devhome/personal/alexis-front` (this repo)

**Files:**
- Modify: `app/pricing/page.tsx:11-136` (PlanCard component), `app/pricing/page.tsx:204-236` (FAQ)
- Test: Create `__tests__/pricing-page.test.tsx`

**Interfaces:**
- Consumes: `listPublicPlans(): Promise<PlanPublicOut[]>` and `getApiKey(): string | null`, both from `@/lib/api-client` / `@/lib/session` (unchanged signatures, `lib/api-client.ts:233` and existing `getApiKey`).
- Produces: `PlanCard` renders `"Payez à l'usage"` (no `$` figure) for `plan.name === "solo" | "entreprise"`, keeps `"Gratuit"` for `plan.name === "free"` and `"$29 / mois"` for `plan.name === "byok"`. No later task depends on this component's internals beyond the rendered text.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/pricing-page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import PricingPage from "@/app/pricing/page";
import * as apiClient from "@/lib/api-client";
import * as session from "@/lib/session";

const PLANS: apiClient.PlanPublicOut[] = [
  {
    id: "1", name: "free", display_name: "Découverte", description: "Essai gratuit.",
    features: ["Budget 5$ offert"], monthly_price_usd: 0, requires_own_key: false,
    max_members: 1, is_public: true, sort_order: 0,
  },
  {
    id: "2", name: "byok", display_name: "BYOK", description: "Votre clé.",
    features: ["Clé perso"], monthly_price_usd: 29, requires_own_key: true,
    max_members: 1, is_public: true, sort_order: 1,
  },
  {
    id: "3", name: "solo", display_name: "Solo Preneur", description: "Pour indés.",
    features: ["1 membre"], monthly_price_usd: 0, requires_own_key: false,
    max_members: 1, is_public: true, sort_order: 2,
  },
  {
    id: "4", name: "entreprise", display_name: "Entreprise", description: "Pour équipes.",
    features: ["Membres illimités"], monthly_price_usd: 0, requires_own_key: false,
    max_members: null, is_public: true, sort_order: 3,
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(session, "getApiKey").mockReturnValue(null);
  vi.spyOn(apiClient, "listPublicPlans").mockResolvedValue(PLANS);
});

describe("PricingPage", () => {
  it("shows 'Payez à l'usage' for solo and entreprise instead of a fixed monthly price", async () => {
    render(<PricingPage />);
    await waitFor(() => expect(screen.getAllByText("Payez à l'usage")).toHaveLength(2));
    expect(screen.queryByText("$199 / mois")).not.toBeInTheDocument();
    expect(screen.queryByText("$499 / mois")).not.toBeInTheDocument();
    expect(screen.queryByText(/à partir de/i)).not.toBeInTheDocument();
  });

  it("keeps a fixed monthly price for BYOK only", async () => {
    render(<PricingPage />);
    await waitFor(() => expect(screen.getByText("$29 / mois")).toBeInTheDocument());
  });

  it("still shows 'Gratuit' for the free plan", async () => {
    render(<PricingPage />);
    await waitFor(() => expect(screen.getByText("Gratuit")).toBeInTheDocument());
  });

  it("removes outdated fixed-price wording from the FAQ", async () => {
    render(<PricingPage />);
    await waitFor(() => expect(screen.getByText("Gratuit")).toBeInTheDocument());
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/199\s*€/);
    expect(text).not.toMatch(/499\s*€/);
    expect(text).not.toMatch(/29\s*€/);
  });

  it("explains the solo vs entreprise differentiator (member count, not price)", async () => {
    render(<PricingPage />);
    await waitFor(() =>
      expect(screen.getByText(/quelle différence entre solo preneur et entreprise/i)).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/pricing-page.test.tsx`
Expected: FAIL — first test fails because current code shows `"Gratuit"` is derived from `monthly_price_usd === 0`, so `solo`/`entreprise` (price 0 in the mocked data) render as `"Gratuit"` cards, not `"Payez à l'usage"`; last test fails because the new FAQ entry doesn't exist yet.

- [ ] **Step 3: Update `PlanCard` in `app/pricing/page.tsx`**

Replace (`app/pricing/page.tsx:11-30`):

```tsx
function PlanCard({ plan, highlighted }: { plan: PlanPublicOut; highlighted?: boolean }) {
  const isFree = plan.monthly_price_usd === 0;
  const isByok = plan.name === "byok";
  const isEntreprise = plan.name === "entreprise";

  const priceLabel = isFree
    ? "Gratuit"
    : isEntreprise
    ? `À partir de $${plan.monthly_price_usd} / mois`
    : `$${plan.monthly_price_usd} / mois`;
```

With:

```tsx
function PlanCard({ plan, highlighted }: { plan: PlanPublicOut; highlighted?: boolean }) {
  const isFree = plan.name === "free";
  const isByok = plan.name === "byok";
  const isPayAsYouGo = plan.name === "solo" || plan.name === "entreprise";
  const isEntreprise = plan.name === "entreprise";

  const priceLabel = isFree
    ? "Gratuit"
    : isPayAsYouGo
    ? "Payez à l'usage"
    : `$${plan.monthly_price_usd} / mois`;
```

Replace (`app/pricing/page.tsx:62-65`, the "HT" suffix guard):

```tsx
        {!isFree && !isEntreprise && (
          <span className="ml-1 text-sm text-foreground-subtle">HT</span>
        )}
```

With:

```tsx
        {!isFree && !isPayAsYouGo && (
          <span className="ml-1 text-sm text-foreground-subtle">HT</span>
        )}
```

Replace the "Entreprise note" block (`app/pricing/page.tsx:101-106`):

```tsx
      {/* Entreprise note */}
      {isEntreprise && (
        <p className="mt-4 rounded-lg bg-surface-sunken px-3 py-2 text-xs text-foreground-muted">
          Tarif sur devis selon le nombre de membres et les besoins. Contactez-nous pour un devis personnalisé.
        </p>
      )}
```

With:

```tsx
      {/* Pay-as-you-go note (solo + entreprise) */}
      {isPayAsYouGo && (
        <p className="mt-4 rounded-lg bg-surface-sunken px-3 py-2 text-xs text-foreground-muted">
          Wallet prépayé : vous rechargez un solde et chaque run le débite au coût réel mesuré. Aucun abonnement fixe.
        </p>
      )}
```

- [ ] **Step 4: Rewrite the FAQ (`app/pricing/page.tsx:204-236`)**

Replace:

```tsx
        {/* FAQ / note BYOK */}
        <div className="mt-16 rounded-2xl border border-border bg-surface-raised p-8">
          <h2 className="text-lg font-bold text-foreground">Questions fréquentes</h2>
          <dl className="mt-6 space-y-6">
            <div>
              <dt className="font-semibold text-foreground">Qu&apos;est-ce que le plan BYOK ?</dt>
              <dd className="mt-1 text-sm text-foreground-muted">
                BYOK (Bring Your Own Key) vous permet d&apos;utiliser Alexis avec votre propre clé
                d&apos;inférence (OpenAI, Anthropic, Groq…). Vous payez votre consommation IA directement
                chez votre provider. L&apos;abonnement Alexis à 29 €/mois couvre l&apos;infra, le tracker
                natif et l&apos;hébergement de vos repos. Idéal si vous avez déjà un abonnement ou des crédits.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Qu&apos;est-ce qui est inclus dans le plan Solo Preneur ?</dt>
              <dd className="mt-1 text-sm text-foreground-muted">
                À 199 €/mois, Alexis fournit la clé d&apos;inférence — vous n&apos;avez rien à configurer.
                Un budget d&apos;inférence de 100 €/mois est inclus. Au-delà, les runs sont mis en pause
                jusqu&apos;au mois suivant. Contactez-nous à{" "}
                <a href="mailto:contact@alexis.dev" className="text-brand hover:underline">
                  contact@alexis.dev
                </a>{" "}
                pour activer votre plan.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Puis-je changer de plan à tout moment ?</dt>
              <dd className="mt-1 text-sm text-foreground-muted">
                Oui. Contactez-nous et nous mettrons à jour votre plan sans interruption de service.
              </dd>
            </div>
          </dl>
        </div>
```

With:

```tsx
        {/* FAQ / note BYOK */}
        <div className="mt-16 rounded-2xl border border-border bg-surface-raised p-8">
          <h2 className="text-lg font-bold text-foreground">Questions fréquentes</h2>
          <dl className="mt-6 space-y-6">
            <div>
              <dt className="font-semibold text-foreground">Qu&apos;est-ce que le plan BYOK ?</dt>
              <dd className="mt-1 text-sm text-foreground-muted">
                BYOK (Bring Your Own Key) vous permet d&apos;utiliser Alexis avec votre propre clé
                d&apos;inférence (OpenAI, Anthropic, Groq…). Vous payez votre consommation IA directement
                chez votre provider. L&apos;abonnement Alexis à 29 $/mois couvre l&apos;infra, le tracker
                natif et l&apos;hébergement de vos repos. Idéal si vous avez déjà un abonnement ou des crédits.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Comment fonctionne le plan Solo Preneur ?</dt>
              <dd className="mt-1 text-sm text-foreground-muted">
                Claude (Anthropic) fourni par Alexis — vous n&apos;avez rien à configurer. Vous rechargez
                un solde (wallet) et chaque run débite le coût réel mesuré, marge de la plateforme
                comprise. Aucun abonnement fixe. Contactez-nous à{" "}
                <a href="mailto:contact@alexis.dev" className="text-brand hover:underline">
                  contact@alexis.dev
                </a>{" "}
                pour activer votre wallet.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Quelle différence entre Solo Preneur et Entreprise ?</dt>
              <dd className="mt-1 text-sm text-foreground-muted">
                Le nombre de membres : Solo Preneur est limité à 1 membre, Entreprise n&apos;a pas de
                limite. Les deux fonctionnent en pay-as-you-go — vous ne payez que votre usage réel,
                sans abonnement fixe.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Puis-je changer de plan à tout moment ?</dt>
              <dd className="mt-1 text-sm text-foreground-muted">
                Oui. Contactez-nous et nous mettrons à jour votre plan sans interruption de service.
              </dd>
            </div>
          </dl>
        </div>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run __tests__/pricing-page.test.tsx`
Expected: PASS (all 5 tests)

- [ ] **Step 6: Run the full front test suite (regression check)**

Run: `npx vitest run`
Expected: PASS — no other test file references `app/pricing/page.tsx`.

- [ ] **Step 7: Commit**

```bash
git add app/pricing/page.tsx __tests__/pricing-page.test.tsx
git commit -m "fix(pricing): solo/entreprise show pay-as-you-go, not a fixed price

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SC7DgJqQyuEBUfabfxUGtW"
```

---

### Task 3: Landing page — new billing explanation section

**Repo:** `~/devhome/personal/alexis-front` (this repo)

**Files:**
- Create: `components/landing-billing-section.tsx`
- Modify: `app/page.tsx:83-84` (insert the new section between Pipeline and CTA banner)
- Test: Append to `__tests__/root-page.test.tsx`

**Interfaces:**
- Consumes: nothing (pure static component, no props, no fetch — per Global Constraints).
- Produces: default export `LandingBillingSection(): JSX.Element`, imported by `app/page.tsx`. No later task depends on it.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/root-page.test.tsx` (inside the existing `describe("RootPage", ...)` block, before the closing `});`):

```tsx
  it("shows the billing section explaining pay-as-you-go pricing", () => {
    render(<RootPage />);
    expect(
      screen.getByRole("heading", { name: /vous ne payez que ce que vous utilisez/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/essai gratuit/i)).toBeInTheDocument();
    expect(screen.getByText(/payez à l'usage/i)).toBeInTheDocument();
    expect(screen.getByText("BYOK")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /voir le détail des tarifs/i })).toHaveAttribute(
      "href",
      "/pricing"
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/root-page.test.tsx`
Expected: FAIL — no heading matching "vous ne payez que ce que vous utilisez" exists yet on the landing page.

- [ ] **Step 3: Create `components/landing-billing-section.tsx`**

```tsx
import Link from "next/link";

const BILLING_POINTS = [
  {
    title: "Essai gratuit",
    body: "Créez un compte, un crédit d'essai est offert. Aucune carte bancaire requise.",
  },
  {
    title: "Payez à l'usage",
    body: "Un wallet prépayé, débité au run réel mesuré. Pas d'abonnement forcé.",
  },
  {
    title: "BYOK",
    body: "Connectez votre propre clé d'inférence, payez votre provider directement, plus un abonnement plateforme fixe.",
  },
];

// ─── Section facturation (landing) ─────────────────────────────────────────────
// Statique volontairement : pas de fetch /plans ici — les vrais montants et
// plafonds sont admin-configurables et déjà détaillés sur /pricing. Un fetch
// ici risquerait de désynchroniser deux sources de vérité.

export default function LandingBillingSection() {
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-7xl px-6 py-20">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            Facturation
          </p>
          <h2 className="mt-3 text-3xl font-bold text-foreground">
            Vous ne payez que ce que vous utilisez
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-foreground-muted">
            Pas d&apos;abonnement forcé. Un essai gratuit pour démarrer, un wallet prépayé
            débité à l&apos;usage réel, ou votre propre clé d&apos;inférence.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {BILLING_POINTS.map((point) => (
            <div
              key={point.title}
              className="rounded-2xl border border-border bg-surface-raised p-8"
            >
              <h3 className="text-lg font-bold text-foreground">{point.title}</h3>
              <p className="mt-2 text-sm text-foreground-muted">{point.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/pricing" className="text-sm font-semibold text-brand hover:underline">
            Voir le détail des tarifs →
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Wire it into `app/page.tsx`**

Add the import (`app/page.tsx:1-5`):

```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import LandingNav from "@/components/landing-nav";
import LandingPipelineSteps from "@/components/landing-pipeline-steps";
import LandingBillingSection from "@/components/landing-billing-section";
```

Insert the section between the Pipeline section and the CTA banner (`app/page.tsx:83-86`, right after the Pipeline `</section>` and before the `{/* ── CTA banner ── */}` comment):

```tsx
      </section>

      {/* ── Facturation ── */}
      <LandingBillingSection />

      {/* ── CTA banner ── */}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/root-page.test.tsx`
Expected: PASS (all tests, including the new one)

- [ ] **Step 6: Run the full front test suite (regression check)**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add components/landing-billing-section.tsx app/page.tsx __tests__/root-page.test.tsx
git commit -m "feat(landing): explain pay-as-you-go billing on the home page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SC7DgJqQyuEBUfabfxUGtW"
```

---

## Post-implementation check

- [ ] Visually confirm in a browser (`npm run dev` in `alexis-front`, or the `run` skill) that: the landing page shows the new "Facturation" section with a working `/pricing` link, and `/pricing` shows "Payez à l'usage" (no `$0`/`$199`/`$499`) for `solo`/`entreprise` while `byok` still shows `$29 / mois`.
