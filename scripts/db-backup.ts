/**
 * SQLite hot backup using VACUUM INTO (safe while the app is running).
 * Usage: npm run db:backup [output-directory]
 *
 * Keeps the 20 newest backups in the target directory.
 */

import { mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const KEEP = 20;

function requireSqliteUrl(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:")) {
    console.error(`db:backup only supports SQLite DATABASE_URL (got "${url.slice(0, 12)}...")`);
    process.exit(1);
  }
  return url.slice("file:".length);
}

async function main() {
  const outDir = process.argv[2] ?? join(process.cwd(), ".data", "backups");
  mkdirSync(outDir, { recursive: true });

  const prisma = new PrismaClient();
  try {
    requireSqliteUrl();
    const stamp = new Date().toISOString().replaceAll(":", "").replaceAll(".", "-");
    const target = join(outDir, `freefielder-${stamp}.db`);

    await prisma.$executeRawUnsafe(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
    const size = statSync(target).size;
    console.log(`backup written: ${target} (${(size / 1024).toFixed(1)} kB)`);

    const backups = readdirSync(outDir)
      .filter((f) => f.endsWith(".db"))
      .sort()
      .reverse();
    for (const stale of backups.slice(KEEP)) {
      const p = join(outDir, stale);
      const s = statSync(p);
      if (s.isFile()) {
        unlinkSync(p);
        console.log(`pruned old backup: ${stale}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
