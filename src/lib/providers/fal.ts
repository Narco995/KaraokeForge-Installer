import type { ProviderAdapter, ProviderJobInput, ProviderStatus } from "./types";
import { ASPECT_RATIO_DIMENSIONS } from "../models";

const BASE = process.env.FAL_API_BASE || "https://queue.fal.run";

function key(): string {
  return process.env.FAL_KEY || "";
}

/**
 * fal.ai queue adapter.
 *   create: POST {base}/{model}`
 *   poll:   GET  {status_url} / {response_url} returned by the create call
 * The key is stored only in server env (FAL_KEY).
 */
export const falAdapter: ProviderAdapter = {
  id: "fal",
  label: "fal.ai",
  isConfigured() {
    return !!key();
  },
  configureHint() {
    return "Set FAL_KEY in the server environment to enable fal.ai models.";
  },

  buildInput(input: ProviderJobInput): Record<string, unknown> {
    const { model, params, prompt, negativePrompt } = input;
    switch (model.id) {
      case "fal-flux-schnell": {
        const key = String(params.aspectRatio ?? "1:1");
        const d = ASPECT_RATIO_DIMENSIONS[key] ?? ASPECT_RATIO_DIMENSIONS["1:1"];
        const out: Record<string, unknown> = {
          prompt,
          image_size: { width: d.w, height: d.h },
          num_images: Number(params.count ?? 1),
          output_format: "png",
        };
        if (params.seed !== undefined && params.seed !== "") out.seed = Number(params.seed);
        return out;
      }
      case "fal-minimax-video-01": {
        const out: Record<string, unknown> = { prompt, prompt_optimizer: true };
        const start = input.refs[0]?.url;
        if (start) out.first_frame_image = start;
        return out;
      }
      default:
        return { prompt, negative_prompt: negativePrompt, ...params };
    }
  },

  async create(input) {
    const res = await fetch(`${BASE}/${input.model.providerModel}`, {
      method: "POST",
      headers: { Authorization: `Key ${key()}`, "Content-Type": "application/json" },
      body: JSON.stringify(this.buildInput(input)),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`fal create failed (${res.status}): ${body.slice(0, 500)}`);
    }
    const json = (await res.json()) as {
      request_id: string;
      status_url?: string;
      response_url?: string;
    };
    return {
      providerJobId: JSON.stringify({
        request_id: json.request_id,
        status_url: json.status_url ?? `${BASE}/${input.model.providerModel}/requests/${json.request_id}/status`,
        response_url: json.response_url ?? `${BASE}/${input.model.providerModel}/requests/${json.request_id}`,
      }),
    };
  },

  async poll(handle) {
    let urls: { status_url: string; response_url: string };
    try {
      urls = JSON.parse(handle.providerJobId);
    } catch {
      return { state: "failed", error: "Invalid fal handle" };
    }

    const statusRes = await fetch(urls.status_url, { headers: { Authorization: `Key ${key()}` } });
    if (!statusRes.ok) {
      const body = await statusRes.text();
      throw new Error(`fal poll failed (${statusRes.status}): ${body.slice(0, 500)}`);
    }
    const status = (await statusRes.json()) as { status: string; error?: string };

    if (status.status === "COMPLETED") {
      const resultRes = await fetch(urls.response_url, { headers: { Authorization: `Key ${key()}` } });
      if (!resultRes.ok) {
        const body = await resultRes.text();
        throw new Error(`fal result fetch failed (${resultRes.status}): ${body.slice(0, 500)}`);
      }
      const result = (await resultRes.json()) as Record<string, unknown>;
      const outputs = normalizeFalOutputs(result);
      if (outputs.length === 0) {
        return { state: "failed", error: "Provider returned no output" };
      }
      return { state: "succeeded", outputs };
    }
    if (status.status === "FAILED" || status.error) {
      return { state: "failed", error: status.error || "fal job failed" };
    }
    return { state: "running" };
  },
};

function normalizeFalOutputs(result: Record<string, unknown>): string[] {
  const urls: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string" && v.startsWith("http")) urls.push(v);
    else if (v && typeof v === "object") {
      const u = (v as Record<string, unknown>).url;
      if (typeof u === "string") urls.push(u);
    }
  };
  if (Array.isArray(result.images)) result.images.forEach(push);
  else if (Array.isArray(result.videos)) result.videos.forEach(push);
  else if (result.video) push(result.video);
  else if (result.image) push(result.image);
  else if (result.audio) push(result.audio);
  return urls;
}
