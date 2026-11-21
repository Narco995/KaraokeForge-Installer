/**
 * AI Director — one brief to a complete, costed production plan.
 *
 * Deterministic scene decomposition: the brief is parsed into beats, each beat
 * becomes shot(s) with concrete tool/model/camera/prompt choices made by the
 * intelligent router. Planning NEVER fabricates availability: shots that the
 * current deployment cannot execute are still listed (so the plan is a real
 * production document) but carry an availability warning, and execution
 * returns the honest per-shot result from the generation pipeline (409,
 * zero-charge when unconfigured).
 */

import { CAMERA_PRESETS, type CameraPresetId, getModel } from "./models";
import type { ModelKind } from "./models";
import { routeModel, type RoutePriority } from "./router";
import { defaultNegativePrompt, craftShotPrompt } from "./prompt-engine";
import { estimateCost } from "./credits";
import { getModelStatus } from "./providers/registry";

export type DirectorStyle = "cinematic" | "product" | "ugc" | "anime" | "documentary" | "fashion";

export type DirectorShot = {
  index: number;
  beat: string;
  kind: ModelKind;
  tool: string;
  modelId: string;
  modelName: string;
  available: boolean;
  availabilityReason?: string;
  cameraPreset?: CameraPresetId;
  prompt: string;
  negativePrompt?: string;
  params: Record<string, unknown>;
  estCredits: number;
  rationale: string;
};

export type DirectorPlan = {
  title: string;
  brief: string;
  style: DirectorStyle;
  aspect: string;
  beats: { name: string; description: string }[];
  shots: DirectorShot[];
  totalCredits: number;
  warnings: string[];
};

const STYLE_TREATMENT: Record<DirectorStyle, { suffix: string; aspectHint: string }> = {
  cinematic: { suffix: "shot on 35mm film, filmic halation, professional color grade", aspectHint: "2.39:1 widescreen framing, deep staging" },
  product: { suffix: "premium product photography, seamless gradient backdrop, crisp reflections", aspectHint: "clean centered composition" },
  ugc: { suffix: "authentic UGC smartphone feel, natural handheld framing", aspectHint: "vertical-first framing" },
  anime: { suffix: "modern anime key visual, crisp linework, vibrant cel shading", aspectHint: "expressive wide framing" },
  documentary: { suffix: "observational documentary framing, natural light, honest textures", aspectHint: "documentary framing" },
  fashion: { suffix: "editorial fashion photography, controlled studio strobes, confident posing", aspectHint: "full-body fashion framing" },
};

const CAMERA_KEYWORDS: { preset: CameraPresetId; words: string[] }[] = [
  { preset: "orbit", words: ["orbit", "around", "surround", "circle"] },
  { preset: "dolly_in", words: ["approach", "move toward", "push in", "reveal", "enter"] },
  { preset: "dolly_out", words: ["pull back", "reveal the", "step back", "widens"] },
  { preset: "tracking", words: ["follow", "chase", "tracking", "runs", "walks through"] },
  { preset: "crane", words: ["aerial", "drone", "above", "sweep", "crane"] },
  { preset: "handheld", words: ["chaos", "panic", "urgency", "handheld", "shaky"] },
  { preset: "fpv", words: ["fpv", "speed", "fly", "racing"] },
  { preset: "static", words: [] }, // fallback
];

const ASPECT_BY_STYLE: Record<DirectorStyle, string> = {
  cinematic: "16:9",
  product: "1:1",
  ugc: "9:16",
  anime: "16:9",
  documentary: "16:9",
  fashion: "4:5",
};

function detectCamera(text: string): CameraPresetId {
  const lower = text.toLowerCase();
  for (const entry of CAMERA_KEYWORDS) {
    if (entry.words.some((w) => lower.includes(w))) return entry.preset;
  }
  return "dolly_in";
}

function splitBeats(brief: string, maxBeats: number): string[] {
  const sentences = brief
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentences.length <= maxBeats) return sentences;
  const perBeat = Math.ceil(sentences.length / maxBeats);
  const beats: string[] = [];
  for (let i = 0; i < sentences.length; i += perBeat) {
    beats.push(sentences.slice(i, i + perBeat).join(" "));
    if (beats.length === maxBeats) break;
  }
  return beats;
}

