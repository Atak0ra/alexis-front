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
