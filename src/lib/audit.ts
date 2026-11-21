import { prisma } from "@/lib/db";

export async function audit(userId: string | null, action: string, detail?: Record<string, unknown>) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        detail: detail ? JSON.stringify(detail) : null,
      },
    });
  } catch {
    // Audit logging must never break the user-facing flow.
  }
}
