import { requireAdmin } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  return handleRoute(async () => {
    await requireAdmin();
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 150,
      include: { user: { select: { email: true } } },
    });
    return { logs: logs.map((l) => ({ ...l, user: l.user?.email ?? "system" })) };
  });
}
