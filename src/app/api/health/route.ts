import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let db = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "error";
  }
  return Response.json({
    ok: true,
    db,
    providers: {
      replicate: Boolean(process.env.REPLICATE_API_TOKEN),
      fal: Boolean(process.env.FAL_KEY),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
    },
    time: new Date().toISOString(),
  });
}
