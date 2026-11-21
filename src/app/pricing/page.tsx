"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client";
import { Badge, Button, PageHeader } from "@/components/ui";
import { useAuth, useToast } from "@/components/providers";
import { PLANS } from "@/lib/plans";
import { Check, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const buy = async (planId: string) => {
    if (!user) {
      router.push("/signup");
      return;
    }
    if (planId === "FREE") {
      toast("You are already on the Free plan — it renews automatically", "info");
      return;
    }
    setBusy(planId);
    try {
      const d = await api<{ checkoutUrl: string }>("/api/checkout", { method: "POST", json: { planId } });
      window.location.href = d.checkoutUrl;
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Checkout failed", "error");
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Plans & Credits" subtitle="Transparent credit packs. Credits are only charged for successful generations." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.values(PLANS).map((p) => {
          const current = user?.plan === p.id;
          return (
            <div key={p.id} className={cn("relative flex flex-col rounded-2xl border p-5", p.id === "PRO" ? "border-accent/60 bg-accent/5" : "border-edge bg-panel/70")}>
              {p.id === "PRO" && <Badge tone="accent" className="absolute -top-2.5 left-4">Most popular</Badge>}
              <h3 className="font-semibold">{p.name}</h3>
              <p className="mt-2"><span className="text-3xl font-bold">${(p.priceCents / 100).toFixed(2)}</span><span className="text-sm text-muted">/mo</span></p>
              <p className="mt-1 flex items-center gap-1 text-sm text-amber"><Coins className="h-4 w-4" /> {p.monthlyCredits.toLocaleString()} credits</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> {f}</li>
                ))}
              </ul>
              <Button
                variant={p.id === "PRO" ? "accent" : "outline"}
                className="mt-5 w-full"
                loading={busy === p.id}
                disabled={current}
                onClick={() => void buy(p.id)}
              >
                {current ? "Current plan" : p.priceCents === 0 ? "Free forever" : "Upgrade"}
              </Button>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-center text-xs text-muted">
        Payments run through Stripe Checkout with server-side validation. This deployment must configure STRIPE_SECRET_KEY before checkout activates.
      </p>
    </div>
  );
}
