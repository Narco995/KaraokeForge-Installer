import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { planFromBrief } from "@/lib/director";
import { defaultNegativePrompt, consistencyClause, craftShotPrompt } from "@/lib/prompt-engine";

const KEYS = ["REPLICATE_API_TOKEN", "FAL_KEY", "ELEVENLABS_API_KEY"];

describe("AI director planning", () => {
  const saved: Record<string, string | undefined> = {};
  beforeAll(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      process.env[k] = "test-key";
    }
  });
  afterAll(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  const BRIEF =
    "A lone astronaut walks across a red desert at dusk. She approaches a monolith humming with light. The camera orbits as the sky ignites. End on her visor reflecting the blast.";

  it("decomposes a brief into beats with establishing, motion and hero shots", () => {
    const plan = planFromBrief(BRIEF, { style: "cinematic" });
    expect(plan.beats.length).toBeGreaterThanOrEqual(2);
    const kinds = plan.shots.map((s) => s.kind);
    expect(kinds).toContain("IMAGE");
    expect(kinds).toContain("VIDEO");
    expect(kinds).toContain("AUDIO"); // cinematic includes narration by default
    expect(plan.totalCredits).toBeGreaterThan(0);
  });

  it("produces camera-aware video shots matching brief language", () => {
    const plan = planFromBrief("The drone sweeps above the canyon as the rider races through it.", {
      style: "cinematic",
      maxBeats: 1,
    });
    const video = plan.shots.find((s) => s.kind === "VIDEO")!;
    expect(video.cameraPreset).toBe("crane");
  });

  it("marks unavailable shots with concrete warnings and keeps the plan honest", () => {
    delete process.env.REPLICATE_API_TOKEN;
    delete process.env.FAL_KEY;
    delete process.env.ELEVENLABS_API_KEY;
    const plan = planFromBrief(BRIEF, { style: "cinematic" });
    const blocked = plan.shots.filter((s) => !s.available);
    expect(blocked.length).toBe(plan.shots.length);
    expect(plan.warnings.join(" ")).toMatch(/REPLICATE_API_TOKEN|ELEVENLABS_API_KEY/);
    process.env.REPLICATE_API_TOKEN = "test-key";
    process.env.FAL_KEY = "test-key";
    process.env.ELEVENLABS_API_KEY = "test-key";
  });

  it("estimates credits per shot and sums them into the budget", () => {
    const plan = planFromBrief(BRIEF, { style: "product" });
    const sum = plan.shots.reduce((acc, s) => acc + s.estCredits, 0);
    expect(plan.totalCredits).toBe(sum);
  });

  it("defaults aspect by style", () => {
    expect(planFromBrief(BRIEF, { style: "ugc" }).aspect).toBe("9:16");
    expect(planFromBrief(BRIEF, { style: "product" }).aspect).toBe("1:1");
  });
});

describe("prompt quality tooling", () => {
  it("builds kind-specific negative prompts", () => {
    const imageNeg = defaultNegativePrompt("IMAGE");
    expect(imageNeg).toContain("deformed hands");
    const videoNeg = defaultNegativePrompt("VIDEO");
    expect(videoNeg).toContain("flickering");
    const audioNeg = defaultNegativePrompt("AUDIO");
    expect(audioNeg).toContain("clipping");
  });

  it("appends style-specific negatives", () => {
    const neg = defaultNegativePrompt("IMAGE", "anime");
    expect(neg).toContain("photorealistic");
  });

  it("creates character-continuity clauses with an optional name", () => {
    expect(consistencyClause()).toContain("same facial structure");
    expect(consistencyClause("Nova")).toContain("(Nova)");
  });

  it("crafts shot prompts with style treatment and role vocabulary", () => {
    const p = craftShotPrompt("a red desert at dusk", "cinematic", "establishing");
    expect(p).toContain("35mm film");
    expect(p).toContain("wide establishing composition");
    expect(p).toContain("a red desert at dusk");
  });
});
