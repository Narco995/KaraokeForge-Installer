# FREEFIELDER — Competitive Gap Analysis

Audited commit: `fa87bac` + director pass. Verified against the actual repository
state (pages, routes, models, tests), not the feature list alone.

## Feature-level audit classification

| Area | Status | Evidence |
|---|---|---|
| Auth (signup/login/session/suspend) | Fully implemented & verified | Live smoke: signup→25 credits; `auth/me`; rate-limited login |
| Credit ledger HOLD→SPEND/REFUND | Fully implemented & verified | Live smoke: invalid-provider run → FAILED + refunded + 25 intact |
| Provider adapters (Replicate/fal/ElevenLabs) | Implemented, gated on keys; failover verified only via error paths | Unit tests + real Replicate 401 run; no successful real generation possible without keys |
| Auto model fallback (creation + run time) | Fully implemented & verified | `resolveWithFallback` unit tests; run-time failover code path exercised |
| Image Studio | Implemented, not verifiable without keys | Catalog + capability-driven UI + seed/negative/count controls |
| Video Studio (13 camera presets, model-aware) | Implemented, not verified with real generation | `CAMERA_PRESETS` (13), gating only exposes supported controls |
| AUDIO (TTS) | Implemented, gated on `ELEVENLABS_API_KEY` (free tier) | Adapter + catalog + persistence for AUDIO |
| Character Studio | Partially implemented | Reference storage + prompts; no automatic character-sheet planner yet; consistency clause shipped this pass |
| Editing Studio | Implemented (real canvas preview + WebM export); export not verified headless | Code-reviewed rAF + MediaRecorder pipeline |
| AI Director (brief→plan→shots→execute) | **NEW this pass**, fully unit-tested | `src/lib/director.ts`, `/api/director/*`, Storyboard table |
| Templates / Workflows | Implemented (static guidance) | `src/lib/templates.ts` |
| Admin dashboard | Implemented & verified (role-gated) | Live smoke previously |
| Payments (Stripe) | Implemented server-side, unverifiable without keys | checkout + webhook routes |
| Deploy (Docker/CI/fly.toml/render.yaml) | Implemented, CI green | run 44948261930 |
| Backups / monitoring | Implemented | `db:backup`, `/api/health` |

## Gaps vs leading AI creative platforms (public capabilities)

| Capability (category reference) | FREEFIELDER today | Gap / action taken |
|---|---|---|
| One-brief video productions | none before this pass | **AI Director** ships: brief → beats → shots → routed models → costed plan → shot-by-shot execution |
| Camera controls on video | 13 presets, model-aware | kept; Director auto-assigns presets from brief language |
| Character consistency | manual reference management | shipped honest `consistencyClause` prompt engineering; planner still manual |
| Reference-guided generation | supported (up to 4 refs, capability-gated) | unchanged |
| Storyboarding | static workflow text | persistent `Storyboard` model + reusable plans |
| Model intelligence | manual selection | **intelligent router** (quality/speed/cost + availability-aware) |
| Prompt quality | rule-based composer, LLM optional | added per-kind **artifact-reduction negatives**, style negatives, role vocabulary |
| Cost-aware planning | none | Director budgets every shot from the real catalog; blocks execution when nothing is runnable without charging |
| Endframe/last-frame video | not in catalog models' supported caps | honest: not offered until a catalog model supports it |
| Lip-sync / sound effects | missing | recorded as next-phase work, not faked |

## Highest-impact differentiators implemented first

1. **One-brief-to-production** (Director) — competitors put this burden on the user.
2. **Cost-aware routing** — plans show credit budgets before anything runs; unconfigured shots are flagged, never silently charged.
3. **Honest availability down to the shot level.**
