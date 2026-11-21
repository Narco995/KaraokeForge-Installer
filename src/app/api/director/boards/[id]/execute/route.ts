import { NextRequest } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createGenerationJob } from "@/lib/jobs";
import type { DirectorPlan, DirectorShot } from "@/lib/director";
import type { ModelKind } from "@/lib/models";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const board = await prisma.storyboard.findFirst({ where: { id, userId: user.id } });
    if (!board) throw new HttpError(404, "Storyboard not found");

    const plan = JSON.parse(board.plan) as DirectorPlan;
    if (plan.shots.length === 0) throw new HttpError(400, "This plan has no shots to execute");

    const results: { shotIndex: number; kind: string; tool: string; status: "QUEUED" | "BLOCKED"; jobId?: string; blockedReason?: string; cost?: number }[] = [];
    let queuedCount = 0;
    let committedCost = 0;

    for (const shot of plan.shots as DirectorShot[]) {
      try {
        const { job, cost } = await createGenerationJob({
          userId: user.id,
          kind: shot.kind as ModelKind,
          tool: shot.tool,
          modelId: shot.modelId,
          prompt: shot.prompt,
          negativePrompt: shot.negativePrompt,
          params: shot.params,
          origin: new URL(req.url).origin,
        });
        results.push({ shotIndex: shot.index, kind: shot.kind, tool: shot.tool, status: "QUEUED", jobId: job.id, cost });
        queuedCount++;
        committedCost += cost;
      } catch (err) {
        const status = (err as { status?: number }).status;
        const message = err instanceof Error ? err.message : "Execution failed";
        if (status === 409 || status === 400) {
          results.push({ shotIndex: shot.index, kind: shot.kind, tool: shot.tool, status: "BLOCKED", blockedReason: message });
        } else {
          throw err;
        }
      }
    }

    if (queuedCount === 0) {
      return {
        executed: 0,
        results,
        note: "No shots could start: every routed model is unconfigured in this deployment. Nothing was charged.",
      };
    }

    const jobIds = results.map((r) => r.jobId).filter(Boolean) as string[];
    await prisma.storyboard.update({
      where: { id: board.id },
      data: { status: "EXECUTING", jobIds: JSON.stringify([...JSON.parse(board.jobIds), ...jobIds]) },
    });

    return { executed: queuedCount, committedCost, results };
  });
}
