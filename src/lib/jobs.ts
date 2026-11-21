import { prisma } from "./db";
import { HttpError } from "./auth";
import { MODELS, getModel, type ModelDef, type ModelKind } from "./models";
import { getAdapter, getModelStatus, resolveWithFallback } from "./providers/registry";
import { estimateCost, finalizeHold, holdCredits, refundHold } from "./credits";
import { persistOutput } from "./storage";
import { audit } from "./audit";

type CreateJobOpts = {
  userId: string;
  kind: ModelKind;
  tool: string;
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  params: Record<string, unknown>;
  refAssetIds?: string[];
  origin: string;
};

const MAX_ATTEMPTS = 2;
const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS: Record<string, number> = {
  IMAGE: 3 * 60_000,
  VIDEO: 12 * 60_000,
  UPSCALE: 2 * 60_000,
  EDIT: 2 * 60_000,
  AUDIO: 3 * 60_000,
};

const TOOL_CAPABILITY_KEY: Record<string, keyof ModelDef["capabilities"]> = {
  text_to_image: "textToImage",
  image_to_image: "imageToImage",
  text_to_video: "textToVideo",
  image_to_video: "imageToVideo",
  video_to_video: "videoToVideo",
  text_to_audio: "textToAudio",
  upscale: "upscale",
  background_removal: "backgroundRemoval",
};

export async function createGenerationJob(opts: CreateJobOpts) {
  const model = getModel(opts.modelId);
  if (!model) throw new HttpError(400, `Unknown model: ${opts.modelId}`);
  if (model.kind !== opts.kind) {
    throw new HttpError(400, `Model ${model.id} cannot run kind ${opts.kind}`);
  }

  const capKey = TOOL_CAPABILITY_KEY[opts.tool];
  if (capKey && !model.capabilities[capKey]) {
    throw new HttpError(400, `Model ${model.name} does not support ${opts.tool.replaceAll("_", " ")}`);
  }

  let effectiveModel = model;
  let fallbackFrom: string | undefined;
  if (!getModelStatus(model).available) {
    const resolution = resolveWithFallback({
      modelId: opts.modelId,
      kind: opts.kind,
      tool: opts.tool,
      toolCapabilityKey: capKey,
    });
    if (!resolution.status.available) {
      throw new HttpError(409, `Model unavailable and no compatible alternative configured: ${resolution.status.reason}`);
    }
    effectiveModel = resolution.model;
    fallbackFrom = resolution.fallbackFrom;
  }

  let cost = estimateCost(effectiveModel.creditScore, Number(opts.params.count ?? 1));
  if (opts.tool === "upscale" && Number(opts.params.scale) >= 4) cost *= 2;

  const job = await prisma.generationJob.create({
    data: {
      userId: opts.userId,
      kind: opts.kind,
      tool: opts.tool,
      modelId: effectiveModel.id,
      provider: effectiveModel.provider,
      prompt: opts.prompt,
      negativePrompt: opts.negativePrompt,
      params: JSON.stringify(opts.params),
      costCredits: cost,
      status: "QUEUED",
      assetIds: JSON.stringify(opts.refAssetIds ?? []),
    },
  });

  await holdCredits(opts.userId, cost, job.id);
  if (fallbackFrom) {
    await audit(opts.userId, "generation.auto_fallback", { jobId: job.id, requested: fallbackFrom, used: effectiveModel.id });
  }
  void runJob(job.id, opts.origin).catch((err) => {
    console.error(`[job ${job.id}] runner crashed`, err);
  });

  return { job, cost };
}

export async function runJob(jobId: string, origin: string): Promise<void> {
  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === "SUCCEEDED" || job.status === "CANCELED") return;

  const model = getModel(job.modelId);
  if (!model) return failJob(jobId, "Model removed from catalog", job.costCredits, job.userId);

  const refAssetIds = JSON.parse(job.assetIds) as string[];
  const refAssets = await prisma.asset.findMany({ where: { id: { in: refAssetIds } } });

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 } },
  });

  let lastError = "Unknown error";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      await executeAttempt(job, model, { userId: job.userId, tool: job.tool, prompt: job.prompt, origin, refAssets });
      return;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[job ${jobId}] attempt ${attempt + 1} failed:`, lastError);
      await sleep(2000);
    }
  }

  const alt = compatibleAlternativeFor(job.kind as ModelKind, job.tool, model.id);
  if (alt) {
    try {
      console.error(`[job ${jobId}] falling back to ${alt.id} after provider failure`);
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { modelId: alt.id, provider: alt.provider },
      });
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { status: "RUNNING", attempts: { increment: 1 } },
      });
      await executeAttempt(job, alt, { userId: job.userId, tool: job.tool, prompt: job.prompt, origin, refAssets });
      await audit(job.userId, "generation.provider_failover", { jobId, from: model.id, to: alt.id });
      return;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[job ${jobId}] alternative ${alt.id} also failed:`, lastError);
    }
  }

  await failJob(jobId, lastError, job.costCredits, job.userId);
}

