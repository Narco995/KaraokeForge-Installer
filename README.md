# FREEFIELDER AI

**Your Imagination. No Limits.**

An independent, production-grade AI creative platform: image, video, character, editing and product studios in one cinematic workspace. Built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Prisma + SQLite, and a provider-adapter architecture that connects to real AI inference APIs (Replicate, fal.ai).

---

## What is implemented

### Studios (all 12-route workspace)

| Route | Studio | Notes |
|---|---|---|
| `/` | Home | Landing page + authed dashboard (stats, quick actions, recent generations) |
| `/explore` | Explore | Tag-filtered prompt template gallery with studio deep-links |
| `/create` | Create | All tools in one launcher |
| `/studio/image` | Image Studio | Text-to-image, image-to-image, upscale (2x/4x + face enhance), background removal |
| `/studio/video` | Video Studio | Text-to-video + image-to-video, **13 camera presets**, shot types, duration & negative prompt per model capability |
| `/studio/character` | Character Studio | Character profiles with multi photo references, honest identity-preservation messaging |
| `/studio/edit` | AI Editing | **Working browser timeline**: multi-track canvas compositing, trim, split, reorder, crossfades, text overlays, audio tracks, WebM export (real `MediaRecorder`, not faked) |
| `/templates` | Templates | 12 guided workflows + 12 one-click templates |
| `/creations` `/projects` `/favorites` | Library | Asset management, projects, favorites |
| `/settings` | Settings | Profile, credit ledger, plan |
| `/pricing` | Pricing | Free / Starter / Pro / Premium with Stripe checkout (when configured) |
| `/admin` | Admin dashboard | Overview stats, user management (credits/role/suspend with self-protection), job monitor, model status, audit logs |

### Backend

- **Auth**: bcryptjs + JWT (`jose`) in an HttpOnly cookie (`ff_session`), rate-limited login/signup, suspension enforcement.
- **Credit ledger**: every job uses `HOLD → SPEND_FINAL | REFUND` semantics. **Failed generations are always refunded; no credits are charged for failures.** Exit code 402 on insufficient balance.
- **Job runner**: in-process async runner with 2 attempts, provider polling, per-kind timeouts, output persistence, audit logging. (Production note: swap for BullMQ/Redis below.)
- **Provider adapters**: `src/lib/providers/` — Replicate and fal.ai adapters with per-model input mapping, `Prefer: respond-async` job creation, polling, and output normalization.
- **Honest availability gating**: every model's availability is computed from *actual configured env keys*. Unavailable models are visibly labeled "Not connected" with the exact env var needed — nothing is advertised that cannot run.
- **Capability-driven UI**: aspect ratio, duration, negative prompt, camera controls, seed, strength, motion strength only render when the selected model declares support.
- **Storage**: generated/uploaded files mirrored to `.data/uploads`, served via `/api/assets/[id]/file` with path-traversal protection (CDN-prefixed `ASSET_CDN_URL` supported).
- **Payments**: Stripe Checkout via REST, server-side `payment_status === "paid"` verification, idempotent credit fulfillment, HMAC webhook verification (`timingSafeEqual`).
- **Prompt engine**: deterministic rule-based enhancement (lens/lighting/style/camera vocabulary); optional `OPENAI_API_KEY` upgrade. The exact final prompt is always shown and stored — no fabricated AI.
- **Validation**: zod schemas on every mutating route; `handleRoute` wrapper maps errors to clean JSON.

## Setup

```bash
npm install
npm run db:push      # create SQLite schema
npm run build && npm start   # or: npm run dev
npm run db:seed      # optional: create the admin user
npm test             # vitest: 26 unit tests
```

Configure via `.env` (see `.env.example`). All keys are optional — every integration degrades honestly:

```ini
AUTH_SECRET=              # required for login (openssl rand -base64 48)
DATABASE_URL="file:./dev.db"
ADMIN_EMAIL= / ADMIN_PASSWORD=   # used by the seed script
REPLICATE_API_TOKEN=      # enables flux-schnell, sdxl, flux-dev, flux-1.1-pro, minimax, kling, real-esrgan, rembg
FAL_KEY=                  # enables fal flux + minimax
OPENAI_API_KEY=           # optional LLM prompt enhancement
STRIPE_SECRET_KEY=        # enables checkout
STRIPE_WEBHOOK_SECRET=    # enables webhook fulfillment
```

With no provider keys, studios and the model hub show exactly which env var unlocks each model; the generate API returns 409 (no credits touched); Stripe checkout returns 503.

## Environment

## Phase status

- **Phase 1** Branding, design system, auth, dashboard — done
- **Phase 2** Image Studio + integrations (adapter layer) — done (needs live API key to activate)
- **Phase 3** Video Studio + integrations — done (needs live API key to activate)
- **Phase 4** Character Studio + references — done
- **Phase 5** Workflows + templates — done
- **Phase 6** Editing Studio — done (realtime WebM export)
- **Phase 7** Credits, subscriptions, Stripe — done
- **Phase 8** Admin dashboard + monitoring — done
- **Phase 9** Tests (26 passing), build green, security review — done

## Honest limitations / production roadmap

- **Job queue**: in-process runner is fine for single-instance dev; production should move to BullMQ/Redis with webhooks.
- **Storage**: local `.data/uploads` should become S3/R2 in multi-instance deployments (the storage layer is already CDN-URL aware).
- **Database**: SQLite should become Postgres (Prisma schema is portable) for production.
- **Editing export**: realtime WebM capture today; server-side ffmpeg H.264 remux is planned.
- **Character consistency**: uses reference-image conditioning — identity preservation is never guaranteed or advertised as such.
- **Voice/audio generation model**: catalog and adapter architecture are ready; no audio model is enabled until a provider is configured (nothing fake is offered).
