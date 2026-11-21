import { NextRequest } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { projectSchema } from "@/lib/validation";

export async function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });
    const assetIds = projects.flatMap((p) => JSON.parse(p.assetIds) as string[]);
    const assets = await prisma.asset.findMany({ where: { id: { in: assetIds } } });
    const assetMap = new Map(assets.map((a) => [a.id, { id: a.id, url: a.url, kind: a.kind }]));
    return {
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        assets: (JSON.parse(p.assetIds) as string[]).map((id) => assetMap.get(id)).filter(Boolean),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    };
  });
}

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireUser();
    const body = projectSchema.parse(await req.json());
    const assetIds = body.assetIds ?? [];
    const owned = await prisma.asset.count({ where: { id: { in: assetIds }, userId: user.id } });
    if (owned !== assetIds.length) throw new HttpError(400, "Assets not found");
    const project = await prisma.project.create({
      data: { userId: user.id, name: body.name, description: body.description, assetIds: JSON.stringify(assetIds) },
    });
    return { project: { id: project.id } };
  });
}
