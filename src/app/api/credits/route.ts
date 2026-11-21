import { requireUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/credits";

export async function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    const ledger = await prisma.creditLedgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return {
      balance: user.credits,
      plan: user.plan,
      plans: Object.values(PLANS),
      ledger,
    };
  });
}
