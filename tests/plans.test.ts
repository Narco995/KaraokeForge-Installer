import { describe, expect, it } from "vitest";
import { estimateCost, PLANS } from "@/lib/plans";

describe("PLANS catalog", () => {
  it("defines all four tiers with ascending pricing and credits", () => {
    const tiers = Object.values(PLANS);
    expect(tiers.map((p) => p.id)).toEqual(["FREE", "STARTER", "PRO", "PREMIUM"]);
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].monthlyCredits).toBeGreaterThan(tiers[i - 1].monthlyCredits);
      expect(tiers[i].priceCents).toBeGreaterThan(tiers[i - 1].priceCents);
    }
  });

  it("free tier is free and grants 25 credits", () => {
    expect(PLANS.FREE.priceCents).toBe(0);
    expect(PLANS.FREE.monthlyCredits).toBe(25);
  });
});

describe("estimateCost", () => {
  it("scales with count", () => {
    expect(estimateCost(4, 1)).toBe(4);
    expect(estimateCost(4, 3)).toBe(12);
  });

  it("applies multiplier (e.g. 2x upscale)", () => {
    expect(estimateCost(2, 1, 2)).toBe(4);
  });

  it("never returns less than 1 credit", () => {
    expect(estimateCost(0)).toBe(1);
    expect(estimateCost(1, 1, 0.01)).toBe(1);
  });

  it("always rounds up", () => {
    expect(estimateCost(1.2, 1)).toBe(2);
  });
});
