import { CAMERA_PRESETS, SHOT_TYPES, type CameraPresetId, type ShotTypeId } from "./models";

/**
 * Deterministic, honest prompt engineering. When OPENAI_API_KEY is configured
 * an LLM rewrites the user's idea into a richer creative brief; otherwise the
 * rule-based composer applies cinematography vocabulary. Either way the user
 * sees exactly what was sent to the model (the final prompt is stored on the
 * job and shown in the UI).
 */

export type EnhanceOptions = {
  kind: "IMAGE" | "VIDEO";
  cameraPreset?: string;
  shotType?: string;
  lens?: string;
  lighting?: string;
  style?: string;
};

const LENS_PRESETS: Record<string, string> = {
  wide: "shot on 24mm wide-angle lens, deep focus",
  standard: "shot on 50mm lens, natural perspective",
  portrait: "shot on 85mm portrait lens, shallow depth of field",
  macro: "100mm macro lens, extreme detail",
  anamorphic: "anamorphic 2.39:1 widescreen, oval bokeh",
};

const LIGHTING_PRESETS: Record<string, string> = {
  cinematic: "dramatic cinematic lighting, high contrast, teal and orange grade",
  golden: "warm golden hour sunlight, long soft shadows",
  studio: "clean studio lighting, softbox key light, seamless backdrop",
  noir: "film noir lighting, hard shadows, low key",
  neon: "moody neon lighting, wet reflective surfaces, cyberpunk glow",
  natural: "soft natural window light, photorealistic",
};

const STYLE_PRESETS: Record<string, string> = {
  photoreal: "hyper-photorealistic, 8k detail, physically accurate materials",
  film: "shot on 35mm film, subtle grain, halation, analog color science",
  anime: "modern anime key visual, crisp linework, vibrant cel shading",
  render3d: "octane render, physically based materials, global illumination",
  watercolor: "loose watercolor painting, textured paper, bleeding pigments",
  ugc: "authentic UGC smartphone aesthetic, slightly imperfect framing",
};

export function ruleBasedEnhance(prompt: string, opts: EnhanceOptions): string {
  const parts = [prompt.trim()];

  const shot = SHOT_TYPES.find((s) => s.id === opts.shotType && s.id !== "none");
  if (shot?.prompt) parts.push(shot.prompt);

  const camera = CAMERA_PRESETS.find((c) => c.id === opts.cameraPreset);
  if (camera && opts.kind === "VIDEO") parts.push(camera.prompt);

  if (opts.lens && LENS_PRESETS[opts.lens]) parts.push(LENS_PRESETS[opts.lens]);
  if (opts.lighting && LIGHTING_PRESETS[opts.lighting]) parts.push(LIGHTING_PRESETS[opts.lighting]);
  if (opts.style && STYLE_PRESETS[opts.style]) parts.push(STYLE_PRESETS[opts.style]);

  if (opts.kind === "IMAGE") {
    parts.push("balanced composition, noise-free, production quality");
  } else {
    parts.push("coherent motion, stable subject identity across frames, professional color grade");
  }

  return parts.join(", ");
}

export async function enhancePrompt(prompt: string, opts: EnhanceOptions): Promise<string> {
  const fallback = ruleBasedEnhance(prompt, opts);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              opts.kind === "VIDEO"
                ? "You are a film director. Rewrite the user's idea as one vivid video-generation prompt (max 90 words). Include subject, action, environment, and camera behaviour. Output only the prompt."
                : "You are an art director. Rewrite the user's idea as one vivid image-generation prompt (max 70 words). Include subject, composition, lighting, and medium. Output only the prompt.",
          },
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text || text.length < 10) return fallback;
    return text;
  } catch {
    return fallback;
  }
}

/**
 * Artifact-reduction negative prompts. Applied as suggestions (Director plans
 * embed them; users can always override in the studios). These encode known
 * diffusion/audio failure modes per media kind, not invented capabilities.
 */
const KIND_NEGATIVES: Record<string, string> = {
  IMAGE: "blurry, low resolution, jpeg artifacts, watermark, signature, text glitches, deformed hands, extra limbs, oversaturated",
  VIDEO: "flickering, morphing faces, jitter, warping background, text artifacts, abrupt cuts, ghosting",
  AUDIO: "static noise, clipping, robotic distortion, echo artifacts",
};

const STYLE_NEGATIVES: Record<string, string> = {
  photoreal: "cartoon, illustration, 3d render look, plastic skin",
  film: "digital oversharpening, hdr glow, modern digital video look",
  anime: "photorealistic, uncanny 3d proportions",
  ugc: "polished commercial lighting, studio perfectionism",
};

export function defaultNegativePrompt(kind: "IMAGE" | "VIDEO" | "AUDIO", style?: string): string {
  const parts = [KIND_NEGATIVES[kind] ?? ""];
  if (style && STYLE_NEGATIVES[style]) parts.push(STYLE_NEGATIVES[style]);
  return parts.filter(Boolean).join(", ");
}

/**
 * Character-continuity clause. Honest by design: it maximizes the chance of
 * recognition by re-stating identity attributes; it never guarantees perfect
 * identity preservation (see Character Studio messaging).
 */
export function consistencyClause(characterName?: string): string {
  const base = "consistent character identity across all shots, same facial structure, same hair, same wardrobe";
  return characterName ? `${base} (${characterName})` : base;
}

const ROLE_CLAUSES: Record<string, string> = {
  establishing: "wide establishing composition, clear environment read, layered depth",
  hero: "hero framing, subject prominence, production-key-art quality",
  motion: "expressive motion, clear subject action, professional color grade",
};

/** Compose a director shot prompt from a beat + style treatment + shot role. */
export function craftShotPrompt(beat: string, style: DirectorStyleParam, role: string): string {
  const treatment = STYLE_TREATMENTS[style] ?? STYLE_TREATMENTS.cinematic;
  return [beat.trim(), treatment, ROLE_CLAUSES[role] ?? "", "balanced composition, noise-free, production quality"]
    .filter(Boolean)
    .join(", ");
}

const STYLE_TREATMENTS: Record<string, string> = {
  cinematic: "shot on 35mm film, filmic halation, professional color grade",
  product: "premium product photography, seamless gradient backdrop, crisp reflections",
  ugc: "authentic UGC smartphone feel, natural handheld framing",
  anime: "modern anime key visual, crisp linework, vibrant cel shading",
  documentary: "observational documentary framing, natural light, honest textures",
  fashion: "editorial fashion photography, controlled studio strobes, confident posing",
};

type DirectorStyleParam = "cinematic" | "product" | "ugc" | "anime" | "documentary" | "fashion";

/** Compose the final video prompt from scene description + camera directive. */
export function composeVideoPrompt(
  scene: string,
  cameraPreset?: CameraPresetId | "",
  shotType?: ShotTypeId | ""
): string {
  const parts = [scene.trim()];
  const camera = CAMERA_PRESETS.find((c) => c.id === cameraPreset);
  if (camera && camera.id !== "static") parts.push(camera.prompt);
  else if (camera?.id === "static") parts.push(camera.prompt);
  const shot = SHOT_TYPES.find((s) => s.id === shotType && s.id !== "none");
  if (shot?.prompt) parts.push(shot.prompt);
  return parts.filter(Boolean).join(", ");
}
