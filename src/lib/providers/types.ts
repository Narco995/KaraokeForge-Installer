import type { ModelDef } from "../models";

export type ProviderRefs = {
  name: string;
  url: string; // absolute, server-resolvable URL or data URL
}[];

export type ProviderJobInput = {
  model: ModelDef;
  tool: string;
  prompt: string;
  negativePrompt?: string;
  params: Record<string, unknown>;
  refs: ProviderRefs;
};

export type ProviderHandle = {
  providerJobId: string; // opaque id or JSON-encoded handle
};

export type ProviderStatus = {
  state: "running" | "succeeded" | "failed";
  outputs?: string[];
  meta?: Record<string, unknown>;
  error?: string;
};

export interface ProviderAdapter {
  id: string;
  label: string;
  isConfigured(): boolean;
  configureHint(): string;
  create(input: ProviderJobInput): Promise<ProviderHandle>;
  poll(handle: ProviderHandle, model: ModelDef): Promise<ProviderStatus>;
  buildInput(input: ProviderJobInput): Record<string, unknown>;
}
