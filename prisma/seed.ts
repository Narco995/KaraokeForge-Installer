import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@freefielder.local").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe-Admin-2024!";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    if (existing.role !== "ADMIN") {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
      console.log(`Promoted existing user ${adminEmail} to ADMIN.`);
    } else {
      console.log(`Admin ${adminEmail} already exists — nothing to do.`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: "Platform Admin",
      passwordHash,
      role: "ADMIN",
      plan: "PREMIUM",
      credits: 100000,
    },
  });

  await prisma.creditLedgerEntry.create({
    data: {
      userId: admin.id,
      delta: 100000,
      balanceAfter: 100000,
      kind: "GRANT",
      note: "Initial admin grant",
    },
  });

  console.log(`Seeded admin user: ${adminEmail}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`Default password used: ${adminPassword} — change it after first login.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
