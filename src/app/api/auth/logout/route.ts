import { destroySession } from "@/lib/auth";
import { handleRoute } from "@/lib/api";

export async function POST() {
  return handleRoute(async () => {
    await destroySession();
    return { ok: true };
  });
}
