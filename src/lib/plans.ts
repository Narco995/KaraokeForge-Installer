export type Plan = {
  id: "FREE" | "STARTER" | "PRO" | "PREMIUM";
  name: string;
  monthlyCredits: number;
  priceCents: number;
  features: string[];
};

export const PLANS: Record<Plan["id"], Plan> = {
  FREE: {
    id: "FREE",
    name: "Free",
    monthlyCredits: 25,
    priceCents: 0,
    features: ["25 credits / month", "Standard image models", "720p video previews", "Watermarked exports"],
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    monthlyCredits: 500,
    priceCents: 900,
    features: ["500 credits / month", "All image models", "HD video generation", "No watermark"],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    monthlyCredits: 2000,
    priceCents: 2900,
    features: ["2,000 credits / month", "Priority queue", "Character studio", "4K upscaling", "Editing studio"],
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "Premium",
    monthlyCredits: 8000,
    priceCents: 9900,
    features: ["8,000 credits / month", "Highest priority queue", "All video models", "Team-ready asset library", "API access (coming soon)"],
  },
};

export function estimateCost(score: number, count = 1, multiplier = 1): number {
  return Math.max(1, Math.ceil(score * count * multiplier));
}
