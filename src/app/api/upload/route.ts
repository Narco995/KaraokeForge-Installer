import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { ensureUploadDir } from "@/lib/storage";
import { writeFile } from "fs/promises";
import path from "path";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = /^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp3|wav))$/;

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireUser();
    rateLimit(`upload:${user.id}`, 30, 60_000);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("No file provided");
    if (file.size > MAX_BYTES) throw new Error("File exceeds 25MB limit");
    const mediaType = file.type || "application/octet-stream";
    if (!ALLOWED.test(mediaType)) throw new Error(`Unsupported file type: ${mediaType}`);

    await ensureUploadDir();
    const asset = await prisma.asset.create({
      data: {
        userId: user.id,
        kind: mediaType.startsWith("video") ? "VIDEO" : mediaType.startsWith("audio") ? "AUDIO" : "IMAGE",
        url: "pending",
        mediaType,
        meta: JSON.stringify({ uploaded: true, name: file.name.slice(0, 200) }),
      },
    });

    const ext = (file.name.match(/\.[a-z0-9]{2,5}$/i)?.[0] ?? (mediaType.startsWith("video") ? ".mp4" : ".png")).toLowerCase();
    const localPath = path.join(process.cwd(), ".data", "uploads", `${asset.id}${ext}`);
    await writeFile(localPath, Buffer.from(await file.arrayBuffer()));

    const url = process.env.MEDIA_CDN_BASE
      ? `${process.env.MEDIA_CDN_BASE.replace(/\/$/, "")}/api/assets/${asset.id}/file`
      : `/api/assets/${asset.id}/file`;
    await prisma.asset.update({ where: { id: asset.id }, data: { url, localPath } });

    return { asset: { id: asset.id, url, kind: asset.kind, mediaType } };
  });
}
