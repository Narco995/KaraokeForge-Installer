import type { ProviderAdapter, ProviderJobInput, ProviderStatus } from "./types";
import { ASPECT_RATIO_DIMENSIONS } from "../models";

const BASE = process.env.REPLICATE_API_BASE || "https://api.replicate.com";

function token(): string {
  return process.env.REPLICATE_API_TOKEN || "";
}

function refUrl(input: ProviderJobInput, index = 0): string | undefined {
  return input.refs[index]?.url;
}

function dims(aspect?: unknown): { width: number; height: number } {
  const key = typeof aspect === "string" ? aspect : "1:1";
  const d = ASPECT_RATIO_DIMENSIONS[key] ?? ASPECT_RATIO_DIMENSIONS["1:1"];
  return { width: d.w, height: d.h };
}

/**
 * Replicate adapter. Uses the official predictions API:
 *   create: POST /v1/models/{owner}/{name}/predictions
 *   poll:   GET  /v1/predictions/{id}
 * API key lives only in server env (REPLICATE_API_TOKEN) and is never shipped
 * to the client.
 */
export const replicateAdapter: ProviderAdapter = {
  id: "replicate",
  label: "Replicate",
  isConfigured() {
    return !!token();
  },
  configureHint() {
    return "Set REPLICATE_API_TOKEN in the server environment to enable Replicate models.";
  },

  buildInput(input: ProviderJobInput): Record<string, unknown> {
    const { model, params, prompt, negativePrompt } = input;
    const common = {
      prompt,
      ...(model.capabilities.supportsNegativePrompt && negativePrompt
        ? { negative_prompt: negativePrompt }
        : {}),
    };

    switch (model.id) {
      case "flux-schnell":
      case "flux-dev":
      case "flux-1.1-pro": {
        const out: Record<string, unknown> = {
          prompt,
          aspect_ratio: String(params.aspectRatio ?? "1:1"),
          output_format: "png",
        };
        if (params.count && Number(params.count) > 1) out.num_outputs = Number(params.count);
        if (model.capabilities.supportsSeed && params.seed !== undefined && params.seed !== null && params.seed !== "") {
          out.seed = Number(params.seed);
        }
        return out;
      }
      case "sdxl": {
        const { width, height } = dims(params.aspectRatio);
        const out: Record<string, unknown> = {
          ...common,
          width,
          height,
          num_outputs: Number(params.count ?? 1),
          refine: "expert_ensemble_refiner",
          apply_watermark: false,
        };
        if (params.seed !== undefined && params.seed !== "" && params.seed !== null) out.seed = Number(params.seed);
        const img = refUrl(input);
        if (img && model.capabilities.imageToImage) {
          out.image = img;
          out.prompt_strength = Number(params.strength ?? 0.7);
        }
        return out;
      }
      case "minimax-video-01": {
        const out: Record<string, unknown> = { prompt, prompt_optimizer: true };
        const start = refUrl(input);
        if (start) out.first_frame_image = start;
        return out;
      }
      case "kling-v2.1": {
        const out: Record<string, unknown> = {
          prompt,
          duration: String(params.duration ?? "5"),
          aspect_ratio: String(params.aspectRatio ?? "16:9"),
        };
        if (negativePrompt) out.negative_prompt = negativePrompt;
        const start = refUrl(input);
        if (start) out.start_image = start;
        return out;
      }
      case "real-esrgan": {
        return {
          image: refUrl(input),
          scale: Number(params.scale ?? 2),
          face_enhance: Boolean(params.faceEnhance ?? false),
        };
      }
      case "rembg": {
        return { image: refUrl(input) };
      }
      default:
        return { ...common, ...params };
    }
  },

  async create(input) {
    const res = await fetch(`${BASE}/v1/models/${input.model.providerModel}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token()}`,
        "Content-Type": "application/json",
        Prefer: "respond-async",
      },
      body: JSON.stringify({ input: this.buildInput(input) }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Replicate create failed (${res.status}): ${body.slice(0, 500)}`);
    }
    const json = (await res.json()) as { id: string };
    return { providerJobId: json.id };
  },

  async poll(handle, model) {
    const res = await fetch(`${BASE}/v1/predictions/${handle.providerJobId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Replicate poll failed (${res.status}): ${body.slice(0, 500)}`);
    }
    const json = (await res.json()) as {
      status: string;
      output?: unknown;
      error?: string;
    };

    if (json.status === "succeeded") {
      const outputs = normalizeOutputs(json.output, model.kind);
      return { state: "succeeded", outputs, meta: {} };
    }
    if (json.status === "failed" || json.status === "canceled") {
      return { state: "failed", error: json.error || `Provider job ${json.status}` };
    }
    return { state: "running" };
  },
};

export function normalizeOutputs(output: unknown, kind: string): string[] {
  const urls: string[] = [];
  const pushUrl = (v: unknown) => {
    if (typeof v === "string" && v.startsWith("http")) urls.push(v);
    else if (v && typeof v === "object" && "url" in (v as Record<string, unknown>)) {
      const u = (v as Record<string, unknown>).url;
      if (typeof u === "string") urls.push(u);
    }
  };
  if (Array.isArray(output)) output.forEach(pushUrl);
  else if (output && typeof output === "object") {
    const obj = output as Record<string, unknown>;
    if (kind === "VIDEO") {
      pushUrl(obj.video ?? obj.output);
    } else {
      pushUrl(output);
    }
  } else pushUrl(output);
  return urls;
}
