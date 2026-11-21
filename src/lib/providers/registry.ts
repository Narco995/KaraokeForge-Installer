import { MODELS, getModel, type ModelDef, type ModelKind, type ProviderId } from "../models";
import type { ProviderAdapter } from "./types";
import { replicateAdapter } from "./replicate";
import { falAdapter } from "./fal";
import { elevenLabsAdapter } from "./elevenlabs";

const adapters: Record<ProviderId, ProviderAdapter> = {
  replicate: replicateAdapter,
  fal: falAdapter,
  elevenlabs: elevenLabsAdapter,
};

export type ModelStatus = {
  model: ModelDef;
  available: boolean;
  reason?: string;
};

export function getModelStatus(model: ModelDef): ModelStatus {
  const adapter = adapters[model.provider];
  if (!adapter) return { model, available: false, reason: "Unknown provider" };
  if (!adapter.isConfigured()) {
    return { model, available: false, reason: adapter.configureHint() };
  }
  return { model, available: true };
}

export function catalogFor(kind?: ModelKind): ModelStatus[] {
  return MODELS.filter((m) => !kind || m.kind === kind).map(getModelStatus);
}

export function getAdapter(id: ProviderId): ProviderAdapter {
  const adapter = adapters[id];
  if (!adapter) throw new Error(`No adapter for provider ${id}`);
  return adapter;
}

/** Providers configured in this deployment (for status banners). */
export function configuredProviders(): { id: ProviderId; label: string }[] {
  return (Object.keys(adapters) as ProviderId[])
    .filter((id) => adapters[id].isConfigured())
    .map((id) => ({ id, label: adapters[id].label }));
}

export type FallbackResolution = {
  model: ModelDef;
  status: ModelStatus;
  fallbackFrom?: string;
};

/**
 * Resolve a requested model, automatically selecting a compatible alternative
 * when the primary model/provider is not usable in this deployment. A
 * replacement must: match the requested kind, support the same tool, be
 * available, and be the cheapest compatible option (quality parity is left to
 * the user's model choice; this path exists for provider outages/misconfig).
 */
export function resolveWithFallback(opts: {
  modelId: string;
  kind: ModelKind;
  tool: string;
  toolCapabilityKey: string;
}): FallbackResolution {
  const requested = getModel(opts.modelId);
  const capKey = opts.toolCapabilityKey as keyof ModelDef["capabilities"];

  if (requested) {
    const status = getModelStatus(requested);
    const supportsTool = !capKey || Boolean(requested.capabilities[capKey]);
    if (requested.kind === opts.kind && supportsTool && status.available) {
      return { model: requested, status };
    }
  }

  const alternative = MODELS.map((model) => {
    if (model.kind !== opts.kind) return null;
    const matchesKind = !requested || requested.kind === opts.kind;
    if (!matchesKind) return null;
    if (capKey && !model.capabilities[capKey]) return null;
    const status = getModelStatus(model);
    if (!status.available) return null;
    return { model, status };
  })
    .filter((x): x is { model: ModelDef; status: ModelStatus } => x !== null)
    .sort((a, b) => a.model.creditScore - b.model.creditScore)[0];

  if (!alternative) {
    return {
      model: requested ?? MODELS[0],
      status: requested
        ? getModelStatus(requested)
        : { model: MODELS[0], available: false, reason: `No model for kind ${opts.kind}` },
    };
  }
  return { model: alternative.model, status: alternative.status, fallbackFrom: opts.modelId };
}
