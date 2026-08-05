import { describe, it, expect } from "vitest";
import { groupByRecency } from "@/lib/notification-grouping";

function iso(daysAgo: number, base: Date): string {
  return new Date(base.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

describe("groupByRecency", () => {
  const now = new Date("2026-08-05T15:00:00.000Z");

  it("regroupe aujourd'hui / cette semaine / plus ancien", () => {
    const items = [
      { id: "a", created_at: iso(0, now) }, // aujourd'hui
      { id: "b", created_at: iso(3, now) }, // cette semaine
      { id: "c", created_at: iso(10, now) }, // plus ancien
    ];

    const groups = groupByRecency(items, now);

    expect(groups.map((g) => g.label)).toEqual(["Aujourd'hui", "Cette semaine", "Plus ancien"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["a"]);
    expect(groups[1].items.map((i) => i.id)).toEqual(["b"]);
    expect(groups[2].items.map((i) => i.id)).toEqual(["c"]);
  });

  it("omet les seaux vides", () => {
    const items = [{ id: "a", created_at: iso(0, now) }];
    const groups = groupByRecency(items, now);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Aujourd'hui");
  });

  it("préserve l'ordre à l'intérieur d'un seau", () => {
    const items = [
      { id: "a", created_at: iso(0, now) },
      { id: "b", created_at: new Date(now.getTime() - 3600_000).toISOString() },
    ];
    const groups = groupByRecency(items, now);
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("classe le début de journée (minuit) comme aujourd'hui, pas hier", () => {
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 1).toISOString();
    const groups = groupByRecency([{ id: "a", created_at: midnight }], now);
    expect(groups[0].label).toBe("Aujourd'hui");
  });

  it("retourne un tableau vide pour une liste vide", () => {
    expect(groupByRecency([], now)).toEqual([]);
  });
});
