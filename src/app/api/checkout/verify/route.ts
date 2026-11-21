import { NextRequest } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { recordPurchase } from "@/lib/credits";
import { audit } from "@/lib/audit";

/**
 * Server-side completion validation: the client can only ask "did this
 * transaction complete?" — completion itself is verified against Stripe and
 * credits are granted exactly once.
 */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { txId } = (await req.json()) as { txId: string };

    const tx = await prisma.paymentTransaction.findUnique({ where: { id: txId } });
    if (!tx || tx.userId !== user.id) throw new HttpError(404, "Transaction not found");
    if (tx.status === "COMPLETED") return { status: "COMPLETED", alreadyProcessed: true };

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret || !tx.providerRef) throw new HttpError(503, "Payments not configured");

    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${tx.providerRef}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) throw new HttpError(502, "Could not verify payment with Stripe");

    const session = (await res.json()) as { payment_status: string; payment_intent?: string };
    if (session.payment_status !== "paid") return { status: "PENDING" };

    const completed = await prisma.$transaction(async (t) => {
      const fresh = await t.paymentTransaction.findUnique({ where: { id: tx.id } });
      if (!fresh || fresh.status === "COMPLETED") return false;
      await t.paymentTransaction.update({
        where: { id: tx.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      return true;
    });

    if (completed) {
      await recordPurchase(user.id, tx.credits, `${tx.plan} plan purchase`);
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: tx.plan },
      });
      await audit(user.id, "checkout.completed", { txId: tx.id, credits: tx.credits });
    }
    return { status: "COMPLETED" };
  });
}
