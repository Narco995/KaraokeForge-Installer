"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { api, ApiError } from "@/lib/client";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";
import { useAuth, useToast } from "@/components/providers";
import { Coins, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

type LedgerEntry = { id: string; delta: number; balanceAfter: number; kind: string; note?: string | null; createdAt: string };
type LedgerResponse = { balance: number; plan: string; ledger: LedgerEntry[] };

function SettingsInner() {
  const { user, refresh, logout } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const search = useSearchParams();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<LedgerResponse>("/api/credits").then((d) => setLedger(d.ledger)).catch(() => {});
    const tx = search.get("tx");
    const status = search.get("checkout");
    if (tx && status === "success") {
      setBusy(true);
      api<{ status: string }>("/api/checkout/verify", { method: "POST", json: { txId: tx } })
        .then((r) => {
          if (r.status === "COMPLETED") {
            toast("Payment confirmed — credits added and plan upgraded", "success");
            void refresh();
          } else {
            toast("Payment not confirmed yet — it will settle automatically via webhook", "info");
          }
        })
        .catch((e) => toast(e instanceof ApiError ? e.message : "Verification failed", "error"))
        .finally(() => setBusy(false));
    }
  }, [search, refresh, toast]);

  if (!user) {
    return <EmptyState title="Not signed in" action={<Button variant="accent" onClick={() => router.push("/login")}>Log in</Button>} />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" subtitle="Profile, plan and complete credit ledger." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-edge bg-panel/70 p-5">
          <h3 className="font-semibold">{user.name}</h3>
          <p className="mt-0.5 text-sm text-muted">{user.email}</p>
          <div className="mt-3 flex gap-2">
            <Badge tone="accent"><span className="capitalize">{user.plan.toLowerCase()}</span> plan</Badge>
            {user.role === "ADMIN" && <Badge tone="amber">Administrator</Badge>}
          </div>
          <Button variant="outline" className="mt-4" onClick={logout}>Log out</Button>
        </div>
        <div className="rounded-2xl border border-edge bg-panel/70 p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted"><Coins className="h-4 w-4 text-amber" /> Credit balance</div>
          <p className="mt-2 text-3xl font-bold text-amber">{user.credits.toLocaleString()}</p>
          <div className="mt-3 flex gap-2">
            <Button variant="accent" onClick={() => router.push("/pricing")}><CreditCard className="h-4 w-4" /> Upgrade</Button>
          </div>
          <p className="mt-3 text-xs text-muted">Credits are held at queue time and refunded automatically for failed or canceled jobs.</p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Usage history</h2>
      <div className="overflow-hidden rounded-2xl border border-edge">
        <table className="w-full text-sm">
          <thead className="bg-panel-2 text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3 text-right">Change</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((l) => (
              <tr key={l.id} className="border-t border-edge">
                <td className="px-4 py-3 text-muted">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                    l.delta > 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                  )}>{l.kind}</span>
                </td>
                <td className="px-4 py-3 text-muted">{l.note}</td>
                <td className={cn("px-4 py-3 text-right font-semibold", l.delta > 0 ? "text-success" : "text-danger")}>
                  {l.delta > 0 ? "+" : ""}{l.delta}
                </td>
                <td className="px-4 py-3 text-right text-muted">{l.balanceAfter}</td>
              </tr>
            ))}
            {ledger.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No ledger entries yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  );
}
