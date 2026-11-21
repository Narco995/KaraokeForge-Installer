import { requireAdmin } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { catalogFor, configuredProviders } from "@/lib/providers/registry";

export async function GET() {
  return handleRoute(async () => {
    await requireAdmin();
    const [users, jobs, succeeded, failed, running, revenue, providers] = await Promise.all([
      prisma.user.count(),
      prisma.generationJob.count(),
      prisma.generationJob.count({ where: { status: "SUCCEEDED" } }),
      prisma.generationJob.count({ where: { status: "FAILED" } }),
      prisma.generationJob.count({ where: { status: { in: ["QUEUED", "RUNNING"] } } }),
      prisma.paymentTransaction.aggregate({ where: { status: "COMPLETED" }, _sum: { amountCents: true } }),
      prisma.asset.count(),
    ]);
    const recentJobs = await prisma.generationJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { email: true } } },
    });
    return {
      stats: {
        users,
        jobs,
        succeeded,
        failed,
        running,
        assets: providers,
        revenueCents: revenue._sum.amountCents ?? 0,
        providers: configuredProviders(),
      },
      models: catalogFor().map(({ model, available, reason }) => ({
        id: model.id, name: model.name, provider: model.provider, kind: model.kind, available, reason,
      })),
      recentJobs: recentJobs.map((j) => ({
        id: j.id, status: j.status, tool: j.tool, modelId: j.modelId, kind: j.kind,
        cost: j.costCredits, error: j.error, user: j.user.email, createdAt: j.createdAt,
      })),
    };
  });
}
