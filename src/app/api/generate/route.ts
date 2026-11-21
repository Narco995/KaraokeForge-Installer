import { NextRequest } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { handleRoute, requestOrigin } from "@/lib/api";
import { generateSchema } from "@/lib/validation";
import { createGenerationJob } from "@/lib/jobs";
import { enhancePrompt } from "@/lib/prompt-engine";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import type { ModelKind } from "@/lib/models";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireUser();
    rateLimit(`generate:${user.id}`, 20, 60_000);

    const input = generateSchema.parse(await req.json());

    const refAssets = input.refAssetIds.length
      ? await prisma.asset.findMany({ where: { id: { in: input.refAssetIds }, userId: user.id } })
      : [];
    if (refAssets.length !== input.refAssetIds.length) {
      throw new HttpError(400, "One or more reference assets were not found");
    }

    let prompt = input.prompt;
    if (input.enhanced && (input.kind === "IMAGE" || input.kind === "VIDEO")) {
      prompt = await enhancePrompt(prompt, {
        kind: input.kind,
        cameraPreset: input.params.cameraPreset,
        shotType: input.params.shotType,
        lens: input.params.lens,
        lighting: input.params.lighting,
        style: input.params.style,
      });
    }

    const origin = requestOrigin(req);
    const { job, cost } = await createGenerationJob({
      userId: user.id,
      kind: input.kind as ModelKind,
      tool: input.tool,
      modelId: input.modelId,
      prompt,
      negativePrompt: input.negativePrompt,
      params: input.params,
      refAssetIds: refAssets.map((a) => a.id),
      origin,
    });

    return {
      job: {
        id: job.id,
        kind: job.kind,
        tool: job.tool,
        modelId: job.modelId,
        status: job.status,
        prompt: job.prompt,
        costCredits: job.costCredits,
        createdAt: job.createdAt,
      },
      cost,
    };
  });
}
