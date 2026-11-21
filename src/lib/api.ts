import { NextResponse } from "next/server";
import { HttpError } from "./auth";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function handleRoute<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true });
  } catch (err) {
    if (err instanceof HttpError) return jsonError(err.status, err.message);
    const status = (err as { status?: number }).status;
    if (status && typeof status === "number") {
      return jsonError(status, (err as Error).message || "Request failed");
    }
    console.error("[api] unhandled error:", err);
    return jsonError(500, "Internal server error");
  }
}

export function requestOrigin(req: Request): string {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return `${forwardedProto ?? "http"}://${host}`;
  return new URL(req.url).origin;
}
