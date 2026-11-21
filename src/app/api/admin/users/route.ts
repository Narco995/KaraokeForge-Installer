import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    await requireAdmin();
    const q = new URL(req.url).searchParams.get("q")?.toLowerCase() ?? "";
    const users = await prisma.user.findMany({
      where: q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, email: true, name: true, role: true, plan: true, credits: true,
        suspended: true, createdAt: true,
        _count: { select: { jobs: true, assets: true } },
      },
    });
    return { users };
  });
}
