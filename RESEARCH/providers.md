# FREEFIELDER AI — Provider Research & Credential Requirements

Researched against official provider documentation (2026-11). The platform runs
end-to-end with **zero** providers configured: every unconfigured model is
honestly reported as "Not connected", `/api/generate` returns a real `409`
and charges no credits. Adding keys below immediately enables the corresponding
models — no code changes required.

## Provider selection (why these)

| Concern | Chosen | Official source | Tier | Why |
|---|---|---|---|---|
| Audio / voice | **ElevenLabs** | elevenlabs.io | **Free tier: 10,000 credits/month (~10k TTS chars), no card required** | Best-in-class multilingual TTS, synchronous HTTP (no queue), official `xi-api-key` |
| Image + video (paid, highest quality) | **Replicate** | replicate.com | Pay-per-output; billing/card required for real use | Largest official catalog (FLUX, Wan, real-esrgan, background removal), stable official REST API |
| Image + video (paid, fast alternative) | **fal.ai** | fal.ai | Prepaid credits; card required | Very low latency, official REST, good failover target for Replicate |
| Optional prompt enhancement | **OpenAI** | platform.openai.com | Prepaid (very low cost, gpt-4o-mini) | Only path to genuine LLM prompt rewriting; without it a deterministic rule-based composer is used (honestly labeled in-app) |
| Payments | **Stripe** | dashboard.stripe.com | Free to set up; standard processing fees | Industry standard; our integration validates sessions server-side |

## Model catalog wiring (already implemented)

| Kind | Models in catalog | Provider | Gated on |
|---|---|---|---|
| IMAGE | flux-schnell, flux-dev, flux-1.1-pro (replicate), fal-flux-schnell (fal) | replicate, fal | `REPLICATE_API_TOKEN` / `FAL_KEY` |
| VIDEO | minimax-video-01, kling-v2.1 (replicate), fal-minimax-video-01 (fal) | replicate, fal | `REPLICATE_API_TOKEN` / `FAL_KEY` |
| AUDIO | eleven-multilingual-v2, eleven-flash-v2.5 | elevenlabs | `ELEVENLABS_API_KEY` |
| UPSCALE/EDIT | esrgan / background removal (replicate) | replicate | `REPLICATE_API_TOKEN` |

## Automatic alternative selection (implemented)

- At job creation: if the requested model has no configured key, the registry
  picks the cheapest available model of the same kind supporting the same tool;
  an audit log entry `generation.auto_fallback` records the swap. If nothing is
  available → HTTP 409, hold refunded, nothing charged.
- At run time: if 2 attempts against one provider fail, the runner switches to
  a different compatible provider and picks it up; if that also fails the job
  fails cleanly and the credit hold is refunded. Replay safety is guaranteed by
  the HOLD → SPEND_FINAL / REFUND ledger.
- At server boot: `src/instrumentation.ts` fails-and-refunds any RUNNING job
  older than 15 minutes and re-dispatches QUEUED jobs (set `APP_ORIGIN` when
  running behind a real domain so reference URLs resolve).

## Credential acquisition — exactly what is required from you

I verified official sources. Accounts/keys cannot be created by an agent for
you (identity, ToS acceptance, possibly payment), so these are the only actions
that need a human:

| # | Action | Free? | Official link | Unlocks |
|---|---|---|---|---|
| 1 | Create ElevenLabs account, copy API key | **Yes — free tier, no card** | https://elevenlabs.io → profile → **API Keys** | Voice/audio generation (2 models) |
| 2 | Create Replicate account, add billing, copy API token | No (pay-per-output) | https://replicate.com/account/api-tokens | Image + video + upscale + background removal (7 models) |
| 3 | Create fal.ai account, add prepaid credits, copy key | No (prepaid) | https://fal.ai/dashboard/keys | Fast image/video fallback lanes (2 models) |
| 4 | (Optional) OpenAI key, prepay a few dollars | No (prepaid) | https://platform.openai.com/api-keys | Real LLM prompt enhancement |
| 5 | Stripe account, copy secret + webhook secrets | Free setup | https://dashboard.stripe.com/apikeys | Real subscriptions/payments |
| 6 | Hosting account (Fly.io **or** Render), create service from this repo; deploy configs are already in-repo (`fly.toml`, `render.yaml`) | Fly/Render both bill hourly from ~$3–7/mo | https://fly.io/dashboard · https://dashboard.render.com | Public hosted URL |
| 7 | Repo description edit (GitHub UI): current description still says "KaraokeForge"; my token got HTTP 403 on `gh repo edit` (missing repo-admin scope), change it in **Settings → General → Description** to e.g. "FREEFIELDER AI — Your Imagination. No Limits." | Free | https://github.com/Narco995/KaraokeForge-Installer/settings | Branding consistency only |
| 8 | Domain name (optional) | ~$10/yr | any registrar | Custom URL |

## How to configure keys once obtained

Locally: put them in `.env` (gitignored). In production: use the platform's
secret store (`fly secrets set …`, Render env vars). Verify everything with:

```
npm run provider:check   # authenticates each provider against official endpoints
npm run db:backup        # SQLite hot backup into .data/backups (keeps 20)
```

## Notes / trade-offs

- SQLite + 5 GB disk is correct for single-node deployments where generation
  volume is per-creative-user; the documented upgrade path is Postgres
  (Prisma swap of one provider line) + S3/R2 for assets + BullMQ for jobs.
- ElevenLabs TTS is synchronous: the adapter buffers audio server-side and
  hands it to the runner as a data URL — no fabricated progress, real MP3 bytes.
- Latency: ten seconds image, ~1–6 min video depending on model; UI shows
  genuine job state from the provider, never invented progress bars.
