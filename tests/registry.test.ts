import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { catalogFor, getModelStatus, configuredProviders } from "@/lib/providers/registry";
import { getModel } from "@/lib/models";

const ENV_KEYS = ["REPLICATE_API_TOKEN", "FAL_KEY", "OPENAI_API_KEY"];

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

  it("availability reasons name the exact env var needed", () => {
    for (const { model, reason } of catalogFor()) {
      expect(reason).toMatch(new RegExp(model.provider === "replicate" ? "REPLICATE" : "FAL"));
    }
  });
});
