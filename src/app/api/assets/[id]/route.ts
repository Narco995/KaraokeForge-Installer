import { NextRequest } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { assetPatchSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset || asset.userId !== user.id) throw new HttpError(404, "Asset not found");
    const body = assetPatchSchema.parse(await req.json());
    const updated = await prisma.asset.update({ where: { id }, data: body });
    return { asset: { id: updated.id, favorite: updated.favorite } };
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset || asset.userId !== user.id) throw new HttpError(404, "Asset not found");
    await prisma.asset.delete({ where: { id } });
    return { ok: true };
  });
}
