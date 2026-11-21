import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind");
    const favorites = url.searchParams.get("favorites") === "1";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 60), 200);

    const assets = await prisma.asset.findMany({
      where: { userId: user.id, ...(kind ? { kind } : {}), ...(favorites ? { favorite: true } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return {
      assets: assets.map((a) => ({
        id: a.id, url: a.url, kind: a.kind, mediaType: a.mediaType, favorite: a.favorite,
        jobId: a.jobId, createdAt: a.createdAt, meta: JSON.parse(a.meta),
      })),
    };
  });
}
