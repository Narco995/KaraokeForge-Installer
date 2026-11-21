import { NextRequest } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import { Readable } from "stream";
import path from "path";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return new Response("Not found", { status: 404 });

  if (!asset.localPath) {
    if (asset.url && asset.url !== "pending" && asset.url.startsWith("http")) {
      return Response.redirect(asset.url, 302);
    }
    return new Response("File not found", { status: 404 });
  }

  const resolved = path.resolve(asset.localPath);
  if (!resolved.startsWith(path.resolve(process.cwd(), ".data", "uploads")) || !existsSync(resolved)) {
    return new Response("File not found", { status: 404 });
  }

  const stream = Readable.toWeb(createReadStream(resolved)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": asset.mediaType ?? "application/octet-stream",
      "Content-Length": String(statSync(resolved).size),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
