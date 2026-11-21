import { MODELS, type ModelDef, type ModelKind, type ProviderId } from "../models";
import type { ProviderAdapter } from "./types";
import { replicateAdapter } from "./replicate";
import { falAdapter } from "./fal";

const adapters: Record<ProviderId, ProviderAdapter> = {
  replicate: replicateAdapter,
  fal: falAdapter,
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