type AttemptExecCtx = {
  userId: string;
  tool: string;
  prompt: string;
  origin: string;
  refAssets: { id: string; url: string }[];
};

async function executeAttempt(
  job: {
    id: string;
    params: string;
    negativePrompt?: string | null;
    costCredits: number;
  },
  model: ModelDef,
  ctx: AttemptExecCtx
): Promise<void> {
  const adapter = getAdapter(model.provider);
  const handle = await adapter.create({
    model,
    tool: ctx.tool,
    prompt: ctx.prompt,
    negativePrompt: job.negativePrompt ?? undefined,
    params: JSON.parse(job.params) as Record<string, unknown>,
    refs: ctx.refAssets.map((a) => ({ name: a.id, url: absoluteUrl(ctx.origin, a.url) })),
  });

  await prisma.generationJob.update({ where: { id: job.id }, data: { providerJobId: handle.providerJobId } });

  const outputs = await pollUntilDone(adapter, handle, model, TIMEOUT_MS[model.kind] ?? 180_000);

  const createdAssets = [];
  for (let i = 0; i < outputs.length; i++) {
    const asset = await persistOutput({
      userId: ctx.userId,
      jobId: job.id,
      kind: model.kind === "VIDEO" ? "VIDEO" : model.kind === "AUDIO" ? "AUDIO" : "IMAGE",
      remoteUrl: outputs[i],
      index: i,
      meta: { model: model.id, tool: ctx.tool },
    });
    createdAssets.push(asset);
  }
  if (createdAssets.length === 0) throw new Error("Provider returned no usable output");

  await prisma.generationJob.update({
    where: { id: job.id },
    data: {
      status: "SUCCEEDED",
      finishedAt: new Date(),
      assetIds: JSON.stringify(createdAssets.map((a) => a.id)),
      error: null,
    },
  });
  await finalizeHold(ctx.userId, job.costCredits, job.id);
  await audit(ctx.userId, "generation.succeeded", { jobId: job.id, tool: ctx.tool, model: model.id });
}

/** Cheapest available model (other than the failed one) supporting the same kind+tool. */
function compatibleAlternativeFor(kind: ModelKind, tool: string, excludeModelId: string): ModelDef | undefined {
  const capKey = TOOL_CAPABILITY_KEY[tool];
  return MODELS.filter(
    (m) =>
      m.kind === kind &&
      m.id !== excludeModelId &&
      getModelStatus(m).available &&
      (!capKey || Boolean(m.capabilities[capKey]))
  ).sort((a, b) => a.creditScore - b.creditScore)[0];
}

const STALE_RUN_THRESHOLD_MS = 15 * 60_000;

/**
 * Runs once at server boot (src/instrumentation.ts).
 * - Jobs stuck RUNNING from a previous process are failed and refunded.
 * - Jobs left QUEUED (process died before dispatch) are re-dispatched.
 */
export async function recoverStaleJobs(): Promise<{ failed: number; requeued: number }> {
  const staleBefore = new Date(Date.now() - STALE_RUN_THRESHOLD_MS);
  const staleRunning = await prisma.generationJob.findMany({
    where: { status: "RUNNING", startedAt: { lt: staleBefore } },
    select: { id: true, costCredits: true, userId: true },
  });
  for (const job of staleRunning) {
    await failJob(job.id, "Job interrupted by server restart", job.costCredits, job.userId);
  }

  const queued = await prisma.generationJob.findMany({
    where: { status: "QUEUED" },
    select: { id: true },
  });
  for (const job of queued) {
    void runJob(job.id, process.env.APP_ORIGIN ?? "").catch((err) => {
      console.error(`[job ${job.id}] recovery dispatch failed`, err);
    });
  }

  return { failed: staleRunning.length, requeued: queued.length };
}

async function failJob(jobId: string, error: string, cost: number, userId: string) {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "FAILED", finishedAt: new Date(), error: error.slice(0, 1000), refunded: true },
  });
  try {
    await refundHold(userId, cost, jobId);
  } catch (err) {
    console.error(`[job ${jobId}] refund failed`, err);
  }
  await audit(userId, "generation.failed", { jobId, error: error.slice(0, 200) });
}

async function pollUntilDone(
  adapter: ReturnType<typeof getAdapter>,
  handle: { providerJobId: string },
  model: ModelDef,
  timeoutMs: number
): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await adapter.poll(handle, model);
    if (status.state === "succeeded") return status.outputs ?? [];
    if (status.state === "failed") throw new Error(status.error || "Provider job failed");
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error("Generation timed out");
}

function absoluteUrl(origin: string, url: string): string {
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  if (!origin) {
    throw new Error("Reference asset URL could not be absolutized: no APP_ORIGIN configured for background dispatch");
  }
  return `${origin}${url}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
