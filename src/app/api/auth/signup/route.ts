import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession, HttpError } from "@/lib/auth";
import { signupSchema } from "@/lib/validation";
import { handleRoute } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { PLANS } from "@/lib/credits";

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    rateLimit(`signup:${ip}`, 5, 60 * 60_000);

    const body = signupSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, "An account with this email already exists");

    const user = await prisma.user.create({
      data: {
        email,
        name: body.name.trim(),
        passwordHash: await hashPassword(body.password),
        plan: "FREE",
        credits: PLANS.FREE.monthlyCredits,
      },
    });

    await prisma.creditLedgerEntry.create({
      data: {
        userId: user.id,
        delta: PLANS.FREE.monthlyCredits,
        balanceAfter: PLANS.FREE.monthlyCredits,
        kind: "GRANT",
        note: "Free plan signup grant",
      },
    });

    await createSession(user.id);
    await audit(user.id, "auth.signup", { email });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan, credits: user.credits },
    };
  });
}
