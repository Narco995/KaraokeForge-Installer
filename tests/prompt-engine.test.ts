import { describe, expect, it } from "vitest";
import { composeVideoPrompt, enhancePrompt, ruleBasedEnhance } from "@/lib/prompt-engine";

describe("ruleBasedEnhance", () => {
  it("keeps the original idea intact", () => {
    const out = ruleBasedEnhance("a red fox in the snow", { kind: "IMAGE" });
    expect(out).toContain("a red fox in the snow");
  });

  it("appends camera movement only for video", () => {
    const video = ruleBasedEnhance("a fox", { kind: "VIDEO", cameraPreset: "orbit" });
    const image = ruleBasedEnhance("a fox", { kind: "IMAGE", cameraPreset: "orbit" });
    expect(video).toContain("orbits around the subject");
    expect(image).not.toContain("orbits around");
  });

  it("appends shot types when selected", () => {
    const out = ruleBasedEnhance("a fox", { kind: "IMAGE", shotType: "closeup" });
    expect(out).toContain("close-up");
  });

  it("ignores a 'none' shot type", () => {
    const plain = ruleBasedEnhance("a fox", { kind: "IMAGE" });
    const none = ruleBasedEnhance("a fox", { kind: "IMAGE", shotType: "none" });
    expect(plain).toBe(none);
  });
});

describe("enhancePrompt", () => {
  it("falls back to rule-based output when no LLM key is set", async () => {
    delete process.env.OPENAI_API_KEY;
    const out = await enhancePrompt("neon skyline", { kind: "IMAGE" });
    expect(out).toContain("neon skyline");
  });
});

describe("composeVideoPrompt", () => {
  it("combines scene, camera preset and shot type", () => {
    const out = composeVideoPrompt("a lighthouse in a storm", "dolly_in", "wide");
    expect(out).toContain("a lighthouse in a storm");
    expect(out).toContain("dolly-in");
    expect(out).toContain("wide");
  });
});
