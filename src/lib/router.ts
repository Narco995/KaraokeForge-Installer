/**
 * Intelligent model routing. Ranks the catalog for a concrete production need
 * instead of leaving model choice to guesswork. Availability filtering reuses
 * the provider registry, so a deployment without keys still routes honestly.
 */

import { MODELS, type ModelDef, type ModelKind } from "./models";
import { getModelStatus } from "./providers/registry";

export type RoutePriority = "quality" | "speed" | "cost";

export type RouteNeed = {
  kind: ModelKind;
  tool?: string;
  priority: RoutePriority;
  maxAvgSeconds?: number;
  withRefImage?: boolean;
};

export type RouteResult = {
  best: ModelDef | undefined;
  ranked: ModelDef[];
  unavailable: ModelDef[];
};

function toolCapKey(tool?: string): string | undefined {
  const map: Record<string, string> = {
    text_to_image: "textToImage",
    image_to_image: "imageToImage",
    text_to_video: "textToVideo",
    image_to_video: "imageToVideo",
    video_to_video: "videoToVideo",
    text_to_audio: "textToAudio",
    upscale: "upscale",
    background_removal: "backgroundRemoval",
  };
  return tool ? map[tool] : undefined;
}

/**
 * Quality heuristic (honest, documented): catalog `creditScore` tracks
 * generation cost which correlates with model tier; avgSeconds penalizes very
 * slow models slightly. Speed favors low avgSeconds; cost favors low
 * creditScore. Ties break alphabetically for determinism.
 */
function score(model: ModelDef, priority: RoutePriority): number {
  if (priority === "speed") return -model.avgSeconds;
  if (priority === "cost") return -model.creditScore;
  return model.creditScore * 100 - model.avgSeconds * 0.1;
}

export function routeModel(need: RouteNeed, opts: { availableOnly?: boolean } = {}): RouteResult {
  const capKey = toolCapKey(need.tool);
  const capOf = (m: ModelDef) =>
    !capKey || Boolean((m.capabilities as Record<string, unknown>)[capKey]);

  const eligible = MODELS.filter((m) => {
    if (m.kind !== need.kind) return false;
    if (!capOf(m)) return false;
    if (need.withRefImage && !m.capabilities.supportsImageRef) return false;
    if (need.maxAvgSeconds !== undefined && m.avgSeconds > need.maxAvgSeconds) return false;
    return true;
  });

  const available: ModelDef[] = [];
  const unavailable: ModelDef[] = [];
  for (const m of eligible) (getModelStatus(m).available ? available : unavailable).push(m);

  const pool = opts.availableOnly === false ? eligible : available;
  const ranked = [...pool].sort(
    (a, b) => score(b, need.priority) - score(a, need.priority) || a.id.localeCompare(b.id)
  );

  return { best: ranked[0], ranked, unavailable };
}
