import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireAdmin();
    const status = new URL(req.url).searchParams.get("status");
    const jobs = await prisma.generationJob.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { email: true } } },
    });
    return {
      jobs: jobs.map((j) => ({
        id: j.id, status: j.status, kind: j.kind, tool: j.tool, modelId: j.modelId,
        provider: j.provider, cost: j.costCredits, refunded: j.refunded, attempts: j.attempts,
        error: j.error, user: j.user.email, createdAt: j.createdAt, finishedAt: j.finishedAt,
      })),
    };
  });
}
