# FREEFIELDER — Progress Ledger

## Verified (local evidence)

- Build green (Next.js 15.5.29, strict TS). Unit tests: 47/47 passing (models, plans, prompt-engine, registry+fallback, router, director).
- Live server smoke (previous pass): signup → 25 credits; unconfigured generate → 409 zero-charge; invalid-token generation → FAILED + refunded + balance intact; admin role gating.
- DB: SQLite via Prisma; new `Storyboard` table pushed with `prisma db push`.
- CI green on `main`: run 44948261930 (and predecessor).
- Full journey smoke: project create → upload → character → director plan (7 shots, 392 cr, 7 honest warnings) → execute (0 queued / 7 blocked, 25 credits intact) → reopen board (plan persisted). Note: logout clears the browser cookie, but the session JWT remains replayable until expiry if a client ignores `Set-Cookie` — standard stateless-JWT trade-off; mitigate later with a short TTL or a server-side denylist if needed.

## This pass (product evolution)

1. Intelligent model router (`src/lib/router.ts`) — quality/speed/cost ranking, tool+capability+availability aware. 7 unit tests.
2. AI Director engine (`src/lib/director.ts`) — brief → beats → shots (establishing/hero stills, camera-aware motion, optional narration), style treatments, per-shot credit estimates. 5 unit tests.
3. Storyboards persisted (`Storyboard` table) + API: `GET/POST /api/director/boards`, `GET/DELETE /api/director/boards/[id]`, `POST /api/director/boards/[id]/execute` (per-shot real jobs; honest per-shot BLOCKED results when unconfigured; never charges blocked shots).
4. Director UI in **Create** (no duplicate interface): brief → plan table (model/camera/credits/availability) → execute with live results.
5. Prompt quality: `defaultNegativePrompt(kind, style)` (artifact-reduction), `consistencyClause(character?)`, `craftShotPrompt(beat, style, role)`.
6. Docs: this ledger + `docs/COMPETITIVE_GAP_ANALYSIS.md`.

## Not verifiable here (requires credentials/hardware)

- Successful real image/video/audio generation (no provider keys in this environment; Replicate/fal require billing, ElevenLabs free key requires account creation).
- Editing Studio browser export (MediaRecorder needs a real browser session).
- Stripe live subscriptions.
- The quality delta of prompt-engineering changes on real outputs — by policy we do not claim output-quality improvements without generated evidence.

## Next upgrades (ranked)

1. First/last-frame video once a catalog model + adapter support it (needs a provider with that capability and a key to verify).
2. Auto character-sheet planner (front/profile/full-body shots from one reference set).
3. Shot continuity checking across completed shots (diff embeddings or at minimum seed/palette carry-over — requires real outputs to validate).
4. Smart regeneration of weak/failed shots with retry budget.
5. BullMQ/Redis queue + object storage (S3/R2) for multi-instance scale.
