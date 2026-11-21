import { NextRequest } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { projectSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) throw new HttpError(404, "Project not found");
    const body = projectSchema.partial().parse(await req.json());
    await prisma.project.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.assetIds !== undefined ? { assetIds: JSON.stringify(body.assetIds) } : {}),
      },
    });
    return { ok: true };
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) throw new HttpError(404, "Project not found");
    await prisma.project.delete({ where: { id } });
    return { ok: true };
  });
}
