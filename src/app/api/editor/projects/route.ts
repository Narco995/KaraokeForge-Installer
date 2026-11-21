import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { editorProjectSchema } from "@/lib/validation";

export async function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    const projects = await prisma.editorProject.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, timeline: true, createdAt: true, updatedAt: true },
    });
    return { projects };
  });
}

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireUser();
    const body = editorProjectSchema.parse(await req.json());
    const project = await prisma.editorProject.create({
      data: { userId: user.id, name: body.name, timeline: JSON.stringify(body.timeline) },
    });
    return { project: { id: project.id } };
  });
}
