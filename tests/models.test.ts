import { describe, expect, it } from "vitest";
import { ASPECT_RATIO_DIMENSIONS, CAMERA_PRESETS, getModel, MODELS, SHOT_TYPES, modelsByKind } from "@/lib/models";

describe("model catalog", () => {
  it("has unique model ids", () => {
    const ids = MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers image, video, upscale and edit kinds", () => {
    const kinds = new Set(MODELS.map((m) => m.kind));
    expect(kinds.has("IMAGE")).toBe(true);
    expect(kinds.has("VIDEO")).toBe(true);
    expect(kinds.has("UPSCALE")).toBe(true);
    expect(kinds.has("EDIT")).toBe(true);
  });

  it("getModel resolves by id and is undefined otherwise", () => {
    expect(getModel("flux-schnell")).toBeDefined();
    expect(getModel("not-a-model")).toBeUndefined();
  });

  it("modelsByKind filters correctly", () => {
    expect(modelsByKind("VIDEO").every((m) => m.kind === "VIDEO")).toBe(true);
    expect(modelsByKind("IMAGE").length).toBeGreaterThan(0);
  });

  it("every model declares positive credit score and capabilities", () => {
    for (const m of MODELS) {
      expect(m.creditScore).toBeGreaterThan(0);
      expect(m.capabilities).toBeTypeOf("object");
      expect(m.description.length).toBeGreaterThan(10);
    }
  });
});

describe("camera presets", () => {
  it("provides the required 13 presets", () => {
    expect(CAMERA_PRESETS).toHaveLength(13);
    const ids = CAMERA_PRESETS.map((c) => c.id);
    for (const id of ["dolly_in", "dolly_out", "tracking", "orbit", "pan_left", "pan_right", "tilt_up", "tilt_down", "crane", "handheld", "drone", "static", "fpv"]) {
      expect(ids).toContain(id);
    }
  });

  it("every preset carries a prompt fragment", () => {
    for (const c of CAMERA_PRESETS) expect(c.prompt.length).toBeGreaterThan(5);
  });

  it("shot types include a no-op default", () => {
    expect(SHOT_TYPES.some((s) => s.id === "none" && !("prompt" in s))).toBe(true);
  });
});

describe("aspect ratio dimensions", () => {
  it("maps common ratios to 32-multiple dimensions close to true ratio", () => {
    for (const [ratio, dim] of Object.entries(ASPECT_RATIO_DIMENSIONS)) {
      expect(dim.w % 32).toBe(0);
      expect(dim.h % 32).toBe(0);
      const [rw, rh] = ratio.split(":").map(Number);
      expect(dim.w / dim.h).toBeCloseTo(rw / rh, 1);
    }
  });
});