export function planFromBrief(
  brief: string,
  opts: {
    style?: DirectorStyle;
    aspect?: string;
    maxBeats?: number;
    priority?: RoutePriority;
    includeNarration?: boolean;
  } = {}
): DirectorPlan {
  const style = (opts.style && STYLE_TREATMENT[opts.style] ? opts.style : "cinematic") as DirectorStyle;
  const aspect = opts.aspect ?? ASPECT_BY_STYLE[style];
  const maxBeats = Math.min(Math.max(opts.maxBeats ?? 4, 1), 8);
  const priority: RoutePriority = opts.priority ?? "quality";

  const beatTexts = splitBeats(brief, maxBeats);
  const beats = beatTexts.map((text, i) => ({
    name: `Scene ${i + 1}`,
    description: text,
  }));
  const warnings: string[] = [];
  const shots: DirectorShot[] = [];
  let index = 0;

  const baseParams = { count: 1, aspectRatio: aspect };

  const addImageShot = (beat: string, role: string) => {
    const model =
      routeModel({ kind: "IMAGE", tool: "text_to_image", priority }).best ??
      routeModel({ kind: "IMAGE", tool: "text_to_image", priority }, { availableOnly: false }).best;
    if (!model) return;
    const status = getModelStatus(model);
    shots.push({
      index: index++,
      beat,
      kind: "IMAGE",
      tool: "text_to_image",
      modelId: model.id,
      modelName: model.name,
      available: status.available,
      availabilityReason: status.reason,
      prompt: craftShotPrompt(beat, style, role),
      negativePrompt: defaultNegativePrompt("IMAGE", style),
      params: { ...baseParams },
      estCredits: estimateCost(model.creditScore, 1),
      rationale: `${role} frame routed to ${model.name} (${priority} priority).`,
    });
  };

  const addVideoShot = (beat: string) => {
    const camera = detectCamera(`${beat} ${STYLE_TREATMENT[style].suffix}`);
    const model =
      routeModel({ kind: "VIDEO", tool: "text_to_video", priority: "quality" }).best ??
      routeModel({ kind: "VIDEO", tool: "text_to_video", priority: "quality" }, { availableOnly: false }).best;
    if (!model) return;
    const status = getModelStatus(model);
    shots.push({
      index: index++,
      beat,
      kind: "VIDEO",
      tool: "text_to_video",
      modelId: model.id,
      modelName: model.name,
      available: status.available,
      availabilityReason: status.reason,
      cameraPreset: camera,
      prompt: craftShotPrompt(beat, style, "motion"),
      negativePrompt: defaultNegativePrompt("VIDEO", style),
      params: { ...baseParams, cameraPreset: camera, duration: model.capabilities.durations?.[0] ?? 5 },
      estCredits: estimateCost(model.creditScore, 1),
      rationale: `Animated with ${model.name}, camera: ${CAMERA_PRESETS.find((c) => c.id === camera)?.label ?? camera}.`,
    });
  };

  const addNarrationShot = () => {
    const model =
      routeModel({ kind: "AUDIO", tool: "text_to_audio", priority: "quality" }).best ??
      routeModel({ kind: "AUDIO", tool: "text_to_audio", priority: "quality" }, { availableOnly: false }).best;
    if (!model) return;
    const status = getModelStatus(model);
    shots.push({
      index: index++,
      beat: "Narration track",
      kind: "AUDIO",
      tool: "text_to_audio",
      modelId: model.id,
      modelName: model.name,
      available: status.available,
      availabilityReason: status.reason,
      prompt: brief.slice(0, 2000),
      params: { count: 1 },
      estCredits: estimateCost(model.creditScore, 1),
      rationale: "Voiceover generated for timeline assembly in the Editing Studio.",
    });
  };

  beatTexts.forEach((beat, i) => {
    // Beat 1: establishing still. Middle beats: motion. Final beat: hero frame + motion.
    if (i === 0) {
      addImageShot(beat, "establishing");
      addVideoShot(beat);
    } else if (i === beatTexts.length - 1) {
      addImageShot(beat, "hero");
      addVideoShot(beat);
    } else {
      addVideoShot(beat);
    }
  });

  const wantNarration = opts.includeNarration ?? (style === "cinematic" || style === "documentary");
  if (wantNarration) addNarrationShot();

  for (const shot of shots) {
    const model = getModel(shot.modelId);
    if (!model) warnings.push(`Shot ${shot.index + 1}: routed model vanished from catalog.`);
    else if (!shot.available) warnings.push(`Shot ${shot.index + 1} (${shot.modelName}) needs ${model.envKey} — connect it to enable this shot.`);
  }

  return {
    title: brief.split(/[.\n]/)[0].slice(0, 80) || "Untitled production",
    brief,
    style,
    aspect,
    beats,
    shots,
    totalCredits: shots.reduce((sum, s) => sum + s.estCredits, 0),
    warnings,
  };
}
