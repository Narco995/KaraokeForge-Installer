import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession, HttpError } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { handleRoute } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    rateLimit(`login:${ip}`, 10, 10 * 60_000);

    const body = loginSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user ? await verifyPassword(body.password, user.passwordHash) : false;
    if (!user || !valid) throw new HttpError(401, "Invalid email or password");

    await createSession(user.id);
    await audit(user.id, "auth.login", { email });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan, credits: user.credits },
    };
  });
}
