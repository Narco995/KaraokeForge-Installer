import type { ProviderAdapter, ProviderJobInput, ProviderStatus } from "./types";

const BASE = process.env.ELEVENLABS_API_BASE || "https://api.elevenlabs.io";
/** Public default voice (~Rachel). Override per request or via ELEVENLABS_VOICE_ID. */
const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

function toOfficialModel(providerModel: string): string {
  const map: Record<string, string> = {
    "eleven_multilingual_v2": "eleven_multilingual_v2",
    "eleven_flash_v2_5": "eleven_flash_v2_5",
    "eleven_turbo_v2_5": "eleven_turbo_v2_5",
  };
  return map[providerModel] ?? providerModel;
}

/**
 * ElevenLabs text-to-speech is a synchronous HTTP call returning raw audio,
 * so create() performs the request and buffers the result; poll() hands it to
 * the job runner as a data URL (no queue, no fabricated progress).
 */
export const elevenLabsAdapter: ProviderAdapter = {
  id: "elevenlabs",
  label: "ElevenLabs",
  isConfigured() {
    return Boolean(process.env.ELEVENLABS_API_KEY);
  },
  configureHint() {
    return "Set ELEVENLABS_API_KEY in the server environment to enable ElevenLabs voice models.";
  },
  buildInput(input: ProviderJobInput) {
    return {
      text: input.prompt,
      model_id: toOfficialModel(input.model.providerModel),
      voice_settings: {
        stability: Number(input.params.voiceStability ?? 0.5),
        similarity_boost: 0.75,
      },
    };
  },
  async create(input: ProviderJobInput) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");
    const voice = String(input.params.voiceId ?? DEFAULT_VOICE).slice(0, 100);
    const body = this.buildInput(input) as Record<string, unknown>;

    const res = await fetch(`${BASE}/v1/text-to-speech/${encodeURIComponent(voice)}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`ElevenLabs request failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) throw new Error("ElevenLabs returned no audio");

    const id = `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    pendingAudio.set(id, buf);
    return { providerJobId: id };
  },
  async poll(handle: { providerJobId: string }): Promise<ProviderStatus> {
    const buf = pendingAudio.get(handle.providerJobId);
    if (!buf) return { state: "failed", error: "Buffered ElevenLabs audio is gone (server restarted)" };
    pendingAudio.delete(handle.providerJobId);
    return { state: "succeeded", outputs: [`data:audio/mpeg;base64,${buf.toString("base64")}`] };
  },
};

/** Small in-memory handoff between create() and poll(); runner is single-process. */
export const pendingAudio = new Map<string, Buffer>();
