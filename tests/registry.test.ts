import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { catalogFor, getModelStatus, configuredProviders, resolveWithFallback } from "@/lib/providers/registry";
import { getModel } from "@/lib/models";

const ENV_KEYS = ["REPLICATE_API_TOKEN", "FAL_KEY", "ELEVENLABS_API_KEY", "OPENAI_API_KEY"];

describe("provider registry gating", () => {
  const saved: Record<string, string | undefined> = {};

  beforeAll(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterAll(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] !== undefined) process.env[k] = saved[k];
    }
  });

  it("marks every model unavailable when no provider keys are configured", () => {
    for (const { model, available, reason } of catalogFor()) {
      expect(available).toBe(false);
      expect(reason).toBeTruthy();
    }
  });

  it("reports no configured providers without keys", () => {
    expect(configuredProviders()).toEqual([]);
  });

  it("marks replicate models available once the token exists", () => {
    process.env.REPLICATE_API_TOKEN = "test-token";
    const flux = getModelStatus(getModel("flux-schnell")!);
    expect(flux.available).toBe(true);
    expect(flux.reason).toBeUndefined();
    delete process.env.REPLICATE_API_TOKEN;
  });

  it("marks fal models available only with FAL_KEY", () => {
    process.env.REPLICATE_API_TOKEN = "test-token";
    const falModel = getModelStatus(getModel("fal-flux-schnell")!);
    expect(falModel.available).toBe(false);
    expect(falModel.reason).toContain("FAL_KEY");
    process.env.FAL_KEY = "test-key";
    expect(getModelStatus(getModel("fal-flux-schnell")!).available).toBe(true);
    delete process.env.REPLICATE_API_TOKEN;
    delete process.env.FAL_KEY;
  });

  it("marks elevenlabs audio models available only with ELEVENLABS_API_KEY (free tier)", () => {
    const eleven = getModel("eleven-multilingual-v2")!;
    expect(getModelStatus(eleven).available).toBe(false);
    expect(getModelStatus(eleven).reason).toContain("ELEVENLABS_API_KEY");
    process.env.ELEVENLABS_API_KEY = "test-key";
    expect(getModelStatus(getModel("eleven-multilingual-v2")!).available).toBe(true);
    expect(getModelStatus(getModel("eleven-flash-v2.5")!).available).toBe(true);
    delete process.env.ELEVENLABS_API_KEY;
  });

  it("availability reasons name the exact env var needed", () => {
    for (const { model, reason } of catalogFor()) {
      expect(reason).toContain(model.envKey);
    }
  });
});

describe("automatic fallback resolution", () => {
  const saved: Record<string, string | undefined> = {};

  beforeAll(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterAll(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] !== undefined) process.env[k] = saved[k];
    }
  });

  it("returns the requested model unchanged when it is available", () => {
    process.env.REPLICATE_API_TOKEN = "test-token";
    const res = resolveWithFallback({
      modelId: "flux-dev",
      kind: "IMAGE",
      tool: "text_to_image",
      toolCapabilityKey: "textToImage",
    });
    expect(res.model.id).toBe("flux-dev");
    expect(res.status.available).toBe(true);
    expect(res.fallbackFrom).toBeUndefined();
  });

  it("falls back to the cheapest available compatible provider when the primary key is missing", () => {
    delete process.env.REPLICATE_API_TOKEN;
    process.env.FAL_KEY = "test-key";
    const res = resolveWithFallback({
      modelId: "flux-schnell",
      kind: "IMAGE",
      tool: "text_to_image",
      toolCapabilityKey: "textToImage",
    });
    expect(res.fallbackFrom).toBe("flux-schnell");
    expect(res.model.provider).toBe("fal");
    expect(res.model.capabilities.textToImage).toBe(true);
    expect(res.status.available).toBe(true);
  });

  it("returns an unavailable status (HTTP 409 path) when no compatible alternative exists", () => {
    const res = resolveWithFallback({
      modelId: "eleven-multilingual-v2",
      kind: "AUDIO",
      tool: "text_to_audio",
      toolCapabilityKey: "textToAudio",
    });
    expect(res.status.available).toBe(false);
    expect(res.model.id).toBe("eleven-multilingual-v2");
    expect(res.fallbackFrom).toBeUndefined();
  });

  it("never crosses kinds when choosing an alternative", () => {
    delete process.env.REPLICATE_API_TOKEN;
    process.env.FAL_KEY = "test-key";
    const res = resolveWithFallback({
      modelId: "kling-v2.1",
      kind: "VIDEO",
      tool: "text_to_video",
      toolCapabilityKey: "textToVideo",
    });
    expect(res.fallbackFrom).toBe("kling-v2.1");
    expect(res.model.id).toBe("fal-minimax-video-01");
    expect(res.model.kind).toBe("VIDEO");
  });
});
