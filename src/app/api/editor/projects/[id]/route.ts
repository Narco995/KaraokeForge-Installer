import { NextRequest } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { editorProjectSchema } from "@/lib/validation";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const p = await prisma.editorProject.findUnique({ where: { id } });
    if (!p || p.userId !== user.id) throw new HttpError(404, "Project not found");
    return { project: { id: p.id, name: p.name, timeline: JSON.parse(p.timeline), updatedAt: p.updatedAt } };
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const existing = await prisma.editorProject.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) throw new HttpError(404, "Project not found");
    const body = editorProjectSchema.partial().parse(await req.json());
    await prisma.editorProject.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.timeline !== undefined ? { timeline: JSON.stringify(body.timeline) } : {}),
      },
    });
    return { ok: true };
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const existing = await prisma.editorProject.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) throw new HttpError(404, "Project not found");
    await prisma.editorProject.delete({ where: { id } });
    return { ok: true };
  });
}
