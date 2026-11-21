import { NextRequest } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { handleRoute, requestOrigin } from "@/lib/api";
import { PLANS } from "@/lib/credits";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { z } from "zod";

const checkoutSchema = z.object({ planId: z.enum(["STARTER", "PRO", "PREMIUM"]) });

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { planId } = checkoutSchema.parse(await req.json());
    const plan = PLANS[planId];

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      throw new HttpError(
        503,
        "Payments are not configured on this deployment. Set STRIPE_SECRET_KEY to enable checkout."
      );
    }

    const origin = requestOrigin(req);
    const tx = await prisma.paymentTransaction.create({
      data: { userId: user.id, provider: "stripe", plan: plan.id, amountCents: plan.priceCents, credits: plan.monthlyCredits, status: "PENDING" },
    });

    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("success_url", `${origin}/settings?checkout=success&tx=${tx.id}`);
    form.set("cancel_url", `${origin}/pricing?checkout=cancelled`);
    form.set("client_reference_id", tx.id);
    form.set("customer_email", user.email);
    form.set("line_items[0][quantity]", "1");
    form.set("line_items[0][price_data][currency]", "usd");
    form.set("line_items[0][price_data][unit_amount]", String(plan.priceCents));
    form.set("line_items[0][price_data][product_data][name]", `FREEFIELDER ${plan.name} — ${plan.monthlyCredits} credits`);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!res.ok) {
      const body = await res.text();
      await prisma.paymentTransaction.update({ where: { id: tx.id }, data: { status: "FAILED" } });
      throw new HttpError(502, `Stripe checkout failed: ${body.slice(0, 300)}`);
    }
    const session = (await res.json()) as { url: string; id: string };
    await prisma.paymentTransaction.update({ where: { id: tx.id }, data: { providerRef: session.id } });
    await audit(user.id, "checkout.created", { txId: tx.id, plan: plan.id });
    return { checkoutUrl: session.url };
  });
}
