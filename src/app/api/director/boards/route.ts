import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { directorSchema } from "@/lib/validation";
import { planFromBrief, type DirectorPlan } from "@/lib/director";
import { audit } from "@/lib/audit";

export async function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    const boards = await prisma.storyboard.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });
    return {
      boards: boards.map((b) => ({
        id: b.id,
        title: b.title,
        brief: b.brief,
        style: b.style,
        aspect: b.aspect,
        status: b.status,
        budgetCredits: b.budgetCredits,
        plan: JSON.parse(b.plan) as DirectorPlan,
        jobIds: JSON.parse(b.jobIds) as string[],
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
    };
  });
}

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireUser();
    const input = directorSchema.parse(await req.json());

    const plan = planFromBrief(input.brief, {
      style: input.style,
      aspect: input.aspect,
      maxBeats: input.maxBeats,
      priority: input.priority,
      includeNarration: input.includeNarration,
    });
    if (input.title) plan.title = input.title;

    const board = await prisma.storyboard.create({
      data: {
        userId: user.id,
        title: plan.title,
        brief: input.brief,
        style: plan.style,
        aspect: plan.aspect,
        plan: JSON.stringify(plan),
        budgetCredits: plan.totalCredits,
      },
    });
    await audit(user.id, "director.planned", { storyboardId: board.id, shots: plan.shots.length, budget: plan.totalCredits });

    return { board: { id: board.id }, plan };
  });
}
