import { NextRequest } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { characterSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const existing = await prisma.character.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) throw new HttpError(404, "Character not found");
    const body = characterSchema.partial().parse(await req.json());

    const updated = await prisma.character.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.referenceAssetIds !== undefined ? { referenceAssetIds: JSON.stringify(body.referenceAssetIds) } : {}),
        ...(body.coverAssetId !== undefined ? { coverAssetId: body.coverAssetId } : {}),
      },
    });
    return { character: { id: updated.id } };
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const existing = await prisma.character.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) throw new HttpError(404, "Character not found");
    await prisma.character.delete({ where: { id } });
    return { ok: true };
  });
}
