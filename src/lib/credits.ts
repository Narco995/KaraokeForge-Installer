import { prisma } from "./db";
import { HttpError } from "./auth";

export { PLANS, estimateCost } from "./plans";
export type { Plan } from "./plans";

/**
 * Ledger operations. A generation deducts a HOLD immediately; the hold is
 * finalized on success or refunded on failure. Credits are never charged for
 * failed jobs.
 */

async function ledgerAppend(userId: string, delta: number, kind: string, jobId?: string, note?: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { credits: true } });
    if (!user) throw new HttpError(404, "User not found");
    const balanceAfter = user.credits + delta;
    if (balanceAfter < 0 && delta < 0) {
      throw new HttpError(402, `Insufficient credits: need ${-delta}, balance ${user.credits}`);
    }
    await tx.user.update({ where: { id: userId }, data: { credits: balanceAfter } });
    await tx.creditLedgerEntry.create({
      data: { userId, delta, balanceAfter, kind, jobId, note },
    });
    return balanceAfter;
  });
}

export async function holdCredits(userId: string, amount: number, jobId: string): Promise<number> {
  return ledgerAppend(userId, -amount, "HOLD", jobId, "Generation hold");
}

export async function refundHold(userId: string, amount: number, jobId: string): Promise<number> {
  return ledgerAppend(userId, amount, "REFUND", jobId, "Failed generation refund");
}

export async function finalizeHold(userId: string, amount: number, jobId: string): Promise<number> {
  return ledgerAppend(userId, 0, "SPEND_FINAL", jobId, `Final charge; ${amount} credits consumed`);
}

export async function grantCredits(userId: string, amount: number, note: string): Promise<number> {
  return ledgerAppend(userId, amount, "ADMIN_ADJUST", undefined, note);
}

export async function recordPurchase(userId: string, amount: number, note: string): Promise<number> {
  return ledgerAppend(userId, amount, "PURCHASE", undefined, note);
}
