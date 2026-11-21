import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { routeModel } from "@/lib/router";

const KEYS = ["REPLICATE_API_TOKEN", "FAL_KEY", "ELEVENLABS_API_KEY"];

describe("intelligent model routing", () => {
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

  it("routes IMAGE quality-first to the most expensive-tier model", () => {
    const res = routeModel({ kind: "IMAGE", tool: "text_to_image", priority: "quality" });
    expect(res.best).toBeDefined();
    expect(res.best!.kind).toBe("IMAGE");
    const scores = res.ranked.map((m) => m.creditScore);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("routes speed-first to the fastest IMAGE model", () => {
    const res = routeModel({ kind: "IMAGE", tool: "text_to_image", priority: "speed" });
    const secs = res.ranked.map((m) => m.avgSeconds);
    expect([...secs].sort((a, b) => a - b)).toEqual(secs);
  });

  it("routes cost-first to the cheapest IMAGE model", () => {
    const res = routeModel({ kind: "IMAGE", tool: "text_to_image", priority: "cost" });
    const costs = res.ranked.map((m) => m.creditScore);
    expect([...costs].sort((a, b) => a - b)).toEqual(costs);
  });

  it("only routes AUDIO models for text_to_audio", () => {
    const res = routeModel({ kind: "AUDIO", tool: "text_to_audio", priority: "quality" });
    expect(res.ranked.length).toBeGreaterThan(0);
    for (const m of res.ranked) {
      expect(m.kind).toBe("AUDIO");
      expect(m.provider).toBe("elevenlabs");
    }
  });

  it("honours the ref-image requirement", () => {
    const res = routeModel({ kind: "IMAGE", tool: "image_to_image", priority: "quality", withRefImage: true });
    for (const m of res.ranked) expect(m.capabilities.supportsImageRef).toBe(true);
  });

  it("splits available and unavailable pools when keys are removed", () => {
    delete process.env.REPLICATE_API_TOKEN;
    delete process.env.FAL_KEY;
    const res = routeModel({ kind: "IMAGE", tool: "text_to_image", priority: "quality" });
    expect(res.best).toBeUndefined();
    expect(res.unavailable.length).toBeGreaterThan(0);
  });

  it("can plan against the full catalog when availableOnly=false", () => {
    delete process.env.ELEVENLABS_API_KEY;
    const res = routeModel({ kind: "AUDIO", tool: "text_to_audio", priority: "quality", });
    expect(res.best).toBeUndefined();
    const planned = routeModel({ kind: "AUDIO", tool: "text_to_audio", priority: "quality", }, { availableOnly: false });
    expect(planned.best).toBeDefined();
  });
});
