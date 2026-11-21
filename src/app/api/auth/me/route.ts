import { getSessionUser } from "@/lib/auth";
import { handleRoute } from "@/lib/api";

export async function GET() {
  return handleRoute(async () => {
    const user = await getSessionUser();
    return { user };
  });
}
