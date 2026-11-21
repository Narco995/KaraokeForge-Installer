import { NextRequest } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const job = await prisma.generationJob.findUnique({ where: { id } });
    if (!job || (job.userId !== user.id && user.role !== "ADMIN")) {
      throw new HttpError(404, "Job not found");
    }
    const assetIds = JSON.parse(job.assetIds) as string[];
    const assets = await prisma.asset.findMany({ where: { id: { in: assetIds } } });
    return {
      job: {
        id: job.id,
        kind: job.kind,
        tool: job.tool,
        modelId: job.modelId,
        provider: job.provider,
        status: job.status,
        prompt: job.prompt,
        negativePrompt: job.negativePrompt,
        params: JSON.parse(job.params),
        costCredits: job.costCredits,
        refunded: job.refunded,
        error: job.error,
        attempts: job.attempts,
        createdAt: job.createdAt,
        finishedAt: job.finishedAt,
        assets: assets.map((a) => ({ id: a.id, url: a.url, kind: a.kind, mediaType: a.mediaType, favorite: a.favorite })),
      },
    };
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const job = await prisma.generationJob.findUnique({ where: { id } });
    if (!job || job.userId !== user.id) throw new HttpError(404, "Job not found");
    if (job.status === "QUEUED" || job.status === "RUNNING") {
      await prisma.generationJob.update({
        where: { id },
        data: { status: "CANCELED", finishedAt: new Date(), refunded: true },
      });
      if (!job.refunded) {
        const { refundHold } = await import("@/lib/credits");
        await refundHold(user.id, job.costCredits, job.id);
      }
    }
    return { ok: true };
  });
}
