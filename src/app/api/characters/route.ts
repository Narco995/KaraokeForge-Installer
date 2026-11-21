import { NextRequest } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { characterSchema } from "@/lib/validation";

export async function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    const characters = await prisma.character.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });
    const assetIds = characters.flatMap((c) => JSON.parse(c.referenceAssetIds) as string[]);
    const assets = await prisma.asset.findMany({ where: { id: { in: assetIds } } });
    const assetMap = new Map(assets.map((a) => [a.id, { id: a.id, url: a.url }]));
    return {
      characters: characters.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        coverAssetId: c.coverAssetId,
        references: (JSON.parse(c.referenceAssetIds) as string[])
          .map((id) => assetMap.get(id))
          .filter(Boolean),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    };
  });
}

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireUser();
    const body = characterSchema.parse(await req.json());
    const refs = body.referenceAssetIds ?? [];
    const owned = await prisma.asset.count({ where: { id: { in: refs }, userId: user.id } });
    if (owned !== refs.length) throw new HttpError(400, "Reference assets not found");

    const character = await prisma.character.create({
      data: {
        userId: user.id,
        name: body.name,
        description: body.description,
        referenceAssetIds: JSON.stringify(refs),
        coverAssetId: body.coverAssetId ?? refs[0] ?? null,
      },
    });
    return { character: { id: character.id } };
  });
}
