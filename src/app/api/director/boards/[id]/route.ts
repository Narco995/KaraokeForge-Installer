import { NextRequest } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { DirectorPlan } from "@/lib/director";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const board = await prisma.storyboard.findFirst({ where: { id, userId: user.id } });
    if (!board) throw new HttpError(404, "Storyboard not found");
    return {
      board: {
        id: board.id,
        title: board.title,
        brief: board.brief,
        style: board.style,
        aspect: board.aspect,
        status: board.status,
        budgetCredits: board.budgetCredits,
        plan: JSON.parse(board.plan) as DirectorPlan,
        jobIds: JSON.parse(board.jobIds) as string[],
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
      },
    };
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const board = await prisma.storyboard.findFirst({ where: { id, userId: user.id } });
    if (!board) throw new HttpError(404, "Storyboard not found");
    await prisma.storyboard.delete({ where: { id } });
    return { ok: true };
  });
}
