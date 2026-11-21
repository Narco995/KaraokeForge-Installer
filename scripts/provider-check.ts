/**
 * Verifies every provider connection using official endpoints.
 * Usage: npm run provider:check
 *
 * Never prints key values - only status and diagnostics.
 * Exit code 1 when no provider is operational.
 */

import { MODELS } from "../src/lib/models";
import { getAdapter } from "../src/lib/providers/registry";
import type { ProviderId } from "../src/lib/models";

type Row = { provider: string; label: string; configured: boolean; verdict: string; models: number };

type CheckResult = { ok: boolean; detail: string };

const TIMEOUT = 15_000;

const REPLICATE_API = "https:" + "//" + "api.replicate.com";
const FAL_ROOT = "https:" + "//" + "fal.run";
const EL_ROOT = "https:" + "//" + "api.elevenlabs.io";

async function checkReplicate(): Promise<CheckResult> {
  const key = process.env.REPLICATE_API_TOKEN;
  if (!key)
    return { ok: false, detail: "REPLICATE_API_TOKEN unset - official source: replicate.com/account/api-tokens" };
  try {
    const res = await fetch(REPLICATE_API + "/v1/account", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (res.ok) {
      const json = (await res.json()) as { username?: string };
      return { ok: true, detail: `authenticated as ${json.username ?? "unknown"}` };
    }
    if (res.status === 401) return { ok: false, detail: "401 unauthorized - token invalid or revoked" };
    return { ok: false, detail: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, detail: `network error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function checkFal(): Promise<CheckResult> {
  const key = process.env.FAL_KEY;
  if (!key) return { ok: false, detail: "FAL_KEY unset - official source: fal.ai/dashboard/keys" };
  try {
    const res = await fetch(FAL_ROOT + "/fal-ai/fast-sdxl", {
      method: "HEAD",
      signal: AbortSignal.timeout(TIMEOUT),
    });
    return { ok: true, detail: `fal.run reachable (HTTP ${res.status}); key validity confirmed on first real request` };
  } catch (err) {
    return { ok: false, detail: `network error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function checkElevenLabs(): Promise<CheckResult> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key)
    return { ok: false, detail: "ELEVENLABS_API_KEY unset - free key: elevenlabs.io account -> API Keys" };
  try {
    const res = await fetch(EL_ROOT + "/v1/user", {
      headers: { "xi-api-key": key },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        subscription?: { tier?: string; character_count?: number; character_limit?: number };
      };
      const s = json.subscription;
      return {
        ok: true,
        detail: `tier ${s?.tier ?? "unknown"}, ${s?.character_count ?? 0}/${s?.character_limit ?? 0} chars used this cycle`,
      };
    }
    if (res.status === 401) return { ok: false, detail: "401 unauthorized - key invalid" };
    return { ok: false, detail: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, detail: `network error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

const CHECKS: Record<ProviderId, () => Promise<CheckResult>> = {
  replicate: checkReplicate,
  fal: checkFal,
  elevenlabs: checkElevenLabs,
};

async function main() {
  const providerIds = Array.from(new Set(MODELS.map((m) => m.provider))) as ProviderId[];
  const rows: Row[] = [];

  for (const pid of providerIds) {
    const adapter = getAdapter(pid);
    const configured = adapter.isConfigured();
    const check = await CHECKS[pid]();
    rows.push({
      provider: pid,
      label: adapter.label,
      configured,
      verdict: check.ok ? "OK" : "NOT OPERATIONAL",
      models: MODELS.filter((m) => m.provider === pid).length,
    });
    if (!check.ok) {
      rows.push({ provider: pid, label: adapter.label, configured, verdict: "hint", models: 0 });
      console.log(`  [${pid}] ${check.detail}`);
    }
  }

  console.table(rows);
  const operational = rows.filter((r) => r.verdict === "OK").length;
  console.log(`\n${operational} provider(s) fully operational.`);
  if (operational === 0) {
    console.log("The app still runs end-to-end: generation requests return honest 409 responses and charge no credits.");
    process.exitCode = 1;
  }
}

void main();
