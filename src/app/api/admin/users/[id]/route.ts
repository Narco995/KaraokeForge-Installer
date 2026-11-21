import { NextRequest } from "next/server";
import { requireAdmin, HttpError } from "@/lib/auth";
import { handleRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { adminUserPatchSchema } from "@/lib/validation";
import { grantCredits } from "@/lib/credits";
import { audit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new HttpError(404, "User not found");

    const body = adminUserPatchSchema.parse(await req.json());

    if (body.role && body.role !== target.role) {
      if (target.id === admin.id && body.role !== "ADMIN") {
        throw new HttpError(400, "You cannot demote your own admin account");
      }
      await prisma.user.update({ where: { id }, data: { role: body.role } });
    }
    if (body.suspended !== undefined && body.suspended !== target.suspended) {
      if (target.id === admin.id && body.suspended) {
        throw new HttpError(400, "You cannot suspend your own account");
      }
      await prisma.user.update({ where: { id }, data: { suspended: body.suspended } });
    }
    if (body.creditDelta) {
      const balance = await grantCredits(id, body.creditDelta, `Admin adjustment by ${admin.email}`);
      await audit(admin.id, "admin.credit_adjust", { targetId: id, delta: body.creditDelta, balance });
    }
    await audit(admin.id, "admin.user_update", { targetId: id, ...body });

    const updated = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, plan: true, credits: true, suspended: true },
    });
    return { user: updated };
  });
}
