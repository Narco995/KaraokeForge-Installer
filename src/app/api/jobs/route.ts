import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 30), 100);
    const kind = url.searchParams.get("kind");

    const jobs = await prisma.generationJob.findMany({
      where: { userId: user.id, ...(kind ? { kind } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const assetIds = jobs.flatMap((j) => JSON.parse(j.assetIds) as string[]);
    const assets = await prisma.asset.findMany({ where: { id: { in: assetIds } } });
    const assetMap = new Map(assets.map((a) => [a.id, a]));

    return {
      jobs: jobs.map((j) => {
        const ids = JSON.parse(j.assetIds) as string[];
        return {
          id: j.id,
          kind: j.kind,
          tool: j.tool,
          modelId: j.modelId,
          status: j.status,
          prompt: j.prompt,
          error: j.error,
          costCredits: j.costCredits,
          refunded: j.refunded,
          createdAt: j.createdAt,
          finishedAt: j.finishedAt,
          assets: ids.map((id) => assetMap.get(id)).filter(Boolean).map((a) => ({
            id: a!.id, url: a!.url, kind: a!.kind, mediaType: a!.mediaType, favorite: a!.favorite,
          })),
        };
      }),
    };
  });
}
