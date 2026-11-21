import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { recordPurchase } from "@/lib/credits";
import { audit } from "@/lib/audit";

function verifyStripeSignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k, v];
    })
  ) as { t?: string; v1?: string };
  if (!parts.t || !parts.v1) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${payload}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhooks not configured", { status: 503 });

  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"), secret)) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const txId = session.client_reference_id as string | undefined;
    if (txId) {
      const tx = await prisma.paymentTransaction.findUnique({ where: { id: txId } });
      if (tx && tx.status === "PENDING") {
        await prisma.paymentTransaction.update({
          where: { id: tx.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
        await recordPurchase(tx.userId, tx.credits, `${tx.plan} plan purchase (webhook)`);
        await prisma.user.update({ where: { id: tx.userId }, data: { plan: tx.plan } });
        await audit(tx.userId, "checkout.completed", { txId, source: "webhook" });
      }
    }
  }

  return Response.json({ received: true });
}
