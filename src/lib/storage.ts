import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "./db";

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

export async function ensureUploadDir(): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}

function extFromMedia(mediaType?: string, url?: string): string {
  if (mediaType) {
    if (mediaType.includes("png")) return ".png";
    if (mediaType.includes("jpeg") || mediaType.includes("jpg")) return ".jpg";
    if (mediaType.includes("webp")) return ".webp";
    if (mediaType.includes("gif")) return ".gif";
    if (mediaType.includes("mp4")) return ".mp4";
    if (mediaType.includes("webm")) return ".webm";
    if (mediaType.includes("mpeg") || mediaType.includes("mp3")) return ".mp3";
    if (mediaType.includes("wav")) return ".wav";
  }
  const m = /\.(png|jpe?g|webp|gif|mp4|webm|mp3|wav)(\?|$)/i.exec(url ?? "");
  return m ? `.${m[1].toLowerCase()}` : ".bin";
}

/**
 * Persist a provider output URL into local object storage (.data/uploads) and
 * register it as an Asset. In production the same function is the seam for
 * writing to S3/R2 + CDN (MEDIA_CDN_BASE). Returns the created Asset.
 */
export async function persistOutput(opts: {
  userId: string;
  jobId: string;
  kind: "IMAGE" | "VIDEO" | "AUDIO";
  remoteUrl: string;
  index: number;
  meta?: Record<string, unknown>;
}) {
  await ensureUploadDir();
  const res = await fetch(opts.remoteUrl);
  if (!res.ok) throw new Error(`Failed to download output (${res.status})`);
  const contentType = res.headers.get("content-type") ?? undefined;
  const buf = Buffer.from(await res.arrayBuffer());

  const asset = await prisma.asset.create({
    data: {
      userId: opts.userId,
      jobId: opts.jobId,
      kind: opts.kind,
      url: `pending`,
      mediaType: contentType,
      meta: JSON.stringify({ origin: opts.remoteUrl.slice(0, 512), index: opts.index, ...(opts.meta ?? {}) }),
    },
  });

  const ext = extFromMedia(contentType, opts.remoteUrl);
  const localPath = path.join(UPLOAD_DIR, `${asset.id}${ext}`);
  await writeFile(localPath, buf);

  await prisma.asset.update({ where: { id: asset.id }, data: { url: assetUrl(asset.id), localPath } });
  return { ...asset, url: assetUrl(asset.id), localPath };
}

export function assetUrl(assetId: string): string {
  const cdn = process.env.MEDIA_CDN_BASE;
  return cdn ? `${cdn.replace(/\/$/, "")}/api/assets/${assetId}/file` : `/api/assets/${assetId}/file`;
}

export function absoluteAssetUrl(origin: string, assetUrl: string): string {
  if (assetUrl.startsWith("http")) return assetUrl;
  return `${origin}${assetUrl}`;
}
